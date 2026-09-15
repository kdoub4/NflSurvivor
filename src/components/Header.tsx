import React from 'react';
import { ActiveTab, AppSettings } from '../types';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Shield,
  Table,
  Sliders,
  Brain,
  Settings as SettingsIcon,
  Sparkles,
} from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  settings: AppSettings;
  picksCount: number;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  settings,
  picksCount,
  onOpenSettings,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-3">
        {/* Left: App Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 shadow-sm">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-none">
                NFL Survivor Strategy
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                PWA
              </span>
            </div>
            <div className="text-[11px] text-slate-400 hidden xs:block mt-0.5">
              Power Ratings • Dual Blend • Future Value Matrix
            </div>
          </div>
        </div>

        {/* Center: Main View Navigation Switch */}
        <nav className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            id="tab-matrix"
            onClick={() => onTabChange('matrix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Matrix</span>
          </button>

          <button
            type="button"
            id="tab-ratings"
            onClick={() => onTabChange('ratings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'ratings'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Ratings</span>
          </button>

          <button
            type="button"
            id="tab-strategy"
            onClick={() => onTabChange('strategy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              activeTab === 'strategy'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Advisor</span>
          </button>
        </nav>

        {/* Right: Blend Status, PWA Install & Settings */}
        <div className="flex items-center gap-2">
          {/* Blend status pill */}
          <button
            type="button"
            onClick={() => onTabChange('ratings')}
            title="Click to adjust User vs Market blend"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 hover:border-slate-700 cursor-pointer"
          >
            <span className="text-[10px] text-slate-400">Blend:</span>
            <span className="font-mono text-emerald-400 font-bold text-[11px]">
              {Math.round((1 - settings.blendRatio) * 100)}U / {Math.round(settings.blendRatio * 100)}M
            </span>
          </button>

          {/* In-App PWA Install Button */}
          <PWAInstallButton />

          {/* Settings / Backup Button */}
          <button
            type="button"
            id="open-settings-btn"
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
            title="Open Pool Settings and JSON Backup"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
