const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
    handleMcpRequest,
    getSystemInfo,
    getCpuInfo,
    getMemoryInfo,
    getDiskInfo,
    getNetworkInfo,
    getProcesses,
    getSystemMetrics
} = require('./mcp_server');

const args = process.env.ARGS ? process.env.ARGS.split(' ') : process.argv.slice(2);
const useHttp = args.includes('--http');

if (useHttp) {
    // HTTP Mode
    const app = express();
    const port = 57996;

    app.use(morgan('dev'));
    app.use(cors());
    app.use(express.json());

    app.get('/', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const endpointEvent = {
            type: 'endpoint',
            uri: `http://localhost:${port}/`
        };
        res.write(`event: endpoint\ndata: ${encodeURI(endpointEvent.uri)}\n\n`);
        res.write(': heartbeat\n\n');

        const intervalId = setInterval(() => {
            res.write(': heartbeat\n\n');
        }, 10000);

        req.on('close', () => {
            clearInterval(intervalId);
        });
    });

    app.post('/', handleMcpRequest);

    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            service: 'MCP System Monitor JS',
            timestamp: new Date().toISOString(),
        });
    });

    app.listen(port, () => {
        console.log(`MCP System Monitor JS server listening on port ${port}`);
    });

} else {
    // Stdio Mode using SDK (Default)
    const server = new McpServer({
        name: 'mcp-system-monitor-js',
        version: '0.1.0',
    });

    // Register Tools
    server.tool('get_system_info', 'Get general system information', {}, async () => ({
        content: [{ type: 'text', text: JSON.stringify(await getSystemInfo(), null, 2) }]
    }));

    server.tool('get_cpu_info', 'Get CPU usage and information', {}, async () => ({
        content: [{ type: 'text', text: JSON.stringify(await getCpuInfo(), null, 2) }]
    }));

    server.tool('get_memory_info', 'Get memory usage information', {}, async () => ({
        content: [{ type: 'text', text: JSON.stringify(await getMemoryInfo(), null, 2) }]
    }));

    server.tool('get_disk_info', 'Get disk usage information', {}, async () => ({
        content: [{ type: 'text', text: JSON.stringify(await getDiskInfo(), null, 2) }]
    }));

    server.tool('get_network_info', 'Get network interface statistics', {}, async () => ({
        content: [{ type: 'text', text: JSON.stringify(await getNetworkInfo(), null, 2) }]
    }));

    server.tool('get_processes', 'Get list of running processes', {}, async () => ({
        content: [{ type: 'text', text: JSON.stringify(await getProcesses(), null, 2) }]
    }));

    server.tool('get_system_metrics', 'Get all system metrics in one call', {}, async () => ({
        content: [{ type: 'text', text: JSON.stringify(await getSystemMetrics(), null, 2) }]
    }));

    async function runServer() {
        const transport = new StdioServerTransport();
        await server.connect(transport);
    }

    runServer().catch(console.error);
}
