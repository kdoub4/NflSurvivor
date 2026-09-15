import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  Copy,
  Check,
  Smartphone,
  Laptop,
  QrCode,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Share2,
} from 'lucide-react';
import {
  generateRoomCode,
  isValidRoomCode,
  pushRoomData,
  pullRoomData,
  buildRoomUrl,
  generateRoomQRCode,
} from '../services/syncService';
import { StorageService } from '../db/database';
import { TeamRating, SurvivorPick, AppSettings, LockedWeekData } from '../types';

interface CloudSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  ratings: TeamRating[];
  picks: SurvivorPick[];
  settings: AppSettings;
  lockedWeeks: Record<number, LockedWeekData>;
  onDataLoaded: (data: {
    ratings: TeamRating[];
    picks: SurvivorPick[];
    settings: AppSettings;
    lockedWeeks?: Record<number, LockedWeekData>;
  }) => void;
  activeRoomCode: string | null;
  onActiveRoomChange: (code: string | null) => void;
  autoSync: boolean;
  onAutoSyncChange: (enabled: boolean) => void;
  lastSyncedAt: string | null;
}

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  isOpen,
  onClose,
  ratings,
  picks,
  settings,
  lockedWeeks,
  onDataLoaded,
  activeRoomCode,
  onActiveRoomChange,
  autoSync,
  onAutoSyncChange,
  lastSyncedAt,
}) => {
  const [inputCode, setInputCode] = useState<string>(activeRoomCode || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [showVercelGuide, setShowVercelGuide] = useState<boolean>(false);

  // Sync initial input code when activeRoomCode changes
  useEffect(() => {
    if (activeRoomCode) {
      setInputCode(activeRoomCode);
    } else if (!inputCode) {
      setInputCode(generateRoomCode());
    }
  }, [activeRoomCode]);

  // Generate QR code whenever the input code is valid
  useEffect(() => {
    const clean = inputCode.trim().toUpperCase();
    if (isValidRoomCode(clean)) {
      const url = buildRoomUrl(clean);
      generateRoomQRCode(url).then((dataUrl) => {
        setQrDataUrl(dataUrl);
      });
    } else {
      setQrDataUrl('');
    }
  }, [inputCode]);

  if (!isOpen) return null;

  const currentCleanCode = inputCode.trim().toUpperCase();
  const isCodeValid = isValidRoomCode(currentCleanCode);

  const handleGenerateNew = () => {
    const newCode = generateRoomCode();
    setInputCode(newCode);
    setStatusMessage({
      type: 'info',
      text: `Generated new room code: ${newCode}. Click "Push to Cloud" to initialize it.`,
    });
  };

  // Push current device data to the cloud room
  const handlePush = async () => {
    if (!isCodeValid) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid 6-character room code.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const response = await pushRoomData(currentCleanCode, {
        ratings,
        picks,
        settings,
        lockedWeeks,
        updatedAt: new Date().toISOString(),
        version: 2,
      });

      onActiveRoomChange(currentCleanCode);
      StorageService.setActiveRoomCode(currentCleanCode);
      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      StorageService.setLastSyncedAt(now);

      setStatusMessage({
        type: 'success',
        text: `Successfully pushed data to Room ${currentCleanCode}! ${
          response.kvConnected
            ? '(Vercel KV persistent storage connected)'
            : '(Saved to cloud room container)'
        }`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Pull cloud room data and load onto this device
  const handlePull = async () => {
    if (!isCodeValid) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid 6-character room code.' });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const response = await pullRoomData(currentCleanCode);
      if (response && response.data) {
        const payload = response.data;
        onDataLoaded({
          ratings: payload.ratings || [],
          picks: payload.picks || [],
          settings: payload.settings || settings,
          lockedWeeks: payload.lockedWeeks || {},
        });

        onActiveRoomChange(currentCleanCode);
        StorageService.setActiveRoomCode(currentCleanCode);
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        StorageService.setLastSyncedAt(now);

        const pickCount = (payload.picks || []).length;
        const lockedCount = Object.keys(payload.lockedWeeks || {}).length;

        setStatusMessage({
          type: 'success',
          text: `Loaded Room ${currentCleanCode}: ${pickCount} picks, ${payload.ratings.length} ratings, and ${lockedCount} locked weeks synchronized.`,
        });
      }
    } catch (err: unknown) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    if (!isCodeValid) return;
    navigator.clipboard.writeText(currentCleanCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!isCodeValid) return;
    const url = buildRoomUrl(currentCleanCode);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div
      id="cloud-sync-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        id="cloud-sync-modal-container"
        className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Multi-Device Cloud Sync
                <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Option #2
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Sync picks & ratings across phone, tablet, and laptop with a 6-character room code
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Status Message Alert */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border transition ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-200'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/60 border-rose-600/50 text-rose-200'
                  : 'bg-sky-950/60 border-sky-600/50 text-sky-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{statusMessage.text}</div>
            </div>
          )}

          {/* 6-Character Room Code Input Box */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span>Room Sync Code</span>
                <span className="text-[10px] font-mono text-slate-500">(6 characters)</span>
              </label>

              {activeRoomCode && (
                <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active: {activeRoomCode}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  placeholder="e.g. K9X2P7"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xl font-mono font-bold tracking-widest text-center text-emerald-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner"
                />
                {isCodeValid && (
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    title="Copy 6-character code"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    {copiedCode ? (
                      <Check className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerateNew}
                title="Generate New Code"
                className="px-3 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-medium"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">New Code</span>
              </button>
            </div>

            {/* Sync Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handlePush}
                disabled={isLoading || !isCodeValid}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition shadow-md shadow-emerald-900/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudUpload className="w-4 h-4" />
                )}
                <span>Push to Cloud</span>
              </button>

              <button
                type="button"
                onClick={handlePull}
                disabled={isLoading || !isCodeValid}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-100 border border-slate-700 font-semibold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CloudDownload className="w-4 h-4 text-sky-400" />
                )}
                <span>Pull & Load</span>
              </button>
            </div>

            {/* Auto-Sync Toggle */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex flex-col">
                <span className="font-medium text-slate-200">Auto-Sync on Changes</span>
                <span className="text-[11px] text-slate-400">
                  Automatically pushes changes to this room
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => {
                    onAutoSyncChange(e.target.checked);
                    StorageService.setAutoSyncEnabled(e.target.checked);
                  }}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* Connect Another Device: Mobile QR & Share Link */}
          {isCodeValid && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span>Open on Your Phone or Tablet</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Laptop className="w-3.5 h-3.5" />
                  <span>⇄</span>
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                {qrDataUrl ? (
                  <div className="bg-white p-2 rounded-xl shadow-md shrink-0 border border-slate-200">
                    <img
                      src={qrDataUrl}
                      alt={`QR Code for Room ${currentCleanCode}`}
                      className="w-28 h-28"
                    />
                  </div>
                ) : null}

                <div className="space-y-2 text-xs text-slate-300 text-center sm:text-left flex-1">
                  <p className="leading-relaxed">
                    Point your phone’s camera at the QR code to open the app with room{' '}
                    <strong className="text-emerald-400 font-mono">{currentCleanCode}</strong>{' '}
                    pre-linked.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white transition flex items-center gap-1.5 text-xs font-medium"
                    >
                      {copiedLink ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Share2 className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedLink ? 'Link Copied!' : 'Copy Direct Link'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vercel KV Setup Helper Accordion */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
            <button
              type="button"
              onClick={() => setShowVercelGuide(!showVercelGuide)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-slate-300 hover:text-white hover:bg-slate-850/50 transition text-left"
            >
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold">How to Enable Permanent Cloud Storage on Vercel</span>
              </div>
              {showVercelGuide ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showVercelGuide && (
              <div className="p-4 pt-2 text-xs text-slate-400 space-y-2 border-t border-slate-800/80 bg-slate-950/60 leading-relaxed">
                <p>
                  Your deployment includes a built-in Vercel Serverless Function (
                  <code className="text-emerald-400 font-mono">/api/sync</code>). To store room data
                  permanently across serverless cold starts:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>
                    Open your project on the{' '}
                    <a
                      href="https://vercel.com/dashboard"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:underline"
                    >
                      Vercel Dashboard
                    </a>
                    .
                  </li>
                  <li>
                    Navigate to the <strong>Storage</strong> tab.
                  </li>
                  <li>
                    Click <strong>Create Database</strong> → choose <strong>KV (Redis)</strong>.
                  </li>
                  <li>
                    Click <strong>Connect to Project</strong>.
                  </li>
                </ol>
                <p className="text-[11px] text-slate-400 pt-1">
                  Vercel automatically provisions the free Redis store and injects{' '}
                  <code className="font-mono text-slate-300">KV_REST_API_URL</code> and{' '}
                  <code className="font-mono text-slate-300">KV_REST_API_TOKEN</code>. No code changes
                  required!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <div>
            {lastSyncedAt ? (
              <span>
                Last synced at: <strong className="text-slate-200">{lastSyncedAt}</strong>
              </span>
            ) : (
              <span>Not synced yet in this session</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white transition font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
