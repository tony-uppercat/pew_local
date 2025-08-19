/**
 * Performance Monitoring and Optimization Utilities
 * Tracks Core Web Vitals, memory usage, and provides optimization tools
 */

interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
  
  // Custom metrics
  loadTime?: number;
  domContentLoaded?: number;
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
  
  // Navigation timing
  navigationStart?: number;
  redirectTime?: number;
  dnsTime?: number;
  connectTime?: number;
  requestTime?: number;
  responseTime?: number;
  domProcessingTime?: number;
}

interface PerformanceBudget {
  lcp: number; // 2.5s
  fid: number; // 100ms
  cls: number; // 0.1
  fcp: number; // 1.8s
  ttfb: number; // 600ms
  loadTime: number; // 3s
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private budget: PerformanceBudget;
  private observers = new Map<string, PerformanceObserver>();
  private listeners = new Map<string, Set<(data: any) => void>>();
  private isMonitoring = false;

  constructor() {
    this.budget = {
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      fcp: 1800,
      ttfb: 600,
      loadTime: 3000,
    };

    this.initialize();
  }

  private initialize(): void {
    if (typeof window === 'undefined') return;

    // Start monitoring when page loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.startMonitoring());
    } else {
      this.startMonitoring();
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    this.isMonitoring = true;

    this.measureNavigationTiming();
    this.observeCoreWebVitals();
    this.observeMemoryUsage();
    this.observeResourceTiming();
    
    console.log('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    this.isMonitoring = false;

    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    console.log('Performance monitoring stopped');
  }

  /**
   * Measure navigation timing
   */
  private measureNavigationTiming(): void {
    if (!('performance' in window) || !performance.timing) return;

    const timing = performance.timing;
    const navigationStart = timing.navigationStart;

    this.metrics.navigationStart = navigationStart;
    this.metrics.redirectTime = timing.redirectEnd - timing.redirectStart;
    this.metrics.dnsTime = timing.domainLookupEnd - timing.domainLookupStart;
    this.metrics.connectTime = timing.connectEnd - timing.connectStart;
    this.metrics.requestTime = timing.responseStart - timing.requestStart;
    this.metrics.responseTime = timing.responseEnd - timing.responseStart;
    this.metrics.domProcessingTime = timing.domComplete - timing.domLoading;
    this.metrics.loadTime = timing.loadEventEnd - navigationStart;
    this.metrics.domContentLoaded = timing.domContentLoadedEventEnd - navigationStart;
    this.metrics.ttfb = timing.responseStart - navigationStart;

    this.emit('navigationTiming', this.metrics);
  }

  /**
   * Observe Core Web Vitals
   */
  private observeCoreWebVitals(): void {
    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          this.metrics.lcp = lastEntry.startTime;
          this.emit('lcp', { value: this.metrics.lcp, rating: this.getRating('lcp', this.metrics.lcp) });
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // First Contentful Paint (FCP)
      try {
        const fcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint') as any;
          if (fcpEntry) {
            this.metrics.fcp = fcpEntry.startTime;
            this.emit('fcp', { value: this.metrics.fcp, rating: this.getRating('fcp', this.metrics.fcp) });
          }
        });
        
        fcpObserver.observe({ entryTypes: ['paint'] });
        this.observers.set('fcp', fcpObserver);
      } catch (e) {
        console.warn('FCP observer not supported');
      }

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.metrics.fid = entry.processingStart - entry.startTime;
            this.emit('fid', { value: this.metrics.fid, rating: this.getRating('fid', this.metrics.fid) });
          });
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          
          this.metrics.cls = clsValue;
          this.emit('cls', { value: this.metrics.cls, rating: this.getRating('cls', this.metrics.cls) });
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }
  }

  /**
   * Observe memory usage
   */
  private observeMemoryUsage(): void {
    if (!('memory' in performance)) return;

    const updateMemoryUsage = () => {
      const memory = (performance as any).memory;
      this.metrics.memoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      };
      
      this.emit('memoryUsage', this.metrics.memoryUsage);
    };

    // Update memory usage every 5 seconds
    updateMemoryUsage();
    setInterval(updateMemoryUsage, 5000);
  }

  /**
   * Observe resource timing
   */
  private observeResourceTiming(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          this.analyzeResourceTiming(entry as PerformanceResourceTiming);
        });
      });
      
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.set('resource', resourceObserver);
    } catch (e) {
      console.warn('Resource timing observer not supported');
    }
  }

  /**
   * Analyze resource timing entry
   */
  private analyzeResourceTiming(entry: PerformanceResourceTiming): void {
    const duration = entry.responseEnd - entry.startTime;
    const size = entry.transferSize || 0;
    
    // Identify slow resources
    if (duration > 1000) { // 1 second
      this.emit('slowResource', {
        name: entry.name,
        duration,
        size,
        type: this.getResourceType(entry.name),
      });
    }
    
    // Identify large resources
    if (size > 1024 * 1024) { // 1MB
      this.emit('largeResource', {
        name: entry.name,
        duration,
        size,
        type: this.getResourceType(entry.name),
      });
    }
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    
    const types: Record<string, string> = {
      'js': 'script',
      'css': 'stylesheet',
      'png': 'image',
      'jpg': 'image',
      'jpeg': 'image',
      'webp': 'image',
      'svg': 'image',
      'woff': 'font',
      'woff2': 'font',
      'ttf': 'font',
    };
    
    return types[extension || ''] || 'other';
  }

  /**
   * Get performance rating
   */
  private getRating(metric: keyof PerformanceBudget, value: number): 'good' | 'needs-improvement' | 'poor' {
    const budget = this.budget[metric];
    
    if (metric === 'cls') {
      if (value <= 0.1) return 'good';
      if (value <= 0.25) return 'needs-improvement';
      return 'poor';
    }
    
    if (value <= budget * 0.75) return 'good';
    if (value <= budget) return 'needs-improvement';
    return 'poor';
  }

  /**
   * Get current metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get performance score (0-100)
   */
  getPerformanceScore(): number {
    const scores: number[] = [];
    
    if (this.metrics.lcp) {
      scores.push(this.getMetricScore('lcp', this.metrics.lcp));
    }
    
    if (this.metrics.fid) {
      scores.push(this.getMetricScore('fid', this.metrics.fid));
    }
    
    if (this.metrics.cls !== undefined) {
      scores.push(this.getMetricScore('cls', this.metrics.cls));
    }
    
    if (this.metrics.fcp) {
      scores.push(this.getMetricScore('fcp', this.metrics.fcp));
    }
    
    if (scores.length === 0) return 0;
    
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }

  /**
   * Get metric score (0-100)
   */
  private getMetricScore(metric: keyof PerformanceBudget, value: number): number {
    const budget = this.budget[metric];
    
    if (metric === 'cls') {
      if (value <= 0.1) return 100;
      if (value <= 0.25) return 75;
      return Math.max(0, 100 - (value - 0.25) * 200);
    }
    
    if (value <= budget * 0.5) return 100;
    if (value <= budget) return Math.max(50, 100 - ((value - budget * 0.5) / (budget * 0.5)) * 50);
    return Math.max(0, 50 - ((value - budget) / budget) * 50);
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    score: number;
    metrics: PerformanceMetrics;
    recommendations: string[];
    budgetStatus: Record<string, { value: number; budget: number; status: 'pass' | 'fail' }>;
  } {
    const recommendations: string[] = [];
    const budgetStatus: Record<string, any> = {};
    
    // Check each metric against budget
    Object.entries(this.budget).forEach(([key, budget]) => {
      const value = this.metrics[key as keyof PerformanceMetrics] as number;
      
      if (value !== undefined) {
        const status = value <= budget ? 'pass' : 'fail';
        budgetStatus[key] = { value, budget, status };
        
        if (status === 'fail') {
          recommendations.push(this.getRecommendation(key as keyof PerformanceBudget, value, budget));
        }
      }
    });
    
    // Memory usage recommendations
    if (this.metrics.memoryUsage) {
      const { used, total, limit } = this.metrics.memoryUsage;
      const usagePercent = (used / limit) * 100;
      
      if (usagePercent > 80) {
        recommendations.push('High memory usage detected. Consider optimizing JavaScript and reducing memory leaks.');
      }
    }
    
    return {
      score: this.getPerformanceScore(),
      metrics: this.getMetrics(),
      recommendations,
      budgetStatus,
    };
  }

  /**
   * Get recommendation for metric
   */
  private getRecommendation(metric: keyof PerformanceBudget, value: number, budget: number): string {
    const recommendations: Record<string, string> = {
      lcp: 'Optimize your largest contentful paint by reducing server response times, optimizing images, and removing render-blocking resources.',
      fid: 'Improve first input delay by reducing JavaScript execution time and breaking up long tasks.',
      cls: 'Reduce cumulative layout shift by setting dimensions for images and ads, and avoiding inserting content above existing content.',
      fcp: 'Improve first contentful paint by optimizing server response times and eliminating render-blocking resources.',
      ttfb: 'Reduce time to first byte by optimizing server performance and using a CDN.',
      loadTime: 'Improve load time by optimizing images, minifying resources, and enabling compression.',
    };
    
    return recommendations[metric] || `Optimize ${metric} performance (current: ${value}, target: ${budget})`;
  }

  /**
   * Event system
   */
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

  private emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  /**
   * Update performance budget
   */
  updateBudget(budget: Partial<PerformanceBudget>): void {
    this.budget = { ...this.budget, ...budget };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.stopMonitoring();
    this.listeners.clear();
  }
}

