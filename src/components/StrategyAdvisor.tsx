import React from 'react';
import { TeamWithStats, SurvivorPick, AppSettings } from '../types';
import { getWeekRecommendations, isHolidayDoublePickWeek } from '../utils/calculations';
import {
  Brain,
  ShieldAlert,
  Flame,
  CheckCircle2,
  TrendingUp,
  Target,
  Trophy,
  ArrowRight,
} from 'lucide-react';

interface StrategyAdvisorProps {
  teamsWithStats: TeamWithStats[];
  picks: SurvivorPick[];
  currentWeek: number;
  settings?: AppSettings;
  onSelectPick: (teamId: string, week: number) => void;
  onSelectWeek: (week: number) => void;
}

export const StrategyAdvisor: React.FC<StrategyAdvisorProps> = ({
  teamsWithStats,
  picks,
  currentWeek,
  settings,
  onSelectPick,
  onSelectWeek,
}) => {
  const recommendations = getWeekRecommendations(teamsWithStats, currentWeek, picks);
  const currentPicks = picks.filter((p) => p.week === currentWeek);
  const isDouble = isHolidayDoublePickWeek(currentWeek, settings);
  const isThanksgiving = currentWeek === (settings?.thanksgivingWeek ?? 12) && isDouble;
  const isChristmas = currentWeek === (settings?.christmasWeek ?? 16) && isDouble;

  // Future Value Leaders
  const fvLeaders = [...teamsWithStats]
    .filter((t) => !t.isPicked)
    .sort((a, b) => b.futureValue - a.futureValue)
    .slice(0, 5);

  // Cumulative Survivor Survival Probability calculation
  const pickedStats = picks
    .map((p) => {
      const team = teamsWithStats.find((t) => t.team.id === p.teamId);
      const matchup = team?.matchupsByWeek[p.week];
      if (!matchup || matchup.isBye) return null;
      const favoritePoints = -matchup.projectedSpread;
      const winProb = Math.min(0.98, Math.max(0.05, 0.5 + favoritePoints * 0.035));
      return { pick: p, team, matchup, winProb };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const cumulativeSurvival = pickedStats.reduce((acc, curr) => acc * curr.winProb, 1.0);

  const doublePickWeeks = settings?.doublePickWeeks ?? [
    settings?.thanksgivingWeek ?? 12,
    settings?.christmasWeek ?? 16,
  ];
  const targetPicks = 18 + (doublePickWeeks?.length || 0);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Active Week Status */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-mono uppercase">Analysis Target</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              {isThanksgiving ? '🦃 Thanksgiving Week' : isChristmas ? '🎄 Christmas Week' : `Week ${currentWeek}`}
              {isDouble && <span className="text-[10px] text-amber-400 font-mono">(2 Picks)</span>}
            </span>
          </div>
          <div className="text-base font-bold text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-400 shrink-0" />
            {currentPicks.length > 0 ? (
              <span className="truncate">
                Picked: <span className="text-amber-400">{currentPicks.map((p) => p.teamId).join(' & ')}</span>
                {isDouble && currentPicks.length < 2 && (
                  <span className="text-xs text-indigo-300 font-normal ml-1"> (Needs 2nd Pick)</span>
                )}
              </span>
            ) : (
              <span className="text-slate-400">No Pick Selected</span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            {isDouble
              ? 'Holiday Double-Pick Week: You must select 2 separate winners for this week.'
              : 'Evaluating safe favorites while protecting precious Future Value (FV).'}
          </p>
        </div>

        {/* Path Cumulative Survival Probability */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-mono uppercase">Locked Survivor Path</span>
            <span className="text-slate-300 font-mono">{picks.length}/{targetPicks} Picks</span>
          </div>
          <div className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <span>
              {picks.length > 0
                ? `${(cumulativeSurvival * 100).toFixed(1)}%`
                : '100%'}
            </span>
            <span className="text-xs font-normal text-slate-400">Expected Survival</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Probability of advancing through all currently locked weeks.
          </p>
        </div>

        {/* Highest Future Value to Preserve */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-mono uppercase">Top FV Assets (Save for Later)</span>
            <span className="text-amber-400 text-xs font-mono">≥6 pt Favs</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {fvLeaders.slice(0, 4).map((t) => (
              <span
                key={t.team.id}
                className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-xs font-mono text-white font-bold"
                title={`${t.team.name}: ${t.futureValue} remaining heavy favorite weeks`}
              >
                {t.team.id} <span className="text-amber-400">({t.futureValue})</span>
              </span>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Avoid burning these high-value powerhouses early if viable alternatives exist.
          </p>
        </div>
      </div>

      {/* Week Selector Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
        <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1">
          Inspect Week:
        </span>
        {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => (
          <button
            key={`strat-week-btn-${w}`}
            onClick={() => onSelectWeek(w)}
            className={`px-3 py-1 text-xs font-mono font-bold rounded-lg shrink-0 cursor-pointer transition ${
              w === currentWeek
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            W{w}
          </button>
        ))}
      </div>

      {/* Top Recommendations Table for Active Week */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Week {currentWeek} Strategic Pick Rankings
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Ranked by Survival Edge minus Future Value Cost
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
              <tr>
                <th className="p-3">Rank & Team</th>
                <th className="p-3">Matchup</th>
                <th className="p-3 text-center">Projected Spread</th>
                <th className="p-3 text-center">Win Probability</th>
                <th className="p-3 text-center">Future Value (FV)</th>
                <th className="p-3 text-center">Strategic Score</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recommendations.slice(0, 8).map((rec, index) => {
                const { teamWithStats, matchup, winProbability, strategyScore } = rec;
                const isCurrentPick = currentPicks.some((p) => p.teamId === teamWithStats.team.id);

                return (
                  <tr
                    key={`rec-${teamWithStats.team.id}`}
                    className={`hover:bg-slate-850/50 transition-colors ${
                      isCurrentPick ? 'bg-amber-950/40 border-l-2 border-l-amber-400' : ''
                    }`}
                  >
                    {/* Rank & Team */}
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-mono font-bold ${
                            index === 0
                              ? 'bg-emerald-500 text-slate-950'
                              : index === 1
                              ? 'bg-slate-300 text-slate-950'
                              : index === 2
                              ? 'bg-amber-600 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {index + 1}
                        </span>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-1.5 h-6 rounded-full"
                            style={{ backgroundColor: teamWithStats.team.primaryColor }}
                          />
                          <div>
                            <span className="font-bold text-white text-xs">
                              {teamWithStats.team.name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                              ({teamWithStats.team.id})
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Matchup */}
                    <td className="p-3 font-mono text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400">{matchup.isNeutral ? 'vs' : matchup.isHome ? 'vs' : '@'}</span>{' '}
                        <strong className="text-white">{matchup.opponentId}</strong>
                        {matchup.isNeutral && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-mono font-bold bg-sky-950/90 text-sky-300 border border-sky-700/70"
                            title={matchup.neutralLocation ? `International Game: ${matchup.neutralLocation} (No HFA)` : 'Neutral site (0 HFA)'}
                          >
                            INTL
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Projected Spread */}
                    <td className="p-3 text-center">
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                          matchup.projectedSpread <= -7.0
                            ? 'bg-emerald-950 border border-emerald-600 text-emerald-300'
                            : matchup.projectedSpread <= -3.5
                            ? 'bg-emerald-900/50 text-emerald-400'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {matchup.projectedSpread > 0
                          ? `+${matchup.projectedSpread.toFixed(1)}`
                          : matchup.projectedSpread === 0
                          ? 'PK'
                          : matchup.projectedSpread.toFixed(1)}
                      </span>
                    </td>

                    {/* Win Prob */}
                    <td className="p-3 text-center font-mono font-bold text-emerald-400">
                      {winProbability}%
                    </td>

                    {/* Future Value */}
                    <td className="p-3 text-center">
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                          teamWithStats.futureValue >= 4
                            ? 'text-amber-400 bg-amber-950/80 border border-amber-800'
                            : teamWithStats.futureValue >= 2
                            ? 'text-emerald-400 bg-emerald-950/60'
                            : 'text-slate-400'
                        }`}
                      >
                        {teamWithStats.futureValue} wks
                      </span>
                    </td>

                    {/* Strategic Score */}
                    <td className="p-3 text-center font-mono font-black text-slate-200">
                      {strategyScore.toFixed(1)}
                    </td>

                    {/* Pick Action */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectPick(teamWithStats.team.id, currentWeek)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 mx-auto ${
                          isCurrentPick
                            ? 'bg-amber-500 text-slate-950 font-bold hover:bg-amber-400'
                            : 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 border border-slate-700'
                        }`}
                      >
                        {isCurrentPick ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Selected</span>
                          </>
                        ) : (
                          <span>Select Pick</span>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
