/**
 * User Preferences and Settings Management
 * Uses idb-keyval for lightweight key-value storage
 */

import { get, set, del, clear, keys } from 'idb-keyval';

export interface UserPreferences {
  // Display settings
  theme: 'light' | 'dark' | 'system';
  currency: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  language: string;
  
  // App behavior
  defaultCategory: string;
  defaultPaymentMethod: 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'other';
  autoSaveReceipts: boolean;
  compressImages: boolean;
  generateThumbnails: boolean;
  
  // Privacy and security
  requireAuth: boolean;
  autoLockTimeout: number; // minutes
  biometricAuth: boolean;
  
  // Notifications
  notificationsEnabled: boolean;
  budgetAlerts: boolean;
  syncNotifications: boolean;
  
  // Backup and sync
  autoBackup: boolean;
  backupFrequency: 'daily' | 'weekly' | 'monthly';
  cloudSyncEnabled: boolean;
  cloudProvider?: 'dropbox' | 'googledrive' | 'onedrive';
  
  // Advanced
  debugMode: boolean;
  analyticsEnabled: boolean;
  crashReporting: boolean;
}

export interface AppState {
  // UI state
  lastViewedPage: string;
  sidebarCollapsed: boolean;
  selectedDateRange: {
    start: Date;
    end: Date;
  };
  
  // Onboarding
  hasCompletedOnboarding: boolean;
  lastOnboardingStep: number;
  
  // Tutorial
  tutorialCompleted: boolean;
  tutorialStep: number;
  
  // Performance
  lastCleanupDate: Date;
  lastBackupDate: Date;
  
  // Statistics
  appLaunchCount: number;
  lastLaunchDate: Date;
  totalExpensesCreated: number;
}

const PREFERENCES_KEY = 'user_preferences';
const APP_STATE_KEY = 'app_state';

// Default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  // Display settings
  theme: 'system',
  currency: 'USD',
  dateFormat: 'MM/dd/yyyy',
  timeFormat: '12h',
  language: 'en',
  
  // App behavior
  defaultCategory: 'Other',
  defaultPaymentMethod: 'card',
  autoSaveReceipts: true,
  compressImages: true,
  generateThumbnails: true,
  
  // Privacy and security
  requireAuth: false,
  autoLockTimeout: 5,
  biometricAuth: false,
  
  // Notifications
  notificationsEnabled: true,
  budgetAlerts: true,
  syncNotifications: true,
  
  // Backup and sync
  autoBackup: true,
  backupFrequency: 'weekly',
  cloudSyncEnabled: false,
  
  // Advanced
  debugMode: false,
  analyticsEnabled: true,
  crashReporting: true,
};

// Default app state
const DEFAULT_APP_STATE: AppState = {
  // UI state
  lastViewedPage: '/',
  sidebarCollapsed: false,
  selectedDateRange: {
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    end: new Date(),
  },
  
  // Onboarding
  hasCompletedOnboarding: false,
  lastOnboardingStep: 0,
  
  // Tutorial
  tutorialCompleted: false,
  tutorialStep: 0,
  
  // Performance
  lastCleanupDate: new Date(),
  lastBackupDate: new Date(),
  
  // Statistics
  appLaunchCount: 0,
  lastLaunchDate: new Date(),
  totalExpensesCreated: 0,
};

class PreferencesManager {
  private preferences: UserPreferences | null = null;
  private appState: AppState | null = null;
  private listeners = new Map<string, Set<(value: any) => void>>();

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Load preferences
      this.preferences = await this.loadPreferences();
      this.appState = await this.loadAppState();
      
      // Update app launch statistics
      await this.updateLaunchStats();
      
