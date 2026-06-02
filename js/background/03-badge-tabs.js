// SyntaxMentor background module: tab badges and site toggles.

function enviarToggleSite(tabId, enabled, host) {
    chrome.tabs.sendMessage(tabId, {
        action: 'toggleSite',
        enabled,
        host
    }).catch(() => {});
}

function mostrarBadgeTemporario(tabId, text, color) {
    chrome.action.setBadgeText({ text, tabId });
    chrome.action.setBadgeBackgroundColor({ color, tabId });
    setTimeout(() => {
        chrome.action.setBadgeText({ text: '', tabId });
    }, 2000);
}

function executarToggleSiteAtivo(enabled) {
    obterAbaAtivaValida((tab) => {
        if (!tab) return;

        try {
            const host = new URL(tab.url).hostname;
            atualizarOverrideSite(host, enabled, () => {
                enviarToggleSite(tab.id, enabled, host);
                verificarIconeParaTab(tab.id);
                mostrarBadgeTemporario(
                    tab.id,
                    enabled ? 'ON' : 'OFF',
                    enabled ? '#28a745' : '#6b7280'
                );
                smLog(`${enabled ? 'Ativada' : 'Desativada'} no site: ${host}`);
            });
        } catch (e) {
            smDebug('Erro ao alternar extensao:', e);
        }
    });
}

function atualizarBadge(totalErros, tabId) {
    if (!tabId) return;

    try {
        if (totalErros > 0) {
            chrome.action.setBadgeText({
                text: totalErros > 999 ? '999+' : String(totalErros),
                tabId
            }).catch(() => {});
            chrome.action.setBadgeBackgroundColor({
                color: '#e53e3e',
                tabId
            }).catch(() => {});
        } else {
            chrome.action.setBadgeText({ text: '', tabId }).catch(() => {});
        }
    } catch (e) {
        smDebug('Erro ao atualizar badge:', e);
    }
}

function resetarBadgeETooltip(tabId) {
    try {
        if (tabId) {
            chrome.action.setBadgeText({ text: '', tabId }).catch(() => {});
        } else {
            chrome.action.setBadgeText({ text: '' }).catch(() => {});
        }
    } catch (e) {
        smDebug('Erro ao resetar badge:', e);
    }
}

function setIconeDesativado(tabId) {
    try {
        if (tabId) {
            chrome.action.setBadgeText({ text: 'OFF', tabId }).catch(() => {});
            chrome.action.setBadgeBackgroundColor({ color: '#6b7280', tabId }).catch(() => {});
        }
    } catch (e) {
        smDebug('Erro ao definir icone desativado:', e);
    }
}

function verificarIconeParaTab(tabId) {
    chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab || !tab.url || tab.url.startsWith('chrome://')) {
            setIconeDesativado(tabId);
            return;
        }

        smStorageLocalGet(
            ['blacklist', 'disabled', 'modoWhitelist', 'whitelist', 'userBlacklistOverrides', 'userWhitelistOverrides'],
            (res, erro) => {
                if (erro) {
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

function registrarEventosAbas() {
    chrome.tabs.onActivated.addListener((activeInfo) => {
        verificarIconeParaTab(activeInfo.tabId);
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
        if (changeInfo.status === 'complete') {
            verificarIconeParaTab(tabId);
            resetarBadgeETooltip(tabId);
        }
    });
}
