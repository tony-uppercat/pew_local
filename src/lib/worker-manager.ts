/**
 * Web Worker Manager
 * Handles worker lifecycle, message passing, and error handling
 */

import { useState, useEffect } from 'react';

interface WorkerTask {
  id: string;
  type: string;
  data: any;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

interface WorkerPoolConfig {
  maxWorkers: number;
  idleTimeout: number;
  taskTimeout: number;
}

class WorkerManager {
  private workers = new Map<string, Worker>();
  private availableWorkers = new Set<string>();
  private busyWorkers = new Set<string>();
  private taskQueue: WorkerTask[] = [];
  private activeTasks = new Map<string, WorkerTask>();
  private config: WorkerPoolConfig;
  private taskIdCounter = 0;

  constructor(config: Partial<WorkerPoolConfig> = {}) {
    this.config = {
      maxWorkers: (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4) || 4,
      idleTimeout: 30000, // 30 seconds
      taskTimeout: 60000, // 60 seconds
      ...config,
    };
  }

  /**
   * Create a worker pool for specific worker type
   */
  async createWorkerPool(
    workerName: string,
    workerScript: string,
    poolSize?: number
  ): Promise<void> {
    const size = Math.min(poolSize || this.config.maxWorkers, this.config.maxWorkers);
    
    for (let i = 0; i < size; i++) {
      const workerId = `${workerName}-${i}`;
      await this.createWorker(workerId, workerScript);
    }
  }

  /**
   * Create a single worker
   */
  private async createWorker(workerId: string, workerScript: string): Promise<void> {
    try {
      if (typeof Worker === 'undefined') {
        throw new Error('Web Workers not supported in this environment');
      }
      const worker = new Worker(workerScript, { type: 'module' });
      
      worker.onmessage = (event) => {
        this.handleWorkerMessage(workerId, event);
      };
      
      worker.onerror = (error) => {
        this.handleWorkerError(workerId, error);
      };
      
      this.workers.set(workerId, worker);
      this.availableWorkers.add(workerId);
      
      console.log(`Worker ${workerId} created successfully`);
    } catch (error) {
      console.error(`Failed to create worker ${workerId}:`, error);
      throw error;
    }
  }

  /**
   * Execute task on available worker
   */
  async executeTask<T = any>(
    workerType: string,
    taskType: string,
    data: any,
    timeout?: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const taskId = this.generateTaskId();
      const task: WorkerTask = {
        id: taskId,
        type: taskType,
        data,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      // Set timeout
      const timeoutMs = timeout || this.config.taskTimeout;
      const timeoutId = setTimeout(() => {
        this.handleTaskTimeout(taskId);
      }, timeoutMs);

      // Store timeout ID with task
      (task as any).timeoutId = timeoutId;

      // Try to assign worker immediately
      const workerId = this.findAvailableWorker(workerType);
      if (workerId) {
        this.assignTask(workerId, task);
      } else {
        // Queue task for later
        this.taskQueue.push(task);
      }
    });
  }

  /**
   * Find available worker of specified type
   */
  private findAvailableWorker(workerType: string): string | null {
    for (const workerId of this.availableWorkers) {
      if (workerId.startsWith(workerType)) {
        return workerId;
      }
    }
    return null;
  }

  /**
   * Assign task to worker
   */
  private assignTask(workerId: string, task: WorkerTask): void {
    const worker = this.workers.get(workerId);
    if (!worker) {
      task.reject(new Error(`Worker ${workerId} not found`));
      return;
    }

    // Move worker from available to busy
    this.availableWorkers.delete(workerId);
    this.busyWorkers.add(workerId);
    
    // Store active task
    this.activeTasks.set(task.id, task);
    
    // Send message to worker
    worker.postMessage({
      type: task.type,
      data: task.data,
      id: task.id,
    });
  }

  /**
   * Handle worker message
   */
  private handleWorkerMessage(workerId: string, event: MessageEvent): void {
    const { type, id, result, error } = event.data;
    
    const task = this.activeTasks.get(id);
    if (!task) {
      console.warn(`Received message for unknown task: ${id}`);
      return;
    }

    // Clear timeout
    if ((task as any).timeoutId) {
      clearTimeout((task as any).timeoutId);
    }

    // Remove from active tasks
    this.activeTasks.delete(id);
    
    // Move worker back to available
    this.busyWorkers.delete(workerId);
    this.availableWorkers.add(workerId);
    
    // Handle result
    if (type === 'success') {
      task.resolve(result);
    } else if (type === 'error') {
      task.reject(new Error(error));
    }
    
    // Process next task in queue
    this.processQueue();
  }

  /**
   * Handle worker error
   */
  private handleWorkerError(workerId: string, error: ErrorEvent): void {
    console.error(`Worker ${workerId} error:`, error);
    
    // Find and reject all tasks assigned to this worker
    for (const [taskId, task] of this.activeTasks.entries()) {
      if (this.busyWorkers.has(workerId)) {
        task.reject(new Error(`Worker error: ${error.message}`));
        this.activeTasks.delete(taskId);
        
        // Clear timeout
        if ((task as any).timeoutId) {
          clearTimeout((task as any).timeoutId);
        }
      }
    }
    
    // Remove worker from pools
    this.availableWorkers.delete(workerId);
    this.busyWorkers.delete(workerId);
    
    // Terminate and recreate worker
    this.recreateWorker(workerId);
  }

