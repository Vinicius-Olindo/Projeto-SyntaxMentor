// =============================================
// SyntaxMentor - 2.6.0 - (Shadow DOM + Digisac + Fila Inteligente + Correção Persistente)
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

// Sistema de fila inteligente
let filaRequisicoes = [];
let processandoFila = false;
let ultimoTextoValido = '';

const sitesSemGrifos = ['mail.google.com', 'linkedin.com', 'docs.google.com', 'notion.so', 'twitter.com', 'x.com'];
const isSiteRestrito = sitesSemGrifos.some(d => window.location.hostname.includes(d));

let ignoradosTemporarios = [];
let historicoCorrecoes = [];
let idiomaSugerido = false;
let conquistasNotificadas = {};

let erroMaisComumTemp = {};

let smConfig = {
    language: 'pt-BR', pickyMode: true, speed: 500, darkMode: false, blacklist: [],
    apiUrl: '', apiKey: '', strictMode: false, disabled: false,
    toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's' },
    ignoreShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 'i' },
    corrigirTudoShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 's' },
    autoHideBubble: false, modoConfirmacao: false, modoLeituraGlobal: false,
    modoLeituraSites: [], modoWhitelist: false, whitelist: [],
    erroMaisComum: {}
};

// =============================================
// 🏆 CONQUISTAS
// =============================================
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
        if (isExtensaoAtiva()) chrome.storage.local.set({ conquistasNotificadas });
        mostrarNotificacaoConquista(novasConquistas[novasConquistas.length - 1].nome);
        if (novasConquistas.length > 1) setTimeout(() => mostrarNotificacaoConquista(`🎉 +${novasConquistas.length - 1} conquista(s)!`), 3500);
    }
}

function mostrarNotificacaoConquista(mensagem) {
    const notif = document.createElement('div');
    notif.style.cssText = `position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:2147483647;background:linear-gradient(135deg,#f59e0b,#fbbf24);color:#1a1a1a;padding:16px 28px;border-radius:16px;font:700 16px 'Segoe UI',system-ui,sans-serif;text-align:center;box-shadow:0 10px 40px rgba(245,158,11,0.5);animation:sm-conquista-in .5s ease,sm-conquista-out .5s ease 3s forwards;pointer-events:none;max-width:90vw;`;
    notif.textContent = mensagem;
    document.body.appendChild(notif);
    criarConfete();
    setTimeout(() => { if (notif.parentNode) notif.remove(); }, 3700);
}

function criarConfete() {
    const cores = ['#f59e0b','#fbbf24','#fcd34d','#fde68a','#fef3c7','#6f42c1','#8b5cf6'];
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const c = document.createElement('div');
            const s = Math.random()*10+5;
            c.style.cssText = `position:fixed;top:-10px;left:${Math.random()*100}%;z-index:2147483646;width:${s}px;height:${s}px;background:${cores[Math.floor(Math.random()*cores.length)]};border-radius:${Math.random()>.5?'50%':'0'};pointer-events:none;animation:sm-confete-fall ${Math.random()*2+1.5}s linear forwards;`;
            document.body.appendChild(c);
            setTimeout(() => { if (c.parentNode) c.remove(); }, 2500);
        }, i*30);
    }
}

// =============================================
// 🌐 AUTO-DETECÇÃO DE IDIOMA
// =============================================
async function verificarIdioma(texto) {
    if (idiomaSugerido || texto.length < 30) return;
    try {
        const response = await new Promise((resolve) => {
            if (!isExtensaoAtiva()) { resolve(null); return; }
            chrome.runtime.sendMessage({ action: 'detectLanguage', text: texto.substring(0, 500) }, resolve);
        });
        if (response?.success && response.language) {
            const idiomaDetectado = response.language;
            const idiomaAtual = smConfig.language;
            if (idiomaDetectado !== idiomaAtual) {
                const nomes = {'pt-BR':'Português','en-US':'Inglês','es':'Espanhol','fr':'Francês','de':'Alemão','it':'Italiano'};
                mostrarSugestaoIdioma(`Parece que está escrevendo em ${nomes[idiomaDetectado] || idiomaDetectado}.`, `Mudar de ${nomes[idiomaAtual] || idiomaAtual}?`, idiomaDetectado);
                idiomaSugerido = true;
            }
        }
    } catch (e) {}
}

