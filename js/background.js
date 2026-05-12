// SyntaxMentor - background.js v2.4.0 (Cloud Sync + Context Menu + Language Detection)
let ultimaRequisicao = null;
let ultimoTimeout = null;

// =============================================
// 🆕 MELHORIA 5: CLOUD SYNC
// =============================================
// Migra dados do storage.local para storage.sync
function migrarParaCloudSync() {
    chrome.storage.local.get(null, (dadosLocais) => {
        if (!dadosLocais || Object.keys(dadosLocais).length === 0) return;

        // Verifica se já migrou
        chrome.storage.sync.get(['cloudSyncMigrado'], (res) => {
            if (res.cloudSyncMigrado) return;

            // Dados que serão sincronizados (limite 100KB)
            const dadosParaSync = {};
            const chavesSync = [
                'dicionario_pessoal', 'blacklist', 'modoLeituraSites',
                'language', 'pickyMode', 'speed', 'darkMode',
                'autoHideBubble', 'strictMode', 'modoConfirmacao',
                'modoLeituraGlobal', 'totalCorrigidas', 'totalAceitas',
                'totalRecusadas', 'erroMaisComum', 'toggleShortcut',
                'ignoreShortcut', 'corrigirTudoShortcut', 'modoWhitelist'
            ];

            chavesSync.forEach(chave => {
                if (dadosLocais[chave] !== undefined) {
                    dadosParaSync[chave] = dadosLocais[chave];
                }
            });

            // API Key NÃO é sincronizada por segurança
            chrome.storage.sync.set(dadosParaSync, () => {
                chrome.storage.sync.set({ cloudSyncMigrado: true });
                console.log('✅ SyntaxMentor: Cloud Sync ativado!');
            });
        });
    });
}

// Sincroniza em tempo real
function sincronizarStorage(changes) {
    const chavesSync = [
        'dicionario_pessoal', 'blacklist', 'modoLeituraSites',
        'language', 'pickyMode', 'speed', 'darkMode',
        'autoHideBubble', 'strictMode', 'modoConfirmacao',
        'modoLeituraGlobal', 'totalCorrigidas', 'totalAceitas',
        'totalRecusadas', 'erroMaisComum', 'toggleShortcut',
        'ignoreShortcut', 'corrigirTudoShortcut', 'modoWhitelist'
    ];

    const dadosParaSync = {};
    let temDados = false;

    Object.keys(changes).forEach(chave => {
        if (chavesSync.includes(chave)) {
            dadosParaSync[chave] = changes[chave].newValue;
            temDados = true;
        }
    });

    if (temDados) {
        chrome.storage.sync.set(dadosParaSync).catch(() => { });
    }
}

// Carrega dados do sync para o local (quando abre o Chrome)
function carregarDoCloudSync() {
    chrome.storage.sync.get(null, (dadosSync) => {
        if (!dadosSync || Object.keys(dadosSync).length === 0) return;

        const dadosParaLocal = {};
        Object.keys(dadosSync).forEach(chave => {
            if (chave !== 'cloudSyncMigrado') {
                dadosParaLocal[chave] = dadosSync[chave];
            }
        });

        chrome.storage.local.set(dadosParaLocal, () => {
            console.log('✅ Dados sincronizados da nuvem!');
        });
    });
}

// =============================================
// 🆕 MELHORIA 6: MENU DE CONTEXTO
// =============================================
function criarMenuContexto() {
    // Remove menus antigos
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: 'revisar-selecao',
            title: '🔍 SyntaxMentor: Revisar seleção',
            contexts: ['selection']
        });

        chrome.contextMenus.create({
            id: 'separador1',
            type: 'separator',
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
        // Envia para o content script revisar o texto selecionado
        chrome.tabs.sendMessage(tab.id, {
            action: 'revisarSelecao',
            texto: info.selectionText.trim()
        }).catch(() => { });
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
        }).catch(() => { });
    }
});

// =============================================
// 🆕 MELHORIA 8: AUTO-DETECÇÃO DE IDIOMA
// =============================================
function detectarIdioma(texto) {
    return new Promise((resolve) => {
        if (!chrome.i18n || !chrome.i18n.detectLanguage) {
            resolve(null);
            return;
        }

        chrome.i18n.detectLanguage(texto, (result) => {
            if (chrome.runtime.lastError) {
                resolve(null);
                return;
            }

            if (result && result.languages && result.languages.length > 0) {
                const detectado = result.languages[0].language;

                // Mapeia códigos para os suportados pelo LanguageTool
                const mapaIdiomas = {
                    'pt': 'pt-BR',
                    'pt-BR': 'pt-BR',
                    'pt-PT': 'pt-BR',
                    'en': 'en-US',
                    'en-US': 'en-US',
                    'en-GB': 'en-US',
                    'es': 'es',
                    'fr': 'fr',
                    'de': 'de',
                    'it': 'it'
                };

                resolve(mapaIdiomas[detectado] || null);
            } else {
                resolve(null);
            }
        });
    });
}

// =============================================
// INICIALIZAÇÃO
// =============================================
chrome.runtime.onInstalled.addListener(() => {
    console.log("✅ SyntaxMentor Elite v2.4.0 instalado!");
    criarMenuContexto();
    carregarDoCloudSync();
    migrarParaCloudSync();
});

