/**
 * View Transitions API Integration
 * Provides smooth page transitions and animations
 */

interface TransitionOptions {
  duration?: number;
  easing?: string;
  direction?: 'forward' | 'backward' | 'auto';
  type?: 'slide' | 'fade' | 'scale' | 'flip' | 'custom';
  customAnimation?: string;
}

interface ViewTransitionConfig {
  enabled: boolean;
  fallbackEnabled: boolean;
  defaultDuration: number;
  prefersReducedMotion: boolean;
}

class ViewTransitionsManager {
  private config: ViewTransitionConfig;
  private isTransitioning = false;
  private transitionHistory: string[] = [];
  private maxHistorySize = 10;

  constructor() {
    this.config = {
      enabled: this.isSupported(),
      fallbackEnabled: true,
      defaultDuration: 300,
      prefersReducedMotion: this.prefersReducedMotion(),
    };

    this.initialize();
  }

  private initialize(): void {
    if (typeof window === 'undefined') return;

    // Listen for reduced motion preference changes
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    mediaQuery.addEventListener('change', (e) => {
      this.config.prefersReducedMotion = e.matches;
    });

    // Add CSS for transitions
    this.injectCSS();
  }

  /**
   * Check if View Transitions API is supported
   */
  private isSupported(): boolean {
    return typeof window !== 'undefined' && 'startViewTransition' in document;
  }

