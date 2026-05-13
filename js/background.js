// =============================================
// SyntaxMentor - 2.6.0 - (Welcome Page + Badge NEW)
// =============================================

let ultimaRequisicao = null;
let ultimoTimeout = null;

// =============================================
// 🆕 INSTALAÇÃO COM BOAS-VINDAS + BADGE NEW
// =============================================
chrome.runtime.onInstalled.addListener((details) => {
    console.log("✅ SyntaxMentor Elite v2.6.0 instalado!");
    
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
    } catch (e) {}
}

function resetarBadgeETooltip(tabId) {
    try {
        if (tabId) {
            chrome.action.setBadgeText({ text: '', tabId: tabId }).catch(() => {});
        } else {
            chrome.action.setBadgeText({ text: '' }).catch(() => {});
        }
    } catch (e) {}
}

// =============================================
// ÍCONE MODO DESATIVADO
// =============================================
function setIconeDesativado(tabId) {
    try {
        if (tabId) {
            chrome.action.setBadgeText({ text: 'OFF', tabId: tabId }).catch(() => {});
            chrome.action.setBadgeBackgroundColor({ color: '#6b7280', tabId: tabId }).catch(() => {});
        }
    } catch (e) {}
}

function verificarIconeParaTab(tabId) {
    chrome.tabs.get(tabId, (tab) => {
        if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
            setIconeDesativado(tabId);
            return;
        }
        chrome.storage.local.get(['blacklist', 'disabled', 'modoWhitelist', 'whitelist'], (res) => {
            try {
                const host = new URL(tab.url).hostname;
                let bloqueado = false;
                if (res.modoWhitelist) {
                    bloqueado = !(res.whitelist || []).some(d => host.includes(d));
                } else {
                    bloqueado = (res.blacklist || []).some(d => host.includes(d)) || res.disabled;
                }
                if (bloqueado) setIconeDesativado(tabId);
                else resetarBadgeETooltip(tabId);
            } catch (e) { resetarBadgeETooltip(tabId); }
        });
    });
}

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
function criarMenuContexto() {
    chrome.contextMenus.removeAll(() => {
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
function exportarDados() {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, (res) => {
            // Remove dados sensíveis
            delete res.apiKey;
            delete res.dataInstalacao;
            
            const backup = {
                versao: '2.6.0',
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
        chrome.storage.local.get(['blacklist', 'modoWhitelist', 'whitelist'], (res) => {
            const host = request.host;
            let bloqueado = false;
            if (res.modoWhitelist) {
                bloqueado = !(res.whitelist || []).some(d => host.includes(d));
            } else {
                bloqueado = (res.blacklist || []).some(d => host.includes(d));
            }
            sendResponse({ blocked: bloqueado });
        });
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
                try { sendResponse({ success: true, data: data }); } catch (e) {}
            })
            .catch(err => {
                clearTimeout(timeoutId);
                try { sendResponse({ success: false, error: err.message }); } catch (e) {}
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
    
    // Atualiza ícone quando blacklist ou whitelist mudar
    if (changes.blacklist || changes.disabled || changes.modoWhitelist || changes.whitelist) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) verificarIconeParaTab(tabs[0].id);
        });
    }
});

console.log("🚀 SyntaxMentor Background Service Worker iniciado!");