const STATES = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  QUEUED: 'QUEUED',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR'
};

function getApiBaseUrl() {
  if (window.location.hostname.includes('github.io')) {
    return 'https://00h1n.app.super.myninja.ai';
  }
  return '';
}

async function fetchState() {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/state`);
    const data = await response.json();
    updateState(data.state);
  } catch (error) {
    updateState(STATES.IDLE);
  }
}

function updateState(state) {
  const indicator = document.getElementById('stateIndicator');
  const stateText = document.querySelector('.state-text');
  indicator.className = 'state-indicator';
  indicator.classList.add(`state-${state.toLowerCase()}`);
  stateText.textContent = state;
}

async function triggerExecution() {
  const btn = document.getElementById('triggerBtn');
  const statusMsg = document.getElementById('statusMessage');
  btn.disabled = true;
  statusMsg.className = 'status-message';
  
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    updateState(data.state);
    statusMsg.textContent = 'Execution triggered successfully';
    statusMsg.classList.add('show', 'success');
    pollForCompletion();
  } catch (error) {
    statusMsg.textContent = 'Failed to trigger execution';
    statusMsg.classList.add('show', 'error');
    btn.disabled = false;
  }
}

async function pollForCompletion() {
  const btn = document.getElementById('triggerBtn');
  const maxAttempts = 60;
  let attempts = 0;
  
  const poll = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/api/state`);
      const data = await response.json();
      updateState(data.state);
      if (data.state === STATES.IDLE || data.state === STATES.COMPLETED || data.state === STATES.ERROR) {
        btn.disabled = false;
        return;
      }
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 1000);
      } else {
        btn.disabled = false;
      }
    } catch (error) {
      setTimeout(poll, 1000);
    }
  };
  poll();
}

document.addEventListener('DOMContentLoaded', () => {
  fetchState();
  document.getElementById('triggerBtn').addEventListener('click', triggerExecution);
  setInterval(fetchState, 5000);
});
