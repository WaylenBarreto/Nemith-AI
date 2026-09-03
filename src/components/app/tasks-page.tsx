'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, CheckSquare, Clock, CheckCircle2, XCircle, Calendar, Flag } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import type { TaskStatus, TaskPriority } from '@/lib/types';
import Button from '@/components/ui/button';
import Modal from '@/components/ui/modal';
import { Input, Textarea } from '@/components/ui/input';

const columns: { id: TaskStatus; label: string; icon: typeof Clock }[] = [
  { id: 'todo', label: 'To Do', icon: CheckSquare },
  { id: 'in_progress', label: 'In Progress', icon: Clock },
  { id: 'done', label: 'Done', icon: CheckCircle2 },
  { id: 'cancelled', label: 'Cancelled', icon: XCircle },
];

const priorityConfig: Record<TaskPriority, { label: string; dot: string }> = {
  low: { label: 'Low', dot: 'bg-white/15' },
  medium: { label: 'Medium', dot: 'bg-white/30' },
  high: { label: 'High', dot: 'bg-white/50' },
  urgent: { label: 'Urgent', dot: 'bg-white/80' },
};

export default function TasksPage() {
  const { tasks, createTask, updateTask, deleteTask } = useAppStore();
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');

  const handleCreate = () => {
    if (!title.trim()) return;
    createTask({ title: title.trim(), description: description.trim(), priority, status: 'todo' });
    setTitle(''); setDescription(''); setPriority('medium'); setShowCreate(false);
  };

  const moveToNext = (taskId: string, currentStatus: TaskStatus) => {
    const order: TaskStatus[] = ['todo', 'in_progress', 'done'];
    const idx = order.indexOf(currentStatus);
    if (idx < order.length - 1) updateTask(taskId, { status: order[idx + 1] });
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-white">Tasks</h1>
            <p className="text-xs text-white/30 mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => setShowCreate(true)} size="sm" variant="secondary">
            <Plus className="w-3.5 h-3.5" /> New Task
          </Button>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible -mx-6 px-6 md:mx-0 md:px-0 snap-x snap-mandatory md:snap-none">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="min-w-[260px] md:min-w-0 snap-start">
                <div className="flex items-center gap-2 px-1 mb-3">
                  <col.icon className="w-3.5 h-3.5 text-white/30" />
                  <span className="text-xs font-medium text-white/60">{col.label}</span>
                  <span className="text-[10px] text-white/20 ml-auto">{colTasks.length}</span>
                </div>
                <div className="space-y-2 min-h-[80px]">
                  <AnimatePresence>
                    {colTasks.map((task) => {
                      const p = priorityConfig[task.priority];
                      return (
                        <motion.div
                          key={task.id}
                          layout
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.97 }}
                          className="rounded-xl bg-[#111] border border-white/[0.04] p-4 hover:border-white/[0.08] transition-colors group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <div className={cn('w-1.5 h-1.5 rounded-full', p.dot)} />
                              <span className="text-[10px] text-white/25">{p.label}</span>
                            </div>
                            <button onClick={() => deleteTask(task.id)} className="p-1 rounded text-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                              <XCircle className="w-3 h-3" />
                            </button>
                          </div>
                          <h4 className="text-sm text-white mb-1">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-white/25 line-clamp-2 mb-2">{task.description}</p>
                          )}
                          {task.dueDate && (
                            <span className="flex items-center gap-1 text-[10px] text-white/15 mt-2">
                              <Calendar className="w-2.5 h-2.5" />{formatDate(task.dueDate)}
                            </span>
                          )}
                          {col.id !== 'done' && col.id !== 'cancelled' && (
                            <button
                              onClick={() => moveToNext(task.id, task.status)}
                              className="mt-3 w-full text-[10px] text-white/20 hover:text-white/50 py-1.5 rounded-lg border border-white/[0.04] hover:border-white/[0.1] transition-colors"
                            >
                              Move → {columns[columns.findIndex((c) => c.id === col.id) + 1]?.label}
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>

        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Task">
          <div className="space-y-4">
            <Input label="Title" placeholder="What needs to be done?" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea label="Description" placeholder="Optional details..." value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/40">Priority</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs border transition-all',
                      priority === p ? 'border-white/20 text-white bg-white/[0.06]' : 'border-white/[0.06] text-white/25 hover:border-white/[0.12]'
                    )}
                  >
                    <Flag className="w-3 h-3 inline mr-1" />
                    {priorityConfig[p].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!title.trim()}>Create</Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
