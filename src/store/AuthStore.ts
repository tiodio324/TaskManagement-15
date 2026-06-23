import { makeAutoObservable } from 'mobx';
import { User, UserRole, ROLE_PERMISSIONS, RolePermissions } from '@/types';

// ─── Ключи хранилища ────────────────────────────────────────────────────────
const AUTH_STORAGE_KEY    = 'task_management_auth';
const SESSION_EXPIRY_KEY  = 'task_management_session_expiry';
const USERS_STORAGE_KEY   = 'task_management_users';
const SESSION_DURATION    = 24 * 60 * 60 * 1000; // 24 часа

// ─── Учётные данные администратора (хранятся на клиенте, как было изначально) ─
const ADMIN_LOGIN    = 'admin';
const ADMIN_PASSWORD = 'admin2026-tasks'; // ← оригинальный пароль сохранён

// ─── Типы ───────────────────────────────────────────────────────────────────
export interface RegisteredUser {
  id:           string;
  name:         string;
  email:        string;
  passwordHash: string; // base64(encodeURIComponent(password))
  role:         UserRole;
  createdAt:    number;
}

export type AuthMode = 'login' | 'register';

// ─── Store ──────────────────────────────────────────────────────────────────
export class AuthStore {
  private _user: User = { role: 'viewer' };

  loginModalOpen   = false;
  loginError:    string | null = null;
  registerError: string | null = null;
  isLoading      = false;
  authMode: AuthMode = 'login';

