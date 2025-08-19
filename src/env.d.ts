/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

// PWA types
interface Navigator {
  storage?: {
    persist(): Promise<boolean>;
    estimate(): Promise<StorageEstimate>;
  };
  serviceWorker?: ServiceWorkerContainer;
}

interface StorageEstimate {
  quota?: number;
  usage?: number;
}

// Web APIs types
interface Window {
  // Service Worker registration
  swRegistration?: ServiceWorkerRegistration;
  
  // PWA install prompt
  deferredPrompt?: BeforeInstallPromptEvent;
  
  // View Transitions API
  navigation?: {
    addEventListener(type: string, listener: EventListener): void;
  };
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Workbox types
declare module 'workbox-window' {
  export class Workbox {
    constructor(scriptURL: string, registerOptions?: object);
    register(): Promise<ServiceWorkerRegistration>;
    update(): Promise<void>;
    addEventListener(type: string, listener: (event: any) => void): void;
    messageSkipWaiting(): void;
  }
}

// File System Access API
interface FileSystemFileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: string | BufferSource | Blob): Promise<void>;
  close(): Promise<void>;
}

interface Window {
  showSaveFilePicker?(options?: {
    suggestedName?: string;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }): Promise<FileSystemFileHandle>;
  
  showOpenFilePicker?(options?: {
    multiple?: boolean;
    types?: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }): Promise<FileSystemFileHandle[]>;
}

// OPFS (Origin Private File System) types
interface StorageManager {
  getDirectory?(): Promise<FileSystemDirectoryHandle>;
}

interface FileSystemDirectoryHandle {
  getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
  keys(): AsyncIterableIterator<string>;
  values(): AsyncIterableIterator<FileSystemHandle>;
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
}

type FileSystemHandle = FileSystemFileHandle | FileSystemDirectoryHandle;

// Background Sync (Chrome only)
interface ServiceWorkerRegistration {
  sync?: {
    register(tag: string): Promise<void>;
  };
}

// Crypto API extensions for AES-GCM
interface SubtleCrypto {
  generateKey(
    algorithm: AesKeyGenParams,
    extractable: boolean,
    keyUsages: KeyUsage[]
  ): Promise<CryptoKey>;
  
  encrypt(
    algorithm: AesGcmParams,
    key: CryptoKey,
    data: ArrayBuffer
  ): Promise<ArrayBuffer>;
  
  decrypt(
    algorithm: AesGcmParams,
    key: CryptoKey,
    data: ArrayBuffer
  ): Promise<ArrayBuffer>;
  
  exportKey(format: 'raw', key: CryptoKey): Promise<ArrayBuffer>;
  importKey(
    format: 'raw',
    keyData: ArrayBuffer,
    algorithm: AesKeyAlgorithm,
    extractable: boolean,
    keyUsages: KeyUsage[]
  ): Promise<CryptoKey>;
}

interface AesKeyGenParams {
  name: 'AES-GCM';
  length: 128 | 192 | 256;
}

interface AesGcmParams {
  name: 'AES-GCM';
  iv: ArrayBuffer;
  additionalData?: ArrayBuffer;
  tagLength?: number;
}

interface AesKeyAlgorithm {
  name: 'AES-GCM';
}

// Intersection Observer
interface IntersectionObserverEntry {
  readonly boundingClientRect: DOMRectReadOnly;
  readonly intersectionRatio: number;
  readonly intersectionRect: DOMRectReadOnly;
  readonly isIntersecting: boolean;
  readonly rootBounds: DOMRectReadOnly | null;
  readonly target: Element;
  readonly time: number;
}

interface IntersectionObserverInit {
  root?: Element | null;
  rootMargin?: string;
  threshold?: number | number[];
}

declare class IntersectionObserver {
  constructor(callback: (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => void, options?: IntersectionObserverInit);
  observe(target: Element): void;
  unobserve(target: Element): void;
  disconnect(): void;
  takeRecords(): IntersectionObserverEntry[];
}
