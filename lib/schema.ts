import type { SectionType } from './types';

export type FieldKind = 'text' | 'textarea' | 'image' | 'number' | 'boolean' | 'select';

export interface Field {
  key: string;
  label: string;
  kind: FieldKind;
  /** Character limit matched to the layout. */
  max?: number;
  options?: { value: string; label: string }[];
  /** Image slot ratio (width / height), used to crop uploads. */
  ratio?: number;
  hint?: string;
  /** Optional fields may stay empty; required text left empty becomes a placeholder that blocks Publish. */
  optional?: boolean;
  width?: 'full' | 'half' | 'third' | 'small';
}

export interface ListField {
  key: string;
  label: string;
  kind: 'list';
  item: Field[];
  addLabel: string;
  max?: number;
  blank: Record<string, string | boolean>;
}

export type AnyField = Field | ListField;

const player: Field[] = [
  { key: 'number', label: 'Αρ.', kind: 'text', max: 3, width: 'small' },
  { key: 'name', label: 'Ονοματεπώνυμο', kind: 'text', max: 28 },
  { key: 'nationality', label: 'Εθνικότητα', kind: 'text', max: 24 },
  { key: 'birthYear', label: 'Έτος', kind: 'text', max: 4, width: 'small' },
];
const playerBlank = { number: '', name: '', nationality: '', birthYear: '' };
const nv: Field[] = [
  { key: 'name', label: 'Παίκτης', kind: 'text', max: 26 },
  { key: 'value', label: 'Αριθμός', kind: 'text', max: 3, width: 'small' },
];

export const SECTION_TITLES: Record<SectionType, string> = {
  welcome: 'Καλώς ήρθατε',
  contents: 'Περιεχόμενα',
  squad: 'Αποστολή',
  transfers: 'Μεταγραφές',
  owner_staff: 'Ιδιοκτήτης',
  last_match: 'Προηγ. αγώνας',
  season_stats: 'Στατιστικά',
  fixtures: 'Αγωνιστική',
  standings: 'Βαθμολογία',
  head_to_head: 'Αναμετρήσεις',
  sponsors: 'Χορηγοί',
  back_page: 'Οπισθόφυλλο',
};

