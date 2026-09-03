'use client';

import { motion } from 'framer-motion';
import {
  MessageSquare,
  FolderKanban,
  FileText,
  CheckSquare,
  Plus,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Download,
  ChevronRight,
  Search,
  Zap,
} from 'lucide-react';
import { cn, getGreeting } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  }),
};

export default function DashboardPage() {
  const {
    conversations,
    projects,
    documents,
    tasks,
    setActivePage,
    createConversation,
  } = useAppStore();

  const stats = [
    { label: 'Chats', value: conversations.length, icon: MessageSquare },
    { label: 'Projects', value: projects.length, icon: FolderKanban },
    { label: 'Documents', value: documents.length, icon: FileText },
    { label: 'Tasks', value: tasks.length, icon: CheckSquare },
  ];

  const recentConvos = conversations.slice(0, 4);
  const recentDocs = documents.slice(0, 5);

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-black/60 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 md:px-6 lg:px-8 h-12 md:h-14 pl-14 md:pl-6 lg:pl-8">
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-white/30 text-sm w-full max-w-xs">
            <Search className="w-3.5 h-3.5" />
            <span>Search anything...</span>
            <span className="ml-auto flex items-center gap-0.5 text-[10px] font-mono border border-white/10 rounded-md px-1.5 py-0.5">⌘F</span>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Greeting */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-8"
          >
            <h1 className="text-xl font-semibold text-white">
              {getGreeting()}
            </h1>
          </motion.div>

          {/* Stats row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-4 md:mb-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                className="bg-[#111111] rounded-2xl p-5 border border-white/[0.04] hover:border-white/[0.08] transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <stat.icon className="w-4 h-4 text-white/30" />
                </div>
                <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
                <p className="text-xs text-white/30 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 md:gap-3">
            {/* Main card - Balance style (Payflow inspired) */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="lg:col-span-2 bg-gradient-to-br from-[#1a1a1a] to-[#111] rounded-3xl border border-white/[0.06] p-6 overflow-hidden relative"
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-sm font-medium text-white/60">Total Balance</p>
                  <p className="text-xs text-white/25 mt-0.5">Available for use</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs text-white/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  <span>Active</span>
                </div>
              </div>

              {/* Dark inner card */}
              <div className="bg-black/40 border border-white/[0.08] rounded-2xl p-5 mb-5">
                <p className="text-xs font-medium text-white/40 mb-1">Available Items</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">{conversations.length + projects.length + documents.length + tasks.length}</span>
                  <span className="text-lg font-medium text-white/25">total</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { createConversation(); setActivePage('chat'); }}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm text-white/60 hover:bg-white/[0.1] hover:text-white transition-all"
                >
                  <MessageSquare className="w-4 h-4" /> New Chat
                </button>
                <button
                  onClick={() => setActivePage('projects')}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.06] border border-white/[0.08] text-sm text-white/60 hover:bg-white/[0.1] hover:text-white transition-all"
                >
                  <FolderKanban className="w-4 h-4" /> Projects
                </button>
              </div>
            </motion.div>

            {/* Activity list in separate card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-[#111] rounded-2xl border border-white/[0.04] overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-white/[0.04]">
                <p className="text-sm font-medium text-white">Recent Activity</p>
              </div>
              <div className="divide-y divide-white/[0.04]">
                {recentConvos.length === 0 && recentDocs.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-xs text-white/20">No activity yet</p>
                  </div>
                ) : (
                  <>
                    {recentConvos.map((convo) => (
                      <button
                        key={convo.id}
                        onClick={() => {
                          useAppStore.getState().setActiveConversation(convo.id);
                          setActivePage('chat');
                        }}
                        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
                          <MessageSquare className="w-3.5 h-3.5 text-white/35" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm text-white/70 truncate">{convo.title}</p>
                          <p className="text-[10px] text-white/20">{convo.messages.length} messages</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/15" />
                      </button>
                    ))}
                    {recentDocs.slice(0, 3).map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-4 px-6 py-3.5"
                      >
                        <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-white/40" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{doc.filename}</p>
                          <p className="text-[11px] text-white/25 mt-0.5">
                            {doc.status === 'ready' ? 'Ready' : 'Processing'} · {(doc.fileType || 'file').toUpperCase()}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-white/15" />
                      </div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>

            {/* Right side cards */}
            <div className="space-y-3">
              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="bg-[#111111] rounded-2xl border border-white/[0.04] p-5"
              >
                <p className="text-sm font-medium text-white mb-4">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Chat', icon: MessageSquare, action: () => { createConversation(); setActivePage('chat'); } },
                    { label: 'Projects', icon: FolderKanban, action: () => setActivePage('projects') },
                    { label: 'Documents', icon: FileText, action: () => setActivePage('documents') },
                    { label: 'Tasks', icon: CheckSquare, action: () => setActivePage('tasks') },
                  ].map((action) => (
                    <button
                      key={action.label}
                      onClick={action.action}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:bg-white/[0.06] hover:border-white/[0.08] transition-all text-center group"
                    >
                      <action.icon className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                      <span className="text-xs text-white/40 group-hover:text-white/70 transition-colors">
                        {action.label}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Tasks summary */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="bg-[#111111] rounded-2xl border border-white/[0.04] p-5"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-medium text-white">Tasks</p>
                  <button
                    onClick={() => setActivePage('tasks')}
                    className="text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    View all
                  </button>
                </div>
                {tasks.length === 0 ? (
                  <p className="text-xs text-white/20 py-3 text-center">No tasks</p>
                ) : (
                  <div className="space-y-2">
                    {tasks.slice(0, 4).map((task) => (
                      <div key={task.id} className="flex items-center gap-2.5">
                        <div
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            task.status === 'done' ? 'bg-green-500' :
                            task.status === 'in_progress' ? 'bg-white/60' : 'bg-white/20'
                          )}
                        />
                        <span className="text-xs text-white/50 truncate flex-1">{task.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
