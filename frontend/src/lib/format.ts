export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(value),
  );
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) return "";
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function clockTime(runTime: string): string {
  return runTime.slice(0, 5);
}

export function period(start: string | null, end: string | null): string {
  if (!start && !end) return "";
  return `${start ?? ""} to ${end ?? "present"}`;
}

export const SOURCE_NAMES: Record<string, string> = {
  remotive: "Remotive",
  himalayas: "Himalayas",
  weworkremotely: "We Work Remotely",
  remoteok: "Remote OK",
  manual: "your own link",
};

export const STATUS_LABELS: Record<string, string> = {
  new: "New",
  reviewed: "Reviewed",
  applied: "Applied",
  interviewing: "Interviewing",
  closed: "Closed",
  dismissed: "Dismissed",
};
