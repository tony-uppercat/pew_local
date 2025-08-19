/**
 * Lazy Loading Utilities with Intersection Observer
 * Handles images, components, and data loading optimization
 */

interface LazyLoadOptions {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
  once?: boolean;
  placeholder?: string;
  errorPlaceholder?: string;
}

interface LazyComponentOptions {
  fallback?: () => JSX.Element;
  delay?: number;
  retryCount?: number;
}

class LazyLoader {
  private observers = new Map<string, IntersectionObserver>();
  private loadedImages = new Set<string>();
  private loadingPromises = new Map<string, Promise<any>>();

  /**
   * Lazy load images with intersection observer
   */
  observeImages(options: LazyLoadOptions = {}): void {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      // Fallback: load all images immediately
      this.loadAllImages();
      return;
    }

    const {
      root = null,
      rootMargin = '50px',
      threshold = 0.1,
      once = true,
      placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0xMiA2VjEyTDE2IDhMMTIgNloiIGZpbGw9IiM5Y2EzYWYiLz4KPC9zdmc+',
      errorPlaceholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0IiBmaWxsPSIjZmVmMmYyIi8+CjxwYXRoIGQ9Ik0xMiA2VjEyTDE2IDhMMTIgNloiIGZpbGw9IiNmOTcyNzEiLz4KPC9zdmc+',
    } = options;

    const observerId = `images-${Date.now()}`;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          this.loadImage(img, placeholder, errorPlaceholder);
          
