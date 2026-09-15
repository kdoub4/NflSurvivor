import React, { useState, useRef } from 'react';
import { AppSettings, TeamRating, SurvivorPick } from '../types';
import { StorageService } from '../db/database';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  X,
  FileJson,
  CheckCircle,
  AlertCircle,
  Shield,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  ratings: TeamRating[];
  picks: SurvivorPick[];
  onUpdateSettings: (settings: AppSettings) => void;
  onDataImported: (data: { ratings: TeamRating[]; picks: SurvivorPick[]; settings: AppSettings }) => void;
  onClearPicks: () => void;
  onResetRatings: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  ratings,
  picks,
  onUpdateSettings,
  onDataImported,
  onClearPicks,
  onResetRatings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmClearPicks, setConfirmClearPicks] = useState(false);
  const [confirmResetRatings, setConfirmResetRatings] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      const jsonStr = await StorageService.exportBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nfl-survivor-strategy-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setImportStatus({ type: 'success', message: 'Data successfully exported!' });
    } catch (e) {
      setImportStatus({ type: 'error', message: 'Failed to export backup.' });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = await StorageService.importBackup(text);
      onDataImported(imported);
      setImportStatus({
        type: 'success',
        message: `Imported ${imported.ratings.length} ratings and ${imported.picks.length} picks!`,
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setImportStatus({
        type: 'error',
        message: 'Invalid backup file format. Please upload a valid JSON backup.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Pool Strategy Settings & Backup</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status Message */}
          {importStatus && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${
                importStatus.type === 'success'
                  ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300'
                  : 'bg-rose-950/80 border-rose-700 text-rose-300'
              }`}
            >
              {importStatus.type === 'success' ? (
                <CheckCircle className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}

          {/* Current Week Configuration */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200">
                Active Pool Week
              </label>
              <span className="font-mono text-xs text-amber-400 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800">
                Week {settings.currentWeek}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Future Value (FV) calculates the number of remaining weeks from this active week onwards.
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
                <button
                  key={`settings-week-${w}`}
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, currentWeek: w })}
                  className={`w-7 h-7 text-xs font-mono font-bold rounded cursor-pointer transition ${
                    settings.currentWeek === w
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* JSON Backup & Restore */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <FileJson className="w-4 h-4 text-emerald-400" />
                Data Backup & Device Sync (JSON)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              Export your custom power ratings and survivor picks as a JSON file to transfer between devices or restore anytime.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={handleExport}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-white transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                <span>Export JSON</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Import JSON</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Market Data Provider Info */}
          <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-200">Market Power Ratings Source</span>
              <a
                href="https://stats.inpredictable.com/rankings/nfl.php"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-sky-400 hover:text-sky-300 underline"
              >
                stats.inpredictable.com
              </a>
            </div>
            <p className="text-[11px] text-slate-400">
              Generic Points Favored (GPF) derived from betting market point spreads & win totals.
            </p>
          </div>

          {/* Danger Zone: Reset Operations */}
          <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-900/40 space-y-3">
            <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider">
              Data Reset Operations
            </h3>

            <div className="flex flex-col gap-2">
              {/* Clear Picks */}
              {confirmClearPicks ? (
                <div className="flex items-center justify-between bg-rose-950/60 p-2.5 rounded-lg border border-rose-800">
                  <span className="text-xs text-rose-200">Confirm delete all {picks.length} picks?</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmClearPicks(false)}
                      className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onClearPicks();
                        setConfirmClearPicks(false);
                        setImportStatus({ type: 'success', message: 'All picks cleared.' });
                      }}
                      className="px-2 py-1 text-xs rounded bg-rose-600 text-white font-bold hover:bg-rose-500"
                    >
                      Yes, Clear
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearPicks(true)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    Clear All Survivor Picks ({picks.length})
                  </span>
                  <span className="text-[10px] text-slate-500">Keep Ratings</span>
                </button>
              )}

              {/* Reset Ratings */}
              {confirmResetRatings ? (
                <div className="flex items-center justify-between bg-rose-950/60 p-2.5 rounded-lg border border-rose-800">
                  <span className="text-xs text-rose-200">Reset 32 team ratings to default?</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setConfirmResetRatings(false)}
                      className="px-2 py-1 text-xs rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        onResetRatings();
                        setConfirmResetRatings(false);
                        setImportStatus({ type: 'success', message: 'Ratings reset to baseline.' });
                      }}
                      className="px-2 py-1 text-xs rounded bg-amber-600 text-white font-bold hover:bg-amber-500"
                    >
                      Yes, Reset
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmResetRatings(true)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    Reset All Ratings to Consensus Baseline
                  </span>
                  <span className="text-[10px] text-slate-500">Keep Picks</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition cursor-pointer"
          >
            Close Settings
          </button>
        </div>
      </div>
    </div>
  );
};
