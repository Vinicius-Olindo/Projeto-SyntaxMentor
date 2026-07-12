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

function temSugestao(matches, original, sugestao) {
    return matches.some(item => {
        const trecho = item.context.text.substr(item.context.offset, item.context.length);
        return trecho === original && item.replacements[0].value === sugestao;
    });
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
    const sugestoesBasicas = ortografiaLocal.map(item => item.replacements[0].value);
    ['Ol\u00e1', 'extens\u00e3o', 'mais'].forEach(sugestao => {
        assert.ok(sugestoesBasicas.includes(sugestao), `ortografia local pt-BR deve sugerir ${sugestao}`);
    });
    assert.equal(
        ortografiaLocal.find(item => item.replacements[0].value === 'Ol\u00e1')?.rule.confidence,
        'alta',
        'correcao direta deve ser marcada como alta confianca'
    );
    assert.equal(
        ortografiaLocal.find(item => item.replacements[0].value === 'mais')?.rule.confidence,
        'contextual',
        'correcao dependente de frase deve ser marcada como contextual'
    );

    const sugestaoLeve = pageReview.verificarOrtografiaPtBrLocal('a nivel de teste');
    assert.equal(
        sugestaoLeve.find(item => item.replacements[0].value === 'em n\u00edvel de')?.rule.confidence,
        'leve',
        'sugestao de estilo deve ser marcada como leve'
    );

    assert.equal(
        pageReview.verificarOrtografiaPtBrLocal('extensao', 'en-US').length,
        0,
        'ortografia local pt-BR nao deve atuar em outros idiomas'
    );

    const textoComMuitosErros = 'Ola, tudo bem? Estou escreveno esse texto apenas para fazer uma valida\u00e7ao de uma exten\u00e7\u00e3o que corrige erros ortograficos. A ideia e verificar se ela consegue indentificar palavras escritas de forma errada, acentos faltando, virgulas mal colocadas e frases meio confuzas. Ontem eu fui no mercado compra algums produto, mais acabei esquecendo o principal que era o arroz e o feijao. Minha mae falo que eu presisava presta mais aten\u00e7ao, porque sempre que eu saiu com pressa eu esque\u00e7o alguma coisa importante. Tambem percebi que meu computador esta ficando muito lento, talvez seja por causa de varios progamas aberto ao mesmo tempo. Eu tentei reinicia ele, mais nao adiantou muito. Acho que presiso limpa os arquivos inutil e atualisar os driver. Esse paragrafo contem varios erros propositalmente, como palavras sem acento, letras trocadas, falta de concordancia e pontua\u00e7ao estranha para testar se a feramenta vai conseguir corrigi tudo corretamente.';
    const revisaoLocalCompleta = pageReview.verificarOrtografiaPtBrLocal(textoComMuitosErros);
    const sugestoesLocais = revisaoLocalCompleta.map(item => item.replacements[0].value);
    [
        'Ol\u00e1',
        'escrevendo',
        'valida\u00e7\u00e3o',
        'extens\u00e3o',
        'ortogr\u00e1ficos',
        '\u00e9',
        'identificar',
        'v\u00edrgulas',
        'alguns',
        'produtos',
        'mas',
        'comprar',
        'feij\u00e3o',
        'm\u00e3e',
        'falou',
        'precisava',
        'prestar',
        'aten\u00e7\u00e3o',
        'saio',
        'est\u00e1',
        'v\u00e1rios',
        'programas',
        'abertos',
        'reiniciar',
        'limpar',
        'in\u00fateis',
        'atualizar',
        'drivers',
        'cont\u00e9m',
        'pontua\u00e7\u00e3o',
        'ferramenta',
        'corrigir'
    ].forEach(sugestao => {
        assert.ok(sugestoesLocais.includes(sugestao), `ortografia local deve sugerir ${sugestao}`);
    });
    assert.ok(revisaoLocalCompleta.length >= 36, 'ortografia local deve ampliar a cobertura do texto de teste');

    const sugestoesArquivoSingular = pageReview.verificarOrtografiaPtBrLocal('preciso limpar o arquivo in\u00fatil antes de atualizar o driver');
    assert.equal(
        temSugestao(sugestoesArquivoSingular, 'in\u00fatil', 'in\u00fateis'),
        false,
        'arquivo inutil no singular nao deve sugerir plural'
    );

    const sugestoesArquivosPlural = pageReview.verificarOrtografiaPtBrLocal('preciso limpar os arquivos inutil');
    assert.equal(
        temSugestao(sugestoesArquivosPlural, 'inutil', 'in\u00fateis'),
        true,
        'arquivos inutil no plural deve sugerir inuteis'
    );

    const sugestoesProgramaSingular = pageReview.verificarOrtografiaPtBrLocal('o programa aberto continua funcionando');
    assert.equal(
        temSugestao(sugestoesProgramaSingular, 'aberto', 'abertos'),
        false,
        'programa aberto no singular nao deve sugerir plural'
    );

    const sugestoesNoMercado = pageReview.verificarOrtografiaPtBrLocal('ontem eu fui no mercado com calma');
    assert.equal(
        temSugestao(sugestoesNoMercado, 'no', 'ao'),
        false,
        'fui no mercado deve ser aceito como variante de uso, nao erro'
    );

    const sugestoesMaisNaoInformal = pageReview.verificarOrtografiaPtBrLocal('eu quero mais nao');
    assert.equal(
        temSugestao(sugestoesMaisNaoInformal, 'mais', 'mas'),
        false,
        'mais nao em uso informal nao deve ser corrigido automaticamente'
    );

    const sugestoesMasNaoContraste = pageReview.verificarOrtografiaPtBrLocal('Eu tentei reinicia ele, mais nao adiantou');
    assert.equal(
        temSugestao(sugestoesMasNaoContraste, 'mais', 'mas'),
        true,
        'mais nao depois de virgula deve sugerir mas quando indicar contraste'
    );

    const duplicados = pageReview.deduplicarMatchesRevisao([
        { offset: 0, length: 3, context: { text: 'Ola', offset: 0, length: 3 }, replacements: [{ value: 'Ol\u00e1' }] },
        { offset: 0, length: 3, context: { text: 'Ola', offset: 0, length: 3 }, replacements: [{ value: 'Ol\u00e1' }] }
    ]);
    assert.equal(duplicados.length, 1, 'deduplicacao deve remover sugestoes repetidas no mesmo trecho');

    const repetidosDistantes = pageReview.deduplicarMatchesRevisao([
        { offset: 0, length: 3, context: { text: 'Ola e Ola', offset: 0, length: 3 }, replacements: [{ value: 'Ol\u00e1' }] },
        { offset: 6, length: 3, context: { text: 'Ola e Ola', offset: 6, length: 3 }, replacements: [{ value: 'Ol\u00e1' }] }
    ]);
    assert.equal(repetidosDistantes.length, 2, 'deduplicacao deve preservar ocorrencias em trechos diferentes');

    const repetidosLocais = pageReview.verificarOrtografiaPtBrLocal('Ola Ola extensao extensao nao nao');
    const ocorrenciasLocais = repetidosLocais.filter(item => ['Ola', 'extensao', 'nao'].includes(
        item.context.text.substr(item.context.offset, item.context.length)
    ));
    assert.equal(ocorrenciasLocais.length, 6, 'revisao local deve mostrar cada ocorrencia repetida do mesmo erro');
    assert.equal(
        new Set(ocorrenciasLocais.map(item => `${item.context.offset}:${item.context.length}`)).size,
        6,
        'ocorrencias repetidas devem manter offsets diferentes'
    );

    const filtroConfianca = carregarScripts(['js/content/03-page-review.js', 'js/content/05-grammar-highlights.js'], {
        window: {},
        smConfig: { language: 'pt-BR', pickyMode: false },
        dicCache: [],
        ignoradosTemporarios: []
    });
    assert.equal(
        temSugestao(filtroConfianca.montarErrosRevisao('a nivel de teste', []), 'a nivel de', 'em n\u00edvel de'),
        false,
        'sugestao leve nao deve aparecer fora do modo rigoroso'
    );
    filtroConfianca.smConfig.pickyMode = true;
    assert.equal(
        temSugestao(filtroConfianca.montarErrosRevisao('a nivel de teste', []), 'a nivel de', 'em n\u00edvel de'),
        true,
        'sugestao leve deve aparecer no modo rigoroso'
    );
    const pluralExternoPoucoConfiavel = [{
        rule: { id: 'AGREEMENT_TEST', category: { name: 'Agreement' } },
        message: 'Possivel problema de concordancia no plural',
        offset: 17,
        length: 6,
        context: { text: 'limpar o arquivo inutil', offset: 17, length: 6 },
        replacements: [{ value: 'inuteis' }]
    }];
    assert.equal(
        temSugestao(filtroConfianca.montarErrosRevisao('limpar o arquivo inutil', pluralExternoPoucoConfiavel), 'inutil', 'inuteis'),
        false,
        'sugestao externa de plural pouco confiavel nao deve gerar loop de correcao'
    );

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

    let envioSemConsentimento = false;
    const grammarSemConsentimento = carregarScript('js/content/05-grammar-highlights.js', {
        window: {},
        smConfig: { languageToolConsent: false },
        enviarMensagemSegura() {
            envioSemConsentimento = true;
        }
    });
    const respostaLocal = await grammarSemConsentimento.consultarGramaticaNoBackground('Texto privado', {
        language: 'pt-BR',
        pickyMode: true,
        modoVoz: false,
        requestId: 43
    });
    assert.equal(respostaLocal.matches.length, 0, 'sem consentimento deve retornar lista externa vazia');
    assert.equal(envioSemConsentimento, false, 'sem consentimento nao deve enviar texto ao background');

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

    const campoSenha = {
        nodeType: 1,
        tagName: 'INPUT',
        type: 'password',
        isContentEditable: false,
        getAttribute(nome) { return nome === 'type' ? 'password' : null; },
        closest() { return null; }
    };
    const campoCpf = {
        nodeType: 1,
        tagName: 'TEXTAREA',
        isContentEditable: false,
        getAttribute(nome) { return nome === 'placeholder' ? 'Digite seu CPF' : null; },
        closest() { return null; },
        ownerDocument: {}
    };
    assert.equal(leitura.isElementoEditavel(campoSenha), false, 'campo de senha nao deve ser revisado');
    assert.equal(leitura.isElementoEditavel(campoCpf), false, 'campo com sinal de documento sensivel nao deve ser revisado');

    const params = background.montarParametrosLanguageTool({
        text: 'Ola mundo',
        language: 'pt-BR',
        pickyMode: true,
        modoVoz: true
    });
    assert.equal(params.level, 'picky', 'picky mode deve virar parametro do LanguageTool');
    assert.equal(params.disabledCategories, 'TYPOS', 'modo voz deve ajustar categorias do LanguageTool');
};
