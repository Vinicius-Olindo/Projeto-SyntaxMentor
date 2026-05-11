// SyntaxMentor - v2.1.0 (Direct Fallback for LinkedIn)
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

let contextoExtensaoValido = true;
let tentativasReconexao = 0;
const MAX_TENTATIVAS_RECONEXAO = 3;

const sitesSensiveis = ['mail.google.com', 'linkedin.com', 'docs.google.com', 'notion.so', 'twitter.com', 'x.com'];
const isSiteSensivel = sitesSensiveis.some(d => window.location.hostname.includes(d));
const isInIframe = window !== window.top;

let ignoradosTemporarios = [];

let smConfig = {
    language: 'pt-BR', pickyMode: true, speed: 500, darkMode: false, blacklist: [],
    apiUrl: '', strictMode: false, disabled: false,
    toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's' },
    ignoreShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 'i' },
    corrigirTudoShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 's' }
};

// =============================================
// DOCUMENTO PRINCIPAL
// =============================================
function getDocumentoPrincipal() {
    try {
        if (window.top && window.top.document && window.top.document.body) {
            return window.top.document;
        }
    } catch (e) { }
    return document;
}

function getBodyPrincipal() {
    const doc = getDocumentoPrincipal();
    return doc.body || document.body;
}

// =============================================
// VERIFICAÇÃO DE CONTEXTO
// =============================================
function isExtensaoContextoValido() {
    try {
        return !!(chrome && chrome.runtime && chrome.runtime.id && chrome.storage && chrome.storage.local);
    } catch (e) {
        return false;
    }
}

function verificarContextoExtensao() {
    if (!isExtensaoContextoValido()) {
        contextoExtensaoValido = false;
        return false;
    }
    contextoExtensaoValido = true;
    tentativasReconexao = 0;
    return true;
}

function desativarGraciosamente() {
    smConfig.disabled = true;
    removerElementosInterface();
}

function removerElementosInterface() {
    const doc = getDocumentoPrincipal();
    const bubble = doc.getElementById('syntax-mentor-bubble');
    const painel = doc.getElementById('syntax-mentor-painel');
    if (bubble) bubble.remove();
    if (painel) painel.remove();
    painelAberto = false;
}

function storageGetSegurado(keys, callback) {
    if (!verificarContextoExtensao()) {
        if (callback) callback({});
        return;
    }
    try {
        chrome.storage.local.get(keys, (res) => {
            if (chrome.runtime.lastError) {
                if (callback) callback({});
                return;
            }
            if (callback) callback(res);
        });
    } catch (e) {
        if (callback) callback({});
    }
}

function storageSetSegurado(data, callback) {
    if (!verificarContextoExtensao()) return;
    try {
        chrome.storage.local.set(data, () => {
            if (callback) callback();
        });
    } catch (e) {
        if (callback) callback();
    }
}

function iniciarConfiguracoes() {
    if (!verificarContextoExtensao()) return;
    storageGetSegurado([
        'language', 'pickyMode', 'speed', 'darkMode', 'blacklist',
        'apiUrl', 'strictMode', 'toggleShortcut', 'ignoreShortcut', 'corrigirTudoShortcut'
    ], (res) => {
        smConfig = { ...smConfig, ...res };
        verificarBlacklist();
    });
}

