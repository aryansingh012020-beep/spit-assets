'use client';

import * as React from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  RotateCcw,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from './ui/button';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  'Lab 603 vs 604',
  'Damaged assets',
  'Floor breakdown',
  'Cisco switches',
];

export function AIAssistantDrawer() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [input, setInput] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! How can I help you with SPIT equipment, labs, or inventory today?',
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
        content: data.reply || 'No response received from assistant.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: '⚠️ Sorry, an error occurred while connecting. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Floating Launcher Trigger Button ─────────────────────── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-3.5 py-2 text-xs font-semibold shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all border border-zinc-700/40 dark:border-zinc-200 group"
        aria-label="Open SPIT AI Assistant (⌘J)"
      >
        <Sparkles className="h-3.5 w-3.5 text-indigo-400 dark:text-indigo-600" />
        <span>SPIT AI</span>
        <kbd className="hidden sm:inline-flex text-[10px] opacity-60 font-mono">
          ⌘J
        </kbd>
      </button>

      {/* ── Floating AI Chat Modal ───────────────────────────────── */}
      {isOpen && (
        <div
          className={`fixed bottom-20 right-4 sm:right-6 z-50 flex flex-col rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white/98 dark:bg-zinc-900/98 shadow-2xl backdrop-blur-md overflow-hidden transition-all duration-200 animate-in zoom-in-95 slide-in-from-bottom-2 ${
            isExpanded
              ? 'w-[calc(100vw-2rem)] sm:w-[700px] h-[680px] max-h-[85vh]'
              : 'w-[calc(100vw-2rem)] sm:w-[440px] h-[540px] max-h-[80vh]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                  SPIT Assistant
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium leading-tight">
                  Live institutional asset intelligence
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title={isExpanded ? 'Collapse view' : 'Expand view'}
              >
                {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={() => setMessages([messages[0]])}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Reset conversation"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Close window"
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
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60'
                  }`}
                >
                  {m.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>

                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-xs font-medium'
                      : 'bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-xs overflow-x-auto shadow-2xs'
                  }`}
                >
                  {m.role === 'user' ? (
                    <p>{m.content}</p>
                  ) : (
                    <div className="prose prose-xs dark:prose-invert max-w-none space-y-1.5">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          table: ({ node, ...props }) => (
                            <div className="my-2 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                              <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700 text-[11px]" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => (
                            <thead className="bg-zinc-100 dark:bg-zinc-800 font-semibold uppercase text-[10px] text-zinc-600 dark:text-zinc-300" {...props} />
                          ),
                          tbody: ({ node, ...props }) => (
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900" {...props} />
                          ),
                          th: ({ node, ...props }) => (
                            <th className="px-2.5 py-1.5 text-left font-semibold" {...props} />
                          ),
                          td: ({ node, ...props }) => (
                            <td className="px-2.5 py-1.5 text-zinc-700 dark:text-zinc-300" {...props} />
                          ),
                          a: ({ node, href, children, ...props }) => (
                            <Link
                              href={href || '#'}
                              className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 underline hover:opacity-80 inline-flex items-center gap-0.5"
                              {...props}
                            >
                              {children}
                            </Link>
                          ),
                          code: ({ node, className, children, ...props }) => {
                            return (
                              <code
                                className="font-mono text-[11px] rounded bg-zinc-200/60 dark:bg-zinc-800 px-1 py-0.5 text-indigo-600 dark:text-indigo-300 font-medium"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                          blockquote: ({ node, ...props }) => (
                            <blockquote
                              className="border-l-2 border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 pl-2.5 py-1 rounded-r my-1.5 text-zinc-500 italic"
                              {...props}
                            />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul className="list-disc pl-3.5 space-y-0.5 my-1" {...props} />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol className="list-decimal pl-3.5 space-y-0.5 my-1" {...props} />
                          ),
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-start gap-2.5">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-indigo-600 shadow-2xs">
                  <Bot className="h-3.5 w-3.5 animate-spin" />
                </div>
                <div className="rounded-2xl rounded-tl-xs bg-zinc-50 dark:bg-zinc-800/70 border border-zinc-100 dark:border-zinc-800 px-3 py-2 text-xs text-zinc-500 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:0.4s]" />
                  <span className="pl-1">Searching…</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Minimalist Suggested Quick Prompt Chips */}
          <div className="px-3 py-2 border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/40 overflow-x-auto flex gap-1.5 scrollbar-none">
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
            className="p-2.5 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
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
