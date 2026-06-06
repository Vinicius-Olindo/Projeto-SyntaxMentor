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
    const contentEditable = el.getAttribute?.('contenteditable');
    return tag === 'TEXTAREA' ||
        (tag === 'INPUT' && ['text', 'search', 'url', 'email'].includes(el.type)) ||
        el.isContentEditable ||
        (contentEditable != null && contentEditable.toLowerCase() !== 'false') ||
        el.getAttribute?.('role') === 'textbox';
}

function elementoEstaNoDocumento(el) {
    if (!el) return false;
    if (document.contains(el)) return true;

    const root = el.getRootNode?.();
    if (root?.host && document.contains(root.host)) return true;

    const doc = el.ownerDocument;
    return !!doc?.documentElement?.contains(el);
}

function normalizarElementoEditavel(el) {
    if (!el) return null;
    let candidato = el.nodeType === Node.TEXT_NODE ? el.parentElement : el;
    if (!candidato || candidato.nodeType !== Node.ELEMENT_NODE) return null;
    if (isElementoEditavel(candidato)) return candidato;

    candidato = candidato.closest?.('textarea, input[type="text"], input[type="search"], input[type="url"], input[type="email"], input:not([type]), [contenteditable]:not([contenteditable="false"]), [role="textbox"]');
    return isElementoEditavel(candidato) ? candidato : null;
}

function registrarElementoEditavelAtivo(el) {
    const alvo = normalizarElementoEditavel(el);
    if (!alvo || !elementoEstaNoDocumento(alvo)) return null;
    elementoGlobal = alvo;
    ultimoElementoEditavel = alvo;
    return alvo;
}

function obterTextoEditavelAtual(el) {
    if (!el) return '';
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value || '';
    return el.textContent || el.innerText || '';
}

function cancelarConsultaAtual() {
    if (currentFetchController) {
        currentFetchController.abort();
        currentFetchController = null;
    }
}

function cancelarFilaRevisao() {
    filaRequisicoes = [];
    processandoFila = false;
}

function iniciarCicloRevisao(alvo, texto = '', origem = 'input', opcoes = {}) {
    const cicloId = ++smRevisaoCicloId;
    smCicloRevisaoAtual = {
        id: cicloId,
        origem,
        alvo,
        texto,
        criadoEm: Date.now()
    };

    if (opcoes.limparTimer !== false) clearTimeout(timeoutDigitacao);
    if (opcoes.limparFila !== false) cancelarFilaRevisao();
    if (opcoes.abortarConsulta !== false) cancelarConsultaAtual();

    return smCicloRevisaoAtual;
}

function cicloRevisaoAindaAtual(cicloId, alvo = null, texto = null) {
    if (!smCicloRevisaoAtual || smCicloRevisaoAtual.id !== cicloId || smRevisaoCicloId !== cicloId) return false;
    if (alvo && (!elementoEstaNoDocumento(alvo) || smCicloRevisaoAtual.alvo !== alvo)) return false;
    if (texto != null && alvo && obterTextoEditavelAtual(alvo).trim() !== texto) return false;
    return true;
}

function enfileirarRevisaoTexto(alvo, texto, origem = 'input', cicloId = null) {
    if (!alvo || !texto || texto.trim().length <= 1) return false;
    const ciclo = cicloId && cicloRevisaoAindaAtual(cicloId, alvo)
        ? smCicloRevisaoAtual
        : iniciarCicloRevisao(alvo, texto, origem);

    ciclo.texto = texto;
    ciclo.origem = origem;
    ultimoTextoValido = texto;
    textoUltimaVerificacao = texto;
    filaRequisicoes = [{ texto, el: alvo, cicloId: ciclo.id, origem }];
    processarFilaRequisicoes();
    return true;
}

function limparEstadoRevisaoObsoleta(alvo = elementoGlobal) {
    if (smLimpandoRevisaoObsoleta) return;
    smLimpandoRevisaoObsoleta = true;

    try {
        iniciarCicloRevisao(null, '', 'limpeza', { limparTimer: true, limparFila: true, abortarConsulta: true });
        clearTimeout(timeoutDigitacao);
        clearTimeout(timeoutReverificacaoCorrecao);
        clearTimeout(timeoutLimpezaEnvio);

        if (!isSiteRestrito && alvo?.isContentEditable && elementoEstaNoDocumento(alvo)) {
            limparGrifosElemento(alvo);
        }

        usuarioDigitando = false;
        estaCarregando = false;
        errosGlobais = [];
        ultimoTextoValido = '';
        textoUltimaVerificacao = '';
        elementoGlobal = null;
        ultimoElementoEditavel = null;

        if (typeof fecharPainel === 'function') fecharPainel();
        if (typeof atualizarInterface === 'function') atualizarInterface();
        if (typeof atualizarEstadoCarregamento === 'function') atualizarEstadoCarregamento(false);
        if (typeof resetarBadgeBackground === 'function') resetarBadgeBackground();
        if (typeof atualizarVisibilidadeBolha === 'function') atualizarVisibilidadeBolha();
    } finally {
        smLimpandoRevisaoObsoleta = false;
    }
}