      console.log('Preferences manager initialized');
    } catch (error) {
      console.error('Failed to initialize preferences manager:', error);
      this.preferences = DEFAULT_PREFERENCES;
      this.appState = DEFAULT_APP_STATE;
    }
  }

  private async loadPreferences(): Promise<UserPreferences> {
    try {
      const stored = await get(PREFERENCES_KEY);
      return stored ? { ...DEFAULT_PREFERENCES, ...stored } : DEFAULT_PREFERENCES;
    } catch (error) {
      console.error('Failed to load preferences:', error);
      return DEFAULT_PREFERENCES;
    }
  }

  private async loadAppState(): Promise<AppState> {
    try {
      const stored = await get(APP_STATE_KEY);
      if (stored) {
        // Convert date strings back to Date objects
        if (stored.selectedDateRange) {
          stored.selectedDateRange.start = new Date(stored.selectedDateRange.start);
          stored.selectedDateRange.end = new Date(stored.selectedDateRange.end);
        }
        if (stored.lastCleanupDate) stored.lastCleanupDate = new Date(stored.lastCleanupDate);
        if (stored.lastBackupDate) stored.lastBackupDate = new Date(stored.lastBackupDate);
        if (stored.lastLaunchDate) stored.lastLaunchDate = new Date(stored.lastLaunchDate);
        
        return { ...DEFAULT_APP_STATE, ...stored };
      }
      return DEFAULT_APP_STATE;
    } catch (error) {
      console.error('Failed to load app state:', error);
      return DEFAULT_APP_STATE;
    }
  }

  private async updateLaunchStats(): Promise<void> {
    if (!this.appState) return;

    this.appState.appLaunchCount += 1;
    this.appState.lastLaunchDate = new Date();
    
    await this.saveAppState();
  }

  // Preferences methods
  async getPreferences(): Promise<UserPreferences> {
    if (!this.preferences) {
      this.preferences = await this.loadPreferences();
    }
    return { ...this.preferences };
  }

  async getPreference<K extends keyof UserPreferences>(key: K): Promise<UserPreferences[K]> {
    const prefs = await this.getPreferences();
    return prefs[key];
  }

  async setPreference<K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ): Promise<void> {
    if (!this.preferences) {
      this.preferences = await this.loadPreferences();
    }

    this.preferences[key] = value;
    await this.savePreferences();
    
    // Notify listeners
    this.emit(`preference:${key}`, value);
    this.emit('preferences:changed', this.preferences);
  }

  async updatePreferences(updates: Partial<UserPreferences>): Promise<void> {
    if (!this.preferences) {
      this.preferences = await this.loadPreferences();
    }

    Object.assign(this.preferences, updates);
    await this.savePreferences();
    
    // Notify listeners
    Object.keys(updates).forEach(key => {
      this.emit(`preference:${key}`, updates[key as keyof UserPreferences]);
    });
    this.emit('preferences:changed', this.preferences);
  }

  private async savePreferences(): Promise<void> {
    if (!this.preferences) return;
    
    try {
      await set(PREFERENCES_KEY, this.preferences);
    } catch (error) {
      console.error('Failed to save preferences:', error);
      throw error;
    }
  }

  // App state methods
  async getAppState(): Promise<AppState> {
    if (!this.appState) {
      this.appState = await this.loadAppState();
    }
    return { ...this.appState };
  }

  async getAppStateValue<K extends keyof AppState>(key: K): Promise<AppState[K]> {
    const state = await this.getAppState();
    return state[key];
  }

  async setAppStateValue<K extends keyof AppState>(
    key: K,
    value: AppState[K]
  ): Promise<void> {
    if (!this.appState) {
      this.appState = await this.loadAppState();
    }

    this.appState[key] = value;
    await this.saveAppState();
    
    // Notify listeners
    this.emit(`appState:${key}`, value);
    this.emit('appState:changed', this.appState);
  }

  async updateAppState(updates: Partial<AppState>): Promise<void> {
    if (!this.appState) {
      this.appState = await this.loadAppState();
    }

    Object.assign(this.appState, updates);
    await this.saveAppState();
    
    // Notify listeners
    Object.keys(updates).forEach(key => {
      this.emit(`appState:${key}`, updates[key as keyof AppState]);
    });
    this.emit('appState:changed', this.appState);
  }

  private async saveAppState(): Promise<void> {
    if (!this.appState) return;
    
    try {
      await set(APP_STATE_KEY, this.appState);
    } catch (error) {
      console.error('Failed to save app state:', error);
      throw error;
    }
  }

  // Utility methods
  async resetPreferences(): Promise<void> {
    this.preferences = { ...DEFAULT_PREFERENCES };
    await this.savePreferences();
    this.emit('preferences:reset', this.preferences);
  }

  async resetAppState(): Promise<void> {
    this.appState = { ...DEFAULT_APP_STATE };
    await this.saveAppState();
    this.emit('appState:reset', this.appState);
  }

  async exportData(): Promise<{
    preferences: UserPreferences;
    appState: AppState;
    exportDate: Date;
  }> {
    return {
      preferences: await this.getPreferences(),
      appState: await this.getAppState(),
      exportDate: new Date(),
    };
  }

  async importData(data: {
    preferences?: Partial<UserPreferences>;
    appState?: Partial<AppState>;
  }): Promise<void> {
    if (data.preferences) {
      await this.updatePreferences(data.preferences);
    }
    
    if (data.appState) {
      await this.updateAppState(data.appState);
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await clear();
      this.preferences = { ...DEFAULT_PREFERENCES };
      this.appState = { ...DEFAULT_APP_STATE };
      
      this.emit('data:cleared');
    } catch (error) {
      console.error('Failed to clear preferences data:', error);
      throw error;
    }
  }

  // Event system
  on(event: string, callback: (value: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (value: any) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  // Convenience methods for common operations
  async isDarkMode(): Promise<boolean> {
    const theme = await this.getPreference('theme');
    
    if (theme === 'dark') return true;
    if (theme === 'light') return false;
    
    // System preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  async getCurrencySymbol(): Promise<string> {
    const currency = await this.getPreference('currency');
    
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CAD: 'C$',
      AUD: 'A$',
      CHF: 'CHF',
      CNY: '¥',
      INR: '₹',
      BRL: 'R$',
    };
    
    return symbols[currency] || currency;
  }

  async formatCurrency(amount: number): Promise<string> {
    const currency = await this.getPreference('currency');
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      }).format(amount);
    } catch (error) {
      const symbol = await this.getCurrencySymbol();
      return `${symbol}${amount.toFixed(2)}`;
    }
  }

  async formatDate(date: Date): Promise<string> {
    const format = await this.getPreference('dateFormat');
    
    try {
      const options: Intl.DateTimeFormatOptions = {};
      
      if (format.includes('MM')) {
        options.month = format.includes('MMM') ? 'short' : '2-digit';
      }
      if (format.includes('dd')) {
        options.day = '2-digit';
      }
      if (format.includes('yyyy')) {
        options.year = 'numeric';
      }
      
      return new Intl.DateTimeFormat('en-US', options).format(date);
    } catch (error) {
      return date.toLocaleDateString();
    }
  }

  async formatTime(date: Date): Promise<string> {
    const format = await this.getPreference('timeFormat');
    
    return date.toLocaleTimeString('en-US', {
      hour12: format === '12h',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Storage information
  async getStorageUsage(): Promise<{
    preferences: number;
    appState: number;
    total: number;
  }> {
    try {
      const allKeys = await keys();
      let preferencesSize = 0;
      let appStateSize = 0;
      
      for (const key of allKeys) {
        const value = await get(key);
        const size = JSON.stringify(value).length * 2; // Rough estimate
        
        if (key === PREFERENCES_KEY) {
          preferencesSize = size;
        } else if (key === APP_STATE_KEY) {
          appStateSize = size;
        }
      }
      
      return {
        preferences: preferencesSize,
        appState: appStateSize,
        total: preferencesSize + appStateSize,
      };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { preferences: 0, appState: 0, total: 0 };
    }
  }
}

// Singleton instance
export const preferences = new PreferencesManager();

// Utility functions
export const PreferencesUtils = {
  /**
   * Get available currencies
   */
  getAvailableCurrencies(): Array<{ code: string; name: string; symbol: string }> {
    return [
      { code: 'USD', name: 'US Dollar', symbol: '$' },
      { code: 'EUR', name: 'Euro', symbol: '€' },
      { code: 'GBP', name: 'British Pound', symbol: '£' },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
      { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
    ];
  },

  /**
   * Get available date formats
   */
  getAvailableDateFormats(): Array<{ format: string; example: string }> {
    const now = new Date();
    return [
      { format: 'MM/dd/yyyy', example: now.toLocaleDateString('en-US') },
      { format: 'dd/MM/yyyy', example: now.toLocaleDateString('en-GB') },
      { format: 'yyyy-MM-dd', example: now.toISOString().split('T')[0] },
      { format: 'MMM dd, yyyy', example: now.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) },
    ];
  },

  /**
   * Get available languages
   */
  getAvailableLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Español' },
      { code: 'fr', name: 'Français' },
      { code: 'de', name: 'Deutsch' },
      { code: 'it', name: 'Italiano' },
      { code: 'pt', name: 'Português' },
      { code: 'ja', name: '日本語' },
      { code: 'zh', name: '中文' },
    ];
  },
};

export default preferences;
