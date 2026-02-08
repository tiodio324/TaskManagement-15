// Navigation Types

export type PageId = 'home' | 'tasks' | 'projects' | 'sprints' | 'admin' | 'admin-tasks' | 'admin-projects';

export interface PageConfig {
  id: PageId;
  title: string;
  icon: string;
  requiresAuth: boolean;
  requiredRole?: 'developer' | 'admin';
  showInNav: boolean;
  parentId?: PageId;
}

export const PAGES_CONFIG: Record<PageId, PageConfig> = {
  home: { id: 'home', title: 'Главная', icon: 'home', requiresAuth: false, showInNav: true },
  tasks: { id: 'tasks', title: 'Задачи', icon: 'check-square', requiresAuth: false, showInNav: true },
  projects: { id: 'projects', title: 'Проекты', icon: 'folder', requiresAuth: false, showInNav: true },
  sprints: { id: 'sprints', title: 'Спринты', icon: 'zap', requiresAuth: false, showInNav: true },
  admin: { id: 'admin', title: 'Управление', icon: 'settings', requiresAuth: true, requiredRole: 'admin', showInNav: true },
  'admin-tasks': { id: 'admin-tasks', title: 'Задачи', icon: 'check-square', requiresAuth: true, requiredRole: 'admin', showInNav: false, parentId: 'admin' },
  'admin-projects': { id: 'admin-projects', title: 'Проекты', icon: 'folder', requiresAuth: true, requiredRole: 'admin', showInNav: false, parentId: 'admin' },
};
