const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(PROJECT_DIR, '.build-schema.json');

/**
 * Fail fast with a validation error message.
 * @param {string} message - Error message to display.
 */
function fail(message) {
    console.error(`Validation failed: ${message}`);
    process.exit(1);
}

if (!fs.existsSync(SCHEMA_PATH)) {
    fail(`Schema file not found: ${SCHEMA_PATH}`);
}

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const requiredFiles = schema.requiredFiles || [];
const requiredDirs = schema.requiredDirs || [];

for (const file of requiredFiles) {
    const filePath = path.join(PROJECT_DIR, file);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        fail(`Missing required file: ${file}`);
    }
}

for (const dir of requiredDirs) {
    const dirPath = path.join(PROJECT_DIR, dir);
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        fail(`Missing required directory: ${dir}`);
    }
}

console.info('Build validation passed.');
