// SyntaxMentor - v2.1.1 (Fix: React/Vue State Update)
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

const sitesSemGrifos = ['mail.google.com', 'linkedin.com', 'docs.google.com', 'notion.so', 'twitter.com', 'x.com'];
const isSiteRestrito = sitesSemGrifos.some(d => window.location.hostname.includes(d));

let ignoradosTemporarios = [];
let historicoCorrecoes = [];

let smConfig = {
    language: 'pt-BR', pickyMode: true, speed: 500, darkMode: false, blacklist: [],
    apiUrl: '', strictMode: false, disabled: false,
    toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's' },
    ignoreShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 'i' },
    corrigirTudoShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 's' }
};

// =============================================
// 🆕 UTILITÁRIO: DISPARA EVENTOS NATIVOS PARA REACT/VUE
// =============================================
function dispararEventosNativos(elemento) {
    if (!elemento) return;

    // Evento 'input' - crucial para React
    elemento.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

    // Evento 'change' - para formulários e Vue
    elemento.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

    // Evento 'blur' e 'focus' - para forçar save em alguns frameworks
    elemento.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    elemento.dispatchEvent(new FocusEvent('focus', { bubbles: true }));

    // 🆕 Evento personalizado para editores ricos
    elemento.dispatchEvent(new CustomEvent('textchange', { bubbles: true }));

    // 🆕 Para React 17+: dispara evento no DOM nativo
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
    )?.set;
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
    )?.set;

    if (elemento.tagName === 'INPUT' && nativeInputValueSetter) {
        nativeInputValueSetter.call(elemento, elemento.value);
    } else if (elemento.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
        nativeTextAreaValueSetter.call(elemento, elemento.value);
    }

    // 🆕 Dispara evento de teclado para editores que escutam keystrokes
    elemento.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Process' }));
    elemento.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Process' }));

    // 🆕 Força um evento de composição (IME) para editores asiáticos
    elemento.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    elemento.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: elemento.value || elemento.textContent || '' }));
}

function atualizarElementoComEventos(elemento) {
    if (!elemento) return;

    // Para contenteditable (React/Vue)
    if (elemento.isContentEditable || elemento.getAttribute?.('contenteditable') === 'true') {
        // Foca e desfoca para forçar o framework a reconhecer a mudança
        elemento.focus();

        // Dispara eventos
        elemento.dispatchEvent(new Event('input', { bubbles: true }));
        elemento.dispatchEvent(new Event('change', { bubbles: true }));
        elemento.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText' }));
        elemento.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));

        // Pequeno delay e blur/focus para forçar save
        setTimeout(() => {
            elemento.blur();
            elemento.focus();
        }, 50);
    }

    // Para inputs e textareas
    if (elemento.tagName === 'INPUT' || elemento.tagName === 'TEXTAREA') {
        elemento.dispatchEvent(new Event('input', { bubbles: true }));
        elemento.dispatchEvent(new Event('change', { bubbles: true }));

        // Trigger React synthetic event
        const tracker = elemento._valueTracker;
        if (tracker) {
            tracker.setValue(elemento.value || '');
        }
    }

    // Dispara evento genérico no documento
    document.dispatchEvent(new CustomEvent('sm:textChanged', {
        detail: { element: elemento }
    }));
}

// =============================================
// UTILITÁRIOS GERAIS
// =============================================
function isExtensaoAtiva() {
    try { return !!(chrome && chrome.runtime && chrome.runtime.id); } catch (e) { return false; }
}

function storageGetSeguro(chave, fallback) {
    if (!isExtensaoAtiva()) { fallback({}); return; }
    try {
        chrome.storage.local.get(chave, (res) => {
            if (chrome.runtime.lastError) { fallback({}); return; }
            fallback(res);
        });
    } catch (e) { fallback({}); }
}

function storageSetSeguro(dados) {
    if (!isExtensaoAtiva()) return;
    try { chrome.storage.local.set(dados); } catch (e) { }
}

