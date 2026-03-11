# System Repository Website - Architecture Document

## Overview

This document defines the complete architecture for a website that serves as the interface and execution host for a deterministic repository management system with GitHub integration.

---

## 1. System Components

### 1.1 Website Layer
- **Purpose**: Public interface and execution host
- **Technology**: Node.js with Express.js backend
- **Responsibilities**: 
  - Serve minimal public UI
  - Handle trigger requests
  - Display state indicator
  - Host background engine internally

### 1.2 GitHub Integration Layer
- **Purpose**: Single source of truth connectivity
- **Technology**: Octokit.js SDK + Webhooks
- **Responsibilities**:
  - Read/write repository access
  - Continuous synchronization
  - Change monitoring and detection
  - Webhook event processing

### 1.3 Background Engine
- **Purpose**: Deterministic processing core
- **Technology**: Custom state machine + Queue system
- **Responsibilities**:
  - Full-system analysis and correction
  - Continuous autonomous execution
  - Manual trigger execution
  - State management and indicator updates

### 1.4 Public UI
- **Purpose**: Minimal user interaction
- **Technology**: Vanilla HTML/CSS/JS
- **Components**:
  - Trigger control (single button)
  - Multi-state indicator (5 states only)

---

## 2. Deterministic State Machine Architecture

### 2.1 System States

```
┌─────────────────────────────────────────────────────────────┐
│                    SYSTEM STATE MACHINE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌───────┐     trigger      ┌─────────┐                    │
│   │ IDLE  │ ───────────────► │ RUNNING │                    │
│   └───────┘                  └────┬────┘                    │
│       ▲                           │                          │
│       │                           │                          │
│       │ complete                  │ error                    │
│       │                           │                          │
│       │                      ┌────┴────┐                    │
│       │                      │         │                    │
│       │                 ┌────┴───┐ ┌────┴────┐              │
│       │                 │QUEUED  │ │  ERROR  │              │
│       │                 └────────┘ └─────────┘              │
│       │                      │           │                   │
│       │                      │           │ auto-retry        │
│       │                      │           │                   │
│       └──────────────────────┴───────────┘                   │
│                                                              │
│   ┌─────────────┐                                           │
│   │  COMPLETED  │ ◄─── after successful cycle               │
│   └──────┬──────┘                                           │
│          │                                                   │
│          │ auto-transition (immediate)                       │
│          ▼                                                   │
│       ┌───────┐                                             │
│       │ IDLE  │                                             │
│       └───────┘                                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 State Definitions

| State | Description | Transitions |
|-------|-------------|-------------|
| **IDLE** | System is ready, no active processing | → RUNNING (on trigger) |
| **RUNNING** | Background engine executing full-system cycle | → COMPLETED (success), → ERROR (failure), → QUEUED (if trigger during run) |
| **QUEUED** | Additional triggers pending, will run after current cycle | → RUNNING (after current completes) |
| **COMPLETED** | Full-system cycle finished successfully | → IDLE (immediate auto-transition) |
| **ERROR** | Error occurred during processing | → RUNNING (auto-retry), → IDLE (after max retries) |

### 2.3 Deterministic Guarantees

1. **Single State**: System is in exactly one state at any time
2. **Deterministic Transitions**: Same input always produces same state transition
3. **No Race Conditions**: Queue-based serialization of all operations
4. **Self-Correction**: Automatic recovery from any error state
5. **Forward-Only Evolution**: State only progresses forward, never regresses

---

## 3. Background Engine Modules

### 3.1 Core Modules

```
┌──────────────────────────────────────────────────────────────────┐
│                    BACKGROUND ENGINE                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   EXECUTION QUEUE                            │ │
│  │  - FIFO processing                                           │ │
│  │  - Trigger deduplication                                     │ │
│  │  - Concurrent trigger merging                                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   STATE MANAGER                              │ │
│  │  - Current state tracking                                    │ │
│  │  - State transition validation                               │ │
│  │  - Safe indicator updates                                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              DETERMINISTIC EXECUTOR                          │ │
│  │                                                              │ │
│  │  ┌──────────────────┐  ┌──────────────────┐                │ │
│  │  │ Full-System      │  │ Correction &     │                │ │
│  │  │ Analysis         │─►│ Propagation      │                │ │
│  │  └──────────────────┘  └──────────────────┘                │ │
│  │           │                     │                           │ │
│  │           ▼                     ▼                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐                │ │
│  │  │ Documentation    │  │ Test             │                │ │
│  │  │ Updates          │  │ Regeneration     │                │ │
│  │  └──────────────────┘  └──────────────────┘                │ │
│  │           │                     │                           │ │
│  │           ▼                     ▼                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐                │ │
│  │  │ Index Rebuilding │  │ Architecture     │                │ │
│  │  │                  │  │ Validation       │                │ │
│  │  └──────────────────┘  └──────────────────┘                │ │
│  │           │                     │                           │ │
│  │           ▼                     ▼                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐                │ │
│  │  │ Dependency       │  │ Configuration    │                │ │
│  │  │ Reconstruction   │  │ Normalization    │                │ │
│  │  └──────────────────┘  └──────────────────┘                │ │
│  │           │                     │                           │ │
│  │           ▼                     ▼                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐                │ │
│  │  │ Schema           │  │ Data-Flow        │                │ │
│  │  │ Verification     │  │ Validation       │                │ │
│  │  └──────────────────┘  └──────────────────┘                │ │
│  │           │                     │                           │ │
│  │           ▼                     ▼                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐                │ │
│  │  │ Invariant        │  │ Semantic         │                │ │
│  │  │ Enforcement      │  │ Alignment        │                │ │
│  │  └──────────────────┘  └──────────────────┘                │ │
│  │           │                     │                           │ │
│  │           ▼                     ▼                           │ │
│  │  ┌──────────────────┐  ┌──────────────────┐                │ │
│  │  │ Safety           │  │ Global Coherence │                │ │
│  │  │ Hardening        │  │ Enforcement      │                │ │
│  │  └──────────────────┘  └──────────────────┘                │ │
│  │           │                     │                           │ │
│  │           └─────────┬───────────┘                           │ │
│  │                     ▼                                       │ │
│  │           ┌──────────────────┐                             │ │
│  │           │   Completion     │                             │ │
│  │           │   Verification   │                             │ │
│  │           └──────────────────┘                             │ │
│  │                                                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 3.2 Module Execution Order

