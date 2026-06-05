const vm = require('node:vm');
const { assert, read } = require('./setup');

function carregarScript(relativePath, extras = {}) {
    const sandbox = {
        console,
        setTimeout,
        clearTimeout,
        URLSearchParams,
        ...extras
    };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(read(relativePath), sandbox, { filename: relativePath });
    return sandbox;
}

function carregarScripts(relativePaths, extras = {}) {
    const sandbox = {
        console,
        setTimeout,
        clearTimeout,
        URLSearchParams,
        ...extras
    };
    sandbox.globalThis = sandbox;
    vm.createContext(sandbox);
    relativePaths.forEach(relativePath => {
        vm.runInContext(read(relativePath), sandbox, { filename: relativePath });
    });
    return sandbox;
}

module.exports = async function behaviorTests() {
    const pageReview = carregarScript('js/content/03-page-review.js');
    const pontuacao = pageReview.verificarPontuacaoComum('Ola ,mundo');
    assert.equal(pontuacao.length, 2, 'pontuacao local deve detectar espaco antes da virgula e falta de espaco depois');
    assert.equal(
        pontuacao[0].context.text.substr(pontuacao[0].context.offset, pontuacao[0].context.length),
        ' ,',
        'espaco antes da pontuacao deve incluir o sinal para permitir substituicao segura'
    );
    assert.equal(pontuacao[0].replacements[0].value, ',', 'espaco antes da pontuacao deve ser removivel');

    const ortografiaLocal = pageReview.verificarOrtografiaPtBrLocal('Ola, a entensao precisa ficar mas preciso.');
    assert.equal(
        JSON.stringify(ortografiaLocal.map(item => item.replacements[0].value)),
        JSON.stringify(['Olá', 'extensão', 'mais']),
        'ortografia local pt-BR deve cobrir correcoes de alta confianca'
    );

    assert.equal(
        pageReview.verificarOrtografiaPtBrLocal('extensao', 'en-US').length,
        0,
        'ortografia local pt-BR nao deve atuar em outros idiomas'
    );

    const duplicados = pageReview.deduplicarMatchesRevisao([
        { offset: 0, length: 3, context: { text: 'Ola', offset: 0, length: 3 }, replacements: [{ value: 'Olá' }] },
        { offset: 0, length: 3, context: { text: 'Ola', offset: 0, length: 3 }, replacements: [{ value: 'Olá' }] }
    ]);
    assert.equal(duplicados.length, 1, 'deduplicacao deve remover sugestoes repetidas no mesmo trecho');

    const repetidosDistantes = pageReview.deduplicarMatchesRevisao([
        { offset: 0, length: 3, context: { text: 'Ola e Ola', offset: 0, length: 3 }, replacements: [{ value: 'Olá' }] },
        { offset: 6, length: 3, context: { text: 'Ola e Ola', offset: 6, length: 3 }, replacements: [{ value: 'Olá' }] }
    ]);
    assert.equal(repetidosDistantes.length, 2, 'deduplicacao deve preservar ocorrencias em trechos diferentes');

    const corrections = carregarScript('js/content/06-corrections-stats.js');
    assert.equal(
        'Ola , mundo'.replace(corrections.criarRegexCorrecaoTexto(' ,'), ','),
        'Ola, mundo',
        'correcao de pontuacao deve funcionar sem limite de palavra'
    );
    assert.equal(
        'valor'.replace(corrections.criarRegexCorrecaoTexto('lor'), 'x'),
        'valor',
        'correcao de palavra nao deve trocar trechos dentro de outra palavra'
    );

    let mensagemEnviada = null;
    const grammar = carregarScript('js/content/05-grammar-highlights.js', {
        window: {},
        enviarMensagemSegura(payload, callback) {
            mensagemEnviada = payload;
            callback({ success: true, data: { matches: [{ rule: { id: 'TEST' } }] } });
        }
    });

    const resposta = await grammar.consultarGramaticaNoBackground('Texto de teste', {
        language: 'pt-BR',
        pickyMode: true,
        modoVoz: false,
        requestId: 42
    });

    assert.equal(resposta.matches.length, 1, 'consulta gramatical deve retornar os matches recebidos do background');
    assert.equal(mensagemEnviada.action, 'checkGrammar', 'consulta gramatical deve usar a acao checkGrammar');
    assert.equal(mensagemEnviada.requestId, 42, 'consulta gramatical deve carregar o identificador da requisicao');
    assert.equal(Object.hasOwn(mensagemEnviada, 'apiKey'), false, 'content nao deve enviar API Key ao background');

    const background = carregarScripts([
        'js/shared/storage.js',
        'js/background/00-config.js',
        'js/background/01-sites-storage.js',
        'js/background/02-language-tool.js'
    ]);

    assert.equal(background.hostCorrespondeDominio('mail.google.com', 'google.com'), true, 'subdominio deve bater com dominio base');
    assert.equal(background.hostCorrespondeDominio('evilgoogle.com', 'google.com'), false, 'dominio parecido nao deve ser tratado como subdominio');
    assert.equal(background.isSiteBloqueado('docs.google.com', {
        blacklist: ['google.com'],
        whitelist: [],
        modoWhitelist: false,
        userBlacklistOverrides: [],
        userWhitelistOverrides: ['docs.google.com'],
        disabled: false
    }), false, 'override manual de ativacao deve vencer blacklist');
    assert.equal(background.isSiteBloqueado('example.com', {
        blacklist: [],
        whitelist: [],
        modoWhitelist: false,
        userBlacklistOverrides: [],
        userWhitelistOverrides: [],
        disabled: true
    }), true, 'desativacao global deve bloquear sites sem override');

    const windowLeitura = {
        location: { hostname: 'evilgoogle.com', protocol: 'https:' }
    };
    windowLeitura.self = windowLeitura;
    windowLeitura.top = windowLeitura;
    const leitura = carregarScripts(['js/content/00-state.js', 'js/content/01-platform-utils.js'], {
        window: windowLeitura,
        document: {},
        chrome: { runtime: { id: 'syntaxmentor-test' } }
    });
    vm.runInContext("smConfig.modoLeituraSites = ['google.com'];", leitura);
    assert.equal(leitura.isModoLeitura(), false, 'modo leitura por site nao deve casar dominio parecido');
    vm.runInContext("window.location.hostname = 'docs.google.com';", leitura);
    assert.equal(leitura.isModoLeitura(), true, 'modo leitura por site deve aceitar subdominio real');

    const params = background.montarParametrosLanguageTool({
        text: 'Ola mundo',
        language: 'pt-BR',
        pickyMode: true,
        modoVoz: true
    });
    assert.equal(params.level, 'picky', 'picky mode deve virar parametro do LanguageTool');
    assert.equal(params.disabledCategories, 'TYPOS', 'modo voz deve ajustar categorias do LanguageTool');
};
