# Changelog

## 0.2.0 - 2026-01-25
### Security
- **HTTP Authentication**: Added support for `MCP_API_KEY` environment variable to secure the SSE/HTTP endpoint.
- **Input Validation**: Implemented Zod schemas for all tool parameters to ensure strict input handling.

### Performance & Optimization
- **Code Consolidation**: Merged `mcp_server.js` into `index.js` for a cleaner, unified codebase using the official MCP SDK for both transport modes.
- **Static Caching**: Added a TTL-based cache (1 hour) for static system data (OS info, CPU hardware) to reduce redundant system calls.
- **Parallel Data Fetching**: Optimized all data-gathering functions to use `Promise.all` for parallel hardware sensor queries.

### Features
- **Renamed Identity**: Rebranded the server from `mcp-system-monitor-js` to a simpler `system-monitor`.
- **Persistent Metrics**: Implemented background persistence to `history.json` with a rolling 24-hour window.
- **Proactive Alerting**: Added real-time threshold monitoring (CPU, Memory, Disk, Temp) with console warnings.
- **Trend Analysis**: Introduced `get_metrics_history` tool to retrieve performance history.
- **Enhanced `get_processes`**: Added support for `limit`, `name` filtering, and `sortBy` (`cpu_usage`, `memory_usage`, `priority`).
- **Enhanced `get_disk_info`**: Added `mountPoint` filtering support.
- **Aggregated Metrics**: Improved `get_system_metrics` tool to return a consolidated, prioritized snapshot of system health.
- **Auto-Update**: Added non-blocking auto-update script that checks for newer versions on startup.

## 0.1.0 - 2025-12-26
- Initial release
