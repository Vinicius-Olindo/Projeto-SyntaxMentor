const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const output = path.join(distDir, `syntaxmentor-${manifest.version}.zip`);

const include = [
  'manifest.json',
  'popup.html',
  'options.html',
  'options-seguranca.html',
  'welcome.html',
  'privacy.html',
  'index.html',
  'css',
  'js',
  'icons',
  'assets',
  'store-assets/chrome-web-store'
];

const excludePatterns = [
  /(^|\/)\.git(\/|$)/,
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)dist(\/|$)/,
  /(^|\/)tests(\/|$)/,
  /(^|\/)docs(\/|$)/,
  /(^|\/)scripts(\/|$)/,
  /\.map$/,
  /\.zip$/
];

function shouldExclude(relativePath) {
  return excludePatterns.some((pattern) => pattern.test(relativePath.replace(/\\/g, '/')));
}

function collectFiles(item, files = []) {
  const fullPath = path.join(root, item);
  if (!fs.existsSync(fullPath)) return files;

  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    for (const child of fs.readdirSync(fullPath)) {
      collectFiles(path.join(item, child), files);
    }
    return files;
  }

  const relative = item.replace(/\\/g, '/');
  if (!shouldExclude(relative)) files.push(relative);
  return files;
}

fs.mkdirSync(distDir, { recursive: true });
if (fs.existsSync(output)) fs.unlinkSync(output);

const files = include.flatMap((item) => collectFiles(item));
if (!files.length) throw new Error('Nenhum arquivo encontrado para empacotar.');

const zipCmd = process.platform === 'win32' ? 'powershell.exe' : 'zip';

if (process.platform === 'win32') {
  const tempDir = path.join(distDir, 'syntaxmentor-package');
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });

  for (const file of files) {
    const dest = path.join(tempDir, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(path.join(root, file), dest);
  }

  childProcess.execFileSync(zipCmd, [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path ${JSON.stringify(path.join(tempDir, '*'))} -DestinationPath ${JSON.stringify(output)} -Force`
  ], { stdio: 'inherit' });
  fs.rmSync(tempDir, { recursive: true, force: true });
} else {
  childProcess.execFileSync(zipCmd, ['-q', '-r', output, ...files], {
    cwd: root,
    stdio: 'inherit'
  });
}

console.log(`Pacote gerado: ${path.relative(root, output)}`);
