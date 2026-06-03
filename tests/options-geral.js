const { assert, read } = require('./setup');

module.exports = function optionsGeralTests() {
    const utils = read('js/options-utils.js');
    const geral = [
        'js/options-geral.js',
        'js/options/geral/00-state.js',
        'js/options/geral/01-status.js',
        'js/options/geral/02-editable-lists.js',
        'js/options/geral/03-shortcuts.js',
        'js/options/geral/04-backup.js',
        'js/options/geral/05-settings-events.js',
        'js/options/geral/06-bootstrap.js'
    ].map(read).join('\n');
    const seguranca = read('js/options-seguranca.js');

    assert.match(utils, /function normalizarDominio/, 'options-utils.js deve normalizar dominios');
    assert.match(utils, /function isValidDomain/, 'options-utils.js deve validar dominios');
    assert.match(utils, /function isValidDictionaryWord/, 'options-utils.js deve validar palavras do dicionario');
    assert.match(utils, /smStorageLocalSet/, 'options-utils.js deve salvar via helper compartilhado de storage');

    assert.match(geral, /normalizarDominio\(blacklistInput\.value\)/, 'blacklist deve normalizar entrada');
    assert.match(geral, /isValidDomain\(domain\)/, 'blacklist deve rejeitar dominio invalido');
    assert.match(geral, /isValidDictionaryWord\(word\)/, 'dicionario deve rejeitar palavra invalida');
    assert.match(geral, /\.filter\(isValidDictionaryWord\)/, 'importacao deve filtrar palavras invalidas');
    assert.match(geral, /\.filter\(isValidDomain\)/, 'importacao deve filtrar dominios invalidos');

    assert.doesNotMatch(seguranca, /apiUrl|api-url|normalizarApiUrl/, 'pagina de seguranca nao deve expor URL de API customizada');
    assert.match(seguranca, /isValidDomain\(domain\)/, 'whitelist/modo leitura devem validar dominios');
    assert.match(seguranca, /smCriarElemento/, 'listas da seguranca devem usar helper DOM');
    assert.doesNotMatch(seguranca, /innerHTML/, 'listas da seguranca nao devem montar itens dinamicos com innerHTML');
};
