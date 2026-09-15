import { NFLTeam, TeamRating, ScheduledGame, CalculatedMatchup, TeamWithStats, SurvivorPick, LockedWeekData } from '../types';
import { TEAM_MAP } from '../data/teams';

/**
 * Calculates effective blended rating for a team:
 * blendRatio: 0 = 100% User, 1 = 100% Market, 0.5 = 50% User / 50% Market
 */
export function calculateEffectiveRating(
  rating: TeamRating,
  blendRatio: number
): number {
  const user = rating.userRating ?? 0;
  const market = rating.marketRating ?? 0;
  const blended = user * (1 - blendRatio) + market * blendRatio;
  return Math.round(blended * 10) / 10;
}

/**
 * Gets effective HFA for the home team:
 * Uses customHfa if defined, otherwise falls back to globalHfa.
 */
export function getEffectiveHfa(rating: TeamRating | undefined, globalHfa: number): number {
  if (rating?.customHfa !== undefined && rating.customHfa !== null && !isNaN(rating.customHfa)) {
    return rating.customHfa;
  }
  return globalHfa;
}

/**
 * Calculates the projected spread from the perspective of a specific team.
 * Follows standard NFL betting spread conventions:
 * - A negative spread indicates the team is favored (e.g. -6.5 = favored by 6.5 pts).
 * - A positive spread indicates the team is an underdog (e.g. +3.0 = 3 pt underdog).
 * - When isNeutral is true (e.g. international series games in Melbourne, London, etc.),
 *   home field advantage (HFA) is zeroed out.
 */
export function calculateMatchupSpread(
  teamId: string,
  isHome: boolean,
  homeEffectiveRating: number,
  awayEffectiveRating: number,
  homeHfa: number,
  isNeutral: boolean = false
): number {
  // For neutral / international site games, do not include home field advantage
  const effectiveHfa = isNeutral ? 0 : homeHfa;

  // Advantage for the designated home team in expected score margin:
  // Formula: (Home_Team_Rating - Away_Team_Rating) + HFA
  const homeAdvantage = (homeEffectiveRating - awayEffectiveRating) + effectiveHfa;

  // In sports betting spread notation:
  // Home Spread = -homeAdvantage (negative when favored)
  // Away Spread = +homeAdvantage (positive when underdog)
  const teamSpread = isHome ? -homeAdvantage : homeAdvantage;

  // Round to nearest half or tenth point
  return Math.round(teamSpread * 10) / 10;
}

/**
 * Determines the heatmap color tier based on the projected spread:
 * - Dark Green: Heavy Favorite (Spread <= -7.0)
 * - Light Green: Moderate Favorite (-3.5 to -6.5)
 * - Neutral / Gray: Close Game (-3.0 to +3.0)
 * - Light Red: Underdog (Spread > +3.0)
 */
export function getHeatmapTier(spread: number, isBye: boolean): CalculatedMatchup['heatTier'] {
  if (isBye) return 'bye';
  if (spread <= -7.0) return 'heavy-favorite';
  if (spread <= -3.5) return 'moderate-favorite';
  if (spread <= 3.0) return 'close';
  return 'underdog';
}

/**
 * Formats spread into human readable string:
 * e.g. -6.5 => "-6.5", 3 => "+3.0", 0 => "PK"
 */
export function formatSpreadValue(spread: number): string {
  if (spread === 0) return 'PK';
  if (spread > 0) return `+${spread.toFixed(1)}`;
  return spread.toFixed(1);
}

/**
 * Computes the full 32-team dataset with calculated matchups, effective ratings,
 * future values, and picked states.
 */
