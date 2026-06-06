// SyntaxMentor content module: Corrections and confirmations
// Loaded in manifest.json order.

// =============================================
// APLICAÇÃO DE CORREÇÕES
// =============================================

function escaparRegexCorrecao(valor) {
    return String(valor).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function usarLimiteDePalavra(original) {
    return /^[\p{L}\p{N}]/u.test(original) && /[\p{L}\p{N}]$/u.test(original);
}

function criarRegexCorrecaoTexto(original, flags = 'gu') {
    const esc = escaparRegexCorrecao(original);
    if (usarLimiteDePalavra(original)) {
        return new RegExp(`(?<![\\p{L}])${esc}(?![\\p{L}])`, flags);
    }
    return new RegExp(esc, flags);
}

function criarRegexCorrecaoHtml(original) {
    const esc = escaparRegexCorrecao(original);
    if (usarLimiteDePalavra(original)) {
        return new RegExp(`(?<!<[^>]*)(?<![\\p{L}])${esc}(?![\\p{L}])(?![^<]*>)`, 'gu');
    }
    return new RegExp(`(?<!<[^>]*)${esc}(?![^<]*>)`, 'gu');
}

function encontrarPosicaoPalavra(texto, palavra) {
    const regex = criarRegexCorrecaoTexto(palavra, 'iu');
    const match = texto.match(regex);
    return match ? match.index : texto.indexOf(palavra);
}

function obterTextoElementoParaRevisao(el) {
    if (!el) return '';
    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value || '';
    return el.textContent || el.innerText || '';
}

function substituirTextoEmContentEditable(el, original, sugestao) {
    if (!el?.isContentEditable) return 0;

    const regex = criarRegexCorrecaoTexto(original);
    const selecao = salvarSelecaoContentEditable(el);
    const nodes = [];
    const walker = document.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                if (node.parentElement?.closest?.('script, style, #syntax-mentor-painel, #syntax-mentor-bubble')) {
                    return NodeFilter.FILTER_REJECT;
                }
                if (!node.textContent || !node.textContent.trim()) return NodeFilter.FILTER_SKIP;
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    while (walker.nextNode()) nodes.push(walker.currentNode);

    let total = 0;
    const mutacaoAnterior = isExtensaoMutando;
    isExtensaoMutando = true;

    try {
        nodes.forEach(node => {
            regex.lastIndex = 0;
            const novoTexto = node.textContent.replace(regex, () => {
                total++;
                return sugestao;
            });
            if (novoTexto !== node.textContent) node.textContent = novoTexto;
        });
    } finally {
        isExtensaoMutando = mutacaoAnterior;
        restaurarSelecaoContentEditable(el, selecao);
    }

    return total;
}

function agendarReverificacaoAposCorrecao(el) {
    if (!el || !document.contains(el)) return;
    clearTimeout(timeoutReverificacaoCorrecao);

    timeoutReverificacaoCorrecao = setTimeout(() => {
        if (!el || !document.contains(el) || smConfig.disabled) return;

        const textoAtual = obterTextoElementoParaRevisao(el).trim();
        if (textoAtual.length <= 1) {
            errosGlobais = [];
            atualizarInterface();
            return;
        }

        registrarElementoEditavelAtivo(el);
        enfileirarRevisaoTexto(el, textoAtual, 'reverificacao-correcao');
    }, 350);
}

function executarSemProcessarInputInterno(callback) {
    smIgnorandoInputInterno = true;
    try {
        return callback();
    } finally {
        smIgnorandoInputInterno = false;
    }
}

function mostrarFeedbackCorrecao(elemento, posicao, original, sugestao) {
    if (!elemento || posicao < 0) return;
    const rect = elemento.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    const feedback = document.createElement('div');
    feedback.className = 'sm-feedback-correcao';
    feedback.append(
        smCriarElemento('span', {
            textContent: original,
            style: 'text-decoration:line-through;color:#e53e3e;'
        }),
        smCriarElemento('span', {
            textContent: '->',
            style: 'margin:0 4px;'
        }),
        smCriarElemento('span', {
            textContent: sugestao,
            style: 'color:#28a745;font-weight:bold;'
        })
    );
    feedback.style.cssText = `position:fixed;left:${rect.left + 10}px;top:${rect.top - 30}px;background:#1a1a1a;color:white;padding:6px 12px;border-radius:20px;font-size:12px;font-family:'Segoe UI', sans-serif;z-index:2147483647;pointer-events:none;white-space:nowrap;box-shadow:0 2px 10px rgba(0,0,0,0.2);animation:sm-feedback-correcao 0.8s ease-out forwards;`;
    document.body.appendChild(feedback);
    setTimeout(() => { if (feedback.parentNode) feedback.remove(); }, 800);
}

function registrarCorrecaoAplicada() {
    if (!isExtensaoAtiva()) return;
    const bubble = document.getElementById('syntax-mentor-bubble');
    if (bubble) { bubble.classList.add('sm-bubble-correction'); setTimeout(() => bubble.classList.remove('sm-bubble-correction'), 300); }
}

function removerErroGlobal(original) {
    errosGlobais = errosGlobais.filter(err => { const o = err.context.text.substr(err.context.offset, err.context.length); return o !== original; });
    atualizarInterface();
}

function ignorarTemporariamente(palavra) {
    const pl = palavra.toLowerCase();
    if (!ignoradosTemporarios.includes(pl)) ignoradosTemporarios.push(pl);
    if (!isSiteRestrito && elementoGlobal?.isContentEditable) {
        limparGrifosElemento(elementoGlobal);
    }
    removerErroGlobal(palavra);
    if (!isSiteRestrito && elementoGlobal?.isContentEditable && errosGlobais.length > 0) aplicarGrifos(errosGlobais, elementoGlobal);
    mostrarFeedback(`"${palavra}" ignorada nesta sessão`, 'info');
}

function aplicarCorrecao(original, sugestao, el, pularConfirmacao = false) {
    if (!el || original == null || original === '' || sugestao == null) return;
    const executarCorrecao = () => {
        let totalAplicado = 0;
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
            const valorAntigo = el.value;
            const posicao = encontrarPosicaoPalavra(el.value, original);
            const regex = criarRegexCorrecaoTexto(original);
            el.value = el.value.replace(regex, () => {
                totalAplicado++;
                return sugestao;
            });
            if (el.value !== valorAntigo) {
                salvarEstadoParaDesfazer(el, original, sugestao, valorAntigo, el.value);
                mostrarFeedbackCorrecao(el, posicao, original, sugestao);
                executarSemProcessarInputInterno(() => dispararEventosNativos(el));
                requestAnimationFrame(() => {
                    if (el.value !== valorAntigo) executarSemProcessarInputInterno(() => dispararEventosNativos(el));
                });
            }
        } else if (el.isContentEditable) {
            if (!isSiteRestrito) limparGrifosElemento(el);
            const htmlAntigo = el.innerHTML;
            totalAplicado = substituirTextoEmContentEditable(el, original, sugestao);
            const htmlDepois = el.innerHTML;
            if (totalAplicado > 0 && htmlDepois !== htmlAntigo) {
                salvarEstadoParaDesfazer(el, original, sugestao, htmlAntigo, htmlDepois);
                executarSemProcessarInputInterno(() => atualizarElementoComEventos(el));
            }
        }
        if (totalAplicado === 0) return;
        historicoCorrecoes.push({ el, original, sugestao, timestamp: Date.now() });
        if (historicoCorrecoes.length > 50) historicoCorrecoes.shift();
        const erroEncontrado = smConfig.modoAprendizado
            ? errosGlobais.find(e => {
                const o = e.context.text.substr(e.context.offset, e.context.length);
                return o === original;
            })
            : null;
        removerErroGlobal(original);
        registrarCorrecaoAplicada();
        if (!smCorrigindoEmLote) agendarReverificacaoAposCorrecao(el);
        if (smConfig.modoAprendizado) {
            if (erroEncontrado && erroEncontrado.message) setTimeout(() => mostrarExplicacaoRegra(original, sugestao, erroEncontrado.message, erroEncontrado), 300);
        }
    };
    if (pularConfirmacao) executarCorrecao();
    else confirmarCorrecao(original, sugestao, (confirmado) => { if (confirmado) executarCorrecao(); });
}

