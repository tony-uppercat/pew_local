/**
 * Offline Sync Manager
 * Handles local queue, background sync, and data synchronization
 */

import { db, type SyncQueue } from '@/lib/database';
import { pwaService } from '@/lib/pwa';

export interface SyncOperation {
  id: number;
  operation: 'create' | 'update' | 'delete';
  entityType: 'expense' | 'category' | 'media';
  entityId: number;
  data?: any;
  timestamp: Date;
  retryCount: number;
  lastError?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  isSync: boolean;
  pendingCount: number;
  lastSyncDate: Date | null;
  errors: Array<{ operation: SyncOperation; error: string }>;
}

class SyncManager {
  private isProcessing = false;
  private syncInterval: number | null = null;
  private listeners = new Map<string, Set<(data?: any) => void>>();
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (typeof window === 'undefined') return;

    // Listen for online/offline events
    pwaService.on('online', () => {
      this.handleOnlineStatus(true);
    });

    pwaService.on('offline', () => {
      this.handleOnlineStatus(false);
    });

    // Listen for app visibility changes
    pwaService.on('appVisible', () => {
      if (navigator.onLine) {
        this.processQueue();
      }
    });

    // Start periodic sync when online
    if (navigator.onLine) {
      this.startPeriodicSync();
    }

    // Register for background sync if supported
    this.registerBackgroundSync();
  }

  /**
   * Handle online/offline status changes
   */
  private handleOnlineStatus(isOnline: boolean): void {
    if (isOnline) {
      this.startPeriodicSync();
      this.processQueue();
    } else {
      this.stopPeriodicSync();
    }
    
    this.emit('statusChange', { isOnline });
  }

  /**
   * Start periodic sync when online
   */
  private startPeriodicSync(): void {
    if (this.syncInterval) return;

    // Process queue every 30 seconds when online
    this.syncInterval = window.setInterval(() => {
      if (navigator.onLine && !this.isProcessing) {
        this.processQueue();
      }
    }, 30000);
  }

  /**
   * Stop periodic sync
   */
  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Register for background sync (Chrome only)
   */
  private async registerBackgroundSync(): Promise<void> {
    try {
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        const registration = await navigator.serviceWorker.ready;
        
        if (registration.sync) {
          await registration.sync.register('expense-sync');
          console.log('Background sync registered');
        }
      }
    } catch (error) {
      console.log('Background sync not supported or failed to register:', error);
    }
  }

  /**
   * Add operation to sync queue
   */
  async addToQueue(
    operation: 'create' | 'update' | 'delete',
    entityType: 'expense' | 'category' | 'media',
    entityId: number,
    data?: any
  ): Promise<void> {
    try {
      await db.syncQueue.add({
        operation,
        entityType,
        entityId,
        data,
        timestamp: new Date(),
        retryCount: 0,
      });

      this.emit('queueUpdated');

      // Try to process immediately if online
      if (navigator.onLine && !this.isProcessing) {
        setTimeout(() => this.processQueue(), 1000);
      }
    } catch (error) {
      console.error('Failed to add to sync queue:', error);
      throw error;
    }
  }

  /**
   * Process sync queue
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) {
      return;
    }

    this.isProcessing = true;
    this.emit('syncStarted');

    try {
      const pendingItems = await db.getPendingSyncItems();
      
      if (pendingItems.length === 0) {
        this.emit('syncCompleted', { processedCount: 0, errors: [] });
        return;
      }

      const errors: Array<{ operation: SyncOperation; error: string }> = [];
      let processedCount = 0;

      for (const item of pendingItems) {
        try {
          await this.processSyncItem(item);
          await db.markSyncItemCompleted(item.id!);
          processedCount++;
          
          this.emit('itemSynced', { item });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          if (item.retryCount < this.maxRetries) {
            await db.markSyncItemFailed(item.id!, errorMessage);
            
            // Exponential backoff for retries
            const delay = this.retryDelay * Math.pow(2, item.retryCount);
            setTimeout(() => {
              if (navigator.onLine) {
                this.processQueue();
              }
            }, delay);
          } else {
            // Max retries reached, log error and remove from queue
            errors.push({
              operation: item as SyncOperation,
              error: errorMessage,
            });
            
            await db.markSyncItemCompleted(item.id!);
            console.error(`Sync failed after ${this.maxRetries} retries:`, item, errorMessage);
          }
        }
      }

      this.emit('syncCompleted', { processedCount, errors });
    } catch (error) {
      console.error('Failed to process sync queue:', error);
      this.emit('syncError', { error });
    } finally {
      this.isProcessing = false;
      this.emit('queueUpdated');
    }
  }

  /**
   * Process individual sync item
   */
  private async processSyncItem(item: SyncQueue): Promise<void> {
    // For now, we'll simulate sync operations
    // In a real app, this would make API calls to your backend
    
    switch (item.entityType) {
      case 'expense':
        await this.syncExpense(item);
        break;
      case 'category':
        await this.syncCategory(item);
        break;
      case 'media':
        await this.syncMedia(item);
        break;
      default:
        throw new Error(`Unknown entity type: ${item.entityType}`);
    }
  }

  /**
   * Sync expense to server (placeholder implementation)
   */
  private async syncExpense(item: SyncQueue): Promise<void> {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    // In a real implementation, you would:
    // 1. Get the expense data from the database
    // 2. Make API call to your backend
    // 3. Update the expense with server response (cloudId, etc.)
    
    const expense = await db.expenses.get(item.entityId);
    if (!expense) {
      throw new Error(`Expense ${item.entityId} not found`);
    }

    switch (item.operation) {
      case 'create':
        // POST /api/expenses
        console.log('Syncing new expense:', expense);
        // Update with server ID
        await db.expenses.update(item.entityId, {
          cloudId: `cloud_${item.entityId}_${Date.now()}`,
          syncStatus: 'synced',
        });
        break;
        
      case 'update':
        // PUT /api/expenses/:id
        console.log('Syncing updated expense:', expense);
        await db.expenses.update(item.entityId, {
          syncStatus: 'synced',
        });
        break;
        
      case 'delete':
        // DELETE /api/expenses/:id
        console.log('Syncing deleted expense:', item.entityId);
        break;
    }
  }

  /**
   * Sync category to server (placeholder implementation)
   */
  private async syncCategory(item: SyncQueue): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    
    const category = await db.categories.get(item.entityId);
    console.log(`Syncing category ${item.operation}:`, category);
  }

  /**
   * Sync media to server (placeholder implementation)
   */
  private async syncMedia(item: SyncQueue): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 500));
    
    const media = await db.mediaFiles.get(item.entityId);
    console.log(`Syncing media ${item.operation}:`, media);
  }

  /**
   * Get current sync status
   */
  async getStatus(): Promise<SyncStatus> {
    const pendingItems = await db.getPendingSyncItems();
    const pendingCount = pendingItems.length;
    
    // Get last successful sync date from preferences
    const lastSyncDate = null; // Would come from preferences
    
    const errors = pendingItems
      .filter(item => item.retryCount >= this.maxRetries)
      .map(item => ({
        operation: item as SyncOperation,
        error: item.lastError || 'Max retries exceeded',
      }));

    return {
      isOnline: navigator.onLine,
      isSync: this.isProcessing,
      pendingCount,
      lastSyncDate,
      errors,
    };
  }

  /**
   * Force sync now
   */
  async forcSync(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }

    await this.processQueue();
  }

  /**
   * Clear sync queue (use with caution)
   */
  async clearQueue(): Promise<void> {
    await db.syncQueue.clear();
    this.emit('queueUpdated');
  }

  /**
   * Retry failed items
   */
  async retryFailedItems(): Promise<void> {
    if (!navigator.onLine) {
      throw new Error('Cannot retry while offline');
    }

    // Reset retry count for failed items
    const failedItems = await db.syncQueue
      .where('retryCount')
      .aboveOrEqual(this.maxRetries)
      .toArray();

    for (const item of failedItems) {
      await db.syncQueue.update(item.id!, { retryCount: 0, lastError: undefined });
    }

    await this.processQueue();
  }

  /**
   * Event system
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
      eventListeners.forEach(callback => callback(data));
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopPeriodicSync();
    this.listeners.clear();
    this.isProcessing = false;
  }
}

// Singleton instance
export const syncManager = new SyncManager();

// Service Worker Background Sync Handler
if (typeof self !== 'undefined' && 'ServiceWorkerGlobalScope' in self) {
  // This code runs in the service worker
  self.addEventListener('sync', (event: any) => {
    if (event.tag === 'expense-sync') {
      console.log('Background sync triggered');
      
      event.waitUntil(
        // Process sync queue in background
        (async () => {
          try {
            // Import sync manager in service worker context
            const { syncManager } = await import('@/lib/sync');
            await syncManager.processQueue();
          } catch (error) {
            console.error('Background sync failed:', error);
          }
        })()
      );
    }
  });
}

export default syncManager;