function mostrarSugestaoIdioma(titulo, mensagem, novoIdioma) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2147483646;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif;`;
    const dialog = document.createElement('div');
    dialog.style.cssText = `background:white;border-radius:12px;padding:24px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);`;
    if (smConfig.darkMode) { dialog.style.background = '#1a1a1a'; dialog.style.color = '#e0e0e0'; }
    dialog.innerHTML = `<h3 style="margin:0 0 8px;font-size:16px;">🌐 ${titulo}</h3><p style="margin:0 0 16px;font-size:14px;">${mensagem}</p><div style="display:flex;gap:8px;justify-content:flex-end;"><button class="sm-dlg-cancel">Manter</button><button class="sm-dlg-confirm">Mudar Idioma</button></div>`;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    dialog.querySelector('.sm-dlg-cancel').style.cssText = 'background:#f3f4f6;border:1px solid #d1d5db;color:#374151;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';
    dialog.querySelector('.sm-dlg-confirm').style.cssText = 'background:linear-gradient(135deg,#6f42c1,#8b5cf6);border:none;color:white;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';
    dialog.querySelector('.sm-dlg-confirm').onclick = () => {
        overlay.remove(); smConfig.language = novoIdioma;
        if (isExtensaoAtiva()) chrome.storage.local.set({ language: novoIdioma });
        if (elementoGlobal && textoUltimaVerificacao) verificarTexto(textoUltimaVerificacao, elementoGlobal);
        mostrarFeedback('✓ Idioma alterado para ' + novoIdioma, 'success');
    };
    dialog.querySelector('.sm-dlg-cancel').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 15000);
}

// =============================================
// 📋 CONTEXT MENU HANDLER
// =============================================
if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'revisarSelecao' && request.texto) {
            const div = document.createElement('div');
            div.contentEditable = 'true';
            div.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
            div.textContent = request.texto;
            document.body.appendChild(div);
            textoUltimaVerificacao = request.texto;
            elementoGlobal = div;
            verificarTexto(request.texto, div);
            setTimeout(() => { if (errosGlobais.length > 0) exibirPainel(); document.body.removeChild(div); }, 1500);
        }
        if (request.action === 'ignorarTemporariamente' && request.palavra) {
            ignorarTemporariamente(request.palavra);
        }
        // 🆕 Corrigir Tudo (chamado do popup)
        if (request.action === 'corrigirTudo') {
            if (errosGlobais.length > 0 && elementoGlobal) {
                corrigirTudo();
            }
        }
    });
}

// =============================================
// 🔧 UTILITÁRIOS
// =============================================
function isExtensaoAtiva() {
    try { return !!(chrome && chrome.runtime && chrome.runtime.id); } catch (e) { return false; }
}

function storageGetSeguro(chave, fallback) {
    if (!isExtensaoAtiva()) { fallback({}); return; }
    try { chrome.storage.local.get(chave, (res) => { if (chrome.runtime.lastError) { fallback({}); return; } fallback(res); }); } catch (e) { fallback({}); }
}

function storageSetSeguro(dados) {
    if (!isExtensaoAtiva()) return;
    try { chrome.storage.local.set(dados); } catch (e) {}
}

function mostrarFeedback(msg, tipo) {
    document.querySelectorAll('.sm-feedback-flutuante').forEach(el => el.remove());
    const f = document.createElement('div');
    f.textContent = msg; f.className = 'sm-feedback-flutuante';
    const cor = tipo === 'success' ? '#28a745' : tipo === 'error' ? '#e53e3e' : tipo === 'info' ? '#6b7280' : '#f59e0b';
    f.style.cssText = `position:fixed;top:20px;right:20px;z-index:2147483647;background:${cor};color:#fff;padding:10px 20px;border-radius:8px;font:600 14px 'Segoe UI',sans-serif;box-shadow:0 4px 15px rgba(0,0,0,0.3);pointer-events:none;`;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 2200);
}

function isModoLeitura() {
    if (smConfig.modoLeituraGlobal) return true;
    return (smConfig.modoLeituraSites || []).some(d => window.location.hostname.includes(d));
}

