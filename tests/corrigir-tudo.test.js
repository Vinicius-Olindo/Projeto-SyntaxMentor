const vm = require('node:vm');
const { assert, read } = require('./setup');

function criarEvento(tipo, opcoes = {}) {
    return { type: tipo, ...opcoes };
}

function criarElementoBase(tagName, texto = '') {
    return {
        tagName,
        nodeType: 1,
        type: tagName === 'INPUT' ? 'text' : '',
        value: tagName === 'INPUT' || tagName === 'TEXTAREA' ? texto : undefined,
        selectionStart: 0,
        selectionEnd: 0,
        isContentEditable: false,
        _eventos: [],
        _inDocument: true,
        getAttribute(nome) {
            if (nome === 'contenteditable') return this.isContentEditable ? 'true' : null;
            if (nome === 'role') return null;
            return null;
        },
        closest() {
            return null;
        },
        contains(node) {
            return node === this;
        },
        querySelectorAll() {
            return [];
        },
        getRootNode() {
            return null;
        },
        getBoundingClientRect() {
            return { width: 200, height: 40 };
        },
        setSelectionRange(start, end) {
            this.selectionStart = start;
            this.selectionEnd = end;
        },
        dispatchEvent(evento) {
            this._eventos.push(evento.type);
            return true;
        }
    };
}

function criarCampoValor(tagName, texto) {
    const elemento = criarElementoBase(tagName, texto);
    elemento.selectionStart = texto.length;
    elemento.selectionEnd = texto.length;
    return elemento;
}

function criarContentEditable(texto) {
    const elemento = criarElementoBase('DIV');
    elemento.isContentEditable = true;
    elemento._texto = texto;
    Object.defineProperty(elemento, 'textContent', {
        get() { return this._texto; },
        set(valor) { this._texto = String(valor); }
    });
    Object.defineProperty(elemento, 'innerText', {
        get() { return this._texto; },
        set(valor) { this._texto = String(valor); }
    });
    Object.defineProperty(elemento, 'innerHTML', {
        get() { return this._texto; },
        set(valor) { this._texto = String(valor); }
    });
    return elemento;
}

function criarSandbox(candidatos = []) {
    const documento = {
        activeElement: null,
        documentElement: { contains: el => !!el && el._inDocument !== false },
        contains: el => !!el && el._inDocument !== false,
        querySelectorAll() {
            return candidatos;
        },
        getElementById() {
            return null;
        },
        createElement() {
            return criarElementoBase('DIV');
        },
        createTextNode(texto) {
            return { nodeType: 3, textContent: texto };
        },
        createTreeWalker(root) {
            const node = {
                parentElement: { closest: () => null },
                get textContent() { return root.textContent; },
                set textContent(valor) { root.textContent = valor; }
            };
            let lido = false;
            return {
                currentNode: null,
                nextNode() {
                    if (lido) return false;
                    lido = true;
                    this.currentNode = node;
                    return true;
                }
            };
        },
        body: { appendChild() {} },
        head: { appendChild() {} }
    };

    const sandbox = {
        console,
        document: documento,
        window: {
            location: { hostname: 'example.com', protocol: 'https:' },
            self: null,
            top: null,
            HTMLInputElement: function HTMLInputElement() {},
            HTMLTextAreaElement: function HTMLTextAreaElement() {},
            getSelection: () => null
        },
        chrome: null,
        Node: { TEXT_NODE: 3, ELEMENT_NODE: 1 },
        NodeFilter: { SHOW_TEXT: 4, FILTER_REJECT: 2, FILTER_SKIP: 3, FILTER_ACCEPT: 1 },
        Event: criarEvento,
        InputEvent: criarEvento,
        CompositionEvent: criarEvento,
        FocusEvent: criarEvento,
        URLSearchParams,
        setTimeout: () => 0,
        clearTimeout: () => {},
        requestAnimationFrame: callback => callback(),
        MutationObserver: function MutationObserver() {}
    };
    sandbox.window.self = sandbox.window;
    sandbox.window.top = sandbox.window;
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    [
        'js/content/00-state.js',
        'js/content/01-platform-utils.js',
        'js/content/02-editor-events.js',
        'js/content/06-corrections-stats.js'
    ].forEach(relativePath => {
        vm.runInContext(read(relativePath), sandbox, { filename: relativePath });
    });
    vm.runInContext(`
        atualizarInterface = function() {};
        mostrarFeedback = function() {};
        mostrarFeedbackInteligente = function() {};
        resetarBadgeBackground = function() {};
        resetarBadgeBackgroundImediato = function() {};
        processarFilaRequisicoes = function() {};
    `, sandbox);
    return sandbox;
}

function prepararErros(sandbox, erros) {
    sandbox.errosParaTeste = erros.map(([original, sugestao, offset = 0, texto = original]) => ({
        context: { text: texto, offset, length: original.length },
        replacements: [{ value: sugestao }]
    }));
    vm.runInContext('errosGlobais = errosParaTeste;', sandbox);
}

