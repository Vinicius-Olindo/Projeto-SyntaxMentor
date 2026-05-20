// =============================================
<<<<<<< HEAD
// SyntaxMentor - content.js v2.9.0 Elite
// Shadow DOM + Digisac + Fila Inteligente + Correção Persistente
// Ctrl+Z + Revisão de Página + Modo Aprendizado + Toggle Site
// Tratamento de Erro Robusto em Todas as Mensagens
=======
// SyntaxMentor - content.js v2.7.1 Elite
>>>>>>> b82253680f0931746507b5a68f72b664a9daa9f7
// =============================================

// =============================================
// VARIÁVEIS GLOBAIS
// =============================================

let timeoutDigitacao = null;
let errosGlobais = [];
let dicCache = []; // cache do dicionario pessoal — atualizado via storage.onChanged

// Helper de log — so exibe quando sm_debug=true no localStorage
const smLog = (...args) => { if (localStorage.getItem('sm_debug') === 'true') smLog('[SM]', ...args); };
let elementoGlobal = null;
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

let historicoDesfazer = [];
const MAX_HISTORICO_DESFAZER = 20;

const sitesSemGrifos = ['mail.google.com', 'linkedin.com', 'docs.google.com', 'notion.so', 'twitter.com', 'x.com'];
const isSiteRestrito = sitesSemGrifos.some(d => window.location.hostname.includes(d));

let ignoradosTemporarios = [];
let isExtensaoMutando = false; // flag para suprimir MutationObserver durante operacoes internas
let smTimers = []; // todos os timeouts/intervals para cleanup garantido
let historicoCorrecoes = [];
let idiomaSugerido = false;
let conquistasNotificadas = {};

let erroMaisComumTemp = {};

let modoFocoAtivo = false;
let timeoutFoco = null;

// =============================================
// OBSERVAÇÃO DE IFRAMES (OTIMIZADA)
// =============================================

let iframeObserver = null;
let processedIframes = new WeakSet();

// =============================================
// CONFIGURAÇÃO PADRÃO
// =============================================

let smConfig = {
    language: 'pt-BR',
    pickyMode: true,
    speed: 500,
    darkMode: false,
    blacklist: [],
    apiUrl: '',
    apiKey: '',
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
    erroMaisComum: {},
    modoFoco: false,
    modoAprendizado: false
};

// Carregar TTS se disponível
let smTTS = null;
try {
    // Tentar carregar o módulo TTS
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('js/text-to-speech.js');
    script.onload = () => {
        console.log('✅ TTS carregado');
    };
    document.head.appendChild(script);
} catch(e) {
    console.debug('TTS não disponível');
}

// =============================================
// FUNÇÃO SEGURA PARA ENVIAR MENSAGENS (ROBUSTA)
// =============================================

/**
 * Envia mensagem para o background script com tratamento de erro robusto
 * @param {Object} message - Mensagem a ser enviada
 * @param {Function} callback - Callback opcional
 * @returns {Promise|null}
 */
function enviarMensagemSegura(message, callback = null) {
    if (!isExtensaoAtiva()) {
        console.debug('Extensão não está ativa, mensagem ignorada:', message.action);
        if (callback) callback({ success: false, error: 'Extension inactive' });
        return null;
    }

    try {
        if (callback) {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    console.debug(`Erro ao enviar mensagem ${message.action}:`, chrome.runtime.lastError.message);
                    callback({ success: false, error: chrome.runtime.lastError.message });
                } else {
                    callback(response);
                }
            });
        } else {
            chrome.runtime.sendMessage(message).catch((err) => {
                console.debug(`Erro ao enviar mensagem ${message.action}:`, err.message);
            });
        }
    } catch (err) {
        console.debug(`Exceção ao enviar mensagem ${message.action}:`, err.message);
        if (callback) callback({ success: false, error: err.message });
    }

    return null;
}

/**
 * Verifica se a extensão está respondiva
 * @returns {Promise<boolean>}
 */
async function verificarConexaoExtensao() {
    if (!isExtensaoAtiva()) return false;

    try {
        return await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
                if (chrome.runtime.lastError) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    } catch (e) {
        return false;
    }
}

// =============================================
// TEXT-TO-SPEECH
// =============================================
// smTTS é inicializado em text-to-speech.js

// =============================================
// UTILITÁRIOS
// =============================================

/**
 * Mostra feedback flutuante com duração automática baseada no conteúdo
 * @param {string} msg - Mensagem a ser exibida
 * @param {string} tipo - success, error, info, warning
 * @param {number} duracaoMs - Duração opcional (se não informada, calcula automaticamente)
 */
