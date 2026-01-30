# Logging Insights

## Basic Flow

- Session monitoring generates metrics every frame.
- Metrics are buffered in memory.
- Buffer flushes to SQLite every 6s or 20 records.
- Data is stored in:
  - **Sessions** table (ID, duration, type)
  - **Metrics** table (EAR, MAR, alerts, etc.)

- Dashboard reads from both tables.
- Dashboard provides:
  - KPI cards
  - Radar risk chart
  - Session list

- Selecting a session shows detailed charts and timeline.

```mermaid
graph TD
    Monitor[Monitor Session] -->|Metrics every frame| Buffer[Metric Buffer]
    Buffer -->|Every 6s or 20 records| DB[(SQLite Database)]

    DB --> Sessions[Sessions Table<br/>ID, Duration, Type]
    DB --> Metrics[Metrics Table<br/>EAR, MAR, Alerts, etc.]

    Sessions --> Dashboard[Insights Dashboard]
    Metrics --> Dashboard

    Dashboard --> KPIs[KPI Cards]
    Dashboard --> Radar[Radar Chart<br/>Risk Profile]
    Dashboard --> List[Session List]

    List -->|Tap Session| Detail[Session Detail<br/>Charts & Timeline]
``
```

## Database Schema

```mermaid
erDiagram
    SESSIONS ||--o{ METRICS : contains

    SESSIONS {
        string id PK "UUID"
        string clientId "WebRTC ID / upload name"
        integer startedAt "Unix ms"
        integer endedAt "Unix ms (nullable)"
        integer durationMs "Duration (ms, nullable)"
        string type "live/upload"
    }

    METRICS {
        string id PK "UUID"
        string sessionId FK "Refs sessions.id"
        integer ts "Unix ms"
        boolean faceMissing "Face not detected"
        real ear "Eye Aspect Ratio"
        boolean eyeClosed
        real eyeClosedSustained "0-1"
        real perclos "PERCLOS"
        boolean perclosAlert
        real mar "Mouth Aspect Ratio"
        boolean yawning
        real yawnSustained "0-1"
        integer yawnCount
        real yaw "Yaw angle"
        real pitch "Pitch angle"
        real roll "Roll angle"
        boolean yawAlert
        boolean pitchAlert
        boolean rollAlert
        real headPoseSustained "0-1"
        boolean gazeAlert
        real gazeSustained "0-1"
        boolean phoneUsage
        real phoneUsageSustained "0-1"
    }
```