          if (once) {
            observer.unobserve(img);
          }
        }
      });
    }, { root, rootMargin, threshold });

    // Observe all images with data-lazy attribute
    const lazyImages = document.querySelectorAll('img[data-lazy]');
    lazyImages.forEach((img) => {
      observer.observe(img);
    });

    this.observers.set(observerId, observer);
  }

  /**
   * Load a single image with error handling
   */
  private async loadImage(
    img: HTMLImageElement,
    placeholder: string,
    errorPlaceholder: string
  ): Promise<void> {
    const src = img.dataset.lazy;
    if (!src || this.loadedImages.has(src)) return;

    // Set placeholder while loading
    if (!img.src || img.src === placeholder) {
      img.src = placeholder;
      img.classList.add('lazy-loading');
    }

    try {
      // Preload the image
      await this.preloadImage(src);
      
      // Image loaded successfully
      img.src = src;
      img.classList.remove('lazy-loading');
      img.classList.add('lazy-loaded');
      
      // Remove data attribute
      delete img.dataset.lazy;
      
      this.loadedImages.add(src);
    } catch (error) {
      // Image failed to load
      console.warn(`Failed to load image: ${src}`, error);
      img.src = errorPlaceholder;
      img.classList.remove('lazy-loading');
      img.classList.add('lazy-error');
    }
  }

  /**
   * Preload an image
   */
  private preloadImage(src: string): Promise<void> {
    if (this.loadingPromises.has(src)) {
      return this.loadingPromises.get(src)!;
    }

    const promise = new Promise<void>((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.loadingPromises.delete(src);
        resolve();
      };
      
      img.onerror = () => {
        this.loadingPromises.delete(src);
        reject(new Error(`Failed to load image: ${src}`));
      };
      
      img.src = src;
    });

    this.loadingPromises.set(src, promise);
    return promise;
  }

  /**
   * Fallback: load all images immediately (for browsers without IntersectionObserver)
   */
  private loadAllImages(): void {
    const lazyImages = document.querySelectorAll('img[data-lazy]') as NodeListOf<HTMLImageElement>;
    
    lazyImages.forEach((img) => {
      const src = img.dataset.lazy;
      if (src) {
        img.src = src;
        delete img.dataset.lazy;
        img.classList.add('lazy-loaded');
      }
    });
  }

  /**
   * Observe elements for lazy loading with custom callback
   */
  observeElements(
    selector: string,
    callback: (element: Element) => void,
    options: LazyLoadOptions = {}
  ): string {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      // Fallback: execute callback immediately for all elements
      const elements = document.querySelectorAll(selector);
      elements.forEach(callback);
      return 'fallback';
    }

    const {
      root = null,
      rootMargin = '50px',
      threshold = 0.1,
      once = true,
    } = options;

    const observerId = `elements-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry.target);
          
          if (once) {
            observer.unobserve(entry.target);
          }
        }
      });
    }, { root, rootMargin, threshold });

    // Observe elements
    const elements = document.querySelectorAll(selector);
    elements.forEach((element) => {
      observer.observe(element);
    });

    this.observers.set(observerId, observer);
    return observerId;
  }

  /**
   * Stop observing with specific observer ID
   */
  disconnect(observerId: string): void {
    const observer = this.observers.get(observerId);
    if (observer) {
      observer.disconnect();
      this.observers.delete(observerId);
    }
  }

  /**
   * Disconnect all observers
   */
  disconnectAll(): void {
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers.clear();
  }

  /**
   * Preload critical images
   */
  async preloadCriticalImages(urls: string[]): Promise<void> {
    const promises = urls.map((url) => this.preloadImage(url));
    
    try {
      await Promise.all(promises);
      console.log('Critical images preloaded successfully');
    } catch (error) {
      console.warn('Some critical images failed to preload:', error);
    }
  }

  /**
   * Get loading statistics
   */
  getStats(): {
    loadedCount: number;
    loadingCount: number;
    observersCount: number;
  } {
    return {
      loadedCount: this.loadedImages.size,
      loadingCount: this.loadingPromises.size,
      observersCount: this.observers.size,
    };
  }
}

// Singleton instance
export const lazyLoader = new LazyLoader();

// React hook for lazy loading
export function useLazyLoading(options: LazyLoadOptions = {}) {
  if (typeof window === 'undefined') {
    return { current: null };
  }
  
  const { useEffect, useRef } = require('react');
  
  const containerRef = useRef<HTMLElement>(null);
  const observerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      // Start observing images in the container
      lazyLoader.observeImages({
        root: containerRef.current,
        ...options,
      });
    }

    return () => {
      if (observerIdRef.current) {
        lazyLoader.disconnect(observerIdRef.current);
      }
    };
  }, []);

  return containerRef;
}

// React component for lazy images - Note: Use this in .tsx files
export function LazyImage({
  src,
  alt,
  className = '',
  placeholder,
  errorPlaceholder,
  onLoad,
  onError,
  ...props
}: {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  errorPlaceholder?: string;
  onLoad?: () => void;
  onError?: () => void;
  [key: string]: any;
}) {
  if (typeof window === 'undefined') {
    // Return props for server-side rendering
    return { src, alt, className, ...props };
  }
  
  const { useEffect, useRef, createElement } = require('react');
  
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const handleLoad = () => {
      onLoad?.();
    };

    const handleError = () => {
      onError?.();
    };

    img.addEventListener('load', handleLoad);
    img.addEventListener('error', handleError);

    return () => {
      img.removeEventListener('load', handleLoad);
      img.removeEventListener('error', handleError);
    };
  }, [onLoad, onError]);

  return createElement('img', {
    ref: imgRef,
    'data-lazy': src,
    alt,
    className: `lazy-image ${className}`,
    ...props
  });
}

// Utility function to create lazy component
export function createLazyComponent<T extends Record<string, any>>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  options: LazyComponentOptions = {}
) {
  if (typeof window === 'undefined') {
    // Return a placeholder component for SSR
    return function SSRPlaceholder(props: T) {
      const { createElement } = require('react');
      return createElement('div', {
        className: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-32'
      });
    };
  }

  const { lazy, Suspense, createElement } = require('react');
  const { fallback, delay = 0, retryCount = 3 } = options;

  const LazyComponent = lazy(async () => {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        if (delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
        
        return await importFn();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Lazy component load attempt ${attempt + 1} failed:`, error);
        
        if (attempt < retryCount) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError;
  });

  return function WrappedLazyComponent(props: T) {
    const defaultFallback = () => createElement('div', {
      className: 'animate-pulse bg-gray-200 dark:bg-gray-700 rounded h-32'
    });

    return createElement(Suspense, {
      fallback: fallback ? fallback() : defaultFallback()
    }, createElement(LazyComponent, props));
  };
}

// CSS for lazy loading animations
export const lazyLoadingCSS = `
.lazy-image {
  transition: opacity 0.3s ease, filter 0.3s ease;
}

.lazy-loading {
  opacity: 0.7;
  filter: blur(2px);
}

.lazy-loaded {
  opacity: 1;
  filter: none;
}

.lazy-error {
  opacity: 0.5;
  filter: grayscale(100%);
}

/* Skeleton loading animation */
@keyframes skeleton-loading {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton {
  background: linear-gradient(90deg, 
    var(--color-surface) 25%, 
    var(--color-border) 50%, 
    var(--color-surface) 75%
  );
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
}

/* Loading spinner */
.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
`;

export default lazyLoader;
