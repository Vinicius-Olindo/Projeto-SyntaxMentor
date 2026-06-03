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
        const esc = palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        elementoGlobal.innerHTML = elementoGlobal.innerHTML.replace(new RegExp(`<mark class="sm-highlight">${esc}</mark>`, 'g'), palavra);
        atualizarElementoComEventos(elementoGlobal);
    }
    removerErroGlobal(palavra);
    mostrarFeedback(`"${palavra}" ignorada nesta sessão`, 'info');
}

function aplicarCorrecao(original, sugestao, el, pularConfirmacao = false) {
    if (!el || original == null || original === '' || sugestao == null) return;
    const executarCorrecao = () => {
        const textoAntes = el.value || el.textContent || el.innerText || '';
        if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
            const valorAntigo = el.value;
            const posicao = encontrarPosicaoPalavra(el.value, original);
            el.value = el.value.replace(criarRegexCorrecaoTexto(original), sugestao);
            if (el.value !== valorAntigo) {
                salvarEstadoParaDesfazer(el, original, sugestao, textoAntes, el.value);
                mostrarFeedbackCorrecao(el, posicao, original, sugestao);
                dispararEventosNativos(el);
                requestAnimationFrame(() => { if (el.value !== valorAntigo) dispararEventosNativos(el); });
                setTimeout(() => { el.blur(); el.focus(); dispararEventosNativos(el); }, 100);
            }
        } else if (el.isContentEditable) {
            if (isSiteRestrito) {
                const htmlAntigo = el.innerHTML;
                el.focus();
                try {
                    const doc = el.ownerDocument || document;
                    if (doc.execCommand('find', false, original)) doc.execCommand('insertText', false, sugestao);
                    else el.textContent = (el.textContent || '').replace(criarRegexCorrecaoTexto(original), sugestao);
                } catch(e) { el.textContent = (el.textContent || '').replace(criarRegexCorrecaoTexto(original), sugestao); }
                if (el.innerHTML !== htmlAntigo) {
                    salvarEstadoParaDesfazer(el, original, sugestao, htmlAntigo, el.innerHTML);
                }
                atualizarElementoComEventos(el);
            } else {
                let html = el.innerHTML;
                const htmlAntigo = html;
                const esc = escaparRegexCorrecao(original);
                const markRegex = new RegExp(`<mark class="sm-highlight">${esc}</mark>`, 'g');
                const sugestaoSegura = escapeHtml(sugestao);
                if (markRegex.test(html)) html = html.replace(markRegex, `<span class="sm-correction-feedback">${sugestaoSegura}</span>`);
                else html = html.replace(criarRegexCorrecaoHtml(original), `<span class="sm-correction-feedback">${sugestaoSegura}</span>`);
                if (html !== htmlAntigo) {
                    salvarEstadoParaDesfazer(el, original, sugestao, htmlAntigo, html);
                    el.innerHTML = html;
                    const elementoCorrigido = el.querySelector('.sm-correction-feedback');
                    if (elementoCorrigido) {
                        setTimeout(() => { const span = elementoCorrigido; const parent = span.parentNode; if (!parent) return; const texto = document.createTextNode(span.textContent); parent.replaceChild(texto, span); parent.normalize(); }, 500);
                    }
                }
                atualizarElementoComEventos(el);
                setTimeout(() => atualizarElementoComEventos(el), 100);
            }
        }
        historicoCorrecoes.push({ el, original, sugestao, timestamp: Date.now() });
        if (historicoCorrecoes.length > 50) historicoCorrecoes.shift();
        const erroEncontrado = smConfig.modoAprendizado
            ? errosGlobais.find(e => {
                const o = e.context.text.substr(e.context.offset, e.context.length);
                return o === original;
            })
            : null;
        removerErroGlobal(original);
        const olOriginal = original.toLowerCase();
        if (!ignoradosTemporarios.includes(olOriginal)) { ignoradosTemporarios.push(olOriginal); setTimeout(() => { ignoradosTemporarios = ignoradosTemporarios.filter(p => p !== olOriginal); }, 5000); }
        registrarCorrecaoAplicada();
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

function confirmarCorrecaoEmLote(correcoes) {
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
    btnConfirm.onclick = () => { overlay.remove(); correcoes.forEach(([o, s]) => aplicarCorrecao(o, s, elementoGlobal, true)); errosGlobais = []; atualizarInterface(); mostrarFeedbackInteligente('✓ Tudo corrigido!', 'success'); };
    btnCancel.onclick = () => overlay.remove();
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

function corrigirTudo() {
    if (!elementoGlobal) return;
    const unicos = {};
    errosGlobais.forEach(err => { const o = err.context.text.substr(err.context.offset, err.context.length); const s = err.replacements[0]?.value; if (o.trim() && s != null && !Object.hasOwn(unicos, o)) unicos[o] = s; });
    const correcoes = Object.entries(unicos);
    if (correcoes.length === 0) return;
    if (smConfig.modoConfirmacao || isModoLeitura()) confirmarCorrecaoEmLote(correcoes);
    else { correcoes.forEach(([o, s]) => aplicarCorrecao(o, s, elementoGlobal, true)); errosGlobais = []; atualizarInterface(); mostrarFeedbackInteligente('✓ Tudo corrigido!', 'success'); }
}

function limparTudo() {
    if (!isSiteRestrito && elementoGlobal?.isContentEditable) { elementoGlobal.innerHTML = elementoGlobal.innerHTML.replace(/<mark class="sm-highlight">(.*?)<\/mark>/gi, '$1'); atualizarElementoComEventos(elementoGlobal); }
    errosGlobais = []; atualizarInterface();
}