1. **Full-System Analysis** - Scan entire repository state
2. **Correction & Propagation** - Fix identified issues, propagate changes
3. **Documentation Updates** - Regenerate all documentation
4. **Test Regeneration** - Update test files to match current state
5. **Index Rebuilding** - Rebuild all index files
6. **Architecture Validation** - Validate structural integrity
7. **Dependency Reconstruction** - Rebuild dependency graphs
8. **Configuration Normalization** - Standardize all config files
9. **Schema Verification** - Validate all schemas
10. **Data-Flow Validation** - Verify data flow integrity
11. **Invariant Enforcement** - Enforce system invariants
12. **Semantic Alignment** - Ensure semantic consistency
13. **Safety Hardening** - Apply security measures
14. **Global Coherence Enforcement** - Final coherence check
15. **Completion Verification** - Verify all changes applied

---

## 4. GitHub Integration Architecture

### 4.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                GITHUB APP AUTHENTICATION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌────────────┐     ┌────────────┐     ┌────────────┐         │
│   │ Private    │     │ Generate   │     │Installation│         │
│   │ Key + ID   │────►│ JWT Token  │────►│ Access     │         │
│   │            │     │ (10 min)   │     │ Token      │         │
│   └────────────┘     └────────────┘     └─────┬──────┘         │
│                                               │                  │
│                                               ▼                  │
│                                        ┌────────────┐           │
│                                        │ API        │           │
│                                        │ Requests   │           │
│                                        └────────────┘           │
│                                                                  │
│   Token Refresh: Automatic via Octokit.js (before 1hr expiry)   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Synchronization Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                CONTINUOUS SYNCHRONIZATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────┐                                            │
│   │  WEBHOOK        │ ◄─── Real-time push events                 │
│   │  LISTENER       │      (push, PR, issues, etc.)             │
│   └────────┬────────┘                                            │
│            │                                                      │
│            ▼                                                      │
│   ┌─────────────────┐     ┌─────────────────┐                   │
│   │  EVENT QUEUE    │────►│  STATE SYNC     │                   │
│   │  (FIFO)         │     │  ENGINE         │                   │
│   └─────────────────┘     └────────┬────────┘                   │
│                                    │                             │
│                                    ▼                             │
│   ┌─────────────────┐     ┌─────────────────┐                   │
│   │  POLLING        │────►│  REPOSITORY     │                   │
│   │  (Fallback)     │     │  STATE          │                   │
│   │  (Every 5 min)  │     │  (Local Copy)   │                   │
│   └─────────────────┘     └─────────────────┘                   │
│                                                                  │
│   Deterministic State: Always matches remote repository state   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Public UI Specification

