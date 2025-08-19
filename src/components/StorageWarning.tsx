import { useState, useEffect } from 'react';
import { opfsStorage } from '@/lib/storage';

interface StorageWarningProps {
  className?: string;
}

interface StorageWarningState {
  show: boolean;
  type: 'low' | 'critical' | 'full';
  usage: number;
  quota: number;
  available: number;
  percentUsed: number;
}

export default function StorageWarning({ className = '' }: StorageWarningProps): JSX.Element | null {
  const [warning, setWarning] = useState<StorageWarningState | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const checkStorageUsage = async () => {
    try {
      const storageInfo = await opfsStorage.getStorageInfo();
      const { usage, quota, available, percentUsed } = storageInfo;

      // Determine warning type
      let warningType: 'low' | 'critical' | 'full' | null = null;
      
      if (percentUsed >= 98) {
        warningType = 'full';
      } else if (percentUsed >= 90) {
        warningType = 'critical';
      } else if (percentUsed >= 80) {
        warningType = 'low';
      }

      if (warningType && !isDismissed) {
        setWarning({
          show: true,
          type: warningType,
          usage,
          quota,
          available,
          percentUsed,
        });
      } else {
        setWarning(null);
      }
    } catch (error) {
      console.error('Failed to check storage usage:', error);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setWarning(null);
    
    // Re-enable warnings after 1 hour
    setTimeout(() => {
      setIsDismissed(false);
    }, 60 * 60 * 1000);
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      // Clear browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
      }
      
      // Refresh storage info
      await checkStorageUsage();
      
      alert('Cache cleared successfully!');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleClearOldMedia = async () => {
    if (!confirm('This will delete media files older than 30 days. Are you sure?')) {
      return;
    }

    setIsClearing(true);
    try {
      const { db } = await import('@/lib/database');
      
      // Delete media files older than 30 days
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 30);
      
      const oldMediaFiles = await db.mediaFiles
        .where('createdAt')
        .below(cutoffDate)
        .toArray();
      
      for (const mediaFile of oldMediaFiles) {
        await opfsStorage.deleteMediaFile(mediaFile.mediaId);
        await db.mediaFiles.delete(mediaFile.id!);
      }
      
      // Refresh storage info
      await checkStorageUsage();
      
      alert(`Deleted ${oldMediaFiles.length} old media files.`);
    } catch (error) {
      console.error('Failed to clear old media:', error);
      alert('Failed to clear old media. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const handleManageStorage = () => {
    // Emit event to show storage management panel
    window.dispatchEvent(new CustomEvent('showStorageManagement'));
    handleDismiss();
  };

  useEffect(() => {
    // Check storage on mount
    checkStorageUsage();
    
    // Check storage periodically (every 5 minutes)
    const interval = setInterval(checkStorageUsage, 5 * 60 * 1000);
    
    // Listen for storage changes
    const handleStorageChange = () => {
      setTimeout(checkStorageUsage, 1000); // Delay to allow storage operations to complete
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('beforeunload', handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('beforeunload', handleStorageChange);
    };
  }, [isDismissed]);

  if (!warning?.show) {
    return null;
  }

  const getWarningConfig = (type: 'low' | 'critical' | 'full') => {
    switch (type) {
      case 'full':
        return {
          title: 'Storage Full',
          message: 'Your device storage is full. The app may not function properly.',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          textColor: 'text-red-800 dark:text-red-200',
          iconColor: 'text-red-400',
          icon: (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ),
        };
      case 'critical':
        return {
          title: 'Storage Critical',
          message: 'Your device storage is critically low. Consider freeing up space.',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-800',
          textColor: 'text-orange-800 dark:text-orange-200',
          iconColor: 'text-orange-400',
          icon: (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          ),
        };
      case 'low':
        return {
          title: 'Storage Low',
          message: 'Your device storage is getting low. Consider cleaning up old data.',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          iconColor: 'text-yellow-400',
          icon: (
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          ),
        };
    }
  };

  const config = getWarningConfig(warning.type);

  return (
    <div className={`fixed top-4 right-4 max-w-md w-full z-50 animate-slide-down ${className}`}>
      <div className={`rounded-lg p-4 shadow-lg border ${config.bgColor} ${config.borderColor}`}>
        <div className="flex">
          <div className="flex-shrink-0">
            <div className={config.iconColor}>
              {config.icon}
            </div>
          </div>
          
          <div className="ml-3 flex-1">
            <h3 className={`text-sm font-medium ${config.textColor}`}>
              {config.title}
            </h3>
            
            <div className={`mt-2 text-sm ${config.textColor}`}>
              <p>{config.message}</p>
              
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>Used: {formatBytes(warning.usage)}</span>
                  <span>Available: {formatBytes(warning.available)}</span>
                </div>
                
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      warning.type === 'full' ? 'bg-red-500' :
                      warning.type === 'critical' ? 'bg-orange-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.min(warning.percentUsed, 100)}%` }}
                  ></div>
                </div>
                
                <div className="text-xs mt-1">
                  {warning.percentUsed.toFixed(1)}% used
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={handleClearCache}
                disabled={isClearing}
                className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded ${config.textColor} hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-white disabled:opacity-50`}
              >
                {isClearing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Clearing...
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Clear Cache
                  </>
                )}
              </button>
              
              <button
                onClick={handleClearOldMedia}
                disabled={isClearing}
                className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded ${config.textColor} hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-white disabled:opacity-50`}
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Clear Old Media
              </button>
              
              <button
                onClick={handleManageStorage}
                className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded ${config.textColor} hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-white`}
              >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
                Manage Storage
              </button>
            </div>
          </div>
          
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className={`inline-flex ${config.textColor} hover:bg-black hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-white rounded-md p-1.5`}
            >
              <span className="sr-only">Dismiss</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact storage indicator for status bars
export function StorageIndicator({ className = '' }: { className?: string }): JSX.Element | null {
  const [storageInfo, setStorageInfo] = useState<any>(null);

  useEffect(() => {
    const checkStorage = async () => {
      try {
        const info = await opfsStorage.getStorageInfo();
        setStorageInfo(info);
      } catch (error) {
        console.error('Failed to get storage info:', error);
      }
    };

    checkStorage();
    const interval = setInterval(checkStorage, 30 * 1000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (!storageInfo || storageInfo.percentUsed < 70) {
    return null;
  }

  const getIndicatorColor = (percentUsed: number): string => {
    if (percentUsed >= 95) return 'text-red-500';
    if (percentUsed >= 85) return 'text-orange-500';
    return 'text-yellow-500';
  };

  return (
    <div className={`inline-flex items-center space-x-1 ${className}`}>
      <svg className={`w-4 h-4 ${getIndicatorColor(storageInfo.percentUsed)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M9 12l2 2 4-4" />
      </svg>
      <span className={`text-xs ${getIndicatorColor(storageInfo.percentUsed)}`}>
        {storageInfo.percentUsed.toFixed(0)}%
      </span>
    </div>
  );
}
