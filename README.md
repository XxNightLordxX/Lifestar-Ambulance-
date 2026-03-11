# System Repository Management Interface

A deterministic repository management system with GitHub integration.

## Features

- Minimal UI with state indicator (IDLE, RUNNING, QUEUED, COMPLETED, ERROR)
- Trigger button for manual execution
- GitHub integration for repository management
- CORS enabled for cross-origin access

## Setup

1. Install dependencies: `npm install`
2. Create `.env` file with your GitHub token
3. Run: `npm start`

## API Endpoints

- `GET /api/state` - Get current system state
- `POST /api/trigger` - Trigger execution cycle
- `GET /api/health` - Health check

## License

MIT
