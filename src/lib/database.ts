/**
 * Database Layer with Dexie.js
 * Handles expenses, categories, and media storage with full offline support
 */

import Dexie, { Table } from 'dexie';

// Database schema interfaces
export interface Expense {
  id?: number;
  amount: number;
  description: string;
  category: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'digital_wallet' | 'other';
  date: Date;
  notes?: string;
  tags?: string[];
  location?: {
    name?: string;
    latitude?: number;
    longitude?: number;
  };
  receipt?: {
    mediaId: string;
    fileName: string;
    mimeType: string;
    size: number;
  };
  createdAt: Date;
  updatedAt: Date;
  syncStatus: 'synced' | 'pending' | 'failed';
  cloudId?: string; // For future cloud sync
}

export interface Category {
  id?: number;
  name: string;
  color: string;
  icon: string;
  budget?: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MediaFile {
  id?: number;
  mediaId: string; // UUID for OPFS storage
  fileName: string;
  mimeType: string;
  size: number;
  thumbnailId?: string;
  createdAt: Date;
  expenseId?: number;
}

export interface SyncQueue {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  entityType: 'expense' | 'category' | 'media';
  entityId: number;
  data?: any;
  timestamp: Date;
  retryCount: number;
  lastError?: string;
}

export interface AppSettings {
  id?: number;
  key: string;
  value: any;
  updatedAt: Date;
}

// Dexie database class
export class ExpenseDatabase extends Dexie {
  expenses!: Table<Expense>;
  categories!: Table<Category>;
  mediaFiles!: Table<MediaFile>;
  syncQueue!: Table<SyncQueue>;
  settings!: Table<AppSettings>;

  constructor() {
    super('ExpenseWalletDB');
    
    this.version(1).stores({
      expenses: '++id, amount, category, paymentMethod, date, createdAt, syncStatus, cloudId',
      categories: '++id, name, isDefault, createdAt',
      mediaFiles: '++id, mediaId, fileName, mimeType, createdAt, expenseId',
      syncQueue: '++id, operation, entityType, entityId, timestamp, retryCount',
      settings: '++id, key, updatedAt',
    });

    // Hooks for automatic timestamps and sync queue
    this.expenses.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
      obj.syncStatus = 'pending';
    });

