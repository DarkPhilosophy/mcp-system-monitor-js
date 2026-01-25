const systeminformation = require('systeminformation');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

/**
 *
 */
function startAutoUpdate() {
    const setting = process.env.SYSTEM_MONITOR_AUTO_UPDATE;
    if (setting && ['0', 'false', 'off'].includes(setting.toLowerCase())) {
        return;
    }

    const scriptPath = path.resolve(__dirname, '..', '.scripts', 'auto-update.js');
    if (!fs.existsSync(scriptPath)) {
        return;
    }

    try {
        const child = spawn(process.execPath, [scriptPath], {
            detached: true,
            stdio: 'ignore',
        });
        child.unref();
    } catch (error) {
        console.error('Auto-update failed to start:', error);
    }
}

startAutoUpdate();

/**
 * Cache for static system information
 */
const staticCache = {
    system: null,
    cpu: null,
    disks: null,
    lastUpdate: 0,
    TTL: 1000 * 60 * 60, // 1 hour for truly static info
};

/**
 * Persistence Settings
 */
const HISTORY_PATH = path.join(process.env.HOME || '/var/home/alexa', '.local/share/system-monitor-js/history.json');
const MAX_HISTORY_POINTS = 1440; // 24 hours at 1-minute intervals
const MONITOR_INTERVAL = 60 * 1000; // 1 minute

/**
 * Alert Thresholds
 */
const THRESHOLDS = {
    cpu_usage: 90,
    memory_usage: 90,
    disk_usage: 90,
    temperature: 80,
};

let metricsHistory = [];

/**
 * Load history from disk
 */
