'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Trash2, CheckCircle2, Loader2, AlertCircle, File, FileCode } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import Button from '@/components/ui/button';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const fileTypeIcons = { pdf: FileText, txt: File, md: FileCode, docx: FileText };

export default function DocumentsPage() {
  const { documents, addDocument, deleteDocument } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()?.toLowerCase() as 'pdf' | 'txt' | 'md' | 'docx';
      const doc = addDocument({ filename: file.name, fileType: ext || 'txt', fileSize: file.size });
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentId', doc.id);
        const res = await fetch('/api/documents', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success) {
          useAppStore.getState().updateDocument(doc.id, { status: 'ready', chunkCount: data.chunkCount });
        } else {
          useAppStore.getState().updateDocument(doc.id, { status: 'error' });
        }
      } catch {
        useAppStore.getState().updateDocument(doc.id, { status: 'error' });
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 lg:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-white">Documents</h1>
          <p className="text-xs text-white/30 mt-0.5">Upload files for knowledge retrieval</p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-6',
            isDragging ? 'border-white/30 bg-white/[0.02]' : 'border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.01]'
          )}
        >
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt,.md,.docx" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <Upload className="w-8 h-8 text-white/15 mx-auto mb-3" />
          <p className="text-sm text-white/40 mb-1">Drop files here or click to browse</p>
          <p className="text-xs text-white/15">PDF, TXT, Markdown, DOCX</p>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-8 h-8 text-white/10 mx-auto mb-2" />
            <p className="text-sm text-white/20">No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence>
              {documents.map((doc, i) => {
                const FileIcon = fileTypeIcons[doc.fileType] || File;
                return (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.2, delay: i * 0.02 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#111] border border-white/[0.04] hover:border-white/[0.08] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                      <FileIcon className="w-4 h-4 text-white/25" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{doc.filename}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-white/20 uppercase">{doc.fileType}</span>
                        <span className="text-[10px] text-white/10">·</span>
                        <span className="text-[10px] text-white/20">{formatSize(doc.fileSize)}</span>
                        {doc.chunkCount > 0 && (
                          <>
                            <span className="text-[10px] text-white/10">·</span>
                            <span className="text-[10px] text-white/20">{doc.chunkCount} chunks</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium',
                      doc.status === 'ready' ? 'bg-green-500/10 text-green-400' :
                      doc.status === 'processing' ? 'bg-yellow-500/10 text-yellow-400' :
                      'bg-red-500/10 text-red-400'
                    )}>
                      {doc.status === 'processing' ? <Loader2 className="w-3 h-3 animate-spin" /> :
                       doc.status === 'ready' ? <CheckCircle2 className="w-3 h-3" /> :
                       <AlertCircle className="w-3 h-3" />}
                      {doc.status}
                    </div>
                    <span className="text-[10px] text-white/15 hidden sm:block">{formatRelativeTime(doc.uploadedAt)}</span>
                    <button onClick={() => deleteDocument(doc.id)} className="p-1.5 rounded-lg text-white/10 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
