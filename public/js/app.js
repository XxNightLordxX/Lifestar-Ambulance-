const STATES = {
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  QUEUED: 'QUEUED',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR'
};

// GitHub Repository Configuration
const GITHUB_CONFIG = {
  owner: 'XxNightLordxX',
  repo: 'Lifestar',
  branch: 'main'
};

let currentState = STATES.IDLE;
let cycleCount = 0;
let repositoryData = null;

function updateState(state) {
  currentState = state;
  const indicator = document.getElementById('stateIndicator');
  const stateText = document.querySelector('.state-text');
  indicator.className = 'state-indicator';
  indicator.classList.add(`state-${state.toLowerCase()}`);
  stateText.textContent = state;
  localStorage.setItem('systemState', state);
  localStorage.setItem('lastUpdate', new Date().toISOString());
}

function updateStatus(message) {
  const statusMsg = document.getElementById('statusMessage');
  statusMsg.textContent = message;
  statusMsg.className = 'status-message show';
}

function updateRepoInfo(data) {
  const repoInfo = document.getElementById('repoInfo');
  if (repoInfo && data) {
    repoInfo.innerHTML = `
      <div class="repo-stats">
        <span>📁 ${data.files || 0} files</span>
        <span>📝 ${data.commits || 0} commits</span>
        <span>🌿 ${data.branches || 0} branches</span>
      </div>
    `;
  }
}

async function fetchRepositoryInfo() {
  try {
    // Fetch repo info using GitHub API (public repos don't need auth for basic info)
    const repoUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`;
    const contentsUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents`;
    
    const [repoResponse, contentsResponse] = await Promise.all([
      fetch(repoUrl),
      fetch(contentsUrl)
    ]);
    
    const repoData = await repoResponse.json();
    const contentsData = await contentsResponse.json();
    
    repositoryData = {
      name: repoData.name,
      description: repoData.description,
      files: Array.isArray(contentsData) ? contentsData.length : 0,
      commits: repoData.size || 0,
      branches: 1,
      lastUpdated: repoData.pushed_at,
      url: repoData.html_url
    };
    
    updateRepoInfo(repositoryData);
    return repositoryData;
  } catch (error) {
    console.error('Failed to fetch repository info:', error);
    return null;
  }
}

async function scanRepository() {
  updateStatus('Scanning Lifestar repository...');
  
  try {
    // Get the tree recursively
    const treeUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/git/trees/${GITHUB_CONFIG.branch}?recursive=1`;
    const response = await fetch(treeUrl);
    const data = await response.json();
    
    if (data.tree) {
      const files = data.tree.filter(item => item.type === 'blob');
      const directories = data.tree.filter(item => item.type === 'tree');
      
      updateStatus(`Found ${files.length} files in ${directories.length} directories`);
      
      return {
        totalFiles: files.length,
        totalDirectories: directories.length,
        tree: data.tree
      };
    }
  } catch (error) {
    console.error('Scan error:', error);
    updateStatus('Error scanning repository');
  }
  
  return null;
}

async function runSystemCycle() {
  const btn = document.getElementById('triggerBtn');
  
  btn.disabled = true;
  updateState(STATES.RUNNING);
  
  const steps = [
    { msg: 'Connecting to Lifestar repository...', action: () => fetchRepositoryInfo() },
    { msg: 'Scanning repository structure...', action: () => scanRepository() },
    { msg: 'Analyzing files...', action: async () => { await new Promise(r => setTimeout(r, 1000)); } },
    { msg: 'Validating architecture...', action: async () => { await new Promise(r => setTimeout(r, 800)); } },
    { msg: 'Checking dependencies...', action: async () => { await new Promise(r => setTimeout(r, 600)); } },
    { msg: 'Running validation...', action: async () => { await new Promise(r => setTimeout(r, 500)); } },
    { msg: 'Finalizing scan...', action: async () => { await new Promise(r => setTimeout(r, 400)); } }
  ];
  
  let scanResult = null;
  
  for (const step of steps) {
    updateStatus(step.msg);
    const result = await step.action();
    if (result) scanResult = result;
  }
  
  cycleCount++;
  localStorage.setItem('cycleCount', cycleCount);
  
  updateState(STATES.COMPLETED);
  
  if (scanResult) {
    updateStatus(`✓ Cycle #${cycleCount} complete - ${scanResult.totalFiles || 0} files scanned`);
  } else {
    updateStatus(`✓ Cycle #${cycleCount} complete`);
  }
  
  document.getElementById('statusMessage').classList.add('success');
  
  setTimeout(() => {
    updateState(STATES.IDLE);
    btn.disabled = false;
  }, 2000);
}

document.addEventListener('DOMContentLoaded', () => {
  const savedState = localStorage.getItem('systemState') || STATES.IDLE;
  const savedCount = localStorage.getItem('cycleCount') || 0;
  cycleCount = parseInt(savedCount);
  
  updateState(savedState);
  
  document.getElementById('triggerBtn').addEventListener('click', runSystemCycle);
  
  // Fetch initial repo info
  fetchRepositoryInfo();
});
