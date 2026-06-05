// SyntaxMentor content module: Keyboard shortcuts and input listeners
// Loaded in manifest.json order.

// =============================================
// ATALHOS DE TECLADO
// =============================================

document.addEventListener('keydown', (e) => {
    if (window !== window.top) return;
    if (e.ctrlKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'z') { if (historicoDesfazer.length > 0) { e.preventDefault(); e.stopPropagation(); desfazerUltimaCorrecao(); if (elementoGlobal && textoUltimaVerificacao) verificarTexto(textoUltimaVerificacao, elementoGlobal); } return; }
    if (e.key === 'Escape' && painelAberto) { e.preventDefault(); fecharPainel(); return; }
    if (painelAberto && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); const botoes = [...document.querySelectorAll('#syntax-mentor-painel .btn-fix-mini')]; if (botoes.length === 0) return; if (e.key === 'ArrowDown') indexSugestao = (indexSugestao + 1) % botoes.length; else indexSugestao = (indexSugestao - 1 + botoes.length) % botoes.length; botoes[indexSugestao].focus(); return; }
    if (painelAberto && e.key === 'Enter') { const botoes = [...document.querySelectorAll('#syntax-mentor-painel .btn-fix-mini')]; if (botoes.length > 0 && botoes[indexSugestao]) { e.preventDefault(); botoes[indexSugestao].click(); } return; }
    const alvoTecla = normalizarElementoEditavel(e.target || document.activeElement);
    if (alvoTecla && e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        agendarLimpezaAposPossivelEnvio(alvoTecla);
    }
    const toggleShortcut = smConfig.toggleShortcut || { altKey: true, ctrlKey: false, shiftKey: false, key: 's' };
    const ignoreShortcut = smConfig.ignoreShortcut || { altKey: true, ctrlKey: false, shiftKey: false, key: 'i' };
    const corrigirTudoShortcut = smConfig.corrigirTudoShortcut || { altKey: true, ctrlKey: false, shiftKey: true, key: 's' };
    const ativarShortcut = smConfig.ativarShortcut || { altKey: true, ctrlKey: false, shiftKey: true, key: 'a' };
    const desativarShortcut = smConfig.desativarShortcut || { altKey: true, ctrlKey: false, shiftKey: true, key: 'd' };
    if (e.altKey === toggleShortcut.altKey && e.ctrlKey === toggleShortcut.ctrlKey && e.shiftKey === toggleShortcut.shiftKey && e.key.toLowerCase() === toggleShortcut.key) { e.preventDefault(); e.stopPropagation(); if (errosGlobais.length > 0) painelAberto ? fecharPainel() : exibirPainel(); return; }
    if (e.altKey === ignoreShortcut.altKey && e.ctrlKey === ignoreShortcut.ctrlKey && e.shiftKey === ignoreShortcut.shiftKey && e.key.toLowerCase() === ignoreShortcut.key) { e.preventDefault(); e.stopPropagation(); limparTudo(); return; }
    if (e.altKey === corrigirTudoShortcut.altKey && e.ctrlKey === corrigirTudoShortcut.ctrlKey && e.shiftKey === corrigirTudoShortcut.shiftKey && e.key.toLowerCase() === corrigirTudoShortcut.key) { e.preventDefault(); e.stopPropagation(); if (errosGlobais.length > 0) corrigirTudo(); return; }
    if (e.altKey === ativarShortcut.altKey && e.ctrlKey === ativarShortcut.ctrlKey && e.shiftKey === ativarShortcut.shiftKey && e.key.toLowerCase() === ativarShortcut.key) { e.preventDefault(); e.stopPropagation(); if (!smConfig.disabled) { mostrarFeedback('✅ SyntaxMentor já está ATIVADO neste site', 'info'); return; } smConfig.disabled = false; enviarMensagemSegura({ action: 'toggleSiteGlobal', enabled: true, host: window.location.hostname }); const campoAtivo = registrarElementoEditavelAtivo(document.activeElement); if (campoAtivo) { const texto = campoAtivo.value || campoAtivo.textContent || campoAtivo.innerText || ''; if (texto.trim().length > 1) { textoUltimaVerificacao = texto; verificarTexto(texto, campoAtivo); } } const bubble = document.getElementById('syntax-mentor-bubble'); if (bubble) bubble.style.display = 'flex'; mostrarFeedback('✅ SyntaxMentor ATIVADO neste site', 'success'); atualizarBadgeBackground(errosGlobais.length); return; }
    if (e.altKey === desativarShortcut.altKey && e.ctrlKey === desativarShortcut.ctrlKey && e.shiftKey === desativarShortcut.shiftKey && e.key.toLowerCase() === desativarShortcut.key) { e.preventDefault(); e.stopPropagation(); if (smConfig.disabled) { mostrarFeedback('⛔ SyntaxMentor já está DESATIVADO neste site', 'info'); return; } smConfig.disabled = true; enviarMensagemSegura({ action: 'toggleSiteGlobal', enabled: false, host: window.location.hostname }); if (elementoGlobal && elementoGlobal.isContentEditable && !isSiteRestrito) { limparGrifosElemento(elementoGlobal); } errosGlobais = []; fecharPainel(); const bubble = document.getElementById('syntax-mentor-bubble'); if (bubble) bubble.style.display = 'none'; mostrarFeedback('⛔ SyntaxMentor DESATIVADO neste site', 'info'); resetarBadgeBackground(); return; }
}, true);