function limparRevisaoSeEditorVazioOuRemovido(el = elementoGlobal || ultimoElementoEditavel) {
    const alvo = normalizarElementoEditavel(el) || normalizarElementoEditavel(elementoGlobal) || normalizarElementoEditavel(ultimoElementoEditavel);
    if (!alvo || !elementoEstaNoDocumento(alvo)) {
        if (errosGlobais.length > 0 || textoUltimaVerificacao) {
            limparEstadoRevisaoObsoleta(alvo);
            return true;
        }
        return false;
    }

    if (obterTextoEditavelAtual(alvo).trim().length <= 1) {
        limparEstadoRevisaoObsoleta(alvo);
        return true;
    }

    return false;
}

function capturarEstadoEnvio(alvo) {
    const elemento = normalizarElementoEditavel(alvo) || normalizarElementoEditavel(elementoGlobal) || normalizarElementoEditavel(ultimoElementoEditavel);
    return {
        elemento,
        textoAntes: obterTextoEditavelAtual(elemento).trim(),
        cicloId: smRevisaoCicloId,
        criadoEm: Date.now()
    };
}

function textoDoEditorMudouAposEnvio(snapshot) {
    const alvo = normalizarElementoEditavel(snapshot?.elemento);
    if (!alvo || !elementoEstaNoDocumento(alvo)) return true;

    const textoAtual = obterTextoEditavelAtual(alvo).trim();
    const textoAntes = String(snapshot?.textoAntes || '').trim();
    if (textoAtual.length <= 1) return true;
    if (!textoAntes) return false;
    if (textoAtual === textoAntes) return false;
    return !textoAtual.includes(textoAntes) && !textoAntes.includes(textoAtual);
}

function limpezaAposEnvioConfirmado(snapshot, opcoes = {}) {
    const alvo = normalizarElementoEditavel(snapshot?.elemento);
    const deveForcar = !!opcoes.forcar;
    if (deveForcar || textoDoEditorMudouAposEnvio(snapshot)) {
        limparEstadoRevisaoObsoleta(alvo);
        return true;
    }

    return limparRevisaoSeEditorVazioOuRemovido(alvo);
}

function agendarLimpezaAposPossivelEnvio(el = elementoGlobal || ultimoElementoEditavel, atraso = 180, opcoes = {}) {
    const alvo = normalizarElementoEditavel(el) || normalizarElementoEditavel(elementoGlobal) || normalizarElementoEditavel(ultimoElementoEditavel);
    const snapshot = capturarEstadoEnvio(alvo);
    clearTimeout(timeoutLimpezaEnvio);

    const tentativas = opcoes.forcar
        ? [Math.max(80, atraso), 320, 900, 1600]
        : [atraso, 700, 1500];

    timeoutLimpezaEnvio = setTimeout(() => {
        tentativas.forEach((tempo, index) => {
            setTimeout(() => {
                limpezaAposEnvioConfirmado(snapshot, { forcar: opcoes.forcar && index === 0 });
            }, index === 0 ? 0 : tempo);
        });
    }, Math.max(0, atraso));
}

function agendarRevisaoEntradaEditavel(el, inputType = '', opcoes = {}) {
    const alvo = registrarElementoEditavelAtivo(el);
    if (!alvo) return false;
    if (alvo.tagName === 'INPUT' && smConfig.strictMode) return false;
    const forcarRevisao = !!opcoes.forcar;
    const atraso = Number.isFinite(opcoes.atraso) ? opcoes.atraso : (parseInt(smConfig.speed) || 500);
    const ciclo = iniciarCicloRevisao(alvo, '', inputType || 'input', { limparTimer: true, limparFila: true, abortarConsulta: true });

    smAplicacaoGrifosId++;
    if (!isSiteRestrito && alvo.isContentEditable) limparGrifosElemento(alvo);

    alvo._smModoVoz = inputType === 'insertFromSpeech' || inputType === 'insertFromVoice';
    usuarioDigitando = true;
    atualizarVisibilidadeBolha();

    timeoutDigitacao = setTimeout(() => {
        if (!cicloRevisaoAindaAtual(ciclo.id, alvo)) return;
        usuarioDigitando = false;
        const texto = obterTextoEditavelAtual(alvo).trim();
        if (texto.length <= 1) {
            limparEstadoRevisaoObsoleta(alvo);
            return;
        }

        if (!forcarRevisao && texto === ultimoTextoValido && errosGlobais.length > 0) {
            atualizarVisibilidadeBolha();
            return;
        }

        if (!idiomaSugerido) verificarIdioma(texto);
        enfileirarRevisaoTexto(alvo, texto, inputType || 'input', ciclo.id);
        atualizarVisibilidadeBolha();
    }, atraso);

    return true;
}

