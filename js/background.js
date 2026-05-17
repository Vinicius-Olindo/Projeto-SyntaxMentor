// =============================================
// SyntaxMentor - background.js v2.7.1
// =============================================

let ultimaRequisicao = null;
let ultimoTimeout = null;

// =============================================
// UTILITÁRIOS
// =============================================

/**
 * Verifica se um host está bloqueado com base nas configurações atuais
 * @param {string} host - Hostname da aba (ex: 'www.google.com')
 * @param {Object} res - Objeto com as chaves do storage: blacklist, modoWhitelist, whitelist, userBlacklistOverrides, disabled
 * @returns {boolean}
 */
function isSiteBloqueado(host, res) {
    const userOverrides = res.userBlacklistOverrides || [];
    if (userOverrides.includes(host)) return true;
    if (res.modoWhitelist) return !(res.whitelist || []).some(d => host.includes(d));
    return (res.blacklist || []).some(d => host.includes(d)) || !!res.disabled;
}

// =============================================
// INSTALAÇÃO E INICIALIZAÇÃO
// =============================================

chrome.runtime.onInstalled.addListener((details) => {
    console.log("✅ SyntaxMentor Elite v2.7.1 instalado!");
    
    if (details.reason === 'install') {
        // Salva data de instalação para badge NEW
        chrome.storage.local.set({ dataInstalacao: Date.now() });
        
        // Abre página de boas-vindas
        chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
        
        // Mostra badge "NEW" no ícone
        chrome.action.setBadgeText({ text: 'NEW' });
        chrome.action.setBadgeBackgroundColor({ color: '#6f42c1' });
        chrome.action.setTitle({ title: 'SyntaxMentor: Novo! Clique para configurar' });
        
        // Remove o badge NEW após 7 dias
        setTimeout(() => {
            chrome.storage.local.get({ dataInstalacao: 0 }, (res) => {
                const dias = (Date.now() - res.dataInstalacao) / (1000 * 60 * 60 * 24);
                if (dias >= 7) {
                    chrome.action.setBadgeText({ text: '' });
                }
            });
        }, 7 * 24 * 60 * 60 * 1000);
    }
    
    if (details.reason === 'update') {
        console.log("📦 SyntaxMentor atualizado para versão 2.7.1");
    }
    
    criarMenuContexto();
});

chrome.runtime.onStartup.addListener(() => {
    // Verifica se ainda está no período NEW
    chrome.storage.local.get({ dataInstalacao: 0 }, (res) => {
        if (res.dataInstalacao) {
            const dias = (Date.now() - res.dataInstalacao) / (1000 * 60 * 60 * 24);
            if (dias < 7) {
                chrome.action.setBadgeText({ text: 'NEW' });
                chrome.action.setBadgeBackgroundColor({ color: '#6f42c1' });
            }
        }
    });
    criarMenuContexto();
});

// =============================================
// BADGE DE NOTIFICAÇÃO
// =============================================

/**
 * Atualiza o badge com o número de erros
 * @param {number} totalErros - Total de erros encontrados
 * @param {number} tabId - ID da aba
 */
function atualizarBadge(totalErros, tabId) {
    if (!tabId) return;
    
    try {
        if (totalErros > 0) {
            chrome.action.setBadgeText({ 
                text: totalErros > 999 ? '999+' : String(totalErros),
                tabId: tabId 
            }).catch(() => {});
            chrome.action.setBadgeBackgroundColor({ 
                color: '#e53e3e',
                tabId: tabId 
            }).catch(() => {});
        } else {
            chrome.action.setBadgeText({ text: '', tabId: tabId }).catch(() => {});
        }
    } catch (e) {
        console.debug('Erro ao atualizar badge:', e);
    }
}

/**
 * Reseta o badge e tooltip
 * @param {number} tabId - ID da aba
 */
function resetarBadgeETooltip(tabId) {
    try {
        if (tabId) {
            chrome.action.setBadgeText({ text: '', tabId: tabId }).catch(() => {});
        } else {
            chrome.action.setBadgeText({ text: '' }).catch(() => {});
        }
    } catch (e) {
        console.debug('Erro ao resetar badge:', e);
    }
}

// =============================================
// ÍCONE MODO DESATIVADO
// =============================================

/**
 * Define o ícone como desativado (OFF)
 * @param {number} tabId - ID da aba
 */
