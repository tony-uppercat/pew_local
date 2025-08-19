import { useState, useEffect } from 'react';
import { pwaService } from '@/lib/pwa';

interface PWAUpdateNotificationProps {
  className?: string;
}

export default function PWAUpdateNotification({
  className = '',
}: PWAUpdateNotificationProps): JSX.Element | null {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    // Check initial state
    setHasUpdate(pwaService.hasUpdateAvailable());

    // Listen for update events
    const handleUpdateAvailable = () => {
      setHasUpdate(true);
      setShowNotification(true);
    };

    const handleUpdateActivated = () => {
      setHasUpdate(false);
      setIsUpdating(false);
      setShowNotification(false);
      
      // Show success message briefly
      const successToast = document.createElement('div');
      successToast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
      successToast.textContent = 'App updated successfully!';
      document.body.appendChild(successToast);
      
      setTimeout(() => {
        successToast.remove();
      }, 3000);
    };

    pwaService.on('updateAvailable', handleUpdateAvailable);
    pwaService.on('updateActivated', handleUpdateActivated);

    return () => {
      pwaService.off('updateAvailable', handleUpdateAvailable);
      pwaService.off('updateActivated', handleUpdateActivated);
    };
  }, []);

  const handleUpdate = async () => {
    if (isUpdating) return;

    setIsUpdating(true);
    try {
      await pwaService.updateServiceWorker();
      // The page will reload automatically after update
    } catch (error) {
      console.error('Failed to update app:', error);
      setIsUpdating(false);
      
      // Show error message
      const errorToast = document.createElement('div');
      errorToast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in';
      errorToast.textContent = 'Failed to update app. Please try again.';
      document.body.appendChild(errorToast);
      
      setTimeout(() => {
        errorToast.remove();
      }, 5000);
    }
  };

  const handleDismiss = () => {
    setShowNotification(false);
  };

  if (!hasUpdate || !showNotification) {
    return null;
  }

  return (
    <div className={`fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm w-full z-40 animate-slide-down ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Update Available
            </h4>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Dismiss notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            A new version of the app is available with improvements and bug fixes.
          </p>
          
          <div className="mt-3 flex space-x-2">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUpdating ? (
                <>
                  <svg
                    className="animate-spin -ml-0.5 mr-1 h-3 w-3"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Updating...
                </>
              ) : (
                'Update Now'
              )}
            </button>
            
            <button
              onClick={handleDismiss}
              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact version for mobile
export function PWAUpdateBanner({ className = '' }: { className?: string }): JSX.Element | null {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setHasUpdate(pwaService.hasUpdateAvailable());

    const handleUpdateAvailable = () => setHasUpdate(true);
    const handleUpdateActivated = () => {
      setHasUpdate(false);
      setIsUpdating(false);
    };

    pwaService.on('updateAvailable', handleUpdateAvailable);
    pwaService.on('updateActivated', handleUpdateActivated);

    return () => {
      pwaService.off('updateAvailable', handleUpdateAvailable);
      pwaService.off('updateActivated', handleUpdateActivated);
    };
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await pwaService.updateServiceWorker();
    } catch (error) {
      console.error('Failed to update:', error);
      setIsUpdating(false);
    }
  };

  if (!hasUpdate) return null;

  return (
    <div className={`bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg
              className="h-4 w-4 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="ml-2 text-sm text-blue-700 dark:text-blue-300">
            App update available
          </p>
        </div>
        
        <button
          onClick={handleUpdate}
          disabled={isUpdating}
          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 disabled:opacity-50"
        >
          {isUpdating ? 'Updating...' : 'Update'}
        </button>
      </div>
    </div>
  );
}