function inputPareceColagem(e, el) {
    const inputType = String(e?.inputType || '');
    if (inputType.startsWith('insertFromPaste')) return true;

    const alvo = normalizarElementoEditavel(el);
    if (!alvo) return false;

    const tamanhoAtual = obterTextoEditavelAtual(alvo).trim().length;
    const tamanhoReferencia = Math.max(
        String(textoUltimaVerificacao || '').trim().length,
        String(ultimoTextoValido || '').trim().length
    );

    return tamanhoAtual >= 250 && tamanhoAtual - tamanhoReferencia >= 80;
}

function forcarRevisaoTextoAtual(el, inputType = '') {
    const alvo = registrarElementoEditavelAtivo(el);
    if (!alvo) return false;
    if (alvo.tagName === 'INPUT' && smConfig.strictMode) return false;

    const ciclo = iniciarCicloRevisao(alvo, '', inputType || 'forcado', { limparTimer: true, limparFila: true, abortarConsulta: true });

    const texto = obterTextoEditavelAtual(alvo).trim();
    if (texto.length <= 1) {
        limparEstadoRevisaoObsoleta(alvo);
        return false;
    }

    alvo._smModoVoz = inputType === 'insertFromSpeech' || inputType === 'insertFromVoice';
    usuarioDigitando = false;
    ciclo.texto = texto;

    if (!idiomaSugerido) verificarIdioma(texto);
    if (typeof aplicarRevisaoLocalImediata === 'function') aplicarRevisaoLocalImediata(texto, alvo);
    enfileirarRevisaoTexto(alvo, texto, inputType || 'forcado', ciclo.id);
    atualizarVisibilidadeBolha();
    return true;
}

function normalizarTextoColagem(texto) {
    return String(texto || '').replace(/\s+/g, ' ').trim();
}

function textoColadoPareceInserido(textoAtual, textoColado) {
    const atual = normalizarTextoColagem(textoAtual);
    const colado = normalizarTextoColagem(textoColado);
    if (!colado) return atual.length > 1;
    if (!atual) return false;
    if (atual.includes(colado)) return true;
    return atual.length >= Math.floor(colado.length * 0.85);
}

function agendarRevisaoAposColagem(el, textoColado = '') {
    const alvo = normalizarElementoEditavel(el) || normalizarElementoEditavel(document.activeElement);
    if (!alvo) return false;

    const revisaoId = ++smRevisaoColagemId;
    const maxTentativas = 16;
    const inicio = Date.now();
    const tamanhoEsperado = normalizarTextoColagem(textoColado).length;
    let tentativas = 0;
    let textoAnterior = '';
    let leiturasEstaveis = 0;

    const tentarRevisarTextoEstavel = () => {
        if (revisaoId !== smRevisaoColagemId) return;
        if (!elementoEstaNoDocumento(alvo)) return;

        const textoAtual = obterTextoEditavelAtual(alvo).trim();
        const textoGrande = tamanhoEsperado >= 500 || textoAtual.length >= 500;
        const tempoMinimo = textoGrande ? 1400 : 360;
        const leiturasNecessarias = textoGrande ? 3 : 2;
        const textoEstavel = textoAtual.length > 1 && textoAtual === textoAnterior;
        const colagemInserida = textoColadoPareceInserido(textoAtual, textoColado);
        const tempoSuficiente = Date.now() - inicio >= tempoMinimo;
        const chegouNoLimite = tentativas >= maxTentativas;

        leiturasEstaveis = textoEstavel ? leiturasEstaveis + 1 : 0;

        if ((leiturasEstaveis >= leiturasNecessarias && colagemInserida && tempoSuficiente) || chegouNoLimite) {
            forcarRevisaoTextoAtual(alvo, 'insertFromPaste');
            setTimeout(() => {
                if (revisaoId !== smRevisaoColagemId) return;
                const textoFinal = obterTextoEditavelAtual(alvo).trim();
                if (textoFinal.length > 1 && textoFinal !== textoUltimaVerificacao) {
                    forcarRevisaoTextoAtual(alvo, 'insertFromPaste');
                }
            }, 1200);
            return;
        }

        textoAnterior = textoAtual;
        tentativas++;
        setTimeout(tentarRevisarTextoEstavel, textoGrande ? 320 : (tentativas <= 2 ? 140 : 260));
    };

    setTimeout(tentarRevisarTextoEstavel, 60);

    return true;
}

