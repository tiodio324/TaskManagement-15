import { makeAutoObservable } from 'mobx';
import { PageId, PAGES_CONFIG, PageConfig } from '@/types';
import { authStore } from './AuthStore';

export class NavigationStore {
  currentPage: PageId = 'home';
  previousPage: PageId | null = null;
  sidebarOpen = true;
  mobileMenuOpen = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.loadNavigationState();
  }

  // Get current page config
  get currentPageConfig(): PageConfig {
    return PAGES_CONFIG[this.currentPage];
  }

  // Get page title
  get pageTitle(): string {
    return this.currentPageConfig.title;
  }

  // Get breadcrumbs
  get breadcrumbs(): PageConfig[] {
    const crumbs: PageConfig[] = [];
    let current = this.currentPageConfig;

    while (current) {
      crumbs.unshift(current);
      if (current.parentId) {
        current = PAGES_CONFIG[current.parentId];
      } else {
        break;
      }
    }

    return crumbs;
  }

  // Get navigation items (visible in sidebar)
  get navigationItems(): PageConfig[] {
    return Object.values(PAGES_CONFIG).filter(page => {
      if (!page.showInNav) return false;
      
      // Check role requirements
      if (page.requiredRole) {
        return authStore.hasRole(page.requiredRole);
      }
      
      return true;
    });
  }

  // Check if page is accessible
  canAccessPage = (pageId: PageId): boolean => {
    const page = PAGES_CONFIG[pageId];
    
    if (!page.requiresAuth) return true;
    if (!authStore.isAuthenticated) return false;
    if (page.requiredRole) {
      return authStore.hasRole(page.requiredRole);
    }
    
    return true;
  };

  // Navigate to page
  navigate = (pageId: PageId): void => {
    if (!this.canAccessPage(pageId)) {
      // If can't access, show login modal or stay
      if (PAGES_CONFIG[pageId].requiresAuth && !authStore.isAuthenticated) {
        authStore.openLoginModal();
      }
      return;
    }

    this.previousPage = this.currentPage;
    this.currentPage = pageId;
    this.mobileMenuOpen = false;
    this.saveNavigationState();
  };

  // Go back to previous page
  goBack = (): void => {
    if (this.previousPage && this.canAccessPage(this.previousPage)) {
      this.currentPage = this.previousPage;
      this.previousPage = null;
    } else {
      this.navigate('home');
    }
  };

  // Toggle sidebar
  toggleSidebar = (): void => {
    this.sidebarOpen = !this.sidebarOpen;
  };

  // Toggle mobile menu
  toggleMobileMenu = (): void => {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  };

  // Close mobile menu
  closeMobileMenu = (): void => {
    this.mobileMenuOpen = false;
  };

  // Open sidebar
  openSidebar = (): void => {
    this.sidebarOpen = true;
  };

  // Close sidebar
  closeSidebar = (): void => {
    this.sidebarOpen = false;
  };

  // Check if page is active
  isPageActive = (pageId: PageId): boolean => {
    return this.currentPage === pageId;
  };

  // Load navigation state from storage
  private loadNavigationState = (): void => {
    try {
      const savedPage = sessionStorage.getItem('current_page');
      if (savedPage && PAGES_CONFIG[savedPage as PageId]) {
        const pageId = savedPage as PageId;
        if (this.canAccessPage(pageId)) {
          this.currentPage = pageId;
        }
      }

      const sidebarState = localStorage.getItem('sidebar_open');
      if (sidebarState !== null) {
        this.sidebarOpen = sidebarState === 'true';
      }
    } catch (error) {
      console.error('Failed to load navigation state:', error);
    }
  };

  // Save navigation state to storage
  private saveNavigationState = (): void => {
    try {
      sessionStorage.setItem('current_page', this.currentPage);
      localStorage.setItem('sidebar_open', String(this.sidebarOpen));
    } catch (error) {
      console.error('Failed to save navigation state:', error);
    }
  };
}

// Singleton instance
export const navigationStore = new NavigationStore();
