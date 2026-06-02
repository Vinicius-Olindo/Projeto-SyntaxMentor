// SyntaxMentor content module: Local punctuation and full-page review
// Loaded in manifest.json order.

// =============================================
// PONTUAÇÃO
// =============================================

function verificarPontuacaoComum(texto) {
    const errosPontuacao = [];
    const regras = [
        { regex: /\s+(?=[.,;:](?!\.{2}))/g, msg: 'Espaço desnecessário antes da pontuação', replace: '' },
        { regex: /(?<!\.)\.{2}(?!\.)/g, msg: 'Pontuação duplicada. Use apenas um ponto ou reticências (...).', replace: '.' },
        { regex: /,([a-zA-Zà-úÀ-Ú])/g, msg: 'Falta um espaço após a vírgula', replace: (m, p1) => ', ' + p1 },
        { regex: /([!?])([a-zA-Zà-úÀ-Ú])/g, msg: 'Falta um espaço após o sinal', replace: (m, p1, p2) => p1 + ' ' + p2 }
    ];
    regras.forEach(regra => {
        const re = new RegExp(regra.regex.source, regra.regex.flags.includes('g') ? regra.regex.flags : regra.regex.flags + 'g');
        let match;
        while ((match = re.exec(texto)) !== null) {
            const pos = match.index;
            const len = match[0].length;
            const corrigido = typeof regra.replace === 'function' ? regra.replace(match[0], ...match.slice(1)) : regra.replace;
            errosPontuacao.push({
                context: { text: texto, offset: pos, length: len },
                message: regra.msg,
                replacements: [{ value: corrigido }],
                rule: { id: 'LOCAL_PUNCTUATION', category: { name: 'Pontuação' } }
            });
            if (len === 0) re.lastIndex++;
        }
    });
    return errosPontuacao;
}

function processarPontuacao(matches) {
    if (!matches || matches.length === 0) return matches;
    return matches.map(match => {
        const novoMatch = { ...match };
        const original = match.context.text.substr(match.context.offset, match.context.length);
        const palavraLimpa = original.replace(/^[.,;:!?¿¡"''()\[\]{}…\-—–\s]+/, '').replace(/[.,;:!?¿¡"''()\[\]{}…\-—–\s]+$/, '');
        if (palavraLimpa !== original && palavraLimpa.length > 0) {
            const pontuacaoInicio = original.indexOf(palavraLimpa);
            novoMatch.offset = (match.offset || 0) + pontuacaoInicio;
            novoMatch.length = palavraLimpa.length;
            novoMatch.context = {
                ...match.context,
                offset: match.context.offset + pontuacaoInicio,
                length: palavraLimpa.length
            };
        }
        return novoMatch;
    });
}

// =============================================
// REVISÃO DE PÁGINA INTEIRA
// =============================================

function extrairTextosDaPagina() {
    const textos = [];
    const elementos = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, td, th, span, div, article, section, blockquote, pre, code');
    elementos.forEach(el => {
        if (el.offsetParent === null && el.tagName !== 'BODY') return;
        const texto = el.innerText?.trim();
        if (!texto || texto.length < 10) return;
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return;
        if (el.closest('#syntax-mentor-painel') || el.closest('#syntax-mentor-bubble')) return;
        textos.push({ elemento: el, texto: texto });
    });
    return textos;
}

async function revisarPaginaInteira() {
    mostrarFeedback('🔍 Analisando página inteira...', 'info');
    const textos = extrairTextosDaPagina();
    if (textos.length === 0) {
        mostrarFeedback('📭 Nenhum texto encontrado na página', 'info');
        return;
    }
    const textoCompleto = textos.map(t => t.texto).join('\n\n');
    if (textoCompleto.length < 10) {
        mostrarFeedback('📭 Texto muito curto para revisar', 'info');
        return;
    }
    const div = document.createElement('div');
    div.contentEditable = 'true';
    div.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
    div.textContent = textoCompleto;
    document.body.appendChild(div);
    textoUltimaVerificacao = textoCompleto;
    elementoGlobal = div;
    try {
        await verificarTexto(textoCompleto, div);
        document.body.removeChild(div);
        if (errosGlobais.length > 0) {
            exibirPainelRevisaoPagina(errosGlobais, textos);
        } else {
            mostrarFeedback('✅ Nenhum erro encontrado na página!', 'success');
        }
    } catch (err) {
        document.body.removeChild(div);
        mostrarFeedback('⚠️ Erro ao revisar página', 'error');
    }
}