function mostrarFeedback(msg, tipo) {
    document.querySelectorAll('.sm-feedback-flutuante').forEach(el => el.remove());
    const f = document.createElement('div');
    f.textContent = msg;
    f.className = 'sm-feedback-flutuante';
    const cor = tipo === 'success' ? '#28a745' : tipo === 'error' ? '#e53e3e' : '#6b7280';
    f.style.cssText = `position:fixed;top:20px;right:20px;z-index:2147483647;background:${cor};color:#fff;padding:10px 20px;border-radius:8px;font:600 14px 'Segoe UI',sans-serif;box-shadow:0 4px 15px rgba(0,0,0,0.3);pointer-events:none;`;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 2200);
}

// =============================================
// INICIALIZAÇÃO
// =============================================
function iniciar() {
    if (!isExtensaoAtiva()) {
        setTimeout(iniciar, 2000);
        return;
    }

    storageGetSeguro([
        'language', 'pickyMode', 'speed', 'darkMode', 'blacklist',
        'apiUrl', 'strictMode', 'toggleShortcut', 'ignoreShortcut', 'corrigirTudoShortcut'
    ], (res) => {
        smConfig = { ...smConfig, ...res };
        if (smConfig.blacklist.some(d => window.location.hostname.includes(d))) {
            smConfig.disabled = true;
        }
        if (smConfig.darkMode) {
            document.body.classList.add('sm-dark-root');
        }
    });

    try {
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.darkMode) {
                smConfig.darkMode = changes.darkMode.newValue;
                if (smConfig.darkMode) document.body.classList.add('sm-dark-root');
                else document.body.classList.remove('sm-dark-root');
                atualizarInterface();
            }
            if (changes.blacklist) {
                smConfig.blacklist = changes.blacklist.newValue || [];
                smConfig.disabled = smConfig.blacklist.some(d => window.location.hostname.includes(d));
            }
        });
    } catch (e) { }
}

// =============================================
// ATALHOS
// =============================================
document.addEventListener('keydown', (e) => {
    if (smConfig.disabled) return;

    const scToggle = smConfig.toggleShortcut || { altKey: true, ctrlKey: false, shiftKey: false, key: 's' };
    const scIgnore = smConfig.ignoreShortcut || { altKey: true, ctrlKey: false, shiftKey: false, key: 'i' };
    const scCorrigirTudo = smConfig.corrigirTudoShortcut || { altKey: true, ctrlKey: false, shiftKey: true, key: 's' };

    if (e.altKey === scToggle.altKey && e.ctrlKey === scToggle.ctrlKey && e.shiftKey === scToggle.shiftKey && e.key.toLowerCase() === scToggle.key) {
        e.preventDefault();
        if (errosGlobais.length > 0) painelAberto ? fecharPainel() : exibirPainel();
    }

    if (e.altKey === scIgnore.altKey && e.ctrlKey === scIgnore.ctrlKey && e.shiftKey === scIgnore.shiftKey && e.key.toLowerCase() === scIgnore.key) {
        e.preventDefault();
        limparTudo();
    }

    if (e.altKey === scCorrigirTudo.altKey && e.ctrlKey === scCorrigirTudo.ctrlKey && e.shiftKey === scCorrigirTudo.shiftKey && e.key.toLowerCase() === scCorrigirTudo.key) {
        e.preventDefault();
        if (errosGlobais.length > 0 && elementoGlobal) corrigirTudo();
    }

    if (e.key === 'Escape' && painelAberto) {
        fecharPainel();
    }

    if (painelAberto && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        const botoes = [...document.querySelectorAll('#syntax-mentor-painel .btn-fix-mini')];
        if (botoes.length === 0) return;
        indexSugestao = e.key === 'ArrowDown'
            ? (indexSugestao + 1) % botoes.length
            : (indexSugestao - 1 + botoes.length) % botoes.length;
        botoes[indexSugestao].focus();
    }
});