function loadHistory() {
    try {
        if (fs.existsSync(HISTORY_PATH)) {
            const data = fs.readFileSync(HISTORY_PATH, 'utf8');
            metricsHistory = JSON.parse(data);
        }
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

/**
 * Save history to disk
 */
function saveHistory() {
    try {
        const dir = path.dirname(HISTORY_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(HISTORY_PATH, JSON.stringify(metricsHistory));
    } catch (error) {
        console.error('Failed to save history:', error);
    }
}

/**
 * Background Monitoring & Data Gathering
 */
async function runBackgroundMonitor() {
    try {
        const metrics = await getSystemMetrics();
        const timestamp = new Date().toISOString();

        // Add to history
        const snapshot = {
            timestamp,
            cpu: metrics.cpu_info.usage_percent,
            memory: metrics.memory_info.usage_percent,
            temp: metrics.cpu_info.temperature,
            disks: metrics.disks.map(d => ({
                mount: d.mount_point,
                usage: d.usage_percent,
            })),
        };

        metricsHistory.push(snapshot);
        if (metricsHistory.length > MAX_HISTORY_POINTS) {
            metricsHistory.shift();
        }
        saveHistory();

        // Check Alerts
        checkAlerts(snapshot);
    } catch (error) {
        console.error('Background monitor error:', error);
    }
}

/**
 * @param {object} snapshot - Metrics snapshot for alert checks.
 */
function checkAlerts(snapshot) {
    const alerts = [];
    if (snapshot.cpu > THRESHOLDS.cpu_usage) {
        alerts.push(`High CPU Usage: ${snapshot.cpu.toFixed(1)}%`);
    }
    if (snapshot.memory > THRESHOLDS.memory_usage) {
        alerts.push(`High Memory Usage: ${snapshot.memory.toFixed(1)}%`);
    }
    if (snapshot.temp > THRESHOLDS.temperature) {
        alerts.push(`High Temperature: ${snapshot.temp}°C`);
    }

    snapshot.disks.forEach(d => {
        if (d.usage > THRESHOLDS.disk_usage) {
            alerts.push(`High Disk Usage on ${d.mount}: ${d.usage.toFixed(1)}%`);
        }
    });

    if (alerts.length > 0) {
        const alertMsg = `[SYSTEM ALERT] ${alerts.join(' | ')}`;
        console.warn(alertMsg);
        // If SSE transport is active, we could emit an event here in the future
    }
}

loadHistory();
setInterval(runBackgroundMonitor, MONITOR_INTERVAL);

/**
 * System Data Gathering Functions with Error Handling
 */

/**
 * Get general system information.
 * @returns {Promise<object>}
 */
async function getSystemInfo() {
    const now = Date.now();
    if (staticCache.system && now - staticCache.lastUpdate < staticCache.TTL) {
        return staticCache.system;
    }
    try {
        const [osInfo, time] = await Promise.all([systeminformation.osInfo(), systeminformation.time()]);

        let bootTime = null;
        if (time.boottime) {
            bootTime = new Date(time.boottime * 1000).toISOString();
        } else if (time.current && time.uptime) {
            bootTime = new Date(time.current - time.uptime * 1000).toISOString();
        } else {
            bootTime = new Date().toISOString();
        }

        staticCache.system = {
            hostname: osInfo.hostname || 'unknown',
            os_name: osInfo.distro || 'unknown',
            os_version: osInfo.release || 'unknown',
            kernel_version: osInfo.kernel || 'unknown',
            uptime: time.uptime || 0,
            boot_time: bootTime,
        };
        staticCache.lastUpdate = now;
        return staticCache.system;
    } catch (error) {
        console.error('Error fetching system info:', error);
        return { error: 'Failed to fetch system information' };
    }
}

/**
 * Get CPU usage and information.
 * @returns {Promise<object>}
 */
async function getCpuInfo() {
    try {
        const [cpu, currentLoad, cpuTemperature] = await Promise.all([
            systeminformation.cpu(),
            systeminformation.currentLoad(),
            systeminformation.cpuTemperature(),
        ]);

        return {
            name: `${cpu.manufacturer} ${cpu.brand}`,
            brand: cpu.brand,
            frequency: cpu.speed * 1000,
            cores: cpu.cores,
            usage_percent: currentLoad.currentLoad,
            temperature: cpuTemperature.main || null,
        };
    } catch (error) {
        console.error('Error fetching CPU info:', error);
        return { error: 'Failed to fetch CPU information' };
    }
}

/**
 * Get memory usage information.
 * @returns {Promise<object>}
 */
async function getMemoryInfo() {
    try {
        const mem = await systeminformation.mem();
        return {
            total: mem.total,
            used: mem.used,
            free: mem.free,
            available: mem.available,
            swap_total: mem.swaptotal,
            swap_used: mem.swapused,
            swap_free: mem.swapfree,
            usage_percent: (mem.used / mem.total) * 100,
            swap_usage_percent: mem.swaptotal > 0 ? (mem.swapused / mem.swaptotal) * 100 : 0,
        };
    } catch (error) {
        console.error('Error fetching memory info:', error);
        return { error: 'Failed to fetch memory information' };
    }
}

/**
 * Get disk usage information with optional filtering.
 * @param {{ mountPoint?: string }} [filter] Optional filter by mount point.
 * @returns {Promise<object|object[]>}
 */
async function getDiskInfo(filter = {}) {
    try {
        const fsSize = await systeminformation.fsSize();
        let disks = fsSize.map(fs => ({
            name: fs.fs,
            mount_point: fs.mount,
            file_system: fs.type,
            total_space: fs.size,
            used_space: fs.used,
            free_space: fs.available,
            usage_percent: fs.use,
        }));

        if (filter.mountPoint) {
            disks = disks.filter(d => d.mount_point.includes(filter.mountPoint));
        }

        return disks;
    } catch (error) {
        console.error('Error fetching disk info:', error);
        return { error: 'Failed to fetch disk information' };
    }
}

/**
 * Get network interface statistics.
 * @returns {Promise<object|object[]>}
 */
async function getNetworkInfo() {
    try {
        const [networkInterfaces, networkStats] = await Promise.all([
            systeminformation.networkInterfaces(),
            systeminformation.networkStats(),
        ]);

        return networkInterfaces.map(iface => {
            const stats = networkStats.find(stat => stat.iface === iface.iface);
            return {
                interface: iface.iface,
                ip_address: iface.ip4,
                mac_address: iface.mac,
                bytes_received: stats ? stats.rx_bytes : 0,
                bytes_transmitted: stats ? stats.tx_bytes : 0,
                packets_received: stats ? stats.rx_packets : 0,
                packets_transmitted: stats ? stats.tx_packets : 0,
                errors_received: stats ? stats.rx_errors : 0,
                errors_transmitted: stats ? stats.tx_errors : 0,
            };
        });
    } catch (error) {
        console.error('Error fetching network info:', error);
        return { error: 'Failed to fetch network information' };
    }
}

/**
 * Get running process details with optional filters.
 * @param {{ limit?: number, name?: string, sortBy?: 'cpu_usage'|'memory_usage'|'priority' }} [options] Optional filters and sort settings.
 * @returns {Promise<object|object[]>}
 */
async function getProcesses(options = {}) {
    try {
        const processes = await systeminformation.processes();
        let list = processes.list.map(p => ({
            pid: p.pid,
            name: p.name,
            command: p.command,
            cpu_usage: p.cpu,
            memory_usage: p.mem,
            memory_usage_percent: p.mem_rss,
            status: p.status,
            start_time: p.started,
            user: p.user,
            priority: p.priority,
        }));

        if (options.name) {
            const filter = options.name.toLowerCase();
            list = list.filter(p => p.name.toLowerCase().includes(filter));
        }

        if (options.sortBy) {
            list.sort((a, b) => (b[options.sortBy] || 0) - (a[options.sortBy] || 0));
        }

        if (options.limit) {
            list = list.slice(0, options.limit);
        }

        return list;
    } catch (error) {
        console.error('Error fetching process info:', error);
        return { error: 'Failed to fetch process information' };
    }
}

/**
 * Get battery status and information.
 * @returns {Promise<object>}
 */
async function getBatteryInfo() {
    try {
        const batteryData = await systeminformation.battery();
        return {
            has_battery: batteryData.hasBattery,
            cycle_count: batteryData.cycleCount,
            is_charging: batteryData.isCharging,
            designed_capacity: batteryData.designedCapacity,
            max_capacity: batteryData.maxCapacity,
            current_capacity: batteryData.currentCapacity,
            voltage: batteryData.voltage,
            capacity_unit: batteryData.capacityUnit,
            percent: batteryData.percent,
            time_remaining: batteryData.timeRemaining,
            ac_connected: batteryData.acConnected,
            type: batteryData.type,
            model: batteryData.model,
            manufacturer: batteryData.manufacturer,
            serial: batteryData.serial,
        };
    } catch (error) {
        console.error('Error fetching battery info:', error);
        return { error: 'Failed to fetch battery information' };
    }
}

/**
 * Get connected USB device details.
 * @returns {Promise<object|object[]>}
 */
async function getUsbDevices() {
    try {
        const usbData = await systeminformation.usb();
        return usbData.map(dev => ({
            bus: dev.bus,
            device_id: dev.deviceId,
            id: dev.id,
            name: dev.name,
            type: dev.type,
            removable: dev.removable,
            vendor: dev.vendor,
            manufacturer: dev.manufacturer,
            max_power: dev.maxPower,
            serial_number: dev.serialNumber,
        }));
    } catch (error) {
        console.error('Error fetching USB devices:', error);
        return { error: 'Failed to fetch USB device information' };
    }
}

/**
 * Get all system metrics in one call.
 * @returns {Promise<object>}
 */
async function getSystemMetrics() {
    try {
        const [system, cpu, memory, disks, networks, processes] = await Promise.all([
            getSystemInfo(),
            getCpuInfo(),
            getMemoryInfo(),
            getDiskInfo(),
            getNetworkInfo(),
            getProcesses({ limit: 10, sortBy: 'cpu_usage' }),
        ]);

        return {
            timestamp: new Date().toISOString(),
            system_info: system,
            cpu_info: cpu,
            memory_info: memory,
            disks,
            networks,
            top_processes: processes,
        };
    } catch (error) {
        console.error('Error fetching aggregate metrics:', error);
        return { error: 'Failed to fetch system metrics' };
    }
}

/**
 * MCP Server Implementation
 */

const server = new McpServer({
    name: 'system-monitor',
    version: '0.2.0',
});

// Tool Registration with Input Schemas
server.tool('get_system_info', 'Get general system information', {}, async () => ({
    content: [
        {
            type: 'text',
            text: JSON.stringify(await getSystemInfo(), null, 2),
        },
    ],
}));

server.tool('get_cpu_info', 'Get CPU usage and information', {}, async () => ({
    content: [{ type: 'text', text: JSON.stringify(await getCpuInfo(), null, 2) }],
}));

server.tool('get_memory_info', 'Get memory usage information', {}, async () => ({
    content: [
        {
            type: 'text',
            text: JSON.stringify(await getMemoryInfo(), null, 2),
        },
    ],
}));

server.tool(
    'get_disk_info',
    'Get disk usage information',
    {
        mountPoint: z.string().optional().describe('Filter by mount point path'),
    },
    async ({ mountPoint }) => ({
        content: [
            {
                type: 'text',
                text: JSON.stringify(await getDiskInfo({ mountPoint }), null, 2),
            },
        ],
    }),
);

server.tool('get_network_info', 'Get network interface statistics', {}, async () => ({
    content: [
        {
            type: 'text',
            text: JSON.stringify(await getNetworkInfo(), null, 2),
        },
    ],
}));

server.tool(
    'get_processes',
    'Get list of running processes',
    {
        limit: z.number().optional().default(20).describe('Limit the number of processes returned'),
        name: z.string().optional().describe('Filter by process name'),
        sortBy: z
            .enum(['cpu_usage', 'memory_usage', 'priority'])
            .optional()
            .default('cpu_usage')
            .describe('Property to sort by'),
    },
    async args => ({
        content: [
            {
                type: 'text',
                text: JSON.stringify(await getProcesses(args), null, 2),
            },
        ],
    }),
);

server.tool('get_system_metrics', 'Get all system metrics in one call', {}, async () => ({
    content: [
        {
            type: 'text',
            text: JSON.stringify(await getSystemMetrics(), null, 2),
        },
    ],
}));

server.tool(
    'get_metrics_history',
    'Get historical system metrics',
    {
        limit: z.number().optional().default(60).describe('Number of past minutes to retrieve'),
    },
    async ({ limit }) => ({
        content: [
            {
                type: 'text',
                text: JSON.stringify(metricsHistory.slice(-limit), null, 2),
            },
        ],
    }),
);

server.tool('get_battery_info', 'Get battery status and information', {}, async () => ({
    content: [
        {
            type: 'text',
            text: JSON.stringify(await getBatteryInfo(), null, 2),
        },
    ],
}));

server.tool('get_usb_devices', 'Get list of connected USB devices', {}, async () => ({
    content: [
        {
            type: 'text',
            text: JSON.stringify(await getUsbDevices(), null, 2),
        },
    ],
}));

/**
 * Execution Mode Logic
 */

const args = process.env.ARGS ? process.env.ARGS.split(' ') : process.argv.slice(2);
const useHttp = args.includes('--http');

if (useHttp) {
    const express = require('express');
    const morgan = require('morgan');
    const cors = require('cors');
    const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');

    const app = express();
    const port = process.env.PORT || 57996;
    const apiKey = process.env.MCP_API_KEY;
    let transport = null;

    app.use(morgan('dev'));
    app.use(cors());
    app.use(express.json());

    // Basic Authentication Middleware
    const authMiddleware = (req, res, next) => {
        if (!apiKey) {
            return next(); // No API key configured, allow public access
        }
        const token = req.headers['x-api-key'] || req.query.apiKey;
        if (token === apiKey) {
            next();
        } else {
            res.status(401).json({ error: 'Unauthorized' });
        }
    };

    app.get('/sse', authMiddleware, async (req, res) => {
        console.info('New SSE connection');
        transport = new SSEServerTransport('/messages', res);
        await server.connect(transport);
    });

    app.post('/messages', authMiddleware, async (req, res) => {
        if (transport) {
            await transport.handlePostMessage(req, res);
        } else {
            res.status(400).send('No active SSE connection');
        }
    });

    app.get('/health', (req, res) => {
        res.json({
            status: 'healthy',
            service: 'System Monitor',
            timestamp: new Date().toISOString(),
        });
    });

    app.listen(port, () => {
        console.info(`System Monitor HTTP server listening on port ${port}`);
        console.info(`SSE endpoint: http://localhost:${port}/sse`);
        console.info(`Message endpoint: http://localhost:${port}/messages`);
        if (apiKey) {
            console.info('Authentication enabled: API key required');
        } else {
            console.warn('Authentication disabled: Public access');
        }
    });
} else {
    /**
     * Run the MCP server over stdio transport.
     * @returns {Promise<void>}
     */
    async function runStdioServer() {
        const transport = new StdioServerTransport();
        await server.connect(transport);
    }

    runStdioServer().catch(err => {
        console.error('Fatal error running Stdio server:', err);
        process.exit(1);
    });
}
