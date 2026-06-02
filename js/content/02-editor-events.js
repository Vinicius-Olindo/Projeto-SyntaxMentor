// SyntaxMentor content module: Undo, feedback and editor events
// Loaded in manifest.json order.

// =============================================
// SISTEMA DE DESFAZER (CORRIGIDO)
// =============================================

function salvarEstadoParaDesfazer(elemento, palavraOriginal, palavraNova, textoAntes = null, textoDepois = null) {
    if (!elemento) return;
    const textoAnterior = textoAntes ?? obterEstadoAtualParaDesfazer(elemento);
    let textoPosterior = textoDepois;
    if (textoPosterior == null && textoAnterior) {
        const esc = palavraOriginal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?<![\\p{L}])${esc}(?![\\p{L}])`, 'gu');
        textoPosterior = textoAnterior.replace(regex, palavraNova);
    }
    historicoDesfazer.push({
        elemento: elemento,
        textoAnterior: textoAnterior,
        textoPosterior: textoPosterior,
        formato: obterFormatoDesfazer(elemento),
        palavraOriginal: palavraOriginal,
        palavraNova: palavraNova,
        timestamp: Date.now()
    });
    if (historicoDesfazer.length > MAX_HISTORICO_DESFAZER) historicoDesfazer.shift();
    smLog('Estado salvo para desfazer:', { palavraOriginal, palavraNova });
}

function obterFormatoDesfazer(elemento) {
    if (!elemento) return 'text';
    if (elemento.tagName === 'TEXTAREA' || elemento.tagName === 'INPUT') return 'value';
    if (elemento.isContentEditable) return 'html';
    return 'text';
}

function obterEstadoAtualParaDesfazer(elemento) {
    const formato = obterFormatoDesfazer(elemento);
    if (formato === 'value') return elemento.value || '';
    if (formato === 'html') return elemento.innerHTML || '';
    return elemento.textContent || elemento.innerText || '';
}

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
    try {
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
            el.value = ultima.textoAnterior;
            dispararEventosNativos(el);
        } else if (el.isContentEditable) {
            el.innerHTML = ultima.textoAnterior;
            atualizarElementoComEventos(el);
        } else {
            mostrarFeedback('⚠️ Elemento não suporta desfazer', 'info');
            return false;
        }
        mostrarFeedback(`↩ Desfeito: "${ultima.palavraNova}" → "${ultima.palavraOriginal}"`, 'info');
        return true;
    } catch (err) {
        smError('Erro ao desfazer:', err);
        mostrarFeedback('❌ Erro ao desfazer', 'error');
        return false;
    }
}

function mostrarFeedback(msg, tipo, duracaoMs = null) {
    document.querySelectorAll('.sm-feedback-flutuante').forEach(el => el.remove());
    const feedback = document.createElement('div');
    feedback.textContent = msg;
    feedback.className = 'sm-feedback-flutuante';
    const cores = { success: '#28a745', error: '#e53e3e', info: '#6b7280', warning: '#f59e0b' };
    feedback.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
        background: ${cores[tipo] || cores.info}; color: #fff; padding: 12px 18px;
        border-radius: 8px; font: 600 14px 'Segoe UI', sans-serif;
        box-shadow: 0 4px 15px rgba(0,0,0,0.3); pointer-events: none;
        max-width: 350px; word-wrap: break-word; line-height: 1.4;
    `;
    document.body.appendChild(feedback);
    if (!document.querySelector('#sm-feedback-style')) {
        const style = document.createElement('style');
        style.id = 'sm-feedback-style';
        style.textContent = `@keyframes sm-feedback-fadeout {
            0% { opacity: 1; transform: translateX(0); }
            70% { opacity: 1; transform: translateX(0); }
            100% { opacity: 0; transform: translateX(20px); }
        }`;
        document.head.appendChild(style);
    }
    const duracao = duracaoMs || Math.min(8000, Math.max(2000, msg.length * 50 + 1500));
    feedback.style.animation = `sm-feedback-fadeout ${duracao / 1000}s forwards`;
    setTimeout(() => { if (feedback.parentNode) feedback.remove(); }, duracao);
}

function mostrarFeedbackInteligente(msg, tipo) { mostrarFeedback(msg, tipo); }

// =============================================
// EVENTOS E DISPAROS
// =============================================

function dispararEventosNativos(elemento) {
    if (!elemento) return;
    const start = elemento.selectionStart;
    const end = elemento.selectionEnd;
    const valor = elemento.value;
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set ||
                        Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (nativeSetter) {
        try { nativeSetter.call(elemento, valor); } catch(e) { elemento.value = valor; }
    }
    try { elemento.setSelectionRange(start, end); } catch(e) {}
    const eventos = [
        new Event('input', { bubbles: true }),
        new Event('change', { bubbles: true }),
        new InputEvent('input', { bubbles: true, inputType: 'insertText', data: valor }),
        new CompositionEvent('compositionend', { bubbles: true, data: valor }),
        new FocusEvent('blur', { bubbles: true }),
        new FocusEvent('focus', { bubbles: true })
    ];
    eventos.forEach(evt => { try { elemento.dispatchEvent(evt); } catch(e) {} });
    if (elemento._valueTracker) { try { elemento._valueTracker.setValue(valor); } catch(e) {} }
}

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
        eventos.forEach(evt => { try { elemento.dispatchEvent(evt); } catch(e) {} });
        elemento.focus();
        setTimeout(() => { elemento.blur(); elemento.focus(); }, 50);
        return;
    }
    if (elemento.tagName === 'INPUT' || elemento.tagName === 'TEXTAREA') dispararEventosNativos(elemento);
}
