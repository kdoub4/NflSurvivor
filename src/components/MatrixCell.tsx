import React from 'react';
import { CalculatedMatchup } from '../types';
import { ShieldCheck, Lock, Globe, Moon } from 'lucide-react';

interface MatrixCellProps {
  matchup: CalculatedMatchup;
  teamId: string;
  isPickedThisWeek: boolean;
  pickSlot?: number; // 1 or 2 in double-pick weeks
  isTeamUsedInPriorWeek: boolean; // Picked in a week prior to this cell's week
  isTeamUsedInFutureWeek: boolean; // Picked in a week after this cell's week
  usedWeekNumber?: number;
  isCurrentWeek: boolean;
  greyOutMondayNight?: boolean;
  onCellClick: (teamId: string, week: number) => void;
}

export const MatrixCell: React.FC<MatrixCellProps> = ({
  matchup,
  teamId,
  isPickedThisWeek,
  pickSlot,
  isTeamUsedInPriorWeek,
  isTeamUsedInFutureWeek,
  usedWeekNumber,
  isCurrentWeek,
  greyOutMondayNight = false,
  onCellClick,
}) => {
  // If this team is picked in any week, all other weeks in its row are locked out & greyed out
  const isLockedOut = Boolean(usedWeekNumber !== undefined && !isPickedThisWeek);
  const isMondayNight = Boolean(matchup.isMondayNight);
  const isGreyedOutMonday = Boolean(greyOutMondayNight && isMondayNight && !isPickedThisWeek && !isLockedOut);

  if (matchup.isBye) {
    return (
      <td
        className={`p-1 text-center border-b border-r border-slate-800/80 select-none ${
          isLockedOut ? 'bg-slate-950/90 opacity-25 filter grayscale' : 'bg-slate-900/60'
        }`}
      >
        <div className="h-13 w-23 mx-auto flex flex-col items-center justify-center rounded-md bg-slate-950/40 text-slate-500 font-mono text-xs border border-dashed border-slate-800">
          <span className="text-[11px] font-medium tracking-wide">BYE</span>
        </div>
      </td>
    );
  }

  // Heatmap styling according to requirements:
  // Dark Green: Heavy Favorite (Spread <= -7.0)
  // Light Green: Moderate Favorite (-3.5 to -6.5)
  // Neutral / Gray: Close Game (-3.0 to +3.0)
  // Light Red: Underdog (Spread > +3.0)
  const getHeatmapClass = () => {
    switch (matchup.heatTier) {
      case 'heavy-favorite':
        return 'bg-emerald-950/80 border-emerald-600/70 text-emerald-100 hover:bg-emerald-900/90 shadow-xs shadow-emerald-950/50';
      case 'moderate-favorite':
        return 'bg-emerald-900/40 border-emerald-700/40 text-emerald-200 hover:bg-emerald-900/60';
      case 'close':
        return 'bg-slate-800/60 border-slate-700/50 text-slate-300 hover:bg-slate-800';
      case 'underdog':
        return 'bg-rose-950/40 border-rose-800/40 text-rose-300 hover:bg-rose-900/50';
      default:
        return 'bg-slate-800/50 border-slate-700/40 text-slate-300';
    }
  };

  const cellTitle = isLockedOut
    ? `${teamId} already selected as your Survivor Pick in Week ${usedWeekNumber}`
    : matchup.isWeekLocked
    ? `${teamId} vs ${matchup.opponentId}\n🔒 Week ${matchup.week} (LOCKED & CLOSED)\nSaved Spread: ${matchup.projectedSpread > 0 ? '+' : ''}${matchup.projectedSpread.toFixed(1)}\nFox Sports Closing Odds: ${matchup.closingOdds || 'N/A'}${matchup.isNeutral ? `\n🌐 International Game: ${matchup.neutralLocation || ''}` : ''}${isMondayNight ? '\n🌙 Monday Night Football' : ''}`
    : isPickedThisWeek
    ? `Current Pick for Week ${matchup.week}${pickSlot ? ` (Pick ${pickSlot})` : ''}${isMondayNight ? ' (Monday Night Football)' : ''}. Click to deselect.`
    : isGreyedOutMonday
    ? `${teamId} vs ${matchup.opponentId} (${matchup.spreadText})\n🌙 Monday Night Football (8:15 PM ET)\n[Greyed out by MNF filter]\nClick to select as Week ${matchup.week} Pick.`
    : isMondayNight
    ? `${teamId} vs ${matchup.opponentId} (${matchup.spreadText})\n🌙 Monday Night Football (8:15 PM ET)\nClick to set as Week ${matchup.week} Pick.`
    : matchup.isNeutral
    ? `${teamId} vs ${matchup.opponentId} (${matchup.spreadText})\n🌐 International / Neutral Site Game\nLocation: ${matchup.neutralLocation || 'Neutral Venue'}${matchup.venue ? ` (${matchup.venue})` : ''}\nNo Home Field Advantage included in spread calculation.\nClick to set as Week ${matchup.week} Pick.`
    : `Click to set ${teamId} (${matchup.spreadText}) as Week ${matchup.week} Survivor Pick`;

  return (
    <td
      className={`p-1 text-center border-b border-r border-slate-800/80 transition-colors select-none ${
        isCurrentWeek ? 'bg-slate-900/40' : ''
      }`}
    >
      <button
        type="button"
        id={`cell-${teamId}-w${matchup.week}`}
        disabled={isLockedOut}
        onClick={() => onCellClick(teamId, matchup.week)}
        title={cellTitle}
        className={`relative w-23 h-13 mx-auto px-1.5 py-1 rounded-md border text-left flex flex-col justify-between transition-all cursor-pointer group ${
          isPickedThisWeek
            ? 'ring-2 ring-amber-400 bg-amber-950/70 border-amber-400 text-amber-100 shadow-md shadow-amber-950/50 scale-[1.03] z-10'
            : isLockedOut
            ? 'opacity-25 bg-slate-900/90 border-slate-800 text-slate-600 cursor-not-allowed filter grayscale'
            : isGreyedOutMonday
            ? 'opacity-30 bg-slate-900/90 border-slate-800/80 text-slate-500 filter grayscale contrast-75 hover:opacity-85 hover:grayscale-0 hover:border-slate-600'
            : getHeatmapClass()
        }`}
      >
        {/* Strikethrough decoration & indicator for locked out cells across the row */}
        {isLockedOut && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-full h-0.5 bg-slate-600/40 rotate-[-12deg]" />
            <span className="absolute bottom-1 right-1 text-[8.5px] font-mono text-slate-400 flex items-center gap-0.5 bg-slate-950/90 px-1 py-0.2 rounded border border-slate-800">
              <Lock className="w-2.5 h-2.5 text-slate-400" />
              W{usedWeekNumber}
            </span>
          </div>
        )}

        {/* Top row: Matchup opponent & location */}
        <div className="flex items-center justify-between w-full">
          <span
            className={`font-mono text-xs font-semibold tracking-tight flex items-center gap-1 ${
              isPickedThisWeek
                ? 'text-amber-200'
                : isGreyedOutMonday
                ? 'text-slate-400'
                : matchup.isNeutral
                ? 'text-sky-200'
                : matchup.isHome
                ? 'text-white'
                : 'text-slate-300'
            }`}
          >
            <span>{matchup.isNeutral ? 'vs' : matchup.isHome ? 'vs' : '@'}</span>
            <span className="font-bold">{matchup.opponentId}</span>
          </span>

          {isPickedThisWeek ? (
            <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-1 py-0.5 rounded">
              <ShieldCheck className="w-2.5 h-2.5" />
              {pickSlot ? `PICK ${pickSlot}` : 'PICK'}
              {isMondayNight && (
                <span className="ml-0.5 text-[7.5px] font-mono text-amber-200 bg-amber-950/90 px-0.5 py-0.2 rounded border border-amber-600/50">
                  MNF
                </span>
              )}
            </span>
          ) : isGreyedOutMonday ? (
            <span className="inline-flex items-center gap-0.5 text-[8px] font-mono font-medium text-slate-500">
              <Moon className="w-2 h-2 text-slate-500" />
            </span>
          ) : matchup.heatTier === 'heavy-favorite' && !isLockedOut ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400" />
          ) : null}
        </div>

        {/* Bottom row: Spread value with formatted sign */}
        <div className="flex items-center justify-between w-full mt-0.5">
          <span
            className={`font-mono text-xs font-black tracking-tight ${
              isPickedThisWeek
                ? 'text-amber-300'
                : isGreyedOutMonday
                ? 'text-slate-500'
                : matchup.projectedSpread <= -7.0
                ? 'text-emerald-300'
                : matchup.projectedSpread <= -3.5
                ? 'text-emerald-400'
                : matchup.projectedSpread > 3.0
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {matchup.projectedSpread > 0
              ? `+${matchup.projectedSpread.toFixed(1)}`
              : matchup.projectedSpread === 0
              ? 'PK'
              : matchup.projectedSpread.toFixed(1)}
          </span>

          {/* Location indicator / International badge / Monday Night badge OR Fox Sports Closing Odds when Week is Locked */}
          {matchup.isWeekLocked ? (
            <span
              className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8.5px] font-mono font-bold tracking-tight bg-amber-950/95 text-amber-300 border border-amber-600/80 shadow-xs"
              title={`Fox Sports Closing Odds: ${matchup.closingOdds || 'N/A'}`}
            >
              <span className="text-[7.5px] text-amber-400/80 font-normal">CL</span>
              <span>{matchup.closingOdds || 'N/A'}</span>
            </span>
          ) : isMondayNight ? (
            <span
              className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-mono font-bold tracking-tight ${
                isGreyedOutMonday
                  ? 'bg-slate-850 text-slate-400 border border-slate-700'
                  : 'bg-indigo-950/90 text-indigo-300 border border-indigo-700/70 shadow-xs'
              }`}
              title="Monday Night Football (8:15 PM ET)"
            >
              <Moon className={`w-2 h-2 ${isGreyedOutMonday ? 'text-slate-400' : 'text-indigo-400'}`} />
              MNF
            </span>
          ) : matchup.isNeutral ? (
            <span
              className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-mono font-bold tracking-tight bg-sky-950/90 text-sky-300 border border-sky-700/70"
              title={matchup.neutralLocation ? `International Game: ${matchup.neutralLocation}` : 'Neutral Site (0 HFA)'}
            >
              <Globe className="w-2.5 h-2.5 text-sky-400 shrink-0" />
              INTL
            </span>
          ) : (
            <span className="text-[9px] uppercase font-mono tracking-wider text-slate-400 opacity-80">
              {matchup.isHome ? 'HOME' : 'AWAY'}
            </span>
          )}
        </div>
      </button>
    </td>
  );
};
