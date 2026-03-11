/**
 * System Repository Website - Frontend Application
 * 
 * Minimal UI that exposes only:
 * - State indicator (IDLE, RUNNING, QUEUED, COMPLETED, ERROR)
 * - Trigger control (single button)
 * 
 * No logs, stack traces, or internal details are exposed.
 */

(function() {
  'use strict';
  
  // State constants - exactly 5 states as specified
  const STATES = Object.freeze({
    IDLE: 'IDLE',
    RUNNING: 'RUNNING',
    QUEUED: 'QUEUED',
    COMPLETED: 'COMPLETED',
    ERROR: 'ERROR'
  });
  
  // DOM elements
  const stateIndicator = document.getElementById('stateIndicator');
  const stateText = stateIndicator.querySelector('.state-text');
  const triggerButton = document.getElementById('triggerButton');
  
  // Current state
  let currentState = STATES.IDLE;
  
  /**
   * Updates the state indicator display
   * @param {string} state - One of the 5 valid states
   */
  function updateState(state) {
    // Validate state
    if (!Object.values(STATES).includes(state)) {
      console.error('Invalid state:', state);
      return;
    }
    
    // Update internal state
    currentState = state;
    
    // Remove all state classes
    Object.values(STATES).forEach(s => {
      stateIndicator.classList.remove(`state-${s.toLowerCase()}`);
    });
    
    // Add new state class
    stateIndicator.classList.add(`state-${state.toLowerCase()}`);
    
    // Update text
    stateText.textContent = state;
    
    // Update button state
    updateButtonState();
  }
  
  /**
   * Updates the trigger button based on current state
   */
  function updateButtonState() {
    // Button is always enabled (no rate limiting as specified)
    triggerButton.disabled = false;
  }
  
  /**
   * Gets the API base URL
   */
  function getApiBaseUrl() {
    // If running on deployed static site, use the sandbox API
    if (window.location.hostname.includes('sites.super.myninja.ai')) {
      return 'https://00h1n.app.super.myninja.ai';
    }
    // If running locally or on the main domain, use relative paths
    return '';
  }
  
  /**
   * Fetches current state from server
   */
  async function fetchState() {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/state`);
      const data = await response.json();
      updateState(data.state);
    } catch (error) {
      // Silently handle errors - don't expose internal details
      // Default to IDLE if fetch fails
      updateState(STATES.IDLE);
    }
  }
  
  /**
   * Triggers a full system cycle
   */
  async function triggerCycle() {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/trigger`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      updateState(data.state);
    } catch (error) {
      // Silently handle errors - don't expose internal details
      // Refresh state from server
      fetchState();
    }
  }
  
  /**
   * Handles trigger button click
   */
  function handleTrigger() {
    // Immediately show feedback
    if (currentState === STATES.IDLE) {
      updateState(STATES.RUNNING);
    } else if (currentState === STATES.RUNNING) {
      updateState(STATES.QUEUED);
    }
    // Other states: trigger still sends request
    
    // Send trigger to server
    triggerCycle();
  }
  
  /**
   * Polls for state updates
   */
  function startStatePolling() {
    // Poll every 2 seconds for state updates
    setInterval(fetchState, 2000);
  }
  
  /**
   * Initializes the application
   */
  function init() {
    // Set initial state
    updateState(STATES.IDLE);
    
    // Bind event listener
    triggerButton.addEventListener('click', handleTrigger);
    
    // Start polling for state
    fetchState();
    startStatePolling();
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();