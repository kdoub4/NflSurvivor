import React from 'react';
import { SurvivorPick, TeamWithStats, AppSettings } from '../types';
import { isHolidayDoublePickWeek } from '../utils/calculations';
import { ShieldCheck, Calendar, X, AlertTriangle, Trophy } from 'lucide-react';

interface PickSummaryBarProps {
  picks: SurvivorPick[];
  teamsWithStats: TeamWithStats[];
  currentWeek: number;
  settings?: AppSettings;
  onSelectWeek: (week: number) => void;
  onClearPick: (week: number, teamId?: string) => void;
  onClearAllPicks: () => void;
}

export const PickSummaryBar: React.FC<PickSummaryBarProps> = ({
  picks,
  teamsWithStats,
  currentWeek,
  settings,
  onSelectWeek,
  onClearPick,
  onClearAllPicks,
}) => {
  const teamStatMap = new Map<string, TeamWithStats>(
    teamsWithStats.map((t) => [t.team.id, t])
  );

  // Group picks by week
  const picksByWeek = new Map<number, SurvivorPick[]>();
  picks.forEach((p) => {
    const list = picksByWeek.get(p.week) || [];
    list.push(p);
    picksByWeek.set(p.week, list);
  });

  // Check for duplicate picks (should be prevented, but let's highlight if user ever imported bad data)
  const teamPickCounts = new Map<string, number>();
  picks.forEach((p) => {
    teamPickCounts.set(p.teamId, (teamPickCounts.get(p.teamId) || 0) + 1);
  });
  const hasDuplicates = Array.from(teamPickCounts.values()).some((c) => c > 1);

  const pickedCount = picks.length;
  // If double-pick weeks are configured, target is 20 picks, otherwise 18
  const doublePickWeeks = settings?.doublePickWeeks ?? [
    settings?.thanksgivingWeek ?? 12,
    settings?.christmasWeek ?? 16,
  ];
  const targetPicks = 18 + (doublePickWeeks?.length || 0);

  return (
    <div className="bg-slate-900/90 border-b border-slate-800 p-3 shadow-md backdrop-blur-md">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Survivor Pick Path
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {pickedCount}/{targetPicks} Picks Locked
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasDuplicates && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-1 rounded">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Duplicate Team Pick Detected!</span>
              </div>
            )}

            {pickedCount > 0 && (
              <button
                type="button"
                onClick={onClearAllPicks}
                className="text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 px-2.5 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3 h-3" />
                <span>Clear All Picks</span>
              </button>
            )}
          </div>
        </div>

        {/* Horizontal scrollable week cards */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {Array.from({ length: 18 }, (_, i) => i + 1).map((week) => {
            const weekPicksList = picksByWeek.get(week) || [];
            const isDouble = isHolidayDoublePickWeek(week, settings);
            const isCurrent = week === currentWeek;
            const isThanksgiving = week === (settings?.thanksgivingWeek ?? 12) && isDouble;
            const isChristmas = week === (settings?.christmasWeek ?? 16) && isDouble;

            const hasPicks = weekPicksList.length > 0;
            const isFullyPicked = isDouble ? weekPicksList.length >= 2 : weekPicksList.length >= 1;

            return (
              <div
                key={`pick-summary-w${week}`}
                onClick={() => onSelectWeek(week)}
                className={`shrink-0 p-2 rounded-lg border text-left transition-all cursor-pointer relative ${
                  isDouble ? 'min-w-[130px]' : 'w-24 min-w-[96px]'
                } ${
                  hasPicks
                    ? isCurrent
                      ? 'bg-amber-950/60 border-amber-500/80 shadow-md ring-1 ring-amber-400/50'
                      : 'bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
                    : isCurrent
                    ? 'bg-slate-800/60 border-emerald-500/60 ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Week Header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${
                      isCurrent ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    {isThanksgiving ? (
                      <span>🦃 W{week}</span>
                    ) : isChristmas ? (
                      <span>🎄 W{week}</span>
                    ) : (
                      <span>W{week}</span>
                    )}
                    <span className={`text-[8.5px] font-mono font-bold px-1 py-0.2 rounded ${
                      isDouble
                        ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-700/50'
                        : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                    }`}>
                      {isDouble ? '2' : '1'}
                    </span>
                  </span>

                  {hasPicks && !isDouble && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearPick(week);
                      }}
                      className="text-slate-500 hover:text-rose-400 hover:bg-slate-800 p-0.5 rounded transition-colors"
                      title="Clear pick for this week"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                {/* Team & Matchup display */}
                {hasPicks ? (
                  <div className="space-y-1">
                    {weekPicksList.map((pick, idx) => {
                      const teamStats = teamStatMap.get(pick.teamId);
                      const matchup = teamStats ? teamStats.matchupsByWeek[week] : undefined;

                      return (
                        <div
                          key={`pick-item-${week}-${pick.teamId}`}
                          className={`p-1 rounded ${
                            isDouble ? 'bg-slate-900/80 border border-slate-800' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-white flex items-center gap-1">
                              {pick.teamId}
                              {isDouble && (
                                <span className="text-[8px] font-mono text-amber-400">
                                  #{pick.slot || idx + 1}
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-1">
                              {matchup && (
                                <span
                                  className={`text-[10px] font-mono font-bold ${
                                    matchup.projectedSpread <= -7.0
                                      ? 'text-emerald-400'
                                      : matchup.projectedSpread <= -3.5
                                      ? 'text-emerald-300'
                                      : 'text-amber-300'
                                  }`}
                                >
                                  {matchup.projectedSpread > 0
                                    ? `+${matchup.projectedSpread.toFixed(1)}`
                                    : matchup.projectedSpread === 0
                                    ? 'PK'
                                    : matchup.projectedSpread.toFixed(1)}
                                </span>
                              )}
                              {isDouble && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onClearPick(week, pick.teamId);
                                  }}
                                  className="text-slate-500 hover:text-rose-400 p-0.5 rounded"
                                  title={`Remove ${pick.teamId} pick`}
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          {matchup && (
                            <div className="text-[9.5px] font-mono text-slate-400 truncate flex items-center gap-1">
                              <span>
                                {matchup.isNeutral ? 'vs' : matchup.isHome ? 'vs' : '@'}{' '}
                                {matchup.opponentId}
                              </span>
                              {matchup.isNeutral && (
                                <span
                                  className="text-[7.5px] font-bold text-sky-300 bg-sky-950/90 px-0.5 rounded border border-sky-700/60"
                                  title={
                                    matchup.neutralLocation
                                      ? `International Game: ${matchup.neutralLocation}`
                                      : 'Neutral site'
                                  }
                                >
                                  INTL
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {isDouble && weekPicksList.length === 1 && (
                      <div className="p-1 rounded border border-dashed border-slate-700 text-[9.5px] text-indigo-300 text-center font-mono">
                        + Pick Slot #2
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-7 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-500 italic">
                      {isCurrent ? (isDouble ? 'Pick 2 teams' : 'Pick now') : 'No pick'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