function limparTudo() {
    if (!isSiteRestrito && elementoGlobal?.isContentEditable) {
        elementoGlobal.innerHTML = elementoGlobal.innerHTML.replace(/<mark class="sm-highlight">(.*?)<\/mark>/gi, '$1');
        atualizarElementoComEventos(elementoGlobal);
    }
    errosGlobais = [];
    atualizarInterface();
}

function corrigirTudo() {
    if (!elementoGlobal) return;
    const unicos = {};
    errosGlobais.forEach(err => {
        const o = err.context.text.substr(err.context.offset, err.context.length);
        const s = err.replacements[0]?.value || "";
        if (o.trim() && s && !unicos[o]) unicos[o] = s;
    });
    Object.entries(unicos).forEach(([o, s]) => aplicarCorrecao(o, s, elementoGlobal));
    errosGlobais = [];
    atualizarInterface();
    mostrarFeedback('✓ Tudo corrigido!', 'success');
}

// =============================================
// DETECÇÃO DE DIGITAÇÃO
// =============================================
document.addEventListener('input', (e) => {
    if (smConfig.disabled) return;

    let el = e.target;
    if (el.closest?.('[contenteditable="true"]')) el = el.closest('[contenteditable="true"]');

    const valido = el.tagName === 'TEXTAREA' ||
        el.isContentEditable ||
        el.getAttribute?.('contenteditable') === 'true' ||
        (el.tagName === 'INPUT' && ['text', 'search', 'url', 'email'].includes(el.type));

    if (!valido) return;
    if (el.tagName === 'INPUT' && smConfig.strictMode) return;

    clearTimeout(timeoutDigitacao);
    if (currentFetchController) currentFetchController.abort();

    timeoutDigitacao = setTimeout(() => {
        const texto = (el.value || el.textContent || el.innerText || '').trim();
        if (texto.length > 1) {
            textoUltimaVerificacao = texto;
            verificarTexto(texto, el);
        } else {
            errosGlobais = [];
            atualizarInterface();
            if (!isSiteRestrito && el.isContentEditable) {
                el.innerHTML = el.innerHTML.replace(/<mark class="sm-highlight">(.*?)<\/mark>/gi, '$1');
                atualizarElementoComEventos(el);
            }
        }
    }, parseInt(smConfig.speed) || 500);
}, true);

// =============================================
// VERIFICAÇÃO DE TEXTO (FETCH DIRETO)
// =============================================
async function verificarTexto(texto, elemento) {
    if (smConfig.disabled) return;

    currentFetchController = new AbortController();
    estaCarregando = true;
    atualizarEstadoCarregamento(true);

    const url = smConfig.apiUrl || 'https://api.languagetool.org/v2/check';
    const params = new URLSearchParams({ text: texto, language: smConfig.language });
    if (smConfig.pickyMode) params.set('level', 'picky');

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params,
            signal: currentFetchController.signal
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const data = await resp.json();

        const atual = (elemento.value || elemento.textContent || elemento.innerText || '').trim();
        if (atual !== texto) {
            estaCarregando = false;
            atualizarEstadoCarregamento(false);
            return;
        }

        let dic = [];
        if (isExtensaoAtiva()) {
            try {
                const res = await new Promise(r => chrome.storage.local.get(['dicionario_pessoal'], r));
                dic = (res.dicionario_pessoal || []).map(w => w.toLowerCase());
            } catch (e) { }
        }

        errosGlobais = (data.matches || []).filter(m => {
            if (!m.replacements?.length) return false;
            const o = m.context.text.substr(m.context.offset, m.context.length);
            const ol = o.toLowerCase();
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
        mostrarFeedback('⚠️ Erro de conexão', 'error');
    } finally {
        estaCarregando = false;
        atualizarEstadoCarregamento(false);
    }
}

function atualizarEstadoCarregamento(on) {
    const b = document.getElementById('syntax-mentor-bubble');
    if (!b) return;
    b.style.opacity = on ? '0.6' : '1';
    b.style.cursor = on ? 'wait' : 'grab';
    b.style.animation = on ? 'sm-pulse 1.5s infinite' : '';
}

function aplicarGrifos(erros, el) {
    if (!el?.isContentEditable || isSiteRestrito) return;
    let html = el.innerHTML.replace(/<mark class="sm-highlight">(.*?)<\/mark>/gi, '$1');
    const palavras = [...new Set(erros.map(e => e.context.text.substr(e.context.offset, e.context.length)).filter(Boolean))];
    palavras.forEach(p => {
        const esc = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp(`(?<!<[^>]*)${esc}(?![^<]*>)`, 'g'), `<mark class="sm-highlight">$&</mark>`);
    });
    if (el.innerHTML !== html) {
        el.innerHTML = html;
        // 🆕 Não dispara eventos nos grifos - apenas marcação visual
    }
}

