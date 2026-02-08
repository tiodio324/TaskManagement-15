import { observer } from 'mobx-react-lite';
import { authStore, navigationStore } from '@/store';
import { Button } from '@/components/UI';
import styles from './Header.module.scss';

export const Header = observer(() => {
  const { isAuthenticated, currentRole, logout, openLoginModal } = authStore;
  const { pageTitle, toggleMobileMenu, mobileMenuOpen, navigate } = navigationStore;

  const getRoleName = (role: string): string => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'developer': return 'Разработчик';
      default: return 'Гость';
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.menuButton} onClick={toggleMobileMenu} aria-label={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileMenuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
          </svg>
        </button>
        <div className={styles.logo} onClick={() => navigate('home')} aria-label="Перейти на главную">
          <svg className={styles.logoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          <span className={styles.logoText}>Task Manager</span>
        </div>
      </div>
      <div className={styles.breadcrumb}>
        <span className={styles.breadcrumbItem}>Главная</span>
        <span className={styles.breadcrumbSeparator}>→</span>
        <h1 className={styles.title}>{pageTitle}</h1>
      </div>
      <div className={styles.right}>
        {isAuthenticated ? (
          <div className={styles.userInfo}><span className={styles.role}>{getRoleName(currentRole)}</span><Button variant="ghost" size="sm" onClick={logout} className={styles.headerButton}>Выйти</Button></div>
        ) : (
          <Button variant="secondary" size="sm" onClick={openLoginModal} className={styles.headerButton}>Войти</Button>
        )}
      </div>
    </header>
  );
});
