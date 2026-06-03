// SyntaxMentor content module: Focus mode, Shadow DOM, iframes, language and site toggle
// Loaded in manifest.json order.

// =============================================
// MODO FOCO
// =============================================

function ativarModoFoco() {
    const bubble = document.getElementById('syntax-mentor-bubble');
    if (bubble) { bubble.style.opacity = '0.2'; bubble.style.transition = 'opacity 0.5s ease'; bubble.style.pointerEvents = 'none'; }
}
function desativarModoFoco() {
    const bubble = document.getElementById('syntax-mentor-bubble');
    if (bubble) { bubble.style.opacity = '1'; bubble.style.pointerEvents = 'auto'; }
}
function iniciarTimeoutFoco() {
    if (!modoFocoAtivo) return;
    clearTimeout(timeoutFoco);
    desativarModoFoco();
    timeoutFoco = setTimeout(ativarModoFoco, 3000);
}
document.addEventListener('mousemove', (e) => {
    if (!modoFocoAtivo) return;
    const bubble = document.getElementById('syntax-mentor-bubble');
    if (!bubble) return;
    const bubbleRect = bubble.getBoundingClientRect();
    const distancia = Math.sqrt(Math.pow(e.clientX - (bubbleRect.left + bubbleRect.width / 2), 2) + Math.pow(e.clientY - (bubbleRect.top + bubbleRect.height / 2), 2));
    if (distancia < 200) {
        desativarModoFoco();
        clearTimeout(timeoutFoco);
        timeoutFoco = setTimeout(ativarModoFoco, 3000);
    }
});

// =============================================
// SHADOW DOM E IFRAMES (BUG 6 CORRIGIDO)
// =============================================

function observarElemento(elemento) {
    if (!elemento || elemento.nodeType !== 1) return;
    if (elemento.shadowRoot) adicionarListenersNoShadowRoot(elemento.shadowRoot);
    elemento.querySelectorAll('*').forEach(el => { if (el.shadowRoot) adicionarListenersNoShadowRoot(el.shadowRoot); });
}

function adicionarListenersNoShadowRoot(shadowRoot) {
    if (!shadowRoot) return;
    
    // Verificar se já existe observer para este shadowRoot
    const campos = shadowRoot.querySelectorAll('textarea, input[type="text"], input[type="search"], [contenteditable="true"], [role="textbox"]');
    campos.forEach(campo => {
        campo.removeEventListener('input', shadowInputHandler);
        campo.addEventListener('input', shadowInputHandler);
    });

    if (shadowObservers.has(shadowRoot)) return;
    
    const shadowObserver = new MutationObserver(() => adicionarListenersNoShadowRoot(shadowRoot));
    shadowObserver.observe(shadowRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['contenteditable'] });
    
    // Registrar observer para limpeza posterior
    shadowObservers.set(shadowRoot, shadowObserver);
    registrarObserver(shadowObserver, 'shadowRoot');
}

function shadowInputHandler(e) {
    if (smConfig.disabled) return;
    let el = e.target;
    if (el.closest?.('[contenteditable="true"]')) el = el.closest('[contenteditable="true"]');
    const valido = el.tagName === 'TEXTAREA' || el.isContentEditable || el.getAttribute?.('contenteditable') === 'true' || el.getAttribute?.('role') === 'textbox' || (el.tagName === 'INPUT' && ['text', 'search', 'url', 'email'].includes(el.type));
    if (!valido) return;
    if (el.tagName === 'INPUT' && smConfig.strictMode) return;
    usuarioDigitando = true;
    atualizarVisibilidadeBolha();
    if (currentFetchController) { currentFetchController.abort(); currentFetchController = null; }
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

function observarShadowDOM() {
    if (shadowDomObserver) return;
    observarElemento(document.body);
    shadowDomObserver = new MutationObserver((mutations) => {
        if (isExtensaoMutando) return;
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    observarElemento(node);
                    if (node.tagName === 'IFRAME') tentarInjetarEmIframe(node);
                }
            });
        });
    });
    shadowDomObserver.observe(document.body, { childList: true, subtree: true });
    registrarObserver(shadowDomObserver, 'shadowDOM');
}

function tentarInjetarEmIframe(iframe) {
    if (!iframe || processedIframes.has(iframe)) return;
    try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc && iframeDoc.body) {
            processedIframes.add(iframe);
            observarElemento(iframeDoc.body);
            const iframeMutationObserver = new MutationObserver(() => observarElemento(iframeDoc.body));
            iframeMutationObserver.observe(iframeDoc, { childList: true, subtree: true });
            registrarObserver(iframeMutationObserver, 'iframe');
        } else {
            iframe.addEventListener('load', () => {
                try {
                    const loadedDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (loadedDoc && loadedDoc.body) {
                        processedIframes.add(iframe);
                        observarElemento(loadedDoc.body);
                    }
                } catch(e) {}
            }, { once: true });
        }
    } catch(e) {}
}

