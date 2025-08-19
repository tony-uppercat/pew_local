/**
 * Privacy Management System
 * Handles user consent, data retention, and privacy controls
 */

interface PrivacySettings {
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  performanceMonitoringEnabled: boolean;
  locationTrackingEnabled: boolean;
  dataRetentionDays: number;
  autoDeleteEnabled: boolean;
  shareUsageData: boolean;
  personalizedExperience: boolean;
}

interface ConsentRecord {
  id: string;
  type: 'analytics' | 'performance' | 'functional' | 'marketing';
  granted: boolean;
  timestamp: Date;
  version: string;
  ipAddress?: string;
  userAgent?: string;
}

interface DataRetentionPolicy {
  dataType: 'expenses' | 'media' | 'preferences' | 'analytics' | 'logs';
  retentionDays: number;
  autoDelete: boolean;
  lastCleanup: Date;
}

class PrivacyManager {
  private settings: PrivacySettings;
  private consentRecords: ConsentRecord[] = [];
  private retentionPolicies: DataRetentionPolicy[] = [];
  private listeners = new Map<string, Set<(data: any) => void>>();
  private readonly CONSENT_VERSION = '1.0';

  constructor() {
    this.settings = this.getDefaultSettings();
    this.initializeRetentionPolicies();
    this.initialize();
  }

  private getDefaultSettings(): PrivacySettings {
    return {
      analyticsEnabled: false, // Opt-in by default
      crashReportingEnabled: true, // Essential for app stability
      performanceMonitoringEnabled: true, // Essential for optimization
      locationTrackingEnabled: false,
      dataRetentionDays: 365,
      autoDeleteEnabled: true,
      shareUsageData: false,
      personalizedExperience: false,
    };
  }

  private initializeRetentionPolicies(): void {
    this.retentionPolicies = [
      {
        dataType: 'expenses',
        retentionDays: 2555, // 7 years for financial records
        autoDelete: false,
        lastCleanup: new Date(),
      },
      {
        dataType: 'media',
        retentionDays: 1095, // 3 years for receipts
        autoDelete: true,
        lastCleanup: new Date(),
      },
      {
        dataType: 'preferences',
        retentionDays: 365, // 1 year for user preferences
        autoDelete: false,
        lastCleanup: new Date(),
      },
      {
        dataType: 'analytics',
        retentionDays: 90, // 3 months for analytics
        autoDelete: true,
        lastCleanup: new Date(),
      },
      {
        dataType: 'logs',
        retentionDays: 30, // 1 month for logs
        autoDelete: true,
        lastCleanup: new Date(),
      },
    ];
  }

  private async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Load existing settings and consents
      await this.loadSettings();
      await this.loadConsentRecords();
      
      // Schedule periodic cleanup
      this.scheduleDataCleanup();
      
      // Check if consent is required
      if (this.isConsentRequired()) {
        this.emit('consentRequired');
      }