function criarPreviewRevisaoPagina(contexto, palavra) {
    if (!contexto) return null;

    const pos = contexto.texto.indexOf(palavra);
    if (pos < 0) return null;

    const inicio = Math.max(0, pos - 30);
    const fim = Math.min(contexto.texto.length, pos + palavra.length + 30);
    const antes = contexto.texto.substring(inicio, pos);
    const depois = contexto.texto.substring(pos + palavra.length, fim);

    const preview = smCriarElemento('p', { className: 'sm-page-review-preview' });
    preview.append(
        document.createTextNode(`...${antes}`),
        smCriarElemento('span', {
            className: 'sm-page-review-highlight',
            textContent: palavra
        }),
        document.createTextNode(`${depois}...`)
    );
    return preview;
}

function criarCardRevisaoPagina(original, info, textosOriginais) {
    const contexto = textosOriginais.find(t => t.texto.includes(original));
    const card = smCriarElemento('div', { className: 'erro-card' });
    const preview = criarPreviewRevisaoPagina(contexto, original);

    card.appendChild(smCriarElemento('p', {
        className: 'erro-msg',
        textContent: `Erro: ${original}`,
        title: info.msg
    }));

    if (preview) card.appendChild(preview);

    card.appendChild(smCriarElemento('div', { className: 'sugestao-container' }, [
        smCriarElemento('span', {
            className: 'palavra-original',
            textContent: original
        }),
        smCriarElemento('span', {
            className: 'seta',
            textContent: '->'
        }),
        smCriarElemento('div', { className: 'botoes-acao' }, [
            smCriarElemento('button', {
                className: 'btn-fix-mini',
                textContent: info.s || '[Remover]',
                dataset: { o: original, s: info.s }
            }),
            smCriarElemento('button', {
                className: 'btn-ignorar-sessao',
                textContent: 'Ignorar',
                dataset: { o: original }
            }),
            smCriarElemento('button', {
                className: 'btn-ignorar',
                textContent: '+ Dic',
                dataset: { o: original }
            })
        ])
    ]));

    return card;
}

function renderizarPainelRevisaoPagina(painel, mapa, total, textosOriginais) {
    const bodyCards = smCriarElemento('div', { className: 'body-cards' });
    const entradas = Object.entries(mapa);

    if (entradas.length === 0) {
        bodyCards.appendChild(smCriarElemento('div', {
            className: 'sm-empty-state',
            textContent: SM_TEXTOS.painel.nenhumErroTitulo
        }));
    } else {
        bodyCards.appendChild(smCriarElemento('p', {
            className: 'stats-text sm-panel-summary-text',
            textContent: `Encontrados ${total} erros em ${textosOriginais.length} blocos de texto`
        }));

        entradas.forEach(([original, info]) => {
            bodyCards.appendChild(criarCardRevisaoPagina(original, info, textosOriginais));
        });
    }

    painel.replaceChildren(
        smCriarElemento('div', { id: 'syntax-mentor-header' }, [
            smCriarElemento('span', {
                className: 'sm-panel-title-text',
                textContent: 'Revisao da Pagina'
            }),
            smCriarElemento('button', {
                id: 'btn-fechar-painel',
                textContent: 'x',
                title: 'Fechar',
                attributes: { 'aria-label': 'Fechar painel' }
            })
        ]),
        smCriarElemento('div', { id: 'syntax-mentor-content' }, [
            bodyCards,
            smCriarElemento('div', { className: 'footer-actions' }, [
                smCriarElemento('button', {
                    id: 'btn-corrigir-tudo',
                    className: 'btn-corrigir-tudo',
                    textContent: `${SM_TEXTOS.painel.corrigirTudo} (${total})`
                }),
                smCriarElemento('button', {
                    id: 'btn-ignorar-tudo',
                    className: 'btn-ignorar-tudo',
                    textContent: SM_TEXTOS.painel.ignorarTudo
                })
            ]),
            smCriarElemento('div', {
                className: 'sm-page-review-warning',
                textContent: 'As correcoes serao aplicadas no texto original da pagina'
            })
        ])
    );
}