export function buildTeamsWithStats(
  teams: NFLTeam[],
  ratings: TeamRating[],
  schedule: ScheduledGame[],
  picks: SurvivorPick[],
  blendRatio: number,
  globalHfa: number,
  currentWeek: number,
  lockedWeeks: Record<number, LockedWeekData> = {}
): TeamWithStats[] {
  // Map ratings by teamId
  const ratingMap = new Map<string, TeamRating>();
  ratings.forEach((r) => ratingMap.set(r.teamId, r));

  // Map picks by teamId and week
  const pickByTeam = new Map<string, number>(); // teamId -> week
  picks.forEach((p) => pickByTeam.set(p.teamId, p.week));

  // Precompute effective ratings
  const effectiveRatings = new Map<string, number>();
  const effectiveHfas = new Map<string, number>();
  teams.forEach((t) => {
    const r = ratingMap.get(t.id) || { teamId: t.id, userRating: 0, marketRating: 0 };
    effectiveRatings.set(t.id, calculateEffectiveRating(r, blendRatio));
    effectiveHfas.set(t.id, getEffectiveHfa(r, globalHfa));
  });

  // Map schedule games by week and team
  // teamId -> (week -> ScheduledGame)
  const teamGames = new Map<string, Map<number, { game: ScheduledGame; isHome: boolean }>>();
  teams.forEach((t) => teamGames.set(t.id, new Map()));

  schedule.forEach((game) => {
    teamGames.get(game.homeTeam)?.set(game.week, { game, isHome: true });
    teamGames.get(game.awayTeam)?.set(game.week, { game, isHome: false });
  });

  return teams.map((team) => {
    const r = ratingMap.get(team.id) || { teamId: team.id, userRating: 0, marketRating: 0 };
    const effectiveRating = effectiveRatings.get(team.id) ?? 0;
    const effectiveHfa = effectiveHfas.get(team.id) ?? globalHfa;
    const pickedWeek = pickByTeam.get(team.id);
    const isPicked = pickedWeek !== undefined;

    const matchupsByWeek: Record<number, CalculatedMatchup> = {};
    let futureValueCount = 0;

    for (let w = 1; w <= 18; w++) {
      const gameInfo = teamGames.get(team.id)?.get(w);

      if (!gameInfo) {
        // BYE week
        matchupsByWeek[w] = {
          week: w,
          teamId: team.id,
          opponentId: '',
          isHome: false,
          isBye: true,
          projectedSpread: 0,
          spreadText: 'BYE',
          opponentSpreadText: '',
          heatTier: 'bye',
        };
        continue;
      }

      const { game, isHome } = gameInfo;
      const opponentId = isHome ? game.awayTeam : game.homeTeam;
      const homeTeamId = isHome ? team.id : opponentId;
      const awayTeamId = isHome ? opponentId : team.id;
      const isNeutral = Boolean(game.isNeutral);
      const neutralLocation = game.neutralLocation;
      const venue = game.venue;

      const homeEff = effectiveRatings.get(homeTeamId) ?? 0;
      const awayEff = effectiveRatings.get(awayTeamId) ?? 0;
      const homeHfaVal = effectiveHfas.get(homeTeamId) ?? globalHfa;

      const spread = calculateMatchupSpread(team.id, isHome, homeEff, awayEff, homeHfaVal, isNeutral);
      const lockedWeekInfo = lockedWeeks[w] || (lockedWeeks as Record<string, LockedWeekData>)[String(w)];
      const isWeekLocked = Boolean(lockedWeekInfo?.isLocked);
      const savedSpread = lockedWeekInfo?.savedSpreads?.[team.id];
      const closingOdds = lockedWeekInfo?.closingOdds?.[team.id];

      // When the column is locked, the spread is saved/frozen and does not change dynamically from team ratings
      const effectiveSpread = isWeekLocked && savedSpread !== undefined ? savedSpread : spread;
      const oppSpread = -effectiveSpread;

      const locationPrefix = isNeutral ? 'vs' : isHome ? 'vs' : '@';
      const spreadStr = formatSpreadValue(effectiveSpread);
      const oppLocationPrefix = isNeutral ? 'vs' : isHome ? '@' : 'vs';
      const oppSpreadStr = formatSpreadValue(oppSpread);

      const heatTier = getHeatmapTier(effectiveSpread, false);

      matchupsByWeek[w] = {
        gameId: game.gameId,
        week: w,
        teamId: team.id,
        opponentId,
        isHome,
        isBye: false,
        isNeutral,
        neutralLocation,
        venue,
        projectedSpread: effectiveSpread,
        spreadText: `${locationPrefix} ${opponentId} ${spreadStr}`,
        opponentSpreadText: `${oppLocationPrefix} ${team.id} ${oppSpreadStr}`,
        heatTier,
        isWeekLocked,
        savedSpread,
        closingOdds,
      };

      // Future Value: Count remaining weeks (week >= currentWeek) where team is projected as >= 6.0 pt favorite (spread <= -6.0)
      if (w >= currentWeek && effectiveSpread <= -6.0) {
        futureValueCount++;
      }
    }

    return {
      team,
      rating: r,
      effectiveRating,
      effectiveHfa,
      futureValue: futureValueCount,
      isPicked,
      pickedWeek,
      matchupsByWeek,
    };
  });
}

