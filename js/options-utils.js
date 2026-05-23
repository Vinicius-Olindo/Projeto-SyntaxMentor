// =============================================
// SyntaxMentor - options-utils.js v2.7.1
// Utilitários compartilhados entre as páginas de configuração
// =============================================

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

/**
 * Carrega o tema escuro do storage
 */
function carregarTema() {
    chrome.storage.local.get({ darkMode: false }, (res) => {
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
    chrome.storage.local.set({ [storageKey]: lista }, () => {
        if (chrome.runtime.lastError) {
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