function observarIframes() {
    if (iframeObserver) return;
    
    iframeObserver = new MutationObserver((mutations) => {
        if (isExtensaoMutando) return;
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.tagName === 'IFRAME') tentarInjetarEmIframe(node);
                    if (node.querySelectorAll) {
                        node.querySelectorAll('iframe').forEach(iframe => { if (!processedIframes.has(iframe)) tentarInjetarEmIframe(iframe); });
                    }
                }
            });
        });
    });
    
    iframeObserver.observe(document.body, { childList: true, subtree: true });
    registrarObserver(iframeObserver, 'iframeObserver');
    
    document.querySelectorAll('iframe').forEach(iframe => { if (!processedIframes.has(iframe)) tentarInjetarEmIframe(iframe); });
}

// =============================================
// DETECÇÃO DE IDIOMA
// =============================================

async function verificarIdioma(texto) {
    if (texto.length < 30) return;
    const host = window.location.hostname;
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
            const nomes = { 'pt-BR': 'Português', 'en-US': 'Inglês', 'es': 'Espanhol', 'fr': 'Francês', 'de': 'Alemão', 'it': 'Italiano' };
            const toast = document.createElement('div');
            toast.style.cssText = `position:fixed;bottom:80px;right:20px;z-index:2147483647;background:#1a1a2e;color:#fff;border-radius:10px;padding:14px 16px;font-size:13px;font-family:'Segoe UI',system-ui,sans-serif;max-width:280px;box-shadow:0 8px 24px rgba(0,0,0,.25);`;
            const textoToast = smCriarElemento('p', {
                style: 'margin:0 0 10px;line-height:1.5'
            });
            textoToast.append(
                document.createTextNode('Texto em '),
                smCriarElemento('strong', { textContent: nomes[idiomaDetectado] || idiomaDetectado }),
                document.createTextNode(' detectado. Mudar o corretor?')
            );
            const botoesToast = smCriarElemento('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, [
                smCriarElemento('button', {
                    id: 'sm-lang-sim',
                    textContent: 'Sim',
                    style: 'padding:5px 10px;border-radius:5px;border:none;background:#6f42c1;color:#fff;cursor:pointer;font-size:12px'
                }),
                smCriarElemento('button', {
                    id: 'sm-lang-sempre',
                    textContent: 'Sempre neste site',
                    style: 'padding:5px 10px;border-radius:5px;border:none;background:#28a745;color:#fff;cursor:pointer;font-size:12px'
                }),
                smCriarElemento('button', {
                    id: 'sm-lang-nao',
                    textContent: 'Nao',
                    style: 'padding:5px 10px;border-radius:5px;border:none;background:rgba(255,255,255,.15);color:#fff;cursor:pointer;font-size:12px'
                })
            ]);
            toast.append(textoToast, botoesToast);
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

function mostrarSugestaoIdioma(titulo, mensagem, novoIdioma) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2147483646;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif;`;
    const dialog = document.createElement('div');
    dialog.style.cssText = `background:white;border-radius:12px;padding:24px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);`;
    if (smConfig.darkMode) { dialog.style.background = '#1a1a1a'; dialog.style.color = '#e0e0e0'; }
    const btnCancel = smCriarElemento('button', {
        className: 'sm-dlg-cancel',
        textContent: 'Manter'
    });
    const btnConfirm = smCriarElemento('button', {
        className: 'sm-dlg-confirm',
        textContent: 'Mudar Idioma'
    });
    dialog.append(
        smCriarElemento('h3', {
            textContent: `Idioma: ${titulo}`,
            style: 'margin:0 0 8px;font-size:16px;'
        }),
        smCriarElemento('p', {
            textContent: mensagem,
            style: 'margin:0 0 16px;font-size:14px;'
        }),
        smCriarElemento('div', {
            style: 'display:flex;gap:8px;justify-content:flex-end;'
        }, [btnCancel, btnConfirm])
    );
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    btnCancel.style.cssText = 'background:#f3f4f6;border:1px solid #d1d5db;color:#374151;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';
    btnConfirm.style.cssText = 'background:linear-gradient(135deg,#6f42c1,#8b5cf6);border:none;color:white;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';
    btnConfirm.onclick = () => { overlay.remove(); smConfig.language = novoIdioma; if (isExtensaoAtiva()) storageSetSeguro({ language: novoIdioma }); if (elementoGlobal && textoUltimaVerificacao) verificarTexto(textoUltimaVerificacao, elementoGlobal); mostrarFeedback('✓ Idioma alterado para ' + novoIdioma, 'success'); };
    btnCancel.onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 15000);
}

// =============================================
// ATUALIZAÇÃO DE ESTADO (TOGGLE SITE)
// =============================================

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
