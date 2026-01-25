const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');
const TARGET_DIRS = ['src', '.scripts'];

const patterns = [
    { name: 'GitHub token', regex: /ghp_[A-Za-z0-9]{20,}/g },
    { name: 'Sourcegraph token', regex: /sgp_[A-Za-z0-9]{20,}/g },
    {
        name: 'Generic API key',
        regex: /(api[_-]?key|secret|token)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
    },
];

/**
 * Scan a single file for secret patterns.
 * @param {string} filePath - Path to a file to scan.
 * @returns {string[]} Matched pattern names.
 */
function scanFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const hits = [];
    for (const pattern of patterns) {
        if (pattern.regex.test(content)) {
            hits.push(pattern.name);
        }
    }

    return hits;
}

/**
 * Walk a directory recursively and collect file paths.
 * @param {string} dirPath - Directory to walk.
 * @param {string[]} results - Accumulator for file paths.
 */
function walkDir(dirPath, results) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.git')) {
            continue;
        }
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            walkDir(fullPath, results);
        } else if (entry.isFile()) {
            results.push(fullPath);
        }
    }
}

const filesToScan = [];
for (const dir of TARGET_DIRS) {
    const dirPath = path.join(PROJECT_DIR, dir);
    if (fs.existsSync(dirPath)) {
        walkDir(dirPath, filesToScan);
    }
}

const findings = [];
for (const filePath of filesToScan) {
    const hits = scanFile(filePath);
    if (hits.length > 0) {
        findings.push({ filePath, hits });
    }
}

if (findings.length > 0) {
    console.error('Potential secret leakage detected:');
    for (const finding of findings) {
        console.error(`- ${finding.filePath}: ${finding.hits.join(', ')}`);
    }

    process.exit(1);
}

console.info('Leak scan passed.');