// =============================================
// ATALHOS DE TECLADO
// =============================================
document.addEventListener('keydown', (e) => {
    if (isInIframe) return;
    if (smConfig.disabled) return;

    const scToggle = smConfig.toggleShortcut || { altKey: true, ctrlKey: false, shiftKey: false, key: 's' };
    const scIgnore = smConfig.ignoreShortcut || { altKey: true, ctrlKey: false, shiftKey: false, key: 'i' };
    const scCorrigirTudo = smConfig.corrigirTudoShortcut || { altKey: true, ctrlKey: false, shiftKey: true, key: 's' };

    if (e.altKey === scToggle.altKey && e.ctrlKey === scToggle.ctrlKey && e.shiftKey === scToggle.shiftKey && e.key.toLowerCase() === scToggle.key) {
        e.preventDefault(); e.stopPropagation();
        if (errosGlobais.length > 0) painelAberto ? fecharPainel() : exibirPainel();
    }

    if (e.altKey === scIgnore.altKey && e.ctrlKey === scIgnore.ctrlKey && e.shiftKey === scIgnore.shiftKey && e.key.toLowerCase() === scIgnore.key) {
        e.preventDefault(); e.stopPropagation(); limparTodosErros();
    }

    if (e.altKey === scCorrigirTudo.altKey && e.ctrlKey === scCorrigirTudo.ctrlKey && e.shiftKey === scCorrigirTudo.shiftKey && e.key.toLowerCase() === scCorrigirTudo.key) {
        e.preventDefault(); e.stopPropagation();
        if (errosGlobais.length > 0 && elementoGlobal) corrigirTodosErrosGlobal();
    }

    if (e.key === 'Escape' && painelAberto) { e.preventDefault(); fecharPainel(); }

    if (painelAberto) {
        const botoes = document.querySelectorAll('#syntax-mentor-painel .btn-fix-mini');
        if (botoes.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); indexSugestao = (indexSugestao + 1) % botoes.length; botoes[indexSugestao].focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); indexSugestao = (indexSugestao - 1 + botoes.length) % botoes.length; botoes[indexSugestao].focus(); }
    }
}, true);

function limparTodosErros() {
    if (!isSiteSensivel && elementoGlobal && elementoGlobal.isContentEditable && elementoGlobal.tagName !== 'TEXTAREA' && elementoGlobal.tagName !== 'INPUT') {
        const cursorSalvo = salvarPosicaoCursor(elementoGlobal);
        elementoGlobal.innerHTML = elementoGlobal.innerHTML.replace(/<mark class="sm-highlight">(.*?)<\/mark>/gi, '$1');
        restaurarPosicaoCursor(elementoGlobal, cursorSalvo);
    }
    errosGlobais = []; atualizarInterface();
}

function corrigirTodosErrosGlobal() {
    if (!elementoGlobal || errosGlobais.length === 0) return;
    const mapaUnico = {};
    errosGlobais.forEach(err => {
        const original = err.context.text.substr(err.context.offset, err.context.length);
        const sugestao = err.replacements[0]?.value || "";
        if (original.trim() !== "" && sugestao && !mapaUnico[original]) mapaUnico[original] = sugestao;
    });

    Object.entries(mapaUnico).forEach(([original, sugestao]) => { aplicarCorrecao(original, sugestao, elementoGlobal); });
    errosGlobais = []; atualizarInterface();
    mostrarFeedback('✓ Tudo corrigido!', 'success');
}

function mostrarFeedback(mensagem, tipo) {
    const doc = getDocumentoPrincipal();
    doc.querySelectorAll('.sm-feedback-flutuante').forEach(el => el.remove());
    const feedback = doc.createElement('div');
    feedback.textContent = mensagem; feedback.className = 'sm-feedback-flutuante';
    const cor = tipo === 'success' ? '#28a745' : tipo === 'error' ? '#e53e3e' : '#6b7280';
    feedback.style.cssText = `position: fixed; top: 20px; right: 20px; z-index: 2147483647; background: ${cor}; color: white; padding: 10px 20px; border-radius: 8px; font-family: 'Segoe UI', system-ui, sans-serif; font-size: 14px; font-weight: 600; box-shadow: 0 4px 15px rgba(0,0,0,0.3); pointer-events: none;`;
    doc.body.appendChild(feedback);
    setTimeout(() => { if (feedback.parentNode) feedback.remove(); }, 2200);
}

function verificarBlacklist() {
    const host = window.location.hostname;
    smConfig.disabled = smConfig.blacklist.some(domain => host.includes(domain));
}

function salvarPosicaoCursor(containerEl) {
    const doc = containerEl.ownerDocument || document;
    const sel = doc.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(containerEl);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    const start = preSelectionRange.toString().length;
    return { start: start, end: start + range.toString().length };
}

