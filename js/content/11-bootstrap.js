// SyntaxMentor content module: Final config, cleanup and startup
// Loaded in manifest.json order.

// =============================================
// INICIALIZAÇÃO
// =============================================

function obterUrlExternaSegura(valor) {
    try {
        const url = new URL(valor);
        return url.protocol === 'https:' ? url.href : null;
    } catch (e) {
        return null;
    }
}

function mostrarExplicacaoRegra(original, sugestao, mensagem, erroObj) {
    if (!smConfig.modoAprendizado || !mensagem || mensagem.length < 10) return;
    const categoria = erroObj?.rule?.category?.name || '';
    const urls = erroObj?.rule?.urls || [];
    const linkRef = obterUrlExternaSegura(urls.length > 0 ? urls[0].value : null);
    const overlay = document.createElement('div');
    overlay.style.cssText = `position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:2147483646;display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif;`;
    const dialog = document.createElement('div');
    dialog.style.cssText = `background:${smConfig.darkMode ? '#1a1a1a' : 'white'};border-radius:16px;padding:28px;max-width:480px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);`;
    const header = smCriarElemento('div', {
        style: 'text-align:center;margin-bottom:16px;'
    }, [
        smCriarElemento('div', {
            textContent: 'Regra',
            style: 'font-size:20px;font-weight:700;color:#6f42c1;margin-bottom:8px;'
        }),
        smCriarElemento('h3', {
            textContent: 'Por que corrigir?',
            style: 'margin:0 0 6px;font-size:18px;'
        })
    ]);
    if (categoria) {
        header.appendChild(smCriarElemento('span', {
            textContent: categoria,
            style: 'display:inline-block;background:#ede9fe;color:#5b21b6;font-size:11px;font-weight:500;padding:2px 8px;border-radius:4px;margin-bottom:12px;'
        }));
    }

    const comparacao = smCriarElemento('div', {
        style: `background:${smConfig.darkMode ? '#2a2a2a' : '#f8f9fa'};border-radius:12px;padding:16px;margin-bottom:16px;text-align:center;`
    }, [
        smCriarElemento('span', {
            textContent: original,
            style: 'color:#e53e3e;text-decoration:line-through;font-size:18px;font-weight:600;'
        }),
        smCriarElemento('span', {
            textContent: '->',
            style: 'margin:0 10px;color:#9ca3af;'
        }),
        smCriarElemento('span', {
            textContent: sugestao,
            style: 'color:#28a745;font-size:18px;font-weight:600;'
        })
    ]);

    const explicacao = smCriarElemento('div', {
        style: `background:${smConfig.darkMode ? '#3b2e1a' : '#fef3c7'};border-radius:10px;padding:14px;margin-bottom:16px;`
    }, [
        smCriarElemento('p', {
            textContent: mensagem,
            style: 'margin:0 0 6px;font-size:13px;line-height:1.6;'
        })
    ]);
    if (sugestao) {
        explicacao.appendChild(smCriarElemento('p', {
            textContent: `Exemplo: "${sugestao}"`,
            style: 'margin:0;font-size:12px;'
        }));
    }

    const actions = smCriarElemento('div', {
        style: 'display:flex;justify-content:space-between;align-items:center;'
    });
    if (linkRef) {
        actions.appendChild(smCriarElemento('a', {
            textContent: 'Saiba mais',
            style: 'font-size:12px;color:#6f42c1;text-decoration:none',
            attributes: {
                href: linkRef,
                target: '_blank',
                rel: 'noopener noreferrer'
            }
        }));
    }
    actions.appendChild(smCriarElemento('button', {
        className: 'sm-dlg-cancel',
        textContent: 'Entendi',
        style: 'background:#f3f4f6;border:1px solid #d1d5db;color:#374151;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;margin-left:auto'
    }));
    dialog.append(header, comparacao, explicacao, actions);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    const fechar = () => overlay.remove();
    const btnCancel = dialog.querySelector('.sm-dlg-cancel');
    if (btnCancel) btnCancel.addEventListener('click', fechar);
    overlay.addEventListener('click', e => { if (e.target === overlay) fechar(); });
    setTimeout(fechar, 12000);
}

