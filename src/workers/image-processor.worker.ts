/**
 * Image Processing Web Worker
 * Handles image compression, resizing, and OCR in background thread
 */

interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  generateThumbnail?: boolean;
  thumbnailSize?: number;
}

interface ProcessingResult {
  originalFile: {
    size: number;
    width: number;
    height: number;
  };
  processedImage: {
    blob: Blob;
    size: number;
    width: number;
    height: number;
    format: string;
  };
  thumbnail?: {
    blob: Blob;
    size: number;
    width: number;
    height: number;
  };
  metadata: {
    compressionRatio: number;
    processingTime: number;
  };
}

interface OCRResult {
  text: string;
  confidence: number;
  words: Array<{
    text: string;
    confidence: number;
    bbox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  lines: Array<{
    text: string;
    confidence: number;
    words: number[];
  }>;
}

class ImageProcessor {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;

  constructor() {
    this.canvas = new OffscreenCanvas(1, 1);
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = context;
  }

  /**
   * Process image with compression and resizing
   */
  async processImage(
    imageData: ArrayBuffer,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = performance.now();
    
    const {
      maxWidth = 1920,
      maxHeight = 1080,
      quality = 0.8,
      format = 'jpeg',
      generateThumbnail = true,
      thumbnailSize = 200,
    } = options;

    // Create ImageBitmap from ArrayBuffer
    const blob = new Blob([imageData]);
    const imageBitmap = await createImageBitmap(blob);
    
    const originalWidth = imageBitmap.width;
    const originalHeight = imageBitmap.height;
    const originalSize = imageData.byteLength;

    // Calculate new dimensions
    const { width: newWidth, height: newHeight } = this.calculateDimensions(
      originalWidth,
      originalHeight,
      maxWidth,
      maxHeight
    );

    // Resize canvas
    this.canvas.width = newWidth;
    this.canvas.height = newHeight;

    // Clear canvas and draw image
    this.ctx.clearRect(0, 0, newWidth, newHeight);
    this.ctx.drawImage(imageBitmap, 0, 0, newWidth, newHeight);

    // Convert to blob
    const mimeType = `image/${format}`;
    const processedBlob = await this.canvas.convertToBlob({
      type: mimeType,
      quality: format === 'jpeg' ? quality : undefined,
    });

    let thumbnailResult;
    if (generateThumbnail) {
      thumbnailResult = await this.generateThumbnail(imageBitmap, thumbnailSize);
    }

    const processingTime = performance.now() - startTime;
    const compressionRatio = originalSize / processedBlob.size;

    // Clean up
    imageBitmap.close();

    return {
      originalFile: {
        size: originalSize,
        width: originalWidth,
        height: originalHeight,
      },
      processedImage: {
        blob: processedBlob,
        size: processedBlob.size,
        width: newWidth,
        height: newHeight,
        format: mimeType,
      },
      thumbnail: thumbnailResult,
      metadata: {
        compressionRatio,
        processingTime,
      },
    };
  }

  /**
   * Generate thumbnail from ImageBitmap
   */
  private async generateThumbnail(
    imageBitmap: ImageBitmap,
    size: number
  ): Promise<{ blob: Blob; size: number; width: number; height: number }> {
    const { width: thumbWidth, height: thumbHeight } = this.calculateDimensions(
      imageBitmap.width,
      imageBitmap.height,
      size,
      size
    );

    // Create temporary canvas for thumbnail
    const thumbCanvas = new OffscreenCanvas(thumbWidth, thumbHeight);
    const thumbCtx = thumbCanvas.getContext('2d')!;

    thumbCtx.drawImage(imageBitmap, 0, 0, thumbWidth, thumbHeight);

    const thumbnailBlob = await thumbCanvas.convertToBlob({
      type: 'image/jpeg',
      quality: 0.8,
    });

    return {
      blob: thumbnailBlob,
      size: thumbnailBlob.size,
      width: thumbWidth,
      height: thumbHeight,
    };
  }