    this.expenses.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date();
      if (!modifications.syncStatus) {
        modifications.syncStatus = 'pending';
      }
    });

    this.categories.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.categories.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date();
    });

    // Initialize default data
    this.on('ready', () => {
      return this.initializeDefaultData();
    });
  }

  private async initializeDefaultData(): Promise<void> {
    // Check if default categories exist
    const categoryCount = await this.categories.count();
    
    if (categoryCount === 0) {
      const defaultCategories: Omit<Category, 'id'>[] = [
        {
          name: 'Food & Dining',
          color: '#ef4444',
          icon: '🍽️',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Transportation',
          color: '#3b82f6',
          icon: '🚗',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Shopping',
          color: '#8b5cf6',
          icon: '🛍️',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Entertainment',
          color: '#f59e0b',
          icon: '🎬',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Healthcare',
          color: '#10b981',
          icon: '🏥',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Bills & Utilities',
          color: '#6b7280',
          icon: '📄',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          name: 'Other',
          color: '#64748b',
          icon: '📦',
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      await this.categories.bulkAdd(defaultCategories);
      console.log('Default categories initialized');
    }

    // Initialize default settings
    const settingsCount = await this.settings.count();
    
    if (settingsCount === 0) {
      const defaultSettings: Omit<AppSettings, 'id'>[] = [
        {
          key: 'currency',
          value: 'USD',
          updatedAt: new Date(),
        },
        {
          key: 'dateFormat',
          value: 'MM/dd/yyyy',
          updatedAt: new Date(),
        },
        {
          key: 'theme',
          value: 'system',
          updatedAt: new Date(),
        },
        {
          key: 'autoBackup',
          value: true,
          updatedAt: new Date(),
        },
        {
          key: 'notificationsEnabled',
          value: true,
          updatedAt: new Date(),
        },
      ];

      await this.settings.bulkAdd(defaultSettings);
      console.log('Default settings initialized');
    }
  }

  // Expense methods
  async addExpense(expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<number> {
    const id = await this.expenses.add(expense as Expense);
    
    // Add to sync queue
    await this.addToSyncQueue('create', 'expense', id);
    
    return id;
  }

  async updateExpense(id: number, updates: Partial<Expense>): Promise<void> {
    await this.expenses.update(id, updates);
    await this.addToSyncQueue('update', 'expense', id);
  }

  async deleteExpense(id: number): Promise<void> {
    const expense = await this.expenses.get(id);
    if (expense?.receipt?.mediaId) {
      // Delete associated media
      await this.deleteMediaFile(expense.receipt.mediaId);
    }
    
    await this.expenses.delete(id);
    await this.addToSyncQueue('delete', 'expense', id);
  }

  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    return await this.expenses
      .where('date')
      .between(startDate, endDate)
      .toArray();
  }

  async getExpensesByCategory(category: string): Promise<Expense[]> {
    return await this.expenses
      .where('category')
      .equals(category)
      .toArray();
  }

  // Category methods
  async addCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    return await this.categories.add(category as Category);
  }

  async updateCategory(id: number, updates: Partial<Category>): Promise<void> {
    await this.categories.update(id, updates);
  }

  async deleteCategory(id: number): Promise<void> {
    const category = await this.categories.get(id);
    if (category?.isDefault) {
      throw new Error('Cannot delete default category');
    }
    
    // Update expenses with this category to "Other"
    const otherCategory = await this.categories.where('name').equals('Other').first();
    if (otherCategory) {
      await this.expenses.where('category').equals(category?.name || '').modify({ category: 'Other' });
    }
    
    await this.categories.delete(id);
  }

  // Media file methods
  async addMediaFile(media: Omit<MediaFile, 'id' | 'createdAt'>): Promise<number> {
    return await this.mediaFiles.add({
      ...media,
      createdAt: new Date(),
    });
  }

  async deleteMediaFile(mediaId: string): Promise<void> {
    await this.mediaFiles.where('mediaId').equals(mediaId).delete();
  }

  async getMediaFile(mediaId: string): Promise<MediaFile | undefined> {
    return await this.mediaFiles.where('mediaId').equals(mediaId).first();
  }

  // Sync queue methods
  private async addToSyncQueue(
    operation: 'create' | 'update' | 'delete',
    entityType: 'expense' | 'category' | 'media',
    entityId: number
  ): Promise<void> {
    await this.syncQueue.add({
      operation,
      entityType,
      entityId,
      timestamp: new Date(),
      retryCount: 0,
    });
  }

  async getPendingSyncItems(): Promise<SyncQueue[]> {
    return await this.syncQueue.orderBy('timestamp').toArray();
  }

  async markSyncItemCompleted(id: number): Promise<void> {
    await this.syncQueue.delete(id);
  }

  async markSyncItemFailed(id: number, error: string): Promise<void> {
    await this.syncQueue.update(id, {
      retryCount: (await this.syncQueue.get(id))?.retryCount || 0 + 1,
      lastError: error,
    });
  }

  // Settings methods
  async getSetting(key: string): Promise<any> {
    const setting = await this.settings.where('key').equals(key).first();
    return setting?.value;
  }

  async setSetting(key: string, value: any): Promise<void> {
    const existing = await this.settings.where('key').equals(key).first();
    
    if (existing) {
      await this.settings.update(existing.id!, {
        value,
        updatedAt: new Date(),
      });
    } else {
      await this.settings.add({
        key,
        value,
        updatedAt: new Date(),
      });
    }
  }

  // Statistics methods
  async getExpenseStats(startDate?: Date, endDate?: Date): Promise<{
    totalAmount: number;
    expenseCount: number;
    averageAmount: number;
    categoryBreakdown: { category: string; amount: number; count: number }[];
    paymentMethodBreakdown: { method: string; amount: number; count: number }[];
  }> {
    let query = this.expenses.toCollection();
    
    if (startDate && endDate) {
      query = this.expenses.where('date').between(startDate, endDate);
    }
    
    const expenses = await query.toArray();
    
    const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const expenseCount = expenses.length;
    const averageAmount = expenseCount > 0 ? totalAmount / expenseCount : 0;
    
    // Category breakdown
    const categoryMap = new Map<string, { amount: number; count: number }>();
    expenses.forEach(exp => {
      const current = categoryMap.get(exp.category) || { amount: 0, count: 0 };
      categoryMap.set(exp.category, {
        amount: current.amount + exp.amount,
        count: current.count + 1,
      });
    });
    
    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      ...data,
    }));
    
    // Payment method breakdown
    const paymentMap = new Map<string, { amount: number; count: number }>();
    expenses.forEach(exp => {
      const current = paymentMap.get(exp.paymentMethod) || { amount: 0, count: 0 };
      paymentMap.set(exp.paymentMethod, {
        amount: current.amount + exp.amount,
        count: current.count + 1,
      });
    });
    
    const paymentMethodBreakdown = Array.from(paymentMap.entries()).map(([method, data]) => ({
      method,
      ...data,
    }));
    
    return {
      totalAmount,
      expenseCount,
      averageAmount,
      categoryBreakdown,
      paymentMethodBreakdown,
    };
  }

  // Database management
  async exportData(): Promise<{
    expenses: Expense[];
    categories: Category[];
    settings: AppSettings[];
    exportDate: Date;
    version: string;
  }> {
    const [expenses, categories, settings] = await Promise.all([
      this.expenses.toArray(),
      this.categories.toArray(),
      this.settings.toArray(),
    ]);
    
    return {
      expenses,
      categories,
      settings,
      exportDate: new Date(),
      version: '1.0',
    };
  }

  async importData(data: {
    expenses?: Expense[];
    categories?: Category[];
    settings?: AppSettings[];
  }): Promise<void> {
    await this.transaction('rw', [this.expenses, this.categories, this.settings], async () => {
      if (data.expenses) {
        await this.expenses.clear();
        await this.expenses.bulkAdd(data.expenses.map(exp => ({ ...exp, syncStatus: 'pending' as const })));
      }
      
      if (data.categories) {
        await this.categories.clear();
        await this.categories.bulkAdd(data.categories);
      }
      
      if (data.settings) {
        await this.settings.clear();
        await this.settings.bulkAdd(data.settings);
      }
    });
  }

  async clearAllData(): Promise<void> {
    await this.transaction('rw', [this.expenses, this.categories, this.mediaFiles, this.syncQueue], async () => {
      await this.expenses.clear();
      await this.categories.clear();
      await this.mediaFiles.clear();
      await this.syncQueue.clear();
    });
    
    // Re-initialize default data
    await this.initializeDefaultData();
  }

  async getDatabaseSize(): Promise<number> {
    try {
      if ('estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      }
      return 0;
    } catch (error) {
      console.error('Failed to get database size:', error);
      return 0;
    }
  }
}

// Singleton instance
export const db = new ExpenseDatabase();