// =============================================
// 🆕 CORREÇÃO DE TEXTO (COM DISPATCH DE EVENTOS)
// =============================================
function aplicarCorrecao(original, sugestao, el) {
    if (!el || !original || !sugestao) return;
    const esc = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
        // 🆕 Método seguro para inputs/textarea com React
        const valorAntigo = el.value;
        el.value = el.value.replace(new RegExp(`(?<![\\p{L}])${esc}(?![\\p{L}])`, 'gu'), sugestao);

        // Só dispara eventos se o valor realmente mudou
        if (el.value !== valorAntigo) {
            // 🆕 Dispara eventos para React/Vue reconhecer a mudança
            dispararEventosNativos(el);
        }
    } else if (el.isContentEditable) {
        if (isSiteRestrito) {
            // Para sites restritos, usa execCommand que é mais compatível
            el.focus();
            try {
                // Seleciona o texto a ser substituído
                const sel = window.getSelection();
                if (sel && sel.rangeCount > 0) {
                    document.execCommand('insertText', false, sugestao);
                }
            } catch (e) {
                // Fallback: substitui via textContent
                const textoAtual = el.textContent || '';
                const novoTexto = textoAtual.replace(new RegExp(esc, 'gi'), sugestao);
                if (textoAtual !== novoTexto) {
                    el.textContent = novoTexto;
                }
            }
            // 🆕 Dispara eventos para o framework reconhecer
            atualizarElementoComEventos(el);
        } else {
            // Para editores normais, substitui o HTML
            let html = el.innerHTML;
            const htmlAntigo = html;

            // Primeiro tenta substituir dentro das tags mark
            html = html.replace(new RegExp(`<mark class="sm-highlight">${esc}</mark>`, 'g'), sugestao);

            // Se não encontrou dentro de mark, procura o texto solto
            if (html === htmlAntigo) {
                html = html.replace(new RegExp(`(?<!<[^>]*)(?<![\\p{L}])${esc}(?![\\p{L}])(?![^<]*>)`, 'gu'), sugestao);
            }

            // Só aplica se houve mudança
            if (html !== htmlAntigo) {
                el.innerHTML = html;
            }

            // 🆕 Dispara eventos para o framework reconhecer a mudança
            atualizarElementoComEventos(el);
        }
    }

    historicoCorrecoes.push({ el, original, sugestao });
    if (historicoCorrecoes.length > 50) historicoCorrecoes.shift();

    storageGetSeguro({ totalCorrigidas: 0 }, (res) => {
        storageSetSeguro({ totalCorrigidas: (res.totalCorrigidas || 0) + 1 });
    });
}

function ignorarTemporariamente(palavra) {
    const pl = palavra.toLowerCase();
    if (!ignoradosTemporarios.includes(pl)) ignoradosTemporarios.push(pl);
    if (!isSiteRestrito && elementoGlobal?.isContentEditable) {
        const esc = palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        elementoGlobal.innerHTML = elementoGlobal.innerHTML.replace(
            new RegExp(`<mark class="sm-highlight">${esc}</mark>`, 'g'), palavra
        );
        atualizarElementoComEventos(elementoGlobal);
    }
    errosGlobais = errosGlobais.filter(e => e.context.text.substr(e.context.offset, e.context.length) !== palavra);
    atualizarInterface();
    mostrarFeedback(`"${palavra}" ignorada nesta sessão`, 'info');
}

