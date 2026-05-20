// =============================================
// SyntaxMentor - popup.js v2.9.0
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
    const btnCorrigirTudo = document.getElementById('btn-corrigir-tudo');
    const btnRevisarPagina = document.getElementById('btn-revisar-pagina');
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
                    console.debug('Erro ao obter aba:', chrome.runtime.lastError.message);
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
                console.debug('Não foi possível enviar mensagem:', chrome.runtime.lastError.message);
            }
        });
    }

    /**
     * Envia ação e fecha o popup após confirmação
     * @param {string} action - Ação a ser executada
     */
    function enviarAcaoParaAba(action) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (chrome.runtime.lastError) {
            mostrarFeedbackPopup('Erro ao comunicar com a página', 'error');
            return;
        }
        
        if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(tabs[0].id, { action: action }, () => {
                if (chrome.runtime.lastError) {
                    console.warn('Erro:', chrome.runtime.lastError.message);
                    mostrarFeedbackPopup('Recarregue a página para usar esta função', 'warning');
                } else {
                    const mensagens = {
                        'corrigirTudo': 'Corrigindo tudo...',
                        'revisarPaginaInteira': 'Revisando página...'
                    };
                    mostrarFeedbackPopup(mensagens[action] || 'Comando enviado!', 'success');
                    setTimeout(() => window.close(), 500);
                }
            });
        } else {
            mostrarFeedbackPopup('Nenhuma página válida encontrada', 'error');
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
        msgContainer.innerHTML = `${cor.icon} ${escapeHtml(mensagem)}`;
        
        // Esconder após 3 segundos
        clearTimeout(msgContainer._timeout);
        msgContainer._timeout = setTimeout(() => {
            msgContainer.style.display = 'none';
        }, 3000);
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
        chrome.storage.local.get(
            ['blacklist', 'disabled', 'modoWhitelist', 'whitelist', 'userBlacklistOverrides'],
            (res) => {
                if (chrome.runtime.lastError) return;
                
                let isActive = true;
                
                // Verificar override do usuário primeiro
                const userOverrides = res.userBlacklistOverrides || [];
                if (userOverrides.includes(currentHost)) {
                    isActive = false;
                } else if (res.modoWhitelist) {
                    isActive = (res.whitelist || []).some(d => currentHost.includes(d));
                } else {
                    const isBlocked = (res.blacklist || []).some(d => currentHost.includes(d));
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
        
        const storageKey = `site_override_${currentHost}`;
        
        if (!ativar) {
            // Desativar: adicionar à blacklist de overrides do usuário
            chrome.storage.local.get(['userBlacklistOverrides'], (res) => {
                if (chrome.runtime.lastError) {
                    mostrarFeedbackTemporario('❌ Erro ao salvar preferência');
                    return;
                }
                
                const overrides = res.userBlacklistOverrides || [];
                if (!overrides.includes(currentHost)) {
                    overrides.push(currentHost);
                    chrome.storage.local.set({ userBlacklistOverrides: overrides }, () => {
                        if (chrome.runtime.lastError) {
                            mostrarFeedbackTemporario('❌ Erro ao salvar preferência');
                            return;
                        }
                        enviarMensagemParaAba('toggleSite', { enabled: false, host: currentHost });
                        atualizarInterfaceAposToggle(false);
                    });
                } else {
                    enviarMensagemParaAba('toggleSite', { enabled: false, host: currentHost });
                    atualizarInterfaceAposToggle(false);
                }
            });
        } else {
            // Ativar: remover da blacklist de overrides
            chrome.storage.local.get(['userBlacklistOverrides'], (res) => {
                if (chrome.runtime.lastError) {
                    mostrarFeedbackTemporario('❌ Erro ao salvar preferência');
                    return;
                }
                
                const overrides = res.userBlacklistOverrides || [];
                const index = overrides.indexOf(currentHost);
                if (index > -1) {
                    overrides.splice(index, 1);
                    chrome.storage.local.set({ userBlacklistOverrides: overrides }, () => {
                        if (chrome.runtime.lastError) {
                            mostrarFeedbackTemporario('❌ Erro ao salvar preferência');
                            return;
                        }
                        enviarMensagemParaAba('toggleSite', { enabled: true, host: currentHost });
                        atualizarInterfaceAposToggle(true);
                    });
                } else {
                    enviarMensagemParaAba('toggleSite', { enabled: true, host: currentHost });
                    atualizarInterfaceAposToggle(true);
                }
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
        chrome.storage.local.get(['dicionario_pessoal'], (res) => {
            if (chrome.runtime.lastError) {
                console.warn('Erro ao carregar dicionário:', chrome.runtime.lastError.message);
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
        chrome.storage.local.get(['darkMode'], (res) => {
            if (chrome.runtime.lastError) return;
            document.body.classList.toggle('dark-mode', res.darkMode);
        });
    }

    /**
     * Renderiza a lista de palavras do dicionário
     */
    function renderizarLista() {
        if (!wordList) return;
        
        wordList.innerHTML = '';
        
        if (currentDictionary.length === 0) {
            wordList.innerHTML = '<li style="color:#9ca3af;text-align:center;padding:15px;font-size:12px;">📭 Nenhuma palavra adicionada</li>';
            return;
        }
        
        currentDictionary.forEach((word, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span style="flex:1;word-break:break-word;">${escapeHtml(word)}</span>
                <button class="btn-remove" data-index="${index}" title="Remover">✕</button>
            `;
            wordList.appendChild(li);
        });
        
        // Adicionar event listeners aos botões de remover
        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.target.getAttribute('data-index'));
                if (idx >= 0 && idx < currentDictionary.length) {
                    const palavraRemovida = currentDictionary[idx];
                    currentDictionary.splice(idx, 1);
                    salvarDicionario();
                    mostrarFeedbackPopup(`"${palavraRemovida}" removido`, 'info');
                }
            });
        });
    }
    
    /**
     * Salva o dicionário no storage
     */
    function salvarDicionario() {
        chrome.storage.local.set({ dicionario_pessoal: currentDictionary }, () => {
            if (chrome.runtime.lastError) return;
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
        
        if (word.length < 2) {
            wordInput.style.borderColor = '#e53e3e';
            setTimeout(() => {
                wordInput.style.borderColor = '';
            }, 1000);
            mostrarFeedbackPopup('A palavra deve ter pelo menos 2 caracteres', 'warning');
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
    
    /**
     * Escapa caracteres HTML para evitar XSS
     * @param {string} texto - Texto a ser escapado
     * @returns {string}
     */
    function escapeHtml(texto) {
        if (!texto) return '';
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }

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
    
    if (btnCorrigirTudo) {
        btnCorrigirTudo.addEventListener('click', () => {
            enviarAcaoParaAba('corrigirTudo');
        });
    }
    
    if (btnRevisarPagina) {
        btnRevisarPagina.addEventListener('click', () => {
            enviarAcaoParaAba('revisarPaginaInteira');
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
        if (changes.blacklist || changes.modoWhitelist || changes.whitelist || changes.userBlacklistOverrides) {
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
                    return;
                }

                const erros = res.erros.slice(0, 5);
                container.style.display = 'block';
                container.innerHTML = `
                    <div style="padding:8px 14px 4px;font-size:11px;font-weight:500;color:#6b7280;text-transform:uppercase;letter-spacing:.04em">
                        ${res.erros.length} erro${res.erros.length > 1 ? 's' : ''} encontrado${res.erros.length > 1 ? 's' : ''}
                    </div>
                    ${erros.map(e => `
                        <div class="sm-erro-item" data-original="${escapeHtml(e.original)}" data-sugestao="${escapeHtml(e.sugestao)}" style="display:flex;align-items:center;justify-content:space-between;padding:6px 14px;gap:8px;cursor:pointer;border-top:0.5px solid rgba(0,0,0,.06)">
                            <div style="display:flex;align-items:center;gap:6px;min-width:0">
                                <span style="color:#e53e3e;text-decoration:line-through;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px">${escapeHtml(e.original)}</span>
                                <span style="color:#9ca3af;font-size:12px">→</span>
                                <span style="color:#28a745;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px">${escapeHtml(e.sugestao)}</span>
                            </div>
                            <button class="sm-btn-aplicar" data-original="${escapeHtml(e.original)}" data-sugestao="${escapeHtml(e.sugestao)}" style="flex-shrink:0;font-size:11px;padding:3px 8px;border-radius:4px;border:0.5px solid #6f42c1;background:transparent;color:#6f42c1;cursor:pointer;font-weight:500">Aplicar</button>
                        </div>
                    `).join('')}
                    ${res.erros.length > 5 ? `<div style="padding:4px 14px 8px;font-size:11px;color:#9ca3af">+${res.erros.length - 5} mais no painel</div>` : ''}
                `;

                container.querySelectorAll('.sm-btn-aplicar').forEach(btn => {
                    btn.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        const original = btn.dataset.original;
                        const sugestao = btn.dataset.sugestao;
                        chrome.tabs.sendMessage(tab.id, { action: 'aplicarCorrecaoPopup', original, sugestao }, () => {
                            btn.closest('.sm-erro-item').style.opacity = '0.4';
                            btn.textContent = '✓';
                            btn.disabled = true;
                            setTimeout(carregarErrosAtivos, 800);
                        });
                    });
                });
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
    // Link para documentação da API
    const linkApi = document.getElementById('link-api');
    if (linkApi) {
        linkApi.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: chrome.runtime.getURL('api-docs.html') });
        });
    }
});