  /**
   * Check if user prefers reduced motion
   */
  private prefersReducedMotion(): boolean {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Perform a view transition
   */
  async transition(
    updateCallback: () => void | Promise<void>,
    options: TransitionOptions = {}
  ): Promise<void> {
    if (this.isTransitioning) {
      console.warn('Transition already in progress');
      return;
    }

    const {
      duration = this.config.defaultDuration,
      type = 'fade',
      direction = 'auto',
    } = options;

    this.isTransitioning = true;

    try {
      if (this.config.enabled && !this.config.prefersReducedMotion) {
        await this.performNativeTransition(updateCallback, { ...options, duration, type, direction });
      } else if (this.config.fallbackEnabled) {
        await this.performFallbackTransition(updateCallback, { ...options, duration, type });
      } else {
        // No transition, just update
        await updateCallback();
      }
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Perform native View Transitions API transition
   */
  private async performNativeTransition(
    updateCallback: () => void | Promise<void>,
    options: TransitionOptions
  ): Promise<void> {
    const { type, direction, customAnimation } = options;

    // Set transition name for CSS targeting
    const transitionName = customAnimation || `transition-${type}-${direction}`;
    document.documentElement.style.setProperty('--transition-name', transitionName);

    try {
      const transition = document.startViewTransition(async () => {
        await updateCallback();
      });

      await transition.finished;
    } catch (error) {
      console.warn('Native view transition failed, falling back:', error);
      await this.performFallbackTransition(updateCallback, options);
    } finally {
      document.documentElement.style.removeProperty('--transition-name');
    }
  }

  /**
   * Perform fallback transition using CSS animations
   */
  private async performFallbackTransition(
    updateCallback: () => void | Promise<void>,
    options: TransitionOptions
  ): Promise<void> {
    const { duration = this.config.defaultDuration, type = 'fade' } = options;

    const container = document.body;
    const className = `transition-${type}`;

    // Add transition class
    container.classList.add(className, 'transition-out');

    // Wait for out animation
    await this.wait(duration / 2);

    // Update content
    await updateCallback();

    // Switch to in animation
    container.classList.remove('transition-out');
    container.classList.add('transition-in');

    // Wait for in animation
    await this.wait(duration / 2);

    // Cleanup
    container.classList.remove(className, 'transition-in');
  }

  /**
   * Navigate with transition
   */
  async navigateTo(
    url: string,
    options: TransitionOptions & { replace?: boolean } = {}
  ): Promise<void> {
    const { replace = false, ...transitionOptions } = options;

    // Determine direction based on history
    const direction = this.getNavigationDirection(url);
    const finalOptions = { direction, ...transitionOptions };

    await this.transition(async () => {
      if (replace) {
        window.history.replaceState(null, '', url);
      } else {
        window.history.pushState(null, '', url);
      }

      // Update history for direction detection
      this.updateTransitionHistory(url);

      // Dispatch navigation event
      window.dispatchEvent(new CustomEvent('viewtransition:navigate', {
        detail: { url, options: finalOptions }
      }));
    }, finalOptions);
  }

  /**
   * Get navigation direction based on history
   */
  private getNavigationDirection(url: string): 'forward' | 'backward' | 'auto' {
    const currentUrl = window.location.pathname;
    const lastIndex = this.transitionHistory.lastIndexOf(url);
    const currentIndex = this.transitionHistory.lastIndexOf(currentUrl);

    if (lastIndex === -1) {
      return 'forward'; // New page
    }

    if (lastIndex < currentIndex) {
      return 'backward'; // Going back in history
    }

    return 'forward'; // Going forward or same level
  }

  /**
   * Update transition history
   */
  private updateTransitionHistory(url: string): void {
    this.transitionHistory.push(url);
    
    if (this.transitionHistory.length > this.maxHistorySize) {
      this.transitionHistory.shift();
    }
  }

  /**
   * Set transition name for specific element
   */
  setTransitionName(element: HTMLElement, name: string): void {
    element.style.viewTransitionName = name;
  }

  /**
   * Remove transition name from element
   */
  removeTransitionName(element: HTMLElement): void {
    element.style.viewTransitionName = '';
  }

  /**
   * Create a shared element transition
   */
  createSharedTransition(
    fromElement: HTMLElement,
    toElement: HTMLElement,
    transitionName: string
  ): void {
    // Set the same transition name for both elements
    this.setTransitionName(fromElement, transitionName);
    this.setTransitionName(toElement, transitionName);
  }

  /**
   * Animate element entrance
   */
  async animateIn(
    element: HTMLElement,
    animation: 'fade' | 'slide-up' | 'slide-down' | 'scale' = 'fade',
    duration: number = 300
  ): Promise<void> {
    if (this.config.prefersReducedMotion) {
      return;
    }

    element.style.opacity = '0';
    element.style.transform = this.getInitialTransform(animation);
    element.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;

    // Force reflow
    element.offsetHeight;

    element.style.opacity = '1';
    element.style.transform = 'none';

    await this.wait(duration);
    element.style.transition = '';
  }

  /**
   * Animate element exit
   */
  async animateOut(
    element: HTMLElement,
    animation: 'fade' | 'slide-up' | 'slide-down' | 'scale' = 'fade',
    duration: number = 300
  ): Promise<void> {
    if (this.config.prefersReducedMotion) {
      return;
    }

    element.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
    element.style.opacity = '0';
    element.style.transform = this.getExitTransform(animation);

    await this.wait(duration);
  }

  /**
   * Get initial transform for animation
   */
  private getInitialTransform(animation: string): string {
    switch (animation) {
      case 'slide-up':
        return 'translateY(20px)';
      case 'slide-down':
        return 'translateY(-20px)';
      case 'scale':
        return 'scale(0.95)';
      default:
        return 'none';
    }
  }

  /**
   * Get exit transform for animation
   */
  private getExitTransform(animation: string): string {
    switch (animation) {
      case 'slide-up':
        return 'translateY(-20px)';
      case 'slide-down':
        return 'translateY(20px)';
      case 'scale':
        return 'scale(0.95)';
      default:
        return 'none';
    }
  }

  /**
   * Wait for specified duration
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Inject CSS for transitions
   */
  private injectCSS(): void {
    if (typeof document === 'undefined') return;

    const styleId = 'view-transitions-css';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* View Transitions API styles */
      ::view-transition-old(root),
      ::view-transition-new(root) {
        animation-duration: 300ms;
        animation-timing-function: ease-in-out;
      }

      /* Fade transition */
      .transition-fade.transition-out {
        animation: fadeOut 150ms ease-in-out forwards;
      }
      
      .transition-fade.transition-in {
        animation: fadeIn 150ms ease-in-out forwards;
      }

      /* Slide transitions */
      .transition-slide.transition-out {
        animation: slideOut 150ms ease-in-out forwards;
      }
      
      .transition-slide.transition-in {
        animation: slideIn 150ms ease-in-out forwards;
      }

      /* Scale transition */
      .transition-scale.transition-out {
        animation: scaleOut 150ms ease-in-out forwards;
      }
      
      .transition-scale.transition-in {
        animation: scaleIn 150ms ease-in-out forwards;
      }

      /* Animations */
      @keyframes fadeOut {
        to { opacity: 0; }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideOut {
        to { transform: translateX(-100%); opacity: 0; }
      }

      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      @keyframes scaleOut {
        to { transform: scale(0.95); opacity: 0; }
      }

      @keyframes scaleIn {
        from { transform: scale(1.05); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }

      /* Directional transitions */
      [data-transition-direction="backward"] ::view-transition-old(root) {
        animation-name: slideOutRight;
      }

      [data-transition-direction="backward"] ::view-transition-new(root) {
        animation-name: slideInLeft;
      }

      [data-transition-direction="forward"] ::view-transition-old(root) {
        animation-name: slideOutLeft;
      }

      [data-transition-direction="forward"] ::view-transition-new(root) {
        animation-name: slideInRight;
      }

      @keyframes slideOutLeft {
        to { transform: translateX(-100%); }
      }

      @keyframes slideInLeft {
        from { transform: translateX(-100%); }
        to { transform: translateX(0); }
      }

      @keyframes slideOutRight {
        to { transform: translateX(100%); }
      }

      @keyframes slideInRight {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }

      /* Reduced motion */
      @media (prefers-reduced-motion: reduce) {
        ::view-transition-old(root),
        ::view-transition-new(root) {
          animation: none !important;
        }
        
        .transition-fade,
        .transition-slide,
        .transition-scale {
          animation: none !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Get configuration
   */
  getConfig(): ViewTransitionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ViewTransitionConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Check if currently transitioning
   */
  isTransitionInProgress(): boolean {
    return this.isTransitioning;
  }
}

// Singleton instance
export const viewTransitions = new ViewTransitionsManager();

// React hook for view transitions
export function useViewTransition() {
  if (typeof window === 'undefined') {
    return {
      startTransition: () => Promise.resolve(),
      navigateTo: () => Promise.resolve(),
      animateIn: () => Promise.resolve(),
      animateOut: () => Promise.resolve(),
      isSupported: false,
      isTransitioning: false,
    };
  }

  const { useCallback } = require('react');

  const startTransition = useCallback(
    (updateCallback: () => void | Promise<void>, options?: TransitionOptions) => {
      return viewTransitions.transition(updateCallback, options);
    },
    []
  );

  const navigateTo = useCallback(
    (url: string, options?: TransitionOptions & { replace?: boolean }) => {
      return viewTransitions.navigateTo(url, options);
    },
    []
  );

  const animateIn = useCallback(
    (element: HTMLElement, animation?: 'fade' | 'slide-up' | 'slide-down' | 'scale', duration?: number) => {
      return viewTransitions.animateIn(element, animation, duration);
    },
    []
  );

  const animateOut = useCallback(
    (element: HTMLElement, animation?: 'fade' | 'slide-up' | 'slide-down' | 'scale', duration?: number) => {
      return viewTransitions.animateOut(element, animation, duration);
    },
    []
  );

  return {
    startTransition,
    navigateTo,
    animateIn,
    animateOut,
    isSupported: viewTransitions.getConfig().enabled,
    isTransitioning: viewTransitions.isTransitionInProgress(),
  };
}

// Higher-order component for view transitions
export function withViewTransition<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  transitionName?: string
) {
  if (typeof window === 'undefined') {
    return function SSRWrapper(props: T) {
      const { createElement } = require('react');
      return createElement(Component, props);
    };
  }

  return function TransitionWrapper(props: T) {
    const { useEffect, useRef, createElement } = require('react');
    const elementRef = useRef<HTMLElement>(null);

    useEffect(() => {
      if (elementRef.current && transitionName) {
        viewTransitions.setTransitionName(elementRef.current, transitionName);
        
        return () => {
          if (elementRef.current) {
            viewTransitions.removeTransitionName(elementRef.current);
          }
        };
      }
    }, []);

    return createElement(Component, { ref: elementRef, ...props });
  };
}

export default viewTransitions;
