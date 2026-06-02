// SyntaxMentor content module: Bubble, panel and dragging
// Loaded in manifest.json order.

// =============================================
// INTERFACE DO USUÁRIO
// =============================================

function atualizarInterface() {
    if (smConfig.disabled) return;
    if (smConfig.modoFoco && !painelAberto) {
        if (!modoFocoAtivo) {
            modoFocoAtivo = true;
            iniciarTimeoutFoco();
        }
    } else {
        modoFocoAtivo = false;
        desativarModoFoco();
        clearTimeout(timeoutFoco);
    }

    let bubble = document.getElementById('syntax-mentor-bubble');
    const total = errosGlobais.filter(e => e.context.text.substr(e.context.offset, e.context.length).trim()).length;
    atualizarBadgeBackground(total);

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

    bubble.classList.toggle('sm-dark', !!smConfig.darkMode);
    if (bubblePosX) {
        bubble.style.left = bubblePosX;
        bubble.style.top = bubblePosY;
        bubble.style.right = 'auto';
        bubble.style.bottom = 'auto';
    }

    if (estaCarregando && errosGlobais.length > 0) {
        bubble.style.opacity = '0.6';
        bubble.style.pointerEvents = 'auto';
        bubble.style.display = 'flex';
    } else {
        atualizarVisibilidadeBolha();
    }

    renderizarBolha(bubble, total);
    if (total === 0) {
        if (painelAberto) fecharPainelComSucesso();
    } else if (painelAberto) {
        exibirPainel();
    }
}

function renderizarBolha(bubble, total) {
    const baseClass = total === 0 ? 'sm-bubble-success' : 'sm-bubble-error';
    bubble.className = smConfig.darkMode ? `${baseClass} sm-dark` : baseClass;
    bubble.replaceChildren();

    const icon = document.createElement('span');
    icon.className = 'sm-bubble-icon';
    icon.textContent = total === 0 ? '\u2713' : (isModoLeitura() ? '\u{1F441}\uFE0F' : '\u270F\uFE0F');
    bubble.appendChild(icon);

    if (total > 0) {
        const badge = document.createElement('span');
        badge.className = 'sm-bubble-badge';
        badge.textContent = String(total);
        bubble.appendChild(badge);
    }
}

function renderizarHistoricoPainel(historicoContent) {
    if (!historicoContent) return;

    historicoContent.replaceChildren();

    if (historicoCorrecoes.length === 0) {
        historicoContent.appendChild(smCriarElemento('div', {
            style: 'text-align:center;padding:40px;'
        }, [
            smCriarElemento('div', {
                textContent: 'Inbox',
                style: 'font-size:24px;color:#9ca3af;margin-bottom:8px;'
            }),
            smCriarElemento('p', { textContent: SM_TEXTOS.painel.historicoVazio })
        ]));
        return;
    }

    historicoCorrecoes.slice().reverse().forEach((item, idx) => {
        const realIdx = historicoCorrecoes.length - 1 - idx;
        const hora = new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const btnReverter = smCriarElemento('button', {
            className: 'sm-btn-reverter',
            textContent: 'Reverter',
            dataset: { idx: realIdx },
            style: 'font-size:10px;padding:4px 10px;border-radius:6px;border:1px solid #e2e8f0;background:white;cursor:pointer;'
        });

        btnReverter.addEventListener('click', () => {
            const idxReal = parseInt(btnReverter.dataset.idx);
            const itemHistorico = historicoCorrecoes[idxReal];
            if (itemHistorico?.el) {
                const el = itemHistorico.el;
                const novoValor = (el.value || el.textContent || '').replace(itemHistorico.sugestao, itemHistorico.original);
                if (el.value !== undefined) el.value = novoValor;
                else el.textContent = novoValor;
                dispararEventosNativos(el);
                historicoCorrecoes.splice(idxReal, 1);
                mostrarFeedback('Revertido: "' + itemHistorico.sugestao + '" -> "' + itemHistorico.original + '"', 'info');
                exibirPainel();
            }
        });

        historicoContent.appendChild(smCriarElemento('div', {
            style: 'border-radius:8px;padding:10px;margin-bottom:8px;border:1px solid #e2e8f0;'
        }, [
            smCriarElemento('div', {
                style: 'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;'
            }, [
                smCriarElemento('div', {
                    style: 'display:flex;align-items:center;gap:6px;'
                }, [
                    smCriarElemento('span', {
                        textContent: item.original,
                        style: 'color:#dc2626;text-decoration:line-through;'
                    }),
                    smCriarElemento('span', { textContent: '->' }),
                    smCriarElemento('span', {
                        textContent: item.sugestao,
                        style: 'color:#059669;font-weight:bold;'
                    })
                ]),
                smCriarElemento('div', {
                    style: 'display:flex;align-items:center;gap:8px;'
                }, [
                    smCriarElemento('span', {
                        textContent: hora,
                        style: 'font-size:10px;color:#64748b;'
                    }),
                    btnReverter
                ])
            ])
        ]));
    });
}

