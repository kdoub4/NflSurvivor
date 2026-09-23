import Dexie, { Table } from 'dexie';
import { TeamRating, ScheduledGame, SurvivorPick, AppSettings, LockedWeekData } from '../types';
import { INITIAL_RATINGS } from '../data/teams';
import { INITIAL_SCHEDULE } from '../data/schedule';

class NFLSurvivorDB extends Dexie {
  ratings!: Table<TeamRating, string>;
  schedule!: Table<ScheduledGame, string>;
  picks!: Table<SurvivorPick, string>;
  settings!: Table<AppSettings & { id: string }, string>;
  lockedWeeks!: Table<LockedWeekData, number>;

  constructor() {
    super('NFLSurvivorDB');
    this.version(1).stores({
      ratings: 'teamId, userRating, marketRating',
      schedule: 'gameId, week, homeTeam, awayTeam',
      picks: 'week, teamId',
      settings: 'id',
    });
    this.version(2).stores({
      ratings: 'teamId, userRating, marketRating',
      schedule: 'gameId, week, homeTeam, awayTeam',
      picks: 'week, teamId',
      settings: 'id',
      lockedWeeks: 'week',
    });
    this.version(3).stores({
      ratings: 'teamId, userRating, marketRating',
      schedule: 'gameId, week, homeTeam, awayTeam',
      picks: 'id, week, teamId',
      settings: 'id',
      lockedWeeks: 'week',
    });
  }
}

let dbInstance: NFLSurvivorDB | null = null;
let isIndexedDBAvailable = true;

try {
  if (typeof window !== 'undefined' && 'indexedDB' in window) {
    dbInstance = new NFLSurvivorDB();
  } else {
    isIndexedDBAvailable = false;
  }
} catch {
  isIndexedDBAvailable = false;
}

// LocalStorage fallback keys
const LS_KEYS = {
  RATINGS: 'nfl_survivor_ratings',
  SCHEDULE: 'nfl_survivor_schedule',
  PICKS: 'nfl_survivor_picks',
  SETTINGS: 'nfl_survivor_settings',
  SCHEDULE_VERSION: 'nfl_survivor_schedule_version',
  LOCKED_WEEKS: 'nfl_survivor_locked_weeks',
  ROOM_CODE: 'nfl_survivor_room_code',
  ROOM_AUTO_SYNC: 'nfl_survivor_room_auto_sync',
  ROOM_LAST_SYNCED: 'nfl_survivor_room_last_synced',
};

const CURRENT_SCHEDULE_VERSION = '2026-v2';

export const DEFAULT_DOUBLE_PICK_WEEKS = [12, 16]; // Thanksgiving (W12) & Christmas (W16)
export const DEFAULT_THANKSGIVING_WEEK = 12;
export const DEFAULT_CHRISTMAS_WEEK = 16;

const DEFAULT_SETTINGS: AppSettings = {
  blendRatio: 0.5, // 50% User / 50% Market
  globalHfa: 1.5,
  currentWeek: 1,
  poolEndWeek: 18,
  doublePickWeeks: DEFAULT_DOUBLE_PICK_WEEKS,
  thanksgivingWeek: DEFAULT_THANKSGIVING_WEEK,
  christmasWeek: DEFAULT_CHRISTMAS_WEEK,
};

