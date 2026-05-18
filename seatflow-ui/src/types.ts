export interface BehaviorRecord {
  id: string;
  type: 'bonus' | 'penalty' | 'info' | 'critical';
  description: string;
  score: number;
  timestamp: number;
}

export interface Student {
  id: string;
  fullName: string;
  shortName: string;
  studentCode?: string;
  currentSeatAssignedTimestamp: number | null;
  parentPhone?: string;
  address?: string;
  weight?: string;
  height?: string;
  isNearsighted?: boolean;
  isSpecialNeeds?: boolean;
  avatarUrl?: string;
  behaviorRecords: BehaviorRecord[];
}

export type Table = Student[];
export type Row = Table[];
export type SeatingChart = Row[];

export interface SeatingHistoryEntry {
  id: number;
  snapshot: (string | null)[][][]; // [row][col][seat] = studentId | null
  rows_count: number;
  cols_count: number;
  created_at: number;
  note?: string;
}

export interface Classroom {
  id: number;
  name: string;
  grade: string | null;
  school_year: string | null;
  created_at: number;
}

export type ViewMode = '2d' | '3d';
export type GroupArrangement = 'horizontal' | 'vertical' | 'cluster';
export type ActiveTab = 'chart' | 'priority' | 'manager';
export type ArrangementMode = 'automatic' | 'manual';

export interface GroupSettings {
  enabled: boolean;
  groupSizes: number[];
  arrangement: GroupArrangement;
}

export type Group = {
  rowIndex: number;
  colIndex: number;
}[];
