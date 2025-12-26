# MCP System Monitor Server for Linux (JavaScript Edition)

A Model Context Protocol (MCP) server implementation in JavaScript, designed for AI agents to monitor and interact with Linux servers (Ubuntu, CentOS, RedHat, etc.). This server provides comprehensive system information including CPU, memory, disk, network, and process data through both MCP protocol (Stdio) and HTTP REST API.

## Features

- **Dual Mode**: Runs as a standard MCP server (Stdio) by default or as an HTTP server with `--http`.
- **System Information**: Hostname, OS details, kernel version, uptime
- **CPU Monitoring**: Usage percentage, frequency, core count, brand information, temperature
- **Memory Monitoring**: RAM and swap usage, available memory
- **Disk Monitoring**: Storage usage, file system information, mount points
- **Network Monitoring**: Interface statistics, traffic data, error counts
- **Process Management**: Process list, individual process details, resource usage
- **Real-time Metrics**: Comprehensive system metrics collection

## Installation

### Automatic Install (Recommended)

This script will install the server to `~/.local/share/mcp-servers/` and configure `opencode` if available.

```bash
curl -fsSL https://raw.githubusercontent.com/DarkPhilosophy/mcp-system-monitor-js/main/install.sh | bash
```

### Manual Install

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/DarkPhilosophy/mcp-system-monitor-js.git
    cd mcp-system-monitor-js
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Link to MCP servers location (optional):**
    ```bash
    ln -s $(pwd) ~/.local/share/mcp-servers/mcp-system-monitor-js
    ```

## Usage

### MCP Mode (Default)

This mode is used by MCP clients (like Claude Desktop, OpenCode, etc.) to communicate via standard input/output.

```bash
node src/index.js
```

**OpenCode Configuration (`~/.config/opencode/opencode.json`):**

```json
"mcp-system-monitor": {
  "type": "local",
  "command": [
    "node",
    "/home/YOUR_USER/.local/share/mcp-servers/mcp-system-monitor-js/src/index.js"
  ],
  "enabled": true
}
```

### HTTP Server Mode

To run as a standalone HTTP server (e.g., for remote monitoring or Docker):

```bash
node src/index.js --http
```

The server will listen on port **57996**.

### Docker

```bash
docker-compose up -d
```

## Tools

*   `get_system_info`: General OS and kernel info.
*   `get_cpu_info`: CPU load, temperature, and specs.
*   `get_memory_info`: RAM and Swap usage.
*   `get_disk_info`: Partition sizes and usage.
*   `get_network_info`: Traffic stats per interface.
*   `get_processes`: List of running processes.
*   `get_system_metrics`: All-in-one snapshot of the above.