import { useState, useEffect } from 'react';
import { pwaService } from '@/lib/pwa';

interface OfflineIndicatorProps {
  className?: string;
  showWhenOnline?: boolean;
  position?: 'top' | 'bottom';
}

export default function OfflineIndicator({
  className = '',
  showWhenOnline = false,
  position = 'top',
}: OfflineIndicatorProps): JSX.Element | null {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true);
      
      if (wasOffline) {
        // Show "back online" message briefly
        setShowIndicator(true);
        setTimeout(() => {
          setShowIndicator(false);
          setWasOffline(false);
        }, 3000);
      } else if (!showWhenOnline) {
        setShowIndicator(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
      setWasOffline(true);
    };

    // PWA service events
    pwaService.on('online', handleOnline);
    pwaService.on('offline', handleOffline);

    // Browser events (fallback)
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      pwaService.off('online', handleOnline);
      pwaService.off('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline, showWhenOnline]);

  if (!showIndicator && (!showWhenOnline || isOnline)) {
    return null;
  }

  const positionClasses = position === 'top' ? 'top-0' : 'bottom-0';
  const animationClasses = position === 'top' ? 'animate-slide-down' : 'animate-slide-up';

  return (
    <div
      className={`fixed left-0 right-0 ${positionClasses} z-50 ${animationClasses} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div
        className={`mx-4 mt-2 rounded-lg px-4 py-3 shadow-lg ${
          isOnline
            ? 'bg-green-500 text-white'
            : 'bg-yellow-500 text-yellow-900'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {isOnline ? (
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            )}
          </div>
          
          <div className="flex-1">
            <p className="text-sm font-medium">
              {isOnline ? 'Back Online' : 'You\'re Offline'}
            </p>
            <p className="text-xs opacity-90 mt-0.5">
              {isOnline
                ? 'Your data will sync automatically'
                : 'Don\'t worry, your data is saved locally'
              }
            </p>
          </div>
          
          {/* Connection strength indicator */}
          <div className="flex-shrink-0">
            <ConnectionStrengthIndicator isOnline={isOnline} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Connection strength indicator component
function ConnectionStrengthIndicator({ isOnline }: { isOnline: boolean }): JSX.Element {
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    // Check connection type if available
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      const updateConnectionInfo = () => {
        setConnectionType(connection.effectiveType || connection.type || 'unknown');
      };
      
      updateConnectionInfo();
      connection.addEventListener('change', updateConnectionInfo);
      
      return () => {
        connection.removeEventListener('change', updateConnectionInfo);
      };
    }
    
    return undefined;
  }, []);

  if (!isOnline) {
    return (
      <div className="flex space-x-0.5">
        {[1, 2, 3].map((bar) => (
          <div
            key={bar}
            className="w-1 h-4 bg-current opacity-30 rounded-sm"
          />
        ))}
      </div>
    );
  }

  const getSignalStrength = (type: string): number => {
    switch (type) {
      case 'slow-2g':
      case '2g':
        return 1;
      case '3g':
        return 2;
      case '4g':
      case 'fast':
        return 3;
      default:
        return 3;
    }
  };

  const strength = getSignalStrength(connectionType);

  return (
    <div className="flex space-x-0.5" title={`Connection: ${connectionType}`}>
      {[1, 2, 3].map((bar) => (
        <div
          key={bar}
          className={`w-1 rounded-sm transition-opacity duration-200 ${
            bar <= strength
              ? 'bg-current opacity-100'
              : 'bg-current opacity-30'
          }`}
          style={{ height: `${bar * 4 + 4}px` }}
        />
      ))}
    </div>
  );
}

// Compact version for status bars
export function OfflineStatus({ className = '' }: { className?: string }): JSX.Element | null {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    pwaService.on('online', handleOnline);
    pwaService.on('offline', handleOffline);

    return () => {
      pwaService.off('online', handleOnline);
      pwaService.off('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className={`inline-flex items-center space-x-1 text-xs ${className}`}>
      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
      <span className="text-yellow-700 dark:text-yellow-300">Offline</span>
    </div>
  );
}

// Network status hook for other components
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    pwaService.on('online', handleOnline);
    pwaService.on('offline', handleOffline);

    // Check connection type
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      const updateConnectionInfo = () => {
        setConnectionType(connection.effectiveType || connection.type || 'unknown');
      };
      
      updateConnectionInfo();
      connection.addEventListener('change', updateConnectionInfo);
      
      return () => {
        pwaService.off('online', handleOnline);
        pwaService.off('offline', handleOffline);
        connection.removeEventListener('change', updateConnectionInfo);
      };
    }

    return () => {
      pwaService.off('online', handleOnline);
      pwaService.off('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    connectionType,
    isSlowConnection: ['slow-2g', '2g'].includes(connectionType),
  };
}
