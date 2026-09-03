'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  FolderKanban,
  FileText,
  CheckSquare,
  LayoutDashboard,
  Plus,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  Search,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'projects', label: 'Projects', icon: FolderKanban },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
];

export default function Sidebar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    activePage,
    setActivePage,
    conversations,
    activeConversationId,
    setActiveConversation,
    createConversation,
    deleteConversation,
  } = useAppStore();

  const [hoveredConvo, setHoveredConvo] = useState<string | null>(null);

  // Load conversations from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nemith_conversations');
      if (stored) {
        const savedConversations = JSON.parse(stored);
        if (savedConversations.length > 0) {
          useAppStore.setState({ conversations: savedConversations });
        }
      }
    } catch {}
  }, []);

  // Persist conversations to localStorage
  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      try {
        localStorage.setItem('nemith_conversations', JSON.stringify(state.conversations));
      } catch {}
    });
    return unsub;
  }, []);

  // Load memories from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nemith_memories');
      if (stored) {
        useAppStore.setState({ memories: JSON.parse(stored) });
      }
    } catch {}
  }, []);

  // Persist memories to localStorage
  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      try {
        localStorage.setItem('nemith_memories', JSON.stringify(state.memories));
      } catch {}
    });
    return unsub;
  }, []);

  const handleNewChat = () => {
    createConversation();
    setActivePage('chat');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 260 : 72 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative h-full bg-[#111111] border-r border-white/[0.06] flex flex-col shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-16 shrink-0">
        <AnimatePresence mode="wait">
          {sidebarOpen ? (
            <motion.div
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <Link href="/" className="shrink-0 hover:opacity-80 transition-opacity">
                <span className="text-xl font-light tracking-tight text-white glow-text">Nemith</span>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="ml-auto p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors shrink-0"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3 w-full"
            >
              <Link href="/" className="shrink-0 hover:opacity-80 transition-opacity">
                <span className="text-lg font-light tracking-tight text-white glow-text">N</span>
              </Link>
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                title="Expand sidebar"
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search bar (when open) */}
      {sidebarOpen && (
        <div className="px-4 mb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/25 text-sm cursor-pointer hover:bg-white/[0.06] transition-colors">
            <Search className="w-3.5 h-3.5" />
            <span>Search anything...</span>
            <span className="ml-auto text-[10px] border border-white/10 rounded px-1.5 py-0.5 font-mono">⌘F</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className={cn('space-y-0.5', sidebarOpen ? 'px-3' : 'px-2 flex flex-col items-center')}>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActivePage(item.id);
              if (item.id === 'chat') setActiveConversation(null);
            }}
            className={cn(
              'flex items-center gap-3 rounded-xl text-sm transition-all duration-150',
              sidebarOpen ? 'w-full px-3 py-2.5' : 'w-11 h-11 justify-center',
              activePage === item.id
                ? 'bg-white/[0.08] text-white'
                : 'text-white/35 hover:text-white/70 hover:bg-white/[0.04]'
            )}
            title={!sidebarOpen ? item.label : undefined}
          >
            <item.icon className="w-[18px] h-[18px] shrink-0" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        ))}
      </div>

      {/* New Chat button */}
      <div className={cn('py-2', sidebarOpen ? 'px-3' : 'px-2 flex justify-center')}>
        <button
          onClick={handleNewChat}
          className={cn(
            'flex items-center gap-3 rounded-xl text-sm font-medium bg-white/[0.06] text-white/50 hover:bg-white/[0.1] hover:text-white transition-all',
            sidebarOpen ? 'w-full px-3 py-2.5' : 'w-11 h-11 justify-center'
          )}
          title={!sidebarOpen ? 'New Chat' : undefined}
        >
          <Plus className="w-[18px] h-[18px] shrink-0" />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                New Chat
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto py-1 space-y-0.5 px-3">
        <AnimatePresence>
          {sidebarOpen && conversations.length > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 py-1 text-[10px] font-medium text-white/15 uppercase tracking-wider"
            >
              Recent
            </motion.p>
          )}
        </AnimatePresence>
        {conversations.slice(0, 15).map((convo) => (
          <div
            key={convo.id}
            onMouseEnter={() => setHoveredConvo(convo.id)}
            onMouseLeave={() => setHoveredConvo(null)}
            className="relative group"
          >
            <button
              onClick={() => {
                setActiveConversation(convo.id);
                setActivePage('chat');
              }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left transition-all',
                activeConversationId === convo.id
                  ? 'bg-white/[0.08] text-white'
                  : 'text-white/25 hover:text-white/50 hover:bg-white/[0.03]'
              )}
              title={!sidebarOpen ? convo.title : undefined}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              {sidebarOpen && <span className="truncate flex-1">{convo.title}</span>}
            </button>
            {sidebarOpen && hoveredConvo === convo.id && (
              <button
                onClick={(e) => { e.stopPropagation(); deleteConversation(convo.id); }}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-md text-white/15 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Bottom - Settings + user */}
      <div className={cn('py-3 border-t border-white/[0.06]', sidebarOpen ? 'px-3' : 'px-2')}>
        {/* Settings button */}
        <button
          onClick={() => setActivePage('settings')}
          className={cn(
            'flex items-center gap-3 rounded-xl text-sm transition-all duration-150 mb-2',
            sidebarOpen ? 'w-full px-3 py-2' : 'w-11 h-11 justify-center mx-auto',
            activePage === 'settings'
              ? 'bg-white/[0.08] text-white'
              : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
          )}
          title={!sidebarOpen ? 'Settings' : undefined}
        >
          <Settings className="w-[18px] h-[18px] shrink-0" />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="whitespace-nowrap">
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <div className={cn('flex items-center gap-3', sidebarOpen ? 'px-3 py-2' : 'justify-center py-2')}>
          <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.08] flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-white/60">N</span>
          </div>
          <AnimatePresence>
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 min-w-0"
              >
                <p className="text-xs font-medium text-white/60 truncate">Nemith Studio</p>
                <p className="text-[10px] text-white/20 truncate">Settings</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.aside>
  );
}