chrome.runtime.onStartup.addListener(() => {
    carregarDoCloudSync();
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
            }).catch(() => { });

            chrome.action.setBadgeBackgroundColor({
                color: '#e53e3e',
                tabId: tabId
            }).catch(() => { });
        } else {
            chrome.action.setBadgeText({ text: '', tabId: tabId }).catch(() => { });
        }
    } catch (e) { }
}

function resetarBadgeETooltip(tabId) {
    try {
        if (tabId) {
            chrome.action.setBadgeText({ text: '', tabId: tabId }).catch(() => { });
        } else {
            chrome.action.setBadgeText({ text: '' }).catch(() => { });
        }
    } catch (e) { }
}

// =============================================
// ÍCONE MODO DESATIVADO
// =============================================
function setIconeDesativado(tabId) {
    try {
        if (tabId) {
            chrome.action.setBadgeText({ text: 'OFF', tabId: tabId }).catch(() => { });
            chrome.action.setBadgeBackgroundColor({ color: '#6b7280', tabId: tabId }).catch(() => { });
        }
    } catch (e) { }
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
                    // Modo Whitelist: só funciona nos sites da whitelist
                    const whitelist = res.whitelist || [];
                    bloqueado = !whitelist.some(d => host.includes(d));
                } else {
                    // Modo Blacklist: funciona em todos, exceto na blacklist
                    const blacklist = res.blacklist || [];
                    bloqueado = blacklist.some(d => host.includes(d)) || res.disabled;
                }

                if (bloqueado) {
                    setIconeDesativado(tabId);
                } else {
                    resetarBadgeETooltip(tabId);
                }
            } catch (e) {
                resetarBadgeETooltip(tabId);
            }
        });
    });
}

chrome.tabs.onActivated.addListener((activeInfo) => verificarIconeParaTab(activeInfo.tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
        verificarIconeParaTab(tabId);
        resetarBadgeETooltip(tabId);
    }
});

// =============================================
// EXPORTAR / IMPORTAR
// =============================================
function exportarDados() {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, (res) => {
            delete res.apiKey;
            const backup = {
                versao: '2.4.0',
                data: new Date().toISOString(),
                dados: res
            };
            resolve(backup);
        });
    });
}

function importarDados(dados) {
    return new Promise((resolve, reject) => {
        try {
            const backup = typeof dados === 'string' ? JSON.parse(dados) : dados;
            if (!backup.dados) { reject(new Error('Formato inválido')); return; }

            chrome.storage.local.get(['apiKey'], (res) => {
                const restaurado = { ...backup.dados };
                if (res.apiKey) restaurado.apiKey = res.apiKey;

                chrome.storage.local.set(restaurado, () => {
                    if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                    else resolve({ sucesso: true });
                });
            });
        } catch (e) { reject(new Error('JSON inválido')); }
    });
}

// =============================================
// COMUNICAÇÃO
// =============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === 'updateBadge') {
        atualizarBadge(request.totalErros, sender.tab?.id);
        sendResponse({ success: true });
        return false;
    }

    if (request.action === 'resetBadge') {
        resetarBadgeETooltip(sender.tab?.id);
        sendResponse({ success: true });
        return false;
    }

    if (request.action === 'checkBlacklist') {
        chrome.storage.local.get(['blacklist', 'modoWhitelist', 'whitelist'], (res) => {
            const host = request.host;
            let bloqueado = false;

            if (res.modoWhitelist) {
                const whitelist = res.whitelist || [];
                bloqueado = !whitelist.some(d => host.includes(d));
            } else {
                const blacklist = res.blacklist || [];
                bloqueado = blacklist.some(d => host.includes(d));
            }

            sendResponse({ blocked: bloqueado });
        });
        return true;
    }

    if (request.action === 'exportData') {
        exportarDados().then(backup => sendResponse({ success: true, data: backup }));
        return true;
    }

    if (request.action === 'importData') {
        importarDados(request.data).then(r => sendResponse({ success: true, ...r }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    // 🆕 Detecção de idioma
    if (request.action === 'detectLanguage') {
        detectarIdioma(request.text).then(idioma => {
            sendResponse({ success: true, language: idioma });
        });
        return true;
    }

    // Check grammar (com API Key)
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
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                return response.json();
            })
            .then(data => {
                try { sendResponse({ success: true, data: data }); } catch (e) { }
            })
            .catch(err => {
                clearTimeout(timeoutId);
                try { sendResponse({ success: false, error: err.message }); } catch (e) { }
            });

        return true;
    }

    return false;
});

// =============================================
// STORAGE CHANGE (com Cloud Sync)
// =============================================
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
        // Sincroniza com a nuvem
        sincronizarStorage(changes);

        // Atualiza ícone
        if (changes.blacklist || changes.disabled || changes.modoWhitelist || changes.whitelist) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) verificarIconeParaTab(tabs[0].id);
            });
        }
    }

    // Quando dados chegam da nuvem, atualiza o local
    if (namespace === 'sync') {
        const dadosParaLocal = {};
        Object.keys(changes).forEach(chave => {
            if (chave !== 'cloudSyncMigrado') {
                dadosParaLocal[chave] = changes[chave].newValue;
            }
        });
        if (Object.keys(dadosParaLocal).length > 0) {
            chrome.storage.local.set(dadosParaLocal).catch(() => { });
        }
    }
});