// Sprint Types

export type SprintStatus = 'planning' | 'active' | 'completed';

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SprintFormData {
  projectId: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
}
