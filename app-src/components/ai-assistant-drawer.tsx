'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronDown,
  CornerDownLeft,
  Building,
  AlertTriangle,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { Button } from './ui/button';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  'Equipment in Lab 603 vs 604',
  'Show damaged or missing assets',
  'Floor-wise asset breakdown',
  'Where are the Cisco switches?',
];

export function AIAssistantDrawer() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "👋 Hello! I'm the **SPIT Asset AI Concierge**.\n\nAsk me anything about laboratories, computer counts, damaged items, or equipment locations across Sardar Patel Institute of Technology.",
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Keyboard shortcut ⌘J / Ctrl+J
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  async function handleSend(queryText?: string) {
    const textToSend = queryText ?? input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: String(Date.now()),
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();

      const aiMsg: Message = {
        id: String(Date.now() + 1),
        role: 'assistant',
        content: data.reply || 'No response received from AI engine.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: '⚠️ Sorry, an error occurred while connecting to the assistant. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Simple Markdown renderer for links, bold, bullet points
  function renderMarkdown(content: string) {
    const lines = content.split('\n');

    return (
      <div className="space-y-1.5 text-xs text-zinc-800 dark:text-zinc-200">
        {lines.map((line, idx) => {
          // Headers
          if (line.startsWith('### ')) {
            return (
              <p key={idx} className="font-bold text-sm text-zinc-900 dark:text-white pt-1">
                {line.replace('### ', '')}
              </p>
            );
          }
          if (line.startsWith('#### ')) {
            return (
              <p key={idx} className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 pt-1 uppercase tracking-wider">
                {line.replace('#### ', '')}
              </p>
            );
          }

          // Bullet points
          if (line.startsWith('- ') || line.startsWith('* ')) {
            const cleanLine = line.replace(/^[-*]\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-1.5 pl-1">
                <span className="text-indigo-500 font-bold">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInline(cleanLine) }} />
              </div>
            );
          }

          // Quotes / Blockquotes
          if (line.startsWith('> ')) {
            return (
              <div key={idx} className="border-l-2 border-indigo-500 pl-2.5 py-1 text-zinc-500 italic bg-indigo-50/30 dark:bg-indigo-950/20 rounded-r">
                <span dangerouslySetInnerHTML={{ __html: formatInline(line.replace('> ', '')) }} />
              </div>
            );
          }

          if (!line.trim()) return <div key={idx} className="h-1" />;

          return <p key={idx} dangerouslySetInnerHTML={{ __html: formatInline(line) }} />;
        })}
      </div>
    );
  }

  function formatInline(text: string): string {
    // Replace **bold**
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Replace [label](url)
    formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="font-mono text-indigo-600 dark:text-indigo-400 font-bold underline hover:opacity-80">$1</a>');
    return formatted;
  }

  return (
    <>
      {/* ── Floating Launcher Trigger Button ─────────────────────── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-xl hover:shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all group"
        aria-label="Open SPIT AI Assistant (⌘J)"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-200 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
        </span>
        <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
        <span>SPIT AI</span>
        <kbd className="hidden sm:inline-flex text-[9px] bg-white/20 px-1.5 py-0.5 rounded text-white/90">
          ⌘J
        </kbd>
      </button>

      {/* ── Floating AI Chat Modal ───────────────────────────────── */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[440px] h-[580px] max-h-[80vh] flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 shadow-2xl backdrop-blur-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-indigo-50/50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                  SPIT Asset AI Concierge
                </p>
                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 leading-tight">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live RAG Knowledge Engine
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMessages([messages[0]])}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Reset Conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Close AI Window"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Chat Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start gap-2.5 ${
                  m.role === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 border border-zinc-200/60 dark:border-zinc-700/60'
                  }`}
                >
                  {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-2xs ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-xs'
                      : 'bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-100 dark:border-zinc-800/80 rounded-tl-xs'
                  }`}
                >
                  {m.role === 'user' ? (
                    <p className="text-xs font-medium">{m.content}</p>
                  ) : (
                    renderMarkdown(m.content)
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-indigo-600">
                  <Bot className="h-3.5 w-3.5 animate-spin" />
                </div>
                <div className="rounded-2xl rounded-tl-xs bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-100 dark:border-zinc-800/80 px-3.5 py-2 text-xs text-zinc-500 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                  <span className="pl-1">Searching SPIT database…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Prompt Chips */}
          <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-x-auto flex gap-1.5 scrollbar-none">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="shrink-0 rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-2.5 py-1 text-[10px] font-medium text-zinc-600 dark:text-zinc-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors shadow-2xs"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about assets, rooms, or equipment…"
              className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <Button
              type="submit"
              disabled={!input.trim() || loading}
              size="sm"
              className="h-8 w-8 p-0 rounded-xl shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
