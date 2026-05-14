// =============================================
// SyntaxMentor - content.js v2.7.1 Elite
// Shadow DOM + Digisac + Fila Inteligente + Correção Persistente
// Ctrl+Z + Revisão de Página + Modo Aprendizado + Toggle Site
// Tratamento de Erro Robusto em Todas as Mensagens
// =============================================

// =============================================
// VARIÁVEIS GLOBAIS
// =============================================

let timeoutDigitacao = null;
let errosGlobais = [];
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
// UTILITÁRIOS
// =============================================

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
function mostrarExplicacaoRegra(original, sugestao, mensagem) {
    if (!smConfig.modoAprendizado || !mensagem || mensagem.length < 10) return;

    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.4);
        z-index: 2147483646;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Segoe UI', system-ui, sans-serif;
    `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 28px;
        max-width: 480px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    `;

    if (smConfig.darkMode) {
        dialog.style.background = '#1a1a1a';
        dialog.style.color = '#e0e0e0';
    }

    const mensagemLimpa = mensagem.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    dialog.innerHTML = `
        <div style="text-align:center;margin-bottom:16px;">
            <div style="font-size:40px;margin-bottom:8px;">📚</div>
            <h3 style="margin:0;font-size:18px;">Por que corrigir?</h3>
        </div>
        <div style="background:#f8f9fa;border-radius:12px;padding:16px;margin-bottom:16px;text-align:center;">
            <span style="color:#e53e3e;text-decoration:line-through;font-size:18px;font-weight:600;">${escapeHtml(original)}</span>
            <span style="margin:0 10px;color:#9ca3af;">→</span>
            <span style="color:#28a745;font-size:18px;font-weight:600;">${escapeHtml(sugestao)}</span>
        </div>
        <div style="background:#fef3c7;border-radius:10px;padding:14px;margin-bottom:16px;">
            <p style="margin:0;font-size:13px;line-height:1.6;color:#92400e;">💡 ${mensagemLimpa}</p>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button class="sm-dlg-cancel" style="background:#f3f4f6;border:1px solid #d1d5db;color:#374151;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;">Entendi</button>
        </div>
    `;

    if (smConfig.darkMode) {
        const boxOriginal = dialog.querySelector('div:nth-child(2)');
        const boxExplicacao = dialog.querySelector('div:nth-child(3)');
        if (boxOriginal) boxOriginal.style.background = '#2a2a2a';
        if (boxExplicacao) {
            boxExplicacao.style.background = '#3b2e1a';
            const p = boxExplicacao.querySelector('p');
            if (p) p.style.color = '#fbbf24';
        }
    }

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    dialog.querySelector('.sm-dlg-cancel').onclick = () => overlay.remove();
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };

    setTimeout(() => {
        if (overlay.parentNode) overlay.remove();
    }, 8000);
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
        storageGetSeguro({ totalAceitas: 0 }, (res) => {
            storageSetSeguro({ totalAceitas: (res.totalAceitas || 0) + 1 });
        });
    };

    btnCancel.onclick = () => {
        overlay.remove();
        callback(false);
        storageGetSeguro({ totalRecusadas: 0 }, (res) => {
            storageSetSeguro({ totalRecusadas: (res.totalRecusadas || 0) + 1 });
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
    } catch (e) {}

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

        if (palavraLimpa !== original) {
            const pontuacaoInicio = original.indexOf(palavraLimpa);
            novoMatch.context = {
                ...match.context,
                offset: match.context.offset + pontuacaoInicio,
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
        { regex: /\s+\./g, msg: 'Espaço desnecessário antes do ponto final', replace: '.' },
        { regex: /\s+,/g, msg: 'Espaço desnecessário antes da vírgula', replace: ',' },
        { regex: /\.\./g, msg: 'Pontuação duplicada. Use apenas um ponto.', replace: '.' },
        { regex: /,([a-zA-Zà-úÀ-Ú])/g, msg: 'Falta um espaço após a vírgula', replace: (m, p1) => ', ' + p1 },
        { regex: /([!?])([a-zA-Zà-úÀ-Ú])/g, msg: 'Falta um espaço após o sinal', replace: (m, p1, p2) => p1 + ' ' + p2 }
    ];

    regras.forEach(regra => {
        const matches = texto.match(regra.regex);
        if (matches) {
            matches.forEach(match => {
                const pos = texto.indexOf(match);
                if (pos >= 0) {
                    errosPontuacao.push({
                        context: { text: texto, offset: pos, length: match.length },
                        message: regra.msg,
                        replacements: [{ value: typeof regra.replace === 'function' ? regra.replace(match) : regra.replace }],
                        rule: { category: { name: 'Pontuação' } }
                    });
                }
            });
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
                    <p class="erro-msg" title="${info.msg.replace(/"/g, '&quot;')}">Erro: <strong>${o}</strong></p>
                    ${preview ? `<p style="font-size:10px;color:#9ca3af;margin:4px 0;font-style:italic;">...${preview.replace(o, '<span style="color:#e53e3e;text-decoration:underline;">' + o + '</span>')}...</p>` : ''}
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
    if (idiomaSugerido || texto.length < 30) return;

    try {
        const response = await new Promise((resolve) => {
            if (!isExtensaoAtiva()) {
                resolve(null);
                return;
            }
            enviarMensagemSegura({ action: 'detectLanguage', text: texto.substring(0, 500) }, resolve);
        });

        if (response?.success && response.language) {
            const idiomaDetectado = response.language;
            const idiomaAtual = smConfig.language;

            if (idiomaDetectado !== idiomaAtual) {
                const nomes = {
                    'pt-BR': 'Português',
                    'en-US': 'Inglês',
                    'es': 'Espanhol',
                    'fr': 'Francês',
                    'de': 'Alemão',
                    'it': 'Italiano'
                };

                mostrarSugestaoIdioma(
                    `Parece que está escrevendo em ${nomes[idiomaDetectado] || idiomaDetectado}.`,
                    `Mudar de ${nomes[idiomaAtual] || idiomaAtual}?`,
                    idiomaDetectado
                );

                idiomaSugerido = true;
            }
        }
    } catch (e) {
        console.debug('Erro ao detectar idioma:', e);
    }
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

        // 🔧 CORREÇÃO: Carregar dicionário de forma assíncrona correta
        let dic = [];
        if (isExtensaoAtiva()) {
            await new Promise((resolve) => {
                storageGetSeguro(['dicionario_pessoal'], (res) => {
                    dic = (res.dicionario_pessoal || []).map(w => w.toLowerCase());
                    resolve();
                });
            });
        }

        const matchesProcessados = processarPontuacao(data.matches || []);
        const errosPontuacaoLocal = verificarPontuacaoComum(texto);
        const todosMatches = [...matchesProcessados, ...errosPontuacaoLocal];

        errosGlobais = todosMatches.filter(m => {
            if (!m.replacements?.length) return false;

            const o = m.context.text.substr(m.context.offset, m.context.length);
            const ol = o.toLowerCase();

            if (o.trim() && !ol.match(/^[0-9]+$/)) {
                erroMaisComumTemp[ol] = (erroMaisComumTemp[ol] || 0) + 1;
                storageSetSeguro({ erroMaisComum: erroMaisComumTemp });
            }

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
        
        // 🔧 MELHORIA: Mensagens de erro mais específicas
        let mensagemErro = '⚠️ Erro de conexão';
        if (err.message.includes('API Key inválida')) {
            mensagemErro = '🔑 API Key inválida - Verifique suas configurações';
        } else if (err.message.includes('Muitas requisições')) {
            mensagemErro = '⏳ Muitas correções seguidas - Aguarde um momento';
        } else if (err.message.includes('Timeout')) {
            mensagemErro = '⏱️ Servidor demorou muito para responder - Tente novamente';
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
        
        incrementarStats(1);
        
        if (smConfig.modoAprendizado) {
            const erroEncontrado = errosGlobais.find(e => {
                const o = e.context.text.substr(e.context.offset, e.context.length);
                return o === original;
            });
            
            if (erroEncontrado && erroEncontrado.message) {
                setTimeout(() => {
                    mostrarExplicacaoRegra(original, sugestao, erroEncontrado.message);
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
        setTimeout(() => {
            bubble.classList.remove('sm-bubble-correction');
        }, 300);
    }
    
    storageGetSeguro({ totalCorrigidas: 0, dicionario_pessoal: [] }, (res) => {
        const novoTotal = (res.totalCorrigidas || 0) + qtd;
        storageSetSeguro({ totalCorrigidas: novoTotal });
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
        mostrarFeedback('✓ Tudo corrigido!', 'success');
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
        mostrarFeedback('✓ Tudo corrigido!', 'success');
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
    const conquistas = [
        { id: 'primeira', nome: '🏆 Primeira Correção!', condicao: totalCorrigidas >= 1 },
        { id: '10correcoes', nome: '⭐ 10 Correções!', condicao: totalCorrigidas >= 10 },
        { id: '50correcoes', nome: '🔥 50 Correções!', condicao: totalCorrigidas >= 50 },
        { id: '100correcoes', nome: '💎 100 Correções!', condicao: totalCorrigidas >= 100 },
        { id: '500correcoes', nome: '👑 500 Correções!', condicao: totalCorrigidas >= 500 },
        { id: '1000correcoes', nome: '🌟 1000 Correções! Lendário!', condicao: totalCorrigidas >= 1000 },
        { id: '10dic', nome: '📖 10 Palavras no Dicionário!', condicao: dicSize >= 10 }
    ];

    const novasConquistas = conquistas.filter(c => c.condicao && !conquistasNotificadas[c.id]);

    if (novasConquistas.length > 0) {
        novasConquistas.forEach(c => { conquistasNotificadas[c.id] = true; });

        if (isExtensaoAtiva()) {
            storageSetSeguro({ conquistasNotificadas });
        }

        mostrarNotificacaoConquista(novasConquistas[novasConquistas.length - 1].nome);

        if (novasConquistas.length > 1) {
            setTimeout(() => mostrarNotificacaoConquista(`🎉 +${novasConquistas.length - 1} conquista(s)!`), 3500);
        }
    }
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

        bubble.addEventListener('click', () => {
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
                <button id="btn-corrigir-tudo">✨ Corrigir Tudo (${total})</button>
                <button id="btn-ignorar-tudo">Ignorar Tudo</button>
            </div>
    `;

    if (historicoDesfazer.length > 0) {
        html += `
            <div style="text-align:center;margin-top:8px;">
                <button id="btn-desfazer-ultima" 
                        style="background:none;border:1px solid #d1d5db;color:#6b7280;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;transition:all 0.2s;"
                        onmouseover="this.style.background='#f3f4f6';this.style.color='#374151'"
                        onmouseout="this.style.background='none';this.style.color='#6b7280'">
                    ↩ Desfazer Última Correção (Ctrl+Z)
                </button>
            </div>
        `;
    }

    html += `
            ${ignoradosTemporarios.length ? `<div style="text-align:center;font-size:10px;color:#9ca3af;margin-top:8px;">📋 ${ignoradosTemporarios.length} ignorada(s)</div>` : ''}
            ${isModoLeitura() ? `<div style="text-align:center;font-size:10px;color:#f59e0b;margin-top:4px;">⚠️ Modo Leitura ativo</div>` : ''}
            <div style="text-align:center;font-size:10px;color:#9ca3af;margin-top:4px;">
                Alt+Shift+S = corrigir | Ctrl+Z = desfazer | Botão direito = revisar
            </div>
        </div>
    `;

    painel.innerHTML = html;
    tornarArrastavelPainel(painel, document.getElementById('syntax-mentor-header'));

    document.getElementById('btn-fechar-painel').onclick = fecharPainel;
    document.getElementById('btn-corrigir-tudo').onclick = corrigirTudo;
    document.getElementById('btn-ignorar-tudo').onclick = limparTudo;

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

    const btnDesfazer = document.getElementById('btn-desfazer-ultima');
    if (btnDesfazer) {
        btnDesfazer.addEventListener('click', () => {
            desfazerUltimaCorrecao();
            if (elementoGlobal && textoUltimaVerificacao) {
                verificarTexto(textoUltimaVerificacao, elementoGlobal);
            }
        });
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

     adicionarAbaSentimento();
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
 * Torna um elemento arrastável
 * @param {HTMLElement} el - Elemento a ser arrastado
 */
function tornarArrastavel(el) {
    let p1, p2, p3, p4;

    el.onmousedown = e => {
        e.preventDefault();
        isDraggingBubble = false;
        p3 = e.clientX;
        p4 = e.clientY;

        document.onmousemove = e2 => {
            e2.preventDefault();
            isDraggingBubble = true;
            p1 = p3 - e2.clientX;
            p2 = p4 - e2.clientY;
            p3 = e2.clientX;
            p4 = e2.clientY;

            el.style.top = (el.offsetTop - p2) + 'px';
            el.style.left = (el.offsetLeft - p1) + 'px';
            el.style.right = 'auto';
            el.style.bottom = 'auto';

            bubblePosX = el.style.left;
            bubblePosY = el.style.top;
        };

        document.onmouseup = () => {
            document.onmousemove = null;
            setTimeout(() => isDraggingBubble = false, 100);
        };
    };
}

/**
 * Torna o painel arrastável pela header
 * @param {HTMLElement} painel - Painel a ser arrastado
 * @param {HTMLElement} handle - Elemento que controla o arraste
 */
function tornarArrastavelPainel(painel, handle) {
    if (!handle) return;

    let p1, p2, p3, p4;

    handle.onmousedown = e => {
        e.preventDefault();
        p3 = e.clientX;
        p4 = e.clientY;

        document.onmousemove = e2 => {
            e2.preventDefault();
            p1 = p3 - e2.clientX;
            p2 = p4 - e2.clientY;
            p3 = e2.clientX;
            p4 = e2.clientY;

            painel.style.top = (painel.offsetTop - p2) + 'px';
            painel.style.left = (painel.offsetLeft - p1) + 'px';
        };

        document.onmouseup = () => {
            document.onmousemove = null;
        };
    };
}

// =============================================
// ATALHOS DE TECLADO
// =============================================

document.addEventListener('keydown', (e) => {
    if (smConfig.disabled || window !== window.top) return;

    if (e.ctrlKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (historicoDesfazer.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            desfazerUltimaCorrecao();
            if (elementoGlobal && textoUltimaVerificacao) {
                verificarTexto(textoUltimaVerificacao, elementoGlobal);
            }
            return;
        }
    }

    const scT = smConfig.toggleShortcut || { altKey: true, ctrlKey: false, shiftKey: false, key: 's' };
    const scI = smConfig.ignoreShortcut || { altKey: true, ctrlKey: false, shiftKey: false, key: 'i' };
    const scCT = smConfig.corrigirTudoShortcut || { altKey: true, ctrlKey: false, shiftKey: true, key: 's' };

    if (e.altKey === scT.altKey && e.ctrlKey === scT.ctrlKey && e.shiftKey === scT.shiftKey && e.key.toLowerCase() === scT.key) {
        e.preventDefault();
        e.stopPropagation();
        if (errosGlobais.length > 0) {
            painelAberto ? fecharPainel() : exibirPainel();
        }
    }

    if (e.altKey === scI.altKey && e.ctrlKey === scI.ctrlKey && e.shiftKey === scI.shiftKey && e.key.toLowerCase() === scI.key) {
        e.preventDefault();
        e.stopPropagation();
        limparTudo();
    }

    if (e.altKey === scCT.altKey && e.ctrlKey === scCT.ctrlKey && e.shiftKey === scCT.shiftKey && e.key.toLowerCase() === scCT.key) {
        e.preventDefault();
        e.stopPropagation();
        if (errosGlobais.length > 0 && elementoGlobal) {
            corrigirTudo();
        }
    }

    if (e.key === 'Escape' && painelAberto) {
        fecharPainel();
    }

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
    }
});

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
        if (request.action === 'revisarSelecao' && request.texto) {
            const div = document.createElement('div');
            div.contentEditable = 'true';
            div.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
            div.textContent = request.texto;
            document.body.appendChild(div);

            textoUltimaVerificacao = request.texto;
            elementoGlobal = div;

            verificarTexto(request.texto, div);

            setTimeout(() => {
                if (errosGlobais.length > 0) exibirPainel();
                document.body.removeChild(div);
            }, 1500);
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
    });
}

// =============================================
// INICIALIZAÇÃO
// =============================================

/**
 * Inicializa a extensão na página
 */
function iniciar() {
    if (!isExtensaoAtiva()) {
        setTimeout(iniciar, 2000);
        return;
    }

    observarShadowDOM();
    observarIframes();

    storageGetSeguro(
        [
            'language', 'pickyMode', 'speed', 'darkMode', 'blacklist',
            'apiUrl', 'apiKey', 'strictMode', 'toggleShortcut',
            'ignoreShortcut', 'corrigirTudoShortcut', 'autoHideBubble',
            'modoConfirmacao', 'modoLeituraGlobal', 'modoLeituraSites',
            'modoWhitelist', 'whitelist', 'erroMaisComum',
            'conquistasNotificadas', 'modoFoco', 'modoAprendizado'
        ],
        (res) => {
            smConfig = { ...smConfig, ...res };
            conquistasNotificadas = res.conquistasNotificadas || {};
            erroMaisComumTemp = res.erroMaisComum || {};

            const host = window.location.hostname;

            smConfig.disabled = smConfig.modoWhitelist
                ? !(smConfig.whitelist || []).some(d => host.includes(d))
                : (smConfig.blacklist || []).some(d => host.includes(d));

            if (smConfig.disabled) resetarBadgeBackground();
            if (smConfig.darkMode) document.body.classList.add('sm-dark-root');
        }
    );

    try {
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.darkMode) {
                smConfig.darkMode = changes.darkMode.newValue;
                document.body.classList.toggle('sm-dark-root', smConfig.darkMode);
                atualizarInterface();
            }

            if (changes.blacklist || changes.modoWhitelist || changes.whitelist) {
                smConfig.blacklist = changes.blacklist?.newValue || smConfig.blacklist;
                smConfig.modoWhitelist = changes.modoWhitelist?.newValue ?? smConfig.modoWhitelist;
                smConfig.whitelist = changes.whitelist?.newValue || smConfig.whitelist;

                const host = window.location.hostname;
                smConfig.disabled = smConfig.modoWhitelist
                    ? !(smConfig.whitelist || []).some(d => host.includes(d))
                    : (smConfig.blacklist || []).some(d => host.includes(d));

                if (smConfig.disabled) resetarBadgeBackground();
            }

            if (changes.conquistasNotificadas) {
                conquistasNotificadas = changes.conquistasNotificadas.newValue || {};
            }

            if (changes.erroMaisComum) {
                erroMaisComumTemp = changes.erroMaisComum.newValue || {};
            }

            if (changes.modoFoco) {
                smConfig.modoFoco = changes.modoFoco.newValue;
                if (!smConfig.modoFoco) {
                    modoFocoAtivo = false;
                    desativarModoFoco();
                    clearTimeout(timeoutFoco);
                }
            }

            if (changes.modoAprendizado) {
                smConfig.modoAprendizado = changes.modoAprendizado.newValue;
            }
        });
    } catch (e) {
        console.debug('Erro ao configurar storage listener:', e);
    }
}

// =============================================
// CLEANUP - LIMPEZA DE OBSERVADORES
// =============================================

/**
 * Limpa todos os observadores quando a página for descarregada
 */
function limparObservadores() {
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

// Registrar cleanup antes da página fechar
window.addEventListener('beforeunload', () => {
    limparObservadores();
});

// Também limpar quando a página for descarregada (para navegação SPA)
window.addEventListener('unload', () => {
    limparObservadores();
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
    `;
    
    const header = painel.querySelector('#syntax-mentor-header');
    if (header) {
        header.insertAdjacentElement('afterend', tabs);
    }
    
    const content = painel.querySelector('#syntax-mentor-content');
    const sentimentContent = document.createElement('div');
    sentimentContent.id = 'sm-sentiment-content';
    sentimentContent.style.display = 'none';
    sentimentContent.className = 'body-cards';
    
    content.parentNode.insertBefore(sentimentContent, content.nextSibling);
    
    tabs.querySelectorAll('.sm-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.querySelectorAll('.sm-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.dataset.tab === 'grammar') {
                content.style.display = 'block';
                sentimentContent.style.display = 'none';
            } else {
                content.style.display = 'none';
                sentimentContent.style.display = 'block';
                atualizarAnaliseSentimento(sentimentContent);
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
            <div style="text-align:center;padding:40px;color:#888;">
                <div style="font-size:48px;margin-bottom:16px;">📝</div>
                <p>Digite mais texto para analisar o sentimento</p>
                <p style="font-size:12px;">Mínimo de 10 caracteres</p>
            </div>
        `;
        return;
    }
    
    // Análise simples de sentimento
    const negativeWords = ['ruim', 'péssimo', 'horrível', 'odeio', 'detesto', 'problema', 'erro', 'falha'];
    const positiveWords = ['ótimo', 'excelente', 'bom', 'maravilhoso', 'perfeito'];
    
    let score = 0;
    const issues = [];
    const lowerText = texto.toLowerCase();
    
    negativeWords.forEach(word => {
        if (lowerText.includes(word)) {
            score -= 0.5;
            issues.push({
                word: word,
                suggestion: word === 'ruim' ? 'insatisfatório' : 
                           word === 'problema' ? 'desafio' :
                           word === 'erro' ? 'ajuste' : 'melhorar',
                message: `Palavra negativa: "${word}"`
            });
        }
    });
    
    positiveWords.forEach(word => {
        if (lowerText.includes(word)) score += 0.3;
    });
    
    let sentiment = score < -0.5 ? 'negativo' : score > 0.3 ? 'positivo' : 'neutro';
    let sentimentIcon = sentiment === 'negativo' ? '😔' : sentiment === 'positivo' ? '😊' : '😐';
    let scoreColor = sentiment === 'negativo' ? '#e53e3e' : sentiment === 'positivo' ? '#28a745' : '#6b7280';
    
    let html = `
        <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:64px;">${sentimentIcon}</div>
            <h3 style="margin:8px 0 4px;">Sentimento: ${sentiment}</h3>
            <p style="color:${scoreColor};font-weight:bold;">Score: ${score}</p>
        </div>
    `;
    
    if (issues.length > 0) {
        html += `<div><h4>🔍 Pontos de atenção:</h4>`;
        issues.forEach(issue => {
            html += `
                <div style="background:#f8f9fa;border-radius:8px;padding:12px;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <strong>"${issue.word}"</strong> <span>→</span> 
                        <span style="color:#28a745;">"${issue.suggestion}"</span>
                    </div>
                    <p style="margin:0;font-size:12px;color:#666;">${issue.message}</p>
                </div>
            `;
        });
        html += `</div>`;
    } else {
        html += `
            <div style="text-align:center;padding:20px;background:#f0fdf4;border-radius:12px;">
                <p style="color:#166534;">✨ Texto com tom adequado!</p>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// =============================================
// INICIALIZAÇÃO
// =============================================

// Iniciar a extensão
iniciar();