// =============================================
// INTERFACE
// =============================================
function atualizarInterface() {
    if (smConfig.disabled) return;

    let bubble = document.getElementById('syntax-mentor-bubble');
    const total = errosGlobais.filter(e => e.context.text.substr(e.context.offset, e.context.length).trim()).length;

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

    if (smConfig.darkMode) bubble.classList.add('sm-dark');
    else bubble.classList.remove('sm-dark');

    if (bubblePosX) {
        bubble.style.left = bubblePosX;
        bubble.style.top = bubblePosY;
        bubble.style.right = 'auto';
        bubble.style.bottom = 'auto';
    }

    if (total === 0) {
        bubble.className = 'sm-bubble-success';
        bubble.innerHTML = '<span class="sm-bubble-icon">✓</span>';
        if (painelAberto) fecharPainelComSucesso();
    } else {
        bubble.className = 'sm-bubble-error';
        bubble.innerHTML = `<span class="sm-bubble-icon">✏️</span><span class="sm-bubble-badge">${total}</span>`;
        if (painelAberto) exibirPainel();
    }
}

function exibirPainel() {
    painelAberto = true;
    indexSugestao = -1;

    let painel = document.getElementById('syntax-mentor-painel');
    if (!painel) {
        painel = document.createElement('div');
        painel.id = 'syntax-mentor-painel';
        document.body.appendChild(painel);
    }

    if (smConfig.darkMode) painel.classList.add('sm-dark');
    else painel.classList.remove('sm-dark');

    const mapa = {};
    let total = 0;
    errosGlobais.forEach(e => {
        const o = e.context.text.substr(e.context.offset, e.context.length);
        if (!o.trim()) return;
        if (!mapa[o]) mapa[o] = { s: e.replacements[0]?.value || '', c: 0, msg: e.message };
        mapa[o].c++;
        total++;
    });

    let html = `<div id="syntax-mentor-header"><span>📝 Sugestões</span><button id="btn-fechar-painel">✕</button></div><div id="syntax-mentor-content"><div class="body-cards">`;

    if (Object.keys(mapa).length === 0) {
        html += '<div style="text-align:center;padding:20px;color:#888;">✓ Nenhum erro</div>';
    } else {
        Object.entries(mapa).forEach(([o, info]) => {
            const label = info.c > 1 ? `${info.s || '[Remover]'} (${info.c}x)` : (info.s || '[Remover]');
            html += `<div class="erro-card">
                <p class="erro-msg" title="${info.msg.replace(/"/g, '&quot;')}">Erro: <strong>${o}</strong></p>
                <div class="sugestao-container">
                    <span class="palavra-original">${o}</span><span class="seta">→</span>
                    <div class="botoes-acao">
                        <button class="btn-fix-mini" data-o="${o}" data-s="${info.s}">${label}</button>
                        <button class="btn-ignorar-sessao" data-o="${o}">↩</button>
                        <button class="btn-ignorar" data-o="${o}">+</button>
                    </div>
                </div>
            </div>`;
        });
    }

    html += `</div><div class="footer-actions">
        <button id="btn-corrigir-tudo">✨ Corrigir Tudo (${total})</button>
        <button id="btn-ignorar-tudo">Ignorar Tudo</button>
    </div>
    ${ignoradosTemporarios.length ? `<div style="text-align:center;font-size:10px;color:#9ca3af;">📋 ${ignoradosTemporarios.length} ignorada(s) na sessão</div>` : ''}
    <div style="text-align:center;font-size:10px;color:#9ca3af;">Alt+Shift+S = corrigir sem abrir</div></div>`;

    painel.innerHTML = html;
    tornarArrastavelPainel(painel, document.getElementById('syntax-mentor-header'));

    document.getElementById('btn-fechar-painel').onclick = fecharPainel;
    document.getElementById('btn-corrigir-tudo').onclick = corrigirTudo;
    document.getElementById('btn-ignorar-tudo').onclick = limparTudo;

    painel.querySelectorAll('.btn-fix-mini').forEach(b => {
        b.onclick = () => {
            aplicarCorrecao(b.dataset.o, b.dataset.s, elementoGlobal);
            errosGlobais = errosGlobais.filter(e => e.context.text.substr(e.context.offset, e.context.length) !== b.dataset.o);
            atualizarInterface();
        };
    });
    painel.querySelectorAll('.btn-ignorar-sessao').forEach(b => {
        b.onclick = () => ignorarTemporariamente(b.dataset.o);
    });
    painel.querySelectorAll('.btn-ignorar').forEach(b => {
        b.onclick = async () => {
            const o = b.dataset.o;
            if (isExtensaoAtiva()) {
                const res = await new Promise(r => chrome.storage.local.get(['dicionario_pessoal'], r));
                const dic = res.dicionario_pessoal || [];
                if (!dic.includes(o)) { dic.push(o); storageSetSeguro({ dicionario_pessoal: dic }); }
            }
            if (!isSiteRestrito && elementoGlobal?.isContentEditable) {
                elementoGlobal.innerHTML = elementoGlobal.innerHTML.replace(new RegExp(`<mark class="sm-highlight">${o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</mark>`, 'g'), o);
                atualizarElementoComEventos(elementoGlobal);
            }
            errosGlobais = errosGlobais.filter(e => e.context.text.substr(e.context.offset, e.context.length) !== o);
            atualizarInterface();
            mostrarFeedback(`"${o}" → dicionário`, 'success');
        };
    });
}

