import React, { useState } from 'react';
import { TeamRating, NFLTeam } from '../types';
import { NFL_TEAMS } from '../data/teams';
import {
  fetchInpredictableRatings,
  applyInpredictableToRatings,
  INPREDICTABLE_SOURCE_URL,
} from '../services/inpredictable';
import {
  Sliders,
  RotateCcw,
  Search,
  Building,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  TrendingUp,
  ArrowRightLeft,
} from 'lucide-react';

interface RatingEditorProps {
  ratings: TeamRating[];
  blendRatio: number;
  globalHfa: number;
  onUpdateRating: (rating: TeamRating) => void;
  onUpdateRatings: (ratings: TeamRating[]) => void;
  onUpdateBlendRatio: (ratio: number) => void;
  onUpdateGlobalHfa: (hfa: number) => void;
  onResetRatings: () => void;
}

export const RatingEditor: React.FC<RatingEditorProps> = ({
  ratings,
  blendRatio,
  globalHfa,
  onUpdateRating,
  onUpdateRatings,
  onUpdateBlendRatio,
  onUpdateGlobalHfa,
  onResetRatings,
}) => {
  const [search, setSearch] = useState('');
  const [selectedConf, setSelectedConf] = useState<'ALL' | 'AFC' | 'NFC'>('ALL');
  const [showHfaOverrides, setShowHfaOverrides] = useState(false);
  const [isSyncingInpredictable, setIsSyncingInpredictable] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncAsOf, setLastSyncAsOf] = useState<string>('September 16, 2026');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Map ratings by teamId
  const ratingMap = new Map<string, TeamRating>(
    ratings.map((r) => [r.teamId, r])
  );

  const filteredTeams = NFL_TEAMS.filter((team) => {
    if (selectedConf !== 'ALL' && team.conference !== selectedConf) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        team.name.toLowerCase().includes(q) ||
        team.id.toLowerCase().includes(q) ||
        team.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleUserRatingChange = (teamId: string, val: number) => {
    const clamped = Math.max(-10, Math.min(10, Math.round(val * 10) / 10));
    const current = ratingMap.get(teamId) || { teamId, userRating: 0, marketRating: 0 };
    onUpdateRating({ ...current, userRating: clamped });
  };

  const handleMarketRatingChange = (teamId: string, val: number) => {
    const clamped = Math.max(-10, Math.min(10, Math.round(val * 10) / 10));
    const current = ratingMap.get(teamId) || { teamId, userRating: 0, marketRating: 0 };
    onUpdateRating({ ...current, marketRating: clamped });
  };

  const handleCustomHfaChange = (teamId: string, valStr: string) => {
    const current = ratingMap.get(teamId) || { teamId, userRating: 0, marketRating: 0 };
    if (valStr === '' || isNaN(Number(valStr))) {
      const updated = { ...current };
      delete updated.customHfa;
      onUpdateRating(updated);
    } else {
      const clamped = Math.max(0, Math.min(5, Math.round(Number(valStr) * 10) / 10));
      onUpdateRating({ ...current, customHfa: clamped });
    }
  };

  // Sync / Refresh Market Ratings from Inpredictable
  const handleSyncInpredictable = async (alsoUpdateUserRatings: boolean = false) => {
    setIsSyncingInpredictable(true);
    setSyncMessage(null);
    try {
      const result = await fetchInpredictableRatings();
      const updated = applyInpredictableToRatings(ratings, result.ratings, alsoUpdateUserRatings);
      onUpdateRatings(updated);
      if (result.asOf) {
        setLastSyncAsOf(result.asOf);
      }
      setLastSyncTime(result.timestamp);

      const count = Object.keys(result.ratings).length;
      if (alsoUpdateUserRatings) {
        setSyncMessage(
          `Synced ${count} teams from stats.inpredictable.com (${result.asOf || 'September 16, 2026'}) and applied directly to both Market and User Ratings!`
        );
      } else {
        setSyncMessage(
          `Synced ${count} teams from stats.inpredictable.com (${result.asOf || 'September 16, 2026'}) into Market Ratings!`
        );
      }
      setTimeout(() => setSyncMessage(null), 7000);
    } catch {
      setSyncMessage('Failed to sync inpredictable ratings.');
    } finally {
      setIsSyncingInpredictable(false);
    }
  };

  // Preset: All Zeroes
  const applyAllZeroPreset = () => {
    const updated = ratings.map((r) => ({
      ...r,
      userRating: 0,
      marketRating: 0,
    }));
    onUpdateRatings(updated);
  };

  // Preset: Set all user ratings to match current market ratings
  const handleSetUserRatingsToMarket = () => {
    const updated = ratings.map((r) => ({
      ...r,
      userRating: r.marketRating,
    }));
    onUpdateRatings(updated);
    setSyncMessage('Successfully set all 32 user ratings equal to market ratings (Inpredictable GPF).');
    setTimeout(() => setSyncMessage(null), 5000);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Inpredictable Market Source Banner */}
      <div className="rounded-xl border border-sky-800/60 bg-sky-950/40 p-4 backdrop-blur-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                Market Ratings Source: stats.inpredictable.com
              </h3>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-900/80 text-sky-300 border border-sky-700">
                GPF (Generic Points Favored)
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 border border-emerald-700/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                As of: {lastSyncAsOf}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Derived from closing betting market spreads and win totals across all 32 teams.
              {lastSyncTime && <span className="ml-1 text-slate-500 font-mono">(Last synced at {lastSyncTime})</span>}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={INPREDICTABLE_SOURCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-800 text-sky-300 border border-sky-800 transition cursor-pointer"
          >
            <span>View Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            id="btn-sync-inpredictable-market"
            onClick={() => handleSyncInpredictable(false)}
            disabled={isSyncingInpredictable}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition cursor-pointer shadow-md disabled:opacity-50"
            title="Fetch latest GPF ratings from inpredictable.com into the Market Ratings column"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingInpredictable ? 'animate-spin' : ''}`} />
            <span>{isSyncingInpredictable ? 'Syncing...' : 'Sync Market GPF'}</span>
          </button>

          <button
            type="button"
            id="btn-sync-inpredictable-user"
            onClick={() => handleSyncInpredictable(true)}
            disabled={isSyncingInpredictable}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition cursor-pointer shadow-md disabled:opacity-50"
            title="Fetch latest inpredictable ratings and set them as both Market Ratings and your User Ratings"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Sync & Set User Ratings</span>
          </button>
        </div>

        {syncMessage && (
          <div className="w-full text-xs font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-700 p-2 rounded-lg flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncMessage}</span>
          </div>
        )}
      </div>

      {/* Top Tuning Panel */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-400" />
              Power Rating Engine & Model Tuning
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Scale: -10.0 (Worst) to +10.0 (Best), 0.0 is NFL League Average.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="btn-set-user-ratings-to-market"
              onClick={handleSetUserRatingsToMarket}
              title="Set all 32 user ratings equal to the current market ratings (Inpredictable GPF)"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-600/80 bg-emerald-950/80 text-emerald-300 hover:bg-emerald-900/90 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Set User Ratings to Market</span>
            </button>
            <button
              type="button"
              onClick={() => handleSyncInpredictable(false)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-sky-800 bg-sky-950/80 text-sky-300 hover:bg-sky-900 transition cursor-pointer flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Inpredictable GPF
            </button>
            <button
              type="button"
              onClick={applyAllZeroPreset}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
            >
              Reset to 0.0 (Parity)
            </button>
            <button
              type="button"
              onClick={onResetRatings}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-amber-400 hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset All Defaults
            </button>
          </div>
        </div>

        {syncMessage && (
          <div className="mb-4 text-xs font-mono text-emerald-300 bg-emerald-950/80 border border-emerald-700/80 p-2.5 rounded-lg flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{syncMessage}</span>
          </div>
        )}

        {/* Sliders: Model Blending & Global HFA */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dual Rating Blend Slider */}
          <div className="space-y-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <span>Model Blend Ratio</span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800">
                  {Math.round((1 - blendRatio) * 100)}% User / {Math.round(blendRatio * 100)}% Inpredictable
                </span>
              </label>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onUpdateBlendRatio(0)}
                  className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${
                    blendRatio === 0
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  100% User
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateBlendRatio(0.5)}
                  className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${
                    blendRatio === 0.5
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  50 / 50
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateBlendRatio(1)}
                  className={`text-[10px] px-2 py-0.5 rounded cursor-pointer ${
                    blendRatio === 1
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white bg-slate-800'
                  }`}
                >
                  100% Market
                </button>
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={blendRatio}
              onChange={(e) => onUpdateBlendRatio(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Pure Personal Beliefs</span>
              <span>Blended Consensus</span>
              <span>Pure Inpredictable Market</span>
            </div>
          </div>

          {/* Global Home Field Advantage Slider */}
          <div className="space-y-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <span>Global Home Field Advantage (HFA)</span>
                <span className="text-[11px] font-mono text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800">
                  +{globalHfa.toFixed(1)} pts
                </span>
              </label>

              <button
                type="button"
                onClick={() => setShowHfaOverrides(!showHfaOverrides)}
                className={`text-[11px] px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition ${
                  showHfaOverrides
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-600'
                    : 'text-slate-400 hover:text-white bg-slate-800'
                }`}
              >
                <Building className="w-3 h-3" />
                {showHfaOverrides ? 'Hide Stadium HFA' : 'Custom Stadium HFA'}
              </button>
            </div>

            <input
              type="range"
              min="0.0"
              max="3.5"
              step="0.1"
              value={globalHfa}
              onChange={(e) => onUpdateGlobalHfa(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0.0 Neutral</span>
              <span>1.5 Standard NFL HFA</span>
              <span>3.5 Historical High</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar for 32 Teams */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teams..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
          {(['ALL', 'AFC', 'NFC'] as const).map((conf) => (
            <button
              key={conf}
              onClick={() => setSelectedConf(conf)}
              className={`px-3 py-1 text-xs font-semibold rounded cursor-pointer ${
                selectedConf === conf
                  ? 'bg-slate-800 text-emerald-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {conf}
            </button>
          ))}
        </div>
      </div>

      {/* 32 Teams Rating Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
              <tr>
                <th className="p-3 w-52">Team</th>
                <th className="p-3 w-48 text-center">
                  <div className="flex flex-col items-center">
                    <span>User Rating (-10 to +10)</span>
                    <button
                      type="button"
                      onClick={handleSetUserRatingsToMarket}
                      title="Set all 32 user ratings equal to market ratings"
                      className="mt-0.5 text-[9px] font-sans normal-case text-emerald-400 hover:text-emerald-300 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <ArrowRightLeft className="w-2.5 h-2.5" />
                      <span>Set to Market</span>
                    </button>
                  </div>
                </th>
                <th className="p-3 w-48 text-center text-sky-400">
                  <div className="flex flex-col items-center">
                    <span>Market (Inpredictable GPF)</span>
                    <span className="text-[9px] text-sky-500 font-normal">stats.inpredictable.com</span>
                  </div>
                </th>
                <th className="p-3 w-32 text-center">Effective Blended</th>
                {showHfaOverrides && (
                  <th className="p-3 w-44 text-center">Stadium HFA (Override)</th>
                )}
                <th className="p-3 w-20 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredTeams.map((team) => {
                const r = ratingMap.get(team.id) || {
                  teamId: team.id,
                  userRating: 0,
                  marketRating: 0,
                };
                const userVal = r.userRating ?? 0;
                const marketVal = r.marketRating ?? 0;
                const effective = Math.round(
                  (userVal * (1 - blendRatio) + marketVal * blendRatio) * 10
                ) / 10;

                return (
                  <tr
                    key={`editor-team-${team.id}`}
                    className="hover:bg-slate-850/50 transition-colors"
                  >
                    {/* Team Identity */}
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-2 h-7 rounded-full shrink-0"
                          style={{ backgroundColor: team.primaryColor }}
                        />
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-white">
                            <span className="font-mono text-emerald-400">{team.id}</span>
                            <span>{team.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {team.conference} {team.division} • {team.stadium}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* User Rating Number Input with +/- buttons (No slider) */}
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUserRatingChange(team.id, userVal - 0.5)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-mono text-xs font-bold cursor-pointer select-none transition"
                          title="Decrease rating by 0.5"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step="0.1"
                          min="-10"
                          max="10"
                          value={userVal}
                          onChange={(e) =>
                            handleUserRatingChange(team.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-16 text-center font-mono text-xs font-bold py-1 px-1 bg-slate-950 border border-slate-700 rounded text-emerald-300 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleUserRatingChange(team.id, userVal + 0.5)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-mono text-xs font-bold cursor-pointer select-none transition"
                          title="Increase rating by 0.5"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Market Rating Number Input with +/- buttons (No slider) */}
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMarketRatingChange(team.id, marketVal - 0.1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-mono text-xs font-bold cursor-pointer select-none transition"
                          title="Decrease market rating by 0.1"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          step="0.1"
                          min="-10"
                          max="10"
                          value={marketVal}
                          onChange={(e) =>
                            handleMarketRatingChange(team.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-16 text-center font-mono text-xs font-bold py-1 px-1 bg-slate-950 border border-slate-700 rounded text-sky-300 focus:outline-none focus:border-sky-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleMarketRatingChange(team.id, marketVal + 0.1)}
                          className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-mono text-xs font-bold cursor-pointer select-none transition"
                          title="Increase market rating by 0.1"
                        >
                          +
                        </button>
                      </div>
                    </td>

                    {/* Effective Blended Rating Badge */}
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block font-mono text-xs font-bold px-2.5 py-1 rounded-md border ${
                          effective >= 4.0
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                            : effective >= 0.0
                            ? 'bg-slate-800 text-slate-200 border-slate-700'
                            : 'bg-rose-950/80 text-rose-300 border-rose-800'
                        }`}
                      >
                        {effective > 0 ? `+${effective.toFixed(1)}` : effective.toFixed(1)}
                      </span>
                    </td>

                    {/* Stadium Custom HFA */}
                    {showHfaOverrides && (
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="5"
                            placeholder={`${globalHfa.toFixed(1)} (def)`}
                            value={r.customHfa !== undefined ? r.customHfa : ''}
                            onChange={(e) => handleCustomHfaChange(team.id, e.target.value)}
                            className="w-20 text-center font-mono text-xs py-1 px-2 bg-slate-950 border border-slate-700 rounded text-amber-300 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                          />
                          {r.customHfa !== undefined && (
                            <button
                              type="button"
                              onClick={() => handleCustomHfaChange(team.id, '')}
                              className="text-[10px] text-slate-500 hover:text-rose-400 p-1"
                              title="Reset to global HFA"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    )}

                    {/* Actions per team */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleUserRatingChange(team.id, marketVal)}
                          className="text-[11px] text-slate-400 hover:text-emerald-400 p-1 rounded hover:bg-slate-800 cursor-pointer"
                          title={`Set ${team.id} user rating to market (${marketVal >= 0 ? '+' : ''}${marketVal.toFixed(1)})`}
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5 mx-auto" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleUserRatingChange(team.id, 0);
                            handleMarketRatingChange(team.id, 0);
                          }}
                          className="text-[11px] text-slate-400 hover:text-amber-400 p-1 rounded hover:bg-slate-800 cursor-pointer"
                          title="Zero out team rating"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mx-auto" />
                        </button>
                      </div>
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
