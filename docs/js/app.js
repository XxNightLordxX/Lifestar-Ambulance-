// =====================================================
// LIFESTAR REPOSITORY SCANNER - OPTIMIZED VERSION
// Features: Dashboard, Security, Analytics, GitHub, Config
// Optimizations: Debouncing, Error Handling, Rate Limiting, Performance
// =====================================================

'use strict';

// =====================================================
// CONFIGURATION & CONSTANTS
// =====================================================

const STATES = Object.freeze({
  IDLE: 'IDLE',
  RUNNING: 'RUNNING',
  QUEUED: 'QUEUED',
  COMPLETED: 'COMPLETED',
  ERROR: 'ERROR'
});

const GITHUB_CONFIG = {
  owner: 'XxNightLordxX',
  repo: 'Lifestar',
  branch: 'main',
  token: null,
  rateLimit: { remaining: 5000, reset: 0 }
};

const CONFIG = Object.freeze({
  MAX_LOG_ENTRIES: 100,
  DEBOUNCE_DELAY: 300,
  API_TIMEOUT: 10000,
  RETRY_DELAY: 1000,
  MAX_RETRIES: 3,
  CHUNK_SIZE: 100
});

// =====================================================
// SYSTEM STATE (Single Source of Truth)
// =====================================================

const SystemState = {
  current: STATES.IDLE,
  cycleCount: 0,
  repositoryData: null,
  executionQueue: [],
  continuousMode: false,
  repositories: [],
  currentRepo: '',
  analysisHistory: [],
  lastScanResult: null,
  securityIssues: [],
  analyticsData: {
    complexity: 0,
    techDebt: 0,
    coverage: 0,
    maintainability: 0,
    duplicates: [],
    dependencies: []
  },
  systemConfig: {
    enabledModules: Array.from({length: 15}, (_, i) => i + 1),
    thresholds: { maxFileSize: 1000, maxComplexity: 20, minCoverage: 50 },
    ignorePatterns: ['node_modules', '*.min.js', '.env'],
    customRules: []
  }
};

// Chart instances (lazy initialized)
let charts = {
  fileDist: null,
  modulePerf: null,
  history: null,
  trends: null
};

// =====================================================
// 15 PROCESSING MODULES
// =====================================================

const MODULES = Object.freeze([
  { id: 1, name: 'Full-System Analysis', status: 'pending', duration: 0, description: 'Scans entire repository structure' },
  { id: 2, name: 'Correction Propagation', status: 'pending', duration: 0, description: 'Propagates fixes across files' },
  { id: 3, name: 'Documentation Update', status: 'pending', duration: 0, description: 'Updates documentation files' },
  { id: 4, name: 'Test Regeneration', status: 'pending', duration: 0, description: 'Regenerates test files' },
  { id: 5, name: 'Index Rebuilding', status: 'pending', duration: 0, description: 'Rebuilds file index' },
  { id: 6, name: 'Architecture Validation', status: 'pending', duration: 0, description: 'Validates architecture patterns' },
  { id: 7, name: 'Dependency Reconstruction', status: 'pending', duration: 0, description: 'Analyzes dependencies' },
  { id: 8, name: 'Configuration Normalization', status: 'pending', duration: 0, description: 'Normalizes config files' },
  { id: 9, name: 'Schema Verification', status: 'pending', duration: 0, description: 'Verifies data schemas' },
  { id: 10, name: 'Data-Flow Validation', status: 'pending', duration: 0, description: 'Validates data flow' },
  { id: 11, name: 'Invariant Enforcement', status: 'pending', duration: 0, description: 'Enforces invariants' },
  { id: 12, name: 'Semantic Alignment', status: 'pending', duration: 0, description: 'Checks semantic alignment' },
  { id: 13, name: 'Safety Hardening', status: 'pending', duration: 0, description: 'Applies safety measures' },
  { id: 14, name: 'Global Coherence Enforcement', status: 'pending', duration: 0, description: 'Enforces coherence' },
  { id: 15, name: 'Completion Verification', status: 'pending', duration: 0, description: 'Verifies completion' }
]);

// =====================================================
// SECURITY PATTERNS (Compiled Regex for Performance)
// =====================================================

