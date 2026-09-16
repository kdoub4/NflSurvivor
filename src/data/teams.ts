import { NFLTeam, TeamRating } from '../types';

export const NFL_TEAMS: NFLTeam[] = [
  // AFC EAST
  { id: 'BUF', name: 'Buffalo Bills', shortName: 'Bills', city: 'Buffalo', conference: 'AFC', division: 'East', primaryColor: '#00338D', secondaryColor: '#C60C30', stadium: 'Highmark Stadium', defaultHfa: 1.8 },
  { id: 'MIA', name: 'Miami Dolphins', shortName: 'Dolphins', city: 'Miami', conference: 'AFC', division: 'East', primaryColor: '#008E97', secondaryColor: '#FC4C02', stadium: 'Hard Rock Stadium', defaultHfa: 1.5 },
  { id: 'NYJ', name: 'New York Jets', shortName: 'Jets', city: 'New York', conference: 'AFC', division: 'East', primaryColor: '#125740', secondaryColor: '#000000', stadium: 'MetLife Stadium', defaultHfa: 1.3 },
  { id: 'NE', name: 'New England Patriots', shortName: 'Patriots', city: 'New England', conference: 'AFC', division: 'East', primaryColor: '#002244', secondaryColor: '#C60C30', stadium: 'Gillette Stadium', defaultHfa: 1.4 },

  // AFC NORTH
  { id: 'BAL', name: 'Baltimore Ravens', shortName: 'Ravens', city: 'Baltimore', conference: 'AFC', division: 'North', primaryColor: '#241773', secondaryColor: '#9E7C0C', stadium: 'M&T Bank Stadium', defaultHfa: 1.8 },
  { id: 'CIN', name: 'Cincinnati Bengals', shortName: 'Bengals', city: 'Cincinnati', conference: 'AFC', division: 'North', primaryColor: '#FB4F14', secondaryColor: '#000000', stadium: 'Paycor Stadium', defaultHfa: 1.5 },
  { id: 'CLE', name: 'Cleveland Browns', shortName: 'Browns', city: 'Cleveland', conference: 'AFC', division: 'North', primaryColor: '#311D00', secondaryColor: '#FF3C00', stadium: 'Huntington Bank Field', defaultHfa: 1.5 },
  { id: 'PIT', name: 'Pittsburgh Steelers', shortName: 'Steelers', city: 'Pittsburgh', conference: 'AFC', division: 'North', primaryColor: '#FFB612', secondaryColor: '#101820', stadium: 'Acrisure Stadium', defaultHfa: 1.7 },

  // AFC SOUTH
  { id: 'HOU', name: 'Houston Texans', shortName: 'Texans', city: 'Houston', conference: 'AFC', division: 'South', primaryColor: '#03202F', secondaryColor: '#A71930', stadium: 'NRG Stadium', defaultHfa: 1.4 },
  { id: 'IND', name: 'Indianapolis Colts', shortName: 'Colts', city: 'Indianapolis', conference: 'AFC', division: 'South', primaryColor: '#002C5F', secondaryColor: '#A2AAAD', stadium: 'Lucas Oil Stadium', defaultHfa: 1.4 },
  { id: 'JAX', name: 'Jacksonville Jaguars', shortName: 'Jaguars', city: 'Jacksonville', conference: 'AFC', division: 'South', primaryColor: '#006778', secondaryColor: '#D7A22A', stadium: 'EverBank Stadium', defaultHfa: 1.3 },
  { id: 'TEN', name: 'Tennessee Titans', shortName: 'Titans', city: 'Tennessee', conference: 'AFC', division: 'South', primaryColor: '#0C2340', secondaryColor: '#4B92DB', stadium: 'Nissan Stadium', defaultHfa: 1.3 },

  // AFC WEST
  { id: 'KC', name: 'Kansas City Chiefs', shortName: 'Chiefs', city: 'Kansas City', conference: 'AFC', division: 'West', primaryColor: '#E31837', secondaryColor: '#FFB81C', stadium: 'GEHA Field at Arrowhead', defaultHfa: 2.2 },
  { id: 'LAC', name: 'Los Angeles Chargers', shortName: 'Chargers', city: 'Los Angeles', conference: 'AFC', division: 'West', primaryColor: '#0080C6', secondaryColor: '#FFC20E', stadium: 'SoFi Stadium', defaultHfa: 1.2 },
  { id: 'DEN', name: 'Denver Broncos', shortName: 'Broncos', city: 'Denver', conference: 'AFC', division: 'West', primaryColor: '#FB4F14', secondaryColor: '#002244', stadium: 'Empower Field at Mile High', defaultHfa: 2.1 },
  { id: 'LV', name: 'Las Vegas Raiders', shortName: 'Raiders', city: 'Las Vegas', conference: 'AFC', division: 'West', primaryColor: '#000000', secondaryColor: '#A5ACAF', stadium: 'Allegiant Stadium', defaultHfa: 1.3 },

  // NFC EAST
  { id: 'PHI', name: 'Philadelphia Eagles', shortName: 'Eagles', city: 'Philadelphia', conference: 'NFC', division: 'East', primaryColor: '#004C54', secondaryColor: '#A5ACAF', stadium: 'Lincoln Financial Field', defaultHfa: 1.9 },
  { id: 'DAL', name: 'Dallas Cowboys', shortName: 'Cowboys', city: 'Dallas', conference: 'NFC', division: 'East', primaryColor: '#003594', secondaryColor: '#869397', stadium: 'AT&T Stadium', defaultHfa: 1.6 },
  { id: 'WAS', name: 'Washington Commanders', shortName: 'Commanders', city: 'Washington', conference: 'NFC', division: 'East', primaryColor: '#5A1414', secondaryColor: '#FFB612', stadium: 'Northwest Stadium', defaultHfa: 1.4 },
  { id: 'NYG', name: 'New York Giants', shortName: 'Giants', city: 'New York', conference: 'NFC', division: 'East', primaryColor: '#0B2265', secondaryColor: '#A71930', stadium: 'MetLife Stadium', defaultHfa: 1.3 },

  // NFC NORTH
  { id: 'DET', name: 'Detroit Lions', shortName: 'Lions', city: 'Detroit', conference: 'NFC', division: 'North', primaryColor: '#0076B6', secondaryColor: '#B0B7BC', stadium: 'Ford Field', defaultHfa: 1.8 },
  { id: 'GB', name: 'Green Bay Packers', shortName: 'Packers', city: 'Green Bay', conference: 'NFC', division: 'North', primaryColor: '#203731', secondaryColor: '#FFB612', stadium: 'Lambeau Field', defaultHfa: 2.0 },
  { id: 'MIN', name: 'Minnesota Vikings', shortName: 'Vikings', city: 'Minnesota', conference: 'NFC', division: 'North', primaryColor: '#4F2683', secondaryColor: '#FFC62F', stadium: 'U.S. Bank Stadium', defaultHfa: 1.7 },
  { id: 'CHI', name: 'Chicago Bears', shortName: 'Bears', city: 'Chicago', conference: 'NFC', division: 'North', primaryColor: '#0B162A', secondaryColor: '#C83803', stadium: 'Soldier Field', defaultHfa: 1.5 },

  // NFC SOUTH
  { id: 'TB', name: 'Tampa Bay Buccaneers', shortName: 'Buccaneers', city: 'Tampa Bay', conference: 'NFC', division: 'South', primaryColor: '#D50A0A', secondaryColor: '#34302B', stadium: 'Raymond James Stadium', defaultHfa: 1.5 },
  { id: 'ATL', name: 'Atlanta Falcons', shortName: 'Falcons', city: 'Atlanta', conference: 'NFC', division: 'South', primaryColor: '#A71930', secondaryColor: '#000000', stadium: 'Mercedes-Benz Stadium', defaultHfa: 1.4 },
  { id: 'NO', name: 'New Orleans Saints', shortName: 'Saints', city: 'New Orleans', conference: 'NFC', division: 'South', primaryColor: '#D3BC8D', secondaryColor: '#101820', stadium: 'Caesars Superdome', defaultHfa: 1.7 },
  { id: 'CAR', name: 'Carolina Panthers', shortName: 'Panthers', city: 'Carolina', conference: 'NFC', division: 'South', primaryColor: '#0085CA', secondaryColor: '#101820', stadium: 'Bank of America Stadium', defaultHfa: 1.3 },

  // NFC WEST
  { id: 'SF', name: 'San Francisco 49ers', shortName: '49ers', city: 'San Francisco', conference: 'NFC', division: 'West', primaryColor: '#AA0000', secondaryColor: '#B3995D', stadium: "Levi's Stadium", defaultHfa: 1.7 },
  { id: 'LAR', name: 'Los Angeles Rams', shortName: 'Rams', city: 'Los Angeles', conference: 'NFC', division: 'West', primaryColor: '#003594', secondaryColor: '#FFA300', stadium: 'SoFi Stadium', defaultHfa: 1.3 },
  { id: 'ARI', name: 'Arizona Cardinals', shortName: 'Cardinals', city: 'Arizona', conference: 'NFC', division: 'West', primaryColor: '#97233F', secondaryColor: '#000000', stadium: 'State Farm Stadium', defaultHfa: 1.4 },
  { id: 'SEA', name: 'Seattle Seahawks', shortName: 'Seahawks', city: 'Seattle', conference: 'NFC', division: 'West', primaryColor: '#002244', secondaryColor: '#69BE28', stadium: 'Lumen Field', defaultHfa: 2.0 },
];

