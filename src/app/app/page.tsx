'use client';

import dynamic from 'next/dynamic';

const AppShell = dynamic(() => import('@/components/app/app-shell'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-void">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-blue animate-pulse" />
    </div>
  ),
});

export default function AppPage() {
  return <AppShell />;
}
