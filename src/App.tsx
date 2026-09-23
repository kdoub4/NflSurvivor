import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ActiveTab,
  AppSettings,
  ScheduledGame,
  SurvivorPick,
  TeamRating,
  LockedWeekData,
} from './types';
import { NFL_TEAMS, INITIAL_RATINGS } from './data/teams';
import { INITIAL_SCHEDULE } from './data/schedule';
import { fetchFoxSportsClosingOdds } from './data/foxSportsOdds';
import { StorageService } from './db/database';
import { buildTeamsWithStats } from './utils/calculations';
import { Header } from './components/Header';
import { PickSummaryBar } from './components/PickSummaryBar';
import { SurvivorMatrix } from './components/SurvivorMatrix';
import { RatingEditor } from './components/RatingEditor';
import { StrategyAdvisor } from './components/StrategyAdvisor';
import { SettingsModal } from './components/SettingsModal';
import { CloudSyncModal } from './components/CloudSyncModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { getRoomCodeFromUrl, pullRoomData, pushRoomData } from './services/syncService';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('matrix');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Multi-device sync state
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const isInitialLoadRef = React.useRef(true);

  // Core persistent states
  const [ratings, setRatings] = useState<TeamRating[]>(INITIAL_RATINGS);
  const [schedule, setSchedule] = useState<ScheduledGame[]>(INITIAL_SCHEDULE);
  const [picks, setPicks] = useState<SurvivorPick[]>([]);
  const [lockedWeeks, setLockedWeeks] = useState<Record<number, LockedWeekData>>({});
  const [lockingWeek, setLockingWeek] = useState<number | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    blendRatio: 0.5,
    globalHfa: 1.5,
    currentWeek: 1,
  });

  // Load database on mount
  useEffect(() => {
    async function initData() {
      try {
        await StorageService.init();
        const [loadedRatings, loadedSchedule, loadedPicks, loadedSettings, loadedLockedWeeks] =
          await Promise.all([
            StorageService.getRatings(),
            StorageService.getSchedule(),
            StorageService.getPicks(),
            StorageService.getSettings(),
            StorageService.getLockedWeeks(),
          ]);

        if (loadedRatings && loadedRatings.length > 0) {
          setRatings(loadedRatings);
        }
        if (loadedSchedule && loadedSchedule.length > 0) {
          const initMap = new Map(INITIAL_SCHEDULE.map((g) => [g.gameId, g]));
          const merged = loadedSchedule.map((g) => {
            const init = initMap.get(g.gameId);
            return {
              ...g,
              isMondayNight: init?.isMondayNight ?? g.isMondayNight,
              isNeutral: init?.isNeutral ?? g.isNeutral,
              neutralLocation: init?.neutralLocation ?? g.neutralLocation,
              venue: init?.venue ?? g.venue,
            };
          });
          setSchedule(merged);
        }
        if (loadedPicks) {
          setPicks(loadedPicks);
        }
        if (loadedSettings) {
          setSettings(loadedSettings);
        }
        if (loadedLockedWeeks) {
          // Self-heal any legacy records where savedSpreads was corrupted ({ undefined: ... })
          const activeRatings = (loadedRatings && loadedRatings.length > 0) ? loadedRatings : INITIAL_RATINGS;
          const activeSched = (loadedSchedule && loadedSchedule.length > 0) ? loadedSchedule : INITIAL_SCHEDULE;
          const activePicks = loadedPicks || [];
          const activeSettings = loadedSettings || { blendRatio: 0.5, globalHfa: 1.5, currentWeek: 1 };
          
          let repaired = false;
          const cleanLocked: Record<number, LockedWeekData> = { ...loadedLockedWeeks };
          Object.values(cleanLocked).forEach((lw) => {
            if (lw && lw.isLocked) {
              const keys = Object.keys(lw.savedSpreads || {});
              if (keys.length === 0 || keys.includes('undefined')) {
                repaired = true;
                const freshSpreads: Record<string, number> = {};
                const baseStats = buildTeamsWithStats(
                  NFL_TEAMS,
                  activeRatings,
                  activeSched,
                  activePicks,
                  activeSettings.blendRatio,
                  activeSettings.globalHfa,
                  activeSettings.currentWeek,
                  {}
                );
                baseStats.forEach((ts) => {
                  const m = ts.matchupsByWeek[lw.week];
                  if (m && !m.isBye) {
                    freshSpreads[ts.team.id] = m.projectedSpread;
                  }
                });
                lw.savedSpreads = freshSpreads;
                StorageService.saveLockedWeek(lw);
              }
            }
          });

          setLockedWeeks(cleanLocked);
        }

        // Initialize multi-device room code state
        const urlRoom = getRoomCodeFromUrl();
        const storedRoom = StorageService.getActiveRoomCode();
        const initialRoom = urlRoom || storedRoom;

        if (initialRoom) {
          setActiveRoomCode(initialRoom);
          StorageService.setActiveRoomCode(initialRoom);

          // If launched with URL room code, auto-pull latest state
          if (urlRoom) {
            try {
              const cloudData = await pullRoomData(urlRoom);
              if (cloudData && cloudData.data) {
                const payload = cloudData.data;
                if (payload.ratings && payload.ratings.length > 0) setRatings(payload.ratings);
                if (payload.picks) setPicks(payload.picks);
                if (payload.settings) setSettings(payload.settings);
                if (payload.lockedWeeks) setLockedWeeks(payload.lockedWeeks);
                const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                StorageService.setLastSyncedAt(now);
                setLastSyncedAt(now);
              }
            } catch (syncErr) {
              console.warn('Initial room auto-fetch notice:', syncErr);
            }
          }
        }

        setAutoSync(StorageService.getAutoSyncEnabled());
        setLastSyncedAt(StorageService.getLastSyncedAt());
      } catch (err) {
        console.error('Failed to initialize local database:', err);
      } finally {
        setIsLoading(false);
        // Delay enabling auto-sync pushing until first render settles
        setTimeout(() => {
          isInitialLoadRef.current = false;
        }, 1200);
      }
    }

    initData();
  }, []);

  // Background Auto-Sync Effect (debounced)
  useEffect(() => {
    if (isLoading || isInitialLoadRef.current || !autoSync || !activeRoomCode) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        await pushRoomData(activeRoomCode, {
          ratings,
          picks,
          settings,
          lockedWeeks,
          updatedAt: new Date().toISOString(),
          version: 2,
        });
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        StorageService.setLastSyncedAt(now);
        setLastSyncedAt(now);
      } catch (err) {
        console.warn('Background auto-sync failed:', err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [ratings, picks, settings, lockedWeeks, autoSync, activeRoomCode, isLoading]);

  // Compute full 32-team dataset with spreads, future values, and status
  const teamsWithStats = useMemo(() => {
    return buildTeamsWithStats(
      NFL_TEAMS,
      ratings,
      schedule,
      picks,
      settings.blendRatio,
      settings.globalHfa,
      settings.currentWeek,
      lockedWeeks
    );
  }, [ratings, schedule, picks, settings, lockedWeeks]);

  // Lock / Unlock a Week
  const handleToggleLockWeek = useCallback(
    async (week: number) => {
      const isAlreadyLocked = Boolean(
        lockedWeeks[week]?.isLocked ||
        (lockedWeeks as Record<string, LockedWeekData>)[String(week)]?.isLocked
      );

      if (isAlreadyLocked) {
        // Unlock / reopen the week immediately in state
        setLockedWeeks((prev) => {
          const next = { ...prev };
          delete next[week];
          delete (next as Record<string, LockedWeekData>)[String(week)];
          return next;
        });
        await StorageService.unlockWeek(week);
        return;
      }

      // Lock / close the week:
      // 1. Snapshot the current projected spread for each team in that week
      setLockingWeek(week);
      try {
        const savedSpreads: Record<string, number> = {};
        teamsWithStats.forEach((teamStat) => {
          const m = teamStat.matchupsByWeek[week];
          if (m && !m.isBye) {
            savedSpreads[teamStat.team.id] = m.projectedSpread;
          }
        });

        // 2. Fetch closing odds (Fox Sports verified lines for W1, or derived consensus from saved spreads)
        const result = await fetchFoxSportsClosingOdds(week, schedule, savedSpreads);

        // 3. Immediately freeze the week in React state so the UI and memoized calculations freeze instantly
        const newLockedData: LockedWeekData = {
          week,
          isLocked: true,
          savedSpreads,
          closingOdds: result.odds,
          lockedAt: new Date().toISOString(),
        };

        setLockedWeeks((prev) => ({
          ...prev,
          [week]: newLockedData,
        }));

        // 4. Persist locked week record to storage
        await StorageService.saveLockedWeek(newLockedData);
      } catch (err) {
        console.error(`Failed to lock Week ${week}:`, err);
      } finally {
        setLockingWeek(null);
      }
    },
    [lockedWeeks, teamsWithStats, schedule]
  );

  // Pick / Toggle Cell
  const handleCellClick = useCallback(
    async (teamId: string, week: number) => {
      const doubleWeeks = settings.doublePickWeeks ?? [12, 16];
      const isDouble = doubleWeeks.includes(week);
      const picksInWeek = picks.filter((p) => p.week === week);
      const isAlreadyPickedThisWeek = picksInWeek.some((p) => p.teamId === teamId);

      if (isAlreadyPickedThisWeek) {
        // Clicking same team in that week clears the pick
        const updated = await StorageService.removePick(week, teamId);
        setPicks(updated);
        return;
      }

      // Check if team was already picked in an earlier or different week
      const priorPick = picks.find(
        (p) => p.teamId === teamId && p.week !== week
      );
      if (priorPick && priorPick.week < week) {
        // Locked out: team already used in prior week
        return;
      }

      const updated = await StorageService.savePick(week, teamId, isDouble);
      setPicks(updated);
    },
    [picks, settings.doublePickWeeks]
  );

  const handleClearPick = useCallback(async (week: number, teamId?: string) => {
    const updated = await StorageService.removePick(week, teamId);
    setPicks(updated);
  }, []);

  const handleClearAllPicks = useCallback(async () => {
    await StorageService.clearAllPicks();
    setPicks([]);
  }, []);

  const handleUpdateRating = useCallback(async (rating: TeamRating) => {
    setRatings((prev) => {
      const copy = [...prev];
      const idx = copy.findIndex((r) => r.teamId === rating.teamId);
      if (idx >= 0) {
        copy[idx] = rating;
      } else {
        copy.push(rating);
      }
      return copy;
    });
    await StorageService.saveRating(rating);
  }, []);

  const handleUpdateRatings = useCallback(async (newRatings: TeamRating[]) => {
    setRatings(newRatings);
    await StorageService.saveRatings(newRatings);
  }, []);

  const handleResetRatings = useCallback(async () => {
    const defaultRatings = await StorageService.resetRatingsToDefault();
    setRatings(defaultRatings);
  }, []);

  const handleUpdateSettings = useCallback(
    async (newSettings: AppSettings) => {
      setSettings(newSettings);
      await StorageService.saveSettings(newSettings);
    },
    []
  );

  const handleUpdateBlendRatio = useCallback(
    async (ratio: number) => {
      const updated = { ...settings, blendRatio: ratio };
      setSettings(updated);
      await StorageService.saveSettings(updated);
    },
    [settings]
  );

  const handleUpdateGlobalHfa = useCallback(
    async (hfa: number) => {
      const updated = { ...settings, globalHfa: hfa };
      setSettings(updated);
      await StorageService.saveSettings(updated);
    },
    [settings]
  );

  const handleSelectWeek = useCallback(
    async (week: number) => {
      const updated = { ...settings, currentWeek: week };
      setSettings(updated);
      await StorageService.saveSettings(updated);
    },
    [settings]
  );

  const handleToggleGreyOutMonday = useCallback(
    async (enabled: boolean) => {
      const updated = { ...settings, greyOutMondayNight: enabled };
      setSettings(updated);
      await StorageService.saveSettings(updated);
    },
    [settings]
  );

  const handleDataImported = useCallback(
    (data: {
      ratings: TeamRating[];
      picks: SurvivorPick[];
      settings: AppSettings;
      lockedWeeks?: Record<number, LockedWeekData>;
    }) => {
      setRatings(data.ratings);
      setPicks(data.picks);
      setSettings(data.settings);
      if (data.lockedWeeks) {
        setLockedWeeks(data.lockedWeeks);
      }
    },
    []
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
        <h2 className="text-sm font-semibold tracking-wide">
          Initializing NFL Survivor Engine...
        </h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        settings={settings}
        picksCount={picks.length}
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeRoomCode={activeRoomCode}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />

      {/* Week-by-Week Survivor Pick Path Timeline */}
      <PickSummaryBar
        picks={picks}
        teamsWithStats={teamsWithStats}
        currentWeek={settings.currentWeek}
        settings={settings}
        onSelectWeek={handleSelectWeek}
        onClearPick={handleClearPick}
        onClearAllPicks={handleClearAllPicks}
      />

      {/* Tab Content Views */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab === 'matrix' && (
          <SurvivorMatrix
            teamsWithStats={teamsWithStats}
            picks={picks}
            currentWeek={settings.currentWeek}
            settings={settings}
            greyOutMondayNight={Boolean(settings.greyOutMondayNight)}
            onToggleGreyOutMonday={handleToggleGreyOutMonday}
            onCellClick={handleCellClick}
            onSelectWeek={handleSelectWeek}
            lockedWeeks={lockedWeeks}
            onToggleLockWeek={handleToggleLockWeek}
            isLockingWeek={lockingWeek}
          />
        )}

        {activeTab === 'ratings' && (
          <div className="flex-1 overflow-y-auto">
            <RatingEditor
              ratings={ratings}
              blendRatio={settings.blendRatio}
              globalHfa={settings.globalHfa}
              onUpdateRating={handleUpdateRating}
              onUpdateRatings={handleUpdateRatings}
              onUpdateBlendRatio={handleUpdateBlendRatio}
              onUpdateGlobalHfa={handleUpdateGlobalHfa}
              onResetRatings={handleResetRatings}
            />
          </div>
        )}

        {activeTab === 'strategy' && (
          <div className="flex-1 overflow-y-auto">
            <StrategyAdvisor
              teamsWithStats={teamsWithStats}
              picks={picks}
              currentWeek={settings.currentWeek}
              settings={settings}
              onSelectPick={handleCellClick}
              onSelectWeek={handleSelectWeek}
            />
          </div>
        )}
      </main>

      {/* Settings & JSON Backup/Restore Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        ratings={ratings}
        picks={picks}
        onUpdateSettings={handleUpdateSettings}
        onDataImported={handleDataImported}
        onClearPicks={handleClearAllPicks}
        onResetRatings={handleResetRatings}
      />

      {/* Multi-Device Room Sync Modal */}
      <CloudSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        ratings={ratings}
        picks={picks}
        settings={settings}
        lockedWeeks={lockedWeeks}
        onDataLoaded={handleDataImported}
        activeRoomCode={activeRoomCode}
        onActiveRoomChange={setActiveRoomCode}
        autoSync={autoSync}
        onAutoSyncChange={setAutoSync}
        lastSyncedAt={lastSyncedAt}
      />

      {/* Offline Connectivity Notification Banner */}
      <OfflineIndicator />
    </div>
  );
}
