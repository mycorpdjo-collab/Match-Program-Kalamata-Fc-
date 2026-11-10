export type ArchiveAccess = 'gated' | 'open' | 'hidden';
export type CoverTone = 'ink' | 'white' | 'photo';
export type IssueStatus = 'draft' | 'published';

export interface SquadPlayer {
  number: string;
  name: string;
  nationality: string;
  birthYear: string;
}

export interface NameValue {
  name: string;
  value: string;
}

export interface WelcomeData {
  title: string;
  message: string;
  signatureName: string;
  signatureRole: string;
  portraitUrl: string;
}
export interface ContentsData {
  photoUrl: string;
}
export interface SquadData {
  goalkeepers: SquadPlayer[];
  defenders: SquadPlayer[];
  midfielders: SquadPlayer[];
  forwards: SquadPlayer[];
  coach: string;
}
export interface TransfersData {
  leadName: string;
  leadPosition: string;
  leadFromClub: string;
  leadQuote: string;
  leadPhotoUrl: string;
  others: { name: string; fromClub: string; photoUrl: string }[];
}
export interface OwnerStaffData {
  ownerName: string;
  ownerRole: string;
  ownerBio: string;
  ownerPhotoUrl: string;
  staff: { role: string; name: string }[];
}
export interface LastMatchData {
  label: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: string;
  awayScore: string;
  goals: { minute: string; scorer: string; side: 'home' | 'away'; score: string }[];
  subs: { minute: string; on: string; off: string }[];
}
export interface SeasonStatsData {
  afterLabel: string;
  scorers: NameValue[];
  assists: NameValue[];
  yellow: NameValue[];
  red: NameValue[];
}
export interface FixturesData {
  title: string;
  fixtures: { when: string; home: string; away: string }[];
}
export interface StandingsData {
  afterLabel: string;
  rows: { team: string; played: string; won: string; drawn: string; lost: string; goalsFor: string; goalsAgainst: string; points: string }[];
}
export interface HeadToHeadData {
  rangeLabel: string;
  photoUrl: string;
  games: { season: string; kalamataHome: boolean; homeGoals: string; awayGoals: string }[];
}
export interface SponsorsData {
  sponsorName: string;
  adImageUrl: string;
  link: string;
}
export interface BackPageData {
  nextOpponent: string;
  nextDate: string;
  nextTime: string;
  nextStadium: string;
}

export interface SectionDataMap {
  welcome: WelcomeData;
  contents: ContentsData;
  squad: SquadData;
  transfers: TransfersData;
  owner_staff: OwnerStaffData;
  last_match: LastMatchData;
  season_stats: SeasonStatsData;
  fixtures: FixturesData;
  standings: StandingsData;
  head_to_head: HeadToHeadData;
  sponsors: SponsorsData;
  back_page: BackPageData;
}
export type SectionType = keyof SectionDataMap;

export type Section = {
  [K in SectionType]: { type: K; visible: boolean; data: SectionDataMap[K] };
}[SectionType];

export interface CoverLine {
  text: string;
  gold: boolean;
}

export interface PageManifest {
  version: string;
  pages: string[];
  cover: string;
  coverMask: string;
  back: string;
}

export interface Issue {
  id: string;
  number: number;
  season: string;
  opponent: string;
  opponent_crest_url: string;
  is_home: boolean;
  matchday: number;
  competition: string;
  stadium: string;
  kickoff_at: string;
  publish_at: string;
  expires_at: string;
  archive_access: ArchiveAccess;
  status: IssueStatus;
  countdown_sponsor_url: string;
  cover_photo_url: string;
  cover_cutout_url: string;
  cover_tone: CoverTone;
  cover_lines: CoverLine[];
  sections: Section[];
  page_manifest: PageManifest | null;
  created_at?: string;
}

export type IssuePhase = 'draft' | 'scheduled' | 'live' | 'archived';

export function sectionData<K extends SectionType>(issue: Issue, type: K): SectionDataMap[K] | null {
  const s = issue.sections.find((x) => x.type === type);
  return s ? (s.data as SectionDataMap[K]) : null;
}
