import { useState, useEffect } from 'react';
import { db } from '@/lib/database';
import { opfsStorage, StorageUtils } from '@/lib/storage';
import { preferences } from '@/lib/preferences';
import { pwaService } from '@/lib/pwa';

interface StorageDiagnosticsProps {
  className?: string;
}

interface StorageData {
  total: {
    quota: number;
    usage: number;
    available: number;
    percentUsed: number;
  };
  breakdown: {
    database: number;
    media: number;
    cache: number;
    preferences: number;
    other: number;
  };
  persistent: boolean;
  lastUpdated: Date;
}

export default function StorageDiagnostics({ className = '' }: StorageDiagnosticsProps): JSX.Element {
  const [storageData, setStorageData] = useState<StorageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStorageData = async () => {
    try {
      setError(null);
      
      // Get overall storage info
      const storageInfo = await opfsStorage.getStorageInfo();
      
      // Get preferences storage
      const preferencesUsage = await preferences.getStorageUsage();
      
      // Check persistent storage
      const persistentGranted = await navigator.storage?.persist?.() || false;
      
      setStorageData({
        total: {
          quota: storageInfo.quota,
          usage: storageInfo.usage,
          available: storageInfo.available,
          percentUsed: storageInfo.percentUsed,
        },
        breakdown: {
          database: storageInfo.breakdown.database,
          media: storageInfo.breakdown.media,
          cache: storageInfo.breakdown.cache,
          preferences: preferencesUsage.total,
          other: storageInfo.breakdown.other,
        },
        persistent: persistentGranted,
        lastUpdated: new Date(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load storage data');
      console.error('Storage diagnostics error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadStorageData();
  };

  const handleRequestPersistent = async () => {
    try {
      if ('storage' in navigator && 'persist' in navigator.storage) {
        const granted = await navigator.storage.persist();
        if (granted) {
          await loadStorageData();
        } else {
          alert('Persistent storage request was denied. This may happen due to browser policies or insufficient storage space.');
        }
      } else {
        alert('Persistent storage is not supported in this browser.');
      }
    } catch (error) {
      console.error('Failed to request persistent storage:', error);
      alert('Failed to request persistent storage. Please try again.');
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Are you sure you want to clear the cache? This will remove offline data and may slow down the next app load.')) {
      return;
    }

    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
        await loadStorageData();
        alert('Cache cleared successfully!');
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      alert('Failed to clear cache. Please try again.');
    }
  };

  const handleClearMedia = async () => {
    if (!confirm('Are you sure you want to delete all media files? This action cannot be undone.')) {
      return;
    }

    try {
      await opfsStorage.clearAllMedia();
      await loadStorageData();
      alert('All media files have been deleted.');
    } catch (error) {
      console.error('Failed to clear media:', error);
      alert('Failed to clear media files. Please try again.');
    }
  };

  useEffect(() => {
    loadStorageData();
  }, []);

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Storage Error
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!storageData) return null;

  const isStorageLow = storageData.total.percentUsed > 80;
  const isStorageCritical = storageData.total.percentUsed > 95;

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Storage Diagnostics
          </h3>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {isRefreshing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Storage Warning */}
        {(isStorageLow || isStorageCritical) && (
          <div className={`p-4 rounded-lg ${isStorageCritical ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'}`}>
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className={`h-5 w-5 ${isStorageCritical ? 'text-red-400' : 'text-yellow-400'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className={`text-sm font-medium ${isStorageCritical ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                  {isStorageCritical ? 'Storage Critical' : 'Storage Low'}
                </h3>
                <div className={`mt-2 text-sm ${isStorageCritical ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                  <p>
                    Your storage is {isStorageCritical ? 'critically low' : 'running low'} ({storageData.total.percentUsed.toFixed(1)}% used).
                    {isStorageCritical ? ' The app may not function properly.' : ' Consider cleaning up some data.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Overall Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Overall Usage
            </h4>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {StorageUtils.formatBytes(storageData.total.usage)} of {StorageUtils.formatBytes(storageData.total.quota)}
            </span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                isStorageCritical
                  ? 'bg-red-500'
                  : isStorageLow
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(storageData.total.percentUsed, 100)}%` }}
            ></div>
          </div>
          
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {StorageUtils.formatBytes(storageData.total.available)} available
            {storageData.persistent && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Persistent
              </span>
            )}
          </div>
        </div>

        {/* Breakdown */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Storage Breakdown
          </h4>
          
          <div className="space-y-3">
            {Object.entries(storageData.breakdown).map(([type, size]) => {
              const percentage = storageData.total.usage > 0 ? (size / storageData.total.usage) * 100 : 0;
              const colors = {
                database: 'bg-blue-500',
                media: 'bg-purple-500',
                cache: 'bg-green-500',
                preferences: 'bg-yellow-500',
                other: 'bg-gray-500',
              };
              
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full ${colors[type as keyof typeof colors]} mr-2`}></div>
                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                      {type === 'preferences' ? 'Settings' : type}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {StorageUtils.formatBytes(size)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Storage Actions
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!storageData.persistent && (
              <button
                onClick={handleRequestPersistent}
                className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Request Persistent Storage
              </button>
            )}
            
            <button
              onClick={handleClearCache}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Cache
            </button>
            
            <button
              onClick={handleClearMedia}
              className="inline-flex items-center justify-center px-4 py-2 border border-red-300 dark:border-red-600 text-sm font-medium rounded-md text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Media Files
            </button>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Last updated: {storageData.lastUpdated.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
