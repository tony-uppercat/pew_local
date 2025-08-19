import { useState, useEffect } from 'react';
import { privacyManager } from '@/lib/privacy';

interface PrivacyConsentProps {
  onAccept?: () => void;
  onDecline?: () => void;
  className?: string;
}

export default function PrivacyConsent({
  onAccept,
  onDecline,
  className = '',
}: PrivacyConsentProps): JSX.Element | null {
  const [showConsent, setShowConsent] = useState(false);
  const [consentType, setConsentType] = useState<'analytics' | 'performance' | 'functional' | 'marketing'>('analytics');
  const [description, setDescription] = useState('');
  const [consentCallbacks, setConsentCallbacks] = useState<{
    onAccept?: () => void;
    onDecline?: () => void;
  }>({});

  useEffect(() => {
    // Check if consent is required
    if (privacyManager.isConsentRequired()) {
      setShowConsent(true);
      setConsentType('analytics');
      setDescription('We use analytics to improve your experience. This includes tracking app usage and performance metrics.');
    }

    // Listen for consent requests
    const handleConsentRequest = (data: any) => {
      setShowConsent(true);
      setConsentType(data.type);
      setDescription(data.description);
      setConsentCallbacks({
        onAccept: data.onAccept,
        onDecline: data.onDecline,
      });
    };

    privacyManager.on('consentRequest', handleConsentRequest);

    return () => {
      privacyManager.off('consentRequest', handleConsentRequest);
    };
  }, []);

  const handleAccept = () => {
    consentCallbacks.onAccept?.();
    onAccept?.();
    setShowConsent(false);
  };

  const handleDecline = () => {
    consentCallbacks.onDecline?.();
    onDecline?.();
    setShowConsent(false);
  };

  const getConsentTitle = (type: string): string => {
    switch (type) {
      case 'analytics':
        return 'Analytics & Usage Data';
      case 'performance':
        return 'Performance Monitoring';
      case 'functional':
        return 'Functional Cookies';
      case 'marketing':
        return 'Marketing & Personalization';
      default:
        return 'Data Processing Consent';
    }
  };

  const getConsentIcon = (type: string): JSX.Element => {
    switch (type) {
      case 'analytics':
        return (
          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'performance':
        return (
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case 'functional':
        return (
          <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
        );
      case 'marketing':
        return (
          <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 0h10m-10 0a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2M9 12l2 2 4-4" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (!showConsent) {
    return null;
  }

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            {getConsentIcon(consentType)}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {getConsentTitle(consentType)}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your privacy matters to us
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <p className="mb-4">{description}</p>
            
            {consentType === 'analytics' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">What we collect:</h4>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>App usage patterns and feature interactions</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Performance metrics and error reports</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Device information (screen size, OS version)</span>
                  </li>
                </ul>
                
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mt-4">What we don't collect:</h4>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Personal financial data or expense details</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Personal identification information</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Location data or contacts</span>
                  </li>
                </ul>
              </div>
            )}

            {consentType === 'performance' && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">Performance monitoring helps us:</h4>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Identify and fix performance bottlenecks</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Monitor app stability and crash rates</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>Optimize loading times and responsiveness</span>
                  </li>
                </ul>
              </div>
            )}

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">Your data stays local</p>
                  <p className="text-blue-800 dark:text-blue-200">
                    All your expense data is stored locally on your device and never leaves your control.
                    This consent only covers anonymous usage analytics.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:justify-end space-y-2 sm:space-y-0 sm:space-x-3">
          <button
            onClick={handleDecline}
            className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Decline
          </button>
          
          <button
            onClick={handleAccept}
            className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Accept & Continue
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900 rounded-b-lg">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            You can change these preferences anytime in the app settings. 
            By continuing, you agree to our{' '}
            <button className="text-primary-600 dark:text-primary-400 hover:underline">
              Privacy Policy
            </button>
            {' '}and{' '}
            <button className="text-primary-600 dark:text-primary-400 hover:underline">
              Terms of Service
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

// Compact consent banner for less intrusive consent requests
export function ConsentBanner({ className = '' }: { className?: string }): JSX.Element | null {
  const [showBanner, setShowBanner] = useState(false);
  const [consentStatus, setConsentStatus] = useState<any>(null);

  useEffect(() => {
    const status = privacyManager.getConsentStatus();
    setConsentStatus(status);
    
    // Show banner if any consent is null (not granted or denied)
    const hasUnknownConsent = Object.values(status).some(consent => consent === null);
    setShowBanner(hasUnknownConsent);
  }, []);

  const handleAcceptAll = async () => {
    await privacyManager.updateSettings({
      analyticsEnabled: true,
      performanceMonitoringEnabled: true,
      personalizedExperience: true,
    });
    setShowBanner(false);
  };

  const handleDeclineAll = async () => {
    await privacyManager.updateSettings({
      analyticsEnabled: false,
      performanceMonitoringEnabled: false,
      personalizedExperience: false,
      locationTrackingEnabled: false,
      shareUsageData: false,
    });
    setShowBanner(false);
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg z-40 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="flex-1">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              We use cookies and similar technologies to improve your experience. 
              <button className="text-primary-600 dark:text-primary-400 hover:underline ml-1">
                Learn more
              </button>
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={handleDeclineAll}
              className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              Decline All
            </button>
            
            <button
              onClick={handleAcceptAll}
              className="inline-flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