function setIconeDesativado(tabId) {
    try {
        if (tabId) {
            chrome.action.setBadgeText({ text: 'OFF', tabId: tabId }).catch(() => {});
            chrome.action.setBadgeBackgroundColor({ color: '#6b7280', tabId: tabId }).catch(() => {});
        }
    } catch (e) {
        console.debug('Erro ao definir ícone desativado:', e);
    }
}

/**
 * Verifica e atualiza o ícone para uma aba específica
 * @param {number} tabId - ID da aba
 */
function verificarIconeParaTab(tabId) {
    chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab || !tab.url || tab.url.startsWith('chrome://')) {
            setIconeDesativado(tabId);
            return;
        }
        
        chrome.storage.local.get(
            ['blacklist', 'disabled', 'modoWhitelist', 'whitelist', 'userBlacklistOverrides'],
            (res) => {
                if (chrome.runtime.lastError) {
                    resetarBadgeETooltip(tabId);
                    return;
                }
                
                try {
                    const host = new URL(tab.url).hostname;
                    
                    if (isSiteBloqueado(host, res)) {
                        setIconeDesativado(tabId);
                    } else {
                        resetarBadgeETooltip(tabId);
                    }
                } catch (e) {
                    resetarBadgeETooltip(tabId);
                }
            }
        );
    });
}

// =============================================
// EVENTOS DE ABA
// =============================================

chrome.tabs.onActivated.addListener((activeInfo) => {
    verificarIconeParaTab(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        verificarIconeParaTab(tabId);
        resetarBadgeETooltip(tabId);
    }
});

// =============================================
// MENU DE CONTEXTO (Botão Direito)
// =============================================

/**
 * Cria o menu de contexto da extensão
 */
function criarMenuContexto() {
    chrome.contextMenus.removeAll(() => {
        if (chrome.runtime.lastError) {
            console.debug('Erro ao remover menus:', chrome.runtime.lastError.message);
        }
        
        chrome.contextMenus.create({
            id: 'revisar-selecao',
            title: '🔍 SyntaxMentor: Revisar seleção',
            contexts: ['selection']
        });
        
        chrome.contextMenus.create({
            id: 'ignorar-palavra',
            title: '📖 Adicionar ao Dicionário',
            contexts: ['selection']
        });
        
        chrome.contextMenus.create({
            id: 'ignorar-sessao',
            title: '↩ Ignorar nesta sessão',
            contexts: ['selection']
        });
    });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab.id) return;
    
    if (info.menuItemId === 'revisar-selecao' && info.selectionText) {
        chrome.tabs.sendMessage(tab.id, {
            action: 'revisarSelecao',
            texto: info.selectionText.trim()
        }).catch(() => {});
    }
    
    if (info.menuItemId === 'ignorar-palavra' && info.selectionText) {
        const palavra = info.selectionText.trim().split(/\s+/)[0];
        chrome.storage.local.get(['dicionario_pessoal'], (res) => {
            if (chrome.runtime.lastError) return;
            
            const dic = res.dicionario_pessoal || [];
            if (!dic.includes(palavra)) {
                dic.push(palavra);
                chrome.storage.local.set({ dicionario_pessoal: dic });
            }
        });
    }
    
    if (info.menuItemId === 'ignorar-sessao' && info.selectionText) {
        const palavra = info.selectionText.trim().split(/\s+/)[0];
        chrome.tabs.sendMessage(tab.id, {
            action: 'ignorarTemporariamente',
            palavra: palavra
        }).catch(() => {});
    }
});

// =============================================
// DETECÇÃO DE IDIOMA
// =============================================

/**
 * Detecta o idioma de um texto
 * @param {string} texto - Texto para análise
 * @returns {Promise<string|null>}
 */
function detectarIdioma(texto) {
    return new Promise((resolve) => {
        if (!chrome.i18n || !chrome.i18n.detectLanguage) {
            resolve(null);
            return;
        }
        
        chrome.i18n.detectLanguage(texto, (result) => {
            if (chrome.runtime.lastError || !result || !result.languages || result.languages.length === 0) {
                resolve(null);
                return;
            }
            
            const mapaIdiomas = {
                'pt': 'pt-BR', 'pt-BR': 'pt-BR', 'pt-PT': 'pt-BR',
                'en': 'en-US', 'en-US': 'en-US', 'en-GB': 'en-US',
                'es': 'es', 'fr': 'fr', 'de': 'de', 'it': 'it'
            };
            
            resolve(mapaIdiomas[result.languages[0].language] || null);
        });
    });
}

