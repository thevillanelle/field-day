export type Vertical = "dating" | "school" | "friends" | "work";

export type VibeType = "explorer" | "challenger" | "creator" | "wanderer";

export type GameType =
  | "daily-puzzle"
  | "competitive"
  | "creative"
  | "collaborative"
  | "storytelling";

export type GameMode = "async" | "live";

export type MatchStatus = "active" | "expired" | "completed";

export type FieldNoteType =
  | "game_result"
  | "question_answer"
  | "message"
  | "live_invite";

export type EventStatus = "draft" | "open" | "matching" | "active" | "closed";

export type EventMode = "rolling" | "batch";

// ─── Database row types ───────────────────────────────────────────────────────

export interface DbUser {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  google_id: string;
  email_domain: string;
  created_at: string;
}

export interface DbProfile {
  user_id: string;
  bio: string | null;
  age: number | null;
  location: string | null;
  vibe_type: VibeType | null;
  quiz_answers: Record<string, string> | null;
  skills: string[];
  interests: string[];
  hobbies: string[];
  is_public: boolean;
}

export interface DbVerticalEnrollment {
  id: string;
  user_id: string;
  vertical: Vertical;
  intent: string | null;
  orientation: string | null;
  enrolled_at: string;
}

export interface DbEvent {
  id: string;
  name: string;
  vertical: Vertical;
  status: EventStatus;
  mode: EventMode;
  registration_opens: string | null;
  registration_closes: string | null;
  match_drop_at: string | null;
  play_window_start: string | null;
  play_window_end: string | null;
  created_by: string;
  created_at: string;
}

export interface DbMatch {
  id: string;
  event_id: string | null;
  player_1_id: string;
  player_2_id: string;
  vertical: Vertical;
  suggested_game: string;
  match_score: number;
  match_reason: MatchReason;
  status: MatchStatus;
  expires_at: string | null;
  created_at: string;
}

export interface MatchReason {
  score: number;
  game_name: string;
  game_url: string | null;
  why: string;
  type_combo: string;
}

export interface DbFieldNote {
  id: string;
  match_id: string;
  from_user_id: string;
  to_user_id: string;
  type: FieldNoteType;
  content: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface DbGame {
  id: string;
  slug: string;
  name: string;
  description: string;
  type: GameType;
  duration_min: number;
  duration_max: number;
  is_native: boolean;
  external_url: string | null;
  compatible_verticals: Vertical[];
  vibe_tags: VibeType[];
}

export interface DbQuestionDeck {
  id: string;
  game_id: string;
  vertical: Vertical;
  questions: Question[];
}

export interface Question {
  prompt: string;
  type: "text" | "choice" | "scale";
  options?: string[];
  timing: "pre-game" | "post-game";
}

export interface DbGameSession {
  id: string;
  match_id: string;
  game_slug: string;
  mode: GameMode;
  status: "waiting" | "player1_done" | "player2_done" | "complete";
  result: Record<string, unknown> | null;
  started_at: string;
  completed_at: string | null;
}

export interface DbSchoolProfile {
  user_id: string;
  school_name: string;
  major: string | null;
  year: "freshman" | "sophomore" | "junior" | "senior" | "grad" | null;
  campus: string | null;
  verified_at: string;
}

export interface DbPlayAgainSignal {
  id: string;
  match_id: string;
  from_user_id: string;
  signaled_at: string;
}

export interface DbConnection {
  id: string;
  user_1_id: string;
  user_2_id: string;
  vertical: Vertical;
  match_id: string;
  connected_at: string;
}

// ─── Enriched / view types ────────────────────────────────────────────────────

export interface PublicProfile extends DbProfile {
  user: Pick<DbUser, "id" | "name" | "avatar_url" | "email_domain">;
  school?: DbSchoolProfile;
  verticals: Vertical[];
}

export interface MatchWithPlayers extends DbMatch {
  player_1: PublicProfile;
  player_2: PublicProfile;
  game: DbGame;
  my_play_again: boolean;
  partner_play_again: boolean;
}
