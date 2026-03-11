# Deployment Guide

## Production URLs

### Frontend (Static Site)
- **Production URL**: https://sites.super.myninja.ai/8ad6c904-bc1f-47f0-9c4a-04d64725bbea/b23c3943/index.html
- **Status**: ✅ Deployed and operational

### Backend API (Sandbox)
- **API URL**: https://00h1n.app.super.myninja.ai
- **Status**: ✅ Running with GitHub integration

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 PRODUCTION                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────┐    ┌─────────────────┐     │
│  │   Static Site   │───►│   Backend API   │     │
│  │  (Frontend UI)  │    │  (Sandbox)      │     │
│  └─────────────────┘    └─────────────────┘     │
│                                   │             │
│                                   ▼             │
│                         ┌─────────────────┐     │
│                         │  GitHub Repo    │     │
│                         │ (Lifestar-...)  │     │
│                         └─────────────────┘     │
│                                                 │
└─────────────────────────────────────────────────┘
```

## How It Works

1. **Frontend**: The static website is deployed to production and automatically detects it's running on the deployed domain
2. **API Calls**: Frontend makes cross-origin requests to the sandbox API at `https://00h1n.app.super.myninja.ai`
3. **GitHub Integration**: Backend connects to the Lifestar-Ambulance- repository using the provided PAT
4. **File Updates**: System automatically maintains repository files (SYSTEM_LOG.md, SYSTEM_STATE.md, etc.)

## Features Available

- ✅ State indicator (IDLE, RUNNING, QUEUED, COMPLETED, ERROR)
- ✅ Manual trigger button (no rate limiting)
- ✅ Real-time state updates via polling
- ✅ Cross-origin API communication
- ✅ Full GitHub repository integration
- ✅ All 15 processing modules operational

## Repository Integration

The system maintains these files in the connected repository:

| File | Purpose |
|------|---------|
| `SYSTEM_LOG.md` | Detailed execution logs |
| `SYSTEM_STATE.md` | System health and coherence score |
| `REPOSITORY_INDEX.md` | File index and statistics |
| `.gitignore` | Auto-generated ignore patterns |
| `README.md` | Repository documentation |

## Monitoring

- **Frontend**: Check https://sites.super.myninja.ai/8ad6c904-bc1f-47f0-9c4a-04d64725bbea/b23c3943/index.html
- **Backend Health**: GET https://00h1n.app.super.myninja.ai/api/health
- **Repository State**: https://github.com/XxNightLordxX/Lifestar-Ambulance-/blob/main/SYSTEM_STATE.md

## Usage

1. Visit the production URL
2. Click "Run System Cycle" to trigger full-system analysis
3. Watch the state indicator for real-time feedback
4. Check repository for updated files and logs

---
*Deployment completed successfully. System is fully operational.*