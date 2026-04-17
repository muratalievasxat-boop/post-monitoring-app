import { get, API_BASE_URL } from './client';

export interface RecommendationListItem {
  id: string;
  seq_no: number | null;
  record_type_normalized: string;
  cycle: string;
  sphere_normalized: string;
  proposal_text: string;
  responsible_org: string;
  due_raw: string;
  status_normalized: string;
}

export interface RecommendationDetail {
  id: string;
  seq_no: number | null;
  record_type_raw: string;
  record_type_normalized: string;
  cycle: string;
  sphere_raw: string;
  sphere_normalized: string;
  proposal_text: string;
  responsible_org: string;
  interested_orgs: string;
  completion_form: string;
  due_raw: string;
  status_raw: string;
  status_normalized: string;
  status_group: string;
  position_go_2024_2025: string;
  position_go_2026_03_27: string;
  position_adgs: string;
  changed_by: string;
  comment: string;
  status_updated_at: string;
}

export interface RecommendationFilters {
  cycles: string[];
  statuses: string[];
  spheres: string[];
  types: string[];
}

export interface RecommendationListResponse {
  rows: RecommendationListItem[];
  total: number;
}

export async function fetchRecommendationFilters() {
  return get<RecommendationFilters>('/api/recommendations/filters');
}

export async function fetchRecommendations(params: {
  q?: string;
  cycle?: string;
  status?: string;
  sphere?: string;
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v) !== '') {
      search.set(k, String(v));
    }
  });
  return get<RecommendationListResponse>(`/api/recommendations?${search.toString()}`);
}

export async function fetchRecommendationById(id: number | string) {
  return get<RecommendationDetail>(`/api/recommendations/${id}`);
}

export async function patchRecommendationStatus(
  id: number | string,
  payload: {
    status_normalized: string;
    due_raw?: string;
    position_go_2026_03_27?: string;
    position_adgs?: string;
    changed_by?: string;
    comment?: string;
  }
) {
  const res = await fetch(`${API_BASE_URL}/api/recommendations/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${res.statusText}`);
  }

  return res.json();
}
