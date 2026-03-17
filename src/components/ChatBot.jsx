'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { t, RTL_LANGUAGES } from '@/lib/translations';
import { searchTextbook } from '@/lib/textbookSearch';
import { Send, Bot, User, Loader2, BookOpen, Sparkles, RefreshCw, Mic, MicOff, Volume2, Square } from 'lucide-react';
import Markdown from '@/components/Markdown';
import { supabase } from '@/lib/supabase';

export default function ChatBot() {
  const {
    textbookChunks,
    language,
    addXP,
    earnBadge,
    chatMessages,
    setChatMessages,
    questionsAsked,
    setQuestionsAsked,
  } = useApp();

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isRTL = RTL_LANGUAGES.includes(language);

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  const [speakingMsgIndex, setSpeakingMsgIndex] = useState(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const audioRef = useRef(null);
  const avatarVideoRef = useRef<HTMLVideoElement>(null);

  // Upload TTS audio → Supabase → public URL for MuseTalk
  const uploadTTSForAvatar = async (audioBlob: Blob) => {
    try {
      const fileName = `avatar-tts-${Date.now()}.mp3`;

      const { data, error: uploadError } = await supabase.storage
        .from('tts-audio')
        .upload(fileName, audioBlob, {
          contentType: 'audio/mpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('tts-audio')
        .getPublicUrl(fileName);

      if (!urlData?.publicUrl) {
        throw new Error('No public URL returned');
      }

      return urlData.publicUrl;
    } catch (err) {
      console.error('uploadTTSForAvatar failed:', err);
      throw err;
    }
  };

  // Your speech recognition setup (unchanged)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognitionRef.current = recognition;

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setInput(final + interim);
        finalTranscriptRef.current = final;
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => setIsListening(false);
    }
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      const langMap = {
        en: 'en-US', ar: 'ar-SA', ur: 'ur-PK',
        hi: 'hi-IN', fr: 'fr-FR', ru: 'ru-RU', kk: 'kk-KZ',
      };
      recognitionRef.current.lang = langMap[language] || 'en-US';
    }
  }, [language]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
      setIsListening(true);
      setInput('');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Speak → TTS → upload → MuseTalk → play video + audio
  const speakMessage = useCallback(async (text: string, msgIndex: number | null) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeakingMsgIndex(msgIndex);

    try {
      const ttsRes = await fetch('/api/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language }),
      });

      if (!ttsRes.ok) throw new Error('TTS failed');

      const audioBlob = await ttsRes.blob();
      const audioUrl = await uploadTTSForAvatar(audioBlob);

      const avatarRes = await fetch('/api/musetalk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl }),
      });

      if (!avatarRes.ok) throw new Error('MuseTalk failed');

      const { videoUrl } = await avatarRes.json();

      if (avatarVideoRef.current) {
        avatarVideoRef.current.src = videoUrl;
        avatarVideoRef.current.play().catch(e => console.log('Video play failed:', e));
      }

      const audio = new Audio(URL.createObjectURL(audioBlob));
      audioRef.current = audio;
      audio.play();

      audio.onended = () => setSpeakingMsgIndex(null);
    } catch (error) {
      console.error('Speak/Avatar error:', error);
      // fallbackSpeak(text); ← add if you have this function
    }
  }, [language]);

  // ────────────────────────────────────────────────
  // PASTE YOUR ORIGINAL FUNCTIONS HERE
  // sendMessage, handleKeyDown, resetChat, fallbackSpeak, etc.
  // ────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">

      {/* LIVE AVATAR - top right corner */}
      <div className="fixed top-24 right-8 w-48 h-48 rounded-3xl overflow-hidden border-4 border-white shadow-2xl z-50 bg-black pointer-events-none">
        <video
          ref={avatarVideoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />
      </div>

      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)] flex items-center justify-between">
        <h2 className="text-xl font-display font-bold">AI Tutor</h2>
        {/* ← your original voice toggle buttons here if any */}
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white border border-[var(--color-border)] rounded-xl">
        {/* PASTE YOUR ORIGINAL MESSAGE LIST HERE */}
        {/* Usually looks like: */}
        {/* {chatMessages.map((msg, index) => ( */}
        {/*   <div key={index} className={msg.role === 'user' ? '...' : '...'}> */}
        {/*     ... */}
        {/*   </div> */}
        {/* ))} */}
        {/* {loading && <Loader2 className="animate-spin" />} */}
        {/* <div ref={messagesEndRef} /> */}
      </div>

      {/* Input area – PASTE YOUR ORIGINAL BOTTOM BAR HERE */}
      {/* Usually contains: */}
      {/* <div className="p-4 border-t ..."> */}
      {/*   <div className="flex gap-2"> */}
      {/*     <button onClick={isListening ? stopListening : startListening}> */}
      {/*       {isListening ? <MicOff /> : <Mic />} */}
      {/*     </button> */}
      {/*     <textarea */}
      {/*       value={input} */}
      {/*       onChange={(e) => setInput(e.target.value)} */}
      {/*       onKeyDown={handleKeyDown} */}
      {/*       ... */}
      {/*     /> */}
      {/*     <button onClick={sendMessage} disabled={!input.trim() || loading}> */}
      {/*       <Send /> */}
      {/*     </button> */}
      {/*   </div> */}
      {/* </div> */}

    </div>
  );
}