### 5.1 UI Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    PUBLIC UI (Minimal)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                                                         │   │
│   │     ┌─────────────────────────────────────────────┐    │   │
│   │     │           STATE INDICATOR                    │    │   │
│   │     │                                              │    │   │
│   │     │    ╔═════════════════════════════════╗      │    │   │
│   │     │    ║         [IDLE]                  ║      │    │   │
│   │     │    ╚═════════════════════════════════╝      │    │   │
│   │     │                                              │    │   │
│   │     │    Possible states:                         │    │   │
│   │     │    • IDLE (green)                           │    │   │
│   │     │    • RUNNING (blue)                         │    │   │
│   │     │    • QUEUED (yellow)                        │    │   │
│   │     │    • COMPLETED (cyan)                       │    │   │
│   │     │    • ERROR (red)                            │    │   │
│   │     │                                              │    │   │
│   │     └─────────────────────────────────────────────┘    │   │
│   │                                                         │   │
│   │     ┌─────────────────────────────────────────────┐    │   │
│   │     │           TRIGGER CONTROL                    │    │   │
│   │     │                                              │    │   │
│   │     │    ┌───────────────────────────────────┐    │    │   │
│   │     │    │        RUN SYSTEM CYCLE           │    │    │   │
│   │     │    └───────────────────────────────────┘    │    │   │
│   │     │                                              │    │   │
│   │     │    No rate limiting                         │    │   │
│   │     │    No access control                        │    │   │
│   │     │    No confirmation required                 │    │   │
│   │     │                                              │    │   │
│   │     └─────────────────────────────────────────────┘    │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│   EXPOSED: Only state name and trigger button                   │
│   HIDDEN: Logs, stack traces, repo content, internal details    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 State Indicator Colors

| State | Color | Hex Code | Visual |
|-------|-------|----------|--------|
| IDLE | Green | #22c55e | ● |
| RUNNING | Blue | #3b82f6 | ● |
| QUEUED | Yellow | #eab308 | ● |
| COMPLETED | Cyan | #06b6d4 | ● |
| ERROR | Red | #ef4444 | ● |

---

## 6. Execution Modes

### 6.1 Continuous Autonomous Mode

```
┌─────────────────────────────────────────────────────────────────┐
│              CONTINUOUS AUTONOMOUS MODE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌───────────┐     ┌───────────┐     ┌───────────┐            │
│   │  WAIT     │────►│  ANALYZE  │────►│  EXECUTE  │            │
│   │  (Idle)   │     │           │     │           │            │
│   └───────────┘     └───────────┘     └─────┬─────┘            │
│         ▲                                   │                   │
│         │                                   │                   │
│         │           ┌───────────┐           │                   │
│         └───────────│  VERIFY   │◄──────────┘                   │
│                     │           │                               │
│                     └───────────┘                               │
│                                                                  │
│   Cycle Interval: Continuous (polling-based)                    │
│   User Interaction: Not required                                │
│   Webhook Events: Trigger immediate cycle                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Manual Full-System Execution Mode

```
┌─────────────────────────────────────────────────────────────────┐
│              MANUAL FULL-SYSTEM EXECUTION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   User Trigger ─────► Queue Trigger Event ─────► Execute Cycle  │
│                                                                  │
│   Characteristics:                                               │
│   - Unrestricted public access                                   │
│   - No rate limiting                                             │
│   - No access control                                            │
│   - Each trigger is a valid deterministic event                 │
│   - Simultaneous triggers are merged or sequenced               │
│                                                                  │
│   Trigger Handling:                                              │
│   - If IDLE: Start execution immediately                        │
│   - If RUNNING: Queue the trigger                               │
│   - If QUEUED: Merge with existing queue (no duplicate)        │
│   - If ERROR: Trigger recovery sequence                         │
│   - If COMPLETED: Transition to IDLE, then process              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Self-Correction & Self-Stabilization

### 7.1 Error Recovery Matrix

| Error Type | Recovery Action | Max Retries |
|------------|-----------------|-------------|
| API Rate Limit | Wait and retry with exponential backoff | 5 |
| Authentication Failure | Re-authenticate and retry | 3 |
| Network Error | Retry with backoff | 5 |
| Validation Error | Log and skip, continue execution | N/A |
| System Error | Full state reset and recovery | 1 |

### 7.2 Self-Stabilization Process

```
┌─────────────────────────────────────────────────────────────────┐
│              SELF-STABILIZATION PROCESS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   1. DETECT: Identify inconsistency or error                    │
│   2. ISOLATE: Prevent propagation of error state                │
│   3. DIAGNOSE: Determine root cause                             │
│   4. CORRECT: Apply deterministic fix                           │
│   5. VERIFY: Confirm correction was successful                  │
│   6. RESTORE: Return to stable state                            │
│                                                                  │
│   Guarantee: System always returns to stable, correct state     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Security Considerations

### 8.1 Information Hiding

- **Exposed**: State indicator, trigger button
- **Hidden**: Logs, stack traces, repository contents, API tokens, internal state, error details

### 8.2 GitHub Security

- Webhook secret validation
- IP allow list for GitHub IPs
- HTTPS only
- Token rotation (automatic)

### 8.3 Input Validation

- All inputs sanitized
- No user input passed directly to system
- Deterministic processing prevents injection

---

## 9. Technology Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js + Express.js |
| GitHub API | Octokit.js |
| State Machine | Custom implementation |
| Queue | In-memory (with persistence) |
| Frontend | Vanilla HTML/CSS/JS |
| Process Management | PM2 or similar |

---

*Document Version: 1.0*
*Last Updated: Architecture definition complete*