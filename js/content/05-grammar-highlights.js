// SyntaxMentor content module: Grammar checks, highlights and request queue
// Loaded in manifest.json order.

function agendarProcessamentoOcioso(callback, options = { timeout: 100 }) {
    if (typeof window.requestIdleCallback === 'function') {
        return window.requestIdleCallback(callback, options);
    }
    return setTimeout(callback, Math.min(options.timeout || 100, 16));
}

// =============================================
// VERIFICAÇÃO DE TEXTO
// =============================================

async function verificarTexto(texto, elemento) {
    if (smConfig.disabled) return;
    elemento = registrarElementoEditavelAtivo(elemento) || elemento;
    if (!elemento) return;
    
    estaCarregando = true;
    atualizarEstadoCarregamento(true);
    
    if (currentFetchController) {
        currentFetchController.abort();
    }
    currentFetchController = new AbortController();
    const signal = currentFetchController.signal;
    const requestId = ++ultimaConsultaGrammarId;
    
    try {
        if (signal.aborted) {
            estaCarregando = false;
            atualizarEstadoCarregamento(false);
            return;
        }
        
        const data = await consultarGramaticaNoBackground(texto, {
            language: smConfig.language,
            pickyMode: smConfig.pickyMode,
            modoVoz: !!elemento._smModoVoz,
            requestId
        });

        if (signal.aborted || requestId !== ultimaConsultaGrammarId) {
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

        const dic = dicCache;

        const matchesProcessados = processarPontuacao(data.matches || []);
        const errosPontuacaoLocal = verificarPontuacaoComum(texto);
        const errosOrtografiaLocal = verificarOrtografiaPtBrLocal(texto, smConfig.language);
        const todosMatches = deduplicarMatchesRevisao([...matchesProcessados, ...errosPontuacaoLocal, ...errosOrtografiaLocal]);

        const REGRAS_IGNORADAS = new Set([
            'UPPERCASE_SENTENCE_START',
            'PUNCTUATION_PARAGRAPH_END',
            'DOUBLE_PUNCTUATION',
            'COMMA_PARENTHESIS_WHITESPACE',
            'EN_QUOTES',
            'DASH_RULE',
        ]);

        errosGlobais = todosMatches.filter(m => {
            if (!m.replacements?.length) return false;

            const ruleId = m.rule?.id || '';
            if (REGRAS_IGNORADAS.has(ruleId)) return false;

            const o = m.context.text.substr(m.context.offset, m.context.length);
            if (!o.trim()) return false;
            const ol = o.toLowerCase();

            if (ol.match(/^[0-9]+$/) || ol.match(/^https?:\/\//)) return false;

            return !dic.includes(ol) && !ignoradosTemporarios.includes(ol);
        });

        registrarElementoEditavelAtivo(elemento);

        if (!isSiteRestrito && elemento.isContentEditable && elemento.tagName !== 'TEXTAREA' && elemento.tagName !== 'INPUT') {
            aplicarGrifos(errosGlobais, elemento);
        }

        atualizarInterface();
        
        estaCarregando = false;
        atualizarEstadoCarregamento(false);
        
    } catch (err) {
        if (signal.aborted || requestId !== ultimaConsultaGrammarId || err.name === 'AbortError') {
            estaCarregando = false;
            atualizarEstadoCarregamento(false);
            return;
        }
        
        smWarn('SyntaxMentor:', err.message);
        
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
        
        estaCarregando = false;
        atualizarEstadoCarregamento(false);
    } finally {
        if (currentFetchController && currentFetchController.signal === signal && requestId === ultimaConsultaGrammarId) {
            currentFetchController = null;
            if (estaCarregando) {
                estaCarregando = false;
                atualizarEstadoCarregamento(false);
            }
        }
    }
}

function consultarGramaticaNoBackground(texto, opcoes) {
    return new Promise((resolve, reject) => {
        enviarMensagemSegura({
            action: 'checkGrammar',
            text: texto,
            language: opcoes.language,
            pickyMode: opcoes.pickyMode,
            modoVoz: opcoes.modoVoz,
            requestId: opcoes.requestId
        }, (response) => {
            if (!response || !response.success) {
                reject(new Error(response?.error || 'Erro de conexao com o servidor'));
                return;
            }

            resolve(response.data || { matches: [] });
        });
    });
}

function atualizarEstadoCarregamento(on) {
    const b = document.getElementById('syntax-mentor-bubble');
    if (!b) return;
    
    if (on) {
        b.classList.add('sm-loading');
        b.style.cursor = 'wait';
        
        const icon = b.querySelector('.sm-bubble-icon');
        if (icon) {
            icon.textContent = '⏳';
        }
    } else {
        b.classList.remove('sm-loading');
        b.style.cursor = 'grab';
        
        const total = errosGlobais.filter(e => e.context.text.substr(e.context.offset, e.context.length).trim()).length;
        const icon = b.querySelector('.sm-bubble-icon');
        if (icon) {
            if (total === 0) {
                icon.textContent = '✓';
                b.classList.add('sm-bubble-success');
                b.classList.remove('sm-bubble-error');
            } else {
                icon.textContent = isModoLeitura() ? '👁️' : '✏️';
                b.classList.add('sm-bubble-error');
                b.classList.remove('sm-bubble-success');
            }
        }
        
        const badge = b.querySelector('.sm-bubble-badge');
        if (badge) {
            badge.textContent = total > 0 ? total : '';
        }
    }
}

// =============================================
// APLICAR GRIFOS - VERSÃO OTIMIZADA COM CHUNKS
// =============================================

function aplicarGrifos(erros, el) {
    if (!el?.isContentEditable || isSiteRestrito) return;

    const textoReferencia = el.textContent || '';
    const aplicacaoId = ++smAplicacaoGrifosId;

    if (elementoPossuiSelecaoAtiva(el)) {
        smDebug('Grifos adiados: usuario esta com texto selecionado.');
        return;
    }
    
    if (!erros || erros.length === 0) {
        limparGrifosElemento(el);
        return;
    }
    
    const selecaoOriginal = salvarSelecaoContentEditable(el);
    isExtensaoMutando = true;
    
    try {
        limparGrifosElemento(el, false);
        
        const palavrasMap = new Map();
        erros.forEach(e => {
            const palavra = e.context.text.substr(e.context.offset, e.context.length);
            if (palavra && palavra.trim()) {
                palavrasMap.set(palavra, true);
            }
        });
        
        const palavras = Array.from(palavrasMap.keys());
        if (palavras.length === 0) {
            isExtensaoMutando = false;
            restaurarSelecaoContentEditable(el, selecaoOriginal);
            return;
        }
        
        const regexPalavras = new RegExp(
            `\\b(${palavras.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
            'gi'
        );
        
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
        
        const nodesToProcess = [];
        while (walker.nextNode()) {
            nodesToProcess.push(walker.currentNode);
        }
        
        if (nodesToProcess.length === 0) {
            isExtensaoMutando = false;
            restaurarSelecaoContentEditable(el, selecaoOriginal);
            return;
        }
        
        const CHUNK_SIZE = 50;
        let currentIndex = 0;
        let isProcessing = false;

        function cancelarSeObsoleto() {
            return aplicacaoId !== smAplicacaoGrifosId ||
                !document.contains(el) ||
                (el.textContent || '') !== textoReferencia ||
                elementoPossuiSelecaoAtiva(el);
        }
        
        function processarChunk() {
            if (isProcessing) return;
            if (cancelarSeObsoleto()) {
                isExtensaoMutando = false;
                return;
            }

            isProcessing = true;
            
            const chunk = nodesToProcess.slice(currentIndex, currentIndex + CHUNK_SIZE);
            
            chunk.forEach(node => {
                if (!node.parentNode) return;
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
            
            currentIndex += CHUNK_SIZE;
            isProcessing = false;
            
            if (currentIndex < nodesToProcess.length) {
                agendarProcessamentoOcioso(processarChunk, { timeout: 100 });
            } else {
                isExtensaoMutando = false;
                restaurarSelecaoContentEditable(el, selecaoOriginal);
                smLog('Grifos aplicados com sucesso em', nodesToProcess.length, 'nós');
            }
        }
        
        agendarProcessamentoOcioso(processarChunk, { timeout: 100 });
        
    } catch (err) {
        smError('Erro ao aplicar grifos:', err);
        isExtensaoMutando = false;
        restaurarSelecaoContentEditable(el, selecaoOriginal);
    }
}

// =============================================
// FILA DE REQUISIÇÕES
// =============================================

async function processarFilaRequisicoes() {
    if (processandoFila || filaRequisicoes.length === 0) return;
    processandoFila = true;
    const ultima = filaRequisicoes[filaRequisicoes.length - 1];
    filaRequisicoes = [];
    try {
        await verificarTexto(ultima.texto, ultima.el);
    } catch (e) { smWarn('SyntaxMentor:', e.message); }
    processandoFila = false;
    if (filaRequisicoes.length > 0) processarFilaRequisicoes();
}
