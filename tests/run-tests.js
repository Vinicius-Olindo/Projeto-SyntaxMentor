const fs = require('node:fs');
const path = require('node:path');
const {
    assert,
    assertFileExists,
    listFiles,
    read,
    runNodeCheck,
    rootDir
} = require('./setup');

const args = new Set(process.argv.slice(2));
const tests = [
    require('./content.test.js'),
    require('./options-geral.js'),
    require('./behavior.test.js')
];

function collectScriptRefs(htmlFile) {
    const html = read(htmlFile);
    return [...html.matchAll(/<script\s+[^>]*src=["']([^"']+)["']/gi)].map(match => match[1]);
}

function collectCssRefs(htmlFile) {
    const html = read(htmlFile);
    return [...html.matchAll(/<link\s+[^>]*href=["']([^"']+\.css)["']/gi)].map(match => match[1]);
}

function collectCssImportRefs(cssFile) {
    const css = read(cssFile);
    return [...css.matchAll(/@import\s+(?:url\()?["']?([^"')]+\.css)["']?\)?/gi)].map(match => match[1]);
}

function collectImportScriptsRefs(jsFile) {
    const js = read(jsFile);
    return [...js.matchAll(/importScripts\(([\s\S]*?)\);/g)]
        .flatMap(match => [...match[1].matchAll(/["']([^"']+\.js)["']/g)].map(script => script[1]));
}

function readJson(relativePath) {
    return JSON.parse(read(relativePath).replace(/^\uFEFF/, ''));
}

function manifestResourceTests() {
    const manifest = readJson('manifest.json');
    assert.equal(manifest.manifest_version, 3, 'manifest deve ser MV3');
    assert.equal(manifest.version, readJson('package.json').version, 'versao do manifest e package deve bater');

    Object.values(manifest.icons || {}).forEach(assertFileExists);
    assertFileExists(manifest.background.service_worker);
    assertFileExists(manifest.action.default_popup);
    assertFileExists(manifest.options_page);

    (manifest.content_scripts || []).forEach(entry => {
        (entry.js || []).forEach(assertFileExists);
        (entry.css || []).forEach(assertFileExists);
    });

    (manifest.web_accessible_resources || []).forEach(entry => {
        (entry.resources || []).forEach(assertFileExists);
    });

    const webAccessible = (manifest.web_accessible_resources || [])
        .flatMap(entry => entry.resources || [])
        .sort();
    assert.deepEqual(webAccessible, [], 'web_accessible_resources nao deve expor scripts para paginas externas');

    assert.ok(!(manifest.permissions || []).includes('scripting'), 'manifest nao deve pedir scripting sem uso');
    assert.ok(!(manifest.permissions || []).includes('alarms'), 'manifest nao deve pedir alarms sem badge temporario');
    assert.deepEqual(manifest.host_permissions || [], ['https://api.languagetool.org/*'], 'host_permissions deve ficar limitado ao motor de correcao');

    const backgroundDir = path.posix.dirname(manifest.background.service_worker);
    collectImportScriptsRefs(manifest.background.service_worker).forEach(importPath => {
        assertFileExists(path.posix.normalize(path.posix.join(backgroundDir, importPath)));
    });
}

function htmlReferenceTests() {
    const htmlFiles = fs.readdirSync(rootDir).filter(name => name.endsWith('.html'));
    htmlFiles.forEach(htmlFile => {
        collectScriptRefs(htmlFile).forEach(assertFileExists);
        collectCssRefs(htmlFile).forEach(assertFileExists);
    });
}

function cssReferenceTests() {
    listFiles('css', '.css').forEach(cssFile => {
        collectCssImportRefs(cssFile).forEach(importPath => {
            const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(cssFile), importPath));
            assertFileExists(resolved);
        });
    });
}

function syntaxTests() {
    [...listFiles('js', '.js'), ...listFiles('tests', '.js')]
        .forEach(runNodeCheck);
}

async function runAll() {
    syntaxTests();
    manifestResourceTests();
    htmlReferenceTests();
    cssReferenceTests();
    for (const test of tests) {
        await test();
    }
}

async function main() {
    await runAll();
    if (args.has('--coverage')) {
        console.log('Coverage: validacoes estaticas executadas; sem instrumentacao de cobertura.');
    }
    console.log('Todos os testes passaram.');
}

if (args.has('--watch')) {
    console.log('Modo watch simples ativo. Pressione Ctrl+C para sair.');
    const watched = new Set([...listFiles('js', '.js'), ...listFiles('tests', '.js'), 'manifest.json', 'package.json']);
    watched.forEach(relativePath => {
        fs.watch(path.join(rootDir, relativePath), { persistent: true }, async () => {
            try {
                await runAll();
                console.log(`[${new Date().toLocaleTimeString()}] Testes passaram.`);
            } catch (error) {
                console.error(error.stack || error.message);
            }
        });
    });
}

main().catch(error => {
    console.error(error.stack || error.message);
    process.exit(1);
});
