// =============================================
// SyntaxMentor - popup.js v2.8.1
// Live Sync + Corrigir Tudo + Revisar Página + Toggle Site
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    // =============================================
    // ELEMENTOS DOM
    // =============================================
    const wordInput = document.getElementById('word-input');
    const addBtn = document.getElementById('add-btn');
    const wordList = document.getElementById('word-list');
    const linkOpcoes = document.getElementById('link-opcoes');
    const toggleSiteActive = document.getElementById('toggle-site-active');
    const currentSiteLabel = document.getElementById('current-site-label');
    const siteStatusDot = document.getElementById('site-status-dot');

    // =============================================
    // VARIÁVEIS DE ESTADO
    // =============================================
    let currentDictionary = [];
    let currentTabId = null;
    let currentHost = null;
    let isExtensionActive = true;

    function isSmDebugAtivo() {
        try {
            return localStorage.getItem('sm_debug') === 'true';
        } catch (e) {
            return false;
        }
    }

    const smLog = (...args) => { if (isSmDebugAtivo()) console.log('[SM]', ...args); };
    const smDebug = (...args) => { if (isSmDebugAtivo()) console.debug('[SM]', ...args); };
    const smWarn = (...args) => { if (isSmDebugAtivo()) console.warn('[SM]', ...args); };
    const smError = (...args) => { if (isSmDebugAtivo()) console.error('[SM]', ...args); };

    function normalizarDominio(valor) {
        return String(valor || '')
            .trim()
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .split('/')[0];
    }

    function hostCorrespondeDominio(host, dominio) {
        const hostNormalizado = normalizarDominio(host);
        const dominioNormalizado = normalizarDominio(dominio);
        return !!dominioNormalizado && (
            hostNormalizado === dominioNormalizado ||
            hostNormalizado.endsWith(`.${dominioNormalizado}`)
        );
    }

    function listaTemDominio(host, lista) {
        return (lista || []).some(d => hostCorrespondeDominio(host, d));
    }

    function criarElemento(tag, opcoes = {}, filhos = []) {
        return smCriarElemento(tag, opcoes, filhos);
    }

    function isValidDictionaryWord(palavra) {
        const valor = String(palavra || '').trim();
        if (valor.length < 2 || valor.length > 60) return false;
        return /^[\p{L}\p{M}\p{N}'’.+#_-]+$/u.test(valor);
    }

    // =============================================
    // FUNÇÕES AUXILIARES - TABS
    // =============================================
    
    /**
     * Obtém a aba ativa atual
     * @returns {Promise<Object|null>}
     */
    function getCurrentTab() {
        return new Promise((resolve) => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError) {
                    smDebug('Erro ao obter aba:', chrome.runtime.lastError.message);
                    resolve(null);
                    return;
                }
                
                if (tabs[0] && tabs[0].id && tabs[0].url && !tabs[0].url.startsWith('chrome://')) {
                    resolve(tabs[0]);
                } else {
                    resolve(null);
                }
            });
        });
    }

    /**
     * Envia mensagem para a content script da aba atual
     * @param {string} action - Ação a ser executada
     * @param {Object} data - Dados adicionais
     */
    function enviarMensagemParaAba(action, data = {}) {
        if (!currentTabId) return;
        
        chrome.tabs.sendMessage(currentTabId, { action, ...data }, () => {
            if (chrome.runtime.lastError) {
                // A extensão pode não estar injetada nesta página
                smDebug('Não foi possível enviar mensagem:', chrome.runtime.lastError.message);
            }
        });
    }

    // =============================================
    // FUNÇÕES DE FEEDBACK VISUAL
    // =============================================
    
    /**
     * Mostra feedback temporário no popup (acima dos links)
     * @param {string} mensagem - Mensagem a ser exibida
     * @param {string} tipo - Tipo da mensagem (success, error, info)
     */
    function mostrarFeedbackPopup(mensagem, tipo) {
        const msgContainer = document.getElementById('popup-mensagem');
        if (!msgContainer) return;
        
        // Cores conforme o tipo
        const cores = {
            success: { bg: '#d1fae5', text: '#065f46', icon: '✅' },
            error: { bg: '#fee2e2', text: '#991b1b', icon: '❌' },
            info: { bg: '#e0e7ff', text: '#3730a3', icon: 'ℹ️' },
            warning: { bg: '#fef3c7', text: '#92400e', icon: '⚠️' }
        };
        
        const cor = cores[tipo] || cores.info;
        
        msgContainer.style.display = 'block';
        msgContainer.style.backgroundColor = cor.bg;
        msgContainer.style.color = cor.text;
        msgContainer.textContent = `${cor.icon} ${mensagem}`;
        
        // Esconder após 3 segundos
        clearTimeout(msgContainer._timeout);
        msgContainer._timeout = setTimeout(() => {
            msgContainer.style.display = 'none';
        }, 3000);
    }

    function mostrarFeedbackTemporario(mensagem, tipo = 'info') {
        mostrarFeedbackPopup(mensagem, tipo);
    }

    // =============================================
    // FUNÇÕES DE STATUS DO SITE
    // =============================================
    
    /**
     * Carrega o status atual da extensão para o site atual
     */
    async function carregarStatusDoSite() {
        const tab = await getCurrentTab();
        
        if (!tab || !tab.id) {
            if (currentSiteLabel) currentSiteLabel.textContent = 'Página inválida';
            if (toggleSiteActive) toggleSiteActive.disabled = true;
            return;
        }

        currentTabId = tab.id;
        
        try {
            currentHost = new URL(tab.url).hostname;
            if (currentSiteLabel) currentSiteLabel.textContent = currentHost;
        } catch (e) {
            if (currentSiteLabel) currentSiteLabel.textContent = 'site desconhecido';
            currentHost = null;
        }

        if (!currentHost) {
            if (toggleSiteActive) toggleSiteActive.disabled = true;
            return;
        }

        // Verificar status atual da extensão para este site
        smStorageLocalGet(
            ['blacklist', 'disabled', 'modoWhitelist', 'whitelist', 'userBlacklistOverrides', 'userWhitelistOverrides'],
            (res, erro) => {
                if (erro) return;
                
                let isActive = true;
                
                // Verificar overrides do usuario primeiro
                if (listaTemDominio(currentHost, res.userBlacklistOverrides)) {
                    isActive = false;
                } else if (listaTemDominio(currentHost, res.userWhitelistOverrides)) {
                    isActive = true;
                } else if (res.modoWhitelist) {
                    isActive = listaTemDominio(currentHost, res.whitelist);
                } else {
                    const isBlocked = listaTemDominio(currentHost, res.blacklist);
                    isActive = !isBlocked && !res.disabled;
                }
                
                isExtensionActive = isActive;
                
                if (toggleSiteActive) {
                    toggleSiteActive.checked = isActive;
                    toggleSiteActive.disabled = false;
                }
                
                // Atualizar indicador visual
                if (siteStatusDot) {
                    siteStatusDot.className = isActive ? 'status-dot active' : 'status-dot';
                }
                
                // Atualizar tooltip
                if (toggleSiteActive) {
                    toggleSiteActive.title = isActive ? 'Desativar neste site' : 'Ativar neste site';
                }
            }
        );
    }

    /**
     * Alterna o estado da extensão no site atual
     * @param {boolean} ativar - true para ativar, false para desativar
     */
    async function alternarEstadoSite(ativar) {
        if (!currentTabId || !currentHost) {
            mostrarFeedbackTemporario('⚠️ Não foi possível identificar o site atual');
            return;
        }
        if (!ativar) {
            // Desativar: adicionar à blacklist de overrides do usuário
            smStorageLocalGet(['userBlacklistOverrides', 'userWhitelistOverrides'], (res, erro) => {
                if (erro) {
                    mostrarFeedbackTemporario('❌ Erro ao salvar preferência');
                    return;
                }
                
                const overrides = res.userBlacklistOverrides || [];
                const enabledOverrides = res.userWhitelistOverrides || [];
                const enabledIndex = enabledOverrides.indexOf(currentHost);
                if (enabledIndex > -1) enabledOverrides.splice(enabledIndex, 1);
                if (!overrides.includes(currentHost)) {
                    overrides.push(currentHost);
                    smStorageLocalSet({
                        userBlacklistOverrides: overrides,
                        userWhitelistOverrides: enabledOverrides
                    }, (erroSalvar) => {
                        if (erroSalvar) {
                            mostrarFeedbackTemporario('❌ Erro ao salvar preferência');
                            return;
                        }
                        enviarMensagemParaAba('toggleSite', { enabled: false, host: currentHost });
                        atualizarInterfaceAposToggle(false);
                    });
                } else {
                    smStorageLocalSet({ userWhitelistOverrides: enabledOverrides }, () => {
                        enviarMensagemParaAba('toggleSite', { enabled: false, host: currentHost });
                        atualizarInterfaceAposToggle(false);
                    });
                }
            });
        } else {
            // Ativar: remover da blacklist de overrides
            smStorageLocalGet(['userBlacklistOverrides', 'userWhitelistOverrides'], (res, erro) => {
                if (erro) {
                    mostrarFeedbackTemporario('❌ Erro ao salvar preferência');
                    return;
                }
                
                const overrides = res.userBlacklistOverrides || [];
                const enabledOverrides = res.userWhitelistOverrides || [];
                const index = overrides.indexOf(currentHost);
                if (index > -1) {
                    overrides.splice(index, 1);
                }
                if (!enabledOverrides.includes(currentHost)) enabledOverrides.push(currentHost);
                smStorageLocalSet({
                    userBlacklistOverrides: overrides,
                    userWhitelistOverrides: enabledOverrides
                }, (erroSalvar) => {
                        if (erroSalvar) {
                            mostrarFeedbackTemporario('❌ Erro ao salvar preferência');
                            return;
                        }
                        enviarMensagemParaAba('toggleSite', { enabled: true, host: currentHost });
                        atualizarInterfaceAposToggle(true);
                    });
            });
        }
    }
    
    /**
     * Atualiza a interface após alternar o estado do site
     * @param {boolean} ativar - Estado atual
     */
    function atualizarInterfaceAposToggle(ativar) {
    isExtensionActive = ativar;
    
    if (toggleSiteActive) {
        toggleSiteActive.checked = ativar;
        toggleSiteActive.title = ativar ? 'Desativar neste site' : 'Ativar neste site';
    }
    
    if (siteStatusDot) {
        siteStatusDot.className = ativar ? 'status-dot active' : 'status-dot';
    }
    
    const mensagem = ativar ? 'SyntaxMentor ativado neste site' : ' SyntaxMentor desativado neste site';
    mostrarFeedbackPopup(mensagem, ativar ? 'success' : 'warning');
}

    // =============================================
    // FUNÇÕES DO DICIONÁRIO
    // =============================================
    
    /**
     * Carrega o dicionário pessoal do storage
     */
    function carregarDicionario() {
        smStorageLocalGet(['dicionario_pessoal'], (res, erro) => {
            if (erro) {
                smWarn('Erro ao carregar dicionário:', erro.message);
                currentDictionary = [];
            } else {
                currentDictionary = res.dicionario_pessoal || [];
                if (!Array.isArray(currentDictionary)) currentDictionary = [];
            }
            renderizarLista();
        });
    }
    
    /**
     * Carrega o tema (dark mode) do storage
     */
    function carregarTema() {
        smStorageLocalGet(['darkMode'], (res, erro) => {
            if (erro) return;
            document.body.classList.toggle('dark-mode', res.darkMode);
        });
    }

    /**
     * Renderiza a lista de palavras do dicionário
     */
    function renderizarLista() {
        if (!wordList) return;

        wordList.replaceChildren();

        if (currentDictionary.length === 0) {
            wordList.appendChild(criarElemento('li', {
                textContent: SM_TEXTOS.popup.dicionarioVazio,
                style: 'color:#9ca3af;text-align:center;padding:15px;font-size:12px;'
            }));
            return;
        }

        currentDictionary.forEach((word, index) => {
            const span = criarElemento('span', {
                textContent: word,
                style: 'flex:1;word-break:break-word;'
            });
            const remover = criarElemento('button', {
                className: 'btn-remove',
                textContent: 'x',
                title: 'Remover',
                dataset: { index }
            });
            wordList.appendChild(criarElemento('li', {}, [span, remover]));
        });

        wordList.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.target.getAttribute('data-index'));
                if (idx >= 0 && idx < currentDictionary.length) {
                    const palavraRemovida = currentDictionary[idx];
                    currentDictionary.splice(idx, 1);
                    salvarDicionario();
                    mostrarFeedbackTemporario('"' + palavraRemovida + '" removido');
                }
            });
        });
    }

    /**
     * Salva o dicionário no storage
     */
    function salvarDicionario() {
        smStorageLocalSet({ dicionario_pessoal: currentDictionary }, (erro) => {
            if (erro) return;
            renderizarLista();
            if (wordInput) wordInput.focus();
        });
    }

    /**
     * Adiciona uma nova palavra ao dicionário
     */
    function adicionarPalavra() {
        if (!wordInput) return;
        
        const word = wordInput.value.trim().toLowerCase();
        
        if (!word) {
            wordInput.value = '';
            return;
        }
        
        if (!isValidDictionaryWord(word)) {
            wordInput.style.borderColor = '#e53e3e';
            setTimeout(() => {
                wordInput.style.borderColor = '';
            }, 1000);
            mostrarFeedbackPopup('Informe uma palavra válida', 'warning');
            return;
        }
        
        if (!currentDictionary.includes(word)) {
            currentDictionary.unshift(word);
            wordInput.value = '';
            salvarDicionario();
            mostrarFeedbackPopup(`"${word}" adicionado ao dicionário`, 'success');
        } else {
            wordInput.value = '';
            wordInput.style.borderColor = '#f59e0b';
            setTimeout(() => {
                wordInput.style.borderColor = '';
            }, 1000);
            mostrarFeedbackPopup(`"${word}" já está no dicionário`, 'warning');
        }
    }

    // =============================================
    // UTILITÁRIOS
    // =============================================
    
    // =============================================
    // EVENT LISTENERS
    // =============================================
    
    if (addBtn) {
        addBtn.addEventListener('click', adicionarPalavra);
    }
    
    if (wordInput) {
        wordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                adicionarPalavra();
            }
        });
    }
    
    if (toggleSiteActive) {
        toggleSiteActive.addEventListener('change', (e) => {
            alternarEstadoSite(e.target.checked);
        });
    }
    
    if (linkOpcoes) {
        linkOpcoes.addEventListener('click', (e) => {
            e.preventDefault();
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                window.open(chrome.runtime.getURL('options.html'));
            }
        });
    }

    // =============================================
    // STORAGE LISTENERS
    // =============================================
    
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'local') return;
        
        if (changes.dicionario_pessoal) {
            currentDictionary = changes.dicionario_pessoal.newValue || [];
            if (!Array.isArray(currentDictionary)) currentDictionary = [];
            renderizarLista();
        }
        
        if (changes.darkMode) {
            document.body.classList.toggle('dark-mode', changes.darkMode.newValue);
        }
        
        // Se blacklist/whitelist/overrides mudar, recarregar status do site
        if (changes.blacklist || changes.modoWhitelist || changes.whitelist || changes.userBlacklistOverrides || changes.userWhitelistOverrides) {
            carregarStatusDoSite();
        }
    });

    // =============================================
    // INICIALIZAÇÃO
    // =============================================
    
    carregarTema();
    carregarDicionario();
    carregarStatusDoSite();
    carregarErrosAtivos();

    function renderizarPreviewErros(container, erros, total, tab) {
        container.replaceChildren();

        container.appendChild(criarElemento('div', {
            textContent: `${total} erro${total > 1 ? 's' : ''} encontrado${total > 1 ? 's' : ''}`,
            style: 'padding:8px 14px 4px;font-size:11px;font-weight:500;color:#6b7280;text-transform:uppercase;letter-spacing:.04em'
        }));

        erros.forEach(erro => {
            const original = criarElemento('span', {
                textContent: erro.original,
                style: 'color:#e53e3e;text-decoration:line-through;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px'
            });
            const seta = criarElemento('span', {
                textContent: '->',
                style: 'color:#9ca3af;font-size:12px'
            });
            const sugestao = criarElemento('span', {
                textContent: erro.sugestao,
                style: 'color:#28a745;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px'
            });
            const textos = criarElemento('div', {
                style: 'display:flex;align-items:center;gap:6px;min-width:0'
            }, [original, seta, sugestao]);
            const aplicar = criarElemento('button', {
                className: 'sm-btn-aplicar',
                textContent: 'Aplicar',
                dataset: { original: erro.original, sugestao: erro.sugestao, offset: erro.offset, length: erro.length },
                style: 'flex-shrink:0;font-size:11px;padding:3px 8px;border-radius:4px;border:0.5px solid #6f42c1;background:transparent;color:#6f42c1;cursor:pointer;font-weight:500'
            });
            const item = criarElemento('div', {
                className: 'sm-erro-item',
                dataset: { original: erro.original, sugestao: erro.sugestao, offset: erro.offset, length: erro.length },
                style: 'display:flex;align-items:center;justify-content:space-between;padding:6px 14px;gap:8px;cursor:pointer;border-top:0.5px solid rgba(0,0,0,.06)'
            }, [textos, aplicar]);

            aplicar.addEventListener('click', (ev) => {
                ev.stopPropagation();
                chrome.tabs.sendMessage(tab.id, {
                    action: 'aplicarCorrecaoPopup',
                    original: aplicar.dataset.original,
                    sugestao: aplicar.dataset.sugestao,
                    ocorrencia: {
                        offset: Number(aplicar.dataset.offset),
                        length: Number(aplicar.dataset.length)
                    }
                }, () => {
                    item.style.opacity = '0.4';
                    aplicar.textContent = 'ok';
                    aplicar.disabled = true;
                    setTimeout(carregarErrosAtivos, 800);
                });
            });

            container.appendChild(item);
        });

        if (total > erros.length) {
            container.appendChild(criarElemento('div', {
                textContent: `+${total - erros.length} mais no painel`,
                style: 'padding:4px 14px 8px;font-size:11px;color:#9ca3af'
            }));
        }
    }

    /**
     * Carrega os erros ativos do content.js e exibe preview no popup
     */
    function carregarErrosAtivos() {
        const container = document.getElementById('popup-erros-preview');
        if (!container) return;

        getCurrentTab().then(tab => {
            if (!tab) return;
            chrome.tabs.sendMessage(tab.id, { action: 'getErrosAtivos' }, (res) => {
                if (chrome.runtime.lastError || !res || !res.erros || res.erros.length === 0) {
                    container.style.display = 'none';
                    container.replaceChildren();
                    return;
                }

                const erros = res.erros.slice(0, 5);
                container.style.display = 'block';
                renderizarPreviewErros(container, erros, res.erros.length, tab);
            });
        });
    }
    
    // Adicionar estilo de animação se não existir
    if (!document.querySelector('#sm-popup-animation-style')) {
        const style = document.createElement('style');
        style.id = 'sm-popup-animation-style';
        style.textContent = `
            @keyframes sm-popup-fadeout {
                0% { opacity: 1; transform: translateX(-50%) translateY(0); }
                70% { opacity: 1; transform: translateX(-50%) translateY(0); }
                100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            }
        `;
        document.head.appendChild(style);
    }
});
