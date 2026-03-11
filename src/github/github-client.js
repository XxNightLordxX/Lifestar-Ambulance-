/**
 * GitHub Integration Client
 * 
 * Provides read/write access to GitHub repository with:
 * - Personal Access Token authentication (simpler than GitHub App)
 * - GitHub App authentication (alternative)
 * - Continuous synchronization
 * - Change monitoring
 * - Webhook event handling
 */

import crypto from 'crypto';

/**
 * GitHub Client Class
 * Handles all GitHub API interactions
 */
export class GitHubClient {
  constructor(config = {}) {
    // Personal Access Token (preferred for simplicity)
    this.token = config.token || process.env.GITHUB_TOKEN;
    
    // GitHub App authentication (alternative)
    this.appId = config.appId || process.env.GITHUB_APP_ID;
    this.privateKey = config.privateKey || process.env.GITHUB_PRIVATE_KEY;
    this.installationId = config.installationId || process.env.GITHUB_INSTALLATION_ID;
    this.webhookSecret = config.webhookSecret || process.env.GITHUB_WEBHOOK_SECRET;
    
    // Repository info
    this.owner = config.owner || process.env.GITHUB_OWNER || 'XxNightLordxX';
    this.repo = config.repo || process.env.GITHUB_REPO || 'Lifestar-Ambulance-';
    
    // Octokit instance (lazy loaded)
    this._octokit = null;
    
    // Local state cache
    this._cachedState = null;
    this._lastSync = null;
    
    // Connected flag
    this._connected = false;
  }
  
  /**
   * Initializes the GitHub client
   * @returns {Promise<boolean>} Whether initialization succeeded
   */
  async initialize() {
    try {
      // Load Octokit dynamically
      const { Octokit } = await import('octokit');
      
      // Prefer Personal Access Token if available
      if (this.token) {
        this._octokit = new Octokit({
          auth: this.token
        });
        this._connected = true;
        console.log(`GitHub client initialized with PAT for ${this.owner}/${this.repo}`);
        return true;
      }
      
      // Fall back to GitHub App authentication
      if (this.appId && this.privateKey && this.installationId) {
        const { App } = await import('octokit');
        const app = new App({
          appId: this.appId,
          privateKey: this.privateKey
        });
        this._octokit = await app.getInstallationOctokit(this.installationId);
        this._connected = true;
        console.log('GitHub client initialized with GitHub App');
        return true;
      }
      
      console.warn('GitHub client not configured - running in offline mode');
      this._connected = false;
      return false;
    } catch (error) {
      console.error('Failed to initialize GitHub client:', error.message);
      this._connected = false;
      return false;
    }
  }
  
  /**
   * Checks if client is connected
   * @returns {boolean} Whether client is connected
   */
  isConnected() {
    return this._connected;
  }
  
  /**
   * Gets the Octokit instance
   * @returns {Object} Octokit instance
   */
  getOctokit() {
    return this._octokit;
  }
  
  // ==================== READ OPERATIONS ====================
  
  /**
   * Gets repository contents
   * @param {string} path - File path
   * @param {string} ref - Git ref (branch, tag, commit)
   * @returns {Promise<Object>} File or directory contents
   */
  async getFile(path, ref = 'main') {
    if (!this._connected) {
      return null;
    }
    
    try {
      const response = await this._octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref
      });
      