function criarHeaderPainelPrincipal() {
    const titulo = isModoLeitura() ? SM_TEXTOS.painel.revisao : SM_TEXTOS.painel.sugestoes;
    const titleGroup = smCriarElemento('div', { className: 'sm-panel-title' }, [
        smCriarElemento('span', {
            className: 'sm-panel-icon',
            textContent: isModoLeitura() ? 'Ver' : 'Aa'
        }),
        smCriarElemento('span', {
            className: 'sm-panel-title-text',
            textContent: titulo
        })
    ]);

    if (isModoLeitura()) {
        titleGroup.appendChild(smCriarElemento('span', {
            className: 'sm-panel-badge',
            textContent: SM_TEXTOS.painel.modoLeitura
        }));
    }

    return smCriarElemento('div', { id: 'syntax-mentor-header' }, [
        titleGroup,
        smCriarElemento('button', {
            id: 'btn-fechar-painel',
            textContent: 'x',
            title: 'Fechar',
            attributes: { 'aria-label': 'Fechar painel' }
        })
    ]);
}

function criarTabsPainelPrincipal() {
    return smCriarElemento('div', { id: 'sm-tabs-container' }, [
        smCriarElemento('button', {
            id: 'sm-tab-grammar',
            className: 'sm-tab-btn active',
            textContent: SM_TEXTOS.painel.gramatica
        }),
        smCriarElemento('button', {
            id: 'sm-tab-historico',
            className: 'sm-tab-btn',
            textContent: SM_TEXTOS.painel.historico
        })
    ]);
}

function criarEstadoVazioPainel() {
    return smCriarElemento('div', { className: 'sm-empty-state' }, [
        smCriarElemento('div', {
            className: 'sm-empty-icon',
            textContent: 'OK'
        }),
        smCriarElemento('p', {
            className: 'sm-empty-title',
            textContent: SM_TEXTOS.painel.nenhumErroTitulo
        }),
        smCriarElemento('p', {
            className: 'sm-empty-desc',
            textContent: SM_TEXTOS.painel.nenhumErroDescricao
        })
    ]);
}

function criarResumoErrosPainel(totalErros) {
    return smCriarElemento('div', { className: 'stats-header sm-panel-summary' }, [
        smCriarElemento('p', {
            className: 'stats-text',
            textContent: `${totalErros} erro${totalErros !== 1 ? 's' : ''} encontrado${totalErros !== 1 ? 's' : ''}`
        })
    ]);
}

