// lib/types.ts — Types métier alignés sur le schéma SQL Supabase.

export type RankLetter = 'E' | 'D' | 'C' | 'B' | 'A' | 'S' | 'MONARCH';
export type RankTier   = 'MINUS' | 'NEUTRAL' | 'PLUS';

export type StatKind =
  | 'DISCIPLINE' | 'FOCUS' | 'INTELLIGENCE' | 'CREATIVITY'
  | 'LEADERSHIP' | 'ENERGY' | 'MENTAL_RESISTANCE' | 'TECHNIQUE' | 'SOCIAL';

export type ProjectType   = 'OPERATION' | 'CAMPAIGN' | 'RAID' | 'DUNGEON' | 'BOSS';
export type ProjectStatus = 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ABANDONED';
export type QuestStatus   = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'EXPIRED';
export type DifficultyTier = 'TRIVIAL' | 'ROUTINE' | 'NOTABLE' | 'HARD' | 'LEGENDARY';

export type SpecKind =
  | 'ARCHITECT' | 'STRATEGIST' | 'CREATOR' | 'WARRIOR'
  | 'DIPLOMAT'  | 'SCHOLAR'    | 'MONARCH';

export type XpSource =
  | 'QUEST_COMPLETE' | 'SESSION' | 'BOSS_PHASE' | 'CRIT'
  | 'STREAK_BONUS'   | 'DAILY_BRIEFING' | 'ADJUSTMENT' | 'DECAY';

export type SessionQuality = 'LOW' | 'NET' | 'MAXIMAL';

// ─────────── Tables ───────────

export interface Profile {
  user_id: string;
  operator_code: string;
  display_name: string | null;
  mbti: string | null;
  level: number;
  total_xp: number;
  rank_letter: RankLetter;
  rank_tier: RankTier;
  constance: number;
  mastery_points: number;
  active_boss_id: string | null;
  active_raid_id: string | null;
  created_at: string;
  updated_at: string;
  last_active_at: string | null;
}

export interface Stat {
  id: string;
  user_id: string;
  kind: StatKind;
  level: number;
  xp: number;
  last_gain_at: string | null;
  decay_pct: number;
}

export interface Specialization {
  id: string;
  user_id: string;
  kind: SpecKind;
  is_primary: boolean;
  acquired_at: string;
}

export interface Skill {
  id: string;
  user_id: string;
  spec_kind: SpecKind;
  skill_code: string;
  unlocked_at: string;
}

export interface Mission {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  horizon: 'QUARTER' | 'YEAR' | 'LIFE';
  starts_at: string;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  mission_id: string | null;
  type: ProjectType;
  title: string;
  description: string | null;
  status: ProjectStatus;
  progress_pct: number;
  hp_total: number | null;
  hp_remaining: number | null;
  phase_count: number;
  phase_current: number;
  difficulty: DifficultyTier | null;
  starts_at: string | null;
  ends_at: string | null;
  completed_at: string | null;
  primary_stat: StatKind | null;
  secondary_stat: StatKind | null;
  is_locked: boolean;
  created_at: string;
}

export interface Quest {
  id: string;
  user_id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: QuestStatus;
  difficulty_score: number | null;
  difficulty_tier: DifficultyTier | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  starts_at: string | null;
  due_at: string | null;
  completed_at: string | null;
  reward_xp_base: number | null;
  reward_stats: StatKind[] | null;
  is_flash: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  quest_id: string;
  title: string;
  is_done: boolean;
  estimated_min: number | null;
  done_at: string | null;
  created_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  quest_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  quality: SessionQuality | null;
  interruptions: number;
  notes: string | null;
}

export interface XpEvent {
  id: string;
  user_id: string;
  source: XpSource;
  source_ref_id: string | null;
  stat_kind: StatKind | null;
  xp_amount: number;
  is_crit: boolean;
  crit_multiplier: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface RankHistoryRow {
  id: string;
  user_id: string;
  from_letter: RankLetter | null;
  from_tier: RankTier | null;
  to_letter: RankLetter;
  to_tier: RankTier;
  boss_id: string | null;
  level_at_rankup: number;
  citation: string | null;
  created_at: string;
}

export interface Briefing {
  id: string;
  user_id: string;
  kind: 'MORNING' | 'EVENING' | 'WEEKLY';
  payload: BriefingPayload;
  generated_at: string;
}

export interface BriefingPayload {
  mission?: { id: string; title: string; progress_pct: number };
  charge_mentale_pct?: number;
  focus_suggested?: string;
  time_window?: string;
  recommendation?: string;
  warning?: 'DISPERSION' | 'OVERLOAD' | 'INACTIVITY' | null;
  quests_proposed?: string[]; // ids
}
