// SyntaxMentor background module: LanguageTool API and language detection.

function montarParametrosLanguageTool(request) {
    const params = {
        text: request.text,
        language: request.language
    };

    if (request.pickyMode) params.level = 'picky';

    if (request.modoVoz) {
        params.enabledRules = 'UPPERCASE_SENTENCE_START,PUNCTUATION_PARAGRAPH_END,COMMA_PARENTHESIS_WHITESPACE,PT_QUESTION_MARK';
        params.enabledOnly = 'false';
        params.disabledCategories = 'TYPOS';
    }

    return params;
}

function montarHeadersLanguageTool(apiKey) {
    const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
    };

    if (apiKey && apiKey.trim() !== '') {
        headers.Authorization = `Bearer ${apiKey.trim()}`;
    }

    return headers;
}

function normalizarErroLanguageTool(err) {
    if (err.name === 'AbortError') return 'Timeout: O servidor demorou muito para responder';
    if (err.message.includes('Failed to fetch')) return 'Erro de conexao: Verifique sua internet';
    if (err.message.includes('HTTP Error 401')) return 'API Key invalida - Verifique suas configuracoes';
    if (err.message.includes('HTTP Error 429')) return 'Muitas requisicoes - Aguarde um momento';
    return err.message;
}

function consultarLanguageTool(request, apiKey) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    return fetch(SM_LANGUAGETOOL_API_URL, {
        method: 'POST',
        headers: montarHeadersLanguageTool(apiKey),
        body: new URLSearchParams(montarParametrosLanguageTool(request)),
        signal: controller.signal
    })
        .then(response => {
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
            return response.json();
        })
        .catch(err => {
            clearTimeout(timeoutId);
            throw err;
        });
}

function responderCheckGrammar(request, sendResponse) {
    obterApiKeySessao((apiKey) => {
        consultarLanguageTool(request, apiKey)
            .then(data => {
                sendResponse({ success: true, data, requestId: request.requestId });
            })
            .catch(err => {
                sendResponse({
                    success: false,
                    error: normalizarErroLanguageTool(err),
                    requestId: request.requestId
                });
            });
    });
    return true;
}

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