function fecharPainel() {
    document.getElementById('syntax-mentor-painel')?.remove();
    painelAberto = false;
}

function fecharPainelComSucesso() {
    const c = document.getElementById('syntax-mentor-content');
    if (c) c.innerHTML = '<div style="text-align:center;padding:30px;"><div style="font-size:48px;color:#28a745;">✓</div><p>Tudo limpo!</p></div>';
    setTimeout(fecharPainel, 1500);
}

// =============================================
// ARRASTE
// =============================================
function tornarArrastavel(el) {
    let p1, p2, p3, p4;
    el.onmousedown = e => {
        e.preventDefault();
        isDraggingBubble = false;
        p3 = e.clientX; p4 = e.clientY;
        document.onmousemove = e2 => {
            e2.preventDefault();
            isDraggingBubble = true;
            p1 = p3 - e2.clientX; p2 = p4 - e2.clientY;
            p3 = e2.clientX; p4 = e2.clientY;
            el.style.top = (el.offsetTop - p2) + 'px';
            el.style.left = (el.offsetLeft - p1) + 'px';
            el.style.right = 'auto'; el.style.bottom = 'auto';
            bubblePosX = el.style.left; bubblePosY = el.style.top;
        };
        document.onmouseup = () => {
            document.onmousemove = null;
            setTimeout(() => isDraggingBubble = false, 100);
        };
    };
}

function tornarArrastavelPainel(painel, handle) {
    let p1, p2, p3, p4;
    if (handle) {
        handle.onmousedown = e => {
            e.preventDefault();
            p3 = e.clientX; p4 = e.clientY;
            document.onmousemove = e2 => {
                e2.preventDefault();
                p1 = p3 - e2.clientX; p2 = p4 - e2.clientY;
                p3 = e2.clientX; p4 = e2.clientY;
                painel.style.top = (painel.offsetTop - p2) + 'px';
                painel.style.left = (painel.offsetLeft - p1) + 'px';
            };
            document.onmouseup = () => document.onmousemove = null;
        };
    }
}

// =============================================
// START
// =============================================
iniciar();