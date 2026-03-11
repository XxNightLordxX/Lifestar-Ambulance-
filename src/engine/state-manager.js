/**
 * Deterministic State Manager
 * 
 * Manages the system state machine with strict guarantees:
 * - Single state at any time
 * - Deterministic transitions
 * - Self-correcting behavior
 * - Safe state updates
 */

// State constants - exactly 5 states as specified
export const STATES = Object.freeze({
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  QUEUED: 'QUEUED',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR'
});

// Valid state transitions (deterministic)
const VALID_TRANSITIONS = Object.freeze({
  [STATES.IDLE]: [STATES.RUNNING],
  [STATES.RUNNING]: [STATES.COMPLETED, STATES.ERROR, STATES.QUEUED],
  [STATES.QUEUED]: [STATES.RUNNING, STATES.IDLE],
  [STATES.COMPLETED]: [STATES.IDLE],
  [STATES.ERROR]: [STATES.RUNNING, STATES.IDLE]
});

/**
 * StateManager class
 * Implements a deterministic state machine with single-state guarantee
 */
export class StateManager {
  constructor() {
    // Single authoritative state
    this._state = STATES.IDLE;
    
    // State change listeners
    this._listeners = new Set();
    
    // Error tracking for self-correction
    this._errorCount = 0;
    this._maxRetries = 3;
    
    // Timestamp of last state change
    this._lastStateChange = Date.now();
  }
  
  /**
   * Gets the current state
   * @returns {string} Current state
   */
  getState() {
    return this._state;
  }
  
  /**
   * Gets the timestamp of last state change
   * @returns {number} Timestamp in milliseconds
   */
  getLastStateChange() {
    return this._lastStateChange;
  }
  
  /**
   * Attempts to transition to a new state
   * @param {string} newState - Target state
   * @returns {boolean} Whether transition was successful
   */
  transition(newState) {
    // Validate state
    if (!Object.values(STATES).includes(newState)) {
      console.error(`Invalid state: ${newState}`);
      return false;
    }
    
    const currentState = this._state;
    
    // Check if transition is valid
    const allowedTransitions = VALID_TRANSITIONS[currentState];
    if (!allowedTransitions.includes(newState)) {
      console.error(`Invalid transition: ${currentState} -> ${newState}`);
      return false;
    }
    
    // Perform transition
    this._state = newState;
    this._lastStateChange = Date.now();
    
    // Track errors
    if (newState === STATES.ERROR) {
      this._errorCount++;
    } else if (newState === STATES.COMPLETED) {
      this._errorCount = 0;
    }
    
    // Notify listeners
    this._notifyListeners(newState, currentState);
    
    return true;
  }
  
  /**
   * Forces a state transition (for self-correction)
   * @param {string} newState - Target state
   */
  forceTransition(newState) {
    const previousState = this._state;
    this._state = newState;
    this._lastStateChange = Date.now();
    this._notifyListeners(newState, previousState);
  }
  
  /**
   * Checks if transition to new state is valid
   * @param {string} newState - Target state
   * @returns {boolean} Whether transition is valid
   */
  canTransitionTo(newState) {
    return VALID_TRANSITIONS[this._state].includes(newState);
  }
  
  /**
   * Gets error count
   * @returns {number} Number of errors
   */
  getErrorCount() {
    return this._errorCount;
  }
  
  /**
   * Checks if max retries exceeded
   * @returns {boolean} Whether max retries exceeded
   */
  isMaxRetriesExceeded() {
    return this._errorCount >= this._maxRetries;
  }
  
  /**
   * Resets error count
   */
  resetErrorCount() {
    this._errorCount = 0;
  }
  
  /**
   * Adds a state change listener
   * @param {Function} listener - Callback function
   */
  addListener(listener) {
    this._listeners.add(listener);
  }
  
  /**
   * Removes a state change listener
   * @param {Function} listener - Callback function
   */
  removeListener(listener) {
    this._listeners.delete(listener);
  }
  
  /**
   * Notifies all listeners of state change
   * @param {string} newState - New state
   * @param {string} previousState - Previous state
   */
  _notifyListeners(newState, previousState) {
    for (const listener of this._listeners) {
      try {
        listener(newState, previousState);
      } catch (error) {
        // Don't let listener errors affect state machine
        console.error('Listener error:', error);
      }
    }
  }
  
  /**
   * Gets safe state for public exposure
   * Returns only the state name, no internal details
   * @returns {Object} Safe state object
   */
  getSafeState() {
    return {
      state: this._state
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Gets the singleton StateManager instance
 * @returns {StateManager} StateManager instance
 */
export function getStateManager() {
  if (!instance) {
    instance = new StateManager();
  }
  return instance;
}