function confirmarCorrecao(original, sugestao, callback) {
    if (!smConfig.modoConfirmacao && !isModoLeitura()) { callback(true); return; }
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2147483646;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif;`;
    const dialog = document.createElement('div');
    dialog.style.cssText = `background:white;border-radius:12px;padding:24px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);`;
    if (smConfig.darkMode) { dialog.style.background = '#1a1a1a'; dialog.style.color = '#e0e0e0'; }
    const titulo = smCriarElemento('h3', {
        textContent: SM_TEXTOS.painel.confirmarCorrecao,
        style: 'margin:0 0 12px;font-size:16px;'
    });
    const descricao = smCriarElemento('p', {
        style: 'margin:0 0 16px;font-size:14px;line-height:1.5;'
    });
    descricao.append(
        document.createTextNode('Corrigir '),
        smCriarElemento('strong', {
            textContent: original,
            style: 'color:#e53e3e;text-decoration:line-through;'
        }),
        document.createTextNode(' para '),
        smCriarElemento('strong', {
            textContent: sugestao,
            style: 'color:#28a745;'
        }),
        document.createTextNode('?')
    );
    const btnCancel = smCriarElemento('button', {
        className: 'sm-dlg-cancel',
        textContent: SM_TEXTOS.painel.nao
    });
    const btnConfirm = smCriarElemento('button', {
        className: 'sm-dlg-confirm',
        textContent: SM_TEXTOS.painel.simCorrigir
    });
    const actions = smCriarElemento('div', {
        style: 'display:flex;gap:8px;justify-content:flex-end;'
    }, [btnCancel, btnConfirm]);
    dialog.append(titulo, descricao, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    btnCancel.style.cssText = 'background:#f3f4f6;border:1px solid #d1d5db;color:#374151;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';
    btnConfirm.style.cssText = 'background:linear-gradient(135deg,#6f42c1,#8b5cf6);border:none;color:white;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';
    btnConfirm.onclick = () => { overlay.remove(); callback(true); };
    btnCancel.onclick = () => { overlay.remove(); callback(false); };
    overlay.onclick = (e) => { if (e.target === overlay) { overlay.remove(); callback(false); } };
}

function confirmarCorrecaoEmLote(correcoes, el = elementoGlobal) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:2147483646;display:flex;align-items:center;justify-content:center;`;
    const lista = smCriarElemento('div', { style: 'margin-bottom:16px;' });
    correcoes.forEach(([o, s]) => {
        lista.appendChild(smCriarElemento('div', {
            style: 'display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #e5e7eb;'
        }, [
            smCriarElemento('span', {
                textContent: o,
                style: 'color:#e53e3e;text-decoration:line-through;flex:1;'
            }),
            smCriarElemento('span', { textContent: '->' }),
            smCriarElemento('span', {
                textContent: s,
                style: 'color:#28a745;flex:1;'
            })
        ]));
    });
    const dialog = document.createElement('div');
    dialog.style.cssText = `background:white;border-radius:12px;padding:24px;max-width:500px;width:90%;max-height:70vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);`;
    if (smConfig.darkMode) { dialog.style.background = '#1a1a1a'; dialog.style.color = '#e0e0e0'; }
    const btnCancel = smCriarElemento('button', {
        className: 'sm-dlg-cancel',
        textContent: SM_TEXTOS.painel.cancelar
    });
    const btnConfirm = smCriarElemento('button', {
        className: 'sm-dlg-confirm',
        textContent: SM_TEXTOS.painel.aplicarTodas
    });
    dialog.append(
        smCriarElemento('h3', { textContent: SM_TEXTOS.painel.confirmarCorrecoes }),
        smCriarElemento('p', {
            textContent: `${correcoes.length} correcao(oes)`,
            style: 'font-size:12px;color:#888;'
        }),
        lista,
        smCriarElemento('div', {
            style: 'display:flex;gap:8px;justify-content:flex-end;'
        }, [btnCancel, btnConfirm])
    );
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    btnCancel.style.cssText = 'background:#f3f4f6;border:1px solid #d1d5db;color:#374151;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';
    btnConfirm.style.cssText = 'background:linear-gradient(135deg,#6f42c1,#8b5cf6);border:none;color:white;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;';
    btnConfirm.onclick = () => { overlay.remove(); executarCorrecoesEmLote(correcoes, el); };
    btnCancel.onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