  /**
   * Handle task timeout
   */
  private handleTaskTimeout(taskId: string): void {
    const task = this.activeTasks.get(taskId);
    if (!task) return;
    
    // Remove from active tasks
    this.activeTasks.delete(taskId);
    
    // Find and free the worker
    for (const workerId of this.busyWorkers) {
      // This is a simplified approach - in a real implementation,
      // you'd track which worker is handling which task
      if (this.workers.has(workerId)) {
        this.busyWorkers.delete(workerId);
        this.availableWorkers.add(workerId);
        break;
      }
    }
    
    // Reject the task
    task.reject(new Error('Task timeout'));
    
    // Process next task
    this.processQueue();
  }

  /**
   * Process task queue
   */
  private processQueue(): void {
    if (this.taskQueue.length === 0) return;
    
    // Find available workers and assign tasks
    while (this.taskQueue.length > 0 && this.availableWorkers.size > 0) {
      const task = this.taskQueue.shift()!;
      const workerType = this.inferWorkerType(task.type);
      const workerId = this.findAvailableWorker(workerType);
      
      if (workerId) {
        this.assignTask(workerId, task);
      } else {
        // Put task back in queue
        this.taskQueue.unshift(task);
        break;
      }
    }
  }

  /**
   * Infer worker type from task type
   */
  private inferWorkerType(taskType: string): string {
    if (taskType.includes('image') || taskType.includes('Image')) {
      return 'image-processor';
    }
    
    // Add more worker type inference logic here
    return 'default';
  }

  /**
   * Recreate failed worker
   */
  private async recreateWorker(workerId: string): void {
    try {
      // Terminate existing worker
      const worker = this.workers.get(workerId);
      if (worker) {
        worker.terminate();
        this.workers.delete(workerId);
      }
      
      // Extract worker type and script from workerId
      const workerType = workerId.split('-')[0];
      const workerScript = this.getWorkerScript(workerType);
      
      if (workerScript) {
        await this.createWorker(workerId, workerScript);
        console.log(`Worker ${workerId} recreated successfully`);
      }
    } catch (error) {
      console.error(`Failed to recreate worker ${workerId}:`, error);
    }
  }

  /**
   * Get worker script URL by type
   */
  private getWorkerScript(workerType: string): string | null {
    const scripts: Record<string, string> = {
      'image-processor': '/src/workers/image-processor.worker.ts',
    };
    
    return scripts[workerType] || null;
  }

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    return `task-${++this.taskIdCounter}-${Date.now()}`;
  }

  /**
   * Get worker pool statistics
   */
  getStats(): {
    totalWorkers: number;
    availableWorkers: number;
    busyWorkers: number;
    queuedTasks: number;
    activeTasks: number;
  } {
    return {
      totalWorkers: this.workers.size,
      availableWorkers: this.availableWorkers.size,
      busyWorkers: this.busyWorkers.size,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.activeTasks.size,
    };
  }

  /**
   * Terminate all workers
   */
  terminateAll(): void {
    // Clear all timeouts
    for (const task of this.activeTasks.values()) {
      if ((task as any).timeoutId) {
        clearTimeout((task as any).timeoutId);
      }
      task.reject(new Error('Worker manager terminated'));
    }
    
    // Terminate all workers
    for (const worker of this.workers.values()) {
      worker.terminate();
    }
    
    // Clear all data structures
    this.workers.clear();
    this.availableWorkers.clear();
    this.busyWorkers.clear();
    this.taskQueue.length = 0;
    this.activeTasks.clear();
  }

  /**
   * Cleanup idle workers (call periodically)
   */
  cleanupIdleWorkers(): void {
    // This is a placeholder for idle worker cleanup logic
    // In a real implementation, you'd track worker idle time
    // and terminate workers that have been idle for too long
  }
}

// Image Processing Worker Interface
export class ImageWorkerManager extends WorkerManager {
  constructor() {
    super({
      maxWorkers: Math.min((typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 2) || 2, 4),
      idleTimeout: 30000,
      taskTimeout: 120000, // 2 minutes for image processing
    });
    
    // Only initialize workers in browser environment
    if (typeof window !== 'undefined') {
      this.initializeImageWorkers();
    }
  }

  private async initializeImageWorkers(): Promise<void> {
    try {
      await this.createWorkerPool(
        'image-processor',
        '/src/workers/image-processor.worker.ts',
        2
      );
    } catch (error) {
      console.error('Failed to initialize image workers:', error);
    }
  }

  /**
   * Process image with compression and resizing
   */
  async processImage(
    imageData: ArrayBuffer,
    options: any = {}
  ): Promise<any> {
    return this.executeTask(
      'image-processor',
      'processImage',
      { imageData, options }
    );
  }

  /**
   * Extract text from image using OCR
   */
  async extractText(imageData: ArrayBuffer): Promise<any> {
    return this.executeTask(
      'image-processor',
      'extractText',
      { imageData }
    );
  }

  /**
   * Analyze if image is a receipt
   */
  async analyzeReceipt(imageData: ArrayBuffer): Promise<any> {
    return this.executeTask(
      'image-processor',
      'analyzeReceipt',
      { imageData }
    );
  }

  /**
   * Enhance image for better OCR results
   */
  async enhanceForOCR(imageData: ArrayBuffer): Promise<ArrayBuffer> {
    return this.executeTask(
      'image-processor',
      'enhanceForOCR',
      { imageData }
    );
  }
}

// Singleton instances (only create in browser environment)
export const workerManager = typeof window !== 'undefined' ? new WorkerManager() : null as any;
export const imageWorkerManager = typeof window !== 'undefined' ? new ImageWorkerManager() : null as any;

// React hook for worker status
export function useWorkerStatus() {
  if (typeof window === 'undefined') {
    return {
      totalWorkers: 0,
      availableWorkers: 0,
      busyWorkers: 0,
      queuedTasks: 0,
      activeTasks: 0,
    };
  }
  
  const [stats, setStats] = useState(workerManager.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(workerManager.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return stats;
}

export default workerManager;
