'use client';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { saveProgress, loadProgress, saveChatMessage } from '@/lib/supabase';
import { RTL_LANGUAGES } from '@/lib/translations';

const AppContext = createContext(null);

const INITIAL_STUDENT = {
  name: 'Student',
  grade: '',
  xp: 0,
  level: 1,
  streak: 0,
  badges: [],
  quizScores: [],
  bookmarks: [],
  chatHistory: [],
};

const BADGES = [
  { id: 'first_question', name: 'Curious Mind', icon: '🧠', desc: 'Asked your first question', xpReq: 0 },
  { id: 'five_questions', name: 'Knowledge Seeker', icon: '🔍', desc: 'Asked 5 questions', xpReq: 0 },
  { id: 'first_quiz', name: 'Quiz Starter', icon: '📝', desc: 'Completed your first quiz', xpReq: 0 },
  { id: 'perfect_quiz', name: 'Perfect Score', icon: '⭐', desc: 'Got 100% on a quiz', xpReq: 0 },
  { id: 'level_5', name: 'Rising Star', icon: '🌟', desc: 'Reached Level 5', xpReq: 500 },
  { id: 'level_10', name: 'Scholar', icon: '🎓', desc: 'Reached Level 10', xpReq: 1500 },
  { id: 'bookworm', name: 'Bookworm', icon: '📚', desc: 'Read 5 different chapters', xpReq: 0 },
  { id: 'streak_7', name: 'Dedicated Learner', icon: '🔥', desc: '7-day learning streak', xpReq: 0 },
];

const INITIAL_CHAT = [
  {
    role: 'assistant',
    content: "Hello! I'm your AI tutor 🎓 I can help you understand your textbooks, answer questions about your lessons, and even quiz you. What would you like to learn about today?",
    timestamp: new Date().toISOString(),
  }
];

// ─── Helpers: Safe localStorage access (SSR-safe) ───
function loadFromStorage(key, fallback) {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(`eduvatar_${key}`);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn(`Failed to load ${key} from storage`, e);
  }
  return fallback;
}

function saveToStorage(key, value) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`eduvatar_${key}`, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save ${key} to storage`, e);
  }
}

export function AppProvider({ children }) {
  // ─── Hydration flag: prevents SSR mismatch ───
  const [hydrated, setHydrated] = useState(false);

  // ─── State (initialized with defaults, hydrated from storage on mount) ───
  const [student, setStudent] = useState(INITIAL_STUDENT);
  const [language, setLanguage] = useState('en');
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedBook, setSelectedBook] = useState(null);
  const [textbookChunks, setTextbookChunks] = useState([]);
  const [notification, setNotification] = useState(null);
  const [chatMessages, setChatMessages] = useState(INITIAL_CHAT);
  const [questionsAsked, setQuestionsAsked] = useState(0);

  // ─── Phase 1: Hydrate from localStorage on mount ───
  useEffect(() => {
    const savedStudent = loadFromStorage('student', INITIAL_STUDENT);
    const savedChat = loadFromStorage('chatMessages', INITIAL_CHAT);
    const savedQuestionsAsked = loadFromStorage('questionsAsked', 0);
    const savedLanguage = loadFromStorage('language', 'en');
    const savedTextbooks = loadFromStorage('textbookChunks', []);

    // Merge saved student with defaults (in case new fields were added)
    setStudent({ ...INITIAL_STUDENT, ...savedStudent });
    setChatMessages(savedChat.length > 0 ? savedChat : INITIAL_CHAT);
    setQuestionsAsked(savedQuestionsAsked);
    setLanguage(savedLanguage);
    if (savedTextbooks.length > 0) setTextbookChunks(savedTextbooks);

    setHydrated(true);
  }, []);

  // ─── Phase 2: Persist state changes to localStorage ───
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage('student', student);
  }, [student, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage('chatMessages', chatMessages);
  }, [chatMessages, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage('questionsAsked', questionsAsked);
  }, [questionsAsked, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveToStorage('language', language);
  }, [language, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (textbookChunks.length > 0) {
      saveToStorage('textbookChunks', textbookChunks);
    }
  }, [textbookChunks, hydrated]);

  // ─── Phase 3: Set document direction for RTL languages ───
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const isRTL = RTL_LANGUAGES.includes(language);
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // ─── Phase 4: Also sync to Supabase (async, non-blocking) ───
  useEffect(() => {
    if (!hydrated || student === INITIAL_STUDENT) return;
    // Fire-and-forget save to Supabase
    saveProgress('default_student', {
      xp: student.xp,
      level: student.level,
      streak: student.streak,
      badges: student.badges,
      quiz_scores: student.quizScores,
      questions_asked: questionsAsked,
    }).catch(() => {}); // Silently fail if Supabase is not configured
  }, [student.xp, student.badges.length, student.quizScores.length, hydrated]);

  // ─── Actions ───
  const addXP = useCallback((amount) => {
    setStudent(prev => {
      const newXP = prev.xp + amount;
      const newLevel = Math.floor(newXP / 100) + 1;
      const newBadges = [...prev.badges];

      if (newLevel >= 5 && !newBadges.includes('level_5')) newBadges.push('level_5');
      if (newLevel >= 10 && !newBadges.includes('level_10')) newBadges.push('level_10');

      if (newLevel > prev.level) {
        setNotification({ type: 'levelup', message: `Level Up! You're now Level ${newLevel}` });
        setTimeout(() => setNotification(null), 3000);
      }

      return { ...prev, xp: newXP, level: newLevel, badges: newBadges };
    });
  }, []);

  const earnBadge = useCallback((badgeId) => {
    setStudent(prev => {
      if (prev.badges.includes(badgeId)) return prev;
      const badge = BADGES.find(b => b.id === badgeId);
      if (badge) {
        setNotification({ type: 'badge', message: `Badge Earned: ${badge.name} ${badge.icon}` });
        setTimeout(() => setNotification(null), 3000);
      }
      return { ...prev, badges: [...prev.badges, badgeId] };
    });
  }, []);

  const value = {
    student, setStudent,
    language, setLanguage,
    currentView, setCurrentView,
    selectedBook, setSelectedBook,
    textbookChunks, setTextbookChunks,
    notification,
    addXP, earnBadge,
    BADGES,
    chatMessages, setChatMessages,
    questionsAsked, setQuestionsAsked,
    hydrated,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