function confirmarCorrecao(original, sugestao, callback) {
    if (!smConfig.modoConfirmacao && !isModoLeitura()) { callback(true); return; }
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2147483646;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif;`;
    const dialog = document.createElement('div');
    dialog.style.cssText = `background:white;border-radius:12px;padding:24px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);`;
    if (smConfig.darkMode) { dialog.style.background = '#1a1a1a'; dialog.style.color = '#e0e0e0'; }
    dialog.innerHTML = `<h3 style="margin:0 0 12px;font-size:16px;">Confirmar Correção</h3><p style="margin:0 0 16px;font-size:14px;line-height:1.5;">Corrigir <strong style="color:#e53e3e;text-decoration:line-through;">${original}</strong> para <strong style="color:#28a745;">${sugestao}</strong>?</p><div style="display:flex;gap:8px;justify-content:flex-end;"><button class="sm-dlg-cancel">Não</button><button class="sm-dlg-confirm">Sim, corrigir</button></div>`;
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    dialog.querySelector('.sm-dlg-cancel').style.cssText = 'background:#f3f4f6;border:1px solid #d1d5db;color:#374151;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';
    dialog.querySelector('.sm-dlg-confirm').style.cssText = 'background:linear-gradient(135deg,#6f42c1,#8b5cf6);border:none;color:white;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';
    dialog.querySelector('.sm-dlg-confirm').onclick = () => { overlay.remove(); callback(true); storageGetSeguro({ totalAceitas: 0 }, (res) => storageSetSeguro({ totalAceitas: (res.totalAceitas || 0) + 1 })); };
    dialog.querySelector('.sm-dlg-cancel').onclick = () => { overlay.remove(); callback(false); storageGetSeguro({ totalRecusadas: 0 }, (res) => storageSetSeguro({ totalRecusadas: (res.totalRecusadas || 0) + 1 })); };
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); callback(false); } };
}

function atualizarBadgeBackground(total) {
    if (!isExtensaoAtiva()) return;
    try { chrome.runtime.sendMessage({ action: 'updateBadge', totalErros: total }); } catch (e) {}
}

function resetarBadgeBackground() {
    if (!isExtensaoAtiva()) return;
    try { chrome.runtime.sendMessage({ action: 'resetBadge' }); } catch (e) {}
}

function atualizarVisibilidadeBolha() {
    const bubble = document.getElementById('syntax-mentor-bubble');
    if (!bubble) return;
    if (smConfig.autoHideBubble && usuarioDigitando && !painelAberto) {
        bubble.style.opacity = '0'; bubble.style.pointerEvents = 'none';
    } else {
        bubble.style.opacity = estaCarregando ? '0.6' : '1'; bubble.style.pointerEvents = 'auto';
    }
    bubble.style.transition = 'opacity 0.3s ease';
}

// =============================================
// 🔧 DISPARA EVENTOS NATIVOS (REACT FIX)
// =============================================
function dispararEventosNativos(elemento) {
    if (!elemento) return;
    const start = elemento.selectionStart;
    const end = elemento.selectionEnd;
    const valor = elemento.value;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
        || Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (nativeSetter) { try { nativeSetter.call(elemento, valor); } catch (e) { elemento.value = valor; } }
    try { elemento.setSelectionRange(start, end); } catch (e) {}
    [new Event('input', { bubbles: true }), new Event('change', { bubbles: true }),
     new InputEvent('input', { bubbles: true, inputType: 'insertText', data: valor }),
     new CompositionEvent('compositionend', { bubbles: true, data: valor }),
     new FocusEvent('blur', { bubbles: true }), new FocusEvent('focus', { bubbles: true })]
        .forEach(evt => { try { elemento.dispatchEvent(evt); } catch (e) {} });
    if (elemento._valueTracker) { try { elemento._valueTracker.setValue(valor); } catch (e) {} }
}

function atualizarElementoComEventos(elemento) {
    if (!elemento) return;
    if (elemento.isContentEditable || elemento.getAttribute?.('contenteditable') === 'true') {
        [new Event('input', { bubbles: true }), new Event('change', { bubbles: true }),
         new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText' }),
         new InputEvent('input', { bubbles: true, inputType: 'insertText' }),
         new CompositionEvent('compositionend', { bubbles: true }),
         new FocusEvent('blur', { bubbles: true }), new FocusEvent('focus', { bubbles: true })]
            .forEach(evt => { try { elemento.dispatchEvent(evt); } catch (e) {} });
        elemento.focus();
        setTimeout(() => { elemento.blur(); elemento.focus(); }, 50);
        return;
    }
    if (elemento.tagName === 'INPUT' || elemento.tagName === 'TEXTAREA') dispararEventosNativos(elemento);
}

// =============================================
// 🔍 SHADOW DOM E IFRAMES (DIGISAC)
// =============================================
function observarShadowDOM() {
    observarElemento(document.body);
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    observarElemento(node);
                    if (node.tagName === 'IFRAME') tentarInjetarEmIframe(node);
                }
            });
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

function observarElemento(elemento) {
    if (!elemento || elemento.nodeType !== 1) return;
    if (elemento.shadowRoot) adicionarListenersNoShadowRoot(elemento.shadowRoot);
    elemento.querySelectorAll('*').forEach(el => { if (el.shadowRoot) adicionarListenersNoShadowRoot(el.shadowRoot); });
}

function adicionarListenersNoShadowRoot(shadowRoot) {
    if (!shadowRoot) return;
    const campos = shadowRoot.querySelectorAll('textarea, input[type="text"], input[type="search"], [contenteditable="true"], [role="textbox"]');
    campos.forEach(campo => {
        campo.removeEventListener('input', shadowInputHandler);
        campo.addEventListener('input', shadowInputHandler);
    });
    const shadowObserver = new MutationObserver(() => adicionarListenersNoShadowRoot(shadowRoot));
    shadowObserver.observe(shadowRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['contenteditable'] });
}

function shadowInputHandler(e) {
    if (smConfig.disabled) return;
    let el = e.target;
    if (el.closest?.('[contenteditable="true"]')) el = el.closest('[contenteditable="true"]');
    const valido = el.tagName === 'TEXTAREA' || el.isContentEditable || el.getAttribute?.('contenteditable') === 'true' || el.getAttribute?.('role') === 'textbox' || (el.tagName === 'INPUT' && ['text','search','url','email'].includes(el.type));
    if (!valido) return;
    if (el.tagName === 'INPUT' && smConfig.strictMode) return;

    usuarioDigitando = true;
    atualizarVisibilidadeBolha();
    if (currentFetchController) { currentFetchController.abort(); currentFetchController = null; }
    filaRequisicoes = []; processandoFila = false;
    clearTimeout(timeoutDigitacao);

    timeoutDigitacao = setTimeout(() => {
        usuarioDigitando = false;
        const texto = (el.value || el.textContent || el.innerText || '').trim();
        if (texto.length <= 1) { errosGlobais = []; atualizarInterface(); atualizarVisibilidadeBolha(); return; }
        if (texto === ultimoTextoValido && errosGlobais.length > 0) { atualizarVisibilidadeBolha(); return; }
        ultimoTextoValido = texto;
        textoUltimaVerificacao = texto;
        if (!idiomaSugerido) verificarIdioma(texto);
        filaRequisicoes.push({ texto, el });
        processarFilaRequisicoes();
        atualizarVisibilidadeBolha();
    }, parseInt(smConfig.speed) || 500);
}

function tentarInjetarEmIframe(iframe) {
    try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) observarElemento(iframeDoc.body);
    } catch (e) {}
}

let procuraCamposInterval = null;
function iniciarProcuraAtiva() {
    procuraCamposInterval = setInterval(() => {
        observarElemento(document.body);
        document.querySelectorAll('iframe').forEach(iframe => tentarInjetarEmIframe(iframe));
    }, 2000);
}

// =============================================
// 🚀 INICIALIZAÇÃO (ÚNICA - COM SHADOW DOM)
// =============================================
function iniciar() {
    if (!isExtensaoAtiva()) { setTimeout(iniciar, 2000); return; }

    observarShadowDOM();
    iniciarProcuraAtiva();

    storageGetSeguro([
        'language', 'pickyMode', 'speed', 'darkMode', 'blacklist',
        'apiUrl', 'apiKey', 'strictMode', 'toggleShortcut', 'ignoreShortcut', 
        'corrigirTudoShortcut', 'autoHideBubble', 'modoConfirmacao',
        'modoLeituraGlobal', 'modoLeituraSites', 'modoWhitelist', 'whitelist',
        'erroMaisComum', 'conquistasNotificadas'
    ], (res) => {
        smConfig = { ...smConfig, ...res };
        conquistasNotificadas = res.conquistasNotificadas || {};
        erroMaisComumTemp = res.erroMaisComum || {};
        const host = window.location.hostname;
        smConfig.disabled = smConfig.modoWhitelist ? !(smConfig.whitelist || []).some(d => host.includes(d)) : (smConfig.blacklist || []).some(d => host.includes(d));
        if (smConfig.disabled) resetarBadgeBackground();
        if (smConfig.darkMode) document.body.classList.add('sm-dark-root');
    });

    try {
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.darkMode) { smConfig.darkMode = changes.darkMode.newValue; document.body.classList.toggle('sm-dark-root', smConfig.darkMode); atualizarInterface(); }
            if (changes.blacklist || changes.modoWhitelist || changes.whitelist) {
                smConfig.blacklist = changes.blacklist?.newValue || smConfig.blacklist;
                smConfig.modoWhitelist = changes.modoWhitelist?.newValue ?? smConfig.modoWhitelist;
                smConfig.whitelist = changes.whitelist?.newValue || smConfig.whitelist;
                const host = window.location.hostname;
                smConfig.disabled = smConfig.modoWhitelist ? !(smConfig.whitelist || []).some(d => host.includes(d)) : (smConfig.blacklist || []).some(d => host.includes(d));
                if (smConfig.disabled) resetarBadgeBackground();
            }
            if (changes.conquistasNotificadas) conquistasNotificadas = changes.conquistasNotificadas.newValue || {};
            if (changes.erroMaisComum) erroMaisComumTemp = changes.erroMaisComum.newValue || {};
        });
    } catch (e) {}
}

// =============================================
// ⌨️ ATALHOS
// =============================================
document.addEventListener('keydown', (e) => {
    if (smConfig.disabled || window !== window.top) return;
    const scT = smConfig.toggleShortcut || { altKey: true, ctrlKey: false, shiftKey: false, key: 's' };
    const scI = smConfig.ignoreShortcut || { altKey: true, ctrlKey: false, shiftKey: false, key: 'i' };
    const scCT = smConfig.corrigirTudoShortcut || { altKey: true, ctrlKey: false, shiftKey: true, key: 's' };
    if (e.altKey === scT.altKey && e.ctrlKey === scT.ctrlKey && e.shiftKey === scT.shiftKey && e.key.toLowerCase() === scT.key) {
        e.preventDefault(); e.stopPropagation();
        if (errosGlobais.length > 0) painelAberto ? fecharPainel() : exibirPainel();
    }
    if (e.altKey === scI.altKey && e.ctrlKey === scI.ctrlKey && e.shiftKey === scI.shiftKey && e.key.toLowerCase() === scI.key) {
        e.preventDefault(); e.stopPropagation(); limparTudo();
    }
    if (e.altKey === scCT.altKey && e.ctrlKey === scCT.ctrlKey && e.shiftKey === scCT.shiftKey && e.key.toLowerCase() === scCT.key) {
        e.preventDefault(); e.stopPropagation();
        if (errosGlobais.length > 0 && elementoGlobal) corrigirTudo();
    }
    if (e.key === 'Escape' && painelAberto) fecharPainel();
    if (painelAberto && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        const botoes = [...document.querySelectorAll('#syntax-mentor-painel .btn-fix-mini')];
        if (botoes.length === 0) return;
        indexSugestao = e.key === 'ArrowDown' ? (indexSugestao + 1) % botoes.length : (indexSugestao - 1 + botoes.length) % botoes.length;
        botoes[indexSugestao].focus();
    }
});

function limparTudo() {
    if (!isSiteRestrito && elementoGlobal?.isContentEditable) {
        elementoGlobal.innerHTML = elementoGlobal.innerHTML.replace(/<mark class="sm-highlight">(.*?)<\/mark>/gi, '$1');
        atualizarElementoComEventos(elementoGlobal);
    }
    errosGlobais = []; atualizarInterface();
}

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
    if (smConfig.modoConfirmacao || isModoLeitura()) { confirmarCorrecaoEmLote(correcoes); }
    else { correcoes.forEach(([o, s]) => aplicarCorrecao(o, s, elementoGlobal)); errosGlobais = []; atualizarInterface(); mostrarFeedback('✓ Tudo corrigido!', 'success'); }
}

function confirmarCorrecaoEmLote(correcoes) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2147483646;display:flex;align-items:center;justify-content:center;`;
    const lista = correcoes.map(([o, s]) => `<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #e5e7eb;"><span style="color:#e53e3e;text-decoration:line-through;flex:1;">${o}</span><span>→</span><span style="color:#28a745;flex:1;">${s}</span></div>`).join('');
    const dialog = document.createElement('div');
    dialog.style.cssText = `background:white;border-radius:12px;padding:24px;max-width:500px;width:90%;max-height:70vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);`;
    if (smConfig.darkMode) { dialog.style.background = '#1a1a1a'; dialog.style.color = '#e0e0e0'; }
    dialog.innerHTML = `<h3>Confirmar Correções</h3><p style="font-size:12px;color:#888;">${correcoes.length} correção(ões)</p><div style="margin-bottom:16px;">${lista}</div><div style="display:flex;gap:8px;justify-content:flex-end;"><button class="sm-dlg-cancel">Cancelar</button><button class="sm-dlg-confirm">Aplicar Todas</button></div>`;
    overlay.appendChild(dialog); document.body.appendChild(overlay);
    dialog.querySelector('.sm-dlg-cancel').style.cssText = 'background:#f3f4f6;border:1px solid #d1d5db;color:#374151;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';
    dialog.querySelector('.sm-dlg-confirm').style.cssText = 'background:linear-gradient(135deg,#6f42c1,#8b5cf6);border:none;color:white;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';
    dialog.querySelector('.sm-dlg-confirm').onclick = () => { overlay.remove(); correcoes.forEach(([o, s]) => aplicarCorrecao(o, s, elementoGlobal)); errosGlobais = []; atualizarInterface(); mostrarFeedback('✓ Tudo corrigido!', 'success'); };
    dialog.querySelector('.sm-dlg-cancel').onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

