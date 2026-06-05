// SyntaxMentor content module: Runtime messages
// Loaded in manifest.json order.

// =============================================
// LISTENER DE MENSAGENS - VERSÃO SEGURA
// =============================================

function renderizarTooltipSelecaoStatus(tooltip, mensagem, tipo = 'info') {
    tooltip.replaceChildren(smCriarElemento('div', {
        textContent: mensagem,
        style: `text-align:center;padding:4px;${tipo === 'success' ? 'color:#4ade80;' : ''}`
    }));
}

function renderizarTooltipSelecaoResultado(tooltip, elementoSelecao) {
    tooltip.replaceChildren();
    tooltip.appendChild(smCriarElemento('div', {
        textContent: `${errosGlobais.length} ERRO${errosGlobais.length > 1 ? 'S' : ''} ENCONTRADO${errosGlobais.length > 1 ? 'S' : ''}`,
        style: 'font-size:11px;font-weight:500;color:#a78bfa;margin-bottom:4px'
    }));

    errosGlobais.slice(0, 4).forEach(e => {
        const orig = e.context.text.substr(e.context.offset, e.context.length);
        const sug = e.replacements?.[0]?.value || '';
        if (!orig || !sug) return;

        tooltip.appendChild(smCriarElemento('div', {
            style: 'display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid rgba(255,255,255,.1)'
        }, [
            smCriarElemento('span', {
                textContent: orig,
                style: 'color:#f87171;text-decoration:line-through'
            }),
            smCriarElemento('span', {
                textContent: '->',
                style: 'color:#9ca3af'
            }),
            smCriarElemento('span', {
                textContent: sug,
                style: 'color:#4ade80'
            })
        ]));
    });

    const actions = smCriarElemento('div', { style: 'margin-top:8px;text-align:right' }, [
        smCriarElemento('button', {
            id: 'sm-tooltip-fechar',
            textContent: 'Fechar',
            style: 'background:rgba(255,255,255,.1);border:none;color:#fff;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px'
        })
    ]);

    if (elementoSelecao) {
        actions.appendChild(smCriarElemento('button', {
            id: 'sm-tooltip-abrir',
            textContent: 'Ver no painel',
            style: 'background:#6f42c1;border:none;color:#fff;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px;margin-left:6px'
        }));
    }

    tooltip.appendChild(actions);
}

if (typeof chrome !== 'undefined' && chrome.runtime && isContextoPermitido()) {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        let responded = false;
        
        const responder = (res) => {
            if (responded) return;
            responded = true;
            try {
                sendResponse(res);
            } catch (e) {
                smDebug('Erro ao enviar resposta:', e);
            }
        };
        
        if (request.action === 'togglePainel') {
            if (painelAberto) {
                fecharPainel();
            } else {
                exibirPainel();
            }
            responder({ success: true });
            return true;
        }
        
        if (request.action === 'ignorarErroAtual') {
            if (errosGlobais.length > 0) {
                const primeiro = errosGlobais[0];
                const palavra = primeiro.context.text.substr(primeiro.context.offset, primeiro.context.length);
                ignorarTemporariamente(palavra);
            }
            responder({ success: true });
            return true;
        }
        
        if (request.action === 'getErrosAtivos') {
            const erros = errosGlobais.slice(0, 10).map(e => ({
                original: e.context.text.substr(e.context.offset, e.context.length),
                sugestao: e.replacements?.[0]?.value || '',
                message: e.message || ''
            })).filter(e => e.original && e.sugestao && e.original !== e.sugestao);
            responder({ erros, total: erros.length });
            return true;
        }
        
        if (request.action === 'aplicarCorrecaoPopup') {
            const { original, sugestao } = request;
            if (elementoGlobal && original && sugestao) {
                aplicarCorrecao(original, sugestao, elementoGlobal, true);
            }
            responder({ success: true });
            return true;
        }
        
        if (request.action === 'revisarSelecao' && request.texto) {
            const texto = request.texto.trim();
            const elementoSelecao = registrarElementoEditavelAtivo(obterElementoEditavelDaSelecao());
            const sel = window.getSelection();
            const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0).getBoundingClientRect() : null;
            
            const div = document.createElement('div');
            div.contentEditable = 'true';
            div.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
            div.textContent = texto;
            document.body.appendChild(div);
            
            textoUltimaVerificacao = texto;
            elementoGlobal = div;
            
            const tooltip = document.createElement('div');
            tooltip.id = 'sm-selecao-tooltip';
            tooltip.style.cssText = `
                position:fixed; z-index:2147483647; background:#1a1a2e; color:#fff;
                border-radius:10px; padding:12px 16px; font-size:13px;
                font-family:'Segoe UI',system-ui,sans-serif; max-width:320px;
                box-shadow:0 8px 32px rgba(0,0,0,.25);
                top:${range ? Math.max(10, range.top - 80) : 100}px;
                left:${range ? Math.min(window.innerWidth - 340, range.left) : 100}px;
            `;
            renderizarTooltipSelecaoStatus(tooltip, 'Verificando selecao...');
            document.body.appendChild(tooltip);
            
            verificarTexto(texto, div).then(() => {
                if (div.parentNode) div.parentNode.removeChild(div);
                if (elementoSelecao) registrarElementoEditavelAtivo(elementoSelecao);
                else elementoGlobal = null;
                if (errosGlobais.length === 0) {
                    renderizarTooltipSelecaoStatus(tooltip, SM_TEXTOS.painel.nenhumErroTitulo, 'success');
                    setTimeout(() => tooltip.remove(), 2500);
                    responder({ success: true });
                    return;
                }
                
                renderizarTooltipSelecaoResultado(tooltip, elementoSelecao);
                
                const fecharBtn = document.getElementById('sm-tooltip-fechar');
                const abrirBtn = document.getElementById('sm-tooltip-abrir');
                if (fecharBtn) fecharBtn.onclick = () => tooltip.remove();
                if (abrirBtn) abrirBtn.onclick = () => { tooltip.remove(); exibirPainel(); };
                if (!elementoSelecao) {
                    errosGlobais = [];
                    atualizarInterface();
                }
                setTimeout(() => tooltip.remove(), 8000);
                responder({ success: true });
            }).catch((err) => {
                if (div.parentNode) div.parentNode.removeChild(div);
                if (tooltip) tooltip.remove();
                responder({ success: false, error: err.message });
            });
            
            return true;
        }
        
        if (request.action === 'ignorarTemporariamente' && request.palavra) {
            ignorarTemporariamente(request.palavra);
            responder({ success: true });
            return true;
        }
        
        if (request.action === 'corrigirTudo') {
            if (errosGlobais.length > 0) {
                corrigirTudo();
            }
            responder({ success: true });
            return true;
        }
        
        if (request.action === 'revisarPaginaInteira') {
            revisarPaginaInteira();
            responder({ success: true });
            return true;
        }
        
        if (request.action === 'toggleSite') {
            atualizarEstadoExtensao(request.enabled);
            responder({ success: true });
            return true;
        }
        
        if (request.action === 'siteToggled') {
            atualizarEstadoExtensao(request.enabled);
            responder({ success: true });
            return true;
        }
        
        responder({ success: false, error: 'Unknown action: ' + request.action });
        return true;
    });
}