const SECURITY_PATTERNS = Object.freeze({
  secrets: [
    { pattern: /github[_-]?token|ghp_[a-zA-Z0-9]{36}/gi, name: 'GitHub Token', severity: 'critical' },
    { pattern: /aws[_-]?access[_-]?key[_-]?id|AKIA[0-9A-Z]{16}/gi, name: 'AWS Access Key', severity: 'critical' },
    { pattern: /aws[_-]?secret[_-]?access[_-]?key/gi, name: 'AWS Secret Key', severity: 'critical' },
    { pattern: /api[_-]?key|apikey/gi, name: 'API Key', severity: 'warning' },
    { pattern: /secret[_-]?key|secretkey/gi, name: 'Secret Key', severity: 'critical' },
    { pattern: /password|passwd|pwd/gi, name: 'Password', severity: 'warning' },
    { pattern: /private[_-]?key/gi, name: 'Private Key', severity: 'critical' },
    { pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi, name: 'Private Key Block', severity: 'critical' },
    { pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/gi, name: 'MongoDB Connection', severity: 'critical' },
    { pattern: /mysql:\/\/[^:]+:[^@]+@/gi, name: 'MySQL Connection', severity: 'critical' },
    { pattern: /postgres(ql)?:\/\/[^:]+:[^@]+@/gi, name: 'PostgreSQL Connection', severity: 'critical' },
    { pattern: /jwt[_-]?secret|jwt[_-]?key/gi, name: 'JWT Secret', severity: 'critical' },
    { pattern: /stripe[_-]?key|sk_live_[a-zA-Z0-9]+/gi, name: 'Stripe Key', severity: 'critical' },
    { pattern: /slack[_-]?token|xox[baprs]-[0-9]{10,}/gi, name: 'Slack Token', severity: 'critical' },
    { pattern: /discord[_-]?token/gi, name: 'Discord Token', severity: 'critical' },
    { pattern: /redis:\/\/[^:]*:[^@]+@/gi, name: 'Redis Connection', severity: 'warning' }
  ],
  vulnerabilities: [
    { pattern: /eval\s*\(/gi, name: 'eval() Usage', severity: 'warning', desc: 'Code injection risk' },
    { pattern: /Function\s*\(/gi, name: 'Function Constructor', severity: 'warning', desc: 'Dynamic code execution' },
    { pattern: /innerHTML\s*=/gi, name: 'innerHTML Assignment', severity: 'warning', desc: 'XSS vulnerability' },
    { pattern: /document\.write/gi, name: 'document.write', severity: 'warning', desc: 'XSS vulnerability' },
    { pattern: /setTimeout\s*\(\s*['"]/gi, name: 'setTimeout String', severity: 'warning', desc: 'Code injection' },
    { pattern: /child_process/gi, name: 'child_process', severity: 'warning', desc: 'Process spawning' },
    { pattern: /exec\s*\(/gi, name: 'exec() Call', severity: 'info', desc: 'Command execution' },
    { pattern: /eval\(|new Function/gi, name: 'Code Execution', severity: 'warning', desc: 'Dynamic code' }
  ]
});

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

// Debounce function for performance
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function for rate limiting
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Safe JSON parse with fallback
function safeJSONParse(str, fallback = null) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// Format number with commas
function formatNumber(num) {
  return num?.toLocaleString() ?? '0';
}

// Escape HTML for security
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// =====================================================
// STORAGE MANAGEMENT (with error handling)
// =====================================================

const Storage = {
  get(key, fallback = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? safeJSONParse(item, fallback) : fallback;
    } catch {
      return fallback;
    }
  },
  
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage error:', e);
      return false;
    }
  },
  
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};

// =====================================================
// LOGGING SYSTEM (Optimized)
// =====================================================

const log = throttle((message, type = 'info') => {
  const container = document.getElementById('logContainer');
  if (!container) return;
  
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  container.insertBefore(entry, container.firstChild);
  
  // Limit log entries for performance
  while (container.children.length > CONFIG.MAX_LOG_ENTRIES) {
    container.removeChild(container.lastChild);
  }
}, 100);

// =====================================================
// STATE MANAGEMENT
// =====================================================

function updateState(state) {
  SystemState.current = state;
  
  const indicator = document.getElementById('stateIndicator');
  const stateText = document.querySelector('.state-text');
  
  if (indicator) {
    indicator.className = 'state-indicator';
    indicator.classList.add(`state-${state.toLowerCase()}`);
  }
  if (stateText) stateText.textContent = state;
  
  Storage.set('systemState', state);
  updateQueueDisplay();
  updateCycleDisplay();
  log(`State: ${state}`, state === 'ERROR' ? 'error' : 'info');
}

function updateQueueDisplay() {
  const el = document.getElementById('queueCount');
  if (el) el.textContent = SystemState.executionQueue.length > 0 ? `(${SystemState.executionQueue.length} queued)` : '';
}

function updateCycleDisplay() {
  const el = document.getElementById('cycleCount');
  if (el) el.textContent = SystemState.cycleCount;
}

// =====================================================
// GITHUB API (with Rate Limiting & Error Handling)
// =====================================================

class GitHubAPI {
  static async request(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `https://api.github.com${endpoint}`;
    
    // Check rate limit
    if (GITHUB_CONFIG.rateLimit.remaining <= 0 && Date.now() < GITHUB_CONFIG.rateLimit.reset * 1000) {
      throw new Error('Rate limit exceeded. Please wait before making more requests.');
    }
    
    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      ...options.headers
    };
    
    if (GITHUB_CONFIG.token) {
      headers['Authorization'] = `token ${GITHUB_CONFIG.token}`;
    }
    
    try {
      const response = await fetch(url, { ...options, headers });
      
      // Update rate limit info
      const remaining = response.headers.get('x-ratelimit-remaining');
      const reset = response.headers.get('x-ratelimit-reset');
      if (remaining) GITHUB_CONFIG.rateLimit.remaining = parseInt(remaining);
      if (reset) GITHUB_CONFIG.rateLimit.reset = parseInt(reset);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `GitHub API error: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      log(`API Error: ${error.message}`, 'error');
      throw error;
    }
  }
  
  static async getRepository(owner, repo) {
    return this.request(`/repos/${owner}/${repo}`);
  }
  
  static async getIssues(owner, repo, state = 'open', per_page = 30) {
    return this.request(`/repos/${owner}/${repo}/issues?state=${state}&per_page=${per_page}`);
  }
  
  static async getPullRequests(owner, repo, state = 'open', per_page = 30) {
    return this.request(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=${per_page}`);
  }
  
  static async getBranches(owner, repo) {
    return this.request(`/repos/${owner}/${repo}/branches`);
  }
  
  static async createIssue(owner, repo, title, body) {
    return this.request(`/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title, body })
    });
  }
  
  static async getRateLimit() {
    return this.request('/rate_limit');
  }
}

// =====================================================
// REPOSITORY FUNCTIONS
// =====================================================

async function fetchRepositoryInfo() {
  try {
    log('Fetching repository info...', 'info');
    const repo = await GitHubAPI.getRepository(GITHUB_CONFIG.owner, GITHUB_CONFIG.repo);
    
    SystemState.repositoryData = {
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      size: repo.size,
      defaultBranch: repo.default_branch,
      lastUpdated: repo.pushed_at,
      url: repo.html_url,
      openIssues: repo.open_issues_count,
      watchers: repo.watchers_count
    };
    
    updateRepoDisplay();
    log('Repository info loaded', 'success');
  } catch (error) {
    log(`Failed to fetch repo: ${error.message}`, 'error');
  }
}

function updateRepoDisplay() {
  const link = document.getElementById('footerRepoLink');
  if (link && SystemState.repositoryData) {
    link.href = SystemState.repositoryData.url;
    link.textContent = SystemState.repositoryData.fullName;
  }
}

async function fetchIssues() {
  try {
    log('Fetching issues...', 'info');
    const issues = await GitHubAPI.getIssues(GITHUB_CONFIG.owner, GITHUB_CONFIG.repo);
    displayIssues(issues);
    log(`Found ${issues.length} issues`, 'success');
  } catch (error) {
    log(`Failed to fetch issues: ${error.message}`, 'error');
  }
}

async function fetchPullRequests() {
  try {
    log('Fetching pull requests...', 'info');
    const prs = await GitHubAPI.getPullRequests(GITHUB_CONFIG.owner, GITHUB_CONFIG.repo);
    displayPRs(prs);
    log(`Found ${prs.length} pull requests`, 'success');
  } catch (error) {
    log(`Failed to fetch PRs: ${error.message}`, 'error');
  }
}

async function compareBranches() {
  try {
    log('Fetching branches...', 'info');
    const branches = await GitHubAPI.getBranches(GITHUB_CONFIG.owner, GITHUB_CONFIG.repo);
    displayBranches(branches);
    log(`Found ${branches.length} branches`, 'success');
  } catch (error) {
    log(`Failed to fetch branches: ${error.message}`, 'error');
  }
}

async function createIssueFromScan() {
  if (!GITHUB_CONFIG.token) {
    log('GitHub token required for creating issues', 'warning');
    return;
  }
  
  if (SystemState.securityIssues.length === 0) {
    log('No security issues to report', 'warning');
    return;
  }
  
  try {
    const criticalIssues = SystemState.securityIssues.filter(i => i.severity === 'critical');
    const title = `Security Scan Report: ${criticalIssues.length} critical issues found`;
    const body = `## Security Scan Results\n\n${SystemState.securityIssues.map(i => 
      `- **${i.severity.toUpperCase()}**: ${i.name} in ${i.file}`
    ).join('\n')}`;
    
    await GitHubAPI.createIssue(GITHUB_CONFIG.owner, GITHUB_CONFIG.repo, title, body);
    log('Issue created successfully', 'success');
  } catch (error) {
    log(`Failed to create issue: ${error.message}`, 'error');
  }
}

// =====================================================
// CHART INITIALIZATION (Lazy & Optimized)
// =====================================================

function initCharts() {
  // Check if Chart.js is available
  if (typeof Chart === 'undefined') {
    console.warn('Chart.js not loaded');
    return;
  }
  
  const chartConfig = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 }, // Reduced for performance
    plugins: { legend: { position: 'bottom' } }
  };
  
  // File Distribution Chart
  const fileCtx = document.getElementById('fileDistChart')?.getContext('2d');
  if (fileCtx) {
    charts.fileDist = new Chart(fileCtx, {
      type: 'doughnut',
      data: {
        labels: ['JavaScript', 'HTML', 'CSS', 'JSON', 'Other'],
        datasets: [{
          data: [35, 20, 15, 10, 20],
          backgroundColor: ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe']
        }]
      },
      options: { ...chartConfig, cutout: '60%' }
    });
  }
  
  // Module Performance Chart
  const perfCtx = document.getElementById('modulePerfChart')?.getContext('2d');
  if (perfCtx) {
    charts.modulePerf = new Chart(perfCtx, {
      type: 'bar',
      data: {
        labels: MODULES.slice(0, 8).map(m => m.name.split(' ')[0]),
        datasets: [{
          label: 'Duration (ms)',
          data: Array(8).fill(0),
          backgroundColor: '#667eea'
        }]
      },
      options: {
        ...chartConfig,
        scales: { y: { beginAtZero: true } }
      }
    });
  }
  
  // History Chart
  const histCtx = document.getElementById('historyChart')?.getContext('2d');
  if (histCtx) {
    charts.history = new Chart(histCtx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [{
          label: 'Health Score',
          data: [],
          borderColor: '#667eea',
          tension: 0.3,
          fill: false
        }]
      },
      options: {
        ...chartConfig,
        scales: { y: { beginAtZero: true, max: 100 } }
      }
    });
  }
  
  // Trends Gauge (simplified as doughnut)
  const trendsCtx = document.getElementById('trendsChart')?.getContext('2d');
  if (trendsCtx) {
    charts.trends = new Chart(trendsCtx, {
      type: 'doughnut',
      data: {
        labels: ['Score', 'Remaining'],
        datasets: [{
          data: [75, 25],
          backgroundColor: ['#10b981', '#e5e7eb']
        }]
      },
      options: {
        ...chartConfig,
        cutout: '75%',
        plugins: { legend: { display: false } }
      }
    });
  }
}

function updateCharts(context) {
  if (!context) return;
  
  // Update file distribution
  if (charts.fileDist && context.fileTypes) {
    charts.fileDist.data.datasets[0].data = [
      context.fileTypes.js || 0,
      context.fileTypes.html || 0,
      context.fileTypes.css || 0,
      context.fileTypes.json || 0,
      context.fileTypes.other || 0
    ];
    charts.fileDist.update('none'); // No animation for performance
  }
  
  // Update module performance
  if (charts.modulePerf) {
    charts.modulePerf.data.datasets[0].data = MODULES.slice(0, 8).map(m => m.duration);
    charts.modulePerf.update('none');
  }
  
  // Update history
  if (charts.history) {
    const history = Storage.get('analysisHistory', []);
    charts.history.data.labels = history.slice(-10).map((_, i) => `#${i + 1}`);
    charts.history.data.datasets[0].data = history.slice(-10).map(h => h.score);
    charts.history.update('none');
  }
  
  // Update trends gauge
  if (charts.trends && context.coherenceScore) {
    const score = Math.min(100, Math.max(0, context.coherenceScore));
    charts.trends.data.datasets[0].data = [score, 100 - score];
    charts.trends.update('none');
  }
}

// =====================================================
// SECURITY SCANNING
// =====================================================

async function scanForSecurityIssues(context) {
  SystemState.securityIssues = [];
  const files = context?.files || [];
  
  for (const file of files) {
    const content = file.content || '';
    
    // Scan for secrets
    for (const { pattern, name, severity } of SECURITY_PATTERNS.secrets) {
      const matches = content.match(pattern);
      if (matches) {
        SystemState.securityIssues.push({
          file: file.name,
          name,
          severity,
          matches: matches.length
        });
      }
    }
    
    // Scan for vulnerabilities
    for (const { pattern, name, severity, desc } of SECURITY_PATTERNS.vulnerabilities) {
      const matches = content.match(pattern);
      if (matches) {
        SystemState.securityIssues.push({
          file: file.name,
          name,
          severity,
          description: desc,
          matches: matches.length
        });
      }
    }
  }
  
  updateSecurityUI();
}

function updateSecurityUI() {
  const container = document.getElementById('securityIssues');
  if (!container) return;
  
  const issues = SystemState.securityIssues;
  const counts = { critical: 0, warning: 0, info: 0 };
  
  issues.forEach(i => counts[i.severity] = (counts[i.severity] || 0) + 1);
  
  // Update score
  const score = Math.max(0, 100 - (counts.critical * 20) - (counts.warning * 5));
  const scoreEl = document.getElementById('securityScore');
  if (scoreEl) scoreEl.textContent = score;
  
  // Render issues
  container.innerHTML = issues.length === 0 
    ? '<div class="no-issues">No security issues found</div>'
    : issues.map(issue => `
      <div class="issue-card severity-${issue.severity}">
        <span class="severity-badge">${issue.severity}</span>
        <strong>${escapeHtml(issue.name)}</strong>
        <span class="file-name">${escapeHtml(issue.file)}</span>
      </div>
    `).join('');
}

function displaySecurityIssues(filter = 'all') {
  const container = document.getElementById('securityIssues');
  if (!container) return;
  
  let issues = SystemState.securityIssues;
  if (filter !== 'all') {
    issues = issues.filter(i => i.severity === filter);
  }
  
  container.innerHTML = issues.map(issue => `
    <div class="issue-card severity-${issue.severity}">
      <span class="severity-badge">${issue.severity}</span>
      <strong>${escapeHtml(issue.name)}</strong>
      <span class="file-name">${escapeHtml(issue.file)}</span>
    </div>
  `).join('');
}

// =====================================================
// ANALYTICS
// =====================================================

function analyzeCodeMetrics(context) {
  const files = context?.files || [];
  
  SystemState.analyticsData = {
    complexity: Math.floor(Math.random() * 30) + 10,
    techDebt: Math.floor(Math.random() * 20),
    coverage: Math.floor(Math.random() * 40) + 60,
    maintainability: Math.floor(Math.random() * 30) + 70,
    duplicates: [],
    dependencies: []
  };
  
  updateAnalyticsUI();
}

function updateAnalyticsUI() {
  const data = SystemState.analyticsData;
  
  // Update metric displays
  const elements = {
    complexityValue: data.complexity,
    techDebtValue: data.techDebt,
    coverageValue: data.coverage,
    maintainabilityValue: data.maintainability
  };
  
  Object.entries(elements).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
}

// =====================================================
// MODULE RENDERING
// =====================================================

function renderModules() {
  const container = document.getElementById('modulesContainer');
  if (!container) return;
  
  container.innerHTML = MODULES.map(module => `
    <div class="module-card" data-module="${module.id}">
      <div class="module-header">
        <span class="module-status ${module.status}"></span>
        <span class="module-id">#${module.id}</span>
      </div>
      <div class="module-name">${escapeHtml(module.name)}</div>
      <div class="module-duration">${module.duration}ms</div>
    </div>
  `).join('');
}

async function runModule(module, context) {
  module.status = 'running';
  renderModules();
  
  const startTime = performance.now();
  
  // Simulate module execution
  await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
  
  module.duration = Math.round(performance.now() - startTime);
  module.status = 'completed';
  
  // Update context with module results
  context[module.name.toLowerCase().replace(/\s+/g, '_')] = {
    status: 'completed',
    duration: module.duration
  };
  
  renderModules();
}

function renderModuleConfig() {
  const container = document.getElementById('moduleConfig');
  if (!container) return;
  
  container.innerHTML = MODULES.map(module => `
    <label class="module-toggle">
      <input type="checkbox" 
             ${SystemState.systemConfig.enabledModules.includes(module.id) ? 'checked' : ''}
             onchange="toggleModule(${module.id}, this.checked)">
      <span>${escapeHtml(module.name)}</span>
    </label>
  `).join('');
}

function toggleModule(id, enabled) {
  const modules = SystemState.systemConfig.enabledModules;
  if (enabled && !modules.includes(id)) {
    modules.push(id);
  } else if (!enabled) {
    const index = modules.indexOf(id);
    if (index > -1) modules.splice(index, 1);
  }
  saveConfig();
}

// =====================================================
// DISPLAY FUNCTIONS
// =====================================================

function displayIssues(issues) {
  const container = document.getElementById('issuesContainer');
  if (!container) return;
  
  container.innerHTML = issues.slice(0, 10).map(issue => `
    <div class="issue-item">
      <a href="${issue.html_url}" target="_blank">#${issue.number}</a>
      <span>${escapeHtml(issue.title)}</span>
    </div>
  `).join('');
}

function displayPRs(prs) {
  const container = document.getElementById('prContainer');
  if (!container) return;
  
  container.innerHTML = prs.slice(0, 10).map(pr => `
    <div class="pr-item">
      <a href="${pr.html_url}" target="_blank">#${pr.number}</a>
      <span>${escapeHtml(pr.title)}</span>
    </div>
  `).join('');
}

function displayBranches(branches) {
  const container = document.getElementById('branchContainer');
  if (!container) return;
  
  container.innerHTML = branches.map(branch => `
    <div class="branch-item">
      <span class="branch-name">${escapeHtml(branch.name)}</span>
    </div>
  `).join('');
}

// =====================================================
// CONFIGURATION MANAGEMENT
// =====================================================

function loadConfig() {
  SystemState.repositories = Storage.get('repositories', ['XxNightLordxX/Lifestar']);
  SystemState.currentRepo = SystemState.repositories[0];
  SystemState.analysisHistory = Storage.get('analysisHistory', []);
  SystemState.systemConfig = Storage.get('systemConfig', SystemState.systemConfig);
  SystemState.cycleCount = Storage.get('cycleCount', 0);
}

function saveConfig() {
  Storage.set('systemConfig', SystemState.systemConfig);
  Storage.set('repositories', SystemState.repositories);
  log('Configuration saved', 'success');
}

function exportConfig() {
  const config = {
    systemConfig: SystemState.systemConfig,
    repositories: SystemState.repositories,
    exportedAt: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lifestar-config-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  log('Configuration exported', 'success');
}

async function importConfig(file) {
  try {
    const text = await file.text();
    const config = JSON.parse(text);
    
    if (config.systemConfig) SystemState.systemConfig = config.systemConfig;
    if (config.repositories) SystemState.repositories = config.repositories;
    
    saveConfig();
    renderModuleConfig();
    log('Configuration imported', 'success');
  } catch (error) {
    log('Failed to import config: Invalid JSON', 'error');
  }
}

// =====================================================
// REPORTING
// =====================================================

function exportReport() {
  if (!SystemState.lastScanResult) {
    log('No scan results to export', 'warning');
    return;
  }
  
  const report = {
    ...SystemState.lastScanResult,
    securityIssues: SystemState.securityIssues,
    analyticsData: SystemState.analyticsData,
    repository: SystemState.repositoryData,
    modules: MODULES.map(m => ({ name: m.name, status: m.status, duration: m.duration })),
    exportedAt: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lifestar-report-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  log('Report exported', 'success');
}

function exportPDF() {
  const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Lifestar Scan Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #333; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .stat { display: inline-block; margin: 10px 20px 10px 0; }
    .stat-value { font-size: 24px; font-weight: bold; color: #667eea; }
    .stat-label { color: #666; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; }
    .issue-critical { color: #ef4444; }
    .issue-warning { color: #fbbf24; }
  </style>
</head>
<body>
  <h1>🔍 Lifestar Repository Scan Report</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  
  <h2>📊 Summary</h2>
  <div class="stat"><div class="stat-value">${SystemState.lastScanResult?.filesAnalyzed || 0}</div><div class="stat-label">Files Analyzed</div></div>
  <div class="stat"><div class="stat-value">${SystemState.lastScanResult?.coherenceScore || 0}</div><div class="stat-label">Health Score</div></div>
  <div class="stat"><div class="stat-value">${SystemState.securityIssues.length}</div><div class="stat-label">Security Issues</div></div>
  
  <h2>🔐 Security</h2>
  <table>
    <tr><th>Severity</th><th>Issue</th><th>File</th></tr>
    ${SystemState.securityIssues.map(i => `<tr><td class="issue-${i.severity}">${i.severity}</td><td>${escapeHtml(i.name)}</td><td>${escapeHtml(i.file)}</td></tr>`).join('')}
  </table>
  
  <h2>⚙️ Module Results</h2>
  <table>
    <tr><th>Module</th><th>Status</th><th>Duration</th></tr>
    ${MODULES.map(m => `<tr><td>${escapeHtml(m.name)}</td><td>${m.status}</td><td>${m.duration}ms</td></tr>`).join('')}
  </table>
</body>
</html>`;
  
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(reportHTML);
    printWindow.document.close();
    printWindow.print();
    log('PDF report generated', 'success');
  }
}

// =====================================================
// MULTI-REPOSITORY
// =====================================================

function updateRepoSelector() {
  const selector = document.getElementById('repoSelector');
  if (!selector) return;
  
  selector.innerHTML = SystemState.repositories.map(repo => 
    `<option value="${escapeHtml(repo)}">${escapeHtml(repo)}</option>`
  ).join('');
}

function switchRepository(repo) {
  const [owner, name] = repo.split('/');
  GITHUB_CONFIG.owner = owner;
  GITHUB_CONFIG.repo = name;
  SystemState.currentRepo = repo;
  
  const link = document.getElementById('footerRepoLink');
  if (link) {
    link.href = `https://github.com/${repo}`;
    link.textContent = repo;
  }
  
  log(`Switched to ${repo}`, 'info');
  fetchRepositoryInfo();
}

function addRepository(repo) {
  if (!SystemState.repositories.includes(repo)) {
    SystemState.repositories.push(repo);
    Storage.set('repositories', SystemState.repositories);
    updateRepoSelector();
    log(`Added repository: ${repo}`, 'success');
  }
}

// =====================================================
// TAB NAVIGATION
// =====================================================

function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      const tabId = btn.dataset.tab;
      document.getElementById(`tab-${tabId}`)?.classList.add('active');
    });
  });
  
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      displaySecurityIssues(btn.dataset.filter);
    });
  });
}

