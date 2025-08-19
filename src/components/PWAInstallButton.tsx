import React, { useState, useEffect } from 'react';
import { pwaService, PWAUtils } from '@/lib/pwa';

interface PWAInstallButtonProps {
  className?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'minimal';
  showOnlyWhenAvailable?: boolean;
}

export default function PWAInstallButton({
  className = '',
  children,
  variant = 'primary',
  showOnlyWhenAvailable = true,
}: PWAInstallButtonProps): JSX.Element | null {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check initial state
    setCanInstall(pwaService.canInstall());
    setIsInstalled(pwaService.isStandalone());

    // Listen for PWA events
    const handleInstallPromptAvailable = () => {
      setCanInstall(true);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      setIsInstalling(false);
    };

    const handleInstallDismissed = () => {
      setCanInstall(false);
      setIsInstalling(false);
    };

    pwaService.on('installPromptAvailable', handleInstallPromptAvailable);
    pwaService.on('installed', handleInstalled);
    pwaService.on('installDismissed', handleInstallDismissed);

    return () => {
      pwaService.off('installPromptAvailable', handleInstallPromptAvailable);
      pwaService.off('installed', handleInstalled);
      pwaService.off('installDismissed', handleInstallDismissed);
    };
  }, []);

  const handleInstall = async () => {
    if (!canInstall || isInstalling) return;

    setIsInstalling(true);
    try {
      const result = await pwaService.showInstallPrompt();
      
      if (result === 'unavailable') {
        // Show manual install instructions for iOS Safari
        if (PWAUtils.isIOSSafari()) {
          alert(
            'To install this app on iOS:\n\n' +
            '1. Tap the Share button (square with arrow)\n' +
            '2. Scroll down and tap "Add to Home Screen"\n' +
            '3. Tap "Add" to confirm'
          );
        } else {
          alert('Installation not available on this device/browser.');
        }
      }
    } catch (error) {
      console.error('Failed to install PWA:', error);
      alert('Failed to install app. Please try again.');
    } finally {
      setIsInstalling(false);
    }
  };

  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // Don't show if install not available and showOnlyWhenAvailable is true
  if (showOnlyWhenAvailable && !canInstall && !PWAUtils.isIOSSafari()) {
    return null;
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl';
      case 'secondary':
        return 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600';
      case 'minimal':
        return 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20';
      default:
        return 'bg-primary-600 hover:bg-primary-700 text-white';
    }
  };

  const baseClasses = 'inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <button
      onClick={handleInstall}
      disabled={isInstalling}
      className={`${baseClasses} ${getVariantClasses()} ${className}`}
      aria-label={isInstalling ? 'Installing app...' : 'Install app'}
    >
      {isInstalling ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
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
          Installing...
        </>
      ) : (
        <>
          {children || (
            <>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Install App
            </>
          )}
        </>
      )}
    </button>
  );
}

// iOS Safari Install Instructions Component
export function IOSInstallInstructions({ onClose }: { onClose?: () => void }): JSX.Element {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Install App
          </h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        <div className="space-y-4 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400">
              1
            </div>
            <div>
              <p>Tap the <strong>Share</strong> button at the bottom of the screen</p>
              <div className="mt-1 flex justify-center">
                <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.50-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
                </svg>
              </div>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400">
              2
            </div>
            <p>Scroll down and tap <strong>"Add to Home Screen"</strong></p>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400">
              3
            </div>
            <p>Tap <strong>"Add"</strong> to confirm and install the app</p>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Once installed, you can access the app directly from your home screen, even when offline.
          </p>
        </div>
      </div>
    </div>
  );
}
