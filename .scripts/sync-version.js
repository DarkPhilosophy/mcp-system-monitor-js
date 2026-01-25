const fs = require('fs');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(PROJECT_DIR, 'package.json');
const CHANGELOG_PATH = path.join(PROJECT_DIR, '.github', 'CHANGELOG.md');
const README_PATH = path.join(PROJECT_DIR, '.github', 'README.md');

/**
 * Extract bullet lines for a version section in CHANGELOG.md.
 * @param {string} markdown - Changelog contents.
 * @param {string} version - Version string to extract.
 * @returns {string[]} Bullet lines for the version section.
 */
function extractChangelogEntries(markdown, version) {
    const header = `## ${version}`;
    const start = markdown.indexOf(header);
    if (start === -1) {
        return [];
    }

    const afterHeader = markdown.slice(start + header.length);
    const nextHeaderIndex = afterHeader.search(/\n##\s+/);
    const section = nextHeaderIndex === -1 ? afterHeader : afterHeader.slice(0, nextHeaderIndex);
    const lines = section.split('\n');
    const entries = [];

    for (const line of lines) {
        if (!/^\s*[-*]/.test(line)) {
            continue;
        }
        entries.push(line.trim());
    }

    return entries;
}

try {
    const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
    const version = pkg.version;

    let readmeContent = fs.readFileSync(README_PATH, 'utf8');
    readmeContent = readmeContent.split('\n# Changelog')[0];
    const badgeRegex =
        /\[!\[Version [^\]]+\]\(https:\/\/img\.shields\.io\/badge\/Version-[^-]+-green\.svg\)\]\([^)]+\)/;
    const badge = `[![Version ${version}](https://img.shields.io/badge/Version-${version}-green.svg)](#)`;

    let newReadme = readmeContent;
    if (badgeRegex.test(newReadme)) {
        newReadme = newReadme.replace(badgeRegex, badge);
    }

    const changelogMd = fs.readFileSync(CHANGELOG_PATH, 'utf8');
    const entries = extractChangelogEntries(changelogMd, version);
    if (entries.length > 0) {
        const latestBlock = `<!-- LATEST-VERSION-START -->\n<details open>\n<summary><strong>Latest Update (v${version})</strong></summary>\n\n${entries.join('\n')}\n\n</details>\n<!-- LATEST-VERSION-END -->`;
        const latestRegex = /<!-- LATEST-VERSION-START -->[\s\S]*<!-- LATEST-VERSION-END -->/;
        if (latestRegex.test(newReadme)) {
            newReadme = newReadme.replace(latestRegex, latestBlock);
        }
    }

    fs.writeFileSync(README_PATH, newReadme);
    console.info('Version sync complete.');
} catch (error) {
    console.error('Error during version sync:', error.message);
    process.exit(1);
}
