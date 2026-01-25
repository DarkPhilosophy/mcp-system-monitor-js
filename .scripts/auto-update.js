const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawnSync } = require('child_process');

const PROJECT_DIR = path.resolve(__dirname, '..');
const REPO_URL = 'https://github.com/DarkPhilosophy/mcp-system-monitor-js.git';
const BRANCH = 'master';
const PACKAGE_JSON_PATH = path.join(PROJECT_DIR, 'package.json');
const LOCK_PATH = path.join(PROJECT_DIR, '.auto-update.lock');
const REMOTE_PACKAGE_URL = `https://raw.githubusercontent.com/DarkPhilosophy/mcp-system-monitor-js/${BRANCH}/package.json`;

/**
 * @param {string} message - Message to log.
 */
function logInfo(message) {
    console.info(`[auto-update] ${message}`);
}

/**
 * @param {string} message - Message to log.
 */
function logWarn(message) {
    console.warn(`[auto-update] ${message}`);
}

/**
 * @param {string} message - Message to log.
 */
function logError(message) {
    console.error(`[auto-update] ${message}`);
}

/**
 * @param {string} a - Local version string.
 * @param {string} b - Remote version string.
 * @returns {number} Comparison result.
 */
function compareVersions(a, b) {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i += 1) {
        const left = aParts[i] || 0;
        const right = bParts[i] || 0;
        if (left > right) {
            return 1;
        }
        if (left < right) {
            return -1;
        }
    }
    return 0;
}

/**
 * @param {string} url - Remote package.json URL.
 * @returns {Promise<object>} Parsed package.json data.
 */
function fetchRemotePackageJson(url) {
    return new Promise((resolve, reject) => {
        https
            .get(url, res => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    res.resume();
                    return;
                }
                let data = '';
                res.setEncoding('utf8');
                res.on('data', chunk => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (err) {
                        reject(err);
                    }
                });
            })
            .on('error', reject);
    });
}

/**
 *
 */
function isGitRepo() {
    return fs.existsSync(path.join(PROJECT_DIR, '.git'));
}

/**
 *
 */
function isWorkingTreeClean() {
    const result = spawnSync('git', ['status', '--porcelain'], {
        cwd: PROJECT_DIR,
        encoding: 'utf8',
    });
    if (result.status !== 0) {
        return false;
    }
    return result.stdout.trim().length === 0;
}

/**
 *
 */
function updateDependenciesIfNeeded() {
    const result = spawnSync('git', ['diff', '--name-only', 'HEAD@{1}', 'HEAD'], {
        cwd: PROJECT_DIR,
        encoding: 'utf8',
    });
    if (result.status !== 0) {
        return;
    }

    const changed = result.stdout.split('\n').map(s => s.trim());
    if (changed.includes('package.json') || changed.includes('package-lock.json')) {
        logInfo('Dependencies changed; running npm install...');
        spawnSync('npm', ['install', '--silent'], { cwd: PROJECT_DIR, stdio: 'inherit' });
    }
}

/**
 *
 */
async function run() {
    if (fs.existsSync(LOCK_PATH)) {
        return;
    }

    fs.writeFileSync(LOCK_PATH, `${Date.now()}\n`);

    try {
        if (!fs.existsSync(PACKAGE_JSON_PATH)) {
            logWarn('package.json not found; skipping update.');
            return;
        }

        const localPkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
        const localVersion = localPkg.version || '0.0.0';

        const remotePkg = await fetchRemotePackageJson(REMOTE_PACKAGE_URL);
        const remoteVersion = remotePkg.version || '0.0.0';

        if (compareVersions(remoteVersion, localVersion) <= 0) {
            return;
        }

        if (!isGitRepo()) {
            logWarn('Not a git repository; skipping auto-update.');
            return;
        }

        if (!isWorkingTreeClean()) {
            logWarn('Working tree not clean; skipping auto-update.');
            return;
        }

        logInfo(`Updating from ${REPO_URL} (${localVersion} -> ${remoteVersion})`);
        const fetchResult = spawnSync('git', ['fetch', 'origin', BRANCH], {
            cwd: PROJECT_DIR,
            stdio: 'inherit',
        });
        if (fetchResult.status !== 0) {
            logError('git fetch failed.');
            return;
        }

        const pullResult = spawnSync('git', ['pull', '--ff-only', 'origin', BRANCH], {
            cwd: PROJECT_DIR,
            stdio: 'inherit',
        });
        if (pullResult.status !== 0) {
            logError('git pull failed.');
            return;
        }

        updateDependenciesIfNeeded();
        logInfo('Auto-update complete.');
    } catch (error) {
        logError(error.message);
    } finally {
        try {
            fs.unlinkSync(LOCK_PATH);
        } catch {
            // ignore
        }
    }
}

run();