// =============================================
// EXPORTAR DADOS
// =============================================

/**
 * Exporta todos os dados da extensão
 * @returns {Promise<Object>}
 */
function exportarDados() {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, (res) => {
            if (chrome.runtime.lastError) {
                resolve({ success: false, error: chrome.runtime.lastError.message });
                return;
            }
            
            // Remove dados sensíveis
            delete res.apiKey;
            delete res.dataInstalacao;
            
            const backup = {
                versao: '2.7.1',
                data: new Date().toISOString(),
                dados: res
            };
            resolve(backup);
        });
    });
}

// =============================================
// COMUNICAÇÃO COM CONTENT.JS
// =============================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // 🆕 PING para verificar se a extensão está viva
    if (request.action === 'ping') {
        sendResponse({ success: true, status: 'alive', timestamp: Date.now() });
        return true;
    }
    
    // Atualizar badge
    if (request.action === 'updateBadge') {
        atualizarBadge(request.totalErros, sender.tab?.id);
        sendResponse({ success: true });
        return false;
    }
    
    // Resetar badge
    if (request.action === 'resetBadge') {
        resetarBadgeETooltip(sender.tab?.id);
        sendResponse({ success: true });
        return false;
    }
    
    // Verificar blacklist
    if (request.action === 'checkBlacklist') {
        chrome.storage.local.get(
            ['blacklist', 'modoWhitelist', 'whitelist', 'userBlacklistOverrides'],
            (res) => {
                if (chrome.runtime.lastError) {
                    sendResponse({ blocked: false });
                    return;
                }
                
                const host = request.host;
                sendResponse({ blocked: isSiteBloqueado(host, res) });
            }
        );
        return true;
    }
    
    // Exportar dados
    if (request.action === 'exportData') {
        exportarDados().then(backup => {
            sendResponse({ success: true, data: backup });
        }).catch(() => {
            sendResponse({ success: false, error: 'Erro ao exportar' });
        });
        return true;
    }
    
    // Detectar idioma
    if (request.action === 'detectLanguage') {
        detectarIdioma(request.text).then(idioma => {
            sendResponse({ success: true, language: idioma });
        });
        return true;
    }
    
    // Toggle site
    if (request.action === 'toggleSite') {
        if (sender.tab) {
            // Atualizar o ícone imediatamente
            verificarIconeParaTab(sender.tab.id);
            
            // Enviar mensagem de volta para o content script atualizar seu estado
            chrome.tabs.sendMessage(sender.tab.id, { 
                action: 'siteToggled', 
                enabled: request.enabled,
                host: request.host 
            }).catch(() => {});
        }
        sendResponse({ success: true });
        return true;
    }
    
    // Toggle site global (usado pelos atalhos de teclado)
    if (request.action === 'toggleSiteGlobal') {
        chrome.storage.local.get(['userBlacklistOverrides'], (res) => {
            const overrides = res.userBlacklistOverrides || [];
            const host = request.host;
            
            if (request.enabled) {
                // Ativar: remover da lista
                const index = overrides.indexOf(host);
                if (index > -1) {
                    overrides.splice(index, 1);
                    chrome.storage.local.set({ userBlacklistOverrides: overrides });
                }
            } else {
                // Desativar: adicionar à lista
                if (!overrides.includes(host)) {
                    overrides.push(host);
                    chrome.storage.local.set({ userBlacklistOverrides: overrides });
                }
            }
            
            // Atualizar ícone da aba atual
            if (sender.tab) {
                verificarIconeParaTab(sender.tab.id);
            }
        });
        sendResponse({ success: true });
        return true;
    }
    
    // Verificação de gramática (API do LanguageTool)
    if (request.action === 'checkGrammar') {
        const fetchUrl = request.apiUrl && request.apiUrl.trim() !== '' 
            ? request.apiUrl 
            : 'https://api.languagetool.org/v2/check';
        
        const params = { 
            'text': request.text, 
            'language': request.language 
        };
        
        if (request.pickyMode) params['level'] = 'picky';

        const headers = { 
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
        };
        
        // Adiciona API Key se existir
        if (request.apiKey && request.apiKey.trim() !== '') {
            headers['Authorization'] = `Bearer ${request.apiKey.trim()}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        fetch(fetchUrl, {
            method: 'POST',
            headers: headers,
            body: new URLSearchParams(params),
            signal: controller.signal
        })
            .then(response => {
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
                return response.json();
            })
            .then(data => {
                try {
                    sendResponse({ success: true, data: data });
                } catch (e) {
                    console.debug('Erro ao enviar resposta:', e);
                }
            })
            .catch(err => {
                clearTimeout(timeoutId);
                let errorMessage = err.message;
                
                // Melhorar mensagem de erro para timeout
                if (err.name === 'AbortError') {
                    errorMessage = 'Timeout: O servidor demorou muito para responder';
                } else if (err.message.includes('Failed to fetch')) {
                    errorMessage = 'Erro de conexão: Verifique sua internet';
                }
                
                try {
                    sendResponse({ success: false, error: errorMessage });
                } catch (e) {
                    console.debug('Erro ao enviar resposta de erro:', e);
                }
            });

        return true;
    }
    
    return false;
});

// =============================================
// STORAGE CHANGE LISTENER
// =============================================

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') return;
    
    // Atualiza ícone quando blacklist, whitelist ou overrides mudar
    if (changes.blacklist || changes.disabled || changes.modoWhitelist || changes.whitelist || changes.userBlacklistOverrides) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (chrome.runtime.lastError) return;
            if (tabs[0]) verificarIconeParaTab(tabs[0].id);
        });
    }
});

// =============================================
// ATALHOS PARA ATIVAR/DESATIVAR POR SITE
// =============================================

chrome.commands.onCommand.addListener((command) => {
    if (command === 'ativar-extensao') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id && tabs[0].url && !tabs[0].url.startsWith('chrome://')) {
                try {
                    const host = new URL(tabs[0].url).hostname;
                    
                    // Remover da blacklist de overrides
                    chrome.storage.local.get(['userBlacklistOverrides'], (res) => {
                        const overrides = res.userBlacklistOverrides || [];
                        const index = overrides.indexOf(host);
                        if (index > -1) {
                            overrides.splice(index, 1);
                            chrome.storage.local.set({ userBlacklistOverrides: overrides });
                        }
                        
                        // Enviar mensagem para content script
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: 'toggleSite',
                            enabled: true,
                            host: host
                        }).catch(() => {});
                        
                        // Atualizar ícone
                        verificarIconeParaTab(tabs[0].id);
                        
                        // Notificar usuário
                        chrome.action.setBadgeText({ text: 'ON', tabId: tabs[0].id });
                        chrome.action.setBadgeBackgroundColor({ color: '#28a745', tabId: tabs[0].id });
                        setTimeout(() => {
                            chrome.action.setBadgeText({ text: '', tabId: tabs[0].id });
                        }, 2000);
                    });
                } catch (e) {
                    console.debug('Erro ao ativar extensão:', e);
                }
            }
        });
    }
    
    if (command === 'desativar-extensao') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id && tabs[0].url && !tabs[0].url.startsWith('chrome://')) {
                try {
                    const host = new URL(tabs[0].url).hostname;
                    
                    // Adicionar à blacklist de overrides
                    chrome.storage.local.get(['userBlacklistOverrides'], (res) => {
                        const overrides = res.userBlacklistOverrides || [];
                        if (!overrides.includes(host)) {
                            overrides.push(host);
                            chrome.storage.local.set({ userBlacklistOverrides: overrides });
                        }
                        
                        // Enviar mensagem para content script
                        chrome.tabs.sendMessage(tabs[0].id, {
                            action: 'toggleSite',
                            enabled: false,
                            host: host
                        }).catch(() => {});
                        
                        // Atualizar ícone
                        verificarIconeParaTab(tabs[0].id);
                        
                        // Notificar usuário
                        chrome.action.setBadgeText({ text: 'OFF', tabId: tabs[0].id });
                        chrome.action.setBadgeBackgroundColor({ color: '#6b7280', tabId: tabs[0].id });
                        setTimeout(() => {
                            chrome.action.setBadgeText({ text: '', tabId: tabs[0].id });
                        }, 2000);
                    });
                } catch (e) {
                    console.debug('Erro ao desativar extensão:', e);
                }
            }
        });
    }
});

console.log("🚀 SyntaxMentor Background Service Worker v2.7.1 iniciado!");