function mostrarFeedback(msg, tipo, duracaoMs = null) {
    // Remove feedbacks anteriores
    document.querySelectorAll('.sm-feedback-flutuante').forEach(el => el.remove());
    
    const feedback = document.createElement('div');
    feedback.textContent = msg;
    feedback.className = 'sm-feedback-flutuante';
    
    const cores = {
        success: '#28a745',
        error: '#e53e3e',
        info: '#6b7280',
        warning: '#f59e0b'
    };
    
    feedback.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        background: ${cores[tipo] || cores.info};
        color: #fff;
        padding: 12px 18px;
        border-radius: 8px;
        font: 600 14px 'Segoe UI', sans-serif;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        pointer-events: none;
        max-width: 350px;
        word-wrap: break-word;
        line-height: 1.4;
    `;
    
    document.body.appendChild(feedback);
    
    // Adiciona animação se não existir
    if (!document.querySelector('#sm-feedback-style')) {
        const style = document.createElement('style');
        style.id = 'sm-feedback-style';
        style.textContent = `
            @keyframes sm-feedback-fadeout {
                0% { opacity: 1; transform: translateX(0); }
                70% { opacity: 1; transform: translateX(0); }
                100% { opacity: 0; transform: translateX(20px); }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Calcula duração: mínimo 2 segundos, máximo 8 segundos
    // Base: 1 segundo para cada 20 caracteres + 1.5 segundos fixos
    let duracao = duracaoMs;
    if (!duracao) {
        duracao = Math.min(8000, Math.max(2000, msg.length * 50 + 1500));
    }
    
    // Aplica animação
    feedback.style.animation = `sm-feedback-fadeout ${duracao / 1000}s forwards`;
    
    // Timeout para remover do DOM
    setTimeout(() => {
        if (feedback.parentNode) feedback.remove();
    }, duracao);
}

/**
 * Verifica se a extensão ainda está ativa
 * @returns {boolean}
 */
function isExtensaoAtiva() {
    try {
        return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (e) {
        return false;
    }
}

/**
 * Obtém dados do storage com tratamento de erro
 * @param {string|Object} chave - Chave ou objeto com chaves
 * @param {Function} fallback - Função de callback
 */
function storageGetSeguro(chave, fallback) {
    if (!isExtensaoAtiva()) {
        fallback({});
        return;
    }

    try {
        chrome.storage.local.get(chave, (res) => {
            if (chrome.runtime.lastError) {
                console.debug('Erro no storage.get:', chrome.runtime.lastError.message);
                fallback({});
                return;
            }
            fallback(res);
        });
    } catch (e) {
        console.debug('Exceção no storage.get:', e);
        fallback({});
    }
}

/**
 * Salva dados no storage com tratamento de erro
 * @param {Object} dados - Dados a serem salvos
 */
function storageSetSeguro(dados) {
    if (!isExtensaoAtiva()) return;

    try {
        chrome.storage.local.set(dados, () => {
            if (chrome.runtime.lastError) {
                console.debug('Erro no storage.set:', chrome.runtime.lastError.message);
            }
        });
    } catch (e) {
        console.debug('Exceção no storage.set:', e);
    }
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
 * Mostra feedback flutuante na página
 * @param {string} msg - Mensagem a ser exibida
 * @param {string} tipo - Tipo da mensagem (success, error, info)
 */
function mostrarFeedback(msg, tipo) {
    document.querySelectorAll('.sm-feedback-flutuante').forEach(el => el.remove());

    const f = document.createElement('div');
    f.textContent = msg;
    f.className = 'sm-feedback-flutuante';

    const cores = {
        success: '#28a745',
        error: '#e53e3e',
        info: '#6b7280',
        warning: '#f59e0b'
    };

    f.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 2147483647;
        background: ${cores[tipo] || cores.info};
        color: #fff;
        padding: 10px 20px;
        border-radius: 8px;
        font: 600 14px 'Segoe UI', sans-serif;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        pointer-events: none;
        animation: sm-feedback-fadeout 2.2s forwards;
    `;

    document.body.appendChild(f);

    if (!document.querySelector('#sm-feedback-style')) {
        const style = document.createElement('style');
        style.id = 'sm-feedback-style';
        style.textContent = `
            @keyframes sm-feedback-fadeout {
                0% { opacity: 1; transform: translateX(0); }
                70% { opacity: 1; transform: translateX(0); }
                100% { opacity: 0; transform: translateX(20px); }
            }
        `;
        document.head.appendChild(style);
    }

    setTimeout(() => {
        if (f.parentNode) f.remove();
    }, 2200);
}

/**
 * Verifica se está em modo leitura para o site atual
 * @returns {boolean}
 */
function isModoLeitura() {
    if (smConfig.modoLeituraGlobal) return true;
    return (smConfig.modoLeituraSites || []).some(d => window.location.hostname.includes(d));
}

/**
 * Atualiza o badge no background
 * @param {number} total - Total de erros
 */
function atualizarBadgeBackground(total) {
    enviarMensagemSegura({ action: 'updateBadge', totalErros: total });
}

/**
 * Reseta o badge no background
 */
function resetarBadgeBackground() {
    enviarMensagemSegura({ action: 'resetBadge' });
}

/**
 * Atualiza a visibilidade da bolha flutuante
 */
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

// =============================================
// SISTEMA DE DESFAZER (Ctrl+Z)
// =============================================

/**
 * Salva o estado atual para permitir desfazer
 * @param {HTMLElement} elemento - Elemento que está sendo editado
 * @param {string} textoOriginal - Texto original antes da correção
 * @param {string} textoNovo - Texto após a correção
 */
function salvarEstadoParaDesfazer(elemento, textoOriginal, textoNovo) {
    if (!elemento) return;

    historicoDesfazer.push({
        elemento: elemento,
        textoAnterior: textoOriginal,
        textoNovo: textoNovo,
        timestamp: Date.now()
    });

    if (historicoDesfazer.length > MAX_HISTORICO_DESFAZER) {
        historicoDesfazer.shift();
    }
}

/**
 * Desfaz a última correção realizada
 * @returns {boolean}
 */
function desfazerUltimaCorrecao() {
    if (historicoDesfazer.length === 0) {
        mostrarFeedback('📭 Nada para desfazer', 'info');
        return false;
    }

    const ultima = historicoDesfazer.pop();
    const el = ultima.elemento;

    if (!el || !document.contains(el)) {
        mostrarFeedback('⚠️ Elemento não está mais disponível', 'info');
        return false;
    }

    const escAnterior = ultima.textoNovo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        const valorAntigo = el.value;
        el.value = el.value.replace(new RegExp(`(?<![\\p{L}])${escAnterior}(?![\\p{L}])`, 'gu'), ultima.textoAnterior);

        if (el.value !== valorAntigo) {
            dispararEventosNativos(el);
            requestAnimationFrame(() => {
                if (el.value !== valorAntigo) dispararEventosNativos(el);
            });
        }
    } else if (el.isContentEditable) {
        let html = el.innerHTML;
        const htmlAntigo = html;

        html = html.replace(new RegExp(`(?<!<[^>]*)(?<![\\p{L}])${escAnterior}(?![\\p{L}])(?![^<]*>)`, 'gu'), ultima.textoAnterior);

        if (html !== htmlAntigo) {
            el.innerHTML = html;
        }

        atualizarElementoComEventos(el);
        setTimeout(() => atualizarElementoComEventos(el), 100);
    }

    mostrarFeedback('↩ Correção desfeita!', 'info');
    return true;
}

// =============================================
// MODO APRENDIZADO
// =============================================

/**
 * Mostra explicação da regra gramatical
 * @param {string} original - Palavra original com erro
 * @param {string} sugestao - Sugestão de correção
 * @param {string} mensagem - Mensagem explicativa
 */
function mostrarExplicacaoRegra(original, sugestao, mensagem, erroObj) {
    if (!smConfig.modoAprendizado || !mensagem || mensagem.length < 10) return;

    const categoria = erroObj?.rule?.category?.name || '';
    const urls = erroObj?.rule?.urls || [];
    const linkRef = urls.length > 0 ? urls[0].value : null;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.4); z-index: 2147483646;
        display: flex; align-items: center; justify-content: center;
        font-family: 'Segoe UI', system-ui, sans-serif;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: ${smConfig.darkMode ? '#1a1a1a' : 'white'};
        color: ${smConfig.darkMode ? '#e0e0e0' : 'inherit'};
        border-radius: 16px; padding: 28px; max-width: 480px; width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;

    const mensagemLimpa = escapeHtml(mensagem);
    const catBadge = categoria ? `<span style="display:inline-block;background:#ede9fe;color:#5b21b6;font-size:11px;font-weight:500;padding:2px 8px;border-radius:4px;margin-bottom:12px">${escapeHtml(categoria)}</span>` : '';
    const linkHtml = linkRef ? `<a href="${escapeHtml(linkRef)}" target="_blank" style="font-size:12px;color:#6f42c1;text-decoration:none">📖 Saiba mais</a>` : '';

    dialog.innerHTML = `
        <div style="text-align:center;margin-bottom:16px;">
            <div style="font-size:40px;margin-bottom:8px;">📚</div>
            <h3 style="margin:0 0 6px;font-size:18px;">Por que corrigir?</h3>
            ${catBadge}
        </div>
        <div style="background:${smConfig.darkMode ? '#2a2a2a' : '#f8f9fa'};border-radius:12px;padding:16px;margin-bottom:16px;text-align:center;">
            <span style="color:#e53e3e;text-decoration:line-through;font-size:18px;font-weight:600;">${escapeHtml(original)}</span>
            <span style="margin:0 10px;color:#9ca3af;">→</span>
            <span style="color:#28a745;font-size:18px;font-weight:600;">${escapeHtml(sugestao)}</span>
        </div>
        <div style="background:${smConfig.darkMode ? '#3b2e1a' : '#fef3c7'};border-radius:10px;padding:14px;margin-bottom:16px;">
            <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:${smConfig.darkMode ? '#fcd34d' : '#92400e'};">💡 ${mensagemLimpa}</p>
            ${sugestao ? `<p style="margin:0;font-size:12px;color:${smConfig.darkMode ? '#a3a3a3' : '#6b7280'}">✏️ Exemplo: "<em>${escapeHtml(sugestao)}</em>"</p>` : ''}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
            ${linkHtml}
            <button class="sm-dlg-cancel" style="background:#f3f4f6;border:1px solid #d1d5db;color:#374151;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;margin-left:auto">Entendi ✓</button>
        </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const fechar = () => overlay.remove();
    dialog.querySelector('.sm-dlg-cancel')?.addEventListener('click', fechar);
    overlay.addEventListener('click', e => { if (e.target === overlay) fechar(); });
    setTimeout(fechar, 12000);
}

// =============================================
// CONFIRMAÇÃO E EVENTOS
// =============================================

/**
 * Solicita confirmação antes de corrigir
 * @param {string} original - Palavra original
 * @param {string} sugestao - Sugestão de correção
 * @param {Function} callback - Função callback com a decisão do usuário
 */
function confirmarCorrecao(original, sugestao, callback) {
    if (!smConfig.modoConfirmacao && !isModoLeitura()) {
        callback(true);
        return;
    }

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 2147483646;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Segoe UI', system-ui, sans-serif;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 420px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;

    if (smConfig.darkMode) {
        dialog.style.background = '#1a1a1a';
        dialog.style.color = '#e0e0e0';
    }

    dialog.innerHTML = `
        <h3 style="margin:0 0 12px;font-size:16px;">Confirmar Correção</h3>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
            Corrigir <strong style="color:#e53e3e;text-decoration:line-through;">${original}</strong> 
            para <strong style="color:#28a745;">${sugestao}</strong>?
        </p>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="sm-dlg-cancel">Não</button>
            <button class="sm-dlg-confirm">Sim, corrigir</button>
        </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const btnCancel = dialog.querySelector('.sm-dlg-cancel');
    const btnConfirm = dialog.querySelector('.sm-dlg-confirm');

    btnCancel.style.cssText = 'background:#f3f4f6;border:1px solid #d1d5db;color:#374151;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';
    btnConfirm.style.cssText = 'background:linear-gradient(135deg,#6f42c1,#8b5cf6);border:none;color:white;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';

    btnConfirm.onclick = () => {
        overlay.remove();
        callback(true);
        storageGetSeguro({ totalAceitas: 0, estatisticasPorSite: {} }, (res) => {
            storageSetSeguro({ totalAceitas: (res.totalAceitas || 0) + 1 });
            const host = window.location.hostname;
            const porSite = res.estatisticasPorSite || {};
            if (!porSite[host]) porSite[host] = { erros: {}, corrigidas: 0, aceitas: 0, recusadas: 0 };
            porSite[host].aceitas = (porSite[host].aceitas || 0) + 1;
            storageSetSeguro({ estatisticasPorSite: porSite });
        });
    };

    btnCancel.onclick = () => {
        overlay.remove();
        callback(false);
        storageGetSeguro({ totalRecusadas: 0, estatisticasPorSite: {} }, (res) => {
            storageSetSeguro({ totalRecusadas: (res.totalRecusadas || 0) + 1 });
            const host = window.location.hostname;
            const porSite = res.estatisticasPorSite || {};
            if (!porSite[host]) porSite[host] = { erros: {}, corrigidas: 0, aceitas: 0, recusadas: 0 };
            porSite[host].recusadas = (porSite[host].recusadas || 0) + 1;
            storageSetSeguro({ estatisticasPorSite: porSite });
        });
    };

    overlay.onclick = (e) => {
        if (e.target === overlay) {
            overlay.remove();
            callback(false);
        }
    };
}

/**
 * Dispara eventos nativos em inputs para frameworks detectarem mudanças
 * @param {HTMLElement} elemento - Elemento input/textarea
 */
function dispararEventosNativos(elemento) {
    if (!elemento) return;

    const start = elemento.selectionStart;
    const end = elemento.selectionEnd;
    const valor = elemento.value;

    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set ||
                        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;

    if (nativeSetter) {
        try {
            nativeSetter.call(elemento, valor);
        } catch (e) {
            elemento.value = valor;
        }
    }

    try {
        elemento.setSelectionRange(start, end);
    } catch (e) { console.debug('SyntaxMentor: setSelectionRange nao suportado', e.message); }

    const eventos = [
        new Event('input', { bubbles: true }),
        new Event('change', { bubbles: true }),
        new InputEvent('input', { bubbles: true, inputType: 'insertText', data: valor }),
        new CompositionEvent('compositionend', { bubbles: true, data: valor }),
        new FocusEvent('blur', { bubbles: true }),
        new FocusEvent('focus', { bubbles: true })
    ];

    eventos.forEach(evt => {
        try {
            elemento.dispatchEvent(evt);
        } catch (e) {}
    });

    if (elemento._valueTracker) {
        try {
            elemento._valueTracker.setValue(valor);
        } catch (e) {}
    }
}

/**
 * Atualiza elemento contenteditable com eventos
 * @param {HTMLElement} elemento - Elemento contenteditable
 */
function atualizarElementoComEventos(elemento) {
    if (!elemento) return;

    if (elemento.isContentEditable || elemento.getAttribute?.('contenteditable') === 'true') {
        const eventos = [
            new Event('input', { bubbles: true }),
            new Event('change', { bubbles: true }),
            new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText' }),
            new InputEvent('input', { bubbles: true, inputType: 'insertText' }),
            new CompositionEvent('compositionend', { bubbles: true }),
            new FocusEvent('blur', { bubbles: true }),
            new FocusEvent('focus', { bubbles: true })
        ];

        eventos.forEach(evt => {
            try {
                elemento.dispatchEvent(evt);
            } catch (e) {}
        });

        elemento.focus();
        setTimeout(() => {
            elemento.blur();
            elemento.focus();
        }, 50);
        return;
    }

    if (elemento.tagName === 'INPUT' || elemento.tagName === 'TEXTAREA') {
        dispararEventosNativos(elemento);
    }
}

// =============================================
// CORREÇÃO DE PONTUAÇÃO
// =============================================

/**
 * Processa e ajusta matches de pontuação
 * @param {Array} matches - Matches de erro da API
 * @returns {Array}
 */
function processarPontuacao(matches) {
    if (!matches || matches.length === 0) return matches;

    return matches.map(match => {
        const novoMatch = { ...match };
        const original = match.context.text.substr(match.context.offset, match.context.length);
        const palavraLimpa = original.replace(/^[.,;:!?¿¡"''()\[\]{}…\-—–\s]+/, '').replace(/[.,;:!?¿¡"''()\[\]{}…\-—–\s]+$/, '');

        if (palavraLimpa !== original && palavraLimpa.length > 0) {
            const pontuacaoInicio = original.indexOf(palavraLimpa);
            const novoOffset = match.context.offset + pontuacaoInicio;
            novoMatch.offset = (match.offset || 0) + pontuacaoInicio; // sincronizar offset principal
            novoMatch.length = palavraLimpa.length;                   // sincronizar length principal
            novoMatch.context = {
                ...match.context,
                offset: novoOffset,
                length: palavraLimpa.length
            };
        }

        return novoMatch;
    });
}

/**
 * Verifica erros comuns de pontuação
 * @param {string} texto - Texto a ser verificado
 * @returns {Array}
 */
function verificarPontuacaoComum(texto) {
    const errosPontuacao = [];

    const regras = [
        // Espaco antes de pontuacao (exceto reticencias)
        { regex: /\s+(?=[.,;:](?!\.{2}))/g, msg: 'Espaço desnecessário antes da pontuação', replace: '' },
        // Ponto duplo que nao seja reticencias (...) nem URLs (http://)
        { regex: /(?<!\.)\.{2}(?!\.)/g, msg: 'Pontuação duplicada. Use apenas um ponto ou reticencias (...).',  replace: '.' },
        { regex: /,([a-zA-Zà-úÀ-Ú])/g, msg: 'Falta um espaço após a vírgula', replace: (m, p1) => ', ' + p1 },
        { regex: /([!?])([a-zA-Zà-úÀ-Ú])/g, msg: 'Falta um espaço após o sinal', replace: (m, p1, p2) => p1 + ' ' + p2 }
    ];

    regras.forEach(regra => {
        // Usar exec para capturar posicao exata de CADA ocorrencia (nao so a primeira)
        const re = new RegExp(regra.regex.source, regra.regex.flags.includes('g') ? regra.regex.flags : regra.regex.flags + 'g');
        let match;
        while ((match = re.exec(texto)) !== null) {
            const pos = match.index;
            const len = match[0].length;
            const corrigido = typeof regra.replace === 'function' ? regra.replace(match[0], ...match.slice(1)) : regra.replace;
            errosPontuacao.push({
                context: { text: texto, offset: pos, length: len },
                message: regra.msg,
                replacements: [{ value: corrigido }],
                rule: { id: 'LOCAL_PUNCTUATION', category: { name: 'Pontuação' } }
            });
            // Evitar loop infinito em match de comprimento zero
            if (len === 0) re.lastIndex++;
        }
    });

    return errosPontuacao;
}

// =============================================
// REVISÃO DE PÁGINA INTEIRA
// =============================================

/**
 * Extrai todos os textos da página
 * @returns {Array}
 */
function extrairTextosDaPagina() {
    const textos = [];
    const elementos = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, span, div, article, section, blockquote, pre, code');

    elementos.forEach(el => {
        if (el.offsetParent === null && el.tagName !== 'BODY') return;

        const texto = el.innerText?.trim();
        if (!texto || texto.length < 10) return;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return;
        if (el.closest('#syntax-mentor-painel') || el.closest('#syntax-mentor-bubble')) return;

        textos.push({ elemento: el, texto: texto });
    });

    return textos;
}

/**
 * Revisa a página inteira em busca de erros
 */
async function revisarPaginaInteira() {
    mostrarFeedback('🔍 Analisando página inteira...', 'info');

    const textos = extrairTextosDaPagina();

    if (textos.length === 0) {
        mostrarFeedback('📭 Nenhum texto encontrado na página', 'info');
        return;
    }

    const textoCompleto = textos.map(t => t.texto).join('\n\n');

    if (textoCompleto.length < 10) {
        mostrarFeedback('📭 Texto muito curto para revisar', 'info');
        return;
    }

    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    div.textContent = textoCompleto;
    document.body.appendChild(div);

    textoUltimaVerificacao = textoCompleto;
    elementoGlobal = div;

    try {
        await verificarTexto(textoCompleto, div);
        document.body.removeChild(div);

        if (errosGlobais.length > 0) {
            exibirPainelRevisaoPagina(errosGlobais, textos);
        } else {
            mostrarFeedback('✅ Nenhum erro encontrado na página!', 'success');
        }
    } catch (err) {
        document.body.removeChild(div);
        mostrarFeedback('⚠️ Erro ao revisar página', 'error');
    }
}

/**
 * Exibe painel de revisão da página
 * @param {Array} erros - Lista de erros encontrados
 * @param {Array} textosOriginais - Textos originais da página
 */
function exibirPainelRevisaoPagina(erros, textosOriginais) {
    painelAberto = true;
    indexSugestao = -1;

    let painel = document.getElementById('syntax-mentor-painel');
    if (!painel) {
        painel = document.createElement('div');
        painel.id = 'syntax-mentor-painel';
        document.body.appendChild(painel);
    }

    if (smConfig.darkMode) {
        painel.classList.add('sm-dark');
    } else {
        painel.classList.remove('sm-dark');
    }

    const mapa = {};
    let total = 0;

    erros.forEach(e => {
        const o = e.context.text.substr(e.context.offset, e.context.length);
        if (!o.trim()) return;

        if (!mapa[o]) {
            mapa[o] = {
                s: e.replacements[0]?.value || '',
                c: 0,
                msg: e.message
            };
        }
        mapa[o].c++;
        total++;
    });

    let html = `
        <div id="syntax-mentor-header">
            <span>🔍 Revisão da Página</span>
            <button id="btn-fechar-painel">✕</button>
        </div>
        <div id="syntax-mentor-content">
            <div class="body-cards">
    `;

    if (Object.keys(mapa).length === 0) {
        html += '<div style="text-align:center;padding:20px;color:#888;">✅ Nenhum erro encontrado!</div>';
    } else {
        html += `<p style="font-size:11px;color:#888;margin-bottom:12px;">📄 Encontrados ${total} erros em ${textosOriginais.length} blocos de texto</p>`;

        Object.entries(mapa).forEach(([o, info]) => {
            const contexto = textosOriginais.find(t => t.texto.includes(o));
            const preview = contexto ? contexto.texto.substring(
                Math.max(0, contexto.texto.indexOf(o) - 30),
                Math.min(contexto.texto.length, contexto.texto.indexOf(o) + o.length + 30)
            ) : '';

            html += `
                <div class="erro-card">
                    <p class="erro-msg" title="${escapeHtml(info.msg)}">Erro: <strong>${escapeHtml(o)}</strong></p>
                    ${preview ? `<p style="font-size:10px;color:#9ca3af;margin:4px 0;font-style:italic;">...${escapeHtml(preview).replace(escapeHtml(o), '<span style="color:#e53e3e;text-decoration:underline;">' + escapeHtml(o) + '</span>')}...</p>` : ''}
                    <div class="sugestao-container">
                        <span class="palavra-original">${o}</span>
                        <span class="seta">→</span>
                        <div class="botoes-acao">
                            <button class="btn-fix-mini" data-o="${o}" data-s="${info.s}">${info.s || '[Remover]'}</button>
                            <button class="btn-ignorar-sessao" data-o="${o}">↩</button>
                            <button class="btn-ignorar" data-o="${o}">+</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `
            </div>
            <div class="footer-actions">
                <button id="btn-corrigir-tudo">✨ Corrigir Tudo (${total})</button>
                <button id="btn-ignorar-tudo">Ignorar Tudo</button>
            </div>
            <div style="text-align:center;font-size:10px;color:#9ca3af;margin-top:8px;">
                ⚠️ As correções serão aplicadas no texto original da página
            </div>
        </div>
    `;

    painel.innerHTML = html;
    tornarArrastavelPainel(painel, document.getElementById('syntax-mentor-header'));

    document.getElementById('btn-fechar-painel').onclick = fecharPainel;

    document.getElementById('btn-corrigir-tudo')?.addEventListener('click', () => {
        const correcoes = {};
        erros.forEach(e => {
            const o = e.context.text.substr(e.context.offset, e.context.length);
            const s = e.replacements[0]?.value || '';
            if (o && s) correcoes[o] = s;
        });

        let totalAplicadas = 0;

        textosOriginais.forEach(({ elemento, texto }) => {
            let novoTexto = texto;

            Object.entries(correcoes).forEach(([original, sugestao]) => {
                const esc = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`(?<![\\p{L}])${esc}(?![\\p{L}])`, 'gu');
                const antes = novoTexto;
                novoTexto = novoTexto.replace(regex, sugestao);
                if (novoTexto !== antes) totalAplicadas++;
            });

            if (novoTexto !== texto) {
                elemento.innerText = novoTexto;
                elemento.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        errosGlobais = [];
        atualizarInterface();
        mostrarFeedback(`✅ ${totalAplicadas} correções aplicadas na página!`, 'success');
    });

    document.getElementById('btn-ignorar-tudo').onclick = () => {
        errosGlobais = [];
        atualizarInterface();
    };

    painel.querySelectorAll('.btn-fix-mini').forEach(b => {
        b.onclick = () => {
            const o = b.dataset.o;
            const s = b.dataset.s;

            textosOriginais.forEach(({ elemento, texto }) => {
                if (texto.includes(o)) {
                    const esc = o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(?<![\\p{L}])${esc}(?![\\p{L}])`, 'gu');
                    const novoTexto = texto.replace(regex, s);

                    if (novoTexto !== texto) {
                        elemento.innerText = novoTexto;
                        elemento.dispatchEvent(new Event('input', { bubbles: true }));
                    }
                }
            });

            removerErroGlobal(o);
            mostrarFeedback(`✅ "${o}" → "${s}" corrigido!`, 'success');
        };
    });

    painel.querySelectorAll('.btn-ignorar-sessao').forEach(b => {
        b.onclick = () => ignorarTemporariamente(b.dataset.o);
    });

    painel.querySelectorAll('.btn-ignorar').forEach(b => {
        b.onclick = async () => {
            const o = b.dataset.o;

            if (isExtensaoAtiva()) {
                storageGetSeguro(['dicionario_pessoal'], (res) => {
                    const dic = res.dicionario_pessoal || [];
                    if (!dic.includes(o)) {
                        dic.push(o);
                        storageSetSeguro({ dicionario_pessoal: dic });
                    }
                });
            }

            removerErroGlobal(o);
            mostrarFeedback(`"${o}" → dicionário`, 'success');
        };
    });
}

// =============================================
// MODO FOCO
// =============================================

function ativarModoFoco() {
    const bubble = document.getElementById('syntax-mentor-bubble');
    if (!bubble) return;

    bubble.style.opacity = '0.2';
    bubble.style.transition = 'opacity 0.5s ease';
    bubble.style.pointerEvents = 'none';
}

function desativarModoFoco() {
    const bubble = document.getElementById('syntax-mentor-bubble');
    if (!bubble) return;

    bubble.style.opacity = '1';
    bubble.style.pointerEvents = 'auto';
}

function iniciarTimeoutFoco() {
    if (!modoFocoAtivo) return;

    clearTimeout(timeoutFoco);
    ativarModoFoco();

    timeoutFoco = setTimeout(() => {
        ativarModoFoco();
    }, 3000);
}

document.addEventListener('mousemove', (e) => {
    if (!modoFocoAtivo) return;

    const bubble = document.getElementById('syntax-mentor-bubble');
    if (!bubble) return;

    const bubbleRect = bubble.getBoundingClientRect();
    const distancia = Math.sqrt(
        Math.pow(e.clientX - (bubbleRect.left + bubbleRect.width / 2), 2) +
        Math.pow(e.clientY - (bubbleRect.top + bubbleRect.height / 2), 2)
    );

    if (distancia < 200) {
        desativarModoFoco();
        clearTimeout(timeoutFoco);
        timeoutFoco = setTimeout(() => {
            ativarModoFoco();
        }, 3000);
    }
});

// =============================================
// SHADOW DOM E IFRAMES (DIGISAC)
// =============================================

/**
 * Observa o Shadow DOM em busca de campos editáveis
 * @param {HTMLElement} elemento - Elemento raiz para observar
 */
function observarElemento(elemento) {
    if (!elemento || elemento.nodeType !== 1) return;

    if (elemento.shadowRoot) {
        adicionarListenersNoShadowRoot(elemento.shadowRoot);
    }

    elemento.querySelectorAll('*').forEach(el => {
        if (el.shadowRoot) {
            adicionarListenersNoShadowRoot(el.shadowRoot);
        }
    });
}

/**
 * Adiciona listeners no Shadow Root
 * @param {ShadowRoot} shadowRoot - Shadow Root a ser observado
 */
function adicionarListenersNoShadowRoot(shadowRoot) {
    if (!shadowRoot) return;

    const campos = shadowRoot.querySelectorAll('textarea, input[type="text"], input[type="search"], [contenteditable="true"], [role="textbox"]');

    campos.forEach(campo => {
        campo.removeEventListener('input', shadowInputHandler);
        campo.addEventListener('input', shadowInputHandler);
    });

    const shadowObserver = new MutationObserver(() => adicionarListenersNoShadowRoot(shadowRoot));
    shadowObserver.observe(shadowRoot, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['contenteditable']
    });
}

/**
 * Handler para inputs dentro de Shadow DOM
 * @param {Event} e - Evento de input
 */
function shadowInputHandler(e) {
    if (smConfig.disabled) return;

    let el = e.target;
    if (el.closest?.('[contenteditable="true"]')) {
        el = el.closest('[contenteditable="true"]');
    }

    const valido = el.tagName === 'TEXTAREA' ||
                   el.isContentEditable ||
                   el.getAttribute?.('contenteditable') === 'true' ||
                   el.getAttribute?.('role') === 'textbox' ||
                   (el.tagName === 'INPUT' && ['text', 'search', 'url', 'email'].includes(el.type));

    if (!valido) return;
    if (el.tagName === 'INPUT' && smConfig.strictMode) return;

    usuarioDigitando = true;
    atualizarVisibilidadeBolha();

    if (currentFetchController) {
        currentFetchController.abort();
        currentFetchController = null;
    }

    filaRequisicoes = [];
    processandoFila = false;

    clearTimeout(timeoutDigitacao);
    timeoutDigitacao = setTimeout(() => {
        usuarioDigitando = false;

        const texto = (el.value || el.textContent || el.innerText || '').trim();

        if (texto.length <= 1) {
            errosGlobais = [];
            atualizarInterface();
            atualizarVisibilidadeBolha();
            return;
        }

        if (texto === ultimoTextoValido && errosGlobais.length > 0) {
            atualizarVisibilidadeBolha();
            return;
        }

        ultimoTextoValido = texto;
        textoUltimaVerificacao = texto;

        if (!idiomaSugerido) verificarIdioma(texto);

        filaRequisicoes.push({ texto, el });
        processarFilaRequisicoes();
        atualizarVisibilidadeBolha();
    }, parseInt(smConfig.speed) || 500);
}

/**
 * Observa Shadow DOM em todo o documento
 */
function observarShadowDOM() {
    observarElemento(document.body);

    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    observarElemento(node);
                    if (node.tagName === 'IFRAME') {
                        tentarInjetarEmIframe(node);
                    }
                }
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Tenta injetar o content script em um iframe
 * @param {HTMLIFrameElement} iframe - Iframe a ser processado
 */
function tentarInjetarEmIframe(iframe) {
    if (!iframe || processedIframes.has(iframe)) return;

    try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

        if (iframeDoc && iframeDoc.body) {
            processedIframes.add(iframe);
            observarElemento(iframeDoc.body);

            const iframeMutationObserver = new MutationObserver(() => {
                observarElemento(iframeDoc.body);
            });

            iframeMutationObserver.observe(iframeDoc, {
                childList: true,
                subtree: true
            });
        } else {
            iframe.addEventListener('load', () => {
                try {
                    const loadedDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (loadedDoc && loadedDoc.body) {
                        processedIframes.add(iframe);
                        observarElemento(loadedDoc.body);
                    }
                } catch (e) {
                    // Erro de cross-origin - ignorar
                }
            }, { once: true });
        }
    } catch (e) {
        // Erro de cross-origin - não podemos acessar este iframe
        console.debug('Não foi possível acessar iframe:', e.message);
    }
}

/**
 * Observa iframes de forma otimizada usando MutationObserver
 */
function observarIframes() {
    if (iframeObserver) return;

    iframeObserver = new MutationObserver((mutations) => {
        if (isExtensaoMutando) return; // ignorar mutacoes causadas pela propria extensao
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.tagName === 'IFRAME') {
                        tentarInjetarEmIframe(node);
                    }
                    if (node.querySelectorAll) {
                        node.querySelectorAll('iframe').forEach(iframe => {
                            if (!processedIframes.has(iframe)) {
                                tentarInjetarEmIframe(iframe);
                            }
                        });
                    }
                }
            });
        });
    });

    iframeObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    document.querySelectorAll('iframe').forEach(iframe => {
        if (!processedIframes.has(iframe)) {
            tentarInjetarEmIframe(iframe);
        }
    });
}

// =============================================
// DETECÇÃO DE IDIOMA
// =============================================

/**
 * Verifica e sugere mudança de idioma baseado no texto
 * @param {string} texto - Texto para análise
 */
async function verificarIdioma(texto) {
    if (texto.length < 30) return;

    const host = window.location.hostname;

    // Verificar se já há preferência salva para este site
    storageGetSeguro({ idiomasPorSite: {} }, (res) => {
        const prefs = res.idiomasPorSite || {};
        if (prefs[host] && prefs[host] !== smConfig.language) {
            smConfig.language = prefs[host];
            storageSetSeguro({ language: prefs[host] });
            return;
        }

        if (idiomaSugerido) return;

        enviarMensagemSegura({ action: 'detectLanguage', text: texto.substring(0, 500) }, (response) => {
            if (!response?.success || !response.language) return;

            const idiomaDetectado = response.language;
            const idiomaAtual = smConfig.language;
            if (idiomaDetectado === idiomaAtual) return;

            const nomes = {
                'pt-BR': 'Português', 'en-US': 'Inglês', 'es': 'Espanhol',
                'fr': 'Francês', 'de': 'Alemão', 'it': 'Italiano'
            };

            // Criar toast de sugestão com opção "Sempre neste site"
            const toast = document.createElement('div');
            toast.style.cssText = `
                position:fixed;bottom:80px;right:20px;z-index:2147483647;
                background:#1a1a2e;color:#fff;border-radius:10px;padding:14px 16px;
                font-size:13px;font-family:'Segoe UI',system-ui,sans-serif;
                max-width:280px;box-shadow:0 8px 24px rgba(0,0,0,.25);
            `;
            toast.innerHTML = `
                <p style="margin:0 0 10px;line-height:1.5">Texto em <strong>${nomes[idiomaDetectado] || idiomaDetectado}</strong> detectado. Mudar o corretor?</p>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                    <button id="sm-lang-sim" style="padding:5px 10px;border-radius:5px;border:none;background:#6f42c1;color:#fff;cursor:pointer;font-size:12px">Sim</button>
                    <button id="sm-lang-sempre" style="padding:5px 10px;border-radius:5px;border:none;background:#28a745;color:#fff;cursor:pointer;font-size:12px">Sempre neste site</button>
                    <button id="sm-lang-nao" style="padding:5px 10px;border-radius:5px;border:none;background:rgba(255,255,255,.15);color:#fff;cursor:pointer;font-size:12px">Não</button>
                </div>
            `;
            document.body.appendChild(toast);
            idiomaSugerido = true;

            const aplicar = (salvarSite) => {
                smConfig.language = idiomaDetectado;
                storageSetSeguro({ language: idiomaDetectado });
                if (salvarSite) {
                    storageGetSeguro({ idiomasPorSite: {} }, (r) => {
                        const p = r.idiomasPorSite || {};
                        p[host] = idiomaDetectado;
                        storageSetSeguro({ idiomasPorSite: p });
                    });
                }
                toast.remove();
                mostrarFeedback(`Idioma alterado para ${nomes[idiomaDetectado] || idiomaDetectado}`, 'success');
            };

            toast.querySelector('#sm-lang-sim')?.addEventListener('click', () => aplicar(false));
            toast.querySelector('#sm-lang-sempre')?.addEventListener('click', () => aplicar(true));
            toast.querySelector('#sm-lang-nao')?.addEventListener('click', () => toast.remove());
            setTimeout(() => toast.remove(), 12000);
        });
    });
}

/**
 * Mostra sugestão de mudança de idioma
 * @param {string} titulo - Título da sugestão
 * @param {string} mensagem - Mensagem da sugestão
 * @param {string} novoIdioma - Idioma sugerido
 */
function mostrarSugestaoIdioma(titulo, mensagem, novoIdioma) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 2147483646;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Segoe UI', system-ui, sans-serif;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 420px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;

    if (smConfig.darkMode) {
        dialog.style.background = '#1a1a1a';
        dialog.style.color = '#e0e0e0';
    }

    dialog.innerHTML = `
        <h3 style="margin:0 0 8px;font-size:16px;">🌐 ${titulo}</h3>
        <p style="margin:0 0 16px;font-size:14px;">${mensagem}</p>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="sm-dlg-cancel">Manter</button>
            <button class="sm-dlg-confirm">Mudar Idioma</button>
        </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const btnCancel = dialog.querySelector('.sm-dlg-cancel');
    const btnConfirm = dialog.querySelector('.sm-dlg-confirm');

    btnCancel.style.cssText = 'background:#f3f4f6;border:1px solid #d1d5db;color:#374151;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';
    btnConfirm.style.cssText = 'background:linear-gradient(135deg,#6f42c1,#8b5cf6);border:none;color:white;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';

    btnConfirm.onclick = () => {
        overlay.remove();
        smConfig.language = novoIdioma;
        if (isExtensaoAtiva()) storageSetSeguro({ language: novoIdioma });
        if (elementoGlobal && textoUltimaVerificacao) verificarTexto(textoUltimaVerificacao, elementoGlobal);
        mostrarFeedback('✓ Idioma alterado para ' + novoIdioma, 'success');
    };

    btnCancel.onclick = () => overlay.remove();
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };

    setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
    }, 15000);
}

// =============================================
// ATUALIZAÇÃO DE ESTADO (TOGGLE SITE)
// =============================================

/**
 * Atualiza o estado da extensão (ativar/desativar)
 * @param {boolean} ativar - true para ativar, false para desativar
 */
function atualizarEstadoExtensao(ativar) {
    smConfig.disabled = !ativar;

    if (!ativar) {
        if (elementoGlobal && elementoGlobal.isContentEditable && !isSiteRestrito) {
            elementoGlobal.innerHTML = elementoGlobal.innerHTML.replace(/<mark class="sm-highlight">(.*?)<\/mark>/gi, '$1');
            atualizarElementoComEventos(elementoGlobal);
        }

        errosGlobais = [];
        fecharPainel();
        resetarBadgeBackground();

        const bubble = document.getElementById('syntax-mentor-bubble');
        if (bubble) bubble.style.display = 'none';

        mostrarFeedback(`⛔ SyntaxMentor desativado neste site`, 'info');
    } else {
        const bubble = document.getElementById('syntax-mentor-bubble');
        if (bubble) bubble.style.display = 'flex';

        const campoAtivo = document.activeElement;
        if (campoAtivo && (campoAtivo.tagName === 'TEXTAREA' || campoAtivo.tagName === 'INPUT' || campoAtivo.isContentEditable)) {
            const texto = campoAtivo.value || campoAtivo.textContent || campoAtivo.innerText || '';
            if (texto.trim().length > 1) {
                textoUltimaVerificacao = texto;
                elementoGlobal = campoAtivo;
                verificarTexto(texto, campoAtivo);
            }
        }

        mostrarFeedback(`✅ SyntaxMentor ativado neste site`, 'success');
    }

    atualizarInterface();
}

// =============================================
// VERIFICAÇÃO DE TEXTO (OTIMIZADA)
// =============================================

/**
 * Verifica o texto usando a API LanguageTool
 * @param {string} texto - Texto a ser verificado
 * @param {HTMLElement} elemento - Elemento que contém o texto
 */
async function verificarTexto(texto, elemento) {
    if (smConfig.disabled) return;

    if (currentFetchController) {
        currentFetchController.abort();
    }

    currentFetchController = new AbortController();
    const signal = currentFetchController.signal;

    estaCarregando = true;
    atualizarEstadoCarregamento(true);

    const url = smConfig.apiUrl || 'https://api.languagetool.org/v2/check';
    const params = new URLSearchParams({
        text: texto,
        language: smConfig.language
    });

    if (smConfig.pickyMode) params.set('level', 'picky');

    // Perfil de voz: prioriza pontuação e capitalização, ignora erros de digitação
    if (elemento._smModoVoz) {
        params.set('enabledRules', 'UPPERCASE_SENTENCE_START,PUNCTUATION_PARAGRAPH_END,COMMA_PARENTHESIS_WHITESPACE,PT_QUESTION_MARK');
        params.set('enabledOnly', 'false');
        params.set('disabledCategories', 'TYPOS');
    }

    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (smConfig.apiKey?.trim()) headers['Authorization'] = `Bearer ${smConfig.apiKey.trim()}`;

    try {
        if (signal.aborted) {
            estaCarregando = false;
            atualizarEstadoCarregamento(false);
            return;
        }

        const resp = await fetch(url, { method: 'POST', headers, body: params, signal });

        if (!resp.ok) {
            let errorMsg = `HTTP ${resp.status}`;
            if (resp.status === 401) errorMsg = 'API Key inválida - Verifique sua chave';
            if (resp.status === 429) errorMsg = 'Muitas requisições - Aguarde um momento';
            throw new Error(errorMsg);
        }

        const data = await resp.json();

        if (signal.aborted) {
            estaCarregando = false;
            atualizarEstadoCarregamento(false);
            return;
        }

        const atual = (elemento.value || elemento.textContent || elemento.innerText || '').trim();
        if (atual !== texto) {
            estaCarregando = false;
            atualizarEstadoCarregamento(false);
            return;
        }

        // Usar cache em memoria (populado no iniciar() e atualizado via storage.onChanged)
        const dic = dicCache;

        const matchesProcessados = processarPontuacao(data.matches || []);
        const errosPontuacaoLocal = verificarPontuacaoComum(texto);
        const todosMatches = [...matchesProcessados, ...errosPontuacaoLocal];

        // Regras da API que geram muitos falsos positivos em textos informais
        const REGRAS_IGNORADAS = new Set([
            'UPPERCASE_SENTENCE_START',   // flagra siglas e nomes proprios no inicio
            'PUNCTUATION_PARAGRAPH_END',  // estilo opinativo sobre ponto final
            'DOUBLE_PUNCTUATION',         // confunde com reticencias
            'COMMA_PARENTHESIS_WHITESPACE',
            'EN_QUOTES',
            'DASH_RULE',
        ]);

        errosGlobais = todosMatches.filter(m => {
            if (!m.replacements?.length) return false;

            // Ignorar regras que geram falsos positivos
            const ruleId = m.rule?.id || '';
            if (REGRAS_IGNORADAS.has(ruleId)) return false;

            const o = m.context.text.substr(m.context.offset, m.context.length);
            if (!o.trim()) return false; // ignorar erros sem texto valido
            const ol = o.toLowerCase();

            // Ignorar numeros puros e URLs
            if (ol.match(/^[0-9]+$/) || ol.match(/^https?:\/\//)) return false;

            if (o.trim()) {
                erroMaisComumTemp[ol] = (erroMaisComumTemp[ol] || 0) + 1;
                // Registrar também por site
                const host = window.location.hostname;
                storageGetSeguro({ erroMaisComum: {}, estatisticasPorSite: {} }, (res) => {
                    const global = res.erroMaisComum || {};
                    global[ol] = (global[ol] || 0) + 1;
                    const porSite = res.estatisticasPorSite || {};
                    if (!porSite[host]) porSite[host] = { erros: {}, corrigidas: 0, aceitas: 0, recusadas: 0 };
                    porSite[host].erros[ol] = (porSite[host].erros[ol] || 0) + 1;
                    storageSetSeguro({ erroMaisComum: global, estatisticasPorSite: porSite });
                });
            }

            // Dicionario: normalizar para lowercase na comparacao (ja normalizado no carregamento)
            return !dic.includes(ol) && !ignoradosTemporarios.includes(ol);
        });

        elementoGlobal = elemento;

        if (!isSiteRestrito && elemento.isContentEditable && elemento.tagName !== 'TEXTAREA' && elemento.tagName !== 'INPUT') {
            aplicarGrifos(errosGlobais, elemento);
        }

        atualizarInterface();
    } catch (err) {
    if (err.name === 'AbortError') return;
    console.warn('SyntaxMentor:', err.message);
    
    // Mensagens de erro específicas
    let mensagemErro = '⚠️ Erro de conexão com o servidor';
    
    if (err.message.includes('API Key inválida') || err.message.includes('401')) {
        mensagemErro = '🔑 API Key inválida - Verifique suas configurações na aba Segurança';
    } else if (err.message.includes('Muitas requisições') || err.message.includes('429')) {
        mensagemErro = '⏳ Muitas correções seguidas - Aguarde alguns segundos e tente novamente';
    } else if (err.message.includes('Timeout') || err.name === 'AbortError') {
        mensagemErro = '⏱️ Servidor demorou para responder - Tente novamente em alguns instantes';
    } else if (err.message.includes('Failed to fetch')) {
        mensagemErro = '🌐 Sem conexão com a internet - Verifique sua rede';
    }
    
    mostrarFeedback(mensagemErro, 'error');
    } finally {
        if (currentFetchController && currentFetchController.signal === signal) {
            estaCarregando = false;
            atualizarEstadoCarregamento(false);
        }
    }
}

/**
 * Atualiza o estado de carregamento da bolha
 * @param {boolean} on - true para carregando, false para parado
 */
function atualizarEstadoCarregamento(on) {
    const b = document.getElementById('syntax-mentor-bubble');
    if (!b) return;

    b.style.opacity = on ? '0.6' : '1';
    b.style.cursor = on ? 'wait' : 'grab';
    b.style.animation = on ? 'sm-pulse 1.5s infinite' : '';
}

/**
 * Aplica grifos nos erros encontrados
 * @param {Array} erros - Lista de erros
 * @param {HTMLElement} el - Elemento a ser modificado
 */

function aplicarGrifos(erros, el) {
    if (!el?.isContentEditable || isSiteRestrito) return;

    isExtensaoMutando = true; // suprimir MutationObserver durante manipulacao do DOM
    try {
    // Remove grifos existentes primeiro
    const marksExistentes = el.querySelectorAll('mark.sm-highlight');
    marksExistentes.forEach(mark => {
        const parent = mark.parentNode;
        const texto = document.createTextNode(mark.textContent);
        parent.replaceChild(texto, mark);
        parent.normalize();
    });
    
    if (!erros || erros.length === 0) return;
    
    // Extrair palavras únicas para marcar
    const palavras = [...new Set(erros.map(e => 
        e.context.text.substr(e.context.offset, e.context.length)
    ).filter(Boolean))];
    
    if (palavras.length === 0) return;
    
    // Criar expressão regular para encontrar as palavras
    const regexPalavras = new RegExp(`\\b(${palavras.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
    
    // Usar TreeWalker para percorrer apenas nós de texto
    const walker = document.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: function(node) {
                if (node.parentElement?.closest?.('mark.sm-highlight, script, style')) {
                    return NodeFilter.FILTER_REJECT;
                }
                if (node.textContent && node.textContent.trim().length > 0) {
                    return NodeFilter.FILTER_ACCEPT;
                }
                return NodeFilter.FILTER_SKIP;
            }
        }
    );
    
    const nodesToReplace = [];
    while (walker.nextNode()) {
        nodesToReplace.push(walker.currentNode);
    }
    
    // Processar cada nó de texto
    nodesToReplace.forEach(node => {
        const texto = node.textContent;
        if (!regexPalavras.test(texto)) return;
        
        regexPalavras.lastIndex = 0;
        
        const fragment = document.createDocumentFragment();
        let lastIndex = 0;
        let match;
        
        while ((match = regexPalavras.exec(texto)) !== null) {
            if (match.index > lastIndex) {
                fragment.appendChild(document.createTextNode(texto.substring(lastIndex, match.index)));
            }
            
            const mark = document.createElement('mark');
            mark.className = 'sm-highlight';
            mark.textContent = match[0];
            fragment.appendChild(mark);
            
            lastIndex = match.index + match[0].length;
        }
        
        if (lastIndex < texto.length) {
            fragment.appendChild(document.createTextNode(texto.substring(lastIndex)));
        }
        
        node.parentNode.replaceChild(fragment, node);
    });
    } finally {
        isExtensaoMutando = false; // sempre restaurar, mesmo em caso de erro
    }
}

// =============================================
// FILA DE REQUISIÇÕES
// =============================================

/**
 * Processa a fila de requisições sequencialmente
 */
async function processarFilaRequisicoes() {
    if (processandoFila || filaRequisicoes.length === 0) return;

    processandoFila = true;
    const ultima = filaRequisicoes[filaRequisicoes.length - 1];
    filaRequisicoes = [];

    try {
        await verificarTexto(ultima.texto, ultima.el);
    } catch (e) {
        console.warn('SyntaxMentor:', e.message);
    }

    processandoFila = false;

    if (filaRequisicoes.length > 0) {
        processarFilaRequisicoes();
    }
}

// =============================================
// APLICAÇÃO DE CORREÇÕES
// =============================================

/**
 * Aplica uma correção no texto com feedback visual
 * @param {string} original - Palavra original com erro
 * @param {string} sugestao - Sugestão de correção
 * @param {HTMLElement} el - Elemento contendo o texto
 * @param {boolean} pularConfirmacao - Se deve pular a confirmação
 */
function aplicarCorrecao(original, sugestao, el, pularConfirmacao = false) {
    if (!el || !original || !sugestao) return;
    
    const executarCorrecao = () => {
        const esc = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
            const valorAntigo = el.value;
            const posicao = encontrarPosicaoPalavra(el.value, original);
            el.value = el.value.replace(new RegExp(`(?<![\\p{L}])${esc}(?![\\p{L}])`, 'gu'), sugestao);
            
            if (el.value !== valorAntigo) {
                // Feedback visual para input/textarea
                mostrarFeedbackCorrecao(el, posicao, original, sugestao);
                
                salvarEstadoParaDesfazer(el, original, sugestao);
                dispararEventosNativos(el);
                requestAnimationFrame(() => {
                    if (el.value !== valorAntigo) dispararEventosNativos(el);
                });
                setTimeout(() => {
                    el.blur();
                    el.focus();
                    dispararEventosNativos(el);
                }, 100);
            }
        } else if (el.isContentEditable) {
            if (isSiteRestrito) {
                el.focus();
                try {
                    const doc = el.ownerDocument || document;
                    if (doc.execCommand('find', false, original)) {
                        doc.execCommand('insertText', false, sugestao);
                    } else {
                        el.textContent = (el.textContent || '').replace(new RegExp(esc, 'gi'), sugestao);
                    }
                } catch (e) {
                    el.textContent = (el.textContent || '').replace(new RegExp(esc, 'gi'), sugestao);
                }
                atualizarElementoComEventos(el);
            } else {
                let html = el.innerHTML;
                const htmlAntigo = html;
                const markRegex = new RegExp(`<mark class="sm-highlight">${esc}</mark>`, 'g');
                
                if (markRegex.test(html)) {
                    html = html.replace(markRegex, `<span class="sm-correction-feedback">${sugestao}</span>`);
                } else {
                    html = html.replace(new RegExp(`(?<!<[^>]*)(?<![\\p{L}])${esc}(?![\\p{L}])(?![^<]*>)`, 'gu'), 
                        `<span class="sm-correction-feedback">${sugestao}</span>`);
                }
                
                if (html !== htmlAntigo) {
                    salvarEstadoParaDesfazer(el, original, sugestao);
                    el.innerHTML = html;
                    
                    // Remover a classe de animação após 500ms
                    const elementoCorrigido = el.querySelector('.sm-correction-feedback');
                    if (elementoCorrigido) {
                        setTimeout(() => {
                            const span = elementoCorrigido;
                            const parent = span.parentNode;
                            if (!parent) return; // span já foi removido do DOM
                            const texto = document.createTextNode(span.textContent);
                            parent.replaceChild(texto, span);
                            parent.normalize();
                        }, 500);
                    }
                }
                atualizarElementoComEventos(el);
                setTimeout(() => atualizarElementoComEventos(el), 100);
            }
        }
        
        historicoCorrecoes.push({ el, original, sugestao });
        if (historicoCorrecoes.length > 50) historicoCorrecoes.shift();

        // Remover o erro corrigido imediatamente da lista e ignorar a palavra
        // temporariamente para que a re-verificação não a reporte novamente
        removerErroGlobal(original);
        const olOriginal = original.toLowerCase();
        if (!ignoradosTemporarios.includes(olOriginal)) {
            ignoradosTemporarios.push(olOriginal);
            // Remover do ignorados após 5s (tempo suficiente para re-verificação passar)
            setTimeout(() => {
                ignoradosTemporarios = ignoradosTemporarios.filter(p => p !== olOriginal);
            }, 5000);
        }
        
        incrementarStats(1);
        
        if (smConfig.modoAprendizado) {
            const erroEncontrado = errosGlobais.find(e => {
                const o = e.context.text.substr(e.context.offset, e.context.length);
                return o === original;
            });
            
            if (erroEncontrado && erroEncontrado.message) {
                setTimeout(() => {
                    mostrarExplicacaoRegra(original, sugestao, erroEncontrado.message, erroEncontrado);
                }, 300);
            }
        }
    };
    
    if (pularConfirmacao) {
        executarCorrecao();
    } else {
        confirmarCorrecao(original, sugestao, (confirmado) => {
            if (confirmado) executarCorrecao();
        });
    }
}

/**
 * Encontra a posição de uma palavra no texto para feedback visual
 * @param {string} texto - Texto completo
 * @param {string} palavra - Palavra a ser encontrada
 * @returns {number} - Posição da palavra
 */
function encontrarPosicaoPalavra(texto, palavra) {
    const regex = new RegExp(`\\b${palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const match = texto.match(regex);
    return match ? match.index : -1;
}

/**
 * Mostra feedback visual quando uma palavra é corrigida
 * @param {HTMLElement} elemento - Elemento que contém o texto
 * @param {number} posicao - Posição da palavra corrigida
 * @param {string} original - Palavra original
 * @param {string} sugestao - Sugestão aplicada
 */
function mostrarFeedbackCorrecao(elemento, posicao, original, sugestao) {
    if (!elemento || posicao < 0) return;
    
    // Obter as coordenadas do elemento
    const rect = elemento.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    
    // Criar elemento de feedback flutuante
    const feedback = document.createElement('div');
    feedback.className = 'sm-feedback-correcao';
    feedback.innerHTML = `
        <span style="text-decoration:line-through;color:#e53e3e;">${escapeHtml(original)}</span>
        <span style="margin:0 4px;">→</span>
        <span style="color:#28a745;font-weight:bold;">${escapeHtml(sugestao)}</span>
    `;
    
    feedback.style.cssText = `
        position: fixed;
        left: ${rect.left + 10}px;
        top: ${rect.top - 30}px;
        background: #1a1a1a;
        color: white;
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-family: 'Segoe UI', sans-serif;
        z-index: 2147483647;
        pointer-events: none;
        white-space: nowrap;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        animation: sm-feedback-correcao 0.8s ease-out forwards;
    `;
    
    document.body.appendChild(feedback);
    
    // Remover após animação
    setTimeout(() => {
        if (feedback.parentNode) feedback.remove();
    }, 800);
}

/**
 * Incrementa as estatísticas de correção
 * @param {number} qtd - Quantidade a incrementar
 */
function incrementarStats(qtd) {
    if (!isExtensaoAtiva()) return;

    // Animar a bolinha ao corrigir
    const bubble = document.getElementById('syntax-mentor-bubble');
    if (bubble) {
        bubble.classList.add('sm-bubble-correction');
        setTimeout(() => bubble.classList.remove('sm-bubble-correction'), 300);
    }

    storageGetSeguro({ totalCorrigidas: 0, dicionario_pessoal: [], lastUseDate: '', streakDias: 0, correcoesHoje: 0 }, (res) => {
        const novoTotal = (res.totalCorrigidas || 0) + qtd;

        // Atualizar streak
        const hoje = new Date().toISOString().split('T')[0];
        const ontem = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        let streak = res.streakDias || 0;
        let correcoesHoje = res.correcoesHoje || 0;

        if (res.lastUseDate === hoje) {
            correcoesHoje += qtd; // mesmo dia
        } else if (res.lastUseDate === ontem) {
            streak += 1; // dia consecutivo
            correcoesHoje = qtd;
        } else {
            streak = 1; // sequência quebrada — reinicia
            correcoesHoje = qtd;
        }

        storageSetSeguro({ totalCorrigidas: novoTotal, lastUseDate: hoje, streakDias: streak, correcoesHoje });

        // Registrar correções de voz separadamente para conquistas
        if (elementoGlobal?._smModoVoz) {
            storageGetSeguro({ correcoesVoz: 0 }, (rv) => {
                storageSetSeguro({ correcoesVoz: (rv.correcoesVoz || 0) + qtd });
            });
        }

        verificarConquistas(novoTotal, (res.dicionario_pessoal || []).length);
    });
}

/**
 * Remove um erro da lista global
 * @param {string} original - Palavra original do erro
 */
function removerErroGlobal(original) {
    errosGlobais = errosGlobais.filter(err => {
        const o = err.context.text.substr(err.context.offset, err.context.length);
        return o !== original;
    });
    atualizarInterface();
}

/**
 * Ignora uma palavra temporariamente na sessão atual
 * @param {string} palavra - Palavra a ser ignorada
 */
function ignorarTemporariamente(palavra) {
    const pl = palavra.toLowerCase();
    if (!ignoradosTemporarios.includes(pl)) ignoradosTemporarios.push(pl);

    if (!isSiteRestrito && elementoGlobal?.isContentEditable) {
        const esc = palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        elementoGlobal.innerHTML = elementoGlobal.innerHTML.replace(new RegExp(`<mark class="sm-highlight">${esc}</mark>`, 'g'), palavra);
        atualizarElementoComEventos(elementoGlobal);
    }

    removerErroGlobal(palavra);
    mostrarFeedback(`"${palavra}" ignorada nesta sessão`, 'info');
}

// =============================================
// CORREÇÃO EM LOTE
// =============================================

/**
 * Corrige todos os erros de uma vez
 */
function corrigirTudo() {
    if (!elementoGlobal) return;

    const unicos = {};
    errosGlobais.forEach(err => {
        const o = err.context.text.substr(err.context.offset, err.context.length);
        const s = err.replacements[0]?.value || "";
        if (o.trim() && s && !unicos[o]) unicos[o] = s;
    });

    const correcoes = Object.entries(unicos);
    if (correcoes.length === 0) return;

    if (smConfig.modoConfirmacao || isModoLeitura()) {
        confirmarCorrecaoEmLote(correcoes);
    } else {
        correcoes.forEach(([o, s]) => aplicarCorrecao(o, s, elementoGlobal));
        errosGlobais = [];
        atualizarInterface();
        mostrarFeedbackInteligente('✓ Tudo corrigido!', 'success');
    }
}

/**
 * Limpa todos os erros da tela
 */
function limparTudo() {
    if (!isSiteRestrito && elementoGlobal?.isContentEditable) {
        elementoGlobal.innerHTML = elementoGlobal.innerHTML.replace(/<mark class="sm-highlight">(.*?)<\/mark>/gi, '$1');
        atualizarElementoComEventos(elementoGlobal);
    }

    errosGlobais = [];
    atualizarInterface();
}

/**
 * Confirma correção em lote
 * @param {Array} correcoes - Lista de correções
 */
function confirmarCorrecaoEmLote(correcoes) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        z-index: 2147483646;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

    const lista = correcoes.map(([o, s]) => `
        <div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #e5e7eb;">
            <span style="color:#e53e3e;text-decoration:line-through;flex:1;">${o}</span>
            <span>→</span>
            <span style="color:#28a745;flex:1;">${s}</span>
        </div>
    `).join('');

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        max-height: 70vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;

    if (smConfig.darkMode) {
        dialog.style.background = '#1a1a1a';
        dialog.style.color = '#e0e0e0';
    }

    dialog.innerHTML = `
        <h3>Confirmar Correções</h3>
        <p style="font-size:12px;color:#888;">${correcoes.length} correção(ões)</p>
        <div style="margin-bottom:16px;">${lista}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="sm-dlg-cancel">Cancelar</button>
            <button class="sm-dlg-confirm">Aplicar Todas</button>
        </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const btnCancel = dialog.querySelector('.sm-dlg-cancel');
    const btnConfirm = dialog.querySelector('.sm-dlg-confirm');

    btnCancel.style.cssText = 'background:#f3f4f6;border:1px solid #d1d5db;color:#374151;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';
    btnConfirm.style.cssText = 'background:linear-gradient(135deg,#6f42c1,#8b5cf6);border:none;color:white;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';

    btnConfirm.onclick = () => {
        overlay.remove();
        correcoes.forEach(([o, s]) => aplicarCorrecao(o, s, elementoGlobal));
        errosGlobais = [];
        atualizarInterface();
        mostrarFeedbackInteligente('✓ Tudo corrigido!', 'success');
    };

    btnCancel.onclick = () => overlay.remove();
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
}

// =============================================
// CONQUISTAS
// =============================================

/**
 * Verifica e desbloqueia conquistas
 * @param {number} totalCorrigidas - Total de correções realizadas
 * @param {number} dicSize - Tamanho do dicionário pessoal
 */
function verificarConquistas(totalCorrigidas, dicSize) {
    storageGetSeguro({
        streakDias: 0,
        totalAceitas: 0,
        totalRecusadas: 0,
        estatisticasPorSite: {},
        correcoesVoz: 0
    }, (extra) => {
        const streak = extra.streakDias || 0;
        const aceitas = extra.totalAceitas || 0;
        const recusadas = extra.totalRecusadas || 0;
        const taxa = aceitas + recusadas > 0 ? Math.round((aceitas / (aceitas + recusadas)) * 100) : 0;
        const sitesUsados = Object.keys(extra.estatisticasPorSite || {}).length;
        const correcoesVoz = extra.correcoesVoz || 0;

        const conquistas = [
            { id: 'primeira',       nome: '🏆 Primeira Correção!',              condicao: totalCorrigidas >= 1 },
            { id: '10correcoes',    nome: '⭐ 10 Correções!',                   condicao: totalCorrigidas >= 10 },
            { id: '50correcoes',    nome: '🔥 50 Correções!',                   condicao: totalCorrigidas >= 50 },
            { id: '100correcoes',   nome: '💎 100 Correções!',                  condicao: totalCorrigidas >= 100 },
            { id: '500correcoes',   nome: '👑 500 Correções!',                  condicao: totalCorrigidas >= 500 },
            { id: '1000correcoes',  nome: '🌟 1000 Correções! Lendário!',       condicao: totalCorrigidas >= 1000 },
            { id: '10dic',          nome: '📖 10 Palavras no Dicionário!',      condicao: dicSize >= 10 },
            { id: 'streak3',        nome: '📅 3 Dias Seguidos!',                condicao: streak >= 3 },
            { id: 'streak7',        nome: '🗓️ 7 Dias Seguidos!',               condicao: streak >= 7 },
            { id: 'streak30',       nome: '🔥 30 Dias Seguidos! Imparável!',    condicao: streak >= 30 },
            { id: 'taxa90',         nome: '🎯 90% de Aceitação!',               condicao: taxa >= 90 && totalCorrigidas >= 20 },
            { id: '5sites',         nome: '🌐 Usado em 5 Sites!',               condicao: sitesUsados >= 5 },
            { id: '10sites',        nome: '🗺️ Explorador — 10 Sites!',         condicao: sitesUsados >= 10 },
            { id: 'primeiravoz',    nome: '🎤 Primeira Correção de Voz!',       condicao: correcoesVoz >= 1 },
            { id: '10voz',          nome: '🎙️ 10 Correções de Voz!',           condicao: correcoesVoz >= 10 },
        ];

        const novasConquistas = conquistas.filter(c => c.condicao && !conquistasNotificadas[c.id]);

        if (novasConquistas.length > 0) {
            novasConquistas.forEach(c => { conquistasNotificadas[c.id] = true; });
            if (isExtensaoAtiva()) storageSetSeguro({ conquistasNotificadas });
            mostrarNotificacaoConquista(novasConquistas[novasConquistas.length - 1].nome);
            if (novasConquistas.length > 1) {
                setTimeout(() => mostrarNotificacaoConquista(`🎉 +${novasConquistas.length - 1} conquista(s)!`), 3500);
            }
        }
    });
}

/**
 * Mostra notificação de conquista
 * @param {string} mensagem - Mensagem da conquista
 */
function mostrarNotificacaoConquista(mensagem) {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2147483647;
        background: linear-gradient(135deg,#f59e0b,#fbbf24);
        color: #1a1a1a;
        padding: 16px 28px;
        border-radius: 16px;
        font: 700 16px 'Segoe UI',system-ui,sans-serif;
        text-align: center;
        box-shadow: 0 10px 40px rgba(245,158,11,0.5);
        animation: sm-conquista-in .5s ease, sm-conquista-out .5s ease 3s forwards;
        pointer-events: none;
        max-width: 90vw;
    `;

    notif.textContent = mensagem;
    document.body.appendChild(notif);
    criarConfete();

    setTimeout(() => {
        if (notif.parentNode) notif.remove();
    }, 3700);
}

/**
 * Cria efeito de confete
 */
function criarConfete() {
    const cores = ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7', '#6f42c1', '#8b5cf6'];

    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const c = document.createElement('div');
            const s = Math.random() * 10 + 5;

            c.style.cssText = `
                position: fixed;
                top: -10px;
                left: ${Math.random() * 100}%;
                z-index: 2147483646;
                width: ${s}px;
                height: ${s}px;
                background: ${cores[Math.floor(Math.random() * cores.length)]};
                border-radius: ${Math.random() > .5 ? '50%' : '0'};
                pointer-events: none;
                animation: sm-confete-fall ${Math.random() * 2 + 1.5}s linear forwards;
            `;

            document.body.appendChild(c);

            setTimeout(() => {
                if (c.parentNode) c.remove();
            }, 2500);
        }, i * 30);
    }
}

// =============================================
// INTERFACE DO USUÁRIO
// =============================================

/**
 * Atualiza toda a interface (bolha e painel)
 */
function atualizarInterface() {
    if (smConfig.disabled) return;

    if (smConfig.modoFoco && !painelAberto) {
        if (!modoFocoAtivo) {
            modoFocoAtivo = true;
            iniciarTimeoutFoco();
        }
    } else {
        modoFocoAtivo = false;
        desativarModoFoco();
        clearTimeout(timeoutFoco);
    }

    let bubble = document.getElementById('syntax-mentor-bubble');
    const total = errosGlobais.filter(e => e.context.text.substr(e.context.offset, e.context.length).trim()).length;

    atualizarBadgeBackground(total);

    if (!bubble) {
        bubble = document.createElement('div');
        bubble.id = 'syntax-mentor-bubble';
        bubble.title = 'SyntaxMentor';
        document.body.appendChild(bubble);
        tornarArrastavel(bubble);

        bubble.addEventListener('click', (e) => {
        // Só abre o painel se não foi um arrasto
        if (!isDraggingBubble && !estaCarregando && errosGlobais.length > 0) {
            painelAberto ? fecharPainel() : exibirPainel();
        }
        isDraggingBubble = false;
    });
    }

    if (smConfig.darkMode) {
        bubble.classList.add('sm-dark');
    } else {
        bubble.classList.remove('sm-dark');
    }

    if (bubblePosX) {
        bubble.style.left = bubblePosX;
        bubble.style.top = bubblePosY;
        bubble.style.right = 'auto';
        bubble.style.bottom = 'auto';
    }

    if (estaCarregando && errosGlobais.length > 0) {
        bubble.style.opacity = '0.6';
        bubble.style.pointerEvents = 'auto';
        bubble.style.display = 'flex';
    } else {
        atualizarVisibilidadeBolha();
    }

    if (total === 0) {
        bubble.className = 'sm-bubble-success';
        bubble.innerHTML = '<span class="sm-bubble-icon">✓</span>';
        if (painelAberto) fecharPainelComSucesso();
    } else {
        bubble.className = 'sm-bubble-error';
        bubble.innerHTML = `
            <span class="sm-bubble-icon">${isModoLeitura() ? '👁️' : '✏️'}</span>
            <span class="sm-bubble-badge">${total}</span>
        `;
        if (painelAberto) exibirPainel();
    }
}

/**
 * Exibe o painel de sugestões
 */
function exibirPainel() {
    if (modoFocoAtivo) {
        desativarModoFoco();
        clearTimeout(timeoutFoco);
    }

    painelAberto = true;
    indexSugestao = -1;

    let painel = document.getElementById('syntax-mentor-painel');
    if (!painel) {
        painel = document.createElement('div');
        painel.id = 'syntax-mentor-painel';
        document.body.appendChild(painel);
    }

    if (smConfig.darkMode) {
        painel.classList.add('sm-dark');
    } else {
        painel.classList.remove('sm-dark');
    }

    const mapa = {};
    let total = 0;

    errosGlobais.forEach(e => {
        const o = e.context.text.substr(e.context.offset, e.context.length);
        if (!o.trim()) return;

        if (!mapa[o]) {
            mapa[o] = {
                s: e.replacements[0]?.value || '',
                c: 0,
                msg: e.message
            };
        }
        mapa[o].c++;
        total++;
    });

    let html = `
        <div id="syntax-mentor-header">
            <span>${isModoLeitura() ? '👁️ Revisão' : '📝 Sugestões'}</span>
            <div id="sm-nivel-painel" style="font-size:11px;color:rgba(255,255,255,.7);flex:1;text-align:center"></div>
            <button id="btn-fechar-painel">✕</button>
        </div>
        <div id="syntax-mentor-content">
            <div class="body-cards">
    `;

    if (Object.keys(mapa).length === 0) {
        html += '<div style="text-align:center;padding:20px;color:#888;">✓ Nenhum erro</div>';
    } else {
        Object.entries(mapa).forEach(([o, info]) => {
            html += `
                <div class="erro-card">
                    <p class="erro-msg" title="${info.msg.replace(/"/g, '&quot;')}">Erro: <strong>${o}</strong></p>
                    <div class="sugestao-container">
                        <span class="palavra-original">${o}</span>
                        <span class="seta">→</span>
                        <div class="botoes-acao">
                            <button class="btn-fix-mini" data-o="${o}" data-s="${info.s}">
                                ${info.c > 1 ? info.s + ' (' + info.c + 'x)' : (info.s || '[Remover]')}
                            </button>
                            <button class="btn-ignorar-sessao" data-o="${o}">↩</button>
                            <button class="btn-ignorar" data-o="${o}">+</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    html += `
            </div>
            <div class="footer-actions">
                <div class="sm-nav-row">
                    <button id="btn-erro-prev" class="sm-nav-btn" title="Erro anterior (Alt+↑)">↑</button>
                    <span id="sm-nav-contador" class="sm-nav-label">${total > 0 ? `1 de ${total}` : '0 erros'}</span>
                    <button id="btn-erro-next" class="sm-nav-btn" title="Próximo erro (Alt+↓)">↓</button>
                </div>
                <div class="sm-action-row">
                    <button id="btn-corrigir-tudo">✦ Corrigir tudo</button>
                    <button id="btn-ignorar-tudo">Ignorar tudo</button>
                    <button id="btn-desfazer-ultima" title="Ctrl+Z">↩</button>
                </div>
            </div>
            ${ignoradosTemporarios.length ? `<div class="sm-footer-info">📋 ${ignoradosTemporarios.length} palavra(s) ignorada(s)</div>` : ''}
            ${isModoLeitura() ? `<div class="sm-footer-info" style="color:#f59e0b">⚠️ Modo leitura ativo</div>` : ''}
        </div>
    `;

    painel.innerHTML = html;
    tornarArrastavelPainel(painel, document.getElementById('syntax-mentor-header'));

    // Popular nível no header
    storageGetSeguro({ totalCorrigidas: 0 }, (res) => {
        const t = res.totalCorrigidas || 0;
        const el = document.getElementById('sm-nivel-painel');
        if (!el) return;
        let icone, nome, proximo;
        if (t >= 1000)     { icone = '👑'; nome = 'Lendário';     proximo = null; }
        else if (t >= 500) { icone = '⭐'; nome = 'Mestre';       proximo = 1000; }
        else if (t >= 100) { icone = '🔥'; nome = 'Avançado';     proximo = 500; }
        else if (t >= 10)  { icone = '📈'; nome = 'Intermediário'; proximo = 100; }
        else               { icone = '🌱'; nome = 'Iniciante';    proximo = 10; }
        const pct = proximo ? Math.round((t / proximo) * 100) : 100;
        el.innerHTML = `${icone} ${nome} <span style="opacity:.55;font-size:10px">${proximo ? `${t}/${proximo}` : 'MAX'}</span>`;
        el.title = `Nível: ${nome} — ${pct}% para o próximo`;
    });

    document.getElementById('btn-fechar-painel').onclick = fecharPainel;
    document.getElementById('btn-corrigir-tudo').onclick = corrigirTudo;

    // Navegação entre erros
    let erroNavIdx = -1;
    const errosNavegaveis = errosGlobais.filter(e => e.context.text.substr(e.context.offset, e.context.length).trim());

    function navegarParaErro(idx) {
        if (errosNavegaveis.length === 0) return;
        erroNavIdx = (idx + errosNavegaveis.length) % errosNavegaveis.length;
        const erro = errosNavegaveis[erroNavIdx];
        const palavra = erro.context.text.substr(erro.context.offset, erro.context.length);

        // Atualizar contador
        const contador = document.getElementById('sm-nav-contador');
        if (contador) contador.textContent = `${erroNavIdx + 1} / ${errosNavegaveis.length}`;

        // Scroll e destaque no DOM
        const marks = document.querySelectorAll(`mark.sm-highlight`);
        marks.forEach(m => m.style.outline = '');
        marks.forEach(m => {
            if (m.textContent === palavra) {
                m.style.outline = '2px solid #f97316';
                m.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });

        // Destacar card correspondente no painel
        document.querySelectorAll('.erro-card').forEach(card => {
            const strong = card.querySelector('strong');
            card.style.background = strong?.textContent === palavra
                ? 'var(--color-background-warning)'
                : '';
        });
    }

    document.getElementById('btn-erro-next')?.addEventListener('click', () => navegarParaErro(erroNavIdx + 1));
    document.getElementById('btn-erro-prev')?.addEventListener('click', () => navegarParaErro(erroNavIdx - 1));
    document.getElementById('btn-ignorar-tudo').onclick = limparTudo;

    // Desfazer sempre disponível — desabilitado quando sem histórico
    const btnDesfazer = document.getElementById('btn-desfazer-ultima');
    if (btnDesfazer) {
        const atualizar = () => {
            btnDesfazer.disabled = historicoDesfazer.length === 0;
            btnDesfazer.title = historicoDesfazer.length > 0
                ? `Desfazer: "${historicoDesfazer[historicoDesfazer.length-1]?.textoAnterior}" (Ctrl+Z)`
                : 'Nada para desfazer';
        };
        atualizar();
        btnDesfazer.addEventListener('click', () => { desfazerUltimaCorrecao(); atualizar(); });
    }

    // Navegar para o primeiro erro ao abrir
    if (errosNavegaveis.length > 0) navegarParaErro(0);

    painel.querySelectorAll('.btn-fix-mini').forEach(b => {
        b.onclick = () => {
            aplicarCorrecao(b.dataset.o, b.dataset.s, elementoGlobal);
            removerErroGlobal(b.dataset.o);
        };
    });

    painel.querySelectorAll('.btn-ignorar-sessao').forEach(b => {
        b.onclick = () => ignorarTemporariamente(b.dataset.o);
    });

    painel.querySelectorAll('.btn-ignorar').forEach(b => {
        b.onclick = () => {
            const o = b.dataset.o;

            if (isExtensaoAtiva()) {
                storageGetSeguro(['dicionario_pessoal'], (res) => {
                    const dic = res.dicionario_pessoal || [];
                    if (!dic.includes(o)) {
                        dic.push(o);
                        storageSetSeguro({ dicionario_pessoal: dic });
                    }
                });
            }

            if (!isSiteRestrito && elementoGlobal?.isContentEditable) {
                elementoGlobal.innerHTML = elementoGlobal.innerHTML.replace(new RegExp(`<mark class="sm-highlight">${o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</mark>`, 'g'), o);
                atualizarElementoComEventos(elementoGlobal);
            }

            removerErroGlobal(o);
            mostrarFeedback(`"${o}" → dicionário`, 'success');
        };
    });

    if (typeof smTTS !== 'undefined' && smTTS) {
        try {
            smTTS.adicionarControles(contentArea);
        } catch(e) {
            console.debug('TTS não disponível:', e.message);
        }
    }
}

/**
 * Fecha o painel de sugestões
 */
function fecharPainel() {
    const painel = document.getElementById('syntax-mentor-painel');
    if (painel) painel.remove();

    painelAberto = false;

    if (smConfig.modoFoco && !usuarioDigitando) {
        setTimeout(() => {
            modoFocoAtivo = true;
            iniciarTimeoutFoco();
        }, 1000);
    }

    //adicionarAbaSentimento();
}

/**
 * Fecha o painel com mensagem de sucesso
 */
function fecharPainelComSucesso() {
    const c = document.getElementById('syntax-mentor-content');
    if (c) {
        c.innerHTML = `
            <div style="text-align:center;padding:30px;">
                <div style="font-size:48px;color:#28a745;">✓</div>
                <p>Tudo limpo!</p>
            </div>
        `;
    }

    setTimeout(fecharPainel, 1500);
}

// =============================================
// FUNÇÕES DE ARRASTE
// =============================================

/**
 * Torna um elemento arrastável sem interferir na seleção de texto
 * @param {HTMLElement} el - Elemento a ser arrastado
 */
function tornarArrastavel(el) {
    let startX = 0, startY = 0;
    let isDragging = false;
    let hasMoved = false;

    function onMouseMove(e) {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
            hasMoved = true;
            isDraggingBubble = true;

            el.style.left = (el.offsetLeft + dx) + 'px';
            el.style.top  = (el.offsetTop  + dy) + 'px';
            el.style.right  = 'auto';
            el.style.bottom = 'auto';

            bubblePosX = el.style.left;
            bubblePosY = el.style.top;

            startX = e.clientX;
            startY = e.clientY;
        }
    }

    function onMouseUp() {
        isDragging = false;
        el.style.cursor = 'grab';
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        setTimeout(() => { isDraggingBubble = false; }, 100);
    }

    el.addEventListener('mousedown', (e) => {
        // Sem preventDefault nem stopPropagation -- nao interfere na selecao de texto da pagina
        startX = e.clientX;
        startY = e.clientY;
        isDragging = true;
        hasMoved = false;
        el.style.cursor = 'grabbing';
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    el.style.cursor = 'grab';
}

/**
 * Torna o painel arrastável pela header
 * @param {HTMLElement} painel - Painel a ser arrastado
 * @param {HTMLElement} handle - Elemento que controla o arraste
 */
function tornarArrastavelPainel(painel, handle) {
    if (!handle) return;

    let p1, p2, p3, p4;

    function onMovePainel(e2) {
        p1 = p3 - e2.clientX;
        p2 = p4 - e2.clientY;
        p3 = e2.clientX;
        p4 = e2.clientY;
        painel.style.top  = (painel.offsetTop  - p2) + 'px';
        painel.style.left = (painel.offsetLeft - p1) + 'px';
    }

    function onUpPainel() {
        document.removeEventListener('mousemove', onMovePainel);
        document.removeEventListener('mouseup', onUpPainel);
    }

    handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        p3 = e.clientX;
        p4 = e.clientY;
        document.addEventListener('mousemove', onMovePainel);
        document.addEventListener('mouseup', onUpPainel);
    });
}

// =============================================
// ATALHOS DE TECLADO (ÚNICA SEÇÃO - COMPLETA)
// =============================================

document.addEventListener('keydown', (e) => {
    if (window !== window.top) return;
    
    // =========================================
    // 1. ATALHOS FIXOS (NÃO PERSONALIZÁVEIS)
    // =========================================
    
    // Ctrl+Z para desfazer
    if (e.ctrlKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (historicoDesfazer.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            desfazerUltimaCorrecao();
            if (elementoGlobal && textoUltimaVerificacao) {
                verificarTexto(textoUltimaVerificacao, elementoGlobal);
            }
        }
        return;
    }
    
    // Esc para fechar painel
    if (e.key === 'Escape' && painelAberto) {
        e.preventDefault();
        fecharPainel();
        return;
    }
    
    // Navegação pelo painel com setas
    if (painelAberto && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        const botoes = [...document.querySelectorAll('#syntax-mentor-painel .btn-fix-mini')];
        if (botoes.length === 0) return;
        
        if (e.key === 'ArrowDown') {
            indexSugestao = (indexSugestao + 1) % botoes.length;
        } else {
            indexSugestao = (indexSugestao - 1 + botoes.length) % botoes.length;
        }
        botoes[indexSugestao].focus();
        return;
    }
    
    // Enter para aplicar correção
    if (painelAberto && e.key === 'Enter') {
        const botoes = [...document.querySelectorAll('#syntax-mentor-painel .btn-fix-mini')];
        if (botoes.length > 0 && botoes[indexSugestao]) {
            e.preventDefault();
            botoes[indexSugestao].click();
        }
        return;
    }
    
    // =========================================
    // 2. ATALHOS PERSONALIZÁVEIS PELO USUÁRIO
    // =========================================
    
    // Carregar configurações dos atalhos (com defaults)
    const toggleShortcut = smConfig.toggleShortcut || { altKey: true, ctrlKey: false, shiftKey: false, key: 's' };
    const ignoreShortcut = smConfig.ignoreShortcut || { altKey: true, ctrlKey: false, shiftKey: false, key: 'i' };
    const corrigirTudoShortcut = smConfig.corrigirTudoShortcut || { altKey: true, ctrlKey: false, shiftKey: true, key: 's' };
    const ativarShortcut = smConfig.ativarShortcut || { altKey: true, ctrlKey: false, shiftKey: true, key: 'a' };
    const desativarShortcut = smConfig.desativarShortcut || { altKey: true, ctrlKey: false, shiftKey: true, key: 'd' };
    
    // 2.1 Abrir/Fechar Painel
    if (e.altKey === toggleShortcut.altKey && 
        e.ctrlKey === toggleShortcut.ctrlKey && 
        e.shiftKey === toggleShortcut.shiftKey && 
        e.key.toLowerCase() === toggleShortcut.key) {
        e.preventDefault();
        e.stopPropagation();
        if (errosGlobais.length > 0) {
            painelAberto ? fecharPainel() : exibirPainel();
        }
        return;
    }
    
    // 2.2 Ignorar Tudo (limpar erros)
    if (e.altKey === ignoreShortcut.altKey && 
        e.ctrlKey === ignoreShortcut.ctrlKey && 
        e.shiftKey === ignoreShortcut.shiftKey && 
        e.key.toLowerCase() === ignoreShortcut.key) {
        e.preventDefault();
        e.stopPropagation();
        limparTudo();
        return;
    }
    
    // 2.3 Corrigir Tudo
    if (e.altKey === corrigirTudoShortcut.altKey && 
        e.ctrlKey === corrigirTudoShortcut.ctrlKey && 
        e.shiftKey === corrigirTudoShortcut.shiftKey && 
        e.key.toLowerCase() === corrigirTudoShortcut.key) {
        e.preventDefault();
        e.stopPropagation();
        if (errosGlobais.length > 0 && elementoGlobal) {
            corrigirTudo();
        }
        return;
    }
    
    // 2.4 ATIVAR extensão no site atual
if (e.altKey === ativarShortcut.altKey && 
    e.ctrlKey === ativarShortcut.ctrlKey && 
    e.shiftKey === ativarShortcut.shiftKey && 
    e.key.toLowerCase() === ativarShortcut.key) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!smConfig.disabled) {
        mostrarFeedback('✅ SyntaxMentor já está ATIVADO neste site', 'info');
        return;
    }
    
    smConfig.disabled = false;
    
    enviarMensagemSegura({ 
        action: 'toggleSiteGlobal', 
        enabled: true,
        host: window.location.hostname 
    });
    
    const campoAtivo = document.activeElement;
    if (campoAtivo && (campoAtivo.tagName === 'TEXTAREA' || campoAtivo.tagName === 'INPUT' || campoAtivo.isContentEditable)) {
        const texto = campoAtivo.value || campoAtivo.textContent || campoAtivo.innerText || '';
        if (texto.trim().length > 1) {
            textoUltimaVerificacao = texto;
            elementoGlobal = campoAtivo;
            verificarTexto(texto, campoAtivo);
        }
    }
    
    const bubble = document.getElementById('syntax-mentor-bubble');
    if (bubble) bubble.style.display = 'flex';
    
    mostrarFeedback('✅ SyntaxMentor ATIVADO neste site', 'success');
    // ❌ REMOVA: mostrarNotificacaoTemp('ATIVADO', '#28a745');
    atualizarBadgeBackground(errosGlobais.length);
    return;
}

// 2.5 DESATIVAR extensão no site atual
if (e.altKey === desativarShortcut.altKey && 
    e.ctrlKey === desativarShortcut.ctrlKey && 
    e.shiftKey === desativarShortcut.shiftKey && 
    e.key.toLowerCase() === desativarShortcut.key) {
    e.preventDefault();
    e.stopPropagation();
    
    if (smConfig.disabled) {
        mostrarFeedback('⛔ SyntaxMentor já está DESATIVADO neste site', 'info');
        return;
    }
    
    smConfig.disabled = true;
    
    enviarMensagemSegura({ 
        action: 'toggleSiteGlobal', 
        enabled: false,
        host: window.location.hostname 
    });
    
    if (elementoGlobal && elementoGlobal.isContentEditable && !isSiteRestrito) {
        elementoGlobal.innerHTML = elementoGlobal.innerHTML.replace(/<mark class="sm-highlight">(.*?)<\/mark>/gi, '$1');
        atualizarElementoComEventos(elementoGlobal);
    }
    
    errosGlobais = [];
    fecharPainel();
    
    const bubble = document.getElementById('syntax-mentor-bubble');
    if (bubble) bubble.style.display = 'none';
    
    mostrarFeedback('⛔ SyntaxMentor DESATIVADO neste site', 'info');
    // ❌ REMOVA: mostrarNotificacaoTemp('DESATIVADO', '#6b7280');
    resetarBadgeBackground();
    return;
}
}, true); // capture: true — recebe o evento antes dos listeners do site

/**
 * Mostra notificação temporária na tela (para atalhos)
 * @param {string} texto - Texto da notificação (ATIVADO/DESATIVADO)
 * @param {string} cor - Cor de fundo
 */
function mostrarNotificacaoTemp(texto, cor) {
    // Remove notificações anteriores
    const notifAnterior = document.querySelector('.sm-notification-temp');
    if (notifAnterior) notifAnterior.remove();
    
    const notif = document.createElement('div');
    notif.className = 'sm-notification-temp';
    notif.textContent = texto;
    notif.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: ${cor};
        color: white;
        font-size: 48px;
        font-weight: bold;
        padding: 24px 48px;
        border-radius: 16px;
        z-index: 2147483647;
        font-family: 'Segoe UI', sans-serif;
        text-align: center;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        animation: sm-notif-fade 1.5s ease-out forwards;
        pointer-events: none;
    `;
    document.body.appendChild(notif);
    
    setTimeout(() => {
        if (notif.parentNode) notif.remove();
    }, 1500);
}

// Adicionar animação no CSS se não existir
if (!document.querySelector('#sm-notif-style')) {
    const style = document.createElement('style');
    style.id = 'sm-notif-style';
    style.textContent = `
        @keyframes sm-notif-fade {
            0% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.8);
            }
            20% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            80% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
            }
            100% {
                opacity: 0;
                transform: translate(-50%, -50%) scale(1.2);
            }
        }
    `;
    document.head.appendChild(style);
}

// =============================================
// LISTENERS DE INPUT
// =============================================

document.addEventListener('input', (e) => {
    if (smConfig.disabled) return;

    let el = e.target;
    if (el.closest?.('[contenteditable="true"]')) {
        el = el.closest('[contenteditable="true"]');
    }

    const valido = el.tagName === 'TEXTAREA' ||
                   el.isContentEditable ||
                   el.getAttribute?.('contenteditable') === 'true' ||
                   (el.tagName === 'INPUT' && ['text', 'search', 'url', 'email'].includes(el.type));

    if (!valido) return;
    if (el.tagName === 'INPUT' && smConfig.strictMode) return;

    // Detectar input de voz — aplica perfil específico para transcrição
    const isVoz = e.inputType === 'insertFromSpeech' || e.inputType === 'insertFromVoice';
    el._smModoVoz = isVoz;

    usuarioDigitando = true;
    atualizarVisibilidadeBolha();

    if (currentFetchController) {
        currentFetchController.abort();
        currentFetchController = null;
    }

    filaRequisicoes = [];
    processandoFila = false;

    clearTimeout(timeoutDigitacao);
    timeoutDigitacao = setTimeout(() => {
        usuarioDigitando = false;

        const texto = (el.value || el.textContent || el.innerText || '').trim();

        if (texto.length <= 1) {
            errosGlobais = [];
            atualizarInterface();

            if (!isSiteRestrito && el.isContentEditable) {
                el.innerHTML = el.innerHTML.replace(/<mark class="sm-highlight">(.*?)<\/mark>/gi, '$1');
                atualizarElementoComEventos(el);
            }

            atualizarVisibilidadeBolha();
            return;
        }

        if (texto === ultimoTextoValido && errosGlobais.length > 0) {
            atualizarVisibilidadeBolha();
            return;
        }

        ultimoTextoValido = texto;
        textoUltimaVerificacao = texto;

        if (!idiomaSugerido) verificarIdioma(texto);

        filaRequisicoes.push({ texto, el });
        processarFilaRequisicoes();
        atualizarVisibilidadeBolha();
    }, parseInt(smConfig.speed) || 500);
}, true);

// =============================================
// CONTEXT MENU HANDLER
// =============================================

if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'togglePainel') {
            if (painelAberto) fecharPainel(); else exibirPainel();
            sendResponse({ success: true });
            return true;
        }

        if (request.action === 'ignorarErroAtual') {
            if (errosGlobais.length > 0) {
                const primeiro = errosGlobais[0];
                const palavra = primeiro.context.text.substr(primeiro.context.offset, primeiro.context.length);
                ignorarTemporariamente(palavra);
            }
            sendResponse({ success: true });
            return true;
        }

        if (request.action === 'getErrosAtivos') {
            const erros = errosGlobais.slice(0, 10).map(e => ({
                original: e.context.text.substr(e.context.offset, e.context.length),
                sugestao: e.replacements?.[0]?.value || '',
                message: e.message || ''
            })).filter(e => e.original && e.sugestao && e.original !== e.sugestao);
            sendResponse({ erros, total: erros.length });
            return true;
        }

        if (request.action === 'aplicarCorrecaoPopup') {
            const { original, sugestao } = request;
            if (elementoGlobal && original && sugestao) {
                aplicarCorrecao(original, sugestao, elementoGlobal, true);
            }
            sendResponse({ success: true });
            return true;
        }

        if (request.action === 'revisarSelecao' && request.texto) {
            const texto = request.texto.trim();
            const sel = window.getSelection();
            const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).getBoundingClientRect() : null;

            // Criar elemento temporário para verificação
            const div = document.createElement('div');
            div.contentEditable = 'true';
            div.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
            div.textContent = texto;
            document.body.appendChild(div);

            textoUltimaVerificacao = texto;
            elementoGlobal = div;

            // Mostrar tooltip de loading próxima à seleção
            const tooltip = document.createElement('div');
            tooltip.id = 'sm-selecao-tooltip';
            tooltip.style.cssText = `
                position:fixed;z-index:2147483647;background:#1a1a2e;color:#fff;
                border-radius:10px;padding:12px 16px;font-size:13px;
                font-family:'Segoe UI',system-ui,sans-serif;max-width:320px;
                box-shadow:0 8px 32px rgba(0,0,0,.25);
                top:${range ? Math.max(10, range.top - 80) : 100}px;
                left:${range ? Math.min(window.innerWidth - 340, range.left) : 100}px;
            `;
            tooltip.innerHTML = '<div style="text-align:center;padding:4px">⏳ Verificando seleção...</div>';
            document.body.appendChild(tooltip);

            verificarTexto(texto, div).then(() => {
                document.body.removeChild(div);
                if (errosGlobais.length === 0) {
                    tooltip.innerHTML = '<div style="text-align:center;color:#4ade80">✅ Nenhum erro encontrado!</div>';
                    setTimeout(() => tooltip.remove(), 2500);
                    return;
                }
                // Exibir erros na tooltip
                const itens = errosGlobais.slice(0, 4).map(e => {
                    const orig = e.context.text.substr(e.context.offset, e.context.length);
                    const sug = e.replacements?.[0]?.value || '';
                    return orig && sug ? `
                        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid rgba(255,255,255,.1)">
                            <span style="color:#f87171;text-decoration:line-through">${escapeHtml(orig)}</span>
                            <span style="color:#9ca3af">→</span>
                            <span style="color:#4ade80">${escapeHtml(sug)}</span>
                        </div>` : '';
                }).filter(Boolean).join('');

                tooltip.innerHTML = `
                    <div style="font-size:11px;font-weight:500;color:#a78bfa;margin-bottom:4px">${errosGlobais.length} ERRO${errosGlobais.length > 1 ? 'S' : ''} ENCONTRADO${errosGlobais.length > 1 ? 'S' : ''}</div>
                    ${itens}
                    <div style="margin-top:8px;text-align:right">
                        <button id="sm-tooltip-fechar" style="background:rgba(255,255,255,.1);border:none;color:#fff;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px">Fechar</button>
                        <button id="sm-tooltip-abrir" style="background:#6f42c1;border:none;color:#fff;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px;margin-left:6px">Ver no painel</button>
                    </div>`;

                tooltip.querySelector('#sm-tooltip-fechar')?.addEventListener('click', () => tooltip.remove());
                tooltip.querySelector('#sm-tooltip-abrir')?.addEventListener('click', () => { tooltip.remove(); exibirPainel(); });
                setTimeout(() => tooltip.remove(), 8000);
            }).catch(() => {
                document.body.removeChild(div);
                tooltip.remove();
            });

            sendResponse({ success: true });
            return true;
        }

        if (request.action === 'ignorarTemporariamente' && request.palavra) {
            ignorarTemporariamente(request.palavra);
            sendResponse({ success: true });
            return true;
        }

        if (request.action === 'corrigirTudo') {
            if (errosGlobais.length > 0 && elementoGlobal) corrigirTudo();
            sendResponse({ success: true });
            return true;
        }

        if (request.action === 'revisarPaginaInteira') {
            revisarPaginaInteira();
            sendResponse({ success: true });
            return true;
        }

        if (request.action === 'toggleSite') {
            atualizarEstadoExtensao(request.enabled);
            sendResponse({ success: true });
            return true;
        }

        if (request.action === 'siteToggled') {
            atualizarEstadoExtensao(request.enabled);
            sendResponse({ success: true });
            return true;
        }

        return false;

        if (request.action === 'lerTexto' && request.texto) {
            if (smTTS) {
                smTTS.falar(request.texto);
                mostrarFeedback('🔊 Lendo texto selecionado...', 'info');
            }
            sendResponse({ success: true });
            return true;
        }
    });
}

// Carregar módulo offline
const offlineScript = document.createElement('script');
offlineScript.src = chrome.runtime.getURL('js/offline-grammar.js');
(document.head || document.documentElement).appendChild(offlineScript);

// =============================================
// INICIALIZAÇÃO
// =============================================

/**
 * Inicializa a extensão na página
 */
function carregarSmConfig(callback) {
    storageGetSeguro({
        language: 'pt-BR',
        pickyMode: true,
        speed: 500,
        darkMode: false,
        blacklist: [],
        apiUrl: '',
        apiKey: '',
        strictMode: false,
        disabled: false,
        autoHideBubble: false,
        modoConfirmacao: false,
        modoLeituraGlobal: false,
        modoLeituraSites: [],
        modoWhitelist: false,
        whitelist: [],
        erroMaisComum: {},
        modoFoco: false,
        modoAprendizado: false,
        userBlacklistOverrides: [],
        toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's' },
        ignoreShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 'i' },
        corrigirTudoShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 's' },
        ativarShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 'a' },
        desativarShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 'd' }
    }, (res) => {
        Object.assign(smConfig, res);
        dicCache = (res.dicionario_pessoal || []).map(w => w.toLowerCase());

        // Verificar override do usuario para este site
        const host = window.location.hostname;
        const overrides = res.userBlacklistOverrides || [];
        if (overrides.includes(host)) {
            smConfig.disabled = true;
        } else if (res.modoWhitelist) {
            smConfig.disabled = !(res.whitelist || []).some(d => host.includes(d));
        } else {
            smConfig.disabled = (res.blacklist || []).some(d => host.includes(d));
        }

        // apiKey: tentar session storage (disponível em páginas da extensão),
        // mas no content script usar o valor já carregado do local storage
        try {
            if (chrome.storage.session) {
                chrome.storage.session.get({ apiKey: '' }, (sess) => {
                    if (!chrome.runtime.lastError && sess?.apiKey) {
                        smConfig.apiKey = sess.apiKey;
                    }
                    if (callback) callback();
                });
            } else {
                if (callback) callback();
            }
        } catch (e) {
            // session storage indisponível no content script — usar local
            if (callback) callback();
        }
    });
}

function iniciar() {
    if (!isExtensaoAtiva()) {
        setTimeout(iniciar, 2000);
        return;
    }

    carregarSmConfig(() => {
        // Carregar API Publica
        carregarPublicAPI();

        observarShadowDOM();
        observarIframes();

        // Reagir a mudancas de configuracao em tempo real
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace !== 'local') return;
            const campos = ['language','pickyMode','speed','darkMode','blacklist','apiUrl','apiKey',
                'strictMode','disabled','autoHideBubble','modoConfirmacao','modoLeituraGlobal',
                'modoLeituraSites','modoWhitelist','whitelist','modoFoco','modoAprendizado',
                'userBlacklistOverrides','toggleShortcut','ignoreShortcut','corrigirTudoShortcut',
                'ativarShortcut','desativarShortcut'];
            campos.forEach(k => {
                if (changes[k] !== undefined) smConfig[k] = changes[k].newValue;
            });
            // Atualizar cache do dicionario pessoal
            if (changes.dicionario_pessoal !== undefined) {
                dicCache = (changes.dicionario_pessoal.newValue || []).map(w => w.toLowerCase());
            }
            // Reavalia se o site esta bloqueado apos mudanca
            const host = window.location.hostname;
            const overrides = smConfig.userBlacklistOverrides || [];
            if (overrides.includes(host)) {
                smConfig.disabled = true;
            } else if (smConfig.modoWhitelist) {
                smConfig.disabled = !(smConfig.whitelist || []).some(d => host.includes(d));
            } else {
                smConfig.disabled = (smConfig.blacklist || []).some(d => host.includes(d));
            }
        });
    });
}