// =============================================
// 🆕 DETECÇÃO DE DIGITAÇÃO (FILA INTELIGENTE)
// =============================================
document.addEventListener('input', (e) => {
    if (smConfig.disabled) return;
    let el = e.target;
    if (el.closest?.('[contenteditable="true"]')) el = el.closest('[contenteditable="true"]');
    const valido = el.tagName === 'TEXTAREA' || el.isContentEditable || el.getAttribute?.('contenteditable') === 'true' || (el.tagName === 'INPUT' && ['text','search','url','email'].includes(el.type));
    if (!valido) return;
    if (el.tagName === 'INPUT' && smConfig.strictMode) return;

    usuarioDigitando = true; atualizarVisibilidadeBolha();
    if (currentFetchController) { currentFetchController.abort(); currentFetchController = null; }
    filaRequisicoes = []; processandoFila = false; clearTimeout(timeoutDigitacao);

    timeoutDigitacao = setTimeout(() => {
        usuarioDigitando = false;
        const texto = (el.value || el.textContent || el.innerText || '').trim();
        if (texto.length <= 1) { errosGlobais = []; atualizarInterface(); if (!isSiteRestrito && el.isContentEditable) { el.innerHTML = el.innerHTML.replace(/<mark class="sm-highlight">(.*?)<\/mark>/gi, '$1'); atualizarElementoComEventos(el); } atualizarVisibilidadeBolha(); return; }
        if (texto === ultimoTextoValido && errosGlobais.length > 0) { atualizarVisibilidadeBolha(); return; }
        ultimoTextoValido = texto; textoUltimaVerificacao = texto;
        if (!idiomaSugerido) verificarIdioma(texto);
        filaRequisicoes.push({ texto, el }); processarFilaRequisicoes(); atualizarVisibilidadeBolha();
    }, parseInt(smConfig.speed) || 500);
}, true);