function obterElementoAlvoCorrecao(el = elementoGlobal) {
    const candidatos = [el, elementoGlobal, ultimoElementoEditavel];

    if (typeof obterElementoEditavelDaSelecao === 'function') {
        candidatos.push(obterElementoEditavelDaSelecao());
    }

    candidatos.push(document.activeElement);

    for (const candidato of candidatos) {
        const alvo = normalizarElementoEditavel(candidato);
        if (alvo && elementoEstaNoDocumento(alvo)) return alvo;
    }

    const alvoPorTexto = encontrarElementoEditavelPorTexto();
    if (alvoPorTexto) return alvoPorTexto;

    return null;
}

function encontrarElementoEditavelPorTexto() {
    const correcoes = extrairCorrecoesDosErros();
    const originais = correcoes.map(([original]) => original).filter(Boolean);
    const textoReferencia = (textoUltimaVerificacao || '').trim();
    if (originais.length === 0 && textoReferencia.length === 0) return null;

    const seletores = 'textarea, input[type="text"], input[type="search"], input[type="url"], input[type="email"], input:not([type]), [contenteditable]:not([contenteditable="false"]), [role="textbox"]';
    const candidatos = Array.from(document.querySelectorAll(seletores));

    for (const candidato of candidatos) {
        const alvo = normalizarElementoEditavel(candidato);
        if (!alvo || !elementoEstaNoDocumento(alvo)) continue;

        const rect = alvo.getBoundingClientRect?.();
        if (rect && rect.width === 0 && rect.height === 0) continue;

        const texto = obterTextoElementoParaRevisao(alvo).trim();
        if (!texto) continue;
        if (textoReferencia && texto === textoReferencia) return alvo;
        if (originais.some(original => texto.includes(original))) return alvo;
    }

    return null;
}