  // Реактивный кеш зарегистрированных пользователей.
  // makeAutoObservable превращает его в observable-массив,
  // поэтому все геттеры в DataStore, которые его читают,
  // автоматически перерисовываются при изменениях.
  registeredUsersCache: RegisteredUser[] = [];

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.loadAuthState();
    this.registeredUsersCache = this.getRegisteredUsers(); // начальная загрузка кеша
  }

  // ── Геттеры ────────────────────────────────────────────────────────────────
  get user():            User            { return this._user; }
  get isAuthenticated(): boolean         { return this._user.role !== 'viewer'; }
  get isDeveloper():     boolean         { return this._user.role === 'developer' || this._user.role === 'admin'; }
  get isAdmin():         boolean         { return this._user.role === 'admin'; }
  get permissions():     RolePermissions { return ROLE_PERMISSIONS[this._user.role]; }
  get currentRole():     UserRole        { return this._user.role; }

  canViewTasks      = (): boolean => this.permissions.canViewTasks;
  canViewProjects   = (): boolean => this.permissions.canViewProjects;
  canViewSprints    = (): boolean => this.permissions.canViewSprints;
  canCreateTasks    = (): boolean => this.permissions.canCreateTasks;
  canEditTasks      = (): boolean => this.permissions.canEditTasks;
  canManageProjects = (): boolean => this.permissions.canManageProjects;
  canManageSprints  = (): boolean => this.permissions.canManageSprints;
  canManageMembers  = (): boolean => this.permissions.canManageMembers;
  canAccessAdmin    = (): boolean => this.permissions.canAccessAdmin;

  hasRole = (r: UserRole): boolean => {
    const hierarchy: Record<UserRole, number> = { viewer: 0, developer: 1, admin: 2 };
    return hierarchy[this._user.role] >= hierarchy[r];
  };

  // ── Переключение режима модалки (логин / регистрация) ────────────────────
  setAuthMode = (mode: AuthMode): void => {
    this.authMode     = mode;
    this.loginError   = null;
    this.registerError = null;
  };

  // ── Работа с зарегистрированными пользователями (localStorage) ───────────
  private getRegisteredUsers = (): RegisteredUser[] => {
    try {
      const data = localStorage.getItem(USERS_STORAGE_KEY);
      return data ? (JSON.parse(data) as RegisteredUser[]) : [];
    } catch {
      return [];
    }
  };

  private saveRegisteredUsers = (users: RegisteredUser[]): void => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    this.registeredUsersCache = [...users]; // синхронизируем MobX-кеш → триггер ре-рендера
  };

  // ── Публичный доступ к зарегистрированным пользователям ─────────────────
  // DataStore читает этот геттер и реагирует на изменения через registeredUsersCache
  get registeredUsers(): RegisteredUser[] {
    return this.registeredUsersCache;
  }

  // Удаление зарегистрированного пользователя (только для администратора)
  deleteRegisteredUser = (userId: string): boolean => {
    if (!this.isAdmin) return false;
    const users = this.getRegisteredUsers();
    const filtered = users.filter(u => u.id !== userId);
    if (filtered.length === users.length) return false; // не нашли — ничего не делаем
    this.saveRegisteredUsers(filtered);
    // Если удалённый пользователь сейчас залогинен — выходим
    if (this._user.id === userId) this.logout();
    return true;
  };

  // ── Хэширование пароля (base64; достаточно для клиентского хранилища) ────
  private hashPassword = (password: string): string =>
    btoa(encodeURIComponent(password));

  private verifyPassword = (password: string, hash: string): boolean =>
    this.hashPassword(password) === hash;

  // ── Сессия ────────────────────────────────────────────────────────────────
  private loadAuthState = (): void => {
    try {
      const s = localStorage.getItem(AUTH_STORAGE_KEY);
      const e = localStorage.getItem(SESSION_EXPIRY_KEY);
      if (s && e) {
        const a = JSON.parse(s) as User;
        if (Date.now() < parseInt(e, 10) && a.role !== 'viewer') {
          this._user = { role: a.role, id: a.id, name: a.name, email: a.email };
        } else {
          this.clearAuthStorage();
        }
      }
    } catch {
      this.clearAuthStorage();
    }
  };

  private saveAuthState = (): void => {
    try {
      if (this._user.role !== 'viewer') {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
          role:  this._user.role,
          id:    this._user.id,
          name:  this._user.name,
          email: this._user.email,
        }));
        localStorage.setItem(SESSION_EXPIRY_KEY, String(Date.now() + SESSION_DURATION));
      } else {
        this.clearAuthStorage();
      }
    } catch (err) {
      console.error('Failed to save auth state:', err);
    }
  };

  private clearAuthStorage = (): void => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
  };

  // ── Модалка ───────────────────────────────────────────────────────────────
  openLoginModal = (): void => {
    this.loginModalOpen  = true;
    this.loginError      = null;
    this.registerError   = null;
    this.authMode        = 'login';
  };

  closeLoginModal = (): void => {
    this.loginModalOpen  = false;
    this.loginError      = null;
    this.registerError   = null;
    this.isLoading       = false;
  };

  // ── Вход ─────────────────────────────────────────────────────────────────
  /**
   * @param emailOrLogin  Для обычных пользователей — email.
   *                      Для администратора — строка 'admin'.
   * @param password      Пароль
   */
  login = async (emailOrLogin: string, password: string): Promise<boolean> => {
    this.isLoading  = true;
    this.loginError = null;

    try {
      await new Promise(r => setTimeout(r, 400)); // имитация задержки сети

      // ── Вход администратора ──────────────────────────────────────────────
      if (emailOrLogin.toLowerCase() === ADMIN_LOGIN) {
        if (password === ADMIN_PASSWORD) {
          this._user = { role: 'admin', name: 'Администратор' };
          this.saveAuthState();
          this.closeLoginModal();
          return true;
        }
        this.loginError = 'Неверный пароль администратора';
        return false;
      }

      // ── Вход зарегистрированного пользователя ────────────────────────────
      const users = this.getRegisteredUsers();
      const found = users.find(u => u.email.toLowerCase() === emailOrLogin.toLowerCase());

      if (!found) {
        this.loginError = 'Пользователь с таким email не найден';
        return false;
      }
      if (!this.verifyPassword(password, found.passwordHash)) {
        this.loginError = 'Неверный пароль';
        return false;
      }

      this._user = { role: found.role, id: found.id, name: found.name, email: found.email };
      this.saveAuthState();
      this.closeLoginModal();
      return true;
    } catch (err) {
      this.loginError = 'Ошибка авторизации';
      console.error('Login error:', err);
      return false;
    } finally {
      this.isLoading = false;
    }
  };

  // ── Регистрация ───────────────────────────────────────────────────────────
  register = async (name: string, email: string, password: string): Promise<boolean> => {
    this.isLoading     = true;
    this.registerError = null;

    try {
      await new Promise(r => setTimeout(r, 400));

      // Нельзя использовать зарезервированный логин 'admin'
      if (email.toLowerCase() === ADMIN_LOGIN) {
        this.registerError = 'Этот email недоступен для регистрации';
        return false;
      }

      const users = this.getRegisteredUsers();
      const duplicate = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (duplicate) {
        this.registerError = 'Пользователь с таким email уже существует';
        return false;
      }

      const newUser: RegisteredUser = {
        id:           `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        name:         name.trim(),
        email:        email.trim().toLowerCase(),
        passwordHash: this.hashPassword(password),
        role:         'developer', // все новые пользователи — разработчики
        createdAt:    Date.now(),
      };

      this.saveRegisteredUsers([...users, newUser]);
      this._user = { role: newUser.role, id: newUser.id, name: newUser.name, email: newUser.email };
      this.saveAuthState();
      this.closeLoginModal();
      return true;
    } catch (err) {
      this.registerError = 'Ошибка регистрации';
      console.error('Register error:', err);
      return false;
    } finally {
      this.isLoading = false;
    }
  };

  // ── Выход ─────────────────────────────────────────────────────────────────
  logout = (): void => {
    this._user         = { role: 'viewer' };
    this.loginError    = null;
    this.registerError = null;
    this.clearAuthStorage();
  };

  clearError = (): void => {
    this.loginError    = null;
    this.registerError = null;
  };
}

export const authStore = new AuthStore();