async function processarFilaRequisicoes() {
    if (processandoFila || filaRequisicoes.length === 0) return;
    processandoFila = true;
    const ultima = filaRequisicoes[filaRequisicoes.length - 1]; filaRequisicoes = [];
    try { await verificarTexto(ultima.texto, ultima.el); } catch (e) { console.warn('SyntaxMentor:', e.message); }
    processandoFila = false;
    if (filaRequisicoes.length > 0) processarFilaRequisicoes();
}

// =============================================
// 🆕 VERIFICAÇÃO DE TEXTO (OTIMIZADA)
// =============================================
async function verificarTexto(texto, elemento) {
    if (smConfig.disabled) return;
    if (currentFetchController) currentFetchController.abort();
    currentFetchController = new AbortController();
    const signal = currentFetchController.signal;
    estaCarregando = true; atualizarEstadoCarregamento(true);
    const url = smConfig.apiUrl || 'https://api.languagetool.org/v2/check';
    const params = new URLSearchParams({ text: texto, language: smConfig.language });
    if (smConfig.pickyMode) params.set('level', 'picky');
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (smConfig.apiKey?.trim()) headers['Authorization'] = `Bearer ${smConfig.apiKey.trim()}`;
    try {
        if (signal.aborted) { estaCarregando = false; atualizarEstadoCarregamento(false); return; }
        const resp = await fetch(url, { method: 'POST', headers, body: params, signal });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (signal.aborted) { estaCarregando = false; atualizarEstadoCarregamento(false); return; }
        const atual = (elemento.value || elemento.textContent || elemento.innerText || '').trim();
        if (atual !== texto) { estaCarregando = false; atualizarEstadoCarregamento(false); return; }
        let dic = [];
        if (isExtensaoAtiva()) { try { const res = await new Promise(r => chrome.storage.local.get(['dicionario_pessoal'], r)); dic = (res.dicionario_pessoal || []).map(w => w.toLowerCase()); } catch (e) {} }
        errosGlobais = (data.matches || []).filter(m => {
            if (!m.replacements?.length) return false;
            const o = m.context.text.substr(m.context.offset, m.context.length);
            const ol = o.toLowerCase();
            if (o.trim() && !ol.match(/^[0-9]+$/)) { erroMaisComumTemp[ol] = (erroMaisComumTemp[ol] || 0) + 1; storageSetSeguro({ erroMaisComum: erroMaisComumTemp }); }
            return !dic.includes(ol) && !ignoradosTemporarios.includes(ol);
        });
        elementoGlobal = elemento;
        if (!isSiteRestrito && elemento.isContentEditable && elemento.tagName !== 'TEXTAREA' && elemento.tagName !== 'INPUT') aplicarGrifos(errosGlobais, elemento);
        atualizarInterface();
    } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('SyntaxMentor:', err.message);
        mostrarFeedback('⚠️ Erro de conexão', 'error');
    } finally {
        if (currentFetchController && currentFetchController.signal === signal) { estaCarregando = false; atualizarEstadoCarregamento(false); }
    }
}

