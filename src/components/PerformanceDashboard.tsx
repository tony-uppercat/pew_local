import { useState, useEffect } from 'react';
import { performanceMonitor, usePerformanceMonitor, PerformanceUtils } from '@/lib/performance';
import { useWorkerStatus } from '@/lib/worker-manager';

interface PerformanceDashboardProps {
  className?: string;
  compact?: boolean;
}

export default function PerformanceDashboard({
  className = '',
  compact = false,
}: PerformanceDashboardProps): JSX.Element {
  const { metrics, score } = usePerformanceMonitor();
  const workerStats = useWorkerStatus();
  const [report, setReport] = useState<any>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const generateReport = async () => {
    setIsGeneratingReport(true);
    try {
      // Use requestIdleCallback to avoid blocking the main thread
      PerformanceUtils.requestIdleCallback(() => {
        const newReport = performanceMonitor.generateReport();
        setReport(newReport);
        setIsGeneratingReport(false);
      });
    } catch (error) {
      console.error('Failed to generate performance report:', error);
      setIsGeneratingReport(false);
    }
  };

  useEffect(() => {
    // Generate initial report
    generateReport();
  }, []);

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBackground = (score: number): string => {
    if (score >= 90) return 'bg-green-100 dark:bg-green-900/20';
    if (score >= 70) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  const formatMetric = (value: number | undefined, unit: string = 'ms'): string => {
    if (value === undefined) return 'N/A';
    if (unit === 'ms') return `${Math.round(value)}ms`;
    if (unit === 'score') return `${value.toFixed(2)}`;
    return `${value}${unit}`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (compact) {
    return (
      <div className={className}>
        <div className="ds-card-header">
          <div className="ds-card-header__content">
            <div className="ds-avatar" style={{ backgroundColor: 'var(--color-primary-accent)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--color-neutral-black)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="ds-card-header__title">Performance</h3>
              <p className="ds-card-header__subtitle">Core Web Vitals</p>
            </div>
          </div>
          <div className="ds-stat">
            <div className="ds-stat__value ds-text-2xl">{score}</div>
            <div className="ds-stat__label">Score</div>
          </div>
        </div>

        {/* Core Web Vitals */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {metrics.lcp && (
            <div className="ds-stat">
              <div className="ds-stat__value ds-text-lg">{formatMetric(metrics.lcp)}</div>
              <div className="ds-stat__label">LCP</div>
              <span className={`ds-badge ${metrics.lcp <= 2500 ? 'ds-badge--success' : 'ds-badge--neutral'}`}>
                {metrics.lcp <= 2500 ? 'Good' : 'Poor'}
              </span>
            </div>
          )}
          
          {metrics.fid && (
            <div className="ds-stat">
              <div className="ds-stat__value ds-text-lg">{formatMetric(metrics.fid)}</div>
              <div className="ds-stat__label">FID</div>
              <span className={`ds-badge ${metrics.fid <= 100 ? 'ds-badge--success' : 'ds-badge--neutral'}`}>
                {metrics.fid <= 100 ? 'Good' : 'Poor'}
              </span>
            </div>
          )}
          
          {metrics.cls !== undefined && (
            <div className="ds-stat">
              <div className="ds-stat__value ds-text-lg">{formatMetric(metrics.cls, 'score')}</div>
              <div className="ds-stat__label">CLS</div>
              <span className={`ds-badge ${metrics.cls <= 0.1 ? 'ds-badge--success' : 'ds-badge--neutral'}`}>
                {metrics.cls <= 0.1 ? 'Good' : 'Poor'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Performance Dashboard
          </h3>
          
          <div className="flex items-center space-x-4">
            {/* Performance Score */}
            <div className="flex items-center space-x-2">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${getScoreBackground(score)}`}>
                <span className={getScoreColor(score)}>{score}</span>
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-900 dark:text-gray-100">Score</div>
                <div className="text-gray-500 dark:text-gray-400">
                  {score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : 'Needs Work'}
                </div>
              </div>
            </div>
            
            <button
              onClick={generateReport}
              disabled={isGeneratingReport}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {isGeneratingReport ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Refresh
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Core Web Vitals */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Core Web Vitals
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Largest Contentful Paint
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">LCP</div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${metrics.lcp && metrics.lcp <= 2500 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatMetric(metrics.lcp)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Target: &lt;2.5s
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    First Input Delay
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">FID</div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${metrics.fid && metrics.fid <= 100 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatMetric(metrics.fid)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Target: &lt;100ms
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Cumulative Layout Shift
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">CLS</div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${metrics.cls !== undefined && metrics.cls <= 0.1 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatMetric(metrics.cls, 'score')}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Target: &lt;0.1
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Additional Metrics
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatMetric(metrics.fcp)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                First Contentful Paint
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatMetric(metrics.ttfb)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Time to First Byte
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatMetric(metrics.loadTime)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Load Time
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatMetric(metrics.domContentLoaded)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                DOM Content Loaded
              </div>
            </div>
          </div>
        </div>

        {/* Memory Usage */}
        {metrics.memoryUsage && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
              Memory Usage
            </h4>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Used: {formatBytes(metrics.memoryUsage.used)}
                </span>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  Limit: {formatBytes(metrics.memoryUsage.limit)}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(metrics.memoryUsage.used / metrics.memoryUsage.limit) * 100}%` }}
                ></div>
              </div>
              
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {((metrics.memoryUsage.used / metrics.memoryUsage.limit) * 100).toFixed(1)}% used
              </div>
            </div>
          </div>
        )}

        {/* Worker Status */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
            Worker Status
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {workerStats.totalWorkers}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Total Workers
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {workerStats.availableWorkers}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Available
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {workerStats.busyWorkers}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Busy
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {workerStats.queuedTasks}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Queued Tasks
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {report && report.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
              Performance Recommendations
            </h4>
            
            <div className="space-y-2">
              {report.recommendations.map((recommendation: string, index: number) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    {recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
