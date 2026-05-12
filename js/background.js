// SyntaxMentor - background.js v2.3.0 (Icon Path Fix)
let ultimaRequisicao = null;
let ultimoTimeout = null;

// 🆕 Usa os mesmos ícones do manifest.json (raiz)
let iconesPadrao = {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
};

// =============================================
// INICIALIZAÇÃO
// =============================================
chrome.runtime.onInstalled.addListener(() => {
    console.log("✅ SyntaxMentor Pro v2.3.0 instalado!");
    // Não tenta setar ícone na instalação - usa o padrão do manifest
});

chrome.runtime.onStartup.addListener(() => {
    // Não tenta setar ícone no startup - usa o padrão do manifest
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

            chrome.action.setTitle({
                title: `SyntaxMentor: ${totalErros} erro(s) encontrado(s)`,
                tabId: tabId
            }).catch(() => { });
        } else {
            chrome.action.setBadgeText({
                text: '',
                tabId: tabId
            }).catch(() => { });

            chrome.action.setTitle({
                title: 'SyntaxMentor: Nenhum erro',
                tabId: tabId
            }).catch(() => { });
        }
    } catch (e) {
        // Ignora erros de contexto inválido
    }
}

function resetarBadgeETooltip(tabId) {
    try {
        if (tabId) {
            chrome.action.setBadgeText({ text: '', tabId: tabId }).catch(() => { });
            chrome.action.setTitle({ title: 'SyntaxMentor Pro', tabId: tabId }).catch(() => { });
        } else {
            chrome.action.setBadgeText({ text: '' }).catch(() => { });
            chrome.action.setTitle({ title: 'SyntaxMentor Pro' }).catch(() => { });
        }
    } catch (e) {
        // Ignora erros de contexto inválido
    }
}

// =============================================
// ÍCONE MODO DESATIVADO
// =============================================
function setIconePadrao(tabId) {
    // Não faz nada - o ícone padrão já está no manifest.json
    // Isso evita o erro "Failed to set icon"
}

function setIconeDesativado(tabId) {
    try {
        if (tabId) {
            chrome.action.setBadgeText({ text: 'OFF', tabId: tabId }).catch(() => { });
            chrome.action.setBadgeBackgroundColor({ color: '#6b7280', tabId: tabId }).catch(() => { });
            chrome.action.setTitle({ title: 'SyntaxMentor: Desativado neste site', tabId: tabId }).catch(() => { });
        }
    } catch (e) {
        // Ignora erros
    }
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

function verificarIconeParaTab(tabId) {
    chrome.tabs.get(tabId, (tab) => {
        if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
            setIconeDesativado(tabId);
            return;
        }

        chrome.storage.local.get(['blacklist', 'disabled'], (res) => {
            try {
                const blacklist = res.blacklist || [];
                const desativado = res.disabled || false;
                const host = new URL(tab.url).hostname;
                const bloqueado = blacklist.some(d => host.includes(d));

                if (bloqueado || desativado) {
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

// =============================================
// EXPORTAR DADOS
// =============================================
function exportarDados() {
    return new Promise((resolve) => {
        chrome.storage.local.get({
            dicionario_pessoal: [],
            blacklist: [],
            modoLeituraSites: [],
            language: 'pt-BR',
            pickyMode: true,
            speed: 500,
            darkMode: false,
            strictMode: false,
            modoConfirmacao: false,
            modoLeituraGlobal: false,
            autoHideBubble: false,
            toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's' },
            ignoreShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 'i' },
            corrigirTudoShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 's' }
        }, (res) => {
            // NÃO exporta a API Key por segurança
            delete res.apiKey;

            const backup = {
                versao: '2.3.0',
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

            if (!backup.dados) {
                reject(new Error('Formato de backup inválido'));
                return;
            }

            const dadosParaRestaurar = {
                dicionario_pessoal: backup.dados.dicionario_pessoal || [],
                blacklist: backup.dados.blacklist || [],
                modoLeituraSites: backup.dados.modoLeituraSites || [],
                language: backup.dados.language || 'pt-BR',
                pickyMode: backup.dados.pickyMode ?? true,
                speed: backup.dados.speed || 500,
                darkMode: backup.dados.darkMode || false,
                strictMode: backup.dados.strictMode || false,
                modoConfirmacao: backup.dados.modoConfirmacao || false,
                modoLeituraGlobal: backup.dados.modoLeituraGlobal || false,
                autoHideBubble: backup.dados.autoHideBubble || false
            };

            // Preserva a API Key atual
            chrome.storage.local.get(['apiKey'], (res) => {
                if (res.apiKey) dadosParaRestaurar.apiKey = res.apiKey;

                chrome.storage.local.set(dadosParaRestaurar, () => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve({ sucesso: true, total: Object.keys(dadosParaRestaurar).length });
                    }
                });
            });
        } catch (e) {
            reject(new Error('Arquivo JSON inválido'));
        }
    });
}

// =============================================
// COMUNICAÇÃO
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
        chrome.storage.local.get(['blacklist'], (res) => {
            const host = request.host;
            const blacklist = res.blacklist || [];
            const bloqueado = blacklist.some(d => host.includes(d));
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

    // Importar dados
    if (request.action === 'importData') {
        importarDados(request.data).then(result => {
            sendResponse({ success: true, ...result });
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true;
    }

    // Verificação de gramática (com suporte a API Key)
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
// STORAGE CHANGE LISTENER
// =============================================
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') return;

    // Atualiza badge quando blacklist mudar
    if (changes.blacklist || changes.disabled) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) verificarIconeParaTab(tabs[0].id);
        });
    }
});