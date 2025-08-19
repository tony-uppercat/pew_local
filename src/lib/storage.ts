/**
 * OPFS (Origin Private File System) Storage for Media Files
 * Handles receipt images, photos, and other media with compression and thumbnails
 */

export interface MediaMetadata {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  thumbnailId?: string;
  createdAt: Date;
}

export interface StorageInfo {
  quota: number;
  usage: number;
  available: number;
  percentUsed: number;
  breakdown: {
    database: number;
    media: number;
    cache: number;
    other: number;
  };
}

class OPFSStorage {
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private mediaHandle: FileSystemDirectoryHandle | null = null;
  private thumbnailHandle: FileSystemDirectoryHandle | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (typeof window === 'undefined' || !('storage' in navigator) || !navigator.storage.getDirectory) {
      console.warn('OPFS not supported in this environment');
      return;
    }

    try {
      this.rootHandle = await navigator.storage.getDirectory();
      
      // Create media directories
      this.mediaHandle = await this.rootHandle.getDirectoryHandle('media', { create: true });
      this.thumbnailHandle = await this.rootHandle.getDirectoryHandle('thumbnails', { create: true });
      
      console.log('OPFS initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OPFS:', error);
    }
  }

  /**
   * Check if OPFS is available and initialized
   */
  isAvailable(): boolean {
    return this.rootHandle !== null && this.mediaHandle !== null;
  }

  /**
   * Store a media file with optional compression
   */
  async storeMediaFile(
    file: File,
    mediaId: string,
    options: {
      compress?: boolean;
      quality?: number; // 0-1 for JPEG compression
      maxWidth?: number;
      maxHeight?: number;
      generateThumbnail?: boolean;
      thumbnailSize?: number;
    } = {}
  ): Promise<MediaMetadata> {
    if (!this.isAvailable()) {
      throw new Error('OPFS storage not available');
    }

    const {
      compress = true,
      quality = 0.8,
      maxWidth = 1920,
      maxHeight = 1080,
      generateThumbnail = true,
      thumbnailSize = 200,
    } = options;

    let processedFile = file;
    let metadata: MediaMetadata = {
      id: mediaId,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      createdAt: new Date(),
    };

    // Process image files
    if (file.type.startsWith('image/')) {
      const imageData = await this.processImage(file, {
        compress,
        quality,
        maxWidth,
        maxHeight,
      });
      
      processedFile = imageData.file;
      metadata.width = imageData.width;
      metadata.height = imageData.height;
      metadata.size = processedFile.size;

      // Generate thumbnail if requested
      if (generateThumbnail) {
        const thumbnailData = await this.generateThumbnail(file, thumbnailSize);
        const thumbnailId = `${mediaId}_thumb`;
        
        await this.writeFileToOPFS(this.thumbnailHandle!, thumbnailId, thumbnailData.file);
        metadata.thumbnailId = thumbnailId;
      }
    }

    // Store the main file
    await this.writeFileToOPFS(this.mediaHandle!, mediaId, processedFile);

    return metadata;
  }

  /**
   * Retrieve a media file
   */
  async getMediaFile(mediaId: string): Promise<File | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const fileHandle = await this.mediaHandle!.getFileHandle(mediaId);
      return await fileHandle.getFile();
    } catch (error) {
      console.error(`Failed to retrieve media file ${mediaId}:`, error);
      return null;
    }
  }

  /**
   * Retrieve a thumbnail
   */
  async getThumbnail(thumbnailId: string): Promise<File | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const fileHandle = await this.thumbnailHandle!.getFileHandle(thumbnailId);
      return await fileHandle.getFile();
    } catch (error) {
      console.error(`Failed to retrieve thumbnail ${thumbnailId}:`, error);
      return null;
    }
  }

  /**
   * Delete a media file and its thumbnail
   */
  async deleteMediaFile(mediaId: string): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      // Delete main file
      await this.mediaHandle!.removeEntry(mediaId);
      
      // Delete thumbnail if exists
      const thumbnailId = `${mediaId}_thumb`;
      try {
        await this.thumbnailHandle!.removeEntry(thumbnailId);
      } catch {
        // Thumbnail might not exist, ignore error
      }
    } catch (error) {
      console.error(`Failed to delete media file ${mediaId}:`, error);
      throw error;
    }
  }

  /**
   * Get URL for a media file (creates object URL)
   */
  async getMediaURL(mediaId: string): Promise<string | null> {
    const file = await this.getMediaFile(mediaId);
    return file ? URL.createObjectURL(file) : null;
  }

  /**
   * Get URL for a thumbnail
   */
  async getThumbnailURL(thumbnailId: string): Promise<string | null> {
    const file = await this.getThumbnail(thumbnailId);
    return file ? URL.createObjectURL(file) : null;
  }

  /**
   * List all media files
   */
  async listMediaFiles(): Promise<string[]> {
    if (!this.isAvailable()) {
      return [];
    }

    const files: string[] = [];
    
    try {
      for await (const [name] of this.mediaHandle!.entries()) {
        files.push(name);
      }
    } catch (error) {
      console.error('Failed to list media files:', error);
    }
    
    return files;
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<StorageInfo> {
    const defaultInfo: StorageInfo = {
      quota: 0,
      usage: 0,
      available: 0,
      percentUsed: 0,
      breakdown: {
        database: 0,
        media: 0,
        cache: 0,
        other: 0,
      },
    };

    if (typeof window === 'undefined' || !('storage' in navigator) || !navigator.storage.estimate) {
      return defaultInfo;
    }

    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      const available = quota - usage;
      const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

      // Estimate breakdown (approximate)
      const mediaSize = await this.getMediaStorageSize();
      const cacheSize = await this.getCacheSize();
      const databaseSize = usage - mediaSize - cacheSize;

      return {
        quota,
        usage,
        available,
        percentUsed,
        breakdown: {
          database: Math.max(0, databaseSize),
          media: mediaSize,
          cache: cacheSize,
          other: Math.max(0, usage - databaseSize - mediaSize - cacheSize),
        },
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return defaultInfo;
    }
  }

  /**
   * Clear all media files
   */
  async clearAllMedia(): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    try {
      // Clear media files
      for await (const [name] of this.mediaHandle!.entries()) {
        await this.mediaHandle!.removeEntry(name);
      }

      // Clear thumbnails
      for await (const [name] of this.thumbnailHandle!.entries()) {
        await this.thumbnailHandle!.removeEntry(name);
      }

      console.log('All media files cleared');
    } catch (error) {
      console.error('Failed to clear media files:', error);
      throw error;
    }
  }

  // Private helper methods

  private async writeFileToOPFS(
    directoryHandle: FileSystemDirectoryHandle,
    fileName: string,
    file: File
  ): Promise<void> {
    try {
      const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();
    } catch (error) {
      console.error(`Failed to write file ${fileName}:`, error);
      throw error;
    }
  }

  private async processImage(
    file: File,
    options: {
      compress: boolean;
      quality: number;
      maxWidth: number;
      maxHeight: number;
    }
  ): Promise<{ file: File; width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        let { width, height } = img;

        // Calculate new dimensions
        if (width > options.maxWidth || height > options.maxHeight) {
          const ratio = Math.min(options.maxWidth / width, options.maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }

            const processedFile = new File([blob], file.name, {
              type: options.compress ? 'image/jpeg' : file.type,
              lastModified: file.lastModified,
            });

            resolve({ file: processedFile, width, height });
          },
          options.compress ? 'image/jpeg' : file.type,
          options.quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  private async generateThumbnail(file: File, size: number): Promise<{ file: File }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        const { width, height } = img;
        const aspectRatio = width / height;

        let thumbnailWidth = size;
        let thumbnailHeight = size;

        if (aspectRatio > 1) {
          thumbnailHeight = size / aspectRatio;
        } else {
          thumbnailWidth = size * aspectRatio;
        }

        canvas.width = thumbnailWidth;
        canvas.height = thumbnailHeight;

        ctx.drawImage(img, 0, 0, thumbnailWidth, thumbnailHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to generate thumbnail'));
              return;
            }

            const thumbnailFile = new File([blob], `thumb_${file.name}`, {
              type: 'image/jpeg',
              lastModified: file.lastModified,
            });

            resolve({ file: thumbnailFile });
          },
          'image/jpeg',
          0.8
        );
      };

      img.onerror = () => reject(new Error('Failed to load image for thumbnail'));
      img.src = URL.createObjectURL(file);
    });
  }

  private async getMediaStorageSize(): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    let totalSize = 0;

    try {
      // Calculate media files size
      for await (const [name] of this.mediaHandle!.entries()) {
        const fileHandle = await this.mediaHandle!.getFileHandle(name);
        const file = await fileHandle.getFile();
        totalSize += file.size;
      }

      // Calculate thumbnails size
      for await (const [name] of this.thumbnailHandle!.entries()) {
        const fileHandle = await this.thumbnailHandle!.getFileHandle(name);
        const file = await fileHandle.getFile();
        totalSize += file.size;
      }
    } catch (error) {
      console.error('Failed to calculate media storage size:', error);
    }

    return totalSize;
  }

  private async getCacheSize(): Promise<number> {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        let totalSize = 0;

        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();

          for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
              const blob = await response.blob();
              totalSize += blob.size;
            }
          }
        }

        return totalSize;
      }
    } catch (error) {
      console.error('Failed to calculate cache size:', error);
    }

    return 0;
  }
}

// Singleton instance
export const opfsStorage = new OPFSStorage();

// Utility functions
export const StorageUtils = {
  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Generate a unique media ID
   */
  generateMediaId(): string {
    return `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Validate file type for media storage
   */
  isValidMediaType(mimeType: string): boolean {
    const validTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/pdf',
    ];
    
    return validTypes.includes(mimeType);
  },

  /**
   * Get file extension from MIME type
   */
  getFileExtension(mimeType: string): string {
    const extensions: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
      'application/pdf': 'pdf',
    };
    
    return extensions[mimeType] || 'bin';
  },

  /**
   * Check if storage is running low
   */
  isStorageLow(storageInfo: StorageInfo): boolean {
    return storageInfo.percentUsed > 80;
  },

  /**
   * Check if storage is critically low
   */
  isStorageCritical(storageInfo: StorageInfo): boolean {
    return storageInfo.percentUsed > 95 || storageInfo.available < 50 * 1024 * 1024; // 50MB
  },
};

export default opfsStorage;
