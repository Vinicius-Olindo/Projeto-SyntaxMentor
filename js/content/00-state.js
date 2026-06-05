// SyntaxMentor content module: Global state and base config
// Loaded in manifest.json order.

// =============================================
// SyntaxMentor - content state module v2.8.0
// =============================================

// =============================================
// VARIÁVEIS GLOBAIS
// =============================================

let timeoutDigitacao = null;
let errosGlobais = [];
let dicCache = [];

function isSmDebugAtivo() {
    try {
        return localStorage.getItem('sm_debug') === 'true';
    } catch (e) {
        return false;
    }
}

const smLog = (...args) => { if (isSmDebugAtivo()) console.log('[SM]', ...args); };
const smDebug = (...args) => { if (isSmDebugAtivo()) console.debug('[SM]', ...args); };
const smWarn = (...args) => { if (isSmDebugAtivo()) console.warn('[SM]', ...args); };
const smError = (...args) => { if (isSmDebugAtivo()) console.error('[SM]', ...args); };
let elementoGlobal = null;
let ultimoElementoEditavel = null;
let painelAberto = false;
let indexSugestao = -1;
let bubblePosX = null;
let bubblePosY = null;

let currentFetchController = null;
let textoUltimaVerificacao = "";
let isDraggingBubble = false;
let estaCarregando = false;
let usuarioDigitando = false;

let contextoExtensaoValido = true;

let filaRequisicoes = [];
let processandoFila = false;
let ultimoTextoValido = '';
let ultimaConsultaGrammarId = 0;
let smAplicacaoGrifosId = 0;
let timeoutReverificacaoCorrecao = null;
let timeoutLimpezaEnvio = null;
let smCorrigindoEmLote = false;
let smIgnorandoInputInterno = false;
let smLimpandoRevisaoObsoleta = false;

let historicoDesfazer = [];
const MAX_HISTORICO_DESFAZER = 20;

function normalizarDominio(valor) {
    return String(valor || '')
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0];
}

function hostCorrespondeDominio(host, dominio) {
    const hostNormalizado = normalizarDominio(host);
    const dominioNormalizado = normalizarDominio(dominio);
    return !!dominioNormalizado && (
        hostNormalizado === dominioNormalizado ||
        hostNormalizado.endsWith(`.${dominioNormalizado}`)
    );
}

function listaTemDominio(host, lista) {
    return (lista || []).some(d => hostCorrespondeDominio(host, d));
}

const sitesSemGrifos = ['mail.google.com', 'linkedin.com', 'docs.google.com', 'notion.so', 'twitter.com', 'x.com'];
const isSiteRestrito = sitesSemGrifos.some(d => hostCorrespondeDominio(window.location.hostname, d));

let ignoradosTemporarios = [];
let isExtensaoMutando = false;
let smTimers = [];
let historicoCorrecoes = [];
let idiomaSugerido = false;

let modoFocoAtivo = false;
let timeoutFoco = null;

let iframeObserver = null;
let shadowDomObserver = null;
let processedIframes = new WeakSet();

let badgeDebounceTimeout = null;
let ultimoTotalEnviado = null;

// =============================================
// CONTROLE DE OBSERVADORES (BUG 6 CORRIGIDO)
// =============================================
let activeObservers = [];
let isCleaningUp = false;
let shadowObservers = new Map(); // Para rastrear observers por shadowRoot

// =============================================
// CONFIGURAÇÃO PADRÃO
// =============================================

let smConfig = {
    language: 'pt-BR',
    pickyMode: true,
    speed: 500,
    darkMode: false,
    blacklist: [],
    strictMode: false,
    disabled: false,
    toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's' },
    ignoreShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 'i' },
    corrigirTudoShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 's' },
    autoHideBubble: false,
    modoConfirmacao: false,
    modoLeituraGlobal: false,
    modoLeituraSites: [],
    modoWhitelist: false,
    whitelist: [],
    userWhitelistOverrides: [],
    smBubblePosition: null,
    modoFoco: false,
    modoAprendizado: false
};

function isContextoPermitido() {
    try {
        if (window.location.protocol === 'chrome:' || window.location.protocol === 'chrome-extension:') {
            return false;
        }
        if (window.self !== window.top) {
            try {
                const topOrigin = window.top.location.href;
                return true;
            } catch (e) {
                return false;
            }
        }
        return true;
    } catch (e) {
        return false;
    }
}