/**
 * Checks if a given week is configured as a double-pick week (e.g. Thanksgiving, Christmas).
 */
export function isHolidayDoublePickWeek(
  week: number,
  settings?: { doublePickWeeks?: number[]; thanksgivingWeek?: number; christmasWeek?: number }
): boolean {
  const tgWeek = settings?.thanksgivingWeek ?? 12;
  const xmWeek = settings?.christmasWeek ?? 16;
  const list = settings?.doublePickWeeks ?? [tgWeek, xmWeek];
  return list.includes(week);
}

/**
 * Detailed holiday info for double-pick weeks
 */
export function getHolidayDoublePickInfo(
  week: number,
  settings?: { doublePickWeeks?: number[]; thanksgivingWeek?: number; christmasWeek?: number }
): { isDouble: boolean; type?: 'thanksgiving' | 'christmas' | 'custom'; label?: string } {
  const isDouble = isHolidayDoublePickWeek(week, settings);
  if (!isDouble) {
    return { isDouble: false };
  }
  const tgWeek = settings?.thanksgivingWeek ?? 12;
  const xmWeek = settings?.christmasWeek ?? 16;
  if (week === tgWeek) {
    return { isDouble: true, type: 'thanksgiving', label: 'Thanksgiving (2 Picks)' };
  }
  if (week === xmWeek) {
    return { isDouble: true, type: 'christmas', label: 'Christmas (2 Picks)' };
  }
  return { isDouble: true, type: 'custom', label: 'Double-Pick Week (2 Picks)' };
}

/**
 * Recommendations for the active week:
 * Scores candidates considering spread (the more negative, the safer) minus Future Value penalty
 * (preserving high-FV teams for future weeks).
 */
export function getWeekRecommendations(
  teamsWithStats: TeamWithStats[],
  week: number,
  picks: SurvivorPick[],
  excludeTeamIds: string[] = []
) {
  const usedTeamIds = new Set([
    ...picks.filter((p) => p.week < week).map((p) => p.teamId),
    ...excludeTeamIds,
  ]);

  const availableTeams = teamsWithStats.filter((t) => !usedTeamIds.has(t.team.id));

  const validMatchups = availableTeams
    .map((t) => {
      const matchup = t.matchupsByWeek[week];
      if (!matchup || matchup.isBye) return null;

      // Survivor score: spread bonus (heavier favorite is safer), penalty for high FV
      // Lower spread = higher win probability. E.g. spread -10 = 10 pts favorite
      const favoritePoints = -matchup.projectedSpread; // +10 if -10
      // Survival probability estimation based on normal distribution ~ approx
      const winProb = Math.min(0.98, Math.max(0.05, 0.5 + favoritePoints * 0.035));
      // Golden Rule: Save FV for later. Score = favoritePoints - (futureValue * 1.3)
      const strategyScore = favoritePoints - t.futureValue * 1.4;

      return {
        teamWithStats: t,
        matchup,
        favoritePoints,
        winProbability: Math.round(winProb * 100),
        strategyScore: Math.round(strategyScore * 10) / 10,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  // Sort by highest strategy score
  validMatchups.sort((a, b) => b.strategyScore - a.strategyScore);

  return validMatchups;
}