function criarCardErroPainel(erro, idx) {
    const card = smCriarElemento('div', {
        className: 'erro-card',
        dataset: { errorIdx: idx, errorOffset: erro.offset }
    });

    card.appendChild(smCriarElemento('div', { className: 'palavra-group' }, [
        smCriarElemento('span', {
            className: 'palavra-original',
            textContent: erro.original
        }),
        smCriarElemento('span', {
            className: 'seta',
            textContent: '->'
        }),
        smCriarElemento('span', {
            className: 'palavra-sugestao',
            textContent: erro.sugestao || '[remover]'
        })
    ]));

    card.appendChild(smCriarElemento('div', { className: 'botoes-acao' }, [
        smCriarElemento('button', {
            className: 'btn-fix-mini',
            textContent: 'Corrigir',
            dataset: { o: erro.original, s: erro.sugestao }
        }),
        smCriarElemento('button', {
            className: 'btn-ignorar-sessao',
            textContent: 'Ignorar',
            dataset: { o: erro.original }
        }),
        smCriarElemento('button', {
            className: 'btn-ignorar',
            textContent: '+ Dic',
            dataset: { o: erro.original }
        })
    ]));

    if (erro.mensagem) {
        card.appendChild(smCriarElemento('div', {
            className: 'erro-msg',
            textContent: erro.mensagem
        }));
    }

    return card;
}

function criarFooterPainelPrincipal(totalErros) {
    const filhos = [
        smCriarElemento('div', { className: 'nav-container' }, [
            smCriarElemento('button', {
                id: 'btn-erro-prev',
                className: 'nav-btn',
                textContent: '<',
                title: 'Sugestao anterior'
            }),
            smCriarElemento('span', {
                id: 'sm-nav-contador',
                className: 'nav-contador',
                textContent: `0 / ${totalErros}`
            }),
            smCriarElemento('button', {
                id: 'btn-erro-next',
                className: 'nav-btn',
                textContent: '>',
                title: 'Proxima sugestao'
            })
        ]),
        smCriarElemento('button', {
            id: 'btn-corrigir-tudo',
            className: 'btn-corrigir-tudo',
            textContent: `${SM_TEXTOS.painel.corrigirTudo} (${totalErros})`
        }),
        smCriarElemento('button', {
            id: 'btn-ignorar-tudo',
            className: 'btn-ignorar-tudo',
            textContent: SM_TEXTOS.painel.ignorarTudo
        })
    ];

    if (historicoDesfazer.length > 0) {
        filhos.push(smCriarElemento('div', { className: 'btn-desfazer' }, [
            smCriarElemento('button', {
                id: 'btn-desfazer-ultima',
                textContent: SM_TEXTOS.painel.desfazer
            })
        ]));
    }

    filhos.push(smCriarElemento('div', {
        className: 'shortcuts',
        textContent: SM_TEXTOS.painel.atalhosPainel
    }));

    return smCriarElemento('div', { className: 'painel-footer' }, filhos);
}

function renderizarPainelPrincipal(painel, errosValidos, totalErros) {
    const grammarContent = smCriarElemento('div', { id: 'syntax-mentor-content' });

    if (errosValidos.length === 0) {
        grammarContent.appendChild(criarEstadoVazioPainel());
    } else {
        grammarContent.appendChild(criarResumoErrosPainel(totalErros));
        errosValidos.forEach((erro, idx) => {
            grammarContent.appendChild(criarCardErroPainel(erro, idx));
        });
    }

    painel.replaceChildren(
        criarHeaderPainelPrincipal(),
        criarTabsPainelPrincipal(),
        grammarContent,
        smCriarElemento('div', { id: 'sm-historico-content' }),
        criarFooterPainelPrincipal(totalErros)
    );
}