export const SECTION_SCHEMA: Record<SectionType, AnyField[]> = {
  welcome: [
    { key: 'title', label: 'Τίτλος', kind: 'text', max: 24 },
    { key: 'message', label: 'Μήνυμα', kind: 'textarea', max: 600 },
    { key: 'signatureName', label: 'Υπογραφή · όνομα', kind: 'text', max: 30, width: 'half' },
    { key: 'signatureRole', label: 'Υπογραφή · ιδιότητα', kind: 'text', max: 40, width: 'half' },
    { key: 'portraitUrl', label: 'Πορτρέτο', kind: 'image', ratio: 1 },
  ],
  contents: [{ key: 'photoUrl', label: 'Φωτογραφία τεύχους (αριστερή σελίδα)', kind: 'image', ratio: 495 / 700 }],
  squad: [
    { key: 'goalkeepers', label: 'Τερματοφύλακες', kind: 'list', item: player, addLabel: 'Προσθήκη τερματοφύλακα', max: 6, blank: playerBlank },
    { key: 'defenders', label: 'Αμυντικοί', kind: 'list', item: player, addLabel: 'Προσθήκη αμυντικού', max: 13, blank: playerBlank },
    { key: 'midfielders', label: 'Μέσοι', kind: 'list', item: player, addLabel: 'Προσθήκη μέσου', max: 11, blank: playerBlank },
    { key: 'forwards', label: 'Επιθετικοί', kind: 'list', item: player, addLabel: 'Προσθήκη επιθετικού', max: 11, blank: playerBlank },
    { key: 'coach', label: 'Προπονητής', kind: 'text', max: 30 },
  ],
  transfers: [
    { key: 'leadPhotoUrl', label: 'Φωτογραφία κεντρικής μεταγραφής', kind: 'image', ratio: 495 / 360 },
    { key: 'leadName', label: 'Όνομα', kind: 'text', max: 28, width: 'half' },
    { key: 'leadPosition', label: 'Θέση', kind: 'text', max: 20, width: 'half' },
    { key: 'leadFromClub', label: 'Προηγούμενη ομάδα', kind: 'text', max: 30 },
    { key: 'leadQuote', label: 'Δήλωση', kind: 'textarea', max: 140 },
    {
      key: 'others', label: 'Υπόλοιπες μεταγραφές', kind: 'list', addLabel: 'Προσθήκη μεταγραφής', max: 4,
      item: [
        { key: 'photoUrl', label: 'Φωτο', kind: 'image', ratio: 1, width: 'small' },
        { key: 'name', label: 'Όνομα', kind: 'text', max: 24 },
        { key: 'fromClub', label: 'Από', kind: 'text', max: 22 },
      ],
      blank: { photoUrl: '', name: '', fromClub: '' },
    },
  ],
  owner_staff: [
    { key: 'ownerPhotoUrl', label: 'Πορτρέτο ιδιοκτήτη', kind: 'image', ratio: 3 / 4 },
    { key: 'ownerName', label: 'Όνομα', kind: 'text', max: 26, width: 'half' },
    { key: 'ownerRole', label: 'Ιδιότητα', kind: 'text', max: 24, width: 'half' },
    { key: 'ownerBio', label: 'Βιογραφικό', kind: 'textarea', max: 480 },
    { key: 'staff', label: 'Τεχνικό επιτελείο', kind: 'list', addLabel: 'Προσθήκη μέλους', max: 8, item: [{ key: 'role', label: 'Ρόλος', kind: 'text', max: 28 }, { key: 'name', label: 'Όνομα', kind: 'text', max: 26 }], blank: { role: '', name: '' } },
  ],
  last_match: [
    { key: 'label', label: 'Αγωνιστική · έδρα', kind: 'text', max: 32 },
    { key: 'homeTeam', label: 'Γηπεδούχος', kind: 'text', max: 16, width: 'half' },
    { key: 'awayTeam', label: 'Φιλοξενούμενη', kind: 'text', max: 16, width: 'half' },
    { key: 'homeScore', label: 'Γκολ γηπεδούχου', kind: 'text', max: 2, width: 'half' },
    { key: 'awayScore', label: 'Γκολ φιλοξενούμενης', kind: 'text', max: 2, width: 'half' },
    {
      key: 'goals', label: 'Γκολ', kind: 'list', addLabel: 'Προσθήκη γκολ', max: 8,
      item: [
        { key: 'minute', label: 'Λεπτό', kind: 'text', max: 6, width: 'small', hint: "π.χ. 90+3'" },
        { key: 'scorer', label: 'Σκόρερ', kind: 'text', max: 24 },
        { key: 'side', label: 'Ομάδα', kind: 'select', options: [{ value: 'home', label: 'Γηπεδούχος' }, { value: 'away', label: 'Φιλοξενούμενη' }] },
        { key: 'score', label: 'Σκορ', kind: 'text', max: 5, width: 'small' },
      ],
      blank: { minute: '', scorer: '', side: 'home', score: '' },
    },
    { key: 'subs', label: 'Αλλαγές', kind: 'list', addLabel: 'Προσθήκη αλλαγής', max: 5, item: [{ key: 'minute', label: 'Λεπτό', kind: 'text', max: 6, width: 'small' }, { key: 'on', label: 'Μπαίνει', kind: 'text', max: 18 }, { key: 'off', label: 'Βγαίνει', kind: 'text', max: 18 }], blank: { minute: '', on: '', off: '' } },
  ],
  season_stats: [
    { key: 'afterLabel', label: 'Υπότιτλος', kind: 'text', max: 30 },
    { key: 'scorers', label: 'Σκόρερ', kind: 'list', item: nv, addLabel: 'Προσθήκη', max: 6, blank: { name: '', value: '' } },
    { key: 'assists', label: 'Ασίστ', kind: 'list', item: nv, addLabel: 'Προσθήκη', max: 6, blank: { name: '', value: '' } },
    { key: 'yellow', label: 'Κίτρινες κάρτες', kind: 'list', item: nv, addLabel: 'Προσθήκη', max: 14, blank: { name: '', value: '' } },
    { key: 'red', label: 'Κόκκινες κάρτες', kind: 'list', item: nv, addLabel: 'Προσθήκη', max: 6, blank: { name: '', value: '' } },
  ],
  fixtures: [
    { key: 'title', label: 'Τίτλος', kind: 'text', max: 20, hint: 'π.χ. 5η αγωνιστική' },
    { key: 'fixtures', label: 'Αγώνες (η γραμμή της Καλαμάτας τονίζεται αυτόματα)', kind: 'list', addLabel: 'Προσθήκη αγώνα', max: 8, item: [{ key: 'when', label: 'Ημέρα · ώρα', kind: 'text', max: 18 }, { key: 'home', label: 'Γηπεδούχος', kind: 'text', max: 16 }, { key: 'away', label: 'Φιλοξενούμενη', kind: 'text', max: 16 }], blank: { when: '', home: '', away: '' } },
  ],
  standings: [
    { key: 'afterLabel', label: 'Υπότιτλος', kind: 'text', max: 30 },
    {
      key: 'rows', label: 'Ομάδες (με σειρά κατάταξης)', kind: 'list', addLabel: 'Προσθήκη ομάδας', max: 18,
      item: [
        { key: 'team', label: 'Ομάδα', kind: 'text', max: 16 },
        { key: 'played', label: 'Αγ', kind: 'number', width: 'small' },
        { key: 'won', label: 'Ν', kind: 'number', width: 'small' },
        { key: 'drawn', label: 'Ι', kind: 'number', width: 'small' },
        { key: 'lost', label: 'Η', kind: 'number', width: 'small' },
        { key: 'goalsFor', label: 'Γκολ υπέρ', kind: 'number', width: 'small' },
        { key: 'goalsAgainst', label: 'Γκολ κατά', kind: 'number', width: 'small' },
        { key: 'points', label: 'Β', kind: 'number', width: 'small' },
      ],
      blank: { team: '', played: '', won: '', drawn: '', lost: '', goalsFor: '', goalsAgainst: '', points: '' },
    },
  ],
  head_to_head: [
    { key: 'photoUrl', label: 'Αρχειακή φωτογραφία', kind: 'image', ratio: 495 / 300 },
    { key: 'rangeLabel', label: 'Υπότιτλος', kind: 'text', max: 60 },
    {
      key: 'games', label: 'Αναμετρήσεις (η σύνοψη Ν-Ι-Η υπολογίζεται αυτόματα)', kind: 'list', addLabel: 'Προσθήκη αγώνα', max: 22,
      item: [
        { key: 'season', label: 'Σεζόν', kind: 'text', max: 7, width: 'small' },
        { key: 'kalamataHome', label: 'Εντός έδρας', kind: 'boolean' },
        { key: 'homeGoals', label: 'Γκολ γηπ.', kind: 'number', width: 'small' },
        { key: 'awayGoals', label: 'Γκολ φιλ.', kind: 'number', width: 'small' },
      ],
      blank: { season: '', kalamataHome: true, homeGoals: '', awayGoals: '' },
    },
  ],
  sponsors: [
    { key: 'sponsorName', label: 'Κύριος χορηγός', kind: 'text', max: 30 },
    { key: 'adImageUrl', label: 'Ολοσέλιδη καταχώριση (495 × 700)', kind: 'image', ratio: 495 / 700 },
    { key: 'link', label: 'Σύνδεσμος χορηγού', kind: 'text', max: 200, hint: 'https://…', optional: true },
  ],
  back_page: [
    { key: 'nextOpponent', label: 'Επόμενος αντίπαλος', kind: 'text', max: 20, width: 'half' },
    { key: 'nextStadium', label: 'Γήπεδο', kind: 'text', max: 26, width: 'half' },
    { key: 'nextDate', label: 'Ημερομηνία', kind: 'text', max: 14, width: 'half', hint: 'π.χ. Σάβ. 29/11' },
    { key: 'nextTime', label: 'Ώρα', kind: 'text', max: 6, width: 'half' },
  ],
};
