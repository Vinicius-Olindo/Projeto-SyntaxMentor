// =============================================
// SyntaxMentor - options-utils.js v2.8.0
// Utilitários compartilhados entre as páginas de configuração
// =============================================

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

/**
 * Mostra notificação temporária na interface
 * @param {string} mensagem - Mensagem a ser exibida
 * @param {string} tipo - Tipo da mensagem (success, error, info)
 */
function mostrarNotificacao(mensagem, tipo) {
    const saveStatus = document.getElementById('save-status');
    if (!saveStatus) return;
    
    saveStatus.textContent = mensagem;
    saveStatus.style.opacity = '1';
    
    const cores = {
        success: '#28a745',
        error: '#e53e3e',
        info: '#6b7280',
        warning: '#f59e0b'
    };
    
    saveStatus.style.color = cores[tipo] || cores.info;
    
    const duracao = tipo === 'error' ? 4000 : tipo === 'success' ? 3000 : 2000;
    
    clearTimeout(saveStatus._timeout);
    saveStatus._timeout = setTimeout(() => {
        saveStatus.style.opacity = '0';
    }, duracao);
}

/**
 * Escapa caracteres HTML para evitar XSS
 * @param {string} texto - Texto a ser escapado
 * @returns {string}
 */
function escapeHtml(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

function normalizarDominio(valor) {
    const raw = String(valor || '').trim().toLowerCase();
    if (!raw) return '';

    try {
        const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
        return url.hostname.replace(/^www\./, '');
    } catch (e) {
        return raw
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .split('/')[0];
    }
}

function isValidDomain(dominio) {
    const normalizado = normalizarDominio(dominio);
    if (!normalizado || normalizado.length > 255) return false;
    if (normalizado === 'localhost') return true;
    return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(normalizado);
}

function isValidDictionaryWord(palavra) {
    const valor = String(palavra || '').trim();
    if (valor.length < 2 || valor.length > 60) return false;
    return /^[\p{L}\p{M}\p{N}'’.+#_-]+$/u.test(valor);
}

/**
 * Carrega o tema escuro do storage
 */
function carregarTema() {
    smStorageLocalGet({ darkMode: false }, (res) => {
        document.body.classList.toggle('dark-mode', res.darkMode);
    });
}

/**
 * Salva uma lista editável no storage
 * @param {Array} lista - Lista a ser salva
 * @param {string} storageKey - Chave do storage
 * @param {Function} callback - Callback opcional
 */
function salvarListaStorage(lista, storageKey, callback) {
    smStorageLocalSet({ [storageKey]: lista }, (erro) => {
        if (erro) {
            mostrarNotificacao('❌ Erro ao salvar', 'error');
        } else {
            if (callback) callback();
        }
    });
}

/**
 * Adiciona ouvinte de Enter em um input
 * @param {HTMLElement} input - Elemento input
 * @param {Function} callback - Função a ser chamada ao pressionar Enter
 */
function adicionarEnterListener(input, callback) {
    if (!input) return;
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            callback();
        }
    });
}