function exibirPainelRevisaoPagina(erros, textosOriginais) {
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
    erros.forEach(e => {
        const o = e.context.text.substr(e.context.offset, e.context.length);
        if (!o.trim()) return;
        if (!mapa[o]) mapa[o] = { s: e.replacements[0]?.value || '', c: 0, msg: e.message };
        mapa[o].c++;
        total++;
    });
    renderizarPainelRevisaoPagina(painel, mapa, total, textosOriginais);
    tornarArrastavelPainel(painel, document.getElementById('syntax-mentor-header'));
    
    const btnFechar = document.getElementById('btn-fechar-painel');
    if (btnFechar) btnFechar.onclick = fecharPainel;
    
    const btnCorrigir = document.getElementById('btn-corrigir-tudo');
    if (btnCorrigir) {
        btnCorrigir.addEventListener('click', () => {
            const correcoes = {};
            erros.forEach(e => {
                const o = e.context.text.substr(e.context.offset, e.context.length);
                const s = e.replacements[0]?.value || '';
                if (o && s) correcoes[o] = s;
            });
            let totalAplicadas = 0;
            textosOriginais.forEach(({ elemento, texto }) => {
                let novoTexto = texto;
                Object.entries(correcoes).forEach(([original, sugestao]) => {
                    const esc = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const regex = new RegExp(`(?<![\\p{L}])${esc}(?![\\p{L}])`, 'gu');
                    const antes = novoTexto;
                    novoTexto = novoTexto.replace(regex, sugestao);
                    if (novoTexto !== antes) totalAplicadas++;
                });
                if (novoTexto !== texto) {
                    elemento.innerText = novoTexto;
                    elemento.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });
            errosGlobais = [];
            atualizarInterface();
            mostrarFeedback(`✅ ${totalAplicadas} correções aplicadas na página!`, 'success');
        });
    }
    
    const btnIgnorar = document.getElementById('btn-ignorar-tudo');
    if (btnIgnorar) btnIgnorar.onclick = () => {
        errosGlobais = [];
        atualizarInterface();
    };
    
    painel.querySelectorAll('.btn-fix-mini').forEach(b => {
        if (b) {
            b.onclick = () => {
                const o = b.dataset.o;
                const s = b.dataset.s;
                textosOriginais.forEach(({ elemento, texto }) => {
                    if (texto.includes(o)) {
                        const esc = o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const regex = new RegExp(`(?<![\\p{L}])${esc}(?![\\p{L}])`, 'gu');
                        const novoTexto = texto.replace(regex, s);
                        if (novoTexto !== texto) {
                            elemento.innerText = novoTexto;
                            elemento.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                });
                removerErroGlobal(o);
                mostrarFeedback(`✅ "${o}" → "${s}" corrigido!`, 'success');
            };
        }
    });
    
    painel.querySelectorAll('.btn-ignorar-sessao').forEach(b => {
        if (b) b.onclick = () => ignorarTemporariamente(b.dataset.o);
    });
    
    painel.querySelectorAll('.btn-ignorar').forEach(b => {
        if (b) {
            b.onclick = async () => {
                const o = b.dataset.o;
                if (isExtensaoAtiva()) {
                    storageGetSeguro(['dicionario_pessoal'], (res) => {
                        const dic = res.dicionario_pessoal || [];
                        if (!dic.includes(o)) {
                            dic.push(o);
                            storageSetSeguro({ dicionario_pessoal: dic });
                        }
                    });
                }
                removerErroGlobal(o);
                mostrarFeedback(`"${o}" → dicionário`, 'success');
            };
        }
    });
}
