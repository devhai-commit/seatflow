const API_BASE = (import.meta.env.VITE_API_URL as string) || 'http://localhost:3001';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface BehaviorRow {
  id: string;
  student_id: string;
  type: 'bonus' | 'penalty' | 'info' | 'critical';
  description: string;
  score: number;
  timestamp: number;
}

export interface StudentRow {
  id: string;
  full_name: string;
  short_name: string | null;
  student_code: string | null;
  current_seat_assigned_timestamp: number | null; // from LEFT JOIN seating_assignments.assigned_at
  parent_phone: string | null;
  address: string | null;
  weight: string | null;
  height: string | null;
  is_nearsighted: boolean;
  is_special_needs: boolean;
  avatar_url: string | null;
  behavior_records: BehaviorRow[];
}

export const api = {
  getSettings: () =>
    request<Record<string, unknown>>('/api/settings'),

  saveSettings: (data: Record<string, unknown>) =>
    request<{ success: boolean }>('/api/settings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getStudents: () =>
    request<StudentRow[]>('/api/students'),

  syncStudents: (names: string[]) =>
    request<StudentRow[]>('/api/students/sync', {
      method: 'POST',
      body: JSON.stringify({ names }),
    }),

  addStudent: (fullName: string) =>
    request<StudentRow>('/api/students', {
      method: 'POST',
      body: JSON.stringify({ full_name: fullName }),
    }),

  deleteStudent: (id: string) =>
    request<{ success: boolean }>(`/api/students/${id}`, {
      method: 'DELETE',
    }),

  deleteStudentsBatch: (ids: string[]) =>
    request<{ success: boolean; deleted: number }>('/api/students/batch', {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    }),

  updateStudent: (id: string, data: Record<string, unknown>) =>
    request<{ success: boolean }>(`/api/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  addBehavior: (
    studentId: string,
    data: { type: 'bonus' | 'penalty' | 'info' | 'critical'; description: string; score: number; timestamp: number }
  ) =>
    request<BehaviorRow>(`/api/students/${studentId}/behavior`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteBehavior: (id: string) =>
    request<{ success: boolean }>(`/api/behavior/${id}`, {
      method: 'DELETE',
    }),

  uploadAvatar: async (studentId: string, file: File): Promise<{ avatarUrl: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await fetch(`${API_BASE}/api/students/${studentId}/avatar`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json() as Promise<{ avatarUrl: string }>;
  },

  deleteAvatar: (studentId: string) =>
    request<{ success: boolean }>(`/api/students/${studentId}/avatar`, { method: 'DELETE' }),

  getSeatingHistory: () =>
    request<import('./types').SeatingHistoryEntry[]>('/api/seating-history'),

  saveSeatingHistory: (data: {
    snapshot: (string | null)[][][];
    rows_count: number;
    cols_count: number;
    created_at: number;
    note?: string;
  }) =>
    request<{ id: number }>('/api/seating-history', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
