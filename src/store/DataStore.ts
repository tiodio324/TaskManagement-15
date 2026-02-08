import { makeAutoObservable, runInAction } from 'mobx';
import { v4 as uuidv4 } from 'uuid';
import { 
  Task, TaskFormData,
  Project, ProjectFormData,
  Sprint, SprintFormData,
  Member, MemberFormData,
  Comment, CommentFormData,
  FilterParams 
} from '@/types';
import FirebaseService from '@/firebase';
import { authStore } from './AuthStore';

export class DataStore {
  tasks: Task[] = [];
  projects: Project[] = [];
  sprints: Sprint[] = [];
  members: Member[] = [];
  comments: Comment[] = [];

  tasksLoading = false;
  projectsLoading = false;
  sprintsLoading = false;
  membersLoading = false;

  error: string | null = null;
  filters: FilterParams = {};

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  // === COMPUTED PROPERTIES ===

  get activeTasks(): Task[] {
    return this.tasks.filter(t => t.isActive);
  }

  get activeProjects(): Project[] {
    return this.projects.filter(p => p.isActive).sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }

  get activeSprints(): Sprint[] {
    return this.sprints.filter(s => s.isActive).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }

  get activeMembers(): Member[] {
    return this.members.filter(m => m.isActive).sort((a, b) => a.lastName.localeCompare(b.lastName, 'ru'));
  }

