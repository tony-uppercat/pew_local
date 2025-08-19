/**
 * Backup and Export/Import System with AES-GCM Encryption
 * Handles secure local backups and data portability
 */

export interface BackupData {
  version: string;
  createdAt: Date;
  appVersion: string;
  data: {
    expenses: any[];
    categories: any[];
    settings: any[];
    preferences: any;
    appState: any;
  };
  metadata: {
    totalExpenses: number;
    totalCategories: number;
    dateRange: {
      start: Date | null;
      end: Date | null;
    };
    fileCount: number;
    mediaSize: number;
  };
}

export interface EncryptedBackup {
  version: string;
  algorithm: string;
  iv: string; // Base64 encoded
  data: string; // Base64 encoded encrypted data
  createdAt: string;
}

class BackupManager {
  private readonly BACKUP_VERSION = '1.0';
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;

  /**
   * Create a complete backup of all data
   */
  async createBackup(): Promise<BackupData> {
    try {
      // Import required modules dynamically to avoid SSR issues
      const { db } = await import('@/lib/database');
      const { preferences } = await import('@/lib/preferences');
      const { opfsStorage } = await import('@/lib/storage');

      // Get all data
      const [expenses, categories, settings, userPreferences, appState] = await Promise.all([
        db.expenses.toArray(),
        db.categories.toArray(),
        db.settings.toArray(),
        preferences.getPreferences(),
        preferences.getAppState(),
      ]);

      // Calculate metadata
      const dateRange = {
        start: expenses.length > 0 ? new Date(Math.min(...expenses.map(e => e.date.getTime()))) : null,
        end: expenses.length > 0 ? new Date(Math.max(...expenses.map(e => e.date.getTime()))) : null,
      };

      const mediaFiles = await db.mediaFiles.toArray();
      const mediaSize = mediaFiles.reduce((total, file) => total + file.size, 0);

      const backup: BackupData = {
        version: this.BACKUP_VERSION,
        createdAt: new Date(),
        appVersion: '1.0.0', // Would come from package.json in real app
        data: {
          expenses,
          categories,
          settings,
          preferences: userPreferences,
          appState,
        },
        metadata: {
          totalExpenses: expenses.length,
          totalCategories: categories.length,
          dateRange,
          fileCount: mediaFiles.length,
          mediaSize,
        },
      };

      return backup;
    } catch (error) {
      console.error('Failed to create backup:', error);
      throw new Error('Failed to create backup: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Generate encryption key from password
   */
  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt backup data
   */
  async encryptBackup(backup: BackupData, password: string): Promise<EncryptedBackup> {
    try {
      // Generate random salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Derive key from password
      const key = await this.deriveKey(password, salt);

      // Prepare data for encryption
      const dataString = JSON.stringify(backup);
      const encoder = new TextEncoder();
      const data = encoder.encode(dataString);

      // Encrypt data
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv,
        },
        key,
        data
      );

      // Combine salt + encrypted data
      const combined = new Uint8Array(salt.length + encryptedData.byteLength);
      combined.set(salt, 0);
      combined.set(new Uint8Array(encryptedData), salt.length);

      return {
        version: this.BACKUP_VERSION,
        algorithm: this.ALGORITHM,
        iv: this.arrayBufferToBase64(iv),
        data: this.arrayBufferToBase64(combined),
        createdAt: backup.createdAt.toISOString(),
      };
    } catch (error) {
      console.error('Failed to encrypt backup:', error);
      throw new Error('Failed to encrypt backup: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Decrypt backup data
   */
  async decryptBackup(encryptedBackup: EncryptedBackup, password: string): Promise<BackupData> {
    try {
      if (encryptedBackup.algorithm !== this.ALGORITHM) {
        throw new Error(`Unsupported encryption algorithm: ${encryptedBackup.algorithm}`);
      }

      // Decode base64 data
      const iv = this.base64ToArrayBuffer(encryptedBackup.iv);
      const combined = this.base64ToArrayBuffer(encryptedBackup.data);

      // Extract salt and encrypted data
      const salt = combined.slice(0, 16);
      const encryptedData = combined.slice(16);

      // Derive key from password
      const key = await this.deriveKey(password, salt);

      // Decrypt data
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv,
        },
        key,
        encryptedData
      );

      // Parse decrypted data
      const decoder = new TextDecoder();
      const dataString = decoder.decode(decryptedData);
      const backup = JSON.parse(dataString) as BackupData;

      // Convert date strings back to Date objects
      backup.createdAt = new Date(backup.createdAt);
      if (backup.data.expenses) {
        backup.data.expenses.forEach((expense: any) => {
          expense.date = new Date(expense.date);
          expense.createdAt = new Date(expense.createdAt);
          expense.updatedAt = new Date(expense.updatedAt);
        });
      }

      return backup;
    } catch (error) {
      console.error('Failed to decrypt backup:', error);
      if (error instanceof Error && error.message.includes('decrypt')) {
        throw new Error('Invalid password or corrupted backup file');
      }
      throw new Error('Failed to decrypt backup: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Export backup to file
   */
  async exportBackup(password?: string): Promise<void> {
    try {
      const backup = await this.createBackup();
      let fileData: string;
      let fileName: string;
      let mimeType: string;

      if (password) {
        // Encrypted backup
        const encrypted = await this.encryptBackup(backup, password);
        fileData = JSON.stringify(encrypted, null, 2);
        fileName = `pew-backup-encrypted-${this.formatDate(backup.createdAt)}.json`;
        mimeType = 'application/json';
      } else {
        // Unencrypted backup
        fileData = JSON.stringify(backup, null, 2);
        fileName = `pew-backup-${this.formatDate(backup.createdAt)}.json`;
        mimeType = 'application/json';
      }

      // Use File System Access API if available
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [
              {
                description: 'JSON files',
                accept: { 'application/json': ['.json'] },
              },
            ],
          });

          const writable = await fileHandle.createWritable();
          await writable.write(fileData);
          await writable.close();

          return;
        } catch (error) {
          // User cancelled or API failed, fall back to download
          if (error instanceof Error && error.name === 'AbortError') {
            return; // User cancelled
          }
        }
      }

      // Fallback to traditional download
      this.downloadFile(fileData, fileName, mimeType);
    } catch (error) {
      console.error('Failed to export backup:', error);
      throw error;
    }
  }

  /**
   * Import backup from file
   */
  async importBackup(file: File, password?: string): Promise<void> {
    try {
      const fileContent = await this.readFileContent(file);
      let backup: BackupData;

      try {
        const parsed = JSON.parse(fileContent);

        // Check if it's an encrypted backup
        if (parsed.algorithm && parsed.iv && parsed.data) {
          if (!password) {
            throw new Error('Password required for encrypted backup');
          }
          backup = await this.decryptBackup(parsed as EncryptedBackup, password);
        } else {
          backup = parsed as BackupData;
          // Convert date strings to Date objects for unencrypted backups
          backup.createdAt = new Date(backup.createdAt);
          if (backup.data.expenses) {
            backup.data.expenses.forEach((expense: any) => {
              expense.date = new Date(expense.date);
              expense.createdAt = new Date(expense.createdAt);
              expense.updatedAt = new Date(expense.updatedAt);
            });
          }
        }
      } catch (parseError) {
        throw new Error('Invalid backup file format');
      }

      // Validate backup version
      if (backup.version !== this.BACKUP_VERSION) {
        console.warn(`Backup version mismatch: ${backup.version} vs ${this.BACKUP_VERSION}`);
        // You might want to handle version migration here
      }

      // Import data
      await this.restoreBackup(backup);
    } catch (error) {
      console.error('Failed to import backup:', error);
      throw error;
    }
  }

  /**
   * Restore backup data to database
   */
  private async restoreBackup(backup: BackupData): Promise<void> {
    try {
      const { db } = await import('@/lib/database');
      const { preferences } = await import('@/lib/preferences');

      // Clear existing data (with confirmation in UI)
      await db.clearAllData();

      // Restore database data
      if (backup.data.expenses?.length > 0) {
        await db.expenses.bulkAdd(backup.data.expenses);
      }

      if (backup.data.categories?.length > 0) {
        await db.categories.bulkAdd(backup.data.categories);
      }

      if (backup.data.settings?.length > 0) {
        await db.settings.bulkAdd(backup.data.settings);
      }

      // Restore preferences
      if (backup.data.preferences) {
        await preferences.updatePreferences(backup.data.preferences);
      }

      if (backup.data.appState) {
        await preferences.updateAppState(backup.data.appState);
      }

      console.log('Backup restored successfully');
    } catch (error) {
      console.error('Failed to restore backup:', error);
      throw new Error('Failed to restore backup: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  /**
   * Auto backup functionality
   */
  async createAutoBackup(): Promise<void> {
    try {
      const { preferences } = await import('@/lib/preferences');
      
      const autoBackupEnabled = await preferences.getPreference('autoBackup');
      if (!autoBackupEnabled) return;

      const lastBackupDate = await preferences.getAppStateValue('lastBackupDate');
      const backupFrequency = await preferences.getPreference('backupFrequency');

      // Check if backup is needed
      const now = new Date();
      let needsBackup = false;

      if (!lastBackupDate) {
        needsBackup = true;
      } else {
        const daysSinceLastBackup = Math.floor((now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24));
        
        switch (backupFrequency) {
          case 'daily':
            needsBackup = daysSinceLastBackup >= 1;
            break;
          case 'weekly':
            needsBackup = daysSinceLastBackup >= 7;
            break;
          case 'monthly':
            needsBackup = daysSinceLastBackup >= 30;
            break;
        }
      }

      if (needsBackup) {
        const backup = await this.createBackup();
        
        // Store backup in IndexedDB for local auto-backup
        await this.storeLocalBackup(backup);
        
        // Update last backup date
        await preferences.setAppStateValue('lastBackupDate', now);
        
        console.log('Auto backup created successfully');
      }
    } catch (error) {
      console.error('Auto backup failed:', error);
    }
  }

  /**
   * Store backup locally in IndexedDB
   */
  private async storeLocalBackup(backup: BackupData): Promise<void> {
    const { set } = await import('idb-keyval');
    const backupKey = `auto-backup-${this.formatDate(backup.createdAt)}`;
    
    // Keep only last 5 auto backups
    const { keys, del } = await import('idb-keyval');
    const allKeys = await keys();
    const backupKeys = allKeys.filter(key => typeof key === 'string' && key.startsWith('auto-backup-'));
    
    if (backupKeys.length >= 5) {
      // Sort by date and remove oldest
      backupKeys.sort();
      for (let i = 0; i < backupKeys.length - 4; i++) {
        await del(backupKeys[i]);
      }
    }
    
    await set(backupKey, backup);
  }

  /**
   * Get list of local auto backups
   */
  async getLocalBackups(): Promise<Array<{ key: string; date: Date; metadata: BackupData['metadata'] }>> {
    try {
      const { keys, get } = await import('idb-keyval');
      const allKeys = await keys();
      const backupKeys = allKeys.filter(key => typeof key === 'string' && key.startsWith('auto-backup-'));
      
      const backups = [];
      for (const key of backupKeys) {
        const backup = await get(key) as BackupData;
        if (backup) {
          backups.push({
            key: key as string,
            date: backup.createdAt,
            metadata: backup.metadata,
          });
        }
      }
      
      return backups.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
      console.error('Failed to get local backups:', error);
      return [];
    }
  }

  /**
   * Restore from local backup
   */
  async restoreLocalBackup(backupKey: string): Promise<void> {
    try {
      const { get } = await import('idb-keyval');
      const backup = await get(backupKey) as BackupData;
      
      if (!backup) {
        throw new Error('Backup not found');
      }
      
      await this.restoreBackup(backup);
    } catch (error) {
      console.error('Failed to restore local backup:', error);
      throw error;
    }
  }

  // Helper methods

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  private async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private downloadFile(content: string, fileName: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }
}

// Singleton instance
export const backupManager = new BackupManager();

export default backupManager;
