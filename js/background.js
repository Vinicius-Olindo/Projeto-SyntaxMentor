// SyntaxMentor - background.js v2.5.0 (Completo)
let ultimaRequisicao = null;
let ultimoTimeout = null;

// =============================================
// INICIALIZAÇÃO
// =============================================
chrome.runtime.onInstalled.addListener(() => {
    console.log("✅ SyntaxMentor Elite v2.5.0 instalado!");
    criarMenuContexto();
});

chrome.runtime.onStartup.addListener(() => {
    criarMenuContexto();
});

// =============================================
// BADGE DE NOTIFICAÇÃO
// =============================================
function atualizarBadge(totalErros, tabId) {
    if (!tabId) return;
    try {
        if (totalErros > 0) {
            chrome.action.setBadgeText({ text: totalErros > 999 ? '999+' : String(totalErros), tabId }).catch(() => {});
            chrome.action.setBadgeBackgroundColor({ color: '#e53e3e', tabId }).catch(() => {});
        } else {
            chrome.action.setBadgeText({ text: '', tabId }).catch(() => {});
        }
    } catch (e) {}
}

function resetarBadgeETooltip(tabId) {
    try {
        if (tabId) chrome.action.setBadgeText({ text: '', tabId }).catch(() => {});
        else chrome.action.setBadgeText({ text: '' }).catch(() => {});
    } catch (e) {}
}

// =============================================
// ÍCONE MODO DESATIVADO
// =============================================
function setIconeDesativado(tabId) {
    try {
        if (tabId) {
            chrome.action.setBadgeText({ text: 'OFF', tabId }).catch(() => {});
            chrome.action.setBadgeBackgroundColor({ color: '#6b7280', tabId }).catch(() => {});
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

chrome.tabs.onActivated.addListener((info) => verificarIconeParaTab(info.tabId));
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'complete') {
        verificarIconeParaTab(tabId);
        resetarBadgeETooltip(tabId);
    }
});

// =============================================
// MENU DE CONTEXTO
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
        chrome.tabs.sendMessage(tab.id, { action: 'revisarSelecao', texto: info.selectionText.trim() }).catch(() => {});
    }
    if (info.menuItemId === 'ignorar-palavra' && info.selectionText) {
        const palavra = info.selectionText.trim().split(/\s+/)[0];
        chrome.storage.local.get(['dicionario_pessoal'], (res) => {
            const dic = res.dicionario_pessoal || [];
            if (!dic.includes(palavra)) { dic.push(palavra); chrome.storage.local.set({ dicionario_pessoal: dic }); }
        });
    }
    if (info.menuItemId === 'ignorar-sessao' && info.selectionText) {
        const palavra = info.selectionText.trim().split(/\s+/)[0];
        chrome.tabs.sendMessage(tab.id, { action: 'ignorarTemporariamente', palavra }).catch(() => {});
    }
});

// =============================================
// DETECÇÃO DE IDIOMA
// =============================================
function detectarIdioma(texto) {
    return new Promise((resolve) => {
        if (!chrome.i18n || !chrome.i18n.detectLanguage) { resolve(null); return; }
        chrome.i18n.detectLanguage(texto, (result) => {
            if (chrome.runtime.lastError || !result?.languages?.length) { resolve(null); return; }
            const mapa = { 'pt': 'pt-BR', 'pt-BR': 'pt-BR', 'pt-PT': 'pt-BR', 'en': 'en-US', 'en-US': 'en-US', 'en-GB': 'en-US', 'es': 'es', 'fr': 'fr', 'de': 'de', 'it': 'it' };
            resolve(mapa[result.languages[0].language] || null);
        });
    });
}

// =============================================
// EXPORTAR DADOS
// =============================================
function exportarDados() {
    return new Promise((resolve) => {
        chrome.storage.local.get(null, (res) => {
            delete res.apiKey;
            resolve({ versao: '2.5.0', data: new Date().toISOString(), dados: res });
        });
    });
}

// =============================================
// COMUNICAÇÃO
// =============================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateBadge') { atualizarBadge(request.totalErros, sender.tab?.id); sendResponse({ success: true }); return false; }
    if (request.action === 'resetBadge') { resetarBadgeETooltip(sender.tab?.id); sendResponse({ success: true }); return false; }
    if (request.action === 'exportData') { exportarDados().then(d => sendResponse({ success: true, data: d })); return true; }
    if (request.action === 'detectLanguage') { detectarIdioma(request.text).then(l => sendResponse({ success: true, language: l })); return true; }
    if (request.action === 'checkGrammar') {
        const url = request.apiUrl?.trim() || 'https://api.languagetool.org/v2/check';
        const params = { text: request.text, language: request.language };
        if (request.pickyMode) params.level = 'picky';
        const headers = { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' };
        if (request.apiKey?.trim()) headers['Authorization'] = `Bearer ${request.apiKey.trim()}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        fetch(url, { method: 'POST', headers, body: new URLSearchParams(params), signal: controller.signal })
            .then(r => { clearTimeout(timeout); if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
            .then(d => { try { sendResponse({ success: true, data: d }); } catch (e) {} })
            .catch(e => { clearTimeout(timeout); try { sendResponse({ success: false, error: e.message }); } catch (ex) {} });
        return true;
    }
    return false;
});

chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && (changes.blacklist || changes.disabled || changes.modoWhitelist || changes.whitelist)) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => { if (tabs[0]) verificarIconeParaTab(tabs[0].id); });
    }
});