function restaurarPosicaoCursor(containerEl, savedSel) {
    if (!savedSel) return;
    let charIndex = 0;
    const doc = containerEl.ownerDocument || document;
    const range = doc.createRange();
    range.setStart(containerEl, 0); range.collapse(true);
    const nodeStack = [containerEl]; let node, foundStart = false, stop = false;

    while (!stop && (node = nodeStack.pop())) {
        if (node.nodeType === 3) {
            const nextCharIndex = charIndex + node.length;
            if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) { range.setStart(node, savedSel.start - charIndex); foundStart = true; }
            if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) { range.setEnd(node, savedSel.end - charIndex); stop = true; }
            charIndex = nextCharIndex;
        } else {
            let i = node.childNodes.length; while (i--) { nodeStack.push(node.childNodes[i]); }
        }
    }
    const sel = doc.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
}

// =============================================
// DETEÇÃO DE DIGITAÇÃO
// =============================================
document.addEventListener('input', (e) => {
    if (smConfig.disabled) return;

    let el = e.target;
    if (el.nodeType === 3) el = el.parentNode;
    if (el.closest && el.closest('[contenteditable="true"]')) {
        el = el.closest('[contenteditable="true"]');
    }

    const isTextInput = el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'search' || el.type === 'url' || el.type === 'email');
    const isTextarea = el.tagName === 'TEXTAREA';
    const isContentEditable = el.isContentEditable || (el.getAttribute && el.getAttribute('contenteditable') === 'true');

    if (!isTextarea && !isContentEditable && !isTextInput) return;
    if (isTextInput && smConfig.strictMode) return;

    clearTimeout(timeoutDigitacao);
    if (currentFetchController) { currentFetchController.abort(); }

    timeoutDigitacao = setTimeout(() => {
        let texto;
        if (isSiteSensivel && isContentEditable) {
            texto = el.textContent || el.innerText || '';
        } else {
            texto = el.value || el.innerText || el.textContent || '';
        }

        if (texto.trim().length > 1) {
            textoUltimaVerificacao = texto.trim();
            chamarAPI(textoUltimaVerificacao, el);
        } else {
            errosGlobais = []; atualizarInterface();
            if (!isSiteSensivel && el.isContentEditable) {
                el.innerHTML = el.innerHTML.replace(/<mark class="sm-highlight">(.*?)<\/mark>/gi, '$1');
            }
        }
    }, parseInt(smConfig.speed) || 500);
}, true);


// =============================================
// 🛡️ CHAMADA À API (VIA BACKGROUND OU DIRETA)
// =============================================
async function chamarAPI(textoContexto, elemento) {
    if (smConfig.disabled) return;

    if (currentFetchController) { currentFetchController.abort(); }
    currentFetchController = new AbortController();

    estaCarregando = true;
    atualizarEstadoCarregamento(true);

    const fetchUrl = smConfig.apiUrl && smConfig.apiUrl.trim() !== ''
        ? smConfig.apiUrl
        : 'https://api.languagetool.org/v2/check';

    const params = {
        'text': textoContexto,
        'language': smConfig.language
    };
    if (smConfig.pickyMode) params['level'] = 'picky';

    let data = null;

    // 🆕 Tenta via background primeiro, se falhar vai direto
    try {
        data = await chamarViaBackground(fetchUrl, params);
    } catch (bgError) {
        console.warn('SyntaxMentor: Background falhou, tentando direto:', bgError.message);
        try {
            data = await chamarDireto(fetchUrl, params);
        } catch (directError) {
            console.error('SyntaxMentor: Falha total:', directError.message);
            estaCarregando = false;
            atualizarEstadoCarregamento(false);
            mostrarFeedback('⚠️ Erro de conexão', 'error');
            return;
        }
    }

    if (!data || currentFetchController.signal.aborted) {
        estaCarregando = false;
        atualizarEstadoCarregamento(false);
        return;
    }

    // Verifica se o texto ainda é o mesmo
    let textoAtual;
    if (isSiteSensivel && elemento.isContentEditable) {
        textoAtual = (elemento.textContent || elemento.innerText || '').trim();
    } else {
        textoAtual = (elemento.value || elemento.innerText || elemento.textContent || '').trim();
    }

    if (textoAtual !== textoContexto) {
        estaCarregando = false;
        atualizarEstadoCarregamento(false);
        return;
    }

    // Carrega dicionário
    let dicionarioLower = [];
    if (verificarContextoExtensao()) {
        try {
            const dic = await new Promise(resolve => {
                chrome.storage.local.get(['dicionario_pessoal'], (res) => {
                    if (chrome.runtime.lastError) { resolve([]); return; }
                    resolve(res.dicionario_pessoal || []);
                });
            });
            dicionarioLower = dic.map(w => w.toLowerCase());
        } catch (e) { dicionarioLower = []; }
    }

    // Filtra erros
    errosGlobais = (data.matches || []).filter(m => {
        if (!m.replacements || m.replacements.length === 0) return false;
        const original = m.context.text.substr(m.context.offset, m.context.length);
        const palavraLower = original.toLowerCase();
        if (dicionarioLower.includes(palavraLower) || ignoradosTemporarios.includes(palavraLower)) return false;
        return true;
    });

    elementoGlobal = elemento;

    if (!isSiteSensivel && elemento.isContentEditable && elemento.tagName !== 'TEXTAREA' && elemento.tagName !== 'INPUT') {
        aplicarGrifosNoTexto(errosGlobais, elemento);
    }

    atualizarInterface();
    estaCarregando = false;
    atualizarEstadoCarregamento(false);
}