/**
 * Carrega a API Pública no window
 */
function carregarPublicAPI() {
    if (window.SyntaxMentor) return;
    
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('js/public-api.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
}

// =============================================
// CLEANUP - LIMPEZA DE OBSERVADORES
// =============================================

/**
 * Limpa todos os observadores quando a página for descarregada
 */
function limparObservadores() {
    // Cancelar todos os timers pendentes
    smTimers.forEach(id => clearTimeout(id));
    smTimers = [];

    if (iframeObserver) {
        iframeObserver.disconnect();
        iframeObserver = null;
    }

    // Limpar WeakSet (não precisa de cleanup explícito, mas ajuda o GC)
    if (processedIframes) {
        processedIframes = new WeakSet();
    }

    if (currentFetchController) {
        currentFetchController.abort();
        currentFetchController = null;
    }
}

// Registrar cleanup quando a página for fechada ou navegar
window.addEventListener('beforeunload', () => {
    limparObservadores();
});

// Usar pagehide em vez de unload (política mais moderna)
window.addEventListener('pagehide', () => {
    limparObservadores();
});

// Para navegação SPA (Single Page Application)
window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        limparObservadores();
    }
});

// =============================================
// VERIFICAÇÃO PERIÓDICA DA EXTENSÃO
// =============================================