function elementoPareceAcaoDeEnvio(el) {
    const acao = el?.closest?.('button, [role="button"], input[type="submit"], input[type="button"], [aria-label], [title]');
    if (!acao || acao.closest?.('#syntax-mentor-painel, #syntax-mentor-bubble')) return false;

    const rotulo = [
        acao.getAttribute?.('aria-label'),
        acao.getAttribute?.('title'),
        acao.getAttribute?.('data-control-name'),
        acao.value,
        acao.textContent
    ].filter(Boolean).join(' ').toLowerCase();

    return /\b(enviar|send|publicar|publish|postar|post|comentar|comment|responder|reply)\b/i.test(rotulo);
}

document.addEventListener('click', (e) => {
    if (window !== window.top) return;
    if (!elementoPareceAcaoDeEnvio(e.target)) return;
    agendarLimpezaAposPossivelEnvio(elementoGlobal || ultimoElementoEditavel, 220);
}, true);

document.addEventListener('submit', () => {
    if (window !== window.top) return;
    agendarLimpezaAposPossivelEnvio(elementoGlobal || ultimoElementoEditavel, 220);
}, true);

function mostrarNotificacaoTemp(texto, cor) { 
    const notifAnterior = document.querySelector('.sm-notification-temp'); 
    if (notifAnterior) notifAnterior.remove(); 
    const notif = document.createElement('div'); 
    notif.className = 'sm-notification-temp'; 
    notif.textContent = texto; 
    notif.style.cssText = `position:fixed;top:50%;left:50%;transform:translate(-50%, -50%);background:${cor};color:white;font-size:48px;font-weight:bold;padding:24px 48px;border-radius:16px;z-index:2147483647;font-family:'Segoe UI', sans-serif;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.3);animation:sm-notif-fade 1.5s ease-out forwards;pointer-events:none;`; 
    document.body.appendChild(notif); 
    setTimeout(() => { if (notif.parentNode) notif.remove(); }, 1500); 
}

if (!document.querySelector('#sm-notif-style')) { 
    const style = document.createElement('style'); 
    style.id = 'sm-notif-style'; 
    style.textContent = `@keyframes sm-notif-fade { 0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); } 20% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 80% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.2); } }`; 
    document.head.appendChild(style); 
}

// =============================================
// LISTENERS DE INPUT
// =============================================

document.addEventListener('input', (e) => {
    if (smConfig.disabled) return;
    if (smIgnorandoInputInterno) return;
    agendarRevisaoEntradaEditavel(e.target, e.inputType || '');
}, true);

document.addEventListener('paste', (e) => {
    if (smConfig.disabled) return;
    if (smIgnorandoInputInterno) return;
    agendarRevisaoAposColagem(e.target);
}, true);

document.addEventListener('beforeinput', (e) => {
    if (smConfig.disabled) return;
    if (smIgnorandoInputInterno) return;
    if (!String(e.inputType || '').startsWith('insertFromPaste')) return;
    agendarRevisaoAposColagem(e.target);
}, true);