function obterElementoEditavelDaSelecao() {
    const ativo = document.activeElement;
    const alvoAtivo = normalizarElementoEditavel(ativo);
    if (alvoAtivo) return alvoAtivo;

    const sel = window.getSelection?.();
    let node = sel?.anchorNode || sel?.focusNode;
    if (!node) return null;

    return normalizarElementoEditavel(node);
}

function obterIndiceTextoContentEditable(root, node, offset) {
    if (!root || !node || !root.contains(node)) return 0;

    let indice = 0;
    let encontrado = false;

    const visitar = (atual) => {
        if (!atual || encontrado) return;

        if (atual === node) {
            if (atual.nodeType === Node.TEXT_NODE) {
                indice += Math.min(offset, atual.textContent.length);
            } else {
                const filhosAntes = Array.from(atual.childNodes).slice(0, offset);
                filhosAntes.forEach(filho => { indice += (filho.textContent || '').length; });
            }
            encontrado = true;
            return;
        }

        if (atual.nodeType === Node.TEXT_NODE) {
            indice += (atual.textContent || '').length;
            return;
        }

        Array.from(atual.childNodes || []).forEach(visitar);
    };

    visitar(root);
    return indice;
}

function obterPontoTextoContentEditable(root, indice) {
    const alvo = Math.max(0, indice || 0);
    let restante = alvo;
    let ultimoTexto = null;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    while (walker.nextNode()) {
        const node = walker.currentNode;
        const tamanho = (node.textContent || '').length;
        ultimoTexto = node;

        if (restante <= tamanho) {
            return { node, offset: restante };
        }

        restante -= tamanho;
    }

    if (ultimoTexto) {
        return { node: ultimoTexto, offset: (ultimoTexto.textContent || '').length };
    }

    return { node: root, offset: root.childNodes.length };
}

function salvarSelecaoContentEditable(elemento) {
    if (!elemento?.isContentEditable) return null;

    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);
    if (!elemento.contains(range.startContainer) || !elemento.contains(range.endContainer)) return null;

    return {
        start: obterIndiceTextoContentEditable(elemento, range.startContainer, range.startOffset),
        end: obterIndiceTextoContentEditable(elemento, range.endContainer, range.endOffset),
        collapsed: range.collapsed,
        estavaAtivo: document.activeElement === elemento || elemento.contains(document.activeElement)
    };
}

function restaurarSelecaoContentEditable(elemento, estado) {
    if (!elemento?.isContentEditable || !estado || !document.contains(elemento)) return;

    try {
        if (estado.estavaAtivo) {
            try { elemento.focus({ preventScroll: true }); } catch(e) { elemento.focus(); }
        }

        const inicio = obterPontoTextoContentEditable(elemento, estado.start);
        const fim = obterPontoTextoContentEditable(elemento, estado.end);
        const range = document.createRange();
        range.setStart(inicio.node, inicio.offset);
        range.setEnd(fim.node, fim.offset);

        const sel = window.getSelection?.();
        if (!sel) return;
        sel.removeAllRanges();
        sel.addRange(range);
    } catch(e) {
        smDebug('Nao foi possivel restaurar a selecao:', e.message);
    }
}

function elementoPossuiSelecaoAtiva(elemento) {
    const estado = salvarSelecaoContentEditable(elemento);
    return !!estado && !estado.collapsed;
}

function limparGrifosElemento(elemento, preservarSelecao = true) {
    if (!elemento?.isContentEditable) return false;

    const marks = Array.from(elemento.querySelectorAll('mark.sm-highlight'));
    if (marks.length === 0) return false;

    const selecao = preservarSelecao ? salvarSelecaoContentEditable(elemento) : null;
    const mutacaoAnterior = isExtensaoMutando;
    isExtensaoMutando = true;

    try {
        marks.forEach(mark => {
            const parent = mark.parentNode;
            if (!parent) return;
            const texto = document.createTextNode(mark.textContent || '');
            parent.replaceChild(texto, mark);
            parent.normalize();
        });
    } finally {
        isExtensaoMutando = mutacaoAnterior;
        restaurarSelecaoContentEditable(elemento, selecao);
    }

    return true;
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
    return (smConfig.modoLeituraSites || []).some(d => hostCorrespondeDominio(window.location.hostname, d));
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
    bubble.style.display = 'flex';
    if (smConfig.autoHideBubble && usuarioDigitando && !painelAberto) {
        bubble.style.opacity = '0';
        bubble.style.pointerEvents = 'none';
    } else {
        bubble.style.opacity = estaCarregando ? '0.6' : '1';
        bubble.style.pointerEvents = 'auto';
    }
    bubble.style.transition = 'opacity 0.3s ease';
    if (typeof garantirBolhaNaTela === 'function') garantirBolhaNaTela(bubble);
}