// Performance optimization utilities
export const PerformanceUtils = {
  /**
   * Debounce function for performance
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  },

  /**
   * Throttle function for performance
   */
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Request idle callback with fallback
   */
  requestIdleCallback(callback: () => void, timeout: number = 5000): void {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(callback, { timeout });
    } else {
      setTimeout(callback, 1);
    }
  },

  /**
   * Measure function execution time
   */
  measureTime<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    console.log(`${name}: ${(end - start).toFixed(2)}ms`);
    return result;
  },

  /**
   * Check if device has limited resources
   */
  isLowEndDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    
    // Check hardware concurrency
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
      return true;
    }
    
    // Check memory (if available)
    if ('deviceMemory' in navigator && (navigator as any).deviceMemory <= 4) {
      return true;
    }
    
    // Check connection (if available)
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        return true;
      }
    }
    
    return false;
  },

  /**
   * Preload critical resources
   */
  preloadResource(href: string, as: string): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    link.as = as;
    document.head.appendChild(link);
  },

  /**
   * Prefetch next page resources
   */
  prefetchResource(href: string): void {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  },
};

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  if (typeof window === 'undefined') {
    return {
      metrics: {} as PerformanceMetrics,
      score: 0,
    };
  }

  const { useState, useEffect } = require('react');
  
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [score, setScore] = useState(0);

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getMetrics());
      setScore(performanceMonitor.getPerformanceScore());
    };

    // Initial update
    updateMetrics();

    // Listen for metric updates
    const events = ['lcp', 'fid', 'cls', 'fcp', 'memoryUsage'];
    events.forEach(event => {
      performanceMonitor.on(event, updateMetrics);
    });

    return () => {
      events.forEach(event => {
        performanceMonitor.off(event, updateMetrics);
      });
    };
  }, []);

  return { metrics, score };
}

export default performanceMonitor;