module.exports = function corrigirTudoTests() {
    const textarea = criarCampoValor('TEXTAREA', 'Ola mundo com extenção');
    let sandbox = criarSandbox([textarea]);
    sandbox.document.activeElement = textarea;
    prepararErros(sandbox, [['Ola', 'Ol\u00e1'], ['exten\u00e7\u00e3o', 'extens\u00e3o']]);
    sandbox.corrigirTudo();
    assert.equal(textarea.value, 'Ol\u00e1 mundo com extens\u00e3o', 'corrigir tudo deve aplicar em textarea');

    const input = criarCampoValor('INPUT', 'Ola');
    sandbox = criarSandbox([input]);
    sandbox.document.activeElement = input;
    prepararErros(sandbox, [['Ola', 'Ol\u00e1']]);
    sandbox.corrigirTudo();
    assert.equal(input.value, 'Ol\u00e1', 'corrigir tudo deve aplicar em input');

    const repetidos = criarCampoValor('TEXTAREA', 'Ola Ola extensao extensao nao nao');
    sandbox = criarSandbox([repetidos]);
    sandbox.document.activeElement = repetidos;
    prepararErros(sandbox, [
        ['Ola', 'Ol\u00e1', 0, repetidos.value],
        ['Ola', 'Ol\u00e1', 4, repetidos.value],
        ['extensao', 'extens\u00e3o', 8, repetidos.value],
        ['extensao', 'extens\u00e3o', 17, repetidos.value],
        ['nao', 'n\u00e3o', 26, repetidos.value],
        ['nao', 'n\u00e3o', 30, repetidos.value]
    ]);
    assert.equal(sandbox.extrairCorrecoesDosErros().length, 6, 'corrigir tudo deve preservar todas as ocorrencias repetidas antes de aplicar');
    sandbox.corrigirTudo();
    assert.equal(repetidos.value, 'Ol\u00e1 Ol\u00e1 extens\u00e3o extens\u00e3o n\u00e3o n\u00e3o', 'corrigir tudo deve aplicar em todas as ocorrencias repetidas');

    const contentEditable = criarContentEditable('Ola com progamas aberto');
    sandbox = criarSandbox([contentEditable]);
    sandbox.document.activeElement = contentEditable;
    prepararErros(sandbox, [['Ola', 'Ol\u00e1'], ['progamas', 'programas'], ['aberto', 'abertos']]);
    sandbox.corrigirTudo();
    assert.equal(contentEditable.textContent, 'Ol\u00e1 com programas abertos', 'corrigir tudo deve aplicar em contenteditable');

    const textoColado = criarCampoValor('TEXTAREA', 'Ola, estou escreveno uma extenção');
    sandbox = criarSandbox([textoColado]);
    sandbox.document.activeElement = textoColado;
    prepararErros(sandbox, [['Ola', 'Ol\u00e1'], ['escreveno', 'escrevendo'], ['exten\u00e7\u00e3o', 'extens\u00e3o']]);
    vm.runInContext('textoUltimaVerificacao = document.activeElement.value;', sandbox);
    sandbox.corrigirTudo();
    assert.equal(textoColado.value, 'Ol\u00e1, estou escrevendo uma extens\u00e3o', 'corrigir tudo deve aplicar no texto colado');

    const campoSemFoco = criarCampoValor('TEXTAREA', 'Ola depois que o painel abriu');
    const botaoPainel = criarElementoBase('BUTTON');
    sandbox = criarSandbox([campoSemFoco]);
    sandbox.document.activeElement = botaoPainel;
    sandbox.ultimoCampo = campoSemFoco;
    prepararErros(sandbox, [['Ola', 'Ol\u00e1']]);
    vm.runInContext('ultimoElementoEditavel = ultimoCampo; elementoGlobal = null;', sandbox);
    sandbox.corrigirTudo();
    assert.equal(campoSemFoco.value, 'Ol\u00e1 depois que o painel abriu', 'corrigir tudo deve usar o ultimo campo quando o painel roubar o foco');

    const campoEnviado = criarCampoValor('TEXTAREA', 'Ola para enviar');
    sandbox = criarSandbox([campoEnviado]);
    sandbox.campoEnviado = campoEnviado;
    prepararErros(sandbox, [['Ola', 'Ol\u00e1']]);
    vm.runInContext("elementoGlobal = campoEnviado; ultimoElementoEditavel = campoEnviado; textoUltimaVerificacao = 'Ola para enviar';", sandbox);
    campoEnviado.value = '';
    assert.equal(
        sandbox.limpezaAposEnvioConfirmado({ elemento: campoEnviado, textoAntes: 'Ola para enviar' }),
        true,
        'limpeza pos-envio deve detectar campo esvaziado'
    );
    assert.equal(vm.runInContext('errosGlobais.length', sandbox), 0, 'limpeza pos-envio deve remover erros antigos');

    const campoEnvioForcado = criarCampoValor('TEXTAREA', 'Ola ainda visivel');
    sandbox = criarSandbox([campoEnvioForcado]);
    sandbox.campoEnvioForcado = campoEnvioForcado;
    prepararErros(sandbox, [['Ola', 'Ol\u00e1']]);
    vm.runInContext("elementoGlobal = campoEnvioForcado; ultimoElementoEditavel = campoEnvioForcado; textoUltimaVerificacao = 'Ola ainda visivel';", sandbox);
    assert.equal(
        sandbox.limpezaAposEnvioConfirmado({ elemento: campoEnvioForcado, textoAntes: 'Ola ainda visivel' }, { forcar: true }),
        true,
        'clique claro de envio deve poder limpar imediatamente'
    );
    assert.equal(vm.runInContext('errosGlobais.length', sandbox), 0, 'limpeza forcada deve remover erros antigos');
};