function carregarSmConfig(callback) {
    if (!isContextoPermitido()) {
        if (callback) callback();
        return;
    }
    
    storageGetSeguro({
            language: 'pt-BR', pickyMode: true, speed: 500, darkMode: false,
            blacklist: [], strictMode: false,
            disabled: false, autoHideBubble: false, modoConfirmacao: false,
            modoLeituraGlobal: false, modoLeituraSites: [], modoWhitelist: false,
            whitelist: [], modoFoco: false, modoAprendizado: false,
            userBlacklistOverrides: [], userWhitelistOverrides: [], dicionario_pessoal: [],
            toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's' },
            ignoreShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 'i' },
            corrigirTudoShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 's' },
            ativarShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 'a' },
            desativarShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 'd' }
        }, (res) => {
            Object.assign(smConfig, res);
            dicCache = (res.dicionario_pessoal || []).map(w => w.toLowerCase());
            
            const host = window.location.hostname;
            if (listaTemDominio(host, res.userBlacklistOverrides)) smConfig.disabled = true;
            else if (listaTemDominio(host, res.userWhitelistOverrides)) smConfig.disabled = false;
            else if (res.modoWhitelist) smConfig.disabled = !listaTemDominio(host, res.whitelist);
            else smConfig.disabled = !!res.disabled || listaTemDominio(host, res.blacklist);
            
            if (callback) callback();
        });
}

function limparObservadores() {
    smLog('Iniciando limpeza de observers...');
    
    smTimers.forEach(id => clearTimeout(id));
    smTimers = [];
    
    // Limpar todos os observers registrados (BUG 6)
    limparTodosObservadores();
    
    // Limpar WeakSet
    if (processedIframes) processedIframes = new WeakSet();
    
    if (currentFetchController) { 
        currentFetchController.abort(); 
        currentFetchController = null; 
    }
    
    smLog('Observadores limpos com sucesso');
}

window.addEventListener('beforeunload', limparObservadores);
window.addEventListener('pagehide', limparObservadores);
window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        limparObservadores();
        return;
    }

    if (document.visibilityState === 'visible' && isExtensaoAtiva() && document.body) {
        observarShadowDOM();
        observarIframes();
    }
});

setInterval(async () => { 
    const conectado = await verificarConexaoExtensao(); 
    if (!conectado && contextoExtensaoValido) { 
        contextoExtensaoValido = false; 
        smDebug('Extensão parece estar inativa'); 
    } else if (conectado && !contextoExtensaoValido) { 
        contextoExtensaoValido = true; 
        smDebug('Extensão reconectada'); 
    } 
}, 30000);

function iniciar() {
    if (!isExtensaoAtiva()) { 
        setTimeout(iniciar, 2000); 
        return; 
    }
    
    carregarSmConfig(() => {
        observarShadowDOM();
        observarIframes();
        
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace !== 'local') return;
            const campos = ['language','pickyMode','speed','darkMode','blacklist','strictMode','disabled','autoHideBubble','modoConfirmacao','modoLeituraGlobal','modoLeituraSites','modoWhitelist','whitelist','modoFoco','modoAprendizado','userBlacklistOverrides','userWhitelistOverrides','toggleShortcut','ignoreShortcut','corrigirTudoShortcut','ativarShortcut','desativarShortcut'];
            campos.forEach(k => { if (changes[k] !== undefined) smConfig[k] = changes[k].newValue; });
            if (changes.dicionario_pessoal !== undefined) dicCache = (changes.dicionario_pessoal.newValue || []).map(w => w.toLowerCase());
            const host = window.location.hostname;
            if (listaTemDominio(host, smConfig.userBlacklistOverrides)) smConfig.disabled = true;
            else if (listaTemDominio(host, smConfig.userWhitelistOverrides)) smConfig.disabled = false;
            else if (smConfig.modoWhitelist) smConfig.disabled = !listaTemDominio(host, smConfig.whitelist);
            else smConfig.disabled = !!smConfig.disabled || listaTemDominio(host, smConfig.blacklist);
        });
    });
}

iniciar();