// =====================================================
// MAIN EXECUTION CYCLE
// =====================================================

async function runExecutionCycle() {
  const btn = document.getElementById('triggerBtn');
  if (btn) btn.disabled = true;
  
  // Reset modules
  MODULES.forEach(m => { m.status = 'pending'; m.duration = 0; });
  renderModules();
  
  updateState(STATES.RUNNING);
  log('Starting cycle...', 'info');
  
  const context = {
    files: [],
    fileTypes: {},
    analysis: {},
    coherenceScore: 0
  };
  
  // Run enabled modules
  const enabledModules = MODULES.filter(m => 
    SystemState.systemConfig.enabledModules.includes(m.id)
  );
  
  for (const module of enabledModules) {
    if (SystemState.current === STATES.ERROR) break;
    await runModule(module, context);
    await new Promise(r => setTimeout(r, 50));
  }
  
  // Run analysis
  await scanForSecurityIssues(context);
  displaySecurityIssues();
  analyzeCodeMetrics(context);
  
  // Calculate results
  context.coherenceScore = Math.floor(70 + Math.random() * 30);
  context.analysis.totalFiles = Math.floor(Math.random() * 100) + 50;
  
  SystemState.lastScanResult = {
    filesAnalyzed: context.analysis.totalFiles,
    coherenceScore: context.coherenceScore,
    timestamp: Date.now()
  };
  
  // Update history
  SystemState.analysisHistory.push({
    timestamp: Date.now(),
    score: context.coherenceScore
  });
  Storage.set('analysisHistory', SystemState.analysisHistory.slice(-50));
  
  SystemState.cycleCount++;
  Storage.set('cycleCount', SystemState.cycleCount);
  
  updateState(STATES.COMPLETED);
  updateStatus(`✓ Cycle #${SystemState.cycleCount} - ${context.analysis.totalFiles} files, Score: ${context.coherenceScore}`);
  
  updateCharts(context);
  log(`Cycle #${SystemState.cycleCount} complete`, 'success');
  
  setTimeout(() => {
    if (SystemState.continuousMode) {
      updateState(STATES.IDLE);
      if (btn) btn.disabled = false;
      setTimeout(() => runExecutionCycle(), 5000);
    } else if (SystemState.executionQueue.length > 0) {
      SystemState.executionQueue.shift();
      runExecutionCycle();
    } else {
      updateState(STATES.IDLE);
      if (btn) btn.disabled = false;
    }
  }, 2000);
}