/**
 * Verifica se a extensão está respondiva
 * @returns {Promise<boolean>}
 */
async function verificarConexaoExtensao() {
    if (!isExtensaoAtiva()) return false;

    try {
        return await new Promise((resolve) => {
            enviarMensagemSegura({ action: 'ping' }, (response) => {
                if (response && response.success) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        });
    } catch (e) {
        console.debug('Erro ao verificar conexão da extensão:', e);
        return false;
    }
}

// Chamar verificação periódica (opcional - a cada 30 segundos)
setInterval(async () => {
    const conectado = await verificarConexaoExtensao();
    if (!conectado && contextoExtensaoValido) {
        contextoExtensaoValido = false;
        console.debug('Extensão parece estar inativa');
    } else if (conectado && !contextoExtensaoValido) {
        contextoExtensaoValido = true;
        console.debug('Extensão reconectada');
    }
}, 30000);

// =============================================
// ANÁLISE DE SENTIMENTO
// =============================================

// Adicionar aba de sentimento no painel
function adicionarAbaSentimento() {
    const painel = document.getElementById('syntax-mentor-painel');
    if (!painel) return;
    
    if (document.getElementById('sm-sentiment-tab')) return;
    
    const tabs = document.createElement('div');
    tabs.id = 'sm-sentiment-tabs';
    tabs.style.cssText = `
        display: flex;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 12px;
    `;
    
    tabs.innerHTML = `
        <button class="sm-tab-btn active" data-tab="grammar">📝 Gramática</button>
        <button class="sm-tab-btn" data-tab="sentiment">😊 Sentimento</button>
        <button class="sm-tab-btn" data-tab="historico">🕓 Histórico</button>
    `;

    const header = painel.querySelector('#syntax-mentor-header');
    if (header) header.insertAdjacentElement('afterend', tabs);

    const content = painel.querySelector('#syntax-mentor-content');
    const sentimentContent = document.createElement('div');
    sentimentContent.id = 'sm-sentiment-content';
    sentimentContent.style.display = 'none';
    sentimentContent.className = 'body-cards';
    const historicoContent = document.createElement('div');
    historicoContent.id = 'sm-historico-content';
    historicoContent.style.display = 'none';
    historicoContent.className = 'body-cards';
    content.parentNode.insertBefore(sentimentContent, content.nextSibling);
    content.parentNode.insertBefore(historicoContent, sentimentContent.nextSibling);

    function renderizarHistorico() {
        if (historicoCorrecoes.length === 0) {
            historicoContent.innerHTML = `<div style="text-align:center;padding:40px;color:var(--color-text-secondary)"><div style="font-size:36px;margin-bottom:12px">📭</div><p style="font-size:13px">Nenhuma correção feita ainda nesta sessão.</p></div>`;
            return;
        }
        historicoContent.innerHTML = historicoCorrecoes.slice().reverse().map((item, idx) => {
            const realIdx = historicoCorrecoes.length - 1 - idx;
            const hora = new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return `<div style="background:var(--color-background-secondary);border-radius:var(--border-radius-md);padding:10px 12px;margin-bottom:8px;font-size:13px">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                    <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0">
                        <span style="color:var(--color-text-danger);text-decoration:line-through;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(item.original)}</span>
                        <span style="color:var(--color-text-tertiary)">→</span>
                        <span style="color:var(--color-text-success);max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(item.sugestao)}</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                        <span style="font-size:11px;color:var(--color-text-tertiary)">${hora}</span>
                        <button data-idx="${realIdx}" class="sm-btn-reverter" style="font-size:11px;padding:3px 8px;border-radius:var(--border-radius-sm);border:0.5px solid var(--color-border-secondary);background:var(--color-background-primary);color:var(--color-text-primary);cursor:pointer">↩ Reverter</button>
                    </div>
                </div>
            </div>`;
        }).join('');
        historicoContent.querySelectorAll('.sm-btn-reverter').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const item = historicoCorrecoes[idx];
                if (!item || !item.el) return;
                const el = item.el;
                if (el.value !== undefined) {
                    el.value = el.value.replace(item.sugestao, item.original);
                } else {
                    el.textContent = el.textContent.replace(item.sugestao, item.original);
                }
                dispararEventosNativos(el);
                historicoCorrecoes.splice(idx, 1);
                renderizarHistorico();
                mostrarFeedback(`↩ Revertido: "${item.sugestao}" → "${item.original}"`, 'info');
            });
        });
    }

    tabs.querySelectorAll('.sm-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.querySelectorAll('.sm-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            content.style.display = 'none';
            sentimentContent.style.display = 'none';
            historicoContent.style.display = 'none';
            if (btn.dataset.tab === 'grammar') {
                content.style.display = 'block';
            } else if (btn.dataset.tab === 'sentiment') {
                sentimentContent.style.display = 'block';
                sentimentContent.innerHTML = '<div style="text-align:center;padding:40px;color:var(--color-text-secondary)"><div style="font-size:28px;margin-bottom:12px">⏳</div><p style="font-size:13px">Analisando sentimento...</p></div>';
                requestAnimationFrame(() => atualizarAnaliseSentimento(sentimentContent));
            } else {
                historicoContent.style.display = 'block';
                renderizarHistorico();
            }
        });
    });
}

