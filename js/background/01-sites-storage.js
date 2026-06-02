// SyntaxMentor background module: site rules and storage access.

function isSiteBloqueado(host, res) {
    if (listaTemDominio(host, res.userBlacklistOverrides)) return true;
    if (listaTemDominio(host, res.userWhitelistOverrides)) return false;
    if (res.modoWhitelist) return !listaTemDominio(host, res.whitelist);
    return listaTemDominio(host, res.blacklist) || !!res.disabled;
}

function obterApiKeySessao(callback) {
    smStorageSessionGet({ apiKey: '' }, (sess) => {
        callback(sess.apiKey || '');
    });
}

function atualizarOverrideSite(host, enabled, callback) {
    smStorageLocalGet(['userBlacklistOverrides', 'userWhitelistOverrides'], (res) => {
        const blacklistOverrides = res.userBlacklistOverrides || [];
        const whitelistOverrides = res.userWhitelistOverrides || [];

        if (enabled) {
            const index = blacklistOverrides.indexOf(host);
            if (index > -1) blacklistOverrides.splice(index, 1);
            if (!whitelistOverrides.includes(host)) whitelistOverrides.push(host);
        } else {
            const index = whitelistOverrides.indexOf(host);
            if (index > -1) whitelistOverrides.splice(index, 1);
            if (!blacklistOverrides.includes(host)) blacklistOverrides.push(host);
        }

        smStorageLocalSet({
            userBlacklistOverrides: blacklistOverrides,
            userWhitelistOverrides: whitelistOverrides
        }, () => {
            if (callback) callback();
        });
    });
}

function obterAbaAtivaValida(callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id || !tab?.url || tab.url.startsWith('chrome://')) {
            callback(null);
            return;
        }
        callback(tab);
    });
}
