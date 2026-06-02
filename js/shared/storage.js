// SyntaxMentor shared Chrome storage helpers.

function smStorageLocalGet(chaves, callback) {
    chrome.storage.local.get(chaves, (res) => {
        if (chrome.runtime.lastError) {
            callback({}, chrome.runtime.lastError);
            return;
        }
        callback(res || {}, null);
    });
}

function smStorageLocalSet(dados, callback) {
    chrome.storage.local.set(dados, () => {
        if (callback) callback(chrome.runtime.lastError || null);
    });
}

function smStorageSessionGet(chaves, callback) {
    if (!chrome.storage || !chrome.storage.session) {
        callback({}, null);
        return;
    }

    try {
        chrome.storage.session.get(chaves, (res) => {
            if (chrome.runtime.lastError) {
                callback({}, chrome.runtime.lastError);
                return;
            }
            callback(res || {}, null);
        });
    } catch (e) {
        callback({}, e);
    }
}

function smStorageSessionSet(dados, callback) {
    if (!chrome.storage || !chrome.storage.session) {
        if (callback) callback(null);
        return;
    }

    try {
        chrome.storage.session.set(dados, () => {
            if (callback) callback(chrome.runtime.lastError || null);
        });
    } catch (e) {
        if (callback) callback(e);
    }
}
