'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderKanban, FileText, CheckSquare, MessageSquare, Trash2, ExternalLink, Calendar } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import Modal from '@/components/ui/modal';
import Button from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';

export default function ProjectsPage() {
  const { projects, documents, tasks, conversations, createProject, deleteProject, activeProjectId } = useAppStore();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [githubRepo, setGithubRepo] = useState('');

  const handleCreate = () => {
    if (!name.trim()) return;
    createProject({ name: name.trim(), description: description.trim(), githubRepo: githubRepo.trim() || undefined });
    setName(''); setDescription(''); setGithubRepo(''); setShowCreate(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-semibold text-white">Projects</h1>
            <p className="text-xs text-white/30 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
          </div>
          <Button onClick={() => setShowCreate(true)} size="sm" variant="secondary">
            <Plus className="w-3.5 h-3.5" />
            New Project
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
              <FolderKanban className="w-5 h-5 text-white/15" />
            </div>
            <p className="text-sm text-white/30 mb-4">No projects yet</p>
            <Button onClick={() => setShowCreate(true)} size="sm" variant="secondary">
              <Plus className="w-3.5 h-3.5" />
              Create your first project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {projects.map((project, i) => {
              const docCount = documents.filter((d) => d.projectId === project.id).length;
              const taskCount = tasks.filter((t) => t.projectId === project.id).length;
              const convoCount = conversations.filter((c) => c.projectId === project.id).length;
              return (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className={cn(
                    'rounded-2xl border p-5 transition-all group',
                    activeProjectId === project.id
                      ? 'border-white/20 bg-[#161616]'
                      : 'border-white/[0.04] bg-[#111] hover:border-white/[0.08]'
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center">
                      <FolderKanban className="w-5 h-5 text-white/30" />
                    </div>
                    <button onClick={() => deleteProject(project.id)} className="p-1.5 rounded-lg text-white/15 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h3 className="text-sm font-medium text-white mb-1">{project.name}</h3>
                  <p className="text-xs text-white/25 line-clamp-2 mb-4">{project.description || 'No description'}</p>
                  {project.githubRepo && (
                    <a href={`https://github.com/${project.githubRepo}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70 mb-3">
                      <ExternalLink className="w-3 h-3" />{project.githubRepo}
                    </a>
                  )}
                  <div className="flex items-center gap-3 pt-3 border-t border-white/[0.04]">
                    <span className="flex items-center gap-1 text-[10px] text-white/20"><FileText className="w-2.5 h-2.5" /> {docCount}</span>
                    <span className="flex items-center gap-1 text-[10px] text-white/20"><CheckSquare className="w-2.5 h-2.5" /> {taskCount}</span>
                    <span className="flex items-center gap-1 text-[10px] text-white/20"><MessageSquare className="w-2.5 h-2.5" /> {convoCount}</span>
                    <span className="ml-auto text-[10px] text-white/15">{formatDate(project.createdAt)}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Project">
          <div className="space-y-4">
            <Input label="Project Name" placeholder="My awesome project" value={name} onChange={(e) => setName(e.target.value)} />
            <Textarea label="Description" placeholder="What is this project about?" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            <Input label="GitHub Repository (optional)" placeholder="owner/repo" value={githubRepo} onChange={(e) => setGithubRepo(e.target.value)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!name.trim()}>Create</Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