// Baseline Power Ratings: Market Ratings sourced directly from https://stats.inpredictable.com/rankings/nfl.php
export const INITIAL_RATINGS: TeamRating[] = [
  // AFC EAST
  { teamId: 'BUF', userRating: 5.0, marketRating: 4.7, customHfa: 1.8 },
  { teamId: 'MIA', userRating: -3.0, marketRating: -6.8 },
  { teamId: 'NYJ', userRating: -2.5, marketRating: -5.2 },
  { teamId: 'NE', userRating: 2.0, marketRating: 0.5 },

  // AFC NORTH
  { teamId: 'BAL', userRating: 4.5, marketRating: 4.3, customHfa: 1.8 },
  { teamId: 'CIN', userRating: 2.0, marketRating: 1.8 },
  { teamId: 'CLE', userRating: -4.0, marketRating: -6.6 },
  { teamId: 'PIT', userRating: -0.5, marketRating: -2.2, customHfa: 1.7 },

  // AFC SOUTH
  { teamId: 'HOU', userRating: 2.0, marketRating: 2.6 },
  { teamId: 'IND', userRating: -1.0, marketRating: -1.6 },
  { teamId: 'JAX', userRating: 1.0, marketRating: 0.9 },
  { teamId: 'TEN', userRating: -3.5, marketRating: -5.1 },

  // AFC WEST
  { teamId: 'KC', userRating: 5.5, marketRating: 3.4, customHfa: 2.2 },
  { teamId: 'LAC', userRating: 2.0, marketRating: 1.8 },
  { teamId: 'DEN', userRating: 2.0, marketRating: 1.0, customHfa: 2.1 },
  { teamId: 'LV', userRating: -3.0, marketRating: -3.2 },

  // NFC EAST
  { teamId: 'PHI', userRating: 3.5, marketRating: 3.9, customHfa: 1.9 },
  { teamId: 'DAL', userRating: 2.5, marketRating: 1.6 },
  { teamId: 'WAS', userRating: -0.5, marketRating: -1.0 },
  { teamId: 'NYG', userRating: -2.0, marketRating: -1.0 },

  // NFC NORTH
  { teamId: 'DET', userRating: 4.0, marketRating: 0.8, customHfa: 1.8 },
  { teamId: 'GB', userRating: 2.5, marketRating: -0.2, customHfa: 2.0 },
  { teamId: 'MIN', userRating: 1.5, marketRating: 0.7 },
  { teamId: 'CHI', userRating: 2.5, marketRating: 4.1 },

  // NFC SOUTH
  { teamId: 'TB', userRating: 0.0, marketRating: 0.2 },
  { teamId: 'ATL', userRating: -2.0, marketRating: -5.8 },
  { teamId: 'NO', userRating: -2.0, marketRating: -1.9 },
  { teamId: 'CAR', userRating: -2.0, marketRating: -2.1 },

  // NFC WEST
  { teamId: 'SF', userRating: 3.5, marketRating: 4.7, customHfa: 1.7 },
  { teamId: 'LAR', userRating: 5.0, marketRating: 4.8 },
  { teamId: 'ARI', userRating: -4.5, marketRating: -2.2 },
  { teamId: 'SEA', userRating: 4.0, marketRating: 3.0, customHfa: 2.0 },
];

export const TEAM_MAP = new Map<string, NFLTeam>(
  NFL_TEAMS.map(team => [team.id, team])
);
