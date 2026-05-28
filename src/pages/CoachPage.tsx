import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Trash2,
  Lightbulb,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { chatDb } from '../lib/db';
import { sendToAI, hasApiKey, type ChatHistoryItem } from '../lib/ai';
import type { ChatMessage } from '../types';
import './CoachPage.css';

// ─── Suggested prompts ───────────────────────────────────────

const SUGGESTED_PROMPTS = [
  'How should I study for my next exam?',
  'Why are my marks not improving?',
  'Am I using the Feynman technique effectively?',
  'What study method works best for me?',
  'When am I most productive during the day?',
  'How can I improve my focus during sessions?',
];

// ─── Component ───────────────────────────────────────────────

export default function CoachPage() {
  const { modules, sessions, marks } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>(() => chatDb.getAll());
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const aiReady = hasApiKey();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Build AI chat history from messages
  const buildChatHistory = useCallback((): ChatHistoryItem[] => {
    return messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));
  }, [messages]);

  // ─── Send message ──────────────────────────────────────────

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || !aiReady) return;

    setError('');

    // Add user message
    const userMsg = chatDb.add('user', content);
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await sendToAI(
        content,
        buildChatHistory(),
        { modules, sessions, marks }
      );

      const aiMsg = chatDb.add('assistant', response);
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsTyping(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClearChat() {
    chatDb.clear();
    setMessages([]);
    setError('');
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="page coach-page animate-fadeIn">
      <div className="coach-container">
        {/* ── Header ────────────────────────────────────────── */}
        <div className="coach-header">
          <div className="flex items-center gap-3">
            <div className="coach-avatar">
              <Bot size={24} />
            </div>
            <div>
              <h1 className="coach-header__title">AI Study Coach</h1>
              <p className="coach-header__subtitle">
                <Sparkles size={14} />
                Powered by Groq
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={handleClearChat}>
              <Trash2 size={14} />
              Clear
            </button>
          )}
        </div>

        {/* ── Error banner ──────────────────────────────────── */}
        {error && (
          <div className="coach-error animate-slideDown">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setError('')}>
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Messages ──────────────────────────────────────── */}
        <div className="coach-messages">
          {messages.length === 0 ? (
            <div className="coach-welcome">
              <div className="coach-welcome__icon">
                <Lightbulb size={40} />
              </div>
              <h3 className="coach-welcome__title">Ask me anything about your study habits</h3>
              <p className="coach-welcome__text">
                I analyze your sessions, marks, and methods to give personalized advice powered by Groq's Llama 3 model.
              </p>
              <div className="coach-suggestions">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    className="coach-suggestion"
                    onClick={() => handleSend(prompt)}
                    disabled={!aiReady}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`coach-message coach-message--${msg.role}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="coach-message__avatar">
                      <Bot size={16} />
                    </div>
                  )}
                  <div className="coach-message__bubble">
                    <div className="coach-message__content">
                      {renderMarkdown(msg.content)}
                    </div>
                    <div className="coach-message__time">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="coach-message coach-message--assistant">
                  <div className="coach-message__avatar">
                    <Bot size={16} />
                  </div>
                  <div className="coach-message__bubble">
                    <div className="coach-typing">
                      <span /><span /><span />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input ─────────────────────────────────────────── */}
        <div className="coach-input-bar">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe how you've been studying..."
            rows={1}
            className="coach-input"
            disabled={isTyping || !aiReady}
          />
          <button
            className="btn btn-primary coach-send-btn"
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping || !aiReady}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Simple Markdown Renderer ────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  return text.split('\n').map((line, i) => {
    if (!line.trim()) return <br key={i} />;

    if (line.startsWith('## ')) {
      return <h4 key={i} style={{ marginTop: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>{renderInline(line.slice(3))}</h4>;
    }

    if (line.match(/^[\-\*]\s/)) {
      return (
        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
          <span style={{ color: 'var(--color-primary)', flexShrink: 0 }}>•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    }

    const numMatch = line.match(/^(\d+)\.\s/);
    if (numMatch) {
      return (
        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
          <span style={{ color: 'var(--color-primary)', flexShrink: 0, fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{numMatch[1]}.</span>
          <span>{renderInline(line.slice(numMatch[0].length))}</span>
        </div>
      );
    }

    return <p key={i}>{renderInline(line)}</p>;
  });
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, j) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={j}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}
