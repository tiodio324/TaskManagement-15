import { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { authStore } from '@/store';
import { Modal, Button, Input } from '@/components/UI';
import styles from './LoginModal.module.scss';

// ─── Локальные типы ──────────────────────────────────────────────────────────
interface LoginForm {
  emailOrLogin: string;
  password:     string;
}

interface RegisterForm {
  name:            string;
  email:           string;
  password:        string;
  confirmPassword: string;
}

interface FieldErrors {
  emailOrLogin?:   string;
  name?:           string;
  email?:          string;
  password?:       string;
  confirmPassword?: string;
}

// ─── Валидация ───────────────────────────────────────────────────────────────
const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function validateLogin(form: LoginForm): FieldErrors {
  const errors: FieldErrors = {};
  const login = form.emailOrLogin.trim();

  if (!login) {
    errors.emailOrLogin = 'Email или логин обязателен';
  } else if (login.toLowerCase() !== 'admin' && !isValidEmail(login)) {
    errors.emailOrLogin = 'Введите корректный email';
  }

  if (!form.password) {
    errors.password = 'Пароль обязателен';
  }

  return errors;
}

function validateRegister(form: RegisterForm): FieldErrors {
  const errors: FieldErrors = {};

  if (!form.name.trim()) {
    errors.name = 'Имя обязательно';
  } else if (form.name.trim().length < 2) {
    errors.name = 'Имя должно быть не менее 2 символов';
  }

  if (!form.email.trim()) {
    errors.email = 'Email обязателен';
  } else if (!isValidEmail(form.email.trim())) {
    errors.email = 'Введите корректный email';
  }

  if (!form.password) {
    errors.password = 'Пароль обязателен';
  } else if (form.password.length < 6) {
    errors.password = 'Пароль должен содержать минимум 6 символов';
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Подтвердите пароль';
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Пароли не совпадают';
  }

  return errors;
}

// ─── Начальные значения форм ─────────────────────────────────────────────────
const EMPTY_LOGIN:    LoginForm    = { emailOrLogin: '', password: '' };
const EMPTY_REGISTER: RegisterForm = { name: '', email: '', password: '', confirmPassword: '' };

// ─── Компонент ───────────────────────────────────────────────────────────────
export const LoginModal = observer(() => {
  const {
    loginModalOpen, closeLoginModal,
    login, register,
    loginError, registerError,
    isLoading, authMode, setAuthMode,
  } = authStore;

  const [loginForm,    setLoginForm]    = useState<LoginForm>(EMPTY_LOGIN);
  const [registerForm, setRegisterForm] = useState<RegisterForm>(EMPTY_REGISTER);
  const [loginErrors,  setLoginErrors]  = useState<FieldErrors>({});
  const [regErrors,    setRegErrors]    = useState<FieldErrors>({});

  // Закрытие с очисткой всех полей
  const handleClose = () => {
    closeLoginModal();
    setLoginForm(EMPTY_LOGIN);
    setRegisterForm(EMPTY_REGISTER);
    setLoginErrors({});
    setRegErrors({});
  };

  // Переключение вкладки
  const handleTabChange = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setLoginErrors({});
    setRegErrors({});
  };

  // Отправка формы входа
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateLogin(loginForm);
    setLoginErrors(errors);
    if (Object.keys(errors).length > 0) return;
    await login(loginForm.emailOrLogin.trim(), loginForm.password);
  };

  // Отправка формы регистрации
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateRegister(registerForm);
    setRegErrors(errors);
    if (Object.keys(errors).length > 0) return;
    await register(registerForm.name, registerForm.email.trim(), registerForm.password);
  };

  // ─── Рендер ──────────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={loginModalOpen}
      onClose={handleClose}
      title={authMode === 'login' ? 'Вход в систему' : 'Регистрация'}
      size="sm"
    >
      {/* Переключатель вкладок */}
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${authMode === 'login' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('login')}
        >
          Войти
        </button>
        <button
          type="button"
          className={`${styles.tab} ${authMode === 'register' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('register')}
        >
          Регистрация
        </button>
      </div>

      {/* ── ФОРМА ВХОДА ────────────────────────────────────────────────────── */}
      {authMode === 'login' && (
        <form onSubmit={handleLoginSubmit} className={styles.form} noValidate>
          <Input
            type="text"
            label="Email или логин"
            placeholder="your@email.com  (или «admin»)"
            value={loginForm.emailOrLogin}
            onChange={e => setLoginForm(f => ({ ...f, emailOrLogin: e.target.value }))}
            error={loginErrors.emailOrLogin}
            autoFocus
          />
          <Input
            type="password"
            label="Пароль"
            placeholder="Введите пароль"
            value={loginForm.password}
            onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
            error={loginErrors.password ?? loginError ?? undefined}
          />
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isLoading}
            disabled={!loginForm.emailOrLogin || !loginForm.password}
          >
            Войти
          </Button>

          <p className={styles.switchText}>
            Нет аккаунта?{' '}
            <button
              type="button"
              className={styles.switchLink}
              onClick={() => handleTabChange('register')}
            >
              Зарегистрироваться
            </button>
          </p>
        </form>
      )}

      {/* ── ФОРМА РЕГИСТРАЦИИ ──────────────────────────────────────────────── */}
      {authMode === 'register' && (
        <form onSubmit={handleRegisterSubmit} className={styles.form} noValidate>
          <Input
            type="text"
            label="Имя"
            placeholder="Иван Иванов"
            value={registerForm.name}
            onChange={e => setRegisterForm(f => ({ ...f, name: e.target.value }))}
            error={regErrors.name}
            autoFocus
          />
          <Input
            type="email"
            label="Email"
            placeholder="your@email.com"
            value={registerForm.email}
            onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
            error={regErrors.email}
          />
          <Input
            type="password"
            label="Пароль"
            placeholder="Минимум 6 символов"
            value={registerForm.password}
            onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
            error={regErrors.password}
          />
          <Input
            type="password"
            label="Подтверждение пароля"
            placeholder="Повторите пароль"
            value={registerForm.confirmPassword}
            onChange={e => setRegisterForm(f => ({ ...f, confirmPassword: e.target.value }))}
            error={regErrors.confirmPassword ?? registerError ?? undefined}
          />

          <div className={styles.roleBadge}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
            </svg>
            <span>Новый аккаунт получает роль <strong>Разработчик</strong></span>
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={isLoading}
            disabled={
              !registerForm.name ||
              !registerForm.email ||
              !registerForm.password ||
              !registerForm.confirmPassword
            }
          >
            Зарегистрироваться
          </Button>

          <p className={styles.switchText}>
            Уже есть аккаунт?{' '}
            <button
              type="button"
              className={styles.switchLink}
              onClick={() => handleTabChange('login')}
            >
              Войти
            </button>
          </p>
        </form>
      )}
    </Modal>
  );
});