      return response.data;
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }
  
  /**
   * Gets repository tree
   * @param {string} ref - Git ref
   * @returns {Promise<Array>} Tree entries
   */
  async getTree(ref = 'main') {
    if (!this._connected) {
      return [];
    }
    
    try {
      const response = await this._octokit.rest.git.getTree({
        owner: this.owner,
        repo: this.repo,
        tree_sha: ref,
        recursive: 'true'
      });
      
      return response.data.tree;
    } catch (error) {
      console.error('Failed to get tree:', error.message);
      return [];
    }
  }
  
  /**
   * Gets the latest commit
   * @param {string} ref - Git ref
   * @returns {Promise<Object>} Commit data
   */
  async getLatestCommit(ref = 'main') {
    if (!this._connected) {
      return null;
    }
    
    try {
      const response = await this._octokit.rest.repos.getCommit({
        owner: this.owner,
        repo: this.repo,
        ref
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to get latest commit:', error.message);
      return null;
    }
  }
  
  /**
   * Lists repository issues
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Issues
   */
  async listIssues(options = {}) {
    if (!this._connected) {
      return [];
    }
    
    try {
      const response = await this._octokit.rest.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        state: options.state || 'open',
        per_page: options.perPage || 100
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to list issues:', error.message);
      return [];
    }
  }
  
  // ==================== WRITE OPERATIONS ====================
  
  /**
   * Creates or updates a file
   * @param {string} path - File path
   * @param {string} content - File content
   * @param {string} message - Commit message
   * @param {string} sha - File SHA (for updates)
   * @param {string} branch - Branch name
   * @returns {Promise<Object>} Commit data
   */
  async createOrUpdateFile(path, content, message, sha = null, branch = 'main') {
    if (!this._connected) {
      return null;
    }
    
    try {
      const params = {
        owner: this.owner,
        repo: this.repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch
      };
      
      if (sha) {
        params.sha = sha;
      }
      
      const response = await this._octokit.rest.repos.createOrUpdateFileContents(params);
      
      return response.data;
    } catch (error) {
      console.error('Failed to create/update file:', error.message);
      throw error;
    }
  }
  
  /**
   * Deletes a file
   * @param {string} path - File path
   * @param {string} message - Commit message
   * @param {string} sha - File SHA
   * @param {string} branch - Branch name
   * @returns {Promise<Object>} Commit data
   */
  async deleteFile(path, message, sha, branch = 'main') {
    if (!this._connected) {
      return null;
    }
    
    try {
      const response = await this._octokit.rest.repos.deleteFile({
        owner: this.owner,
        repo: this.repo,
        path,
        message,
        sha,
        branch
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to delete file:', error.message);
      throw error;
    }
  }
  
  /**
   * Creates a branch
   * @param {string} branchName - New branch name
   * @param {string} fromBranch - Source branch
   * @returns {Promise<Object>} Branch data
   */
  async createBranch(branchName, fromBranch = 'main') {
    if (!this._connected) {
      return null;
    }
    
    try {
      // Get the SHA of the source branch
      const ref = await this._octokit.rest.git.getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${fromBranch}`
      });
      
      // Create new branch
      const response = await this._octokit.rest.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branchName}`,
        sha: ref.data.object.sha
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to create branch:', error.message);
      throw error;
    }
  }
  
  /**
   * Creates a pull request
   * @param {string} title - PR title
   * @param {string} head - Source branch
   * @param {string} base - Target branch
   * @param {string} body - PR description
   * @returns {Promise<Object>} PR data
   */
  async createPullRequest(title, head, base = 'main', body = '') {
    if (!this._connected) {
      return null;
    }
    
    try {
      const response = await this._octokit.rest.pulls.create({
        owner: this.owner,
        repo: this.repo,
        title,
        head,
        base,
        body
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to create PR:', error.message);
      throw error;
    }
  }
  
  // ==================== SYNCHRONIZATION ====================
  
  /**
   * Syncs local state with remote
   * @returns {Promise<Object>} Sync result
   */
  async sync() {
    if (!this._connected) {
      return { success: false, reason: 'Not connected' };
    }
    
    try {
      // Get current state
      const tree = await this.getTree();
      const commit = await this.getLatestCommit();
      
      this._cachedState = {
        tree,
        commit,
        syncedAt: Date.now()
      };
      
      this._lastSync = Date.now();
      
      return {
        success: true,
        filesCount: tree.length,
        commitSha: commit?.sha
      };
    } catch (error) {
      console.error('Sync failed:', error.message);
      return { success: false, reason: error.message };
    }
  }
  
  /**
   * Gets cached state
   * @returns {Object|null} Cached state
   */
  getCachedState() {
    return this._cachedState;
  }
  
  /**
   * Gets last sync timestamp
   * @returns {number|null} Timestamp
   */
  getLastSync() {
    return this._lastSync;
  }
  
  // ==================== WEBHOOK HANDLING ====================
  
  /**
   * Validates webhook signature
   * @param {string} signature - X-Hub-Signature-256 header
   * @param {string} payload - Raw request body
   * @returns {boolean} Whether signature is valid
   */
  validateWebhookSignature(signature, payload) {
    if (!this.webhookSecret || !signature) {
      return false;
    }
    
    try {
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      const digest = 'sha256=' + hmac.update(payload).digest('hex');
      
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(digest)
      );
    } catch (error) {
      console.error('Webhook validation error:', error.message);
      return false;
    }
  }
  
  /**
   * Processes webhook event
   * @param {string} eventType - X-GitHub-Event header
   * @param {Object} payload - Webhook payload
   * @returns {Object} Processing result
   */
  processWebhook(eventType, payload) {
    // Return event data for background engine to process
    return {
      type: eventType,
      action: payload.action,
      repository: payload.repository?.full_name,
      sender: payload.sender?.login,
      timestamp: Date.now()
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Gets the singleton GitHubClient instance
 * @param {Object} config - Configuration
 * @returns {GitHubClient} GitHubClient instance
 */
export function getGitHubClient(config = {}) {
  if (!instance) {
    instance = new GitHubClient(config);
  }
  return instance;
}