  /**
   * Calculate new dimensions while maintaining aspect ratio
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight };
    }

    const aspectRatio = originalWidth / originalHeight;

    let newWidth = maxWidth;
    let newHeight = maxWidth / aspectRatio;

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = maxHeight * aspectRatio;
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight),
    };
  }

  /**
   * Extract text from image using basic OCR techniques
   * Note: This is a simplified implementation. For production use, consider integrating
   * with Tesseract.js or a cloud OCR service
   */
  async extractText(imageData: ArrayBuffer): Promise<OCRResult> {
    // This is a placeholder implementation
    // In a real application, you would integrate with:
    // - Tesseract.js for client-side OCR
    // - Google Vision API
    // - AWS Textract
    // - Azure Computer Vision
    
    try {
      // Simulate OCR processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Return mock OCR result
      return {
        text: 'Receipt\nTotal: $25.99\nDate: 2024-01-15\nStore: Example Store',
        confidence: 0.85,
        words: [
          {
            text: 'Receipt',
            confidence: 0.95,
            bbox: { x: 10, y: 10, width: 80, height: 20 }
          },
          {
            text: 'Total:',
            confidence: 0.90,
            bbox: { x: 10, y: 50, width: 50, height: 15 }
          },
          {
            text: '$25.99',
            confidence: 0.88,
            bbox: { x: 70, y: 50, width: 60, height: 15 }
          },
        ],
        lines: [
          { text: 'Receipt', confidence: 0.95, words: [0] },
          { text: 'Total: $25.99', confidence: 0.89, words: [1, 2] },
        ],
      };
    } catch (error) {
      console.error('OCR processing failed:', error);
      return {
        text: '',
        confidence: 0,
        words: [],
        lines: [],
      };
    }
  }

  /**
   * Analyze image for receipt-specific features
   */
  async analyzeReceipt(imageData: ArrayBuffer): Promise<{
    isReceipt: boolean;
    confidence: number;
    detectedFeatures: string[];
    suggestedRotation?: number;
  }> {
    // Simulate receipt analysis
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Mock analysis result
    return {
      isReceipt: true,
      confidence: 0.82,
      detectedFeatures: ['text_lines', 'currency_symbols', 'date_pattern'],
      suggestedRotation: 0,
    };
  }

  /**
   * Enhance image for better OCR results
   */
  async enhanceForOCR(imageData: ArrayBuffer): Promise<ArrayBuffer> {
    const blob = new Blob([imageData]);
    const imageBitmap = await createImageBitmap(blob);
    
    // Set canvas size
    this.canvas.width = imageBitmap.width;
    this.canvas.height = imageBitmap.height;
    
    // Draw original image
    this.ctx.drawImage(imageBitmap, 0, 0);
    
    // Get image data for processing
    const imageDataObj = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const data = imageDataObj.data;
    
    // Apply image enhancements
    this.applyContrast(data, 1.2);
    this.applyBrightness(data, 10);
    this.applySharpening(data, imageDataObj.width, imageDataObj.height);
    
    // Put processed data back
    this.ctx.putImageData(imageDataObj, 0, 0);
    
    // Convert to blob and return as ArrayBuffer
    const enhancedBlob = await this.canvas.convertToBlob({
      type: 'image/png',
    });
    
    const arrayBuffer = await enhancedBlob.arrayBuffer();
    
    // Clean up
    imageBitmap.close();
    
    return arrayBuffer;
  }

  /**
   * Apply contrast adjustment
   */
  private applyContrast(data: Uint8ClampedArray, contrast: number): void {
    const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));
    
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, factor * (data[i] - 128) + 128));     // Red
      data[i + 1] = Math.max(0, Math.min(255, factor * (data[i + 1] - 128) + 128)); // Green
      data[i + 2] = Math.max(0, Math.min(255, factor * (data[i + 2] - 128) + 128)); // Blue
    }
  }

  /**
   * Apply brightness adjustment
   */
  private applyBrightness(data: Uint8ClampedArray, brightness: number): void {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, data[i] + brightness));     // Red
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brightness)); // Green
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brightness)); // Blue
    }
  }

  /**
   * Apply sharpening filter
   */
  private applySharpening(data: Uint8ClampedArray, width: number, height: number): void {
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];
    
    const output = new Uint8ClampedArray(data);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) { // RGB channels only
          let sum = 0;
          
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              const kernelIdx = (ky + 1) * 3 + (kx + 1);
              sum += data[idx] * kernel[kernelIdx];
            }
          }
          
          const outputIdx = (y * width + x) * 4 + c;
          output[outputIdx] = Math.max(0, Math.min(255, sum));
        }
      }
    }
    
    // Copy processed data back
    for (let i = 0; i < data.length; i++) {
      data[i] = output[i];
    }
  }
}

// Worker message handling
const processor = new ImageProcessor();

self.onmessage = async (event) => {
  const { type, data, id } = event.data;
  
  try {
    let result;
    
    switch (type) {
      case 'processImage':
        result = await processor.processImage(data.imageData, data.options);
        break;
        
      case 'extractText':
        result = await processor.extractText(data.imageData);
        break;
        
      case 'analyzeReceipt':
        result = await processor.analyzeReceipt(data.imageData);
        break;
        
      case 'enhanceForOCR':
        result = await processor.enhanceForOCR(data.imageData);
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    self.postMessage({
      type: 'success',
      id,
      result,
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// Handle worker errors
self.onerror = (error) => {
  console.error('Image processor worker error:', error);
};

export {}; // Make this a module
