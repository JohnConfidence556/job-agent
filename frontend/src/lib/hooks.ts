"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api";
import type {
  HomeSummary,
  JobDetail,
  MasterCv,
  MatchRow,
  MatchStatus,
  Profile,
  RunRow,
  TailoredCv,
} from "@/lib/types";

export function useProfile() {
  return useQuery({ queryKey: ["me"], queryFn: () => api<Profile>("/me") });
}

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (changes: Partial<Profile>) =>
      api<Profile>("/me", { method: "PATCH", body: JSON.stringify(changes) }),
    onSuccess: (profile) => client.setQueryData(["me"], profile),
  });
}

export function useHome() {
  return useQuery({ queryKey: ["home"], queryFn: () => api<HomeSummary>("/home") });
}

export interface JobFilters {
  minScore?: number;
  status?: MatchStatus;
  limit?: number;
}

export function useJobs(filters: JobFilters = {}) {
  const params = new URLSearchParams();
  if (filters.minScore) params.set("min_score", String(filters.minScore));
  if (filters.status) params.set("status", filters.status);
  params.set("limit", String(filters.limit ?? 100));
  return useQuery({
    queryKey: ["jobs", filters],
    queryFn: () => api<MatchRow[]>(`/jobs?${params.toString()}`),
  });
}

export function useJob(id: string) {
  return useQuery({ queryKey: ["job", id], queryFn: () => api<JobDetail>(`/jobs/${id}`) });
}

export function useUpdateJob(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (changes: { status?: MatchStatus; notes?: string }) =>
      api(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify(changes) }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["job", id] });
      client.invalidateQueries({ queryKey: ["jobs"] });
      client.invalidateQueries({ queryKey: ["home"] });
    },
  });
}

export function useMoveJob() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: MatchStatus }) =>
      api(`/jobs/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["jobs"] });
      client.invalidateQueries({ queryKey: ["home"] });
    },
  });
}

export function useTailor(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (regenerate: boolean) =>
      api<TailoredCv>(`/jobs/${id}/tailor?regenerate=${regenerate}`, { method: "POST" }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["job", id] });
      client.invalidateQueries({ queryKey: ["home"] });
    },
  });
}

export function useMasterCv() {
  return useQuery({
    queryKey: ["master-cv"],
    queryFn: async () => {
      try {
        return (await api<{ id: string; cv: MasterCv }>("/me/cv")).cv;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
  });
}

export function useUploadCv() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api<{ version: number; cv: MasterCv }>("/me/cv", { method: "POST", body: form });
    },
    onSuccess: ({ cv }) => {
      client.setQueryData(["master-cv"], cv);
      client.invalidateQueries({ queryKey: ["home"] });
    },
  });
}

export function useLatestRun() {
  return useQuery({
    queryKey: ["latest-run"],
    queryFn: () => api<RunRow>("/search/latest"),
    refetchInterval: (query) => (query.state.data?.status === "running" ? 3000 : false),
  });
}

export function useStartSearch() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ status: string }>("/search/run", { method: "POST" }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["latest-run"] });
      setTimeout(() => client.invalidateQueries({ queryKey: ["latest-run"] }), 1500);
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: ["jobs"] });
      client.invalidateQueries({ queryKey: ["home"] });
    },
  });
}