// Atualizar análise de sentimento
function atualizarAnaliseSentimento(container) {
    if (!elementoGlobal) return;

    const texto = elementoGlobal.value || elementoGlobal.textContent || elementoGlobal.innerText || '';

    if (texto.length < 10) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:var(--color-text-secondary);">
                <div style="font-size:48px;margin-bottom:16px;">📝</div>
                <p>Digite mais texto para analisar o sentimento</p>
                <p style="font-size:12px;">Mínimo de 10 caracteres</p>
            </div>`;
        return;
    }

    // Análise com detecção de negação e intensificadores
    const NEGATIVOS = {
        'ruim':{ score:-0.5, sug:'insatisfatório' }, 'péssimo':{ score:-1, sug:'aquém do esperado' },
        'horrível':{ score:-1, sug:'não ideal' }, 'odeio':{ score:-0.8, sug:'tenho ressalvas sobre' },
        'detesto':{ score:-0.8, sug:'prefiro não' }, 'problema':{ score:-0.4, sug:'desafio' },
        'impossível':{ score:-0.8, sug:'desafiador' }, 'nunca':{ score:-0.3, sug:'ainda não' },
        'falha':{ score:-0.6, sug:'ponto a melhorar' }, 'péssima':{ score:-1, sug:'aquém do esperado' }
    };
    const POSITIVOS = {
        'ótimo':0.6, 'excelente':0.8, 'maravilhoso':0.8, 'perfeito':0.7,
        'incrível':0.7, 'fantástico':0.7, 'bom':0.3, 'boa':0.3, 'adorei':0.7, 'adoro':0.5
    };
    const INTENSIFICADORES = ['muito', 'extremamente', 'super', 'bem', 'bastante', 'tão'];
    const NEGACOES = ['não', 'nunca', 'jamais', 'nem', 'nenhum', 'nada'];

    const tokens = texto.toLowerCase().split(/\s+/);
    let score = 0;
    const issues = [];

    tokens.forEach((token, i) => {
        const limpo = token.replace(/[^a-záéíóúãõâêîôûç]/g, '');
        const prevToken = i > 0 ? tokens[i-1].replace(/\W/g,'') : '';
        const prev2Token = i > 1 ? tokens[i-2].replace(/\W/g,'') : '';
        const negado = NEGACOES.includes(prevToken) || NEGACOES.includes(prev2Token);
        const intensificado = INTENSIFICADORES.includes(prevToken) ? 1.5 : 1;

        if (NEGATIVOS[limpo]) {
            const s = negado ? -NEGATIVOS[limpo].score * 0.7 : NEGATIVOS[limpo].score * intensificado;
            score += s;
            if (!negado) issues.push({ palavra: limpo, sug: NEGATIVOS[limpo].sug, tipo: 'negativo' });
        }
        if (POSITIVOS[limpo]) {
            score += negado ? -POSITIVOS[limpo] * 0.7 : POSITIVOS[limpo] * intensificado;
        }
    });

    // Normalizar score
    const scoreNorm = Math.max(-1, Math.min(1, score / Math.max(tokens.length / 10, 1)));
    const pct = Math.round((scoreNorm + 1) / 2 * 100);

    let label, icon, cor;
    if (scoreNorm < -0.4)      { label = 'Negativo';          icon = '😔'; cor = 'var(--color-text-danger)'; }
    else if (scoreNorm < -0.1) { label = 'Levemente negativo'; icon = '😕'; cor = 'var(--color-text-warning)'; }
    else if (scoreNorm < 0.15) { label = 'Neutro';            icon = '😐'; cor = 'var(--color-text-secondary)'; }
    else if (scoreNorm < 0.5)  { label = 'Levemente positivo'; icon = '🙂'; cor = 'var(--color-text-success)'; }
    else                       { label = 'Positivo';           icon = '😊'; cor = 'var(--color-text-success)'; }

    let html = `
        <div style="text-align:center;margin-bottom:20px;">
            <div style="font-size:52px;margin-bottom:8px;">${icon}</div>
            <p style="font-size:16px;font-weight:500;margin:0 0 4px;color:${cor}">${label}</p>
            <div style="height:8px;background:var(--color-background-secondary);border-radius:4px;margin:12px 20px 0;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${cor};border-radius:4px;transition:width .4s"></div>
            </div>
            <p style="font-size:11px;color:var(--color-text-tertiary);margin:6px 0 0">${pct}% positivo</p>
        </div>`;

    if (issues.length > 0) {
        html += `<div style="font-size:13px;font-weight:500;margin-bottom:8px;color:var(--color-text-primary)">Pontos de atenção</div>`;
        issues.slice(0, 5).forEach(issue => {
            html += `
                <div style="background:var(--color-background-secondary);border-radius:var(--border-radius-md);padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;gap:8px;font-size:13px;">
                    <span style="color:var(--color-text-danger)">"${escapeHtml(issue.palavra)}"</span>
                    <span style="color:var(--color-text-tertiary)">→</span>
                    <span style="color:var(--color-text-success)">"${escapeHtml(issue.sug)}"</span>
                </div>`;
        });
    } else {
        html += `
            <div style="text-align:center;padding:16px;background:var(--color-background-success);border-radius:var(--border-radius-md);">
                <p style="color:var(--color-text-success);margin:0;font-size:13px;">✨ Texto com tom adequado!</p>
            </div>`;
    }

    container.innerHTML = html;
}

// =============================================
// SUGESTÕES DE PALAVRAS (SELEÇÃO DE TEXTO)
// =============================================

document.addEventListener('mouseup', async (e) => {
    // Só mostrar sugestões se o usuário seguiu Alt + clique
    if (!e.altKey) return;
    
    const selection = window.getSelection();
    const textoSelecionado = selection.toString().trim();
    
    if (textoSelecionado && textoSelecionado.split(' ').length === 1) {
        const palavra = textoSelecionado;
        const x = e.clientX;
        const y = e.clientY;
        
        await synonymAPI.mostrarSugestoes(palavra, x, y);
    }
});

// =============================================
// INICIALIZAÇÃO
// =============================================

// Iniciar a extensão
iniciar();