// 🆕 Tenta via background
function chamarViaBackground(fetchUrl, params) {
    return new Promise((resolve, reject) => {
        if (!chrome.runtime || !chrome.runtime.id) {
            reject(new Error('Contexto inválido'));
            return;
        }

        const timeout = setTimeout(() => {
            reject(new Error('Timeout do background'));
        }, 8000);

        chrome.runtime.sendMessage({
            action: 'checkGrammar',
            text: params.text,
            language: params.language,
            pickyMode: params.pickyMode || false,
            apiUrl: fetchUrl !== 'https://api.languagetool.org/v2/check' ? fetchUrl : ''
        }, (response) => {
            clearTimeout(timeout);

            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }

            if (!response || !response.success) {
                reject(new Error(response ? response.error : 'Resposta inválida'));
                return;
            }

            resolve(response.data);
        });
    });
}

// 🆕 Fallback: requisição direta
async function chamarDireto(fetchUrl, params) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(fetchUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: new URLSearchParams(params),
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data;
    } finally {
        clearTimeout(timeout);
    }
}

function atualizarEstadoCarregamento(carregando) {
    const doc = getDocumentoPrincipal();
    const bubble = doc.getElementById('syntax-mentor-bubble');
    if (!bubble) return;
    if (carregando) {
        bubble.style.opacity = '0.6'; bubble.style.cursor = 'wait'; bubble.style.animation = 'sm-pulse 1.5s infinite';
    } else {
        bubble.style.opacity = '1'; bubble.style.cursor = 'grab'; bubble.style.animation = ''; bubble.title = 'SyntaxMentor';
    }
}

function ignorarTemporariamente(palavra) {
    const palavraLower = palavra.toLowerCase();
    if (!ignoradosTemporarios.includes(palavraLower)) ignoradosTemporarios.push(palavraLower);

    if (!isSiteSensivel && elementoGlobal && elementoGlobal.isContentEditable && elementoGlobal.tagName !== 'TEXTAREA' && elementoGlobal.tagName !== 'INPUT') {
        const palavraEscapada = palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const markRegex = new RegExp(`<mark class="sm-highlight">${palavraEscapada}</mark>`, 'g');
        const cursorSalvo = salvarPosicaoCursor(elementoGlobal);
        elementoGlobal.innerHTML = elementoGlobal.innerHTML.replace(markRegex, palavra);
        restaurarPosicaoCursor(elementoGlobal, cursorSalvo);
    }
    removerErroGlobal(palavra); mostrarFeedback(`"${palavra}" ignorada nesta sessão`, 'info');
}

