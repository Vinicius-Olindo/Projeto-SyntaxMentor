// SyntaxMentor background module: runtime messages.

function registrarMensagensBackground() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'ping') {
            sendResponse({ success: true, status: 'alive', timestamp: Date.now() });
            return true;
        }

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
            smStorageLocalGet(
                ['blacklist', 'disabled', 'modoWhitelist', 'whitelist', 'userBlacklistOverrides', 'userWhitelistOverrides'],
                (res, erro) => {
                    if (erro) {
                        sendResponse({ blocked: false });
                        return;
                    }
                    sendResponse({ blocked: isSiteBloqueado(request.host, res) });
                }
            );
            return true;
        }

        if (request.action === 'detectLanguage') {
            detectarIdioma(request.text).then(idioma => {
                sendResponse({ success: true, language: idioma });
            });
            return true;
        }

        if (request.action === 'toggleSite') {
            if (sender.tab) {
                verificarIconeParaTab(sender.tab.id);
                chrome.tabs.sendMessage(sender.tab.id, {
                    action: 'siteToggled',
                    enabled: request.enabled,
                    host: request.host
                }).catch(() => {});
            }
            sendResponse({ success: true });
            return true;
        }

        if (request.action === 'toggleSiteGlobal') {
            atualizarOverrideSite(request.host, request.enabled, () => {
                if (sender.tab) verificarIconeParaTab(sender.tab.id);
            });
            sendResponse({ success: true });
            return true;
        }

        if (request.action === 'checkGrammar') {
            return responderCheckGrammar(request, sendResponse);
        }

        return false;
    });
}
