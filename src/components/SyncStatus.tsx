import { useState, useEffect } from 'react';
import { syncManager } from '@/lib/sync';
import type { SyncStatus as SyncStatusType } from '@/lib/sync';

interface SyncStatusProps {
  className?: string;
  compact?: boolean;
}

export default function SyncStatus({ className = '', compact = false }: SyncStatusProps): JSX.Element {
  const [status, setStatus] = useState<SyncStatusType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  const loadStatus = async () => {
    try {
      const currentStatus = await syncManager.getStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error('Failed to load sync status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForceSync = async () => {
    try {
      await syncManager.forcSync();
      await loadStatus();
    } catch (error) {
      console.error('Failed to force sync:', error);
      alert('Sync failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleRetryFailed = async () => {
    try {
      await syncManager.retryFailedItems();
      await loadStatus();
    } catch (error) {
      console.error('Failed to retry sync:', error);
      alert('Retry failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  useEffect(() => {
    loadStatus();

    // Listen for sync events
    const handleSyncUpdate = () => {
      loadStatus();
    };

    syncManager.on('statusChange', handleSyncUpdate);
    syncManager.on('queueUpdated', handleSyncUpdate);
    syncManager.on('syncCompleted', handleSyncUpdate);
    syncManager.on('syncError', handleSyncUpdate);

    return () => {
      syncManager.off('statusChange', handleSyncUpdate);
      syncManager.off('queueUpdated', handleSyncUpdate);
      syncManager.off('syncCompleted', handleSyncUpdate);
      syncManager.off('syncError', handleSyncUpdate);
    };
  }, []);

  if (isLoading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className={`text-gray-500 dark:text-gray-400 text-sm ${className}`}>
        Sync unavailable
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-2 ${className}`}>
        {/* Status Indicator */}
        <div className="flex items-center">
          {status.isSync ? (
            <div className="flex items-center text-blue-600 dark:text-blue-400">
              <svg className="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xs">Syncing</span>
            </div>
          ) : !status.isOnline ? (
            <div className="flex items-center text-yellow-600 dark:text-yellow-400">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
              <span className="text-xs">Offline</span>
            </div>
          ) : status.pendingCount > 0 ? (
            <div className="flex items-center text-orange-600 dark:text-orange-400">
              <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
              <span className="text-xs">{status.pendingCount} pending</span>
            </div>
          ) : status.errors.length > 0 ? (
            <div className="flex items-center text-red-600 dark:text-red-400">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
              <span className="text-xs">{status.errors.length} errors</span>
            </div>
          ) : (
            <div className="flex items-center text-green-600 dark:text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
              <span className="text-xs">Synced</span>
            </div>
          )}
        </div>

        {/* Sync Button */}
        {status.isOnline && !status.isSync && (
          <button
            onClick={handleForceSync}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title="Force sync"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Sync Status
          </h3>
          
          <div className="flex items-center space-x-2">
            {/* Status Badge */}
            {status.isSync ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                <svg className="animate-spin w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing
              </span>
            ) : !status.isOnline ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-1"></div>
                Offline
              </span>
            ) : status.errors.length > 0 ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-1"></div>
                Errors
              </span>
            ) : status.pendingCount > 0 ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200">
                <div className="w-2 h-2 bg-orange-500 rounded-full mr-1"></div>
                Pending
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
                Up to date
              </span>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-1">
              {status.isOnline && !status.isSync && (
                <button
                  onClick={handleForceSync}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  title="Force sync"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
              
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="Toggle details"
              >
                <svg className={`w-4 h-4 transform transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="px-4 py-3 space-y-3">
          {/* Status Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Connection:</span>
              <span className={`ml-2 font-medium ${status.isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {status.isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            
            <div>
              <span className="text-gray-500 dark:text-gray-400">Pending items:</span>
              <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                {status.pendingCount}
              </span>
            </div>
            
            {status.lastSyncDate && (
              <div className="col-span-2">
                <span className="text-gray-500 dark:text-gray-400">Last sync:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-gray-100">
                  {status.lastSyncDate.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          {/* Errors */}
          {status.errors.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Sync Errors ({status.errors.length})
                </h4>
                <button
                  onClick={handleRetryFailed}
                  disabled={!status.isOnline}
                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Retry All
                </button>
              </div>
              
              <div className="space-y-2">
                {status.errors.slice(0, 3).map((error, index) => (
                  <div key={index} className="p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                    <div className="text-xs font-medium text-red-800 dark:text-red-200">
                      {error.operation.entityType} {error.operation.operation} (ID: {error.operation.entityId})
                    </div>
                    <div className="text-xs text-red-600 dark:text-red-300 mt-1">
                      {error.error}
                    </div>
                  </div>
                ))}
                
                {status.errors.length > 3 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    And {status.errors.length - 3} more errors...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Offline Notice */}
          {!status.isOnline && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Working Offline
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <p>
                      Your changes are being saved locally and will sync automatically when you're back online.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sync Complete */}
          {status.isOnline && status.pendingCount === 0 && status.errors.length === 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                    All Synced
                  </h3>
                  <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                    <p>All your data is up to date and synchronized.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