function exibirPainel() {
    if (modoFocoAtivo) {
        desativarModoFoco();
        clearTimeout(timeoutFoco);
    }

    painelAberto = true;
    indexSugestao = -1;

    let painel = document.getElementById('syntax-mentor-painel');
    if (!painel) {
        painel = document.createElement('div');
        painel.id = 'syntax-mentor-painel';
        document.body.appendChild(painel);
    }

    if (smConfig.darkMode) {
        painel.classList.add('sm-dark');
    } else {
        painel.classList.remove('sm-dark');
    }

    const errosValidos = [];
    
    errosGlobais.forEach(e => {
        const o = e.context.text.substr(e.context.offset, e.context.length);
        if (!o || o.trim().length === 0) return;
        if (o.match(/^[.,;:!?()\[\]{}\s]+$/)) return;
        if (o === o.sugestao) return;
        
        errosValidos.push({
            original: o,
            sugestao: e.replacements[0]?.value || '',
            mensagem: e.message || 'Possível erro de ortografia',
            offset: e.context.offset,
            length: e.context.length,
            context: e.context
        });
    });
    
    errosValidos.sort((a, b) => a.offset - b.offset);
    const totalErros = errosValidos.length;

    renderizarPainelPrincipal(painel, errosValidos, totalErros);
    tornarArrastavelPainel(painel, document.getElementById('syntax-mentor-header'));

    const grammarContent = document.getElementById('syntax-mentor-content');
    const historicoContent = document.getElementById('sm-historico-content');
    const tabGrammar = document.getElementById('sm-tab-grammar');
    const tabHistorico = document.getElementById('sm-tab-historico');

    function switchTab(tab) {
        [tabGrammar, tabHistorico].forEach(t => {
            if(t) {
                t.classList.remove('active');
            }
        });
        
        if (grammarContent) grammarContent.style.display = 'none';
        if (historicoContent) historicoContent.style.display = 'none';
        
        if (tab === 'grammar') {
            if(tabGrammar) tabGrammar.classList.add('active');
            if (grammarContent) grammarContent.style.display = 'block';
        } else if (tab === 'historico') {
            if(tabHistorico) tabHistorico.classList.add('active');
            if (historicoContent) {
                historicoContent.style.display = 'block';
                renderizarHistoricoPainel(historicoContent);
            }
        }
    }

    if (tabGrammar) tabGrammar.addEventListener('click', () => switchTab('grammar'));
    if (tabHistorico) tabHistorico.addEventListener('click', () => switchTab('historico'));

    const btnFechar = document.getElementById('btn-fechar-painel');
    if (btnFechar) btnFechar.onclick = fecharPainel;
    
    const btnCorrigir = document.getElementById('btn-corrigir-tudo');
    if (btnCorrigir) btnCorrigir.onclick = corrigirTudo;
    
    const btnIgnorar = document.getElementById('btn-ignorar-tudo');
    if (btnIgnorar) btnIgnorar.onclick = limparTudo;

    let erroNavIdx = 0;

    function atualizarContador() {
        const contador = document.getElementById('sm-nav-contador');
        if (contador && errosValidos.length > 0) {
            contador.textContent = (erroNavIdx + 1) + ' / ' + errosValidos.length;
        } else if (contador) {
            contador.textContent = '0 / 0';
        }
    }

    function navegarParaErro(idx) {
        if (errosValidos.length === 0) return;
        erroNavIdx = (idx + errosValidos.length) % errosValidos.length;
        const erro = errosValidos[erroNavIdx];
        const palavra = erro.original;
        atualizarContador();
        
        const marks = document.querySelectorAll('mark.sm-highlight');
        marks.forEach(m => m.style.outline = '');
        marks.forEach(m => {
            if (m.textContent === palavra) {
                m.style.outline = '2px solid #f97316';
                m.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        
        document.querySelectorAll('.erro-card').forEach(card => {
            const btn = card.querySelector('.btn-fix-mini');
            if (btn) {
                card.classList.toggle('active', btn.dataset.o === palavra);
            }
        });
    }

    const btnNext = document.getElementById('btn-erro-next');
    const btnPrev = document.getElementById('btn-erro-prev');
    if (btnNext) btnNext.addEventListener('click', () => navegarParaErro(erroNavIdx + 1));
    if (btnPrev) btnPrev.addEventListener('click', () => navegarParaErro(erroNavIdx - 1));

    atualizarContador();

    if (errosValidos.length > 0) {
        const primeiroCard = document.querySelector('.erro-card');
        if (primeiroCard) {
            primeiroCard.classList.add('active');
        }
    }
    
    const botoesFix = painel.querySelectorAll('.btn-fix-mini');
    if (botoesFix && botoesFix.length) {
        botoesFix.forEach(b => {
            if (b) {
                b.onclick = () => {
                    aplicarCorrecao(b.dataset.o, b.dataset.s, elementoGlobal);
                    removerErroGlobal(b.dataset.o);
                    exibirPainel();
                };
            }
        });
    }
    
    const botoesIgnorar = painel.querySelectorAll('.btn-ignorar-sessao');
    if (botoesIgnorar && botoesIgnorar.length) {
        botoesIgnorar.forEach(b => {
            if (b) b.onclick = () => ignorarTemporariamente(b.dataset.o);
        });
    }
    
    const botoesDic = painel.querySelectorAll('.btn-ignorar');
    if (botoesDic && botoesDic.length) {
        botoesDic.forEach(b => {
            if (b) {
                b.onclick = () => {
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
                    mostrarFeedback('"' + o + '" → dicionário', 'success');
                    exibirPainel();
                };
            }
        });
    }
    
    const btnDesfazer = document.getElementById('btn-desfazer-ultima');
    if (btnDesfazer) {
        btnDesfazer.addEventListener('click', () => {
            desfazerUltimaCorrecao();
            if (elementoGlobal && textoUltimaVerificacao) {
                verificarTexto(textoUltimaVerificacao, elementoGlobal);
            }
            exibirPainel();
        });
    }
    
    switchTab('grammar');
}

function fecharPainel() { 
    const painel = document.getElementById('syntax-mentor-painel'); 
    if (painel) painel.remove(); 
    painelAberto = false; 
    if (smConfig.modoFoco && !usuarioDigitando) setTimeout(() => { modoFocoAtivo = true; iniciarTimeoutFoco(); }, 1000); 
}

function fecharPainelComSucesso() {
    const conteudo = document.getElementById('syntax-mentor-content');
    if (conteudo) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'text-align:center;padding:30px;';
        const icon = document.createElement('div');
        icon.style.cssText = 'font-size:48px;color:#28a745;';
        icon.textContent = 'OK';
        const texto = document.createElement('p');
        texto.textContent = 'Tudo limpo!';
        wrapper.append(icon, texto);
        conteudo.replaceChildren(wrapper);
    }
    setTimeout(fecharPainel, 1500);
}

// =============================================
// FUNÇÕES DE ARRASTE
// =============================================

function tornarArrastavel(el) {
    let startX = 0, startY = 0, isDragging = false, hasMoved = false;
    function onMouseMove(e) { if (!isDragging) return; const dx = e.clientX - startX; const dy = e.clientY - startY; if (Math.abs(dx) > 5 || Math.abs(dy) > 5) { hasMoved = true; isDraggingBubble = true; el.style.left = (el.offsetLeft + dx) + 'px'; el.style.top = (el.offsetTop + dy) + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; bubblePosX = el.style.left; bubblePosY = el.style.top; startX = e.clientX; startY = e.clientY; } }
    function onMouseUp() { isDragging = false; el.style.cursor = 'grab'; document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); setTimeout(() => { isDraggingBubble = false; }, 100); }
    el.addEventListener('mousedown', (e) => { startX = e.clientX; startY = e.clientY; isDragging = true; hasMoved = false; el.style.cursor = 'grabbing'; document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onMouseUp); });
    el.style.cursor = 'grab';
}

function tornarArrastavelPainel(painel, handle) {
    if (!handle) return;
    let p1, p2, p3, p4;
    function onMovePainel(e2) { p1 = p3 - e2.clientX; p2 = p4 - e2.clientY; p3 = e2.clientX; p4 = e2.clientY; painel.style.top = (painel.offsetTop - p2) + 'px'; painel.style.left = (painel.offsetLeft - p1) + 'px'; }
    function onUpPainel() { document.removeEventListener('mousemove', onMovePainel); document.removeEventListener('mouseup', onUpPainel); }
    handle.addEventListener('mousedown', (e) => { e.preventDefault(); p3 = e.clientX; p4 = e.clientY; document.addEventListener('mousemove', onMovePainel); document.addEventListener('mouseup', onUpPainel); });
}
