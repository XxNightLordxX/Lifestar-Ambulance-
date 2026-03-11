/**
 * System Repository Website - Main Server
 * 
 * Serves as the interface and execution host for the entire system.
 * 
 * Features:
 * - Minimal public UI (state indicator + trigger control)
 * - GitHub integration with continuous synchronization
 * - Background engine with deterministic processing
 * - Two execution modes: continuous autonomous + manual trigger
 * - No rate limiting or access control on triggers
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { getBackgroundEngine } from './engine/background-engine.js';
import { getGitHubClient } from './github/github-client.js';
import { STATES } from './engine/state-manager.js';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// CORS Middleware - Allow cross-origin requests from production frontend
app.use((req, res, next) => {
  // Allow requests from any origin (for production deployment)
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Initialize components
const backgroundEngine = getBackgroundEngine();
const githubClient = getGitHubClient();

// ==================== API ROUTES ====================

/**
 * GET /api/state
 * Returns current system state (safe for public exposure)
 */
app.get('/api/state', (req, res) => {
  const safeState = backgroundEngine.getSafeState();
  res.json(safeState);
});

/**
 * POST /api/trigger
 * Triggers a full system cycle
 * - Unrestricted public access
 * - No rate limiting
 * - No access control
 * - Triggers are queued and processed deterministically
 */
app.post('/api/trigger', (req, res) => {
  // Create trigger event
  const trigger = {
    id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'manual',
    timestamp: Date.now(),
    source: 'web'
  };
  
  // Add to execution queue
  backgroundEngine.addTrigger(trigger);
  
  // Return current state
  const safeState = backgroundEngine.getSafeState();
  res.json(safeState);
});

/**
 * POST /api/webhook
 * GitHub webhook endpoint
 * Handles repository events for continuous synchronization
 */
app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const eventType = req.headers['x-github-event'];
  const payload = req.body;
  
  // Validate webhook signature
  if (!githubClient.validateWebhookSignature(signature, payload)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Parse payload
  let parsedPayload;
  try {
    parsedPayload = JSON.parse(payload.toString());
  } catch (error) {
    return res.status(400).send('Invalid payload');
  }
  
  // Process webhook event
  const event = githubClient.processWebhook(eventType, parsedPayload);
  
  // Create trigger for background engine
  const trigger = {
    id: `webhook_${event.timestamp}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'webhook',
    eventType,
    timestamp: event.timestamp,
    data: event
  };
  
  // Add to execution queue
  backgroundEngine.addTrigger(trigger);
  
  // Respond quickly (within 10 seconds as per GitHub requirements)
  res.status(202).send('Accepted');
});

/**
 * GET /api/health
 * Health check endpoint (minimal info, no internal details)
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ==================== ERROR HANDLING ====================

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).send('Not Found');
});

/**
 * Error handler
 * Never expose internal details, stack traces, or logs
 */
app.use((err, req, res, next) => {
  // Log internally only
  console.error('Server error:', err.message);
  
  // Return generic error response
  res.status(500).json({ error: 'Internal Server Error' });
});

// ==================== STARTUP ====================

/**
 * Initializes the server
 */
async function initialize() {
  try {
    // Initialize GitHub client
    await githubClient.initialize();
    
    // Start background engine
    backgroundEngine.start();
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Public UI: http://localhost:${PORT}`);
      console.log(`State API: http://localhost:${PORT}/api/state`);
      console.log(`Trigger API: http://localhost:${PORT}/api/trigger`);
      console.log(`Webhook API: http://localhost:${PORT}/api/webhook`);
    });
  } catch (error) {
    console.error('Failed to initialize:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  backgroundEngine.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  backgroundEngine.stop();
  process.exit(0);
});

// Start the server
initialize();