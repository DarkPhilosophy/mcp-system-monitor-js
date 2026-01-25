const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');
const README_PATH = path.join(PROJECT_DIR, '.github', 'README.md');
const PACKAGE_JSON_PATH = path.join(PROJECT_DIR, 'package.json');
const NPM_PACKAGE = '@darkphilosophy/system-monitor';
const NPM_URL = `https://registry.npmjs.org/${NPM_PACKAGE}`;
const NPM_PAGE = `https://www.npmjs.com/package/${NPM_PACKAGE}`;

console.log('Fetching published version from npm registry...');

let githubVersion;
try {
    const pkg = require(PACKAGE_JSON_PATH);
    githubVersion = pkg.version;
    console.log(`📦 GitHub version: ${githubVersion}`);
} catch (error) {
    console.error('❌ Error reading package.json:', error.message);
    process.exit(1);
}

https
    .get(NPM_URL, res => {
        let json = '';

        res.on('data', chunk => {
            json += chunk;
        });

        res.on('end', () => {
            try {
                if (res.statusCode !== 200) {
                    console.warn(`⚠️  npm registry returned HTTP ${res.statusCode}`);
                    process.exit(0);
                }

                const data = JSON.parse(json);
                const publishedVersion = data['dist-tags']?.latest;

                if (!publishedVersion) {
                    console.warn('⚠️  Could not find npm dist-tags.latest');
                    process.exit(0);
                }

                console.log(`✅ Found published npm version: ${publishedVersion}`);
                updateReadme(githubVersion, publishedVersion);
            } catch (error) {
                console.error('❌ Error parsing npm registry data:', error.message);
                process.exit(0);
            }
        });
    })
    .on('error', error => {
        console.error('❌ Error fetching npm registry:', error.message);
        process.exit(0);
    });

/**
 * Update README badges for GitHub vs npm version status.
 *
 * @param {string} githubVersionValue - Version from package.json
 * @param {string} publishedVersion - Version from npm registry
 */
function updateReadme(githubVersionValue, publishedVersion) {
    try {
        const readmeContent = fs.readFileSync(README_PATH, 'utf8');

        const isSynced = githubVersionValue === publishedVersion;
        const statusColor = isSynced ? 'brightgreen' : 'yellow';
        const statusLabel = isSynced ? 'Synced' : 'Pending';

        const statusBadge = `[![Status: ${statusLabel}](https://img.shields.io/badge/Status-${statusLabel}-${statusColor})](${NPM_PAGE})`;
        const githubBadge = `![GitHub](https://img.shields.io/badge/GitHub-v${githubVersionValue}-blue)`;
        const npmBadge = `![npm](https://img.shields.io/badge/npm-v${publishedVersion}-green)`;
        const markdownBlock = `<!-- NPM-VERSION-START -->\n${statusBadge} ${githubBadge} ${npmBadge}\n<!-- NPM-VERSION-END -->`;

        const regex = /<!-- NPM-VERSION-START -->.*?<!-- NPM-VERSION-END -->/s;

        if (regex.test(readmeContent)) {
            const newContent = readmeContent.replace(regex, markdownBlock);
            fs.writeFileSync(README_PATH, newContent);
            console.log('✅ Updated npm version badges in README.md');
        } else {
            const newContent = `${readmeContent}\n\n${markdownBlock}\n`;
            fs.writeFileSync(README_PATH, newContent);
            console.log('✅ Added npm version badges to README.md');
        }
    } catch (error) {
        console.error('❌ Error updating README:', error.message);
        process.exit(1);
    }
}
