"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type {
  ListResponse,
  Project,
  ProjectBom,
  ProjectCosting,
  ProjectEstimate,
  ProjectMaterialUsage,
} from "@/types/project";

type ListParams = {
  search?: string;
  filter?: string;
  status?: string;
  projectType?: string;
  projectId?: number | string;
  page?: number;
  limit?: number;
};

function buildQuery(params: ListParams = {}) {
  const query = new URLSearchParams({ page: String(params.page ?? 1), limit: String(params.limit ?? 10) });
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "" && key !== "page" && key !== "limit") query.set(key, String(value));
  });
  return query.toString();
}

export async function fetchProjects(params: ListParams = {}) {
  return apiRequest<ListResponse<Project>>(`/projects?${buildQuery(params)}`);
}

export async function createProject(payload: Record<string, unknown>) {
  return apiRequest<Project>("/projects", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateProject(id: number, payload: Record<string, unknown>) {
  return apiRequest<Project>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function deleteProject(id: number) {
  return apiRequest<Project>(`/projects/${id}`, { method: "DELETE" });
}

export async function fetchProjectEstimates(params: ListParams = {}) {
  return apiRequest<ListResponse<ProjectEstimate>>(`/project-estimates?${buildQuery(params)}`);
}

export async function createProjectEstimate(payload: Record<string, unknown>) {
  return apiRequest<ProjectEstimate>("/project-estimates", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateProjectEstimate(id: number, payload: Record<string, unknown>) {
  return apiRequest<ProjectEstimate>(`/project-estimates/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function projectEstimateAction(id: number, action: "approve" | "reject") {
  return apiRequest<ProjectEstimate>(`/project-estimates/${id}/${action}`, { method: "POST" });
}

export async function deleteProjectEstimate(id: number) {
  return apiRequest<ProjectEstimate>(`/project-estimates/${id}`, { method: "DELETE" });
}

export async function fetchProjectBoms(params: ListParams = {}) {
  return apiRequest<ListResponse<ProjectBom>>(`/project-boms?${buildQuery(params)}`);
}

export async function createProjectBom(payload: Record<string, unknown>) {
  return apiRequest<ProjectBom>("/project-boms", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateProjectBom(id: number, payload: Record<string, unknown>) {
  return apiRequest<ProjectBom>(`/project-boms/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function projectBomAction(id: number, action: "approve" | "issue") {
  return apiRequest<ProjectBom>(`/project-boms/${id}/${action}`, { method: "POST" });
}

export async function deleteProjectBom(id: number) {
  return apiRequest<ProjectBom>(`/project-boms/${id}`, { method: "DELETE" });
}

export async function fetchProjectMaterialUsages(params: ListParams = {}) {
  return apiRequest<ListResponse<ProjectMaterialUsage>>(`/project-material-usages?${buildQuery(params)}`);
}

export async function createProjectMaterialUsage(payload: Record<string, unknown>) {
  return apiRequest<ProjectMaterialUsage>("/project-material-usages", { method: "POST", body: JSON.stringify(payload) });
}

export async function fetchProjectCostings(params: ListParams = {}) {
  return apiRequest<ListResponse<ProjectCosting>>(`/project-costings?${buildQuery(params)}`);
}

export async function createProjectCosting(payload: Record<string, unknown>) {
  return apiRequest<ProjectCosting>("/project-costings", { method: "POST", body: JSON.stringify(payload) });
}

export async function updateProjectCosting(id: number, payload: Record<string, unknown>) {
  return apiRequest<ProjectCosting>(`/project-costings/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export async function finalizeProjectCosting(id: number) {
  return apiRequest<ProjectCosting>(`/project-costings/${id}/finalize`, { method: "POST" });
}

export async function deleteProjectCosting(id: number) {
  return apiRequest<ProjectCosting>(`/project-costings/${id}`, { method: "DELETE" });
}

export function useProjectList<T>(loader: (params: ListParams) => Promise<ListResponse<T>>, params: ListParams, errorMessage: string) {
  const [data, setData] = useState<ListResponse<T>>({ items: [], meta: { total: 0, page: 1, limit: 10 } });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await loader(params));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : errorMessage);
    } finally {
      setLoading(false);
    }
  }, [loader, errorMessage, JSON.stringify(params)]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
