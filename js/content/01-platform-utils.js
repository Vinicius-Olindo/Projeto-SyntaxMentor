// SyntaxMentor content module: Platform, storage and badge utilities
// Loaded in manifest.json order.

// =============================================
// FUNÇÕES SEGURAS PARA MANIPULAÇÃO DE DOM (BUG 5)
// =============================================

/**
 * Obtém elemento com segurança (evita erro se não existir)
 * @param {string} id - ID do elemento
 * @returns {HTMLElement|null}
 */
function $(id) {
    return document.getElementById(id);
}

/**
 * Adiciona evento com segurança
 * @param {HTMLElement} element - Elemento alvo
 * @param {string} event - Nome do evento
 * @param {Function} callback - Função callback
 */
function safeAddEvent(element, event, callback) {
    if (element && element.addEventListener) {
        element.addEventListener(event, callback);
    }
}

/**
 * Define onclick com segurança
 * @param {HTMLElement} element - Elemento alvo
 * @param {Function} callback - Função callback
 */
function safeOnClick(element, callback) {
    if (element) {
        element.onclick = callback;
    }
}

/**
 * Remove todos os observers ativos (BUG 6)
 */
function limparTodosObservadores() {
    if (isCleaningUp) return;
    isCleaningUp = true;
    
    smLog('Limpando observers ativos...');
    
    // Desconectar observers de shadow DOM
    shadowObservers.forEach((observer, shadowRoot) => {
        try {
            observer.disconnect();
        } catch(e) {}
    });
    shadowObservers.clear();
    
    // Desconectar observer de iframe
    if (iframeObserver) {
        try {
            iframeObserver.disconnect();
        } catch(e) {}
        iframeObserver = null;
    }

    if (shadowDomObserver) {
        try {
            shadowDomObserver.disconnect();
        } catch(e) {}
        shadowDomObserver = null;
    }
    
    // Limpar array de observers
    activeObservers.forEach(observer => {
        try {
            observer.disconnect();
        } catch(e) {}
    });
    activeObservers = [];
    
    isCleaningUp = false;
    smLog('Observers limpos com sucesso');
}

/**
 * Registra um observer para gerenciamento
 * @param {MutationObserver} observer - Observer a ser registrado
 * @param {string} name - Nome do observer para debug
 */
function registrarObserver(observer, name) {
    if (!observer || activeObservers.includes(observer)) return;
    const originalDisconnect = observer.disconnect.bind(observer);
    observer.disconnect = () => {
        originalDisconnect();
        activeObservers = activeObservers.filter(item => item !== observer);
    };
    activeObservers.push(observer);
    smLog(`Observer registrado: ${name} (total: ${activeObservers.length})`);
}

// =============================================
// FUNÇÃO SEGURA PARA ENVIAR MENSAGENS
// =============================================

function enviarMensagemSegura(message, callback = null) {
    if (!isExtensaoAtiva()) {
        if (callback) callback({ success: false, error: 'Extension inactive' });
        return null;
    }

    try {
        if (callback) {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    callback({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    callback(response);
                }
            });
        } else {
            chrome.runtime.sendMessage(message).catch(() => {});
        }
    } catch (err) {
        if (callback) callback({ success: false, error: err.message });
    }
    return null;
}

async function verificarConexaoExtensao() {
    if (!isExtensaoAtiva()) return false;
    try {
        return await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
                resolve(!chrome.runtime.lastError && response?.success);
            });
        });
    } catch (e) {
        return false;
    }
}

// =============================================
// UTILITÁRIOS
// =============================================

function escapeHtml(texto) {
    if (!texto) return '';
    return texto
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function isExtensaoAtiva() {
    try {
        return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (e) {
        return false;
    }
}

function isElementoEditavel(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'TEXTAREA' ||
        (tag === 'INPUT' && ['text', 'search', 'url', 'email'].includes(el.type)) ||
        el.isContentEditable ||
        el.getAttribute?.('contenteditable') === 'true' ||
        el.getAttribute?.('role') === 'textbox';
}

function obterElementoEditavelDaSelecao() {
    const ativo = document.activeElement;
    if (isElementoEditavel(ativo)) return ativo;

    const sel = window.getSelection?.();
    let node = sel?.anchorNode || sel?.focusNode;
    if (!node) return null;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return null;

    const el = node.closest?.('textarea, input[type="text"], input[type="search"], input[type="url"], input[type="email"], [contenteditable="true"], [role="textbox"]');
    return isElementoEditavel(el) ? el : null;
}

function storageGetSeguro(chave, fallback) {
    if (!isExtensaoAtiva() || !isContextoPermitido() || !chrome.storage || !chrome.storage.local) {
        if (fallback) fallback({});
        return;
    }
    
    try {
        smStorageLocalGet(chave, (res, erro) => {
            if (erro) {
                if (fallback) fallback({});
                return;
            }
            if (fallback) fallback(res);
        });
    } catch (e) {
        if (fallback) fallback({});
    }
}

function storageSetSeguro(dados) {
    if (!isExtensaoAtiva()) return;
    try {
        smStorageLocalSet(dados, (erro) => {
            if (erro) smDebug('Erro no storage.set:', erro.message);
        });
    } catch (e) {}
}

function isModoLeitura() {
    if (smConfig.modoLeituraGlobal) return true;
    return (smConfig.modoLeituraSites || []).some(d => window.location.hostname.includes(d));
}

function atualizarBadgeBackground(total) {
    if (ultimoTotalEnviado === total) return;
    
    if (badgeDebounceTimeout) {
        clearTimeout(badgeDebounceTimeout);
    }
    
    badgeDebounceTimeout = setTimeout(() => {
        if (!isExtensaoAtiva()) return;
        
        enviarMensagemSegura({ action: 'updateBadge', totalErros: total });
        ultimoTotalEnviado = total;
        badgeDebounceTimeout = null;
    }, 150);
}

function resetarBadgeBackgroundImediato() {
    if (badgeDebounceTimeout) {
        clearTimeout(badgeDebounceTimeout);
        badgeDebounceTimeout = null;
    }
    
    if (!isExtensaoAtiva()) return;
    enviarMensagemSegura({ action: 'resetBadge' });
    ultimoTotalEnviado = null;
}

function resetarBadgeBackground() {
    resetarBadgeBackgroundImediato();
}

function atualizarVisibilidadeBolha() {
    const bubble = document.getElementById('syntax-mentor-bubble');
    if (!bubble) return;
    if (smConfig.autoHideBubble && usuarioDigitando && !painelAberto) {
        bubble.style.opacity = '0';
        bubble.style.pointerEvents = 'none';
    } else {
        bubble.style.opacity = estaCarregando ? '0.6' : '1';
        bubble.style.pointerEvents = 'auto';
    }
    bubble.style.transition = 'opacity 0.3s ease';
}
