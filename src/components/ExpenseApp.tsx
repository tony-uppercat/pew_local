import { useEffect, useState } from 'react';
import { pwaService } from '@/lib/pwa';
import PWAInstallButton from '@/components/PWAInstallButton';
import PWAUpdateNotification from '@/components/PWAUpdateNotification';
import OfflineIndicator from '@/components/OfflineIndicator';
import PerformanceDashboard from '@/components/PerformanceDashboard';
import SecurityDashboard from '@/components/SecurityDashboard';
import PrivacyConsent, { ConsentBanner } from '@/components/PrivacyConsent';
import StorageWarning, { StorageIndicator } from '@/components/StorageWarning';

export default function ExpenseApp(): JSX.Element {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize PWA service
    const initializePWA = async () => {
      try {
        console.log('Starting PWA initialization...');
        await pwaService.initialize();
        console.log('PWA initialized successfully');
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize PWA:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown error');
        setIsInitialized(true); // Still show the app even if PWA features fail
      }
    };

    // Add a timeout fallback in case PWA initialization hangs
    const timeout = setTimeout(() => {
      console.warn('PWA initialization timeout, showing app anyway');
      setIsInitialized(true);
    }, 3000); // 3 seconds timeout

    initializePWA().finally(() => {
      clearTimeout(timeout);
    });
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen-safe flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading PEW...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-safe" style={{ backgroundColor: 'var(--color-background-primary)' }}>
      {/* PWA Components */}
      <PWAUpdateNotification />
      <OfflineIndicator />
      <StorageWarning />
      <PrivacyConsent />
      <ConsentBanner />
      
      {/* Header */}
      <header className="ds-card safe-top" style={{ 
        borderRadius: 0,
        borderBottom: `1px solid var(--color-neutral-medium-gray)`,
        marginBottom: 0
      }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="ds-text-2xl ds-font-bold" style={{ color: 'var(--color-neutral-black)' }}>
                  💰 PEW
                </h1>
              </div>
              <nav className="hidden md:ml-6 md:flex md:space-x-8">
                <a
                  href="#"
                  className="ds-button ds-button--accent ds-text-sm px-1 pt-1"
                  style={{ background: 'none', border: 'none', borderBottom: '2px solid var(--color-primary-accent)' }}
                >
                  Dashboard
                </a>
                <a
                  href="#"
                  className="ds-text-sm ds-font-medium px-1 pt-1"
                  style={{ color: 'var(--color-neutral-dark-gray)' }}
                >
                  Expenses
                </a>
                <a
                  href="#"
                  className="ds-text-sm ds-font-medium px-1 pt-1"
                  style={{ color: 'var(--color-neutral-dark-gray)' }}
                >
                  Reports
                </a>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Storage Indicator */}
              <StorageIndicator />
              
              {/* Theme toggle */}
              <ThemeToggle />
              
              {/* PWA Install Button */}
              <PWAInstallButton variant="minimal" />
              
              {/* Settings */}
              <button className="ds-button ds-button--icon" style={{ backgroundColor: 'var(--color-neutral-light-gray)' }}>
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-neutral-dark-gray)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="ds-grid max-w-7xl mx-auto">
        {/* Error Message */}
        {initError && (
          <div className="ds-card" style={{ 
            backgroundColor: '#FFF3CD', 
            border: '1px solid #FFECB3',
            gridColumn: '1 / -1'
          }}>
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" style={{ color: '#F57C00' }}>
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="ds-text-sm ds-font-semibold" style={{ color: '#E65100' }}>
                  PWA Features Limited
                </h3>
                <div className="mt-2 ds-text-sm" style={{ color: '#F57C00' }}>
                  <p>Some advanced features may not work properly: {initError}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Welcome Section */}
        <div className="ds-card ds-card--accent ds-card--wide">
          <div className="ds-card-header">
            <div className="ds-card-header__content">
              <div className="ds-avatar ds-avatar--large" style={{ backgroundColor: 'var(--color-neutral-black)' }}>
                <span className="ds-text-2xl">💰</span>
              </div>
              <div>
                <h2 className="ds-card-header__title ds-text-2xl">Welcome to Pocket Expense Wallet</h2>
                <p className="ds-card-header__subtitle ds-text-base" style={{ color: 'var(--color-neutral-charcoal)' }}>
                  Track your expenses offline with advanced PWA features. Your data is secure and always available.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-4">
            <button className="ds-button ds-button--primary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Expense
            </button>
            <button className="ds-button ds-button--secondary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11a9 9 0 11-18 0 9 9 0 0118 0zm-9 0a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              Scan Receipt
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="ds-card">
          <div className="ds-card-header">
            <h3 className="ds-card-header__title">Quick Stats</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="ds-stat">
              <div className="flex items-center mb-2">
                <div className="ds-avatar ds-avatar--small" style={{ backgroundColor: 'var(--color-primary-accent)' }}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--color-neutral-black)' }}>
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="ds-badge ds-badge--success ml-2">This Month</span>
              </div>
              <div className="ds-stat__value">$0.00</div>
              <div className="ds-stat__label">Monthly Total</div>
            </div>

            <div className="ds-stat">
              <div className="flex items-center mb-2">
                <div className="ds-avatar ds-avatar--small" style={{ backgroundColor: 'var(--color-neutral-light-gray)' }}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--color-neutral-dark-gray)' }}>
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="ds-badge ds-badge--neutral ml-2">All Time</span>
              </div>
              <div className="ds-stat__value">0</div>
              <div className="ds-stat__label">Total Expenses</div>
            </div>

            <div className="ds-stat">
              <div className="flex items-center mb-2">
                <div className="ds-avatar ds-avatar--small" style={{ backgroundColor: 'var(--color-neutral-medium-gray)' }}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" style={{ color: 'var(--color-neutral-dark-gray)' }}>
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="ds-badge ds-badge--neutral ml-2">Active</span>
              </div>
              <div className="ds-stat__value">0</div>
              <div className="ds-stat__label">Categories</div>
            </div>
          </div>
        </div>

        {/* Performance Dashboard */}
        <div className="ds-card">
          <PerformanceDashboard compact />
        </div>
        
        {/* Security Dashboard */}
        <div className="ds-card">
          <SecurityDashboard />
        </div>

        {/* Recent Expenses */}
        <div className="ds-card ds-card--wide">
          <div className="ds-card-header">
            <div className="ds-card-header__content">
              <div className="ds-avatar" style={{ backgroundColor: 'var(--color-primary-accent)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-neutral-black)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <h3 className="ds-card-header__title">Recent Expenses</h3>
                <p className="ds-card-header__subtitle">Your latest transactions</p>
              </div>
            </div>
            <button className="ds-button ds-button--secondary ds-text-sm">View All</button>
          </div>
          
          <div className="text-center py-12">
            <div className="ds-avatar ds-avatar--large mx-auto mb-4" style={{ backgroundColor: 'var(--color-neutral-light-gray)' }}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-neutral-dark-gray)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="ds-text-lg ds-font-semibold mb-2">No expenses yet</h3>
            <p className="ds-text-sm mb-6" style={{ color: 'var(--color-neutral-dark-gray)' }}>
              Get started by adding your first expense.
            </p>
            <button className="ds-button ds-button--accent">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Your First Expense
            </button>
          </div>
        </div>
      </main>

      {/* Bottom Safe Area */}
      <div className="safe-bottom"></div>
    </div>
  );
}

// Theme Toggle Component
function ThemeToggle(): JSX.Element {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    // Check initial theme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme as 'light' | 'dark' || (prefersDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    
    // Update theme-color meta tag
    const themeColor = newTheme === 'dark' ? '#111827' : '#f9fafb';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeColor);
  };

  return (
    <button
      onClick={toggleTheme}
      className="ds-button ds-button--icon"
      style={{ backgroundColor: 'var(--color-neutral-light-gray)' }}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-neutral-dark-gray)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      ) : (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-neutral-dark-gray)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )}
    </button>
  );
}