function aplicarCorrecoesEmTexto(texto, correcoes) {
    let novoTexto = texto || '';
    const aplicadas = [];

    correcoes.forEach(([original, sugestao]) => {
        const regex = criarRegexCorrecaoTexto(original);
        let total = 0;
        const atualizado = novoTexto.replace(regex, () => {
            total++;
            return sugestao;
        });

        if (total > 0 && atualizado !== novoTexto) {
            aplicadas.push({ original, sugestao, total });
            novoTexto = atualizado;
        }
    });

    return { novoTexto, aplicadas };
}

function registrarCorrecoesEmLote(aplicadas, el) {
    aplicadas.forEach(({ original, sugestao, total }) => {
        historicoCorrecoes.push({ el, original, sugestao, total, timestamp: Date.now() });
    });
    while (historicoCorrecoes.length > 50) historicoCorrecoes.shift();
}

function executarCorrecoesEmLote(correcoes, el = elementoGlobal) {
    const alvo = obterElementoAlvoCorrecao(el);
    if (!alvo) {
        mostrarFeedback('Nenhum campo editavel encontrado para corrigir.', 'info');
        return;
    }

    const correcoesValidas = (correcoes || []).filter(([original, sugestao]) => original?.trim() && sugestao != null && sugestao !== original);
    if (correcoesValidas.length === 0) {
        mostrarFeedback('Nenhuma sugestao para corrigir.', 'info');
        return;
    }

    let aplicadas = [];
    registrarElementoEditavelAtivo(alvo);
    smCorrigindoEmLote = true;

    try {
        if (alvo.tagName === 'TEXTAREA' || alvo.tagName === 'INPUT') {
            const valorAntigo = alvo.value || '';
            const resultado = aplicarCorrecoesEmTexto(valorAntigo, correcoesValidas);
            aplicadas = resultado.aplicadas;

            if (resultado.novoTexto !== valorAntigo) {
                salvarEstadoParaDesfazer(alvo, 'correcao em lote', 'correcoes aplicadas', valorAntigo, resultado.novoTexto);
                alvo.value = resultado.novoTexto;
                executarSemProcessarInputInterno(() => dispararEventosNativos(alvo));
                requestAnimationFrame(() => executarSemProcessarInputInterno(() => dispararEventosNativos(alvo)));
            }
        } else if (alvo.isContentEditable) {
            if (!isSiteRestrito) limparGrifosElemento(alvo);
            const htmlAntigo = alvo.innerHTML;

            correcoesValidas.forEach(([original, sugestao]) => {
                const total = substituirTextoEmContentEditable(alvo, original, sugestao);
                if (total > 0) aplicadas.push({ original, sugestao, total });
            });

            const htmlDepois = alvo.innerHTML;
            if (htmlDepois !== htmlAntigo) {
                salvarEstadoParaDesfazer(alvo, 'correcao em lote', 'correcoes aplicadas', htmlAntigo, htmlDepois);
                executarSemProcessarInputInterno(() => atualizarElementoComEventos(alvo));
            }
        }
    } finally {
        smCorrigindoEmLote = false;
        clearTimeout(timeoutReverificacaoCorrecao);
    }

    if (aplicadas.length === 0) {
        mostrarFeedback('Nenhuma correcao foi aplicada.', 'info');
        return;
    }

    registrarCorrecoesEmLote(aplicadas, alvo);
    errosGlobais = [];
    ultimoTextoValido = '';
    textoUltimaVerificacao = obterTextoElementoParaRevisao(alvo).trim();
    atualizarInterface();
    atualizarVisibilidadeBolha();
    registrarCorrecaoAplicada();
    mostrarFeedbackInteligente(`${aplicadas.length} correcao${aplicadas.length > 1 ? 'es' : ''} aplicada${aplicadas.length > 1 ? 's' : ''}. Revisando novamente...`, 'success');
    agendarReverificacaoAposCorrecao(alvo);
}

