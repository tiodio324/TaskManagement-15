// Common Types

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export type SortDirection = 'asc' | 'desc';

export interface SortParams<T> {
  field: keyof T;
  direction: SortDirection;
}

export interface FilterParams {
  search?: string;
  projectId?: string;
  sprintId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
}

export interface SelectOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
}

export interface TableColumn<T> {
  key: keyof T | string;
  title: string;
  width?: string | number;
  sortable?: boolean;
  render?: (value: unknown, row: T) => React.ReactNode;
}

export interface ModalState<T = unknown> {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view' | 'delete';
  data?: T;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}
