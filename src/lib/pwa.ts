/**
 * PWA Utilities and Service Worker Management
 * Handles PWA installation, updates, and offline capabilities
 */

import { Workbox } from 'workbox-window';

interface PWAInstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAManager {
  workbox: Workbox | null;
  installPrompt: PWAInstallPrompt | null;
  isInstalled: boolean;
  isOnline: boolean;
  hasUpdate: boolean;
}

class PWAService {
  private manager: PWAManager = {
    workbox: null,
    installPrompt: null,
    isInstalled: false,
    isOnline: navigator.onLine,
    hasUpdate: false,
  };

  private listeners = new Map<string, Set<(data?: any) => void>>();

  constructor() {
    // Only initialize in browser environment
    if (typeof window !== 'undefined') {
      this.initializeEventListeners();
      this.checkInstallationStatus();
    }
  }

  /**
   * Initialize PWA service and register service worker
   */
  async initialize(): Promise<void> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported or not in browser environment');
      return;
    }

    try {
      // Wait for VitePWA to register the service worker
      // VitePWA uses registerType: 'autoUpdate' which handles registration automatically
      await this.waitForServiceWorkerRegistration();

      // Request persistent storage
      await this.requestPersistentStorage();

      this.emit('initialized', { registration: null });
    } catch (error) {
      console.error('Failed to initialize PWA:', error);
      this.emit('error', { error, type: 'initialization' });
    }
  }

  /**
   * Wait for VitePWA to register the service worker
   */
  private async waitForServiceWorkerRegistration(): Promise<void> {
    // Check if service worker is already registered
    if (navigator.serviceWorker.controller) {
      console.log('Service Worker already registered');
      return;
    }

    // Wait for service worker registration
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Service Worker registration timeout'));
      }, 10000); // 10 second timeout

      const checkRegistration = () => {
        if (navigator.serviceWorker.controller) {
          clearTimeout(timeout);
          console.log('Service Worker registered by VitePWA');
          resolve();
        } else {
          // Check again in 100ms
          setTimeout(checkRegistration, 100);
        }
      };

      checkRegistration();
    });
  }

  /**
   * Setup Workbox event listeners
   */
  private setupWorkboxListeners(): void {
    if (!this.manager.workbox) return;

    // Handle waiting service worker
    this.manager.workbox.addEventListener('waiting', (event) => {
      console.log('New service worker is waiting');
      this.manager.hasUpdate = true;
      this.emit('updateAvailable', { registration: event.sw });
    });

    // Handle controlling service worker
    this.manager.workbox.addEventListener('controlling', (event) => {
      console.log('New service worker is controlling');
      this.emit('updateActivated', { registration: event.sw });
      // Reload page to get fresh content
      window.location.reload();
    });

    // Handle service worker activation
    this.manager.workbox.addEventListener('activated', (event) => {
      console.log('Service worker activated');
      this.emit('activated', { registration: event.sw });
    });

    // Handle offline/online events
    this.manager.workbox.addEventListener('message', (event) => {
      if (event.data?.type === 'CACHE_UPDATED') {
        this.emit('cacheUpdated', { updatedURL: event.data.payload?.updatedURL });
      }
    });
  }

  /**
   * Initialize global event listeners
   */
  private initializeEventListeners(): void {
    if (typeof window === 'undefined') return;
    
    // PWA install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.manager.installPrompt = e as PWAInstallPrompt;
      this.emit('installPromptAvailable');
    });

    // PWA installed
    window.addEventListener('appinstalled', () => {
      this.manager.isInstalled = true;
      this.manager.installPrompt = null;
      this.emit('installed');
    });

    // Online/offline status
    window.addEventListener('online', () => {
      this.manager.isOnline = true;
      this.emit('online');
    });

    window.addEventListener('offline', () => {
      this.manager.isOnline = false;
      this.emit('offline');
    });

    // Visibility change (for background sync)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.emit('appVisible');
      } else {
        this.emit('appHidden');
      }
    });

    // Unload event (for cleanup)
    window.addEventListener('beforeunload', () => {
      this.emit('beforeUnload');
    });
  }

  /**
   * Check if app is already installed
   */
  private checkInstallationStatus(): void {
    if (typeof window === 'undefined') return;
    
    // Check if running as PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.manager.isInstalled = true;
    }

    // Check for iOS Safari PWA
    if ((window.navigator as any).standalone === true) {
      this.manager.isInstalled = true;
    }
  }

  /**
   * Request persistent storage to prevent data eviction
   */
  private async requestPersistentStorage(): Promise<boolean> {
    if (typeof window === 'undefined' || !('storage' in navigator) || !navigator.storage || !('persist' in navigator.storage)) {
      console.warn('Persistent storage not supported');
      return false;
    }

    try {
      const persistent = await navigator.storage.persist();
      console.log(`Persistent storage granted: ${persistent}`);
      this.emit('persistentStorage', { granted: persistent });
      return persistent;
    } catch (error) {
      console.error('Failed to request persistent storage:', error);
      return false;
    }
  }

  /**
   * Show PWA install prompt
   */
  async showInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!this.manager.installPrompt) {
      return 'unavailable';
    }

    try {
      await this.manager.installPrompt.prompt();
      const choice = await this.manager.installPrompt.userChoice;
      
      if (choice.outcome === 'accepted') {
        this.emit('installAccepted');
      } else {
        this.emit('installDismissed');
      }

      this.manager.installPrompt = null;
      return choice.outcome;
    } catch (error) {
      console.error('Failed to show install prompt:', error);
      return 'unavailable';
    }
  }

  /**
   * Update service worker (skip waiting)
   */
  async updateServiceWorker(): Promise<void> {
    if (!this.manager.workbox) {
      throw new Error('Workbox not initialized');
    }

    try {
      // Tell the waiting service worker to skip waiting
      this.manager.workbox.messageSkipWaiting();
      this.manager.hasUpdate = false;
    } catch (error) {
      console.error('Failed to update service worker:', error);
      throw error;
    }
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<{
    quota: number;
    usage: number;
    available: number;
    percentUsed: number;
  }> {
    if (!('storage' in navigator) || !navigator.storage || !('estimate' in navigator.storage)) {
      return {
        quota: 0,
        usage: 0,
        available: 0,
        percentUsed: 0,
      };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      const available = quota - usage;
      const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

      return {
        quota,
        usage,
        available,
        percentUsed,
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      throw error;
    }
  }

  /**
   * Check if app is running in standalone mode
   */
  isStandalone(): boolean {
    return this.manager.isInstalled;
  }

  /**
   * Check if install prompt is available
   */
  canInstall(): boolean {
    return this.manager.installPrompt !== null;
  }

  /**
   * Check if update is available
   */
  hasUpdateAvailable(): boolean {
    return this.manager.hasUpdate;
  }

  /**
   * Check online status
   */
  isOnline(): boolean {
    return typeof window !== 'undefined' ? this.manager.isOnline : true;
  }

  /**
   * Event emitter functionality
   */
  on(event: string, callback: (data?: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data?: any) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => callback(data));
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.listeners.clear();
    this.manager.workbox = null;
    this.manager.installPrompt = null;
  }
}

// Singleton instance
export const pwaService = new PWAService();

// Utility functions
export const PWAUtils = {
  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Check if device supports PWA features
   */
  getSupportInfo() {
    return {
      serviceWorker: 'serviceWorker' in navigator,
      pushNotifications: 'PushManager' in window,
      backgroundSync: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      persistentStorage: 'storage' in navigator && navigator.storage && 'persist' in navigator.storage,
      fileSystemAccess: 'showOpenFilePicker' in window,
      webShare: 'share' in navigator,
      installPrompt: true, // Will be set when beforeinstallprompt fires
    };
  },

  /**
   * Detect if running on iOS
   */
  isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  },

  /**
   * Detect if running in iOS Safari
   */
  isIOSSafari(): boolean {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|mercury/.test(ua);
  },

  /**
   * Get PWA display mode
   */
  getDisplayMode(): string {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return 'standalone';
    }
    if (window.matchMedia('(display-mode: minimal-ui)').matches) {
      return 'minimal-ui';
    }
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
      return 'fullscreen';
    }
    return 'browser';
  },
};

export default pwaService;
