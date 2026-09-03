'use client';

import dynamic from 'next/dynamic';
import { useAppStore } from '@/lib/store';
import Sidebar from './sidebar';
import DashboardPage from './dashboard-page';
import ChatPage from './chat-page';
import ProjectsPage from './projects-page';
import DocumentsPage from './documents-page';
import TasksPage from './tasks-page';
import SettingsPage from './settings-page';

const AppBackground = dynamic(() => import('./app-background'), { ssr: false });

const pages: Record<string, React.ComponentType> = {
  dashboard: DashboardPage,
  chat: ChatPage,
  projects: ProjectsPage,
  documents: DocumentsPage,
  tasks: TasksPage,
  settings: SettingsPage,
};

export default function AppShell() {
  const activePage = useAppStore((s) => s.activePage);
  const Page = pages[activePage] || DashboardPage;

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      <AppBackground />
      <div className="relative z-10 flex w-full">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <Page />
        </main>
      </div>
    </div>
  );
}