function atualizarEstadoCarregamento(on) {
    const b = document.getElementById('syntax-mentor-bubble');
    if (!b) return;
    b.style.opacity = on ? '0.6' : '1'; b.style.cursor = on ? 'wait' : 'grab';
    b.style.animation = on ? 'sm-pulse 1.5s infinite' : '';
}

function aplicarGrifos(erros, el) {
    if (!el?.isContentEditable || isSiteRestrito) return;
    let html = el.innerHTML.replace(/<mark class="sm-highlight">(.*?)<\/mark>/gi, '$1');
    const palavras = [...new Set(erros.map(e => e.context.text.substr(e.context.offset, e.context.length)).filter(Boolean))];
    palavras.forEach(p => { const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); html = html.replace(new RegExp(`(?<!<[^>]*)${esc}(?![^<]*>)`, 'g'), `<mark class="sm-highlight">$&</mark>`); });
    if (el.innerHTML !== html) el.innerHTML = html;
}

// =============================================
// 🔧 APLICAÇÃO DE CORREÇÕES (PERSISTENTE)
// =============================================
function aplicarCorrecao(original, sugestao, el, pularConfirmacao = false) {
    if (!el || !original || !sugestao) return;
    const executarCorrecao = () => {
        const esc = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
            const valorAntigo = el.value;
            el.value = el.value.replace(new RegExp(`(?<![\\p{L}])${esc}(?![\\p{L}])`, 'gu'), sugestao);
            if (el.value !== valorAntigo) { dispararEventosNativos(el); requestAnimationFrame(() => { if (el.value !== valorAntigo) dispararEventosNativos(el); }); setTimeout(() => { el.blur(); el.focus(); dispararEventosNativos(el); }, 100); }
        } else if (el.isContentEditable) {
            if (isSiteRestrito) { el.focus(); try { const doc = el.ownerDocument || document; if (doc.execCommand('find', false, original)) doc.execCommand('insertText', false, sugestao); else el.textContent = (el.textContent || '').replace(new RegExp(esc, 'gi'), sugestao); } catch (e) { el.textContent = (el.textContent || '').replace(new RegExp(esc, 'gi'), sugestao); } atualizarElementoComEventos(el); }
            else { let html = el.innerHTML; const htmlAntigo = html; const markRegex = new RegExp(`<mark class="sm-highlight">${esc}</mark>`, 'g'); if (markRegex.test(html)) html = html.replace(markRegex, sugestao); else html = html.replace(new RegExp(`(?<!<[^>]*)(?<![\\p{L}])${esc}(?![\\p{L}])(?![^<]*>)`, 'gu'), sugestao); if (html !== htmlAntigo) el.innerHTML = html; atualizarElementoComEventos(el); setTimeout(() => atualizarElementoComEventos(el), 100); }
        }
        historicoCorrecoes.push({ el, original, sugestao }); if (historicoCorrecoes.length > 50) historicoCorrecoes.shift(); incrementarStats(1);
    };
    if (pularConfirmacao) executarCorrecao(); else confirmarCorrecao(original, sugestao, (confirmado) => { if (confirmado) executarCorrecao(); });
}

