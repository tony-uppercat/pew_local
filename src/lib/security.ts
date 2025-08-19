/**
 * Security and Privacy Management
 * Handles encryption, data sanitization, and privacy controls
 */

interface SecurityConfig {
  encryptionEnabled: boolean;
  dataRetentionDays: number;
  anonymizeData: boolean;
  requireConsent: boolean;
  logSecurityEvents: boolean;
}

interface EncryptionKey {
  key: CryptoKey;
  salt: Uint8Array;
  iv: Uint8Array;
}

interface SecurityEvent {
  id: string;
  type: 'encryption' | 'decryption' | 'data_access' | 'privacy_violation' | 'security_warning';
  timestamp: Date;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress?: string;
}

class SecurityManager {
  private config: SecurityConfig;
  private masterKey: CryptoKey | null = null;
  private securityEvents: SecurityEvent[] = [];
  private listeners = new Map<string, Set<(event: SecurityEvent) => void>>();

  constructor() {
    this.config = {
      encryptionEnabled: true,
      dataRetentionDays: 365,
      anonymizeData: false,
      requireConsent: true,
      logSecurityEvents: true,
    };

    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      // Initialize security monitoring
      this.setupSecurityMonitoring();
      
      // Check for security vulnerabilities
      await this.performSecurityCheck();
      
      console.log('Security manager initialized');
    } catch (error) {
      this.logSecurityEvent('security_warning', 'Failed to initialize security manager', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate or retrieve master encryption key
   */
  async getMasterKey(password?: string): Promise<CryptoKey> {
    if (this.masterKey) {
      return this.masterKey;
    }

    if (password) {
      // Derive key from password
      this.masterKey = await this.deriveKeyFromPassword(password);
    } else {
      // Generate random key for session
      this.masterKey = await crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256,
        },
        false, // Not extractable for security
        ['encrypt', 'decrypt']
      );
    }

    this.logSecurityEvent('encryption', 'Master key generated', 'medium');
    return this.masterKey;
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  private async deriveKeyFromPassword(password: string, salt?: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const keySalt = salt || crypto.getRandomValues(new Uint8Array(16));

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: keySalt,
        iterations: 100000, // High iteration count for security
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt sensitive data
   */
  async encryptData(data: string, key?: CryptoKey): Promise<{
    encryptedData: string;
    iv: string;
    salt?: string;
  }> {
    try {
      const encryptionKey = key || await this.getMasterKey();
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt data
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv,
        },
        encryptionKey,
        dataBuffer
      );

      const encryptedData = this.arrayBufferToBase64(encryptedBuffer);
      const ivBase64 = this.arrayBufferToBase64(iv);

      this.logSecurityEvent('encryption', 'Data encrypted successfully', 'low');

      return {
        encryptedData,
        iv: ivBase64,
      };
    } catch (error) {
      this.logSecurityEvent('encryption', 'Data encryption failed', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data
   */
  async decryptData(
    encryptedData: string,
    iv: string,
    key?: CryptoKey
  ): Promise<string> {
    try {
      const decryptionKey = key || await this.getMasterKey();
      
      const encryptedBuffer = this.base64ToArrayBuffer(encryptedData);
      const ivBuffer = this.base64ToArrayBuffer(iv);

      // Decrypt data
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: ivBuffer,
        },
        decryptionKey,
        encryptedBuffer
      );

      const decoder = new TextDecoder();
      const decryptedData = decoder.decode(decryptedBuffer);

      this.logSecurityEvent('decryption', 'Data decrypted successfully', 'low');

      return decryptedData;
    } catch (error) {
      this.logSecurityEvent('decryption', 'Data decryption failed', 'high', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Decryption failed - invalid key or corrupted data');
    }
  }

  /**
   * Sanitize user input to prevent XSS and injection attacks
   */
  sanitizeInput(input: string): string {
    // Basic HTML entity encoding
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate and sanitize file uploads
   */
  validateFileUpload(file: File): {
    isValid: boolean;
    errors: string[];
    sanitizedName: string;
  } {
    const errors: string[] = [];
    let sanitizedName = file.name;

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      errors.push('File size exceeds 10MB limit');
    }

    // Check file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push('File type not allowed');
    }

    // Sanitize filename
    sanitizedName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/\.+/g, '.')
      .substring(0, 100); // Limit filename length

    // Check for suspicious extensions
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.js', '.vbs'];
    const hassuspicious = suspiciousExtensions.some(ext => 
      sanitizedName.toLowerCase().includes(ext)
    );

    if (hassuspicious) {
      errors.push('Suspicious file extension detected');
    }

    const isValid = errors.length === 0;
    
    if (!isValid) {
      this.logSecurityEvent('security_warning', 'Invalid file upload attempted', 'medium', {
        filename: file.name,
        fileType: file.type,
        fileSize: file.size.toString(),
        errors: errors.join(', ')
      });
    }

    return { isValid, errors, sanitizedName };
  }

