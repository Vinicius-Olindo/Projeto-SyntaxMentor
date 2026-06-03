const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

function filePath(relativePath) {
    return path.join(rootDir, relativePath);
}

function read(relativePath) {
    return fs.readFileSync(filePath(relativePath), 'utf8');
}

function assertFileExists(relativePath) {
    assert.ok(fs.existsSync(filePath(relativePath)), `${relativePath} deve existir`);
}

function runNodeCheck(relativePath) {
    childProcess.execFileSync(process.execPath, ['--check', filePath(relativePath)], {
        cwd: rootDir,
        stdio: 'pipe'
    });
}

function listFiles(dir, extension) {
    const base = filePath(dir);
    const found = [];

    function walk(currentDir, relativeDir) {
        fs.readdirSync(currentDir, { withFileTypes: true }).forEach(entry => {
            const relativePath = path.join(relativeDir, entry.name);
            const fullPath = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                walk(fullPath, relativePath);
                return;
            }

            if (entry.isFile() && entry.name.endsWith(extension)) {
                found.push(relativePath.replace(/\\/g, '/'));
            }
        });
    }

    walk(base, dir);
    return found;
}

module.exports = {
    assert,
    filePath,
    read,
    assertFileExists,
    runNodeCheck,
    listFiles,
    rootDir
};
