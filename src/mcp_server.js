const systeminformation = require('systeminformation');
const { v4: uuidv4 } = require('uuid');

async function handleMcpRequest(req, res) {
  const { jsonrpc, method, params, id } = req.body;

  if (jsonrpc !== '2.0' || !method) {
    return res.status(400).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32600,
        message: 'Invalid Request',
      },
    });
  }

  let result;
  try {
    switch (method) {
      case 'initialize':
        result = handleInitialize(params);
        break;
      case 'tools/list':
        result = handleToolsList();
        break;
      case 'tools/call':
        result = await handleToolsCall(params);
        break;
      default:
        return res.status(404).json({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: 'Method not found',
          },
        });
    }

    res.json({
      jsonrpc: '2.0',
      id,
      result,
    });
  } catch (error) {
    res.status(500).json({
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: 'Internal error',
        data: error.message,
      },
    });
  }
}

function handleInitialize(params) {
  return {
    protocolVersion: '2025-06-18',
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: 'mcp-system-monitor-js',
      version: '0.1.0',
    },
  };
}

function handleToolsList() {
    return {
        content: [
            {
                type: 'tool-list',
                tools: [
                    'get_system_info',
                    'get_cpu_info',
                    'get_memory_info',
                    'get_disk_info',
                    'get_network_info',
                    'get_processes',
                    'get_system_metrics',
                ]
            }
        ]
    };
}

async function handleToolsCall(params) {
  const { name, arguments: args } = params;

  let toolResult;
  switch (name) {
    case 'get_system_info':
      toolResult = await getSystemInfo();
      break;
    case 'get_cpu_info':
      toolResult = await getCpuInfo();
      break;
    case 'get_memory_info':
        toolResult = await getMemoryInfo();
        break;
    case 'get_disk_info':
        toolResult = await getDiskInfo();
        break;
    case 'get_network_info':
        toolResult = await getNetworkInfo();
        break;
    case 'get_processes':
        toolResult = await getProcesses();
        break;
    case 'get_system_metrics':
        toolResult = await getSystemMetrics();
        break;
    default:
      throw new Error('Tool not found');
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(toolResult, null, 2),
      },
    ],
  };
}

async function getSystemInfo() {
    const osInfo = await systeminformation.osInfo();
    const time = systeminformation.time();
    
    let bootTime = null;
    if (time.boottime) {
        bootTime = new Date(time.boottime * 1000).toISOString();
    } else if (time.current && time.uptime) {
        bootTime = new Date(time.current - (time.uptime * 1000)).toISOString();
    } else {
        bootTime = new Date().toISOString();
    }

    return {
      hostname: osInfo.hostname,
      os_name: osInfo.distro,
      os_version: osInfo.release,
      kernel_version: osInfo.kernel,
      uptime: time.uptime,
      boot_time: bootTime,
    };
}

async function getCpuInfo() {
    const cpu = await systeminformation.cpu();
    const currentLoad = await systeminformation.currentLoad();
    const cpuTemperature = await systeminformation.cpuTemperature();

    return {
      name: `${cpu.manufacturer} ${cpu.brand}`,
      brand: cpu.brand,
      frequency: cpu.speed * 1000,
      cores: cpu.cores,
      usage_percent: currentLoad.currentLoad,
      temperature: cpuTemperature.main,
    };
}

async function getMemoryInfo() {
    const mem = await systeminformation.mem();
    const usage_percent = (mem.used / mem.total) * 100;
    const swap_usage_percent = mem.swaptotal > 0 ? (mem.swapused / mem.swaptotal) * 100 : 0;

    return {
      total: mem.total,
      used: mem.used,
      free: mem.free,
      available: mem.available,
      swap_total: mem.swaptotal,
      swap_used: mem.swapused,
      swap_free: mem.swapfree,
      usage_percent: usage_percent,
      swap_usage_percent: swap_usage_percent,
    };
}

async function getDiskInfo() {
    const fsSize = await systeminformation.fsSize();
    return fsSize.map(fs => ({
        name: fs.fs,
        mount_point: fs.mount,
        file_system: fs.type,
        total_space: fs.size,
        used_space: fs.used,
        free_space: fs.available,
        usage_percent: fs.use,
    }));
}

async function getNetworkInfo() {
    const networkInterfaces = await systeminformation.networkInterfaces();
    const networkStats = await systeminformation.networkStats();

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
}

async function getProcesses() {
    const processes = await systeminformation.processes();
    return processes.list.map(p => ({
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
}

async function getSystemMetrics() {
    const [
        osInfo,
        cpu,
        currentLoad,
        cpuTemperature,
        mem,
        fsSize,
        networkInterfaces,
        networkStats,
        processes,
      ] = await Promise.all([
        systeminformation.osInfo(),
        systeminformation.cpu(),
        systeminformation.currentLoad(),
        systeminformation.cpuTemperature(),
        systeminformation.mem(),
        systeminformation.fsSize(),
        systeminformation.networkInterfaces(),
        systeminformation.networkStats(),
        systeminformation.processes(),
      ]);
  
      const time = systeminformation.time();
      
      let bootTime = null;
      if (time.boottime) {
          bootTime = new Date(time.boottime * 1000).toISOString();
      } else if (time.current && time.uptime) {
          bootTime = new Date(time.current - (time.uptime * 1000)).toISOString();
      } else {
          bootTime = new Date().toISOString();
      }
  
      return {
        timestamp: new Date().toISOString(),
        system_info: {
          hostname: osInfo.hostname,
          os_name: osInfo.distro,
          os_version: osInfo.release,
          kernel_version: osInfo.kernel,
          uptime: time.uptime,
          boot_time: bootTime,
        },
        cpu_info: {
          name: `${cpu.manufacturer} ${cpu.brand}`,
          brand: cpu.brand,
          frequency: cpu.speed * 1000,
          cores: cpu.cores,
          usage_percent: currentLoad.currentLoad,
          temperature: cpuTemperature.main,
        },
        memory_info: {
          total: mem.total,
          used: mem.used,
          free: mem.free,
          available: mem.available,
          swap_total: mem.swaptotal,
          swap_used: mem.swapused,
          swap_free: mem.swapfree,
          usage_percent: (mem.used / mem.total) * 100,
          swap_usage_percent: mem.swaptotal > 0 ? (mem.swapused / mem.swaptotal) * 100 : 0,
        },
        disks: fsSize.map(fs => ({
          name: fs.fs,
          mount_point: fs.mount,
          file_system: fs.type,
          total_space: fs.size,
          used_space: fs.used,
          free_space: fs.available,
          usage_percent: fs.use,
        })),
        networks: networkInterfaces.map(iface => {
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
        }),
        processes: processes.list.map(p => ({
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
        })),
      };
}

module.exports = { 
    handleMcpRequest,
    getSystemInfo,
    getCpuInfo,
    getMemoryInfo,
    getDiskInfo,
    getNetworkInfo,
    getProcesses,
    getSystemMetrics
};