function extrairCorrecoesDosErros(erros = errosGlobais) {
    const unicos = {};
    erros.forEach(err => {
        const o = err.context.text.substr(err.context.offset, err.context.length);
        const s = err.replacements[0]?.value;
        if (o.trim() && s != null && s !== o && !Object.hasOwn(unicos, o)) unicos[o] = s;
    });
    return Object.entries(unicos);
}

function corrigirTudo() {
    const alvo = obterElementoAlvoCorrecao();
    if (!alvo) {
        mostrarFeedback('Clique em um campo de texto antes de corrigir tudo.', 'info');
        return;
    }

    registrarElementoEditavelAtivo(alvo);
    const correcoes = extrairCorrecoesDosErros();
    if (correcoes.length === 0) {
        mostrarFeedback('Nenhuma sugestao para corrigir.', 'info');
        return;
    }

    if (smConfig.modoConfirmacao || isModoLeitura()) confirmarCorrecaoEmLote(correcoes, alvo);
    else executarCorrecoesEmLote(correcoes, alvo);
}

function limparTudo() {
    const alvo = obterElementoAlvoCorrecao(elementoGlobal);
    if (!isSiteRestrito && alvo?.isContentEditable) { limparGrifosElemento(alvo); }
    errosGlobais = []; atualizarInterface();
}
