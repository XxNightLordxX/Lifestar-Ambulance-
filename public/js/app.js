const STATES = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  QUEUED: 'QUEUED',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR'
};

let currentState = STATES.IDLE;
let cycleCount = 0;

function updateState(state) {
  currentState = state;
  const indicator = document.getElementById('stateIndicator');
  const stateText = document.querySelector('.state-text');
  indicator.className = 'state-indicator';
  indicator.classList.add(`state-${state.toLowerCase()}`);
  stateText.textContent = state;
  
  // Save state to localStorage
  localStorage.setItem('systemState', state);
  localStorage.setItem('lastUpdate', new Date().toISOString());
}

async function runSystemCycle() {
  const btn = document.getElementById('triggerBtn');
  const statusMsg = document.getElementById('statusMessage');
  
  btn.disabled = true;
  statusMsg.className = 'status-message';
  
  updateState(STATES.RUNNING);
  statusMsg.textContent = 'Running system cycle...';
  statusMsg.classList.add('show');
  
  // Simulate system processing
  const steps = [
    'Analyzing repository...',
    'Validating architecture...',
    'Checking dependencies...',
    'Running tests...',
    'Updating documentation...',
    'Finalizing...'
  ];
  
  for (let i = 0; i < steps.length; i++) {
    await new Promise(resolve => setTimeout(resolve, 800));
    statusMsg.textContent = steps[i];
  }
  
  cycleCount++;
  localStorage.setItem('cycleCount', cycleCount);
  
  updateState(STATES.COMPLETED);
  statusMsg.textContent = `Cycle #${cycleCount} completed successfully!`;
  statusMsg.classList.add('success');
  
  setTimeout(() => {
    updateState(STATES.IDLE);
    btn.disabled = false;
  }, 2000);
}

document.addEventListener('DOMContentLoaded', () => {
  // Restore state from localStorage
  const savedState = localStorage.getItem('systemState') || STATES.IDLE;
  const savedCount = localStorage.getItem('cycleCount') || 0;
  cycleCount = parseInt(savedCount);
  
  updateState(savedState);
  
  document.getElementById('triggerBtn').addEventListener('click', runSystemCycle);
});
