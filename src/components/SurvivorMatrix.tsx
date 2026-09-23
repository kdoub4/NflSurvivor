import React, { useState, useMemo } from 'react';
import { TeamWithStats, SurvivorPick, LockedWeekData, AppSettings } from '../types';
import { MatrixCell } from './MatrixCell';
import { isHolidayDoublePickWeek } from '../utils/calculations';
import {
  Search,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Zap,
  Eye,
  EyeOff,
  SlidersHorizontal,
  Globe,
  Lock,
  Unlock,
  Moon,
} from 'lucide-react';

interface SurvivorMatrixProps {
  teamsWithStats: TeamWithStats[];
  picks: SurvivorPick[];
  currentWeek: number;
  settings?: AppSettings;
  greyOutMondayNight?: boolean;
  onToggleGreyOutMonday?: (enabled: boolean) => void;
  onCellClick: (teamId: string, week: number) => void;
  onSelectWeek: (week: number) => void;
  lockedWeeks?: Record<number, LockedWeekData>;
  onToggleLockWeek?: (week: number) => void;
  isLockingWeek?: number | null;
}

type SortField = 'rating' | 'futureValue' | 'name' | 'picked' | 'week';
type SortOrder = 'asc' | 'desc';

export const SurvivorMatrix: React.FC<SurvivorMatrixProps> = ({
  teamsWithStats,
  picks,
  currentWeek,
  settings,
  greyOutMondayNight,
  onToggleGreyOutMonday,
  onCellClick,
  onSelectWeek,
  lockedWeeks = {},
  onToggleLockWeek,
  isLockingWeek = null,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [conferenceFilter, setConferenceFilter] = useState<'ALL' | 'AFC' | 'NFC'>('ALL');
  const [sortField, setSortField] = useState<SortField>('rating');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [sortWeek, setSortWeek] = useState<number>(1);
  const [isWeeksMenuOpen, setIsWeeksMenuOpen] = useState(false);

  // Monday Night Football greying out state
  const [localGreyOutMonday, setLocalGreyOutMonday] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('survivor_grey_out_mnf');
      if (saved !== null) return JSON.parse(saved);
    } catch {}
    return Boolean(settings?.greyOutMondayNight);
  });

  const isGreyOutMondayNight = greyOutMondayNight !== undefined ? greyOutMondayNight : localGreyOutMonday;

  const handleToggleGreyOutMonday = (newValue: boolean) => {
    setLocalGreyOutMonday(newValue);
    try {
      localStorage.setItem('survivor_grey_out_mnf', JSON.stringify(newValue));
    } catch {}
    if (onToggleGreyOutMonday) {
      onToggleGreyOutMonday(newValue);
    }
  };

  // Hidden week columns state (persisted to localStorage)
  const [hiddenWeeks, setHiddenWeeks] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('survivor_hidden_weeks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return new Set<number>(parsed.filter((w) => typeof w === 'number' && w >= 1 && w <= 18));
        }
      }
    } catch {}
    return new Set<number>();
  });

  const allWeeks = useMemo(() => Array.from({ length: 18 }, (_, i) => i + 1), []);
  const visibleWeeks = useMemo(
    () => allWeeks.filter((w) => !hiddenWeeks.has(w)),
    [allWeeks, hiddenWeeks]
  );

  const saveHiddenWeeks = (newSet: Set<number>) => {
    try {
      localStorage.setItem('survivor_hidden_weeks', JSON.stringify(Array.from(newSet)));
    } catch {}
  };

  const toggleWeek = (week: number) => {
    setHiddenWeeks((prev) => {
      const next = new Set<number>(prev);
      if (next.has(week)) {
        next.delete(week);
      } else {
        if (next.size >= 17) return prev; // Keep at least one column visible
        next.add(week);
      }
      saveHiddenWeeks(next);
      return next;
    });
  };

  const hideWeek = (week: number) => {
    setHiddenWeeks((prev) => {
      if (prev.size >= 17) return prev; // Keep at least one column visible
      const next = new Set<number>(prev);
      next.add(week);
      saveHiddenWeeks(next);
      return next;
    });
  };

  const showWeek = (week: number) => {
    setHiddenWeeks((prev) => {
      if (!prev.has(week)) return prev;
      const next = new Set<number>(prev);
      next.delete(week);
      saveHiddenWeeks(next);
      return next;
    });
  };

  const showAllWeeks = () => {
    const empty = new Set<number>();
    setHiddenWeeks(empty);
    saveHiddenWeeks(empty);
  };

  const showOnlyCurrentAndFuture = () => {
    setHiddenWeeks((prev) => {
      const next = new Set<number>();
      for (let w = 1; w < currentWeek; w++) {
        next.add(w);
      }
      saveHiddenWeeks(next);
      return next;
    });
  };

  const hidePickedWeeks = () => {
    setHiddenWeeks((prev) => {
      const next = new Set<number>(prev);
      picks.forEach((p) => {
        if (p.week <= 18) next.add(p.week);
      });
      if (next.size >= 18) {
        next.delete(currentWeek);
      }
      saveHiddenWeeks(next);
      return next;
    });
  };

  // Map of picked weeks by teamId: teamId -> week
  const pickMapByTeam = useMemo(() => {
    const map = new Map<string, number>();
    picks.forEach((p) => map.set(p.teamId, p.week));
    return map;
  }, [picks]);

  // Map of picked team by week: week -> teamId
  const pickMapByWeek = useMemo(() => {
    const map = new Map<number, string>();
    picks.forEach((p) => map.set(p.week, p.teamId));
    return map;
  }, [picks]);

  // Filter & Sort teams
  const filteredTeams = useMemo(() => {
    return teamsWithStats
      .filter((t) => {
        if (conferenceFilter !== 'ALL' && t.team.conference !== conferenceFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = t.team.name.toLowerCase().includes(q);
          const matchId = t.team.id.toLowerCase().includes(q);
          const matchCity = t.team.city.toLowerCase().includes(q);
          if (!matchName && !matchId && !matchCity) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;

        if (sortField === 'week') {
          const mA = a.matchupsByWeek[sortWeek];
          const mB = b.matchupsByWeek[sortWeek];

          const aBye = !mA || mA.isBye;
          const bBye = !mB || mB.isBye;

          // Bye weeks always sort to the bottom
          if (aBye && !bBye) return 1;
          if (!aBye && bBye) return -1;
          if (aBye && bBye) return b.effectiveRating - a.effectiveRating;

          // Non-bye: compare projected spread
          // 'asc' = lowest spread first (most favored, e.g. -10 before -3 before +3)
          // 'desc' = highest spread first (biggest underdog, e.g. +10 before -3)
          if (sortOrder === 'asc') {
            cmp = mA.projectedSpread - mB.projectedSpread;
          } else {
            cmp = mB.projectedSpread - mA.projectedSpread;
          }

          // tie breaker: higher overall rating
          if (cmp === 0) {
            cmp = b.effectiveRating - a.effectiveRating;
          }
          return cmp;
        }

        if (sortField === 'rating') {
          cmp = b.effectiveRating - a.effectiveRating;
        } else if (sortField === 'futureValue') {
          cmp = b.futureValue - a.futureValue;
        } else if (sortField === 'name') {
          cmp = a.team.name.localeCompare(b.team.name);
        } else if (sortField === 'picked') {
          const aPicked = a.isPicked ? 1 : 0;
          const bPicked = b.isPicked ? 1 : 0;
          cmp = aPicked - bPicked;
        }

        return sortOrder === 'desc' ? cmp : -cmp;
      });
  }, [teamsWithStats, searchQuery, conferenceFilter, sortField, sortOrder, sortWeek]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleWeekHeaderClick = (week: number) => {
    onSelectWeek(week);
    if (sortField === 'week' && sortWeek === week) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField('week');
      setSortWeek(week);
      // Default to 'asc' so biggest favorites (e.g. -9.5, -7.0) are ranked at the top
      setSortOrder('asc');
    }
  };

  const handleQuickSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val.startsWith('week-')) {
      const w = parseInt(val.replace('week-', ''), 10);
      showWeek(w); // Ensure the sorted week is visible
      setSortField('week');
      setSortWeek(w);
      setSortOrder('asc');
      onSelectWeek(w);
    } else {
      setSortField(val as SortField);
      setSortOrder(val === 'name' ? 'asc' : 'desc');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Top Filter and Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-lg">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              id="team-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter teams (e.g. KC, Bills, Ravens)..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                ×
              </button>
            )}
          </div>

          {/* Conference filter pills */}
          <div className="flex items-center rounded-lg bg-slate-950 border border-slate-800 p-0.5 shrink-0">
            {(['ALL', 'AFC', 'NFC'] as const).map((conf) => (
              <button
                key={conf}
                onClick={() => setConferenceFilter(conf)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  conferenceFilter === conf
                    ? 'bg-slate-800 text-emerald-400 shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {conf}
              </button>
            ))}
          </div>
        </div>

        {/* Weeks Visibility Dropdown and Controls */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setIsWeeksMenuOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                hiddenWeeks.size > 0
                  ? 'bg-amber-950/60 border-amber-600/80 text-amber-300 hover:bg-amber-900/60'
                  : 'bg-slate-950 border-slate-800 text-slate-200 hover:bg-slate-800'
              }`}
              title="Show or hide individual week columns"
            >
              {hiddenWeeks.size > 0 ? (
                <EyeOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              <span>Weeks</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                  hiddenWeeks.size > 0
                    ? 'bg-amber-900 text-amber-200 border border-amber-700'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {visibleWeeks.length}/18
              </span>
            </button>

            {/* Weeks Visibility Popover Menu */}
            {isWeeksMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-50"
                  onClick={() => setIsWeeksMenuOpen(false)}
                />
                <div className="absolute right-0 sm:left-0 sm:right-auto mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-3.5 text-xs">
                  <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span>Week Columns Visibility</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 font-medium">
                      {visibleWeeks.length} of 18 visible
                    </span>
                  </div>

                  {/* Preset quick actions */}
                  <div className="grid grid-cols-2 gap-1.5 mb-3">
                    <button
                      onClick={showAllWeeks}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-[11px] text-center transition font-medium border border-slate-750 cursor-pointer"
                    >
                      Show All 18 Weeks
                    </button>
                    <button
                      onClick={showOnlyCurrentAndFuture}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-[11px] text-center transition font-medium border border-slate-750 cursor-pointer"
                      title={`Hide completed weeks prior to Week ${currentWeek}`}
                    >
                      Current & Future Only
                    </button>
                    {picks.length > 0 && (
                      <button
                        onClick={hidePickedWeeks}
                        className="col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-[11px] text-center transition font-medium border border-slate-750 cursor-pointer"
                      >
                        Hide Picked Weeks ({picks.length})
                      </button>
                    )}
                  </div>

                  {/* 18-week grid toggles */}
                  <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">
                    Toggle Columns:
                  </div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {allWeeks.map((w) => {
                      const isVisible = !hiddenWeeks.has(w);
                      const isCur = w === currentWeek;
                      const picked = pickMapByWeek.get(w);

                      return (
                        <button
                          key={`toggle-w-${w}`}
                          onClick={() => toggleWeek(w)}
                          title={`Click to ${isVisible ? 'hide' : 'show'} Week ${w}`}
                          className={`py-1.5 px-1 rounded-md flex flex-col items-center justify-center border text-[11px] font-mono font-bold transition cursor-pointer ${
                            isVisible
                              ? isCur
                                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/50'
                                : 'bg-slate-800/90 border-slate-650 text-white hover:border-slate-500'
                              : 'bg-slate-950/80 border-slate-850 text-slate-600 hover:text-slate-400 hover:border-slate-750 line-through'
                          }`}
                        >
                          <span>W{w}</span>
                          {picked && (
                            <span
                              className={`text-[8px] font-normal no-underline ${
                                isVisible ? 'text-amber-400' : 'text-slate-600'
                              }`}
                            >
                              {picked}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {hiddenWeeks.size > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800 flex justify-between items-center text-[11px]">
                      <span className="text-amber-400 font-medium">
                        {hiddenWeeks.size} column{hiddenWeeks.size > 1 ? 's' : ''} hidden
                      </span>
                      <button
                        onClick={showAllWeeks}
                        className="text-emerald-400 hover:text-emerald-300 font-semibold underline cursor-pointer"
                      >
                        Unhide All
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Quick Unhide Pill if columns are hidden */}
          {hiddenWeeks.size > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-950/70 border border-amber-700/80 text-amber-300 text-xs shrink-0">
              <EyeOff className="w-3 h-3 text-amber-400 shrink-0" />
              <span>{hiddenWeeks.size} hidden</span>
              <button
                onClick={showAllWeeks}
                className="ml-1 text-[11px] underline hover:text-white cursor-pointer font-medium"
                title="Unhide all columns"
              >
                Reset
              </button>
            </div>
          )}

          {/* Monday Night Football Dimming Toggle */}
          <button
            type="button"
            id="btn-toggle-grey-out-mnf"
            onClick={() => handleToggleGreyOutMonday(!isGreyOutMondayNight)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer shrink-0 ${
              isGreyOutMondayNight
                ? 'bg-slate-800 border-indigo-500/80 text-indigo-300 shadow-sm shadow-indigo-950/50 ring-1 ring-indigo-500/40'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850'
            }`}
            title={
              isGreyOutMondayNight
                ? 'Monday night games are greyed out across the matrix. Click to restore full heatmap colors.'
                : 'Click to grey out Monday night games across the matrix'
            }
          >
            <Moon className={`w-3.5 h-3.5 ${isGreyOutMondayNight ? 'text-indigo-400 fill-indigo-400/20' : 'text-slate-400'}`} />
            <span>Grey Out MNF</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                isGreyOutMondayNight
                  ? 'bg-indigo-900/90 text-indigo-200 border border-indigo-700'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isGreyOutMondayNight ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Sort Dropdown Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 font-mono text-[11px]">Sort:</span>
            <select
              value={sortField === 'week' ? `week-${sortWeek}` : sortField}
              onChange={handleQuickSortChange}
              className="bg-transparent text-emerald-400 font-semibold text-xs focus:outline-none cursor-pointer"
            >
              <option value="rating" className="bg-slate-900 text-white">Power Rating (Best First)</option>
              <option value="futureValue" className="bg-slate-900 text-white">Future Value (Highest FV)</option>
              <option value="name" className="bg-slate-900 text-white">Team Name (A-Z)</option>
              <optgroup label="Sort by Week Matchup Spread" className="bg-slate-900 text-slate-400">
                {allWeeks.map((w) => (
                  <option key={`opt-w${w}`} value={`week-${w}`} className="bg-slate-900 text-amber-300">
                    Week {w} Spreads {hiddenWeeks.has(w) ? '(Hidden)' : '(Favorites Top)'}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Active Sort Notification Pill */}
          {sortField === 'week' && (
            <button
              onClick={() => {
                setSortField('rating');
                setSortOrder('desc');
              }}
              className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-amber-950/80 border border-amber-700 text-amber-300 hover:bg-amber-900 transition cursor-pointer"
              title="Click to reset sort to default power rating"
            >
              <span>W{sortWeek} {sortOrder === 'asc' ? 'Favs ↓' : 'Dogs ↑'}</span>
              <RotateCcw className="w-3 h-3 ml-0.5" />
            </button>
          )}
        </div>

        {/* Heatmap Legend */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400 hidden lg:inline">Heatmap:</span>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-950 border border-emerald-600 shadow-xs" />
              <span className="text-[11px] text-slate-300">≤ -7 Fav</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-emerald-900/50 border border-emerald-700/50" />
              <span className="text-[11px] text-slate-300">-3.5 to -6.5</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700" />
              <span className="text-[11px] text-slate-400">-3 to +3</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-rose-950/50 border border-rose-800/50" />
              <span className="text-[11px] text-slate-400">&gt; +3 Dog</span>
            </div>
            <div className="flex items-center gap-1 pl-2 border-l border-slate-700/80">
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-mono font-bold bg-sky-950/90 text-sky-300 border border-sky-700/70">
                <Globe className="w-2.5 h-2.5 text-sky-400" />
                INTL
              </span>
              <span className="text-[11px] text-sky-300 hidden md:inline" title="International neutral site games exclude Home Field Advantage">
                Neutral (0 HFA)
              </span>
            </div>
            <div className="flex items-center gap-1 pl-2 border-l border-slate-700/80">
              <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8.5px] font-mono font-bold bg-amber-950/95 text-amber-300 border border-amber-600/80 shadow-xs">
                <span className="text-[7.5px] text-amber-400 font-normal">CL</span>
                <span>Odds</span>
              </span>
              <span className="text-[11px] text-amber-300 hidden md:inline" title="Fox Sports closing odds replace Home/Away/Intl when week is locked">
                Fox Sports Closing
              </span>
            </div>
            <div className="flex items-center gap-1 pl-2 border-l border-slate-700/80">
              <span
                className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-mono font-bold ${
                  isGreyOutMondayNight
                    ? 'bg-slate-800 text-slate-400 border border-slate-700'
                    : 'bg-indigo-950/90 text-indigo-300 border border-indigo-700/70'
                }`}
              >
                <Moon className={`w-2.5 h-2.5 ${isGreyOutMondayNight ? 'text-slate-400' : 'text-indigo-400'}`} />
                MNF
              </span>
              <span
                className={`text-[11px] hidden md:inline ${isGreyOutMondayNight ? 'text-slate-400' : 'text-indigo-300'}`}
                title="Monday Night Football games"
              >
                {isGreyOutMondayNight ? 'MNF (Greyed Out)' : 'Monday Night'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main 32 x 18 Matrix Data Grid */}
      <div className="flex-1 overflow-auto relative max-h-[calc(100vh-210px)] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
        <table className="w-full border-collapse text-left text-xs table-fixed">
          {/* Sticky Column Headers (Weeks 1 to 18) */}
          <thead className="sticky top-0 z-30 bg-slate-900 shadow-md">
            <tr className="border-b border-slate-700">
              {/* Sticky Team Info Header */}
              <th
                className="sticky left-0 z-40 bg-slate-900 p-1.5 w-20 min-w-[80px] border-r border-slate-700 text-slate-200 font-bold tracking-wide"
              >
                <div className="flex flex-col items-center justify-center gap-1 text-center">
                  <button
                    onClick={() => handleSort('name')}
                    className={`flex items-center justify-center gap-1 hover:text-emerald-400 cursor-pointer ${
                      sortField === 'name' ? 'text-emerald-400 font-bold' : 'text-slate-200'
                    }`}
                    title="Sort by Team Abbreviation"
                  >
                    <span className="text-xs">Team</span>
                    {sortField === 'name' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-2.5 h-2.5 text-emerald-400" /> : <ArrowDown className="w-2.5 h-2.5 text-emerald-400" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                    )}
                  </button>
                  <button
                    onClick={() => handleSort('rating')}
                    className={`flex items-center justify-center gap-1 hover:text-emerald-400 cursor-pointer text-[10px] font-mono ${
                      sortField === 'rating' ? 'text-emerald-400 font-bold' : 'text-slate-300'
                    }`}
                    title="Sort by blended Power Rating"
                  >
                    <span>Rating</span>
                    {sortField === 'rating' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-2 h-2 text-emerald-400" /> : <ArrowDown className="w-2 h-2 text-emerald-400" />
                    ) : (
                      <ArrowUpDown className="w-2 h-2 text-slate-500" />
                    )}
                  </button>
                </div>
              </th>

              {/* Sticky Future Value (FV) Header */}
              <th
                className={`sticky left-20 z-40 bg-slate-900 p-2 w-16 min-w-[64px] text-center border-r border-slate-700 text-slate-200 font-bold ${
                  sortField === 'futureValue' ? 'bg-slate-850' : ''
                }`}
                title="Future Value: Number of remaining weeks projected as a >= 6.0 pt favorite"
              >
                <button
                  onClick={() => handleSort('futureValue')}
                  className={`flex flex-col items-center mx-auto hover:text-emerald-400 cursor-pointer ${
                    sortField === 'futureValue' ? 'text-emerald-400' : ''
                  }`}
                >
                  <div className="flex items-center gap-0.5">
                    <span className="text-[11px] font-mono">FV</span>
                    {sortField === 'futureValue' ? (
                      sortOrder === 'asc' ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />
                    ) : (
                      <ArrowUpDown className="w-2.5 h-2.5 text-slate-500" />
                    )}
                  </div>
                  <span className="text-[9px] font-normal text-slate-400">(≥6.0)</span>
                </button>
              </th>

              {/* Visible Weeks Columns */}
              {visibleWeeks.map((week) => {
                const isCurrent = week === currentWeek;
                const isWeekSorted = sortField === 'week' && sortWeek === week;
                const weekPicks = picks.filter((p) => p.week === week);
                const isDoubleWeek = isHolidayDoublePickWeek(week, settings);
                const isWeekLocked = Boolean(
                  lockedWeeks[week]?.isLocked ||
                  (lockedWeeks as Record<string, LockedWeekData>)[String(week)]?.isLocked
                );
                const isLocking = isLockingWeek === week;

                const isThanksgiving = week === (settings?.thanksgivingWeek ?? 12) && isDoubleWeek;
                const isChristmas = week === (settings?.christmasWeek ?? 16) && isDoubleWeek;

                return (
                  <th
                    key={`th-week-${week}`}
                    onClick={() => handleWeekHeaderClick(week)}
                    title={`Click to sort teams by Week ${week} spread (favorites first) • ${isDoubleWeek ? '2 Picks Required' : '1 Pick Required'}`}
                    className={`p-1.5 text-center border-r transition-colors w-24 min-w-[96px] cursor-pointer group ${
                      isWeekSorted
                        ? 'bg-amber-950/90 border-r-amber-600 border-b-2 border-b-amber-400 text-amber-200 ring-1 ring-amber-500/50'
                        : isWeekLocked
                        ? 'bg-amber-950/25 border-r-slate-800 text-amber-100 border-t-2 border-t-amber-500/80 hover:bg-amber-950/40'
                        : isCurrent
                        ? 'bg-emerald-950/40 border-r-slate-800 text-emerald-200'
                        : isDoubleWeek
                        ? 'bg-indigo-950/30 border-r-slate-800 text-slate-300 hover:bg-indigo-950/50'
                        : 'bg-slate-900 border-r-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex flex-col items-center relative">
                      <div className="flex items-center justify-center gap-1 w-full relative">
                        <span
                          className={`font-mono text-xs font-bold tracking-tight flex items-center gap-0.5 ${
                            isWeekSorted
                              ? 'text-amber-300'
                              : isWeekLocked
                              ? 'text-amber-300'
                              : isCurrent
                              ? 'text-emerald-400'
                              : isDoubleWeek
                              ? 'text-indigo-300'
                              : 'text-slate-300 group-hover:text-white'
                          }`}
                        >
                          {isThanksgiving ? (
                            <span>🦃 W{week}</span>
                          ) : isChristmas ? (
                            <span>🎄 W{week}</span>
                          ) : (
                            <span>WK {week}</span>
                          )}
                        </span>

                        {/* Week sort indicator */}
                        {isWeekSorted ? (
                          sortOrder === 'asc' ? (
                            <ArrowDown className="w-3 h-3 text-amber-400 shrink-0" title="Sorted: Favorites First" />
                          ) : (
                            <ArrowUp className="w-3 h-3 text-amber-400 shrink-0" title="Sorted: Underdogs First" />
                          )
                        ) : (
                          <ArrowUpDown className="w-2.5 h-2.5 text-slate-600 group-hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        )}

                        {/* Quick Hide column button on hover */}
                        {visibleWeeks.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              hideWeek(week);
                            }}
                            title={`Hide Week ${week} column`}
                            className="opacity-0 group-hover:opacity-100 hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition absolute -right-1 cursor-pointer"
                          >
                            <EyeOff className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      {/* Status / Pick badge */}
                      {weekPicks.length > 0 ? (
                        <div className="mt-0.5 flex flex-col items-center">
                          <span className="inline-flex items-center gap-0.5 text-[9.5px] font-mono font-bold text-emerald-300 bg-emerald-950/90 px-1 py-0.2 rounded border border-emerald-700/60 max-w-[90px] truncate">
                            {weekPicks.map((p) => p.teamId).join(', ')}
                          </span>
                          <span className="text-[8px] font-mono text-slate-400 font-semibold">
                            {isDoubleWeek ? `${weekPicks.length}/2 Picks` : '1 Pick'}
                          </span>
                        </div>
                      ) : isWeekSorted ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                            isDoubleWeek
                              ? 'text-indigo-300 bg-indigo-950/70 border-indigo-800/60'
                              : 'text-slate-300 bg-slate-800/80 border-slate-700/70'
                          }`}>
                            {isDoubleWeek ? '2' : '1'}
                          </span>
                          <span className="text-[8.5px] font-mono font-bold text-amber-400/90">
                            {sortOrder === 'asc' ? 'Favs ↓' : 'Dogs ↑'}
                          </span>
                        </div>
                      ) : (
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border mt-0.5 ${
                          isDoubleWeek
                            ? 'text-indigo-300 bg-indigo-950/70 border-indigo-800/60'
                            : 'text-slate-300 bg-slate-800/80 border-slate-700/70'
                        }`}>
                          {isDoubleWeek ? '2' : '1'}
                        </span>
                      )}

                      {/* Lock / Close Week Button */}
                      <button
                        type="button"
                        id={`btn-lock-week-${week}`}
                        disabled={isLocking}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLockWeek?.(week);
                        }}
                        title={
                          isWeekLocked
                            ? `Week ${week} is LOCKED (closed). Spreads are frozen and will not change dynamically from team ratings. Click to unlock/reopen.`
                            : `Lock Week ${week}: Freezes spreads so they no longer dynamically change from team ratings.`
                        }
                        className={`mt-1.5 w-full py-0.5 px-1 rounded flex items-center justify-center gap-1 text-[9px] font-mono font-bold transition cursor-pointer ${
                          isWeekLocked
                            ? 'bg-amber-500/25 text-amber-300 border border-amber-500/70 hover:bg-amber-500/40 shadow-xs'
                            : isLocking
                            ? 'bg-amber-900/60 text-amber-200 border border-amber-500 animate-pulse'
                            : 'bg-slate-800/80 text-slate-400 hover:text-amber-300 hover:bg-slate-750 border border-slate-700/80 hover:border-amber-500/50'
                        }`}
                      >
                        {isLocking ? (
                          <>
                            <span className="w-2 h-2 rounded-full border border-amber-400 border-t-transparent animate-spin" />
                            <span>LOCKING...</span>
                          </>
                        ) : isWeekLocked ? (
                          <>
                            <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                            <span>LOCKED</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-2.5 h-2.5 opacity-60 group-hover:opacity-100 shrink-0" />
                            <span>LOCK</span>
                          </>
                        )}
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* 32 Team Rows */}
          <tbody className="divide-y divide-slate-800/80">
            {filteredTeams.map((teamStat) => {
              const { team, effectiveRating, futureValue, matchupsByWeek } = teamStat;
              const pickedWeek = pickMapByTeam.get(team.id);
              const isTeamPicked = pickedWeek !== undefined;

              return (
                <tr
                  key={`row-${team.id}`}
                  className={`transition-colors ${
                    isTeamPicked ? 'bg-slate-950/70' : 'hover:bg-slate-850/40'
                  }`}
                >
                  {/* Sticky Team Info (Logo color bar, Team Abbr, Rating - No nickname) */}
                  <td
                    className={`sticky left-0 z-20 p-1.5 border-r border-slate-800 bg-slate-950/95 backdrop-blur-xs w-20 min-w-[80px] ${
                      isTeamPicked ? 'opacity-40 filter grayscale' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {/* Team Color indicator stripe */}
                      <div
                        className="w-1.5 h-7 rounded-full shrink-0"
                        style={{ backgroundColor: team.primaryColor }}
                      />

                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-black text-white tracking-wider">
                            {team.id}
                          </span>
                          {isTeamPicked && (
                            <span className="text-[8.5px] text-amber-400 font-bold bg-amber-950/90 px-1 py-0.2 rounded border border-amber-800 shrink-0">
                              W{pickedWeek}
                            </span>
                          )}
                        </div>

                        <div className="text-[10.5px] text-slate-400 font-mono font-medium">
                          {effectiveRating > 0
                            ? `+${effectiveRating.toFixed(1)}`
                            : effectiveRating.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Sticky Future Value (FV) Metric Cell */}
                  <td
                    className={`sticky left-20 z-20 p-2 text-center border-r border-slate-800 bg-slate-950/95 backdrop-blur-xs w-16 min-w-[64px] ${
                      isTeamPicked ? 'opacity-40 filter grayscale' : sortField === 'futureValue' ? 'bg-slate-900' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <span
                        className={`font-mono text-xs font-bold ${
                          futureValue >= 4
                            ? 'text-amber-400'
                            : futureValue >= 2
                            ? 'text-emerald-400'
                            : futureValue === 1
                            ? 'text-slate-300'
                            : 'text-slate-500'
                        }`}
                      >
                        {futureValue}
                      </span>
                      <span className="text-[9px] text-slate-500 uppercase tracking-tighter">
                        wks
                      </span>
                    </div>
                  </td>

                  {/* Matchup Cells for Visible Weeks */}
                  {visibleWeeks.map((week) => {
                    const matchup = matchupsByWeek[week];
                    const pickForThisTeamThisWeek = picks.find(
                      (p) => p.teamId === team.id && p.week === week
                    );
                    const isPickedThisWeek = Boolean(pickForThisTeamThisWeek);
                    const isTeamUsedInPriorWeek = isTeamPicked && week > (pickedWeek ?? 0);
                    const isTeamUsedInFutureWeek = isTeamPicked && week < (pickedWeek ?? 0);
                    const isCurrent = week === currentWeek;
                    const isWeekSorted = sortField === 'week' && sortWeek === week;

                    return (
                      <MatrixCell
                        key={`cell-${team.id}-w${week}`}
                        matchup={matchup}
                        teamId={team.id}
                        isPickedThisWeek={isPickedThisWeek}
                        pickSlot={pickForThisTeamThisWeek?.slot}
                        isTeamUsedInPriorWeek={isTeamUsedInPriorWeek}
                        isTeamUsedInFutureWeek={isTeamUsedInFutureWeek}
                        usedWeekNumber={pickedWeek}
                        isCurrentWeek={isCurrent || isWeekSorted}
                        greyOutMondayNight={isGreyOutMondayNight}
                        onCellClick={onCellClick}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
