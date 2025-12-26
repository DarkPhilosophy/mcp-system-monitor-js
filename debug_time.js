const systeminformation = require('systeminformation');

async function checkTime() {
    try {
        const time = systeminformation.time();
        console.log('Time object:', JSON.stringify(time, null, 2));
        console.log('Boottime type:', typeof time.boottime);
        console.log('Boottime value:', time.boottime);
        try {
            const bootTimeDate = new Date(time.boottime * 1000).toISOString();
            console.log('Formatted boot time:', bootTimeDate);
        } catch (e) {
            console.error('Error formatting date:', e.message);
        }
    } catch (e) {
        console.error('Error getting time:', e);
    }
}

checkTime();