  /**
   * Generate secure random token
   */
  generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Hash sensitive data (one-way)
   */
  async hashData(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    return this.arrayBufferToBase64(hashBuffer);
  }

  /**
   * Anonymize personal data
   */
  anonymizeData(data: any): any {
    if (!this.config.anonymizeData) return data;

    const anonymized = JSON.parse(JSON.stringify(data));
    
    // Recursively anonymize sensitive fields
    this.anonymizeObject(anonymized);
    
    return anonymized;
  }

  private anonymizeObject(obj: any): void {
    const sensitiveFields = ['email', 'phone', 'address', 'name', 'ip', 'location'];
    
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.anonymizeObject(obj[key]);
      } else if (typeof obj[key] === 'string') {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
          obj[key] = this.maskString(obj[key]);
        }
      }
    }
  }

  private maskString(str: string): string {
    if (str.length <= 4) return '*'.repeat(str.length);
    return str.substring(0, 2) + '*'.repeat(str.length - 4) + str.substring(str.length - 2);
  }

  /**
   * Check for security vulnerabilities
   */
  private async performSecurityCheck(): Promise<void> {
    const issues: string[] = [];

    // Check if running over HTTPS in production
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      issues.push('Application not served over HTTPS');
    }

    // Check for mixed content
    if (window.location.protocol === 'https:' && document.querySelectorAll('img[src^="http:"], script[src^="http:"], link[href^="http:"]').length > 0) {
      issues.push('Mixed content detected (HTTP resources on HTTPS page)');
    }

    // Check Content Security Policy
    const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (!metaCSP) {
      issues.push('Content Security Policy not implemented');
    }

    // Check for secure storage
    if (!('crypto' in window) || !('subtle' in crypto)) {
      issues.push('Web Crypto API not available');
    }

    // Log security issues
    if (issues.length > 0) {
      this.logSecurityEvent('security_warning', 'Security vulnerabilities detected', 'high', {
        issues: issues.join(', ')
      });
    }
  }

  /**
   * Setup security monitoring
   */
  private setupSecurityMonitoring(): void {
    // Monitor for suspicious activities
    let rapidRequestCount = 0;
    let lastRequestTime = 0;

    // Rate limiting detection
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const now = Date.now();
      if (now - lastRequestTime < 100) { // Less than 100ms between requests
        rapidRequestCount++;
        if (rapidRequestCount > 10) {
          this.logSecurityEvent('security_warning', 'Rapid request pattern detected', 'medium');
        }
      } else {
        rapidRequestCount = 0;
      }
      lastRequestTime = now;
      
      return originalFetch.apply(window, args);
    };

    // Monitor for console access (potential debugging attempts)
    let consoleAccessCount = 0;
    const originalLog = console.log;
    console.log = (...args) => {
      consoleAccessCount++;
      if (consoleAccessCount > 50) {
        this.logSecurityEvent('security_warning', 'Excessive console access detected', 'low');
      }
      return originalLog.apply(console, args);
    };

    // Monitor for DevTools opening
    let devtools = {open: false, orientation: null};
    const threshold = 160;

    setInterval(() => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          this.logSecurityEvent('security_warning', 'Developer tools opened', 'low');
        }
      } else {
        devtools.open = false;
      }
    }, 500);
  }

  /**
   * Log security events
   */
  private logSecurityEvent(
    type: SecurityEvent['type'],
    details: string,
    severity: SecurityEvent['severity'],
    metadata?: Record<string, string>
  ): void {
    if (!this.config.logSecurityEvents) return;

    const event: SecurityEvent = {
      id: this.generateSecureToken(16),
      type,
      timestamp: new Date(),
      details,
      severity,
    };

    // Add metadata if provided
    if (metadata) {
      event.details += ` | ${JSON.stringify(metadata)}`;
    }

    this.securityEvents.push(event);
    
    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents.shift();
    }

    // Emit event to listeners
    this.emit('securityEvent', event);

    // Log critical events to console
    if (severity === 'critical' || severity === 'high') {
      console.warn(`Security ${severity} event:`, details);
    }
  }

  /**
   * Get security events
   */
  getSecurityEvents(severity?: SecurityEvent['severity']): SecurityEvent[] {
    if (severity) {
      return this.securityEvents.filter(event => event.severity === severity);
    }
    return [...this.securityEvents];
  }

  /**
   * Clear security events
   */
  clearSecurityEvents(): void {
    this.securityEvents.length = 0;
    this.emit('eventsCleared');
  }

  /**
   * Update security configuration
   */
  updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logSecurityEvent('security_warning', 'Security configuration updated', 'low');
  }

  /**
   * Get security configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Perform security audit
   */
  async performSecurityAudit(): Promise<{
    score: number;
    issues: Array<{ severity: string; description: string }>;
    recommendations: string[];
  }> {
    const issues: Array<{ severity: string; description: string }> = [];
    const recommendations: string[] = [];
    let score = 100;

    // Check encryption status
    if (!this.config.encryptionEnabled) {
      issues.push({ severity: 'high', description: 'Data encryption is disabled' });
      recommendations.push('Enable data encryption for sensitive information');
      score -= 20;
    }

    // Check recent security events
    const recentEvents = this.securityEvents.filter(
      event => Date.now() - event.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    const criticalEvents = recentEvents.filter(event => event.severity === 'critical');
    const highEvents = recentEvents.filter(event => event.severity === 'high');

    if (criticalEvents.length > 0) {
      issues.push({ severity: 'critical', description: `${criticalEvents.length} critical security events in last 24h` });
      score -= 30;
    }

    if (highEvents.length > 5) {
      issues.push({ severity: 'high', description: `${highEvents.length} high-severity security events in last 24h` });
      score -= 15;
    }

    // Check HTTPS
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      issues.push({ severity: 'critical', description: 'Application not served over HTTPS' });
      recommendations.push('Deploy application with HTTPS/TLS encryption');
      score -= 25;
    }

    // Check Web Crypto API availability
    if (!('crypto' in window) || !('subtle' in crypto)) {
      issues.push({ severity: 'high', description: 'Web Crypto API not available' });
      recommendations.push('Ensure application runs in secure context with Web Crypto API support');
      score -= 20;
    }

    return {
      score: Math.max(0, score),
      issues,
      recommendations,
    };
  }

  // Helper methods
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // Event system
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
   * Cleanup sensitive data from memory
   */
  cleanup(): void {
    this.masterKey = null;
    this.securityEvents.length = 0;
    this.listeners.clear();
  }
}

