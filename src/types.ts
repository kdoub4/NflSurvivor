export interface NFLTeam {
  id: string; // e.g., 'KC', 'SF'
  name: string; // e.g., 'Kansas City Chiefs'
  shortName: string; // e.g., 'Chiefs'
  city: string; // e.g., 'Kansas City'
  conference: 'AFC' | 'NFC';
  division: 'East' | 'North' | 'South' | 'West';
  primaryColor: string;
  secondaryColor: string;
  stadium: string;
  defaultHfa?: number;
}

export interface TeamRating {
  teamId: string;
  userRating: number; // -10.0 to +10.0
  marketRating: number; // -10.0 to +10.0
  customHfa?: number; // Optional stadium override
}

export interface ScheduledGame {
  gameId: string;
  week: number; // 1 to 18
  homeTeam: string; // teamId (designated home team)
  awayTeam: string; // teamId
  isNeutral?: boolean; // International / neutral site game (0 home field advantage)
  neutralLocation?: string; // e.g., 'Melbourne, Australia'
  venue?: string; // e.g., 'Melbourne Cricket Ground'
}

export interface SurvivorPick {
  id?: string;
  week: number; // 1 to 18
  teamId: string;
  slot?: number; // 1 or 2 for multi-pick weeks
}

export interface AppSettings {
  blendRatio: number; // 0 (100% User) to 1 (100% Market), default 0.5
  globalHfa: number; // default 1.5
  currentWeek: number; // 1 to 18
  doublePickWeeks?: number[]; // e.g., [12, 16]
  thanksgivingWeek?: number; // default: 12
  christmasWeek?: number; // default: 16
}

export interface LockedWeekData {
  week: number;
  isLocked: boolean;
  lockedAt: string; // ISO string
  savedSpreads: Record<string, number>; // teamId -> saved projected spread at time of lock
  closingOdds: Record<string, string>; // teamId -> Fox Sports closing odds string (e.g. "-2.5", "+3.0")
}

export interface CalculatedMatchup {
  gameId?: string;
  week: number;
  teamId: string;
  opponentId: string;
  isHome: boolean;
  isBye: boolean;
  isNeutral?: boolean;
  neutralLocation?: string;
  venue?: string;
  projectedSpread: number; // From team's perspective. Negative means team is favored (e.g. -6.5). Positive means underdog (+3.0)
  spreadText: string; // e.g. "vs DEN -6.5" or "@ LV +3.0"
  opponentSpreadText: string;
  heatTier: 'heavy-favorite' | 'moderate-favorite' | 'close' | 'underdog' | 'bye';
  isWeekLocked?: boolean;
  savedSpread?: number;
  closingOdds?: string;
}

export interface TeamWithStats {
  team: NFLTeam;
  rating: TeamRating;
  effectiveRating: number;
  effectiveHfa: number;
  futureValue: number; // Count of remaining weeks projected as >= 6.0 pt favorite (spread <= -6.0)
  isPicked: boolean;
  pickedWeek?: number;
  matchupsByWeek: Record<number, CalculatedMatchup>;
}

export type ActiveTab = 'matrix' | 'ratings' | 'strategy';
