export type MatchStatus =
  | "new"
  | "reviewed"
  | "applied"
  | "interviewing"
  | "closed"
  | "dismissed";

export type JobType = "local" | "remote" | "international";

export interface Profile {
  id: string;
  full_name: string | null;
  target_roles: string[];
  job_types: JobType[];
  locations: string[];
  experience_level: string | null;
  salary_min: number | null;
  salary_currency: string;
  run_time: string;
  timezone: string;
  search_paused: boolean;
}

export interface FitAnalysis {
  summary?: string;
  strengths?: string[];
  gaps?: string[];
}

export interface JobCard {
  id: string;
  title: string;
  company: string;
  location_text: string | null;
  remote: boolean;
  salary_text: string | null;
  posted_at: string | null;
  source: string;
  source_url: string;
  apply_url: string;
}

export interface MatchRow {
  id: string;
  fit_score: number | null;
  fit_analysis: FitAnalysis;
  status: MatchStatus;
  applied_at: string | null;
  created_at: string;
  jobs: JobCard;
}

export interface JobFull extends JobCard {
  description: string;
  eligible_regions: string[];
  employment_type: string | null;
}

export interface MatchFull {
  id: string;
  fit_score: number | null;
  fit_analysis: FitAnalysis;
  status: MatchStatus;
  applied_at: string | null;
  notes: string | null;
  jobs: JobFull;
}

export interface TailoredBullet {
  source_id: string;
  text: string;
  rewritten: boolean;
}

export interface TailoredCv {
  id: string;
  version: number;
  created_at: string;
  validation_report: {
    fallbacks: { where: string; problems: string[] }[];
    rewritten_bullets: number;
    summary: string;
  };
  content: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    links: string[];
    summary: { text: string; source_ids: string[] } | null;
    experience: {
      source_id: string;
      company: string;
      title: string;
      location: string | null;
      start: string | null;
      end: string | null;
      bullets: TailoredBullet[];
    }[];
    education: {
      id: string;
      institution: string;
      degree: string | null;
      field: string | null;
      start: string | null;
      end: string | null;
    }[];
    projects: {
      source_id: string;
      name: string;
      description: string | null;
      technologies: string[];
      bullets: TailoredBullet[];
    }[];
    skills: { source_id: string; name: string }[];
    certifications: { id: string; name: string }[];
    gaps: string[];
  };
}

export interface JobDetail {
  match: MatchFull;
  tailored: TailoredCv | null;
}

export interface MasterCv {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  links: string[];
  summary: string | null;
  experience: {
    id: string;
    company: string;
    title: string;
    location: string | null;
    start: string | null;
    end: string | null;
    bullets: { id: string; text: string }[];
  }[];
  education: {
    id: string;
    institution: string;
    degree: string | null;
    field: string | null;
    start: string | null;
    end: string | null;
  }[];
  projects: {
    id: string;
    name: string;
    description: string | null;
    technologies: string[];
    bullets: { id: string; text: string }[];
  }[];
  skills: { id: string; name: string }[];
  certifications: { id: string; name: string }[];
}

export interface RunRow {
  id?: string;
  origin?: string;
  status: "running" | "succeeded" | "partial" | "failed" | "never";
  stats?: { pool?: number; candidates?: number; scored?: number; failures?: number };
  error?: string | null;
  started_at?: string;
  finished_at?: string | null;
}

export interface HomeSummary {
  counts: Partial<Record<MatchStatus, number>>;
  new_strong_matches: number;
  has_cv: boolean;
  last_run: RunRow | null;
  tailorings_left: number;
}
