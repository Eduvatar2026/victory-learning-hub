'use client';
import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { searchTextbook } from '@/lib/textbookSearch';
import { Send, Bot, User, Loader2, BookOpen, Sparkles, RefreshCw } from 'lucide-react';
import Markdown from '@/components/Markdown';

const SUGGESTED_QUESTIONS = [
  "Explain the main concept of this chapter",
  "Can you give me a simple example?",
  "What are the key points I should remember?",
  "Help me understand the difference between...",
  "Quiz me on what I just read",
];

export default function ChatBot() {
  const { textbookChunks, language, addXP, earnBadge, student } = useApp();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your AI tutor 🎓 I can help you understand your textbooks, answer questions about your lessons, and even quiz you. What would you like to learn about today?",
      timestamp: new Date().toISOString(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [questionsAsked, setQuestionsAsked] = useState(0);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text = input) => {
    if (!text.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Search textbook content for relevant context
    const relevantChunks = searchTextbook(text, textbookChunks, 3);
    const context = relevantChunks.map(c => 
      `[${c.title} - Page ${c.page}]\n${c.content}`
    ).join('\n\n');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          context,
          history: messages.slice(-6),
          language,
        }),
      });

      const data = await response.json();
      
      const assistantMessage = {
        role: 'assistant',
        content: data.answer || 'Sorry, I couldn\'t process that. Please try again.',
        timestamp: new Date().toISOString(),
        sources: relevantChunks.length > 0 ? relevantChunks.map(c => c.title) : null,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Gamification
      const newCount = questionsAsked + 1;
      setQuestionsAsked(newCount);
      addXP(5);
      
      if (newCount === 1) earnBadge('first_question');
      if (newCount === 5) earnBadge('five_questions');

    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I had trouble connecting. Make sure the server is running and the API key is configured.',
        timestamp: new Date().toISOString(),
        isError: true,
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 
            flex items-center justify-center text-white">
            <Bot size={20} />
          </div>
          <div>
            <h2 className="font-display text-xl">AI Tutor</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              {textbookChunks.length > 0 
                ? `${textbookChunks.length} textbook sections loaded` 
                : 'No textbooks loaded — upload in Library'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setMessages([messages[0]])}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] 
            flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-[var(--color-surface-raised)] transition-colors"
        >
          <RefreshCw size={12} /> New Chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto rounded-xl bg-white border border-[var(--color-border)] p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 
              ${msg.role === 'user' 
                ? 'bg-brand-100 text-brand-600' 
                : 'bg-sage-100 text-sage-600'}`}
            >
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
              <div className={`inline-block px-4 py-3 rounded-2xl text-sm leading-relaxed
                ${msg.role === 'user' 
                  ? 'bg-brand-600 text-white rounded-br-md' 
                  : msg.isError 
                    ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-md'
                    : 'bg-[var(--color-surface-raised)] text-[var(--color-text)] rounded-bl-md'}`}
              >
                {msg.role === 'user' 
                  ? <p className="whitespace-pre-wrap">{msg.content}</p>
                  : <Markdown content={msg.content} />
                }
              </div>
              {msg.sources && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {msg.sources.map((src, j) => (
                    <span key={j} className="inline-flex items-center gap-1 text-[10px] 
                      text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                      <BookOpen size={10} /> {src}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="chat-message flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-sage-100 text-sage-600 flex items-center justify-center">
              <Bot size={14} />
            </div>
            <div className="bg-[var(--color-surface-raised)] rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                <Loader2 size={14} className="animate-spin" />
                Thinking...
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {SUGGESTED_QUESTIONS.slice(0, 3).map((q, i) => (
            <button
              key={i}
              onClick={() => sendMessage(q)}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--color-border)] 
                text-[var(--color-text-muted)] hover:bg-white hover:border-brand-300 
                hover:text-brand-600 transition-all flex items-center gap-1"
            >
              <Sparkles size={10} /> {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your textbooks..."
            rows={1}
            className="w-full resize-none bg-white border border-[var(--color-border)] rounded-xl 
              px-4 py-3 pr-12 text-sm focus:outline-none focus:border-brand-400 focus:ring-1 
              focus:ring-brand-200 transition-colors placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={() => sendMessage()}
          disabled={!input.trim() || loading}
          className="w-11 h-11 rounded-xl bg-brand-600 text-white flex items-center justify-center 
            hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
