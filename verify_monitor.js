const { getBatteryInfo, getUsbDevices } = require('./src/mcp_server');

async function verify() {
    console.log('--- Battery Info ---');
    try {
        const battery = await getBatteryInfo();
        console.log(JSON.stringify(battery, null, 2));
    } catch (e) {
        console.error('Battery Error:', e);
    }

    console.log('\n--- USB Devices ---');
    try {
        const usb = await getUsbDevices();
        console.log(JSON.stringify(usb, null, 2));
    } catch (e) {
        console.error('USB Error:', e);
    }
}

verify();
