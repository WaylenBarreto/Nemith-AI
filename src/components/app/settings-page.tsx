'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Key, Cpu, Thermometer, Hash, Save, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsData {
  model: string;
  temperature: number;
  maxTokens: number;
  openrouterKey: string;
  serperKey: string;
  githubToken: string;
}

const defaultSettings: SettingsData = {
  model: 'minimax/minimax-m3:free',
  temperature: 0.7,
  maxTokens: 4000,
  openrouterKey: '',
  serperKey: '',
  githubToken: '',
};

const popularModels = [
  { id: 'minimax/minimax-m3:free', name: 'MiniMax M3 (Free)', provider: 'MiniMax' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google' },
  { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', provider: 'Meta' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek' },
  { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen 2.5 72B', provider: 'Qwen' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Load from localStorage
    try {
      const stored = localStorage.getItem('nemith_settings');
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      }
    } catch {}
  }, []);

  const handleSave = () => {
    localStorage.setItem('nemith_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateSetting = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="sticky top-0 z-10 bg-black/60 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 lg:px-8 h-14">
          <h1 className="text-sm font-medium text-white">Settings</h1>
          <button
            onClick={handleSave}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all',
              saved
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-white/[0.08] text-white/70 border border-white/[0.08] hover:bg-white/[0.12]'
            )}
          >
            {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      <div className="p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* Model Selection */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-4 h-4 text-white/40" />
              <h2 className="text-sm font-medium text-white">Model</h2>
            </div>
            <div className="space-y-1.5">
              {popularModels.map((model) => (
                <button
                  key={model.id}
                  onClick={() => updateSetting('model', model.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all',
                    settings.model === model.id
                      ? 'bg-white/[0.08] border-white/[0.15] text-white'
                      : 'bg-[#111] border-white/[0.04] text-white/40 hover:border-white/[0.08] hover:text-white/60'
                  )}
                >
                  <span>{model.name}</span>
                  <span className="text-xs text-white/20">{model.provider}</span>
                </button>
              ))}
            </div>
            <div className="mt-3">
              <input
                type="text"
                value={settings.model}
                onChange={(e) => updateSetting('model', e.target.value)}
                placeholder="Custom model ID..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#111] border border-white/[0.04] text-sm text-white/60 placeholder:text-white/20 outline-none focus:border-white/[0.12] transition-colors font-mono"
              />
              <p className="text-[10px] text-white/15 mt-1.5 px-1">
                Or type a custom model ID from{' '}
                <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/50 underline">
                  openrouter.ai/models
                </a>
              </p>
            </div>
          </motion.section>

          {/* Parameters */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Thermometer className="w-4 h-4 text-white/40" />
              <h2 className="text-sm font-medium text-white">Parameters</h2>
            </div>
            <div className="space-y-4">
              {/* Temperature */}
              <div className="bg-[#111] border border-white/[0.04] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-white/50">Temperature</span>
                  <span className="text-sm font-mono text-white/70">{settings.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.temperature}
                  onChange={(e) => updateSetting('temperature', parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-white/15">Precise</span>
                  <span className="text-[10px] text-white/15">Creative</span>
                </div>
              </div>

              {/* Max Tokens */}
              <div className="bg-[#111] border border-white/[0.04] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-white/50">Max Tokens</span>
                  <span className="text-sm font-mono text-white/70">{settings.maxTokens}</span>
                </div>
                <input
                  type="range"
                  min="512"
                  max="16000"
                  step="256"
                  value={settings.maxTokens}
                  onChange={(e) => updateSetting('maxTokens', parseInt(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-white/15">512</span>
                  <span className="text-[10px] text-white/15">16000</span>
                </div>
              </div>
            </div>
          </motion.section>

          {/* API Keys */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-white/40" />
              <h2 className="text-sm font-medium text-white">API Keys</h2>
            </div>
            <div className="space-y-3">
              {[
                { key: 'openrouterKey' as const, label: 'OpenRouter API Key', placeholder: 'sk-or-...', link: 'https://openrouter.ai/keys', required: true },
                { key: 'serperKey' as const, label: 'Serper API Key', placeholder: '...', link: 'https://serper.dev/', required: false },
                { key: 'githubToken' as const, label: 'GitHub Token', placeholder: 'ghp_...', link: 'https://github.com/settings/tokens', required: false },
              ].map((apiKey) => (
                <div key={apiKey.key} className="bg-[#111] border border-white/[0.04] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/50">{apiKey.label}</span>
                      {apiKey.required && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/30">Required</span>
                      )}
                    </div>
                    <a
                      href={apiKey.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/40 transition-colors"
                    >
                      Get key <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showKeys[apiKey.key] ? 'text' : 'password'}
                      value={settings[apiKey.key]}
                      onChange={(e) => updateSetting(apiKey.key, e.target.value)}
                      placeholder={apiKey.placeholder}
                      className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.06] text-sm text-white/60 placeholder:text-white/15 outline-none focus:border-white/[0.12] transition-colors font-mono pr-16"
                    />
                    <button
                      onClick={() => setShowKeys((prev) => ({ ...prev, [apiKey.key]: !prev[apiKey.key] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/20 hover:text-white/40 transition-colors px-1.5 py-0.5 rounded border border-white/[0.06]"
                    >
                      {showKeys[apiKey.key] ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        </div>
      </div>
    </div>
  );
}
