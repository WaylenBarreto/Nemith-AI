'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Menu } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import Sidebar from './sidebar';
import DashboardPage from './dashboard-page';
import ChatPage from './chat-page';
import WarRoomPage from './war-room-page';
import ProjectsPage from './projects-page';
import DocumentsPage from './documents-page';
import TasksPage from './tasks-page';
import SettingsPage from './settings-page';

const AppBackground = dynamic(() => import('./app-background'), { ssr: false });

const pages: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  chat: ChatPage,
  'war-room': WarRoomPage,
  projects: ProjectsPage,
  documents: DocumentsPage,
  tasks: TasksPage,
  settings: SettingsPage,
};

export default function AppShell() {
  const activePage = useAppStore((s) => s.activePage);
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
  const Page = pages[activePage] || DashboardPage;

  // Auto-open sidebar on desktop
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)');
    if (mql.matches) setSidebarOpen(true);
    const handler = (e: MediaQueryListEvent) => setSidebarOpen(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [setSidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      <AppBackground />
      <div className="relative z-10 flex w-full">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Mobile hamburger */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="fixed top-3 left-3 z-30 p-2.5 rounded-xl bg-[#161616] border border-white/[0.08] text-white/60 hover:text-white hover:bg-[#222] transition-colors md:hidden shadow-lg"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <Page />
        </main>
      </div>
    </div>
  );
}
