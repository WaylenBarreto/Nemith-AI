'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Settings, Key, Cpu, Thermometer, Save, Check, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsData {
  openrouterKey: string;
  openrouterModel: string;
  geminiKey: string;
  geminiModel: string;
  temperature: number;
  maxTokens: number;
  serperKey: string;
  githubToken: string;
}

const defaultSettings: SettingsData = {
  openrouterKey: '',
  openrouterModel: 'openai/gpt-4o-mini',
  geminiKey: '',
  geminiModel: 'gemini-3.8-flash',
  temperature: 0.7,
  maxTokens: 4000,
  serperKey: '',
  githubToken: '',
};

const openrouterModels = [
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', tier: 'Fast' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', tier: 'Smart' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', tier: 'Smart' },
  { id: 'anthropic/claude-3.5-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic', tier: 'Fast' },
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', tier: 'Fast' },
  { id: 'meta-llama/llama-4-scout:free', name: 'Llama 4 Scout (Free)', provider: 'Meta', tier: 'Free' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', tier: 'Smart' },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [saved, setSaved] = useState(false);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem('nemith_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
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
        <div className="flex items-center justify-between px-4 md:px-6 lg:px-8 h-12 md:h-14 pl-14 md:pl-4">
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

      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto space-y-8">

          {/* OpenRouter Config */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-4 h-4 text-white/40" />
              <h2 className="text-sm font-medium text-white">OpenRouter (Primary)</h2>
            </div>

            {/* API Key */}
            <div className="bg-[#111] border border-white/[0.04] rounded-xl p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/50">API Key</span>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/40 transition-colors"
                >
                  Get key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showKeys.openrouterKey ? 'text' : 'password'}
                  value={settings.openrouterKey}
                  onChange={(e) => updateSetting('openrouterKey', e.target.value)}
                  placeholder="sk-or-..."
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.06] text-sm text-white/60 placeholder:text-white/15 outline-none focus:border-white/[0.12] transition-colors font-mono pr-16"
                />
                <button
                  onClick={() => setShowKeys((prev) => ({ ...prev, openrouterKey: !prev.openrouterKey }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/20 hover:text-white/40 transition-colors px-1.5 py-0.5 rounded border border-white/[0.06]"
                >
                  {showKeys.openrouterKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {/* Model */}
            <div className="bg-[#111] border border-white/[0.04] rounded-xl p-4">
              <span className="text-sm text-white/50 mb-3 block">Model</span>
              <div className="space-y-1.5">
                {openrouterModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => updateSetting('openrouterModel', model.id)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-all',
                      settings.openrouterModel === model.id
                        ? 'bg-white/[0.08] border-white/[0.15] text-white'
                        : 'bg-transparent border-white/[0.04] text-white/40 hover:border-white/[0.08] hover:text-white/60'
                    )}
                  >
                    <span>{model.name}</span>
                    <span className="text-xs text-white/20">{model.provider} · {model.tier}</span>
                  </button>
                ))}
              </div>
              <div className="mt-3">
                <input
                  type="text"
                  value={settings.openrouterModel}
                  onChange={(e) => updateSetting('openrouterModel', e.target.value)}
                  placeholder="Custom model ID..."
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.06] text-sm text-white/60 placeholder:text-white/20 outline-none focus:border-white/[0.12] transition-colors font-mono"
                />
                <p className="text-[10px] text-white/15 mt-1.5 px-1">
                  Or type a custom model from{' '}
                  <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-white/50 underline">
                    openrouter.ai/models
                  </a>
                </p>
              </div>
            </div>
          </motion.section>

          {/* Gemini Fallback */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-blue-400/60" />
              <h2 className="text-sm font-medium text-white">Gemini (Fallback)</h2>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400/60 border border-blue-500/20">Auto on 429</span>
            </div>
            <div className="bg-[#111] border border-white/[0.04] rounded-xl p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/50">API Key</span>
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-white/20 hover:text-white/40 transition-colors"
                >
                  Get key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showKeys.geminiKey ? 'text' : 'password'}
                  value={settings.geminiKey}
                  onChange={(e) => updateSetting('geminiKey', e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.06] text-sm text-white/60 placeholder:text-white/15 outline-none focus:border-white/[0.12] transition-colors font-mono pr-16"
                />
                <button
                  onClick={() => setShowKeys((prev) => ({ ...prev, geminiKey: !prev.geminiKey }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-white/20 hover:text-white/40 transition-colors px-1.5 py-0.5 rounded border border-white/[0.06]"
                >
                  {showKeys.geminiKey ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="bg-[#111] border border-white/[0.04] rounded-xl p-4">
              <span className="text-sm text-white/50 mb-2 block">Model</span>
              <input
                type="text"
                value={settings.geminiModel}
                onChange={(e) => updateSetting('geminiModel', e.target.value)}
                placeholder="gemini-3.8-flash"
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.06] text-sm text-white/60 placeholder:text-white/15 outline-none focus:border-white/[0.12] transition-colors font-mono"
              />
            </div>
          </motion.section>

          {/* Parameters */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Thermometer className="w-4 h-4 text-white/40" />
              <h2 className="text-sm font-medium text-white">Parameters</h2>
            </div>
            <div className="space-y-4">
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

          {/* Other API Keys */}
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-4 h-4 text-white/40" />
              <h2 className="text-sm font-medium text-white">Other Keys</h2>
            </div>
            <div className="space-y-3">
              {[
                { key: 'serperKey' as const, label: 'Serper API Key (Web Search)', placeholder: '...', link: 'https://serper.dev/' },
                { key: 'githubToken' as const, label: 'GitHub Token (Read-only)', placeholder: 'ghp_...', link: 'https://github.com/settings/tokens' },
              ].map((apiKey) => (
                <div key={apiKey.key} className="bg-[#111] border border-white/[0.04] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/50">{apiKey.label}</span>
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
