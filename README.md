# System Repository Website

A deterministic repository management system with GitHub integration, featuring a minimal public UI for triggering full-system cycles.

## Features

- **Minimal Public UI**: Only a state indicator and trigger button
- **Deterministic State Machine**: 5 states with guaranteed transitions
- **Background Engine**: 15 processing modules for full-system analysis
- **GitHub Integration**: Read/write access with continuous synchronization
- **Two Execution Modes**: Continuous autonomous and manual trigger
- **No Rate Limiting**: Unrestricted public triggering

## Quick Start

```bash
# Install dependencies
npm install

# Set environment variables (optional for GitHub integration)
export GITHUB_APP_ID=your_app_id
export GITHUB_PRIVATE_KEY=your_private_key
export GITHUB_INSTALLATION_ID=your_installation_id
export GITHUB_WEBHOOK_SECRET=your_webhook_secret
export GITHUB_OWNER=repository_owner
export GITHUB_REPO=repository_name

# Start the server
npm start
```

## Public UI

The website exposes only:
- **State Indicator**: Shows one of 5 states (IDLE, RUNNING, QUEUED, COMPLETED, ERROR)
- **Trigger Button**: Click to run a full system cycle

No logs, stack traces, repository contents, or internal details are ever exposed.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/state | Returns current system state |
| POST | /api/trigger | Triggers a full system cycle |
| POST | /api/webhook | GitHub webhook endpoint |
| GET | /api/health | Health check |

## State Machine

```
IDLE → RUNNING → COMPLETED → IDLE
         ↓
       QUEUED (if triggered during run)
         ↓
       RUNNING
         
       ERROR (on failure)
         ↓
       RUNNING (auto-retry) or IDLE (after max retries)
```

## Background Engine Modules

1. Full-System Analysis
2. Correction & Propagation
3. Documentation Updates
4. Test Regeneration
5. Index Rebuilding
6. Architecture Validation
7. Dependency Reconstruction
8. Configuration Normalization
9. Schema Verification
10. Data-Flow Validation
11. Invariant Enforcement
12. Semantic Alignment
13. Safety Hardening
14. Global Coherence Enforcement
15. Completion Verification

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed system architecture documentation.

## Environment Variables

| Variable | Description |
|----------|-------------|
| PORT | Server port (default: 3000) |
| GITHUB_APP_ID | GitHub App ID |
| GITHUB_PRIVATE_KEY | GitHub App private key |
| GITHUB_INSTALLATION_ID | Installation ID |
| GITHUB_WEBHOOK_SECRET | Webhook secret |
| GITHUB_OWNER | Repository owner |
| GITHUB_REPO | Repository name |

## License

MIT