      console.log('Privacy manager initialized');
    } catch (error) {
      console.error('Failed to initialize privacy manager:', error);
    }
  }

  /**
   * Check if user consent is required
   */
  isConsentRequired(): boolean {
    // Check if we have any consent records for current version
    const currentVersionConsent = this.consentRecords.find(
      record => record.version === this.CONSENT_VERSION
    );
    
    return !currentVersionConsent && this.settings.analyticsEnabled;
  }

  /**
   * Request user consent for specific data processing
   */
  async requestConsent(
    type: ConsentRecord['type'],
    description: string
  ): Promise<boolean> {
    return new Promise((resolve) => {
      this.emit('consentRequest', {
        type,
        description,
        onAccept: () => {
          this.grantConsent(type);
          resolve(true);
        },
        onDecline: () => {
          this.denyConsent(type);
          resolve(false);
        },
      });
    });
  }

  /**
   * Grant consent for data processing
   */
  private async grantConsent(type: ConsentRecord['type']): Promise<void> {
    const consent: ConsentRecord = {
      id: this.generateId(),
      type,
      granted: true,
      timestamp: new Date(),
      version: this.CONSENT_VERSION,
      ipAddress: await this.getClientIP(),
      userAgent: navigator.userAgent,
    };

    this.consentRecords.push(consent);
    await this.saveConsentRecords();
    
    this.emit('consentGranted', { type });
  }

  /**
   * Deny consent for data processing
   */
  private async denyConsent(type: ConsentRecord['type']): Promise<void> {
    const consent: ConsentRecord = {
      id: this.generateId(),
      type,
      granted: false,
      timestamp: new Date(),
      version: this.CONSENT_VERSION,
    };

    this.consentRecords.push(consent);
    await this.saveConsentRecords();
    
    // Update settings based on denied consent
    this.updateSettingsFromConsent(type, false);
    
    this.emit('consentDenied', { type });
  }

  /**
   * Update settings based on consent
   */
  private updateSettingsFromConsent(type: ConsentRecord['type'], granted: boolean): void {
    switch (type) {
      case 'analytics':
        this.settings.analyticsEnabled = granted;
        this.settings.shareUsageData = granted;
        break;
      case 'performance':
        this.settings.performanceMonitoringEnabled = granted;
        break;
      case 'functional':
        this.settings.personalizedExperience = granted;
        break;
      case 'marketing':
        this.settings.locationTrackingEnabled = granted;
        break;
    }
  }

  /**
   * Get current consent status
   */
  getConsentStatus(): Record<ConsentRecord['type'], boolean | null> {
    const status: Record<ConsentRecord['type'], boolean | null> = {
      analytics: null,
      performance: null,
      functional: null,
      marketing: null,
    };

    // Get latest consent for each type
    (['analytics', 'performance', 'functional', 'marketing'] as const).forEach(type => {
      const latestConsent = this.consentRecords
        .filter(record => record.type === type)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      
      if (latestConsent) {
        status[type] = latestConsent.granted;
      }
    });

    return status;
  }

  /**
   * Update privacy settings
   */
  async updateSettings(updates: Partial<PrivacySettings>): Promise<void> {
    const oldSettings = { ...this.settings };
    this.settings = { ...this.settings, ...updates };
    
    await this.saveSettings();
    
    this.emit('settingsUpdated', {
      oldSettings,
      newSettings: this.settings,
      changes: updates,
    });
  }

  /**
   * Get current privacy settings
   */
  getSettings(): PrivacySettings {
    return { ...this.settings };
  }

  /**
   * Export all user data (GDPR compliance)
   */
  async exportUserData(): Promise<{
    expenses: any[];
    media: any[];
    preferences: any;
    consentRecords: ConsentRecord[];
    privacySettings: PrivacySettings;
    exportDate: Date;
  }> {
    try {
      // Import required modules
      const { db } = await import('@/lib/database');
      const { preferences } = await import('@/lib/preferences');

      const [expenses, categories, mediaFiles, userPreferences, appState] = await Promise.all([
        db.expenses.toArray(),
        db.categories.toArray(),
        db.mediaFiles.toArray(),
        preferences.getPreferences(),
        preferences.getAppState(),
      ]);

      return {
        expenses,
        media: mediaFiles,
        preferences: {
          userPreferences,
          appState,
          categories,
        },
        consentRecords: this.consentRecords,
        privacySettings: this.settings,
        exportDate: new Date(),
      };
    } catch (error) {
      console.error('Failed to export user data:', error);
      throw new Error('Data export failed');
    }
  }

  /**
   * Delete all user data (GDPR compliance)
   */
  async deleteAllUserData(): Promise<void> {
    try {
      // Import required modules
      const { db } = await import('@/lib/database');
      const { preferences } = await import('@/lib/preferences');
      const { opfsStorage } = await import('@/lib/storage');

      // Clear all data
      await Promise.all([
        db.clearAllData(),
        preferences.clearAllData(),
        opfsStorage.clearAllMedia(),
        this.clearConsentRecords(),
        this.clearSettings(),
      ]);

      this.emit('allDataDeleted');
      console.log('All user data deleted');
    } catch (error) {
      console.error('Failed to delete user data:', error);
      throw new Error('Data deletion failed');
    }
  }

  /**
   * Anonymize user data
   */
  async anonymizeUserData(): Promise<void> {
    try {
      const { db } = await import('@/lib/database');
      
      // Get all expenses and anonymize sensitive fields
      const expenses = await db.expenses.toArray();
      const anonymizedExpenses = expenses.map(expense => ({
        ...expense,
        description: this.anonymizeText(expense.description),
        notes: expense.notes ? this.anonymizeText(expense.notes) : undefined,
        location: undefined, // Remove location data
        tags: expense.tags?.map(tag => this.anonymizeText(tag)),
      }));

      // Update expenses with anonymized data
      await db.expenses.clear();
      await db.expenses.bulkAdd(anonymizedExpenses);

      this.emit('dataAnonymized');
      console.log('User data anonymized');
    } catch (error) {
      console.error('Failed to anonymize user data:', error);
      throw new Error('Data anonymization failed');
    }
  }

  /**
   * Anonymize text by replacing with generic terms
   */
  private anonymizeText(text: string): string {
    return text
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, 'user@example.com')
      .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '555-0123')
      .replace(/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, '1234 5678 9012 3456')
      .replace(/\b\d{1,5}\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl)\b/gi, '123 Main Street');
  }

  /**
   * Schedule automatic data cleanup
   */
  private scheduleDataCleanup(): void {
    // Run cleanup daily
    setInterval(() => {
      this.performDataCleanup();
    }, 24 * 60 * 60 * 1000);

    // Run initial cleanup after 1 minute
    setTimeout(() => {
      this.performDataCleanup();
    }, 60 * 1000);
  }

  /**
   * Perform data cleanup based on retention policies
   */
  private async performDataCleanup(): Promise<void> {
    if (!this.settings.autoDeleteEnabled) return;

    try {
      for (const policy of this.retentionPolicies) {
        if (!policy.autoDelete) continue;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

        await this.cleanupDataByType(policy.dataType, cutoffDate);
        
        policy.lastCleanup = new Date();
      }

      await this.saveRetentionPolicies();
      this.emit('dataCleanupCompleted');
    } catch (error) {
      console.error('Data cleanup failed:', error);
    }
  }

  /**
   * Cleanup data by type and date
   */
  private async cleanupDataByType(dataType: DataRetentionPolicy['dataType'], cutoffDate: Date): Promise<void> {
    switch (dataType) {
      case 'analytics':
        // Clear old analytics data (would be stored in IndexedDB or similar)
        break;
        
      case 'logs':
        // Clear old log entries
        const { securityManager } = await import('@/lib/security');
        const oldEvents = securityManager.getSecurityEvents().filter(
          event => event.timestamp < cutoffDate
        );
        if (oldEvents.length > 0) {
          securityManager.clearSecurityEvents();
        }
        break;
        
      case 'media':
        // Clean up old media files
        const { db } = await import('@/lib/database');
        const { opfsStorage } = await import('@/lib/storage');
        
        const oldMediaFiles = await db.mediaFiles
          .where('createdAt')
          .below(cutoffDate)
          .toArray();
        
        for (const mediaFile of oldMediaFiles) {
          await opfsStorage.deleteMediaFile(mediaFile.mediaId);
          await db.mediaFiles.delete(mediaFile.id!);
        }
        break;
    }
  }

  /**
   * Get data retention report
   */
  async getDataRetentionReport(): Promise<{
    policies: DataRetentionPolicy[];
    estimatedDataSize: number;
    nextCleanupDate: Date;
    itemsToDelete: Record<string, number>;
  }> {
    const itemsToDelete: Record<string, number> = {};
    let estimatedDataSize = 0;

    try {
      const { db } = await import('@/lib/database');
      const { opfsStorage } = await import('@/lib/storage');

      // Calculate items that will be deleted
      for (const policy of this.retentionPolicies) {
        if (!policy.autoDelete) continue;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

        switch (policy.dataType) {
          case 'media':
            const oldMediaFiles = await db.mediaFiles
              .where('createdAt')
              .below(cutoffDate)
              .toArray();
            itemsToDelete[policy.dataType] = oldMediaFiles.length;
            estimatedDataSize += oldMediaFiles.reduce((sum, file) => sum + file.size, 0);
            break;
        }
      }

      // Get overall storage info
      const storageInfo = await opfsStorage.getStorageInfo();
      estimatedDataSize = storageInfo.usage;

      const nextCleanupDate = new Date();
      nextCleanupDate.setDate(nextCleanupDate.getDate() + 1);

      return {
        policies: this.retentionPolicies,
        estimatedDataSize,
        nextCleanupDate,
        itemsToDelete,
      };
    } catch (error) {
      console.error('Failed to generate retention report:', error);
      return {
        policies: this.retentionPolicies,
        estimatedDataSize: 0,
        nextCleanupDate: new Date(),
        itemsToDelete: {},
      };
    }
  }

  /**
   * Get client IP address (for consent records)
   */
  private async getClientIP(): Promise<string | undefined> {
    try {
      // This would typically use a service like ipify or similar
      // For privacy, we'll just return undefined
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Storage methods
  private async loadSettings(): Promise<void> {
    try {
      const { get } = await import('idb-keyval');
      const stored = await get('privacy_settings');
      if (stored) {
        this.settings = { ...this.getDefaultSettings(), ...stored };
      }
    } catch (error) {
      console.warn('Failed to load privacy settings:', error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      const { set } = await import('idb-keyval');
      await set('privacy_settings', this.settings);
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    }
  }

  private async loadConsentRecords(): Promise<void> {
    try {
      const { get } = await import('idb-keyval');
      const stored = await get('consent_records');
      if (stored) {
        this.consentRecords = stored.map((record: any) => ({
          ...record,
          timestamp: new Date(record.timestamp),
        }));
      }
    } catch (error) {
      console.warn('Failed to load consent records:', error);
    }
  }

  private async saveConsentRecords(): Promise<void> {
    try {
      const { set } = await import('idb-keyval');
      await set('consent_records', this.consentRecords);
    } catch (error) {
      console.error('Failed to save consent records:', error);
    }
  }

  private async saveRetentionPolicies(): Promise<void> {
    try {
      const { set } = await import('idb-keyval');
      await set('retention_policies', this.retentionPolicies);
    } catch (error) {
      console.error('Failed to save retention policies:', error);
    }
  }

  private async clearSettings(): Promise<void> {
    try {
      const { del } = await import('idb-keyval');
      await del('privacy_settings');
      this.settings = this.getDefaultSettings();
    } catch (error) {
      console.error('Failed to clear settings:', error);
    }
  }

  private async clearConsentRecords(): Promise<void> {
    try {
      const { del } = await import('idb-keyval');
      await del('consent_records');
      this.consentRecords = [];
    } catch (error) {
      console.error('Failed to clear consent records:', error);
    }
  }

  // Event system
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void): void {
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
   * Cleanup
   */
  destroy(): void {
    this.listeners.clear();
  }
}

// Singleton instance
export const privacyManager = new PrivacyManager();

export default privacyManager;