export const StorageService = {
  async init(): Promise<void> {
    try {
      if (dbInstance && isIndexedDBAvailable) {
        await dbInstance.open();
        const ratingCount = await dbInstance.ratings.count();
        if (ratingCount === 0) {
          await dbInstance.ratings.bulkPut(INITIAL_RATINGS);
        }
        
        // Ensure 2026 schedule is loaded
        const storedSchedVersion = localStorage.getItem(LS_KEYS.SCHEDULE_VERSION);
        const scheduleCount = await dbInstance.schedule.count();
        if (scheduleCount === 0 || storedSchedVersion !== CURRENT_SCHEDULE_VERSION) {
          await dbInstance.schedule.clear();
          await dbInstance.schedule.bulkPut(INITIAL_SCHEDULE);
          localStorage.setItem(LS_KEYS.SCHEDULE_VERSION, CURRENT_SCHEDULE_VERSION);
          localStorage.setItem(LS_KEYS.SCHEDULE, JSON.stringify(INITIAL_SCHEDULE));
        }

        const settingsCount = await dbInstance.settings.count();
        if (settingsCount === 0) {
          await dbInstance.settings.put({ id: 'app_settings', ...DEFAULT_SETTINGS });
        }
      } else {
        throw new Error('IndexedDB not available');
      }
    } catch {
      isIndexedDBAvailable = false;
      // Initialize localStorage fallback
      if (!localStorage.getItem(LS_KEYS.RATINGS)) {
        localStorage.setItem(LS_KEYS.RATINGS, JSON.stringify(INITIAL_RATINGS));
      }
      const storedSchedVersion = localStorage.getItem(LS_KEYS.SCHEDULE_VERSION);
      if (!localStorage.getItem(LS_KEYS.SCHEDULE) || storedSchedVersion !== CURRENT_SCHEDULE_VERSION) {
        localStorage.setItem(LS_KEYS.SCHEDULE, JSON.stringify(INITIAL_SCHEDULE));
        localStorage.setItem(LS_KEYS.SCHEDULE_VERSION, CURRENT_SCHEDULE_VERSION);
      }
      if (!localStorage.getItem(LS_KEYS.SETTINGS)) {
        localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      }
    }
  },

  async getRatings(): Promise<TeamRating[]> {
    if (dbInstance && isIndexedDBAvailable) {
      try {
        const ratings = await dbInstance.ratings.toArray();
        if (ratings.length > 0) return ratings;
      } catch {
        // fallback
      }
    }
    const fromLs = localStorage.getItem(LS_KEYS.RATINGS);
    if (fromLs) {
      try {
        return JSON.parse(fromLs);
      } catch {
        // ignore parse error
      }
    }
    return INITIAL_RATINGS;
  },

  async saveRatings(ratings: TeamRating[]): Promise<void> {
    // Always mirror to localStorage for quick sync and fallback
    localStorage.setItem(LS_KEYS.RATINGS, JSON.stringify(ratings));

    if (dbInstance && isIndexedDBAvailable) {
      try {
        await dbInstance.ratings.bulkPut(ratings);
      } catch {
        // silently handled via localStorage
      }
    }
  },

  async saveRating(rating: TeamRating): Promise<void> {
    const all = await this.getRatings();
    const index = all.findIndex((r) => r.teamId === rating.teamId);
    if (index >= 0) {
      all[index] = rating;
    } else {
      all.push(rating);
    }
    await this.saveRatings(all);
  },

  async getSchedule(): Promise<ScheduledGame[]> {
    if (dbInstance && isIndexedDBAvailable) {
      try {
        const schedule = await dbInstance.schedule.toArray();
        if (schedule.length > 0) return schedule;
      } catch {
        // fallback
      }
    }
    const fromLs = localStorage.getItem(LS_KEYS.SCHEDULE);
    if (fromLs) {
      try {
        return JSON.parse(fromLs);
      } catch {
        // ignore parse error
      }
    }
    return INITIAL_SCHEDULE;
  },

  async getPicks(): Promise<SurvivorPick[]> {
    if (dbInstance && isIndexedDBAvailable) {
      try {
        return await dbInstance.picks.toArray();
      } catch {
        // fallback
      }
    }
    const fromLs = localStorage.getItem(LS_KEYS.PICKS);
    if (fromLs) {
      try {
        return JSON.parse(fromLs);
      } catch {
        // ignore
      }
    }
    return [];
  },

  async savePick(
    week: number,
    teamId: string,
    isDoublePickWeek: boolean = false
  ): Promise<SurvivorPick[]> {
    let currentPicks = await this.getPicks();

    // Ensure all picks have an id and slot
    currentPicks = currentPicks.map((p, idx) => ({
      ...p,
      id: p.id || `${p.week}-${p.teamId}`,
      slot: p.slot || 1,
    }));

    const existingInThisWeek = currentPicks.filter((p) => p.week === week);
    const isAlreadyPickedInWeek = existingInThisWeek.some((p) => p.teamId === teamId);

    let updated: SurvivorPick[];

    if (isAlreadyPickedInWeek) {
      // Toggle off / deselect this specific team
      updated = currentPicks.filter(
        (p) => !(p.week === week && p.teamId === teamId)
      );
      // Re-index slots for this week
      let slotCounter = 1;
      updated = updated.map((p) => {
        if (p.week === week) {
          return { ...p, slot: slotCounter++ };
        }
        return p;
      });
    } else if (isDoublePickWeek) {
      // It's a 2-pick week (Thanksgiving or Christmas)
      if (existingInThisWeek.length >= 2) {
        // Replace the second pick with the new selection
        const firstPick = existingInThisWeek[0];
        const otherPicks = currentPicks.filter((p) => p.week !== week);
        updated = [
          ...otherPicks,
          firstPick,
          { id: `${week}-${teamId}`, week, teamId, slot: 2 },
        ];
      } else {
        // Add as slot 1 or 2
        const slot = existingInThisWeek.length + 1;
        updated = [
          ...currentPicks,
          { id: `${week}-${teamId}`, week, teamId, slot },
        ];
      }
    } else {
      // Standard single-pick week: replace any existing pick for this week
      const otherPicks = currentPicks.filter((p) => p.week !== week);
      updated = [
        ...otherPicks,
        { id: `${week}-${teamId}`, week, teamId, slot: 1 },
      ];
    }

    updated.sort((a, b) => a.week - b.week || (a.slot || 1) - (b.slot || 1));

    localStorage.setItem(LS_KEYS.PICKS, JSON.stringify(updated));

    if (dbInstance && isIndexedDBAvailable) {
      try {
        await dbInstance.picks.clear();
        if (updated.length > 0) {
          await dbInstance.picks.bulkPut(updated);
        }
      } catch {
        // fallback handled via localStorage
      }
    }
    return updated;
  },

  async removePick(week: number, teamId?: string): Promise<SurvivorPick[]> {
    const currentPicks = await this.getPicks();
    let updated = teamId
      ? currentPicks.filter((p) => !(p.week === week && p.teamId === teamId))
      : currentPicks.filter((p) => p.week !== week);

    // Re-index slots if needed
    let slotCounter = 1;
    updated = updated.map((p) => {
      if (p.week === week) {
        return { ...p, slot: slotCounter++ };
      }
      return p;
    });

    localStorage.setItem(LS_KEYS.PICKS, JSON.stringify(updated));

    if (dbInstance && isIndexedDBAvailable) {
      try {
        await dbInstance.picks.clear();
        if (updated.length > 0) {
          await dbInstance.picks.bulkPut(updated);
        }
      } catch {
        // fallback
      }
    }
    return updated;
  },

  async clearAllPicks(): Promise<void> {
    localStorage.removeItem(LS_KEYS.PICKS);
    if (dbInstance && isIndexedDBAvailable) {
      try {
        await dbInstance.picks.clear();
      } catch {
        // fallback
      }
    }
  },

  async getSettings(): Promise<AppSettings> {
    if (dbInstance && isIndexedDBAvailable) {
      try {
        const stored = await dbInstance.settings.get('app_settings');
        if (stored) {
          return {
            blendRatio: stored.blendRatio ?? DEFAULT_SETTINGS.blendRatio,
            globalHfa: stored.globalHfa ?? DEFAULT_SETTINGS.globalHfa,
            currentWeek: stored.currentWeek ?? DEFAULT_SETTINGS.currentWeek,
            poolEndWeek: stored.poolEndWeek ?? DEFAULT_SETTINGS.poolEndWeek,
            doublePickWeeks: stored.doublePickWeeks ?? DEFAULT_SETTINGS.doublePickWeeks,
            thanksgivingWeek: stored.thanksgivingWeek ?? DEFAULT_SETTINGS.thanksgivingWeek,
            christmasWeek: stored.christmasWeek ?? DEFAULT_SETTINGS.christmasWeek,
            greyOutMondayNight: stored.greyOutMondayNight ?? DEFAULT_SETTINGS.greyOutMondayNight,
          };
        }
      } catch {
        // fallback
      }
    }
    const fromLs = localStorage.getItem(LS_KEYS.SETTINGS);
    if (fromLs) {
      try {
        const parsed = JSON.parse(fromLs);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          poolEndWeek: parsed.poolEndWeek ?? DEFAULT_SETTINGS.poolEndWeek,
          doublePickWeeks: parsed.doublePickWeeks ?? DEFAULT_SETTINGS.doublePickWeeks,
          thanksgivingWeek: parsed.thanksgivingWeek ?? DEFAULT_SETTINGS.thanksgivingWeek,
          christmasWeek: parsed.christmasWeek ?? DEFAULT_SETTINGS.christmasWeek,
          greyOutMondayNight: parsed.greyOutMondayNight ?? DEFAULT_SETTINGS.greyOutMondayNight,
        };
      } catch {
        // ignore
      }
    }
    return DEFAULT_SETTINGS;
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(settings));
    if (dbInstance && isIndexedDBAvailable) {
      try {
        await dbInstance.settings.put({ id: 'app_settings', ...settings });
      } catch {
        // fallback
      }
    }
  },

  async getLockedWeeks(): Promise<Record<number, LockedWeekData>> {
    const lockedMap: Record<number, LockedWeekData> = {};
    if (dbInstance && isIndexedDBAvailable) {
      try {
        const rows = await dbInstance.lockedWeeks.toArray();
        if (rows && rows.length > 0) {
          rows.forEach((r) => {
            lockedMap[r.week] = r;
          });
          return lockedMap;
        }
      } catch {
        // fallback to localStorage
      }
    }

    const fromLs = localStorage.getItem(LS_KEYS.LOCKED_WEEKS);
    if (fromLs) {
      try {
        const parsed = JSON.parse(fromLs);
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
      } catch {
        // ignore
      }
    }
    return lockedMap;
  },

  async saveLockedWeek(data: LockedWeekData): Promise<void> {
    const current = await this.getLockedWeeks();
    current[data.week] = data;
    localStorage.setItem(LS_KEYS.LOCKED_WEEKS, JSON.stringify(current));

    if (dbInstance && isIndexedDBAvailable) {
      try {
        await dbInstance.lockedWeeks.put(data);
      } catch {
        // fallback handled via localStorage
      }
    }
  },

  async unlockWeek(week: number): Promise<void> {
    const current = await this.getLockedWeeks();
    delete current[week];
    localStorage.setItem(LS_KEYS.LOCKED_WEEKS, JSON.stringify(current));

    if (dbInstance && isIndexedDBAvailable) {
      try {
        await dbInstance.lockedWeeks.delete(week);
      } catch {
        // fallback handled via localStorage
      }
    }
  },

  async resetRatingsToDefault(): Promise<TeamRating[]> {
    await this.saveRatings(INITIAL_RATINGS);
    return INITIAL_RATINGS;
  },

  async resetScheduleToDefault(): Promise<ScheduledGame[]> {
    localStorage.setItem(LS_KEYS.SCHEDULE_VERSION, CURRENT_SCHEDULE_VERSION);
    localStorage.setItem(LS_KEYS.SCHEDULE, JSON.stringify(INITIAL_SCHEDULE));
    if (dbInstance && isIndexedDBAvailable) {
      try {
        await dbInstance.schedule.clear();
        await dbInstance.schedule.bulkPut(INITIAL_SCHEDULE);
      } catch {
        // fallback handled via localStorage
      }
    }
    return INITIAL_SCHEDULE;
  },

  async exportBackup(): Promise<string> {
    const [ratings, picks, settings, lockedWeeks] = await Promise.all([
      this.getRatings(),
      this.getPicks(),
      this.getSettings(),
      this.getLockedWeeks(),
    ]);

    const backup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      appName: 'NFL Survivor Pool Strategy',
      settings,
      ratings,
      picks,
      lockedWeeks,
    };
    return JSON.stringify(backup, null, 2);
  },

  async importBackup(jsonString: string): Promise<{
    ratings: TeamRating[];
    picks: SurvivorPick[];
    settings: AppSettings;
    lockedWeeks?: Record<number, LockedWeekData>;
  }> {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !Array.isArray(parsed.ratings)) {
      throw new Error('Invalid backup format: missing ratings array');
    }

    const ratings: TeamRating[] = parsed.ratings;
    const picks: SurvivorPick[] = Array.isArray(parsed.picks) ? parsed.picks : [];
    const settings: AppSettings = parsed.settings
      ? {
          blendRatio: typeof parsed.settings.blendRatio === 'number' ? parsed.settings.blendRatio : DEFAULT_SETTINGS.blendRatio,
          globalHfa: typeof parsed.settings.globalHfa === 'number' ? parsed.settings.globalHfa : DEFAULT_SETTINGS.globalHfa,
          currentWeek: typeof parsed.settings.currentWeek === 'number' ? parsed.settings.currentWeek : DEFAULT_SETTINGS.currentWeek,
          doublePickWeeks: Array.isArray(parsed.settings.doublePickWeeks) ? parsed.settings.doublePickWeeks : DEFAULT_SETTINGS.doublePickWeeks,
          thanksgivingWeek: typeof parsed.settings.thanksgivingWeek === 'number' ? parsed.settings.thanksgivingWeek : DEFAULT_SETTINGS.thanksgivingWeek,
          christmasWeek: typeof parsed.settings.christmasWeek === 'number' ? parsed.settings.christmasWeek : DEFAULT_SETTINGS.christmasWeek,
        }
      : DEFAULT_SETTINGS;

    await this.saveRatings(ratings);
    localStorage.setItem(LS_KEYS.PICKS, JSON.stringify(picks));
    if (dbInstance && isIndexedDBAvailable) {
      try {
        await dbInstance.picks.clear();
        if (picks.length > 0) {
          await dbInstance.picks.bulkPut(picks);
        }
      } catch {
        // ignore
      }
    }
    await this.saveSettings(settings);

    if (parsed.lockedWeeks && typeof parsed.lockedWeeks === 'object') {
      localStorage.setItem(LS_KEYS.LOCKED_WEEKS, JSON.stringify(parsed.lockedWeeks));
      if (dbInstance && isIndexedDBAvailable) {
        try {
          await dbInstance.lockedWeeks.clear();
          const items = Object.values(parsed.lockedWeeks) as LockedWeekData[];
          if (items.length > 0) {
            await dbInstance.lockedWeeks.bulkPut(items);
          }
        } catch {
          // ignore
        }
      }
    }

    return { ratings, picks, settings, lockedWeeks: parsed.lockedWeeks };
  },

  getActiveRoomCode(): string | null {
    try {
      const code = localStorage.getItem(LS_KEYS.ROOM_CODE);
      return code ? code.trim().toUpperCase() : null;
    } catch {
      return null;
    }
  },

  setActiveRoomCode(code: string | null): void {
    try {
      if (code) {
        localStorage.setItem(LS_KEYS.ROOM_CODE, code.trim().toUpperCase());
      } else {
        localStorage.removeItem(LS_KEYS.ROOM_CODE);
      }
    } catch {
      // ignore
    }
  },

  getAutoSyncEnabled(): boolean {
    try {
      return localStorage.getItem(LS_KEYS.ROOM_AUTO_SYNC) === 'true';
    } catch {
      return false;
    }
  },

  setAutoSyncEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(LS_KEYS.ROOM_AUTO_SYNC, enabled ? 'true' : 'false');
    } catch {
      // ignore
    }
  },

  getLastSyncedAt(): string | null {
    try {
      return localStorage.getItem(LS_KEYS.ROOM_LAST_SYNCED);
    } catch {
      return null;
    }
  },

  setLastSyncedAt(timestamp: string): void {
    try {
      localStorage.setItem(LS_KEYS.ROOM_LAST_SYNCED, timestamp);
    } catch {
      // ignore
    }
  },
};
