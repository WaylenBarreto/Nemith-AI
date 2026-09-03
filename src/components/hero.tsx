'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16">
      <div className="max-w-5xl mx-auto text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-elevated/50 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse-soft" />
          <span className="text-xs font-medium text-text-secondary tracking-wide uppercase">
            AI-Powered Development Agent
          </span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-8"
        >
          <span className="gradient-text">We build</span>
          <br />
          <span className="text-text-primary">the future of</span>
          <br />
          <span className="gradient-text-accent">intelligent software</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="text-lg md:text-xl text-text-secondary max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Nemith is a growing ecosystem. We connect design, engineering, and a shared
          perspective into one evolving system focused on how we see, build, and
          understand the future around us.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#contact"
            className="group flex items-center gap-2.5 px-7 py-3.5 text-sm font-medium bg-accent hover:bg-accent-hover text-white rounded-xl transition-all duration-300 shadow-glow hover:shadow-[0_0_40px_rgba(124,106,255,0.4)]"
          >
            <Sparkles className="w-4 h-4" />
            Start a Project
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </a>
          <a
            href="#features"
            className="flex items-center gap-2 px-7 py-3.5 text-sm font-medium text-text-secondary border border-border hover:border-border-bright hover:text-text-primary rounded-xl transition-all duration-200 bg-white/[0.02] hover:bg-white/[0.04]"
          >
            Explore Our Work
          </a>
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-void to-transparent" />
    </section>
  );
}