function incrementarStats(qtd) {
    if (!isExtensaoAtiva()) return;
    storageGetSeguro({ totalCorrigidas: 0, dicionario_pessoal: [] }, (res) => {
        const novoTotal = (res.totalCorrigidas || 0) + qtd;
        storageSetSeguro({ totalCorrigidas: novoTotal });
        verificarConquistas(novoTotal, (res.dicionario_pessoal || []).length);
    });
}

function removerErroGlobal(original) {
    errosGlobais = errosGlobais.filter(err => err.context.text.substr(err.context.offset, err.context.length) !== original);
    atualizarInterface();
}

function ignorarTemporariamente(palavra) {
    const pl = palavra.toLowerCase();
    if (!ignoradosTemporarios.includes(pl)) ignoradosTemporarios.push(pl);
    if (!isSiteRestrito && elementoGlobal?.isContentEditable) {
        const esc = palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        elementoGlobal.innerHTML = elementoGlobal.innerHTML.replace(new RegExp(`<mark class="sm-highlight">${esc}</mark>`, 'g'), palavra);
        atualizarElementoComEventos(elementoGlobal);
    }
    removerErroGlobal(palavra); mostrarFeedback(`"${palavra}" ignorada nesta sessão`, 'info');
}

// =============================================
// 🎨 INTERFACE
// =============================================
function atualizarInterface() {
    if (smConfig.disabled) return;
    let bubble = document.getElementById('syntax-mentor-bubble');
    const total = errosGlobais.filter(e => e.context.text.substr(e.context.offset, e.context.length).trim()).length;
    atualizarBadgeBackground(total);
    if (!bubble) {
        bubble = document.createElement('div'); bubble.id = 'syntax-mentor-bubble'; bubble.title = 'SyntaxMentor';
        document.body.appendChild(bubble); tornarArrastavel(bubble);
        bubble.addEventListener('click', () => { if (!isDraggingBubble && !estaCarregando && errosGlobais.length > 0) painelAberto ? fecharPainel() : exibirPainel(); isDraggingBubble = false; });
    }
    if (smConfig.darkMode) bubble.classList.add('sm-dark'); else bubble.classList.remove('sm-dark');
    if (bubblePosX) { bubble.style.left = bubblePosX; bubble.style.top = bubblePosY; bubble.style.right = 'auto'; bubble.style.bottom = 'auto'; }
    if (estaCarregando && errosGlobais.length > 0) { bubble.style.opacity = '0.6'; bubble.style.pointerEvents = 'auto'; bubble.style.display = 'flex'; }
    else atualizarVisibilidadeBolha();
    if (total === 0) { bubble.className = 'sm-bubble-success'; bubble.innerHTML = '<span class="sm-bubble-icon">✓</span>'; if (painelAberto) fecharPainelComSucesso(); }
    else { bubble.className = 'sm-bubble-error'; bubble.innerHTML = `<span class="sm-bubble-icon">${isModoLeitura() ? '👁️' : '✏️'}</span><span class="sm-bubble-badge">${total}</span>`; if (painelAberto) exibirPainel(); }
}