  get filteredTasks(): Task[] {
    let result = this.activeTasks;
    
    if (this.filters.projectId) {
      result = result.filter(t => t.projectId === this.filters.projectId);
    }
    
    if (this.filters.sprintId) {
      result = result.filter(t => t.sprintId === this.filters.sprintId);
    }
    
    if (this.filters.status) {
      result = result.filter(t => t.status === this.filters.status);
    }
    
    if (this.filters.priority) {
      result = result.filter(t => t.priority === this.filters.priority);
    }
    
    if (this.filters.assigneeId) {
      result = result.filter(t => t.assigneeId === this.filters.assigneeId);
    }
    
    if (this.filters.search) {
      const search = this.filters.search.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search)
      );
    }
    
    return result;
  }

  get tasksByStatus(): Record<string, Task[]> {
    const statuses = ['backlog', 'todo', 'in_progress', 'review', 'done'];
    return statuses.reduce((acc, status) => {
      acc[status] = this.filteredTasks.filter(t => t.status === status);
      return acc;
    }, {} as Record<string, Task[]>);
  }

  get totalTasksCount(): number {
    return this.activeTasks.length;
  }

  get completedTasksCount(): number {
    return this.activeTasks.filter(t => t.status === 'done').length;
  }

  get inProgressTasksCount(): number {
    return this.activeTasks.filter(t => t.status === 'in_progress').length;
  }

  // === GET BY ID ===

  getTaskById = (id: string): Task | undefined => this.tasks.find(t => t.id === id);
  getProjectById = (id: string): Project | undefined => this.projects.find(p => p.id === id);
  getSprintById = (id: string): Sprint | undefined => this.sprints.find(s => s.id === id);
  getMemberById = (id: string): Member | undefined => this.members.find(m => m.id === id);

  getTasksForProject = (projectId: string): Task[] => this.activeTasks.filter(t => t.projectId === projectId);
  getTasksForSprint = (sprintId: string): Task[] => this.activeTasks.filter(t => t.sprintId === sprintId);
  getSprintsForProject = (projectId: string): Sprint[] => this.activeSprints.filter(s => s.projectId === projectId);
  getCommentsForTask = (taskId: string): Comment[] => this.comments.filter(c => c.taskId === taskId && c.isActive);

  // === LOAD DATA ===

  loadAllData = async (): Promise<void> => {
    await Promise.all([
      this.loadTasks(),
      this.loadProjects(),
      this.loadSprints(),
      this.loadMembers(),
      this.loadComments(),
    ]);
  };

  loadTasks = async (): Promise<void> => {
    this.tasksLoading = true;
    try {
      const data = await FirebaseService.getData<Record<string, Task>>('tasks');
      runInAction(() => { this.tasks = data ? Object.values(data) : []; this.tasksLoading = false; });
    } catch { runInAction(() => { this.error = 'Ошибка загрузки задач'; this.tasksLoading = false; }); }
  };

  loadProjects = async (): Promise<void> => {
    this.projectsLoading = true;
    try {
      const data = await FirebaseService.getData<Record<string, Project>>('projects');
      runInAction(() => { this.projects = data ? Object.values(data) : []; this.projectsLoading = false; });
    } catch { runInAction(() => { this.error = 'Ошибка загрузки проектов'; this.projectsLoading = false; }); }
  };

  loadSprints = async (): Promise<void> => {
    this.sprintsLoading = true;
    try {
      const data = await FirebaseService.getData<Record<string, Sprint>>('sprints');
      runInAction(() => { this.sprints = data ? Object.values(data) : []; this.sprintsLoading = false; });
    } catch { runInAction(() => { this.error = 'Ошибка загрузки спринтов'; this.sprintsLoading = false; }); }
  };

  loadMembers = async (): Promise<void> => {
    this.membersLoading = true;
    try {
      const data = await FirebaseService.getData<Record<string, Member>>('members');
      runInAction(() => { this.members = data ? Object.values(data) : []; this.membersLoading = false; });
    } catch { runInAction(() => { this.error = 'Ошибка загрузки участников'; this.membersLoading = false; }); }
  };

  loadComments = async (): Promise<void> => {
    try {
      const data = await FirebaseService.getData<Record<string, Comment>>('comments');
      runInAction(() => { this.comments = data ? Object.values(data) : []; });
    } catch { console.error('Error loading comments'); }
  };

  // === CRUD TASKS ===

  createTask = async (data: TaskFormData): Promise<Task | null> => {
    if (!authStore.canCreateTasks()) return null;
    const now = new Date().toISOString();
    const task: Task = { id: uuidv4(), ...data, sprintId: data.sprintId || '', assigneeId: data.assigneeId || '', dueDate: data.dueDate || '', actualHours: 0, isActive: true, createdAt: now, updatedAt: now };
    try {
      await FirebaseService.setData(`tasks/${task.id}`, task);
      runInAction(() => { this.tasks.push(task); });
      return task;
    } catch { return null; }
  };

  updateTask = async (id: string, data: Partial<TaskFormData>): Promise<boolean> => {
    if (!authStore.canEditTasks()) return false;
    const index = this.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;
    const updated: Task = { ...this.tasks[index], ...data, updatedAt: new Date().toISOString() };
    try {
      await FirebaseService.setData(`tasks/${id}`, updated);
      runInAction(() => { this.tasks[index] = updated; });
      return true;
    } catch { return false; }
  };

  deleteTask = async (id: string): Promise<boolean> => {
    if (!authStore.canEditTasks()) return false;
    const index = this.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;
    try {
      await FirebaseService.updateData(`tasks/${id}`, { isActive: false });
      runInAction(() => { this.tasks[index].isActive = false; });
      return true;
    } catch { return false; }
  };

  // === CRUD PROJECTS ===

  createProject = async (data: ProjectFormData): Promise<Project | null> => {
    if (!authStore.canManageProjects()) return null;
    const now = new Date().toISOString();
    const project: Project = { id: uuidv4(), ...data, endDate: data.endDate || '', leadId: data.leadId || '', isActive: true, createdAt: now, updatedAt: now };
    try {
      await FirebaseService.setData(`projects/${project.id}`, project);
      runInAction(() => { this.projects.push(project); });
      return project;
    } catch { return null; }
  };

  updateProject = async (id: string, data: Partial<ProjectFormData>): Promise<boolean> => {
    if (!authStore.canManageProjects()) return false;
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) return false;
    const updated: Project = { ...this.projects[index], ...data, updatedAt: new Date().toISOString() };
    try {
      await FirebaseService.setData(`projects/${id}`, updated);
      runInAction(() => { this.projects[index] = updated; });
      return true;
    } catch { return false; }
  };

  deleteProject = async (id: string): Promise<boolean> => {
    if (!authStore.canManageProjects()) return false;
    const index = this.projects.findIndex(p => p.id === id);
    if (index === -1) return false;
    try {
      await FirebaseService.updateData(`projects/${id}`, { isActive: false });
      runInAction(() => { this.projects[index].isActive = false; });
      return true;
    } catch { return false; }
  };

  // === CRUD SPRINTS ===

  createSprint = async (data: SprintFormData): Promise<Sprint | null> => {
    if (!authStore.canManageSprints()) return null;
    const now = new Date().toISOString();
    const sprint: Sprint = { id: uuidv4(), ...data, isActive: true, createdAt: now, updatedAt: now };
    try {
      await FirebaseService.setData(`sprints/${sprint.id}`, sprint);
      runInAction(() => { this.sprints.push(sprint); });
      return sprint;
    } catch { return null; }
  };

  updateSprint = async (id: string, data: Partial<SprintFormData>): Promise<boolean> => {
    if (!authStore.canManageSprints()) return false;
    const index = this.sprints.findIndex(s => s.id === id);
    if (index === -1) return false;
    const updated: Sprint = { ...this.sprints[index], ...data, updatedAt: new Date().toISOString() };
    try {
      await FirebaseService.setData(`sprints/${id}`, updated);
      runInAction(() => { this.sprints[index] = updated; });
      return true;
    } catch { return false; }
  };

  deleteSprint = async (id: string): Promise<boolean> => {
    if (!authStore.canManageSprints()) return false;
    const index = this.sprints.findIndex(s => s.id === id);
    if (index === -1) return false;
    try {
      await FirebaseService.updateData(`sprints/${id}`, { isActive: false });
      runInAction(() => { this.sprints[index].isActive = false; });
      return true;
    } catch { return false; }
  };

  // === CRUD MEMBERS ===

  createMember = async (data: MemberFormData): Promise<Member | null> => {
    if (!authStore.canManageMembers()) return null;
    const now = new Date().toISOString();
    const member: Member = { id: uuidv4(), ...data, avatarUrl: data.avatarUrl || '', isActive: true, createdAt: now, updatedAt: now };
    try {
      await FirebaseService.setData(`members/${member.id}`, member);
      runInAction(() => { this.members.push(member); });
      return member;
    } catch { return null; }
  };

  deleteMember = async (id: string): Promise<boolean> => {
    if (!authStore.canManageMembers()) return false;
    const index = this.members.findIndex(m => m.id === id);
    if (index === -1) return false;
    try {
      await FirebaseService.updateData(`members/${id}`, { isActive: false });
      runInAction(() => { this.members[index].isActive = false; });
      return true;
    } catch { return false; }
  };

  // === COMMENTS ===

  createComment = async (data: CommentFormData, authorName: string): Promise<Comment | null> => {
    const now = new Date().toISOString();
    const comment: Comment = {
      id: uuidv4(),
      ...data,
      authorId: authStore.user.id || '',
      authorName,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await FirebaseService.setData(`comments/${comment.id}`, comment);
      runInAction(() => { this.comments.push(comment); });
      return comment;
    } catch { return null; }
  };

  // === FILTERS ===

  setFilter = (key: keyof FilterParams, value: string | undefined): void => {
    this.filters = { ...this.filters, [key]: value };
  };

  clearFilters = (): void => { this.filters = {}; };
  clearError = (): void => { this.error = null; };
}

export const dataStore = new DataStore();