// Singleton instance
export const securityManager = new SecurityManager();

// Security utilities
export const SecurityUtils = {
  /**
   * Check password strength
   */
  checkPasswordStrength(password: string): {
    score: number;
    strength: 'weak' | 'fair' | 'good' | 'strong';
    suggestions: string[];
  } {
    let score = 0;
    const suggestions: string[] = [];

    // Length check
    if (password.length >= 8) score += 25;
    else suggestions.push('Use at least 8 characters');

    if (password.length >= 12) score += 25;
    else if (password.length >= 8) suggestions.push('Consider using 12+ characters for better security');

    // Character variety
    if (/[a-z]/.test(password)) score += 10;
    else suggestions.push('Include lowercase letters');

    if (/[A-Z]/.test(password)) score += 10;
    else suggestions.push('Include uppercase letters');

    if (/[0-9]/.test(password)) score += 10;
    else suggestions.push('Include numbers');

    if (/[^a-zA-Z0-9]/.test(password)) score += 20;
    else suggestions.push('Include special characters');

    // Patterns check
    if (!/(.)\1{2,}/.test(password)) score += 10; // No repeated characters
    else suggestions.push('Avoid repeating characters');

    let strength: 'weak' | 'fair' | 'good' | 'strong';
    if (score < 40) strength = 'weak';
    else if (score < 70) strength = 'fair';
    else if (score < 90) strength = 'good';
    else strength = 'strong';

    return { score, strength, suggestions };
  },

  /**
   * Generate secure password
   */
  generateSecurePassword(length: number = 16): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    return Array.from(array, byte => charset[byte % charset.length]).join('');
  },

  /**
   * Validate email format
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Check if running in secure context
   */
  isSecureContext(): boolean {
    return window.isSecureContext || window.location.protocol === 'https:' || window.location.hostname === 'localhost';
  },

  /**
   * Get browser security features
   */
  getBrowserSecurityFeatures(): {
    webCrypto: boolean;
    secureContext: boolean;
    serviceWorkers: boolean;
    persistentStorage: boolean;
  } {
    return {
      webCrypto: 'crypto' in window && 'subtle' in crypto,
      secureContext: SecurityUtils.isSecureContext(),
      serviceWorkers: 'serviceWorker' in navigator,
      persistentStorage: 'storage' in navigator && 'persist' in navigator.storage,
    };
  },
};

export default securityManager;
