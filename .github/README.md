# System Monitor MCP Server for Linux

A Model Context Protocol (MCP) server implementation in JavaScript, designed for AI agents to monitor and interact with Linux systems. This server provides comprehensive metrics including CPU, memory, disk, network, and process data through both Stdio and secured HTTP/SSE transports.

<!-- NPM-VERSION-START -->
[![Status: Synced](https://img.shields.io/badge/Status-Synced-brightgreen)](https://www.npmjs.com/package/@darkphilosophy/system-monitor) ![GitHub](https://img.shields.io/badge/GitHub-v0.2.1-blue) ![npm](https://img.shields.io/badge/npm-v0.2.1-green)
<!-- NPM-VERSION-END -->

## Features

- **Dual Mode**: Runs as a standard MCP server (Stdio) or a secured HTTP server (`--http`).
- **Performance Optimized**: Uses TTL caching for static hardware info and parallel sensor polling.
- **System Information**: Hostname, OS details, kernel version, uptime.
- **CPU Monitoring**: Usage %, frequency, cores, brand, and temperature.
- **Memory Monitoring**: RAM and swap usage, real-time availability.
- **Disk Monitoring**: Storage usage, file system types, and mount point filtering.
- **Network Monitoring**: Interface statistics, traffic data, and error tracking.
- **Persistent Metrics**: Background persistence to `history.json` with a rolling 24-hour window.
- **Proactive Alerting**: Real-time threshold monitoring (CPU, Memory, Disk, Temp) with immediate console warnings.
- **Advanced Process Tracking**: Filter, sort, and limit process lists by resource consumption.

## Security

### HTTP Authentication
When running in HTTP mode (`--http`), you can secure the endpoint using an API key.

1.  Set the `MCP_API_KEY` environment variable:
    ```bash
    export MCP_API_KEY="your-secure-token-here"
    node src/index.js --http
    ```

2.  Clients must then provide the key in the `x-api-key` header or as a query parameter:
    - **Header**: `x-api-key: your-secure-token-here`
    - **Query**: `http://localhost:57996/sse?apiKey=your-secure-token-here`

*Note: If `MCP_API_KEY` is not set, the HTTP server will default to public access (local network only recommended).*

## Installation

### Automatic Install (Recommended)

This script installs to `~/.gemini/extensions/system-monitor-js`, runs `npm install`, and creates a legacy symlink at
`~/.local/share/mcp-servers/system-monitor-js`.

```bash
curl -fsSL https://raw.githubusercontent.com/DarkPhilosophy/mcp-system-monitor-js/master/install.sh | bash
```

### Manual Install

1. **Clone the repository:**
   ```bash
   git clone https://github.com/DarkPhilosophy/mcp-system-monitor-js.git
   cd mcp-system-monitor-js
   ```

2. **Install dependencies (required for manual installs):**
   ```bash
   npm install
   ```

3. **Link to Gemini extensions and legacy MCP path (optional):**
   ```bash
   mkdir -p ~/.gemini/extensions
   ln -s $(pwd) ~/.gemini/extensions/system-monitor-js
   ln -sfn ~/.gemini/extensions/system-monitor-js ~/.local/share/mcp-servers/system-monitor-js
   ```

## Usage

### MCP Mode (Default / Stdio)
Used by MCP-compatible clients like Claude Desktop or OpenCode.

```bash
node src/index.js
```

**OpenCode Configuration (`~/.config/opencode/opencode.json`):**
```json
"system-monitor": {
  "type": "local",
  "command": [
    "node",
    "/var/home/alexa/.gemini/extensions/system-monitor-js/src/index.js"
  ],
  "enabled": true
}
```

### HTTP Server Mode
```bash
node src/index.js --http
```
The server listens on port **57996** by default.

## Tools

- `get_system_info`: General OS/Kernel details.
- `get_cpu_info`: Load, specs, and temperature.
- `get_memory_info`: RAM/Swap metrics.
- `get_disk_info`: Partition usage. Parameters: `mountPoint` (optional).
- `get_network_info`: Traffic and interface stats.
- `get_processes`: Active processes. Parameters: `limit` (number), `name` (filter), `sortBy` (`cpu_usage`, `memory_usage`, `priority`).
- `get_system_metrics`: Consolidated system health snapshot.
- `get_metrics_history`: Retrieve historical performance trends. Parameters: `limit` (number of minutes).
- `get_battery_info`: Power status and battery health.
- `get_usb_devices`: Connected hardware list.

## Validation Status

<!-- LINT-RESULT-START -->
### Linting Status
> **Status**: ✅ **Passing**  
> **Last Updated**: 2026-01-25 12:03:39 UTC  
> **Summary**: 0 errors, 0 warnings
<!-- LINT-RESULT-END -->

<!-- LATEST-VERSION-START -->
<details open>
<summary><strong>Latest Update (v0.2.1)</strong></summary>

- 2026-01-25
- **Binary Entrypoint**: Add npm CLI entrypoint `mcp-system-monitor`.

</details>
<!-- LATEST-VERSION-END -->
