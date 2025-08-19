import { useState, useEffect } from 'react';
import { securityManager, SecurityUtils } from '@/lib/security';
import { privacyManager } from '@/lib/privacy';

interface SecurityDashboardProps {
  className?: string;
}

export default function SecurityDashboard({ className = '' }: SecurityDashboardProps): JSX.Element {
  const [securityScore, setSecurityScore] = useState(0);
  const [securityAudit, setSecurityAudit] = useState<any>(null);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);
  const [privacySettings, setPrivacySettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningAudit, setIsRunningAudit] = useState(false);

  const loadSecurityData = async () => {
    try {
      const [audit, events, settings] = await Promise.all([
        securityManager.performSecurityAudit(),
        Promise.resolve(securityManager.getSecurityEvents()),
        privacyManager.getSettings(),
      ]);

      setSecurityAudit(audit);
      setSecurityScore(audit.score);
      setSecurityEvents(events.slice(-10)); // Last 10 events
      setPrivacySettings(settings);
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const runSecurityAudit = async () => {
    setIsRunningAudit(true);
    try {
      const audit = await securityManager.performSecurityAudit();
      setSecurityAudit(audit);
      setSecurityScore(audit.score);
    } catch (error) {
      console.error('Security audit failed:', error);
    } finally {
      setIsRunningAudit(false);
    }
  };

  const clearSecurityEvents = () => {
    securityManager.clearSecurityEvents();
    setSecurityEvents([]);
  };

  useEffect(() => {
    loadSecurityData();

    // Listen for security events
    const handleSecurityEvent = (event: any) => {
      setSecurityEvents(prev => [...prev.slice(-9), event]);
    };

    securityManager.on('securityEvent', handleSecurityEvent);

    return () => {
      securityManager.off('securityEvent', handleSecurityEvent);
    };
  }, []);

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBackground = (score: number): string => {
    if (score >= 90) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 70) return 'bg-yellow-100 dark:bg-yellow-900/20';
    if (score >= 50) return 'bg-orange-100 dark:bg-orange-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const browserFeatures = SecurityUtils.getBrowserSecurityFeatures();

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="ds-card-header">
        <div className="ds-card-header__content">
          <div className="ds-avatar" style={{ backgroundColor: 'var(--color-neutral-black)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-neutral-white)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="ds-card-header__title">Security</h3>
            <p className="ds-card-header__subtitle">System protection status</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Security Score */}
          <div className="ds-stat text-right">
            <div className="ds-stat__value ds-text-2xl">{securityScore}</div>
            <div className="ds-stat__label">
              {securityScore >= 90 ? 'Excellent' : securityScore >= 70 ? 'Good' : securityScore >= 50 ? 'Fair' : 'Poor'}
            </div>
          </div>
            
          <button
            onClick={runSecurityAudit}
            disabled={isRunningAudit}
            className="ds-button ds-button--secondary ds-text-sm"
          >
            {isRunningAudit ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Auditing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Run Audit
              </>
            )}
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Browser Security Features */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Browser Security Features
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(browserFeatures).map(([feature, supported]) => (
              <div key={feature} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${supported ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                  {feature.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Security Issues */}
        {securityAudit?.issues && securityAudit.issues.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
              Security Issues ({securityAudit.issues.length})
            </h4>
            
            <div className="space-y-2">
              {securityAudit.issues.map((issue: any, index: number) => (
                <div key={index} className={`flex items-start space-x-3 p-3 rounded-lg ${getSeverityColor(issue.severity)}`}>
                  <div className="flex-shrink-0 mt-0.5">
                    {issue.severity === 'critical' && (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                    {issue.severity === 'high' && (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                    {(issue.severity === 'medium' || issue.severity === 'low') && (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium uppercase tracking-wide">
                        {issue.severity}
                      </span>
                    </div>
                    <p className="text-sm mt-1">{issue.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security Recommendations */}
        {securityAudit?.recommendations && securityAudit.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
              Security Recommendations
            </h4>
            
            <div className="space-y-2">
              {securityAudit.recommendations.map((recommendation: string, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">{recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Security Events */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Recent Security Events ({securityEvents.length})
            </h4>
            {securityEvents.length > 0 && (
              <button
                onClick={clearSecurityEvents}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                Clear All
              </button>
            )}
          </div>
          
          {securityEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-sm">No security events recorded</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {securityEvents.map((event) => (
                <div key={event.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                    event.severity === 'critical' ? 'bg-red-500' :
                    event.severity === 'high' ? 'bg-orange-500' :
                    event.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100 uppercase">
                        {event.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 truncate">
                      {event.details}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Privacy Settings Summary */}
        {privacySettings && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
              Privacy Settings
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Analytics</span>
                <div className={`w-3 h-3 rounded-full ${privacySettings.analyticsEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Crash Reports</span>
                <div className={`w-3 h-3 rounded-full ${privacySettings.crashReportingEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm text-gray-700 dark:text-gray-300">Auto Delete</span>
                <div className={`w-3 h-3 rounded-full ${privacySettings.autoDeleteEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
            </div>
          </div>
        )}

        {/* Security Score Breakdown */}
        {securityAudit && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
              Security Score Breakdown
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Overall Security</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        securityScore >= 90 ? 'bg-green-500' :
                        securityScore >= 70 ? 'bg-yellow-500' :
                        securityScore >= 50 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${securityScore}%` }}
                    ></div>
                  </div>
                  <span className={`text-sm font-medium ${getScoreColor(securityScore)}`}>
                    {securityScore}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
