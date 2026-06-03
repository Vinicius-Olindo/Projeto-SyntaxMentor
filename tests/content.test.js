const { assert, listFiles, read } = require('./setup');

module.exports = function contentTests() {
    const contentModules = listFiles('js/content', '.js').sort();
    const content = contentModules.map(read).join('\n');
    const backgroundModules = ['js/background.js', ...listFiles('js/background', '.js').sort()];
    const background = backgroundModules.map(read).join('\n');
    const popup = read('js/popup.js');
    const appScripts = listFiles('js', '.js');
    const css = listFiles('css', '.css').map(read).join('\n');

    assert.ok(contentModules.length >= 8, 'content deve estar dividido em modulos');
    assert.match(content, /function hostCorrespondeDominio/, 'content.js deve usar comparacao segura de dominio');
    assert.doesNotMatch(content, /host\.includes|currentHost\.includes/, 'content.js nao deve usar includes para dominio');
    assert.match(content, /action:\s*'checkGrammar'/, 'content deve pedir revisao gramatical ao background');
    assert.doesNotMatch(content, /api\.languagetool\.org\/v2\/check|SM_LANGUAGETOOL_API_URL/, 'content nao deve chamar o LanguageTool diretamente');
    assert.match(content, /let ultimaConsultaGrammarId = 0/, 'content deve rastrear a ultima consulta gramatical');
    assert.match(content, /requestId: opcoes\.requestId/, 'content deve enviar identificador da consulta ao background');
    assert.match(background, /const SM_LANGUAGETOOL_API_URL = 'https:\/\/api\.languagetool\.org\/v2\/check'/, 'background deve concentrar o endpoint principal de correcao');
    assert.ok(backgroundModules.length >= 6, 'background deve estar dividido por responsabilidade');
    assert.match(background, /importScripts\([\s\S]*background\/02-language-tool\.js/, 'background principal deve carregar modulos explicitamente');
    assert.match(background, /smStorageSessionGet\(\{ apiKey: '' \}/, 'background deve buscar a API Key mais recente da sessao pelo helper de storage');
    assert.match(background, /function responderCheckGrammar/, 'background deve isolar o fluxo de revisao gramatical');
    assert.match(background, /function montarParametrosLanguageTool/, 'background deve montar parametros do LanguageTool fora do listener');
    assert.doesNotMatch(background, /request\.apiKey/, 'background nao deve depender de API Key enviada pelo content');
    assert.doesNotMatch(background, /const fetchUrl/, 'listener do background nao deve conter implementacao inline antiga do LanguageTool');

    assert.match(content, /textContent:\s*original/, 'modal de correcao deve inserir texto original por DOM seguro');
    assert.match(content, /textContent:\s*sugestao/, 'modal de correcao deve inserir sugestao por DOM seguro');
    assert.match(content, /function renderizarPainelPrincipal/, 'painel principal deve ter renderizacao isolada');
    assert.match(content, /function renderizarPainelRevisaoPagina/, 'painel de revisao de pagina deve ter renderizacao isolada');
    assert.doesNotMatch(content, /painel\.innerHTML|tooltip\.innerHTML|toast\.innerHTML|dialog\.innerHTML|historicoContent\.innerHTML/, 'paineis e overlays dinamicos nao devem ser montados com innerHTML');
    assert.match(content, /const sugestaoSegura = escapeHtml\(sugestao\)/, 'correcao em contentEditable deve escapar sugestao');
    assert.match(content, /const erroEncontrado = smConfig\.modoAprendizado[\s\S]*removerErroGlobal\(original\)/, 'modo aprendizado deve guardar erro antes de remove-lo');
    assert.match(content, /formato: obterFormatoDesfazer/, 'desfazer deve guardar o formato do estado salvo');
    assert.match(content, /salvarEstadoParaDesfazer\(el, original, sugestao, htmlAntigo, html\)/, 'desfazer em contentEditable deve salvar HTML antes e depois');
    assert.match(content, /correcoes\.forEach\(\(\[o, s\]\) => aplicarCorrecao\(o, s, elementoGlobal, true\)\)/, 'correcao em lote deve pular confirmacoes individuais');
    assert.match(content, /function obterElementoEditavelDaSelecao/, 'revisao de selecao deve localizar o campo editavel real');
    assert.match(content, /elementoGlobal = elementoSelecao/, 'revisao de selecao nao deve manter elemento oculto removido como alvo');
    assert.match(content, /document\.visibilityState === 'visible'[\s\S]*observarShadowDOM\(\)/, 'content.js deve religar observers ao voltar para a aba');
    assert.doesNotMatch(content, /syntaxmentor-add-to-dictionary/, 'content.js nao deve aceitar evento publico para alterar dicionario persistente');
    assert.doesNotMatch(content, /js\/security\.js|js\\security\.js/, 'content.js nao deve injetar security.js como script externo na pagina');
    assert.doesNotMatch(content, /public-api\.js|carregarPublicAPI|window\.SyntaxMentor/, 'content.js nao deve injetar API publica na pagina');
    assert.match(content, /userWhitelistOverrides/, 'content.js deve reconhecer override manual de ativacao');
    assert.match(content, /!!res\.disabled \|\| listaTemDominio\(host, res\.blacklist\)/, 'content deve respeitar desativacao global ao carregar configuracao');
    assert.match(content, /hostCorrespondeDominio\(window\.location\.hostname, d\)/, 'modo leitura por site deve usar comparacao segura de dominio');
    assert.doesNotMatch(content, /window\.location\.hostname\.includes/, 'modo leitura nao deve usar includes para dominio');
    assert.match(content, /function obterUrlExternaSegura/, 'content.js deve validar URL externa antes de renderizar link');
    assert.match(content, /rel:\s*'noopener noreferrer'|rel="noopener noreferrer"/, 'links externos do content devem usar noopener noreferrer');
    assert.match(content, /function agendarProcessamentoOcioso/, 'grifos devem ter fallback para requestIdleCallback');
    assert.doesNotMatch(content, /requestIdleCallback\(processarChunk/, 'grifos nao devem chamar requestIdleCallback sem fallback');
    assert.match(content, /desativarModoFoco\(\);\s*timeoutFoco = setTimeout\(ativarModoFoco, 3000\)/, 'modo foco deve mostrar a bolha antes de esconder por inatividade');
    assert.doesNotMatch(content, /conquistasNotificadas|verificarConquistas|correcoesVoz|streakDias/, 'content nao deve manter gamificacao fora do fluxo principal');
    assert.match(content, /let shadowDomObserver/, 'observer principal de shadow DOM deve ser rastreado');
    assert.match(content, /activeObservers = activeObservers\.filter/, 'observers devem sair da lista ao desconectar');
    assert.doesNotMatch(content, /SM_SENTIMENTO|normalizarTokenSentimento|atualizarAnaliseSentimento|sm-tab-sentiment|sm-sentiment-content/, 'content nao deve manter a aba de sentimento fora do foco principal');
    assert.match(background, /userWhitelistOverrides/, 'background deve reconhecer override manual de ativacao');
    assert.match(background, /\['blacklist', 'disabled', 'modoWhitelist', 'whitelist', 'userBlacklistOverrides', 'userWhitelistOverrides'\]/, 'background deve considerar desativacao global ao checar bloqueio');
    assert.match(popup, /userWhitelistOverrides/, 'popup deve salvar override manual de ativacao');
    assert.match(popup, /function criarElemento/, 'popup deve criar itens dinamicos por DOM em vez de HTML em string');
    assert.doesNotMatch(popup, /btnCorrigirTudo|btnRevisarPagina|enviarAcaoParaAba/, 'popup nao deve manter referencias a botoes removidos');
    assert.doesNotMatch(popup, /innerHTML/, 'popup nao deve montar conteudo dinamico com innerHTML');

    const arquivosComConsoleCentralizado = new Set([
        'js/background/00-config.js',
        'js/content/00-state.js',
        'js/options-utils.js',
        'js/popup.js'
    ]);
    appScripts.forEach(file => {
        if (arquivosComConsoleCentralizado.has(file)) return;
        assert.doesNotMatch(read(file), /console\.(log|debug|warn|error)\(/, `${file} deve usar helpers smLog/smDebug/smWarn/smError`);
    });
    assert.match(background, /const smDebug = /, 'background deve centralizar debug');
    assert.match(content, /const smDebug = /, 'content deve centralizar debug');
    assert.match(popup, /const smDebug = /, 'popup deve centralizar debug');
    assert.doesNotMatch(css, /2\.6\.0|2\.7\.0|Fully Corrected|REDESENHADA/i, 'cabecalhos CSS nao devem manter versoes antigas ou rotulos temporarios');
};
