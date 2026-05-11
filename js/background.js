// SyntaxMentor - background.js v2.2.0 (Badge, Icon & Backup)
let iconesPadrao = {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
};

let iconesDesativado = {
    "16": "icons/icon16-off.png",
    "32": "icons/icon32-off.png",
    "48": "icons/icon48-off.png",
    "128": "icons/icon128-off.png"
};

// =============================================
// INICIALIZAÇÃO
// =============================================
chrome.runtime.onInstalled.addListener(() => {
    console.log("✅ SyntaxMentor Pro instalado!");
    resetarBadgeETooltip();
    verificarIconeGlobal();
});

chrome.runtime.onStartup.addListener(() => {
    resetarBadgeETooltip();
    verificarIconeGlobal();
});

// =============================================
// 🆕 MELHORIA 1: BADGE DE NOTIFICAÇÃO
// =============================================
function atualizarBadge(totalErros, tabId) {
    if (!tabId) return;

    if (totalErros > 0) {
        chrome.action.setBadgeText({
            text: totalErros > 999 ? '999+' : String(totalErros),
            tabId: tabId
        });
        chrome.action.setBadgeBackgroundColor({
            color: '#e53e3e',
            tabId: tabId
        });
        chrome.action.setTitle({
            title: `SyntaxMentor: ${totalErros} erro(s) encontrado(s)`,
            tabId: tabId
        });
    } else {
        chrome.action.setBadgeText({
            text: '',
            tabId: tabId
        });
        chrome.action.setTitle({
            title: 'SyntaxMentor: Nenhum erro',
            tabId: tabId
        });
    }
}

function resetarBadgeETooltip(tabId) {
    if (tabId) {
        chrome.action.setBadgeText({ text: '', tabId: tabId });
        chrome.action.setTitle({ title: 'SyntaxMentor', tabId: tabId });
    } else {
        chrome.action.setBadgeText({ text: '' });
        chrome.action.setTitle({ title: 'SyntaxMentor' });
    }
}

// =============================================
// 🆕 MELHORIA 2: ÍCONE MODO DESATIVADO
// =============================================
function verificarIconeGlobal() {
    chrome.storage.local.get(['disabled', 'blacklist'], (res) => {
        const blacklist = res.blacklist || [];
        const desativado = res.disabled || false;

        if (desativado || blacklist.length > 0) {
            // Verifica se a aba atual está na blacklist
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    const host = new URL(tabs[0].url).hostname;
                    const bloqueado = blacklist.some(d => host.includes(d));

                    if (bloqueado || desativado) {
                        setIconeDesativado(tabs[0].id);
                    } else {
                        setIconePadrao(tabs[0].id);
                    }
                }
            });
        } else {
            setIconePadrao();
        }
    });
}

function setIconePadrao(tabId) {
    if (tabId) {
        chrome.action.setIcon({ path: iconesPadrao, tabId: tabId });
    } else {
        chrome.action.setIcon({ path: iconesPadrao });
    }
}

function setIconeDesativado(tabId) {
    // Tenta usar ícones cinza, se não existirem, usa os padrões com opacidade
    if (tabId) {
        chrome.action.setIcon({ path: iconesPadrao, tabId: tabId });
        // Fallback: se não tem ícones cinza, usa badge para indicar
        chrome.action.setBadgeText({ text: 'OFF', tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#6b7280', tabId: tabId });
        chrome.action.setTitle({ title: 'SyntaxMentor: Desativado neste site', tabId: tabId });
    } else {
        chrome.action.setIcon({ path: iconesPadrao });
        chrome.action.setBadgeText({ text: 'OFF' });
        chrome.action.setBadgeBackgroundColor({ color: '#6b7280' });
    }
}

// Atualiza ícone quando muda de aba
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
            const blacklist = res.blacklist || [];
            const desativado = res.disabled || false;
            const host = new URL(tab.url).hostname;
            const bloqueado = blacklist.some(d => host.includes(d));

            if (bloqueado || desativado) {
                setIconeDesativado(tabId);
            } else {
                setIconePadrao(tabId);
                resetarBadgeETooltip(tabId);
            }
        });
    });
}

// =============================================
// 🆕 MELHORIA 3: BACKUP DE DADOS
// =============================================
function exportarDados() {
    return new Promise((resolve) => {
        chrome.storage.local.get({
            dicionario_pessoal: [],
            blacklist: [],
            language: 'pt-BR',
            pickyMode: true,
            speed: 500,
            darkMode: false,
            strictMode: false,
            toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's' },
            ignoreShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 'i' },
            corrigirTudoShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 's' }
        }, (res) => {
            const backup = {
                versao: '2.2.0',
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
                language: backup.dados.language || 'pt-BR',
                pickyMode: backup.dados.pickyMode ?? true,
                speed: backup.dados.speed || 500,
                darkMode: backup.dados.darkMode || false,
                strictMode: backup.dados.strictMode || false
            };

            chrome.storage.local.set(dadosParaRestaurar, () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve({ sucesso: true, total: Object.keys(dadosParaRestaurar).length });
                }
            });
        } catch (e) {
            reject(new Error('Arquivo JSON inválido'));
        }
    });
}

// =============================================
// COMUNICAÇÃO COM CONTENT.JS E OPTIONS
// =============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    // 🆕 Atualizar badge
    if (request.action === 'updateBadge') {
        atualizarBadge(request.totalErros, sender.tab?.id);
        sendResponse({ success: true });
        return false;
    }

    // 🆕 Resetar badge
    if (request.action === 'resetBadge') {
        resetarBadgeETooltip(sender.tab?.id);
        sendResponse({ success: true });
        return false;
    }

    // 🆕 Verificar blacklist
    if (request.action === 'checkBlacklist') {
        chrome.storage.local.get(['blacklist'], (res) => {
            const host = request.host;
            const blacklist = res.blacklist || [];
            const bloqueado = blacklist.some(d => host.includes(d));
            sendResponse({ blocked: bloqueado });
        });
        return true;
    }

    // 🆕 Exportar dados
    if (request.action === 'exportData') {
        exportarDados().then(backup => {
            sendResponse({ success: true, data: backup });
        });
        return true;
    }

    // 🆕 Importar dados
    if (request.action === 'importData') {
        importarDados(request.data).then(result => {
            sendResponse({ success: true, ...result });
        }).catch(err => {
            sendResponse({ success: false, error: err.message });
        });
        return true;
    }

    // Verificação de gramática
    if (request.action === 'checkGrammar') {
        const fetchUrl = request.apiUrl && request.apiUrl.trim() !== ''
            ? request.apiUrl
            : 'https://api.languagetool.org/v2/check';

        const params = {
            'text': request.text,
            'language': request.language
        };

        if (request.pickyMode) params['level'] = 'picky';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        fetch(fetchUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
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
                } catch (e) { }
            })
            .catch(err => {
                clearTimeout(timeoutId);
                try {
                    sendResponse({ success: false, error: err.message });
                } catch (e) { }
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

    if (changes.blacklist || changes.disabled) {
        verificarIconeGlobal();
    }
});