function exibirPainel() {
    painelAberto = true; indexSugestao = -1;
    let painel = document.getElementById('syntax-mentor-painel');
    if (!painel) { painel = document.createElement('div'); painel.id = 'syntax-mentor-painel'; document.body.appendChild(painel); }
    if (smConfig.darkMode) painel.classList.add('sm-dark'); else painel.classList.remove('sm-dark');
    const mapa = {}; let total = 0;
    errosGlobais.forEach(e => { const o = e.context.text.substr(e.context.offset, e.context.length); if (!o.trim()) return; if (!mapa[o]) mapa[o] = { s: e.replacements[0]?.value || '', c: 0, msg: e.message }; mapa[o].c++; total++; });
    let html = `<div id="syntax-mentor-header"><span>${isModoLeitura() ? '👁️ Revisão' : '📝 Sugestões'}</span><button id="btn-fechar-painel">✕</button></div><div id="syntax-mentor-content"><div class="body-cards">`;
    if (Object.keys(mapa).length === 0) html += '<div style="text-align:center;padding:20px;color:#888;">✓ Nenhum erro</div>';
    else Object.entries(mapa).forEach(([o, info]) => { html += `<div class="erro-card"><p class="erro-msg" title="${info.msg.replace(/"/g,'&quot;')}">Erro: <strong>${o}</strong></p><div class="sugestao-container"><span class="palavra-original">${o}</span><span class="seta">→</span><div class="botoes-acao"><button class="btn-fix-mini" data-o="${o}" data-s="${info.s}">${info.c > 1 ? info.s + ' (' + info.c + 'x)' : (info.s || '[Remover]')}</button><button class="btn-ignorar-sessao" data-o="${o}">↩</button><button class="btn-ignorar" data-o="${o}">+</button></div></div></div>`; });
    html += `</div><div class="footer-actions"><button id="btn-corrigir-tudo">✨ Corrigir Tudo (${total})</button><button id="btn-ignorar-tudo">Ignorar Tudo</button></div>${ignoradosTemporarios.length ? `<div style="text-align:center;font-size:10px;color:#9ca3af;margin-top:8px;">📋 ${ignoradosTemporarios.length} ignorada(s)</div>` : ''}${isModoLeitura() ? `<div style="text-align:center;font-size:10px;color:#f59e0b;margin-top:4px;">⚠️ Modo Leitura ativo</div>` : ''}<div style="text-align:center;font-size:10px;color:#9ca3af;margin-top:4px;">Alt+Shift+S = corrigir | Botão direito = revisar</div></div>`;
    painel.innerHTML = html; tornarArrastavelPainel(painel, document.getElementById('syntax-mentor-header'));
    document.getElementById('btn-fechar-painel').onclick = fecharPainel;
    document.getElementById('btn-corrigir-tudo').onclick = corrigirTudo;
    document.getElementById('btn-ignorar-tudo').onclick = limparTudo;
    painel.querySelectorAll('.btn-fix-mini').forEach(b => { b.onclick = () => { aplicarCorrecao(b.dataset.o, b.dataset.s, elementoGlobal); removerErroGlobal(b.dataset.o); }; });
    painel.querySelectorAll('.btn-ignorar-sessao').forEach(b => { b.onclick = () => ignorarTemporariamente(b.dataset.o); });
    painel.querySelectorAll('.btn-ignorar').forEach(b => { b.onclick = async () => { const o = b.dataset.o; if (isExtensaoAtiva()) { const res = await new Promise(r => chrome.storage.local.get(['dicionario_pessoal'], r)); const dic = res.dicionario_pessoal || []; if (!dic.includes(o)) { dic.push(o); storageSetSeguro({ dicionario_pessoal: dic }); } } if (!isSiteRestrito && elementoGlobal?.isContentEditable) { elementoGlobal.innerHTML = elementoGlobal.innerHTML.replace(new RegExp(`<mark class="sm-highlight">${o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</mark>`, 'g'), o); atualizarElementoComEventos(elementoGlobal); } removerErroGlobal(o); mostrarFeedback(`"${o}" → dicionário`, 'success'); }; });
}

function fecharPainel() { document.getElementById('syntax-mentor-painel')?.remove(); painelAberto = false; }
function fecharPainelComSucesso() { const c = document.getElementById('syntax-mentor-content'); if (c) c.innerHTML = '<div style="text-align:center;padding:30px;"><div style="font-size:48px;color:#28a745;">✓</div><p>Tudo limpo!</p></div>'; setTimeout(fecharPainel, 1500); }

// =============================================
// ↕️ ARRASTE
// =============================================
function tornarArrastavel(el) {
    let p1, p2, p3, p4;
    el.onmousedown = e => { e.preventDefault(); isDraggingBubble = false; p3 = e.clientX; p4 = e.clientY; document.onmousemove = e2 => { e2.preventDefault(); isDraggingBubble = true; p1 = p3 - e2.clientX; p2 = p4 - e2.clientY; p3 = e2.clientX; p4 = e2.clientY; el.style.top = (el.offsetTop - p2) + 'px'; el.style.left = (el.offsetLeft - p1) + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; bubblePosX = el.style.left; bubblePosY = el.style.top; }; document.onmouseup = () => { document.onmousemove = null; setTimeout(() => isDraggingBubble = false, 100); }; };
}

function tornarArrastavelPainel(painel, handle) {
    if (!handle) return;
    let p1, p2, p3, p4;
    handle.onmousedown = e => { e.preventDefault(); p3 = e.clientX; p4 = e.clientY; document.onmousemove = e2 => { e2.preventDefault(); p1 = p3 - e2.clientX; p2 = p4 - e2.clientY; p3 = e2.clientX; p4 = e2.clientY; painel.style.top = (painel.offsetTop - p2) + 'px'; painel.style.left = (painel.offsetLeft - p1) + 'px'; }; document.onmouseup = () => document.onmousemove = null; };
}

// =============================================
// 🚀 START (ÚNICA CHAMADA)
// =============================================
iniciar();