function aplicarGrifosNoTexto(erros, elemento) {
    if (!elemento || !elemento.isContentEditable || isSiteSensivel) return;
    const cursorSalvo = salvarPosicaoCursor(elemento);
    let html = elemento.innerHTML;
    html = html.replace(/<mark class="sm-highlight">(.*?)<\/mark>/gi, '$1');

    const palavrasUnicas = [];
    erros.forEach(err => {
        const original = err.context.text.substr(err.context.offset, err.context.length);
        if (original.trim() !== "" && !palavrasUnicas.includes(original)) palavrasUnicas.push(original);
    });

    palavrasUnicas.forEach(palavra => {
        const palavraEscapada = palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<!<[^>]*)${palavraEscapada}(?![^<]*>)`, 'g');
        html = html.replace(regex, `<mark class="sm-highlight">$&</mark>`);
    });

    if (elemento.innerHTML !== html) {
        elemento.innerHTML = html; restaurarPosicaoCursor(elemento, cursorSalvo);
    }
}

function aplicarCorrecao(original, sugestao, el) {
    if (!el || !original || !sugestao) return;
    const originalEscapado = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        const regexText = new RegExp(`(?<![\\p{L}])${originalEscapado}(?![\\p{L}])`, 'gu');
        el.value = el.value.replace(regexText, sugestao);
    } else if (el.isContentEditable) {
        if (isSiteSensivel) {
            el.focus();
            const doc = el.ownerDocument || document;
            try {
                doc.execCommand('insertText', false, sugestao);
            } catch (e) {
                const texto = el.textContent || '';
                const novoTexto = texto.replace(new RegExp(originalEscapado, 'gi'), sugestao);
                if (texto !== novoTexto) el.textContent = novoTexto;
            }
        } else {
            const markRegex = new RegExp(`<mark class="sm-highlight">${originalEscapado}</mark>`, 'g');
            let html = el.innerHTML;
            if (markRegex.test(html)) { html = html.replace(markRegex, sugestao); }
            else {
                const safeRegex = new RegExp(`(?<!<[^>]*)(?<![\\p{L}])${originalEscapado}(?![\\p{L}])(?![^<]*>)`, 'gu');
                html = html.replace(safeRegex, sugestao);
            }
            const cursorSalvo = salvarPosicaoCursor(el);
            el.innerHTML = html;
            restaurarPosicaoCursor(el, cursorSalvo);
        }
    }
    incrementarStats(1);
}

function incrementarStats(qtd) {
    if (!verificarContextoExtensao()) return;
    storageGetSegurado({ totalCorrigidas: 0 }, (res) => { storageSetSegurado({ totalCorrigidas: (res.totalCorrigidas || 0) + qtd }); });
}

function removerErroGlobal(original) {
    errosGlobais = errosGlobais.filter(err => {
        const errOriginal = err.context.text.substr(err.context.offset, err.context.length);
        return errOriginal !== original;
    });
    atualizarInterface();
}

// =============================================
// INTERFACE (BOLHA E PAINEL)
// =============================================
function atualizarInterface() {
    if (smConfig.disabled) return;

    const doc = getDocumentoPrincipal();
    const body = getBodyPrincipal();
    if (!body) return;

    let bubble = doc.getElementById('syntax-mentor-bubble');
    let totalOcorrencias = 0;

    errosGlobais.forEach(err => {
        const original = err.context.text.substr(err.context.offset, err.context.length);
        if (original.trim() !== "") totalOcorrencias++;
    });

    if (!bubble) {
        bubble = doc.createElement('div');
        bubble.id = 'syntax-mentor-bubble';
        bubble.title = 'SyntaxMentor';
        body.appendChild(bubble);
        tornarBubbleArrastavel(bubble, doc);

        bubble.addEventListener('click', () => {
            if (!isDraggingBubble && !estaCarregando && errosGlobais.length > 0) {
                painelAberto ? fecharPainel() : exibirPainel();
            }
            isDraggingBubble = false;
        });
    }

    if (smConfig.darkMode) bubble.classList.add('sm-dark'); else bubble.classList.remove('sm-dark');

    if (bubblePosX !== null && bubblePosY !== null) {
        bubble.style.left = bubblePosX; bubble.style.top = bubblePosY;
        bubble.style.right = 'auto'; bubble.style.bottom = 'auto';
    }

    if (totalOcorrencias === 0) {
        bubble.classList.add('sm-bubble-success'); bubble.classList.remove('sm-bubble-error');
        bubble.innerHTML = `<span class="sm-bubble-icon">✓</span>`;
        if (painelAberto) fecharPainelComSucesso();
    } else {
        bubble.classList.add('sm-bubble-error'); bubble.classList.remove('sm-bubble-success');
        bubble.innerHTML = `<span class="sm-bubble-icon">✏️</span><span class="sm-bubble-badge">${totalOcorrencias}</span>`;
        if (painelAberto) exibirPainel();
    }
}

function exibirPainel() {
    painelAberto = true; indexSugestao = -1;

    const doc = getDocumentoPrincipal();
    const body = getBodyPrincipal();
    if (!body) return;

    let painel = doc.getElementById('syntax-mentor-painel');
    if (!painel) {
        painel = doc.createElement('div');
        painel.id = 'syntax-mentor-painel';
        painel.setAttribute('role', 'dialog');
        painel.setAttribute('aria-label', 'Sugestões de Revisão');
        body.appendChild(painel);
    }

    if (smConfig.darkMode) painel.classList.add('sm-dark'); else painel.classList.remove('sm-dark');

    const mapaErros = {}; let totalOcorrencias = 0;
    errosGlobais.forEach(err => {
        const original = err.context.text.substr(err.context.offset, err.context.length);
        const sugestao = err.replacements[0]?.value || "";
        if (original.trim() !== "") {
            if (!mapaErros[original]) mapaErros[original] = { sugestao, contagem: 0, msg: err.message };
            mapaErros[original].contagem++; totalOcorrencias++;
        }
    });

    let html = `<div id="syntax-mentor-header"><span style="font-weight:bold;font-size:14px;">Sugestões de Revisão</span><button id="btn-fechar-painel" aria-label="Fechar">✕</button></div><div id="syntax-mentor-content"><div class="body-cards">`;

    if (Object.keys(mapaErros).length === 0) {
        html += `<div style="text-align:center;padding:20px;color:#888;">Nenhum erro encontrado ✓</div>`;
    } else {
        Object.keys(mapaErros).forEach((original) => {
            const info = mapaErros[original];
            const textoSugestao = info.sugestao === "" ? "[Remover]" : info.sugestao;
            const labelBotao = info.contagem > 1 ? `${textoSugestao} (${info.contagem}x)` : textoSugestao;
            const msgSegura = info.msg.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const originalSeguro = original.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const sugestaoSegura = info.sugestao.replace(/"/g, '&quot;');

            html += `<div class="erro-card"><p class="erro-msg" title="${msgSegura}">Erro em: "<strong>${originalSeguro}</strong>" <span class="info-icon">ⓘ</span></p><div class="sugestao-container"><span class="palavra-original">${originalSeguro}</span><span class="seta">→</span><div class="botoes-acao"><button class="btn-fix-mini" data-original="${originalSeguro}" data-sugestao="${sugestaoSegura}">${labelBotao}</button><button class="btn-ignorar-sessao" data-original="${originalSeguro}" title="Ignorar nesta sessão">↩</button><button class="btn-ignorar" data-original="${originalSeguro}" title="Adicionar ao dicionário">+</button></div></div></div>`;
        });
    }

    html += `</div><div class="footer-actions"><button id="btn-corrigir-tudo">✨ Corrigir Tudo (${totalOcorrencias})</button><button id="btn-ignorar-tudo">Ignorar Tudo</button></div><div style="text-align:center;margin-top:8px;font-size:10px;color:#9ca3af;">Dica: Alt+Shift+S corrige tudo sem abrir o painel</div>`;
    if (ignoradosTemporarios.length > 0) html += `<div style="text-align:center;margin-top:4px;font-size:10px;color:#9ca3af;">📋 ${ignoradosTemporarios.length} palavra(s) ignorada(s) nesta sessão</div>`;
    html += `</div>`;

    painel.innerHTML = html;
    tornarArrastavel(painel, doc.getElementById('syntax-mentor-header'));

    doc.getElementById('btn-fechar-painel').onclick = (e) => { e.stopPropagation(); fecharPainel(); };

    painel.querySelectorAll('.btn-fix-mini').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            if (elementoGlobal) aplicarCorrecao(btn.dataset.original, btn.dataset.sugestao, elementoGlobal);
            removerErroGlobal(btn.dataset.original);
        };
    });

    painel.querySelectorAll('.btn-ignorar-sessao').forEach(btn => { btn.onclick = (e) => { e.stopPropagation(); ignorarTemporariamente(btn.dataset.original); }; });

    painel.querySelectorAll('.btn-ignorar').forEach(btn => {
        btn.onclick = async (e) => {
            e.stopPropagation(); const original = btn.dataset.original;
            if (verificarContextoExtensao()) {
                try {
                    const dic = await new Promise(r => { chrome.storage.local.get(['dicionario_pessoal'], res => { if (chrome.runtime.lastError) { r([]); return; } r(res.dicionario_pessoal || []); }); });
                    if (!dic.includes(original)) { dic.push(original); storageSetSegurado({ 'dicionario_pessoal': dic }); }
                } catch (err) { console.warn('SyntaxMentor: Erro ao guardar dicionário:', err); }
            }
            if (!isSiteSensivel && elementoGlobal && elementoGlobal.isContentEditable && elementoGlobal.tagName !== 'TEXTAREA' && elementoGlobal.tagName !== 'INPUT') {
                const originalEscapado = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const markRegex = new RegExp(`<mark class="sm-highlight">${originalEscapado}</mark>`, 'g');
                const cursorSalvo = salvarPosicaoCursor(elementoGlobal);
                elementoGlobal.innerHTML = elementoGlobal.innerHTML.replace(markRegex, original);
                restaurarPosicaoCursor(elementoGlobal, cursorSalvo);
            }
            removerErroGlobal(original); mostrarFeedback(`"${original}" → dicionário`, 'success');
        };
    });

    const btnCorrigirTudo = doc.getElementById('btn-corrigir-tudo');
    if (btnCorrigirTudo) btnCorrigirTudo.onclick = () => { painel.querySelectorAll('.btn-fix-mini').forEach(b => { if (elementoGlobal) aplicarCorrecao(b.dataset.original, b.dataset.sugestao, elementoGlobal); }); errosGlobais = []; atualizarInterface(); mostrarFeedback('✓ Tudo corrigido!', 'success'); };

    const btnIgnorarTudo = doc.getElementById('btn-ignorar-tudo');
    if (btnIgnorarTudo) btnIgnorarTudo.onclick = () => { limparTodosErros(); };
}

function fecharPainel() {
    const doc = getDocumentoPrincipal();
    const painel = doc.getElementById('syntax-mentor-painel');
    if (painel) painel.remove();
    painelAberto = false; indexSugestao = -1;
}

function fecharPainelComSucesso() {
    const doc = getDocumentoPrincipal();
    const content = doc.getElementById('syntax-mentor-content');
    if (content) {
        content.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 120px; text-align: center; padding: 20px;"><div style="font-size: 48px; color: #28a745; line-height: 1; margin-bottom: 10px;">✓</div><p style="color: #28a745; font-weight: bold; font-size: 16px; margin: 0;">Tudo limpo!</p></div>`;
        setTimeout(() => fecharPainel(), 1500);
    }
}

