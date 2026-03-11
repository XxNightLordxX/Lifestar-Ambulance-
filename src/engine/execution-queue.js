/**
 * Deterministic Execution Queue
 * 
 * Manages trigger queue with:
 * - FIFO processing
 * - Trigger deduplication
 * - Concurrent trigger merging
 * - Safe sequencing
 */

export class ExecutionQueue {
  constructor() {
    // Queue of pending triggers
    this._queue = [];
    
    // Flag indicating if processing is active
    this._isProcessing = false;
    
    // Timestamp of last processed trigger
    this._lastProcessedAt = null;
    
    // Set of trigger IDs for deduplication
    this._pendingTriggers = new Set();
    
    // Maximum queue size (prevents memory issues)
    this._maxQueueSize = 100;
  }
  
  /**
   * Adds a trigger to the queue
   * @param {Object} trigger - Trigger object with optional id
   * @returns {boolean} Whether trigger was added
   */
  enqueue(trigger = {}) {
    // Generate unique ID if not provided
    const triggerId = trigger.id || this._generateTriggerId();
    
    // Deduplicate: skip if same trigger already pending
    if (this._pendingTriggers.has(triggerId)) {
      return false;
    }
    
    // Prevent queue overflow
    if (this._queue.length >= this._maxQueueSize) {
      console.warn('Queue overflow, dropping oldest trigger');
      const removed = this._queue.shift();
      if (removed) {
        this._pendingTriggers.delete(removed.id);
      }
    }
    
    // Add to queue
    const queueItem = {
      id: triggerId,
      timestamp: Date.now(),
      data: trigger.data || null
    };
    
    this._queue.push(queueItem);
    this._pendingTriggers.add(triggerId);
    
    return true;
  }
  
  /**
   * Removes and returns the next trigger from queue
   * @returns {Object|null} Next trigger or null if empty
   */
  dequeue() {
    if (this._queue.length === 0) {
      return null;
    }
    
    const item = this._queue.shift();
    this._pendingTriggers.delete(item.id);
    this._lastProcessedAt = Date.now();
    
    return item;
  }
  
  /**
   * Peeks at the next trigger without removing it
   * @returns {Object|null} Next trigger or null if empty
   */
  peek() {
    return this._queue.length > 0 ? this._queue[0] : null;
  }
  
  /**
   * Gets the current queue length
   * @returns {number} Queue length
   */
  getLength() {
    return this._queue.length;
  }
  
  /**
   * Checks if queue is empty
   * @returns {boolean} Whether queue is empty
   */
  isEmpty() {
    return this._queue.length === 0;
  }
  
  /**
   * Checks if queue has items pending
   * @returns {boolean} Whether queue has pending items
   */
  hasPending() {
    return this._queue.length > 0;
  }
  
  /**
   * Checks if processing is active
   * @returns {boolean} Whether processing is active
   */
  isProcessing() {
    return this._isProcessing;
  }
  
  /**
   * Sets processing flag
   * @param {boolean} value - Processing state
   */
  setProcessing(value) {
    this._isProcessing = value;
  }
  
  /**
   * Gets timestamp of last processed trigger
   * @returns {number|null} Timestamp or null
   */
  getLastProcessedAt() {
    return this._lastProcessedAt;
  }
  
  /**
   * Clears the queue
   */
  clear() {
    this._queue = [];
    this._pendingTriggers.clear();
  }
  
  /**
   * Merges similar triggers (optional optimization)
   * Combines triggers with same type
   */
  mergeSimilar() {
    // For this system, we keep all triggers separate
    // to maintain deterministic ordering
    // This method exists for future optimization
  }
  
  /**
   * Generates a unique trigger ID
   * @returns {string} Unique ID
   */
  _generateTriggerId() {
    return `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Gets queue status (safe for logging)
   * @returns {Object} Queue status
   */
  getStatus() {
    return {
      length: this._queue.length,
      isProcessing: this._isProcessing,
      hasPending: this.hasPending()
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Gets the singleton ExecutionQueue instance
 * @returns {ExecutionQueue} ExecutionQueue instance
 */
export function getExecutionQueue() {
  if (!instance) {
    instance = new ExecutionQueue();
  }
  return instance;
}