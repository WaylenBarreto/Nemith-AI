'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';

const StarField = dynamic(() => import('@/components/star-field'), { ssr: false });

export default function Home() {
  return (
    <>
      <StarField />

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Nav */}
        <nav className="flex items-center justify-between px-4 sm:px-6 md:px-8 py-4 sm:py-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 0 1 0 20" fill="white" opacity="0.3" />
              </svg>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/app"
              className="flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-2.5 rounded-full border border-white/20 text-xs sm:text-sm text-white/80 hover:border-white/40 hover:text-white transition-all duration-300"
            >
              <span className="hidden sm:inline">Start a project</span>
              <span className="sm:hidden">Start</span>
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
              </span>
            </Link>
          </div>
        </nav>

        {/* Center - Giant brand name */}
        <div className="flex-1 flex flex-col items-center justify-center -mt-8 md:-mt-16 px-4">
          <div className="text-right mb-4">
            <p className="text-sm text-white/40">©2026</p>
            <p className="text-sm text-white/40">AI Development Studio</p>
          </div>
          <h1 className="text-[12vw] sm:text-[10vw] md:text-[9vw] lg:text-[8vw] font-light tracking-tight text-white leading-none select-none glow-text">
            Nemith
          </h1>
          <p className="text-base md:text-lg text-white/50 mt-4 tracking-wide">
            Personal AI Developer Workspace
          </p>
        </div>

        {/* Bottom left - description + founder */}
        <div className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-base text-white/70 max-w-sm leading-relaxed mb-4">
              We build intelligent software, design systems, and full-stack products for <span className="text-white">AI startups</span> and technology companies.
            </p>
            <div className="flex items-center gap-2 text-sm text-white/40">
              <span className="text-white/60">✦</span>
              <span>Nemith Studio, Founder</span>
            </div>
          </div>

          <Link
            href="/app"
            className="hidden md:flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
          >
            Open workspace
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 17L17 7M17 7H7M17 7V17" />
            </svg>
          </Link>
        </div>
      </div>
    </>
  );
}