function tornarBubbleArrastavel(elemento, doc) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const d = doc || document;

    elemento.onmousedown = function (e) {
        e.preventDefault();
        isDraggingBubble = false;
        pos3 = e.clientX;
        pos4 = e.clientY;
        d.onmouseup = fecharArraste;
        d.onmousemove = arrastarElemento;
    };

    function arrastarElemento(e) {
        e.preventDefault();
        isDraggingBubble = true;
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        elemento.style.top = (elemento.offsetTop - pos2) + "px";
        elemento.style.left = (elemento.offsetLeft - pos1) + "px";
        elemento.style.right = 'auto';
        elemento.style.bottom = 'auto';
        bubblePosX = elemento.style.left;
        bubblePosY = elemento.style.top;
    }

    function fecharArraste() {
        d.onmouseup = null;
        d.onmousemove = null;
        setTimeout(() => { isDraggingBubble = false; }, 100);
    }
}

function tornarArrastavel(painel, handle) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    const doc = painel.ownerDocument || document;

    if (handle) {
        handle.onmousedown = function (e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            doc.onmouseup = fecharArraste;
            doc.onmousemove = arrastarElemento;
        };
    }

    function arrastarElemento(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        painel.style.top = (painel.offsetTop - pos2) + "px";
        painel.style.left = (painel.offsetLeft - pos1) + "px";
    }

    function fecharArraste() {
        doc.onmouseup = null;
        doc.onmousemove = null;
    }
}

if (isExtensaoContextoValido()) iniciarConfiguracoes();