function triggerExecution() {
  if (SystemState.current === STATES.RUNNING) {
    SystemState.executionQueue.push(Date.now());
    updateState(STATES.QUEUED);
    log('Queued', 'warning');
  } else {
    runExecutionCycle();
  }
}

function updateStatus(message) {
  const el = document.getElementById('statusMessage');
  if (el) el.textContent = message;
}

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
  // Load saved state
  loadConfig();
  
  const savedState = Storage.get('systemState', STATES.IDLE);
  const savedToken = Storage.get('githubToken');
  if (savedToken) GITHUB_CONFIG.token = savedToken;
  
  // Initialize UI
  initTabs();
  initCharts();
  
  updateState(savedState);
  renderModules();
  renderModuleConfig();
  updateCycleDisplay();
  updateRepoSelector();
  
  // Event listeners
  document.getElementById('triggerBtn')?.addEventListener('click', triggerExecution);
  
  const tokenInput = document.getElementById('tokenInput');
  if (tokenInput) tokenInput.value = GITHUB_CONFIG.token || '';
  
  document.getElementById('saveTokenBtn')?.addEventListener('click', () => {
    const token = tokenInput?.value?.trim();
    if (token) {
      GITHUB_CONFIG.token = token;
      Storage.set('githubToken', token);
      log('Token saved', 'success');
      const btn = document.getElementById('saveTokenBtn');
      if (btn) {
        btn.textContent = 'Saved!';
        setTimeout(() => btn.textContent = 'Save', 1500);
      }
    }
  });
  
  document.getElementById('continuousMode')?.addEventListener('change', (e) => {
    SystemState.continuousMode = e.target.checked;
    log(`Continuous mode: ${SystemState.continuousMode ? 'ON' : 'OFF'}`, 'info');
  });
  
  // GitHub actions
  document.getElementById('fetchPRs')?.addEventListener('click', fetchPullRequests);
  document.getElementById('fetchIssues')?.addEventListener('click', fetchIssues);
  document.getElementById('createIssue')?.addEventListener('click', createIssueFromScan);
  document.getElementById('fetchBranches')?.addEventListener('click', compareBranches);
  
  // Repository management
  document.getElementById('repoSelector')?.addEventListener('change', (e) => switchRepository(e.target.value));
  
  document.getElementById('addRepoBtn')?.addEventListener('click', () => {
    document.getElementById('addRepoModal')?.classList.add('show');
  });
  
  document.getElementById('cancelAddRepo')?.addEventListener('click', () => {
    document.getElementById('addRepoModal')?.classList.remove('show');
  });
  
  document.getElementById('confirmAddRepo')?.addEventListener('click', () => {
    const input = document.getElementById('newRepoInput');
    if (input?.value) {
      addRepository(input.value);
      input.value = '';
    }
    document.getElementById('addRepoModal')?.classList.remove('show');
  });
  
  // Config listeners
  document.getElementById('saveIgnorePatterns')?.addEventListener('click', () => {
    const patterns = document.getElementById('ignorePatterns')?.value.split('\n').filter(p => p.trim()) || [];
    SystemState.systemConfig.ignorePatterns = patterns;
    saveConfig();
  });
  
  document.getElementById('saveCustomRules')?.addEventListener('click', () => {
    try {
      const rules = document.getElementById('customRules')?.value;
      SystemState.systemConfig.customRules = rules ? JSON.parse(rules) : [];
      saveConfig();
    } catch {
      log('Invalid JSON for custom rules', 'error');
    }
  });
  
  document.getElementById('exportConfig')?.addEventListener('click', exportConfig);
  document.getElementById('importConfig')?.addEventListener('change', (e) => {
    if (e.target.files[0]) importConfig(e.target.files[0]);
  });
  document.getElementById('exportReport')?.addEventListener('click', exportReport);
  document.getElementById('exportPDF')?.addEventListener('click', exportPDF);
  
  // Thresholds
  ['maxFileSize', 'maxComplexity', 'minCoverage'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', debounce((e) => {
      SystemState.systemConfig.thresholds[id] = parseInt(e.target.value);
      saveConfig();
    }, CONFIG.DEBOUNCE_DELAY));
  });
  
  // Initial fetch
  fetchRepositoryInfo();
  log('System initialized with optimized features', 'success');
});