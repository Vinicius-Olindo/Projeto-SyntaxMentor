// SyntaxMentor - background.js v2.0.5 (Context Safety)
chrome.runtime.onInstalled.addListener(() => {
    console.log("SyntaxMentor instalado com sucesso.");
});

// Escuta as mensagens vindas da página (content.js)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === 'checkGrammar') {
        const fetchUrl = request.apiUrl && request.apiUrl.trim() !== ''
            ? request.apiUrl
            : 'https://api.languagetool.org/v2/check';

        const params = {
            'text': request.text,
            'language': request.language
        };

        if (request.pickyMode) params['level'] = 'picky';

        // Faz o fetch com timeout de 15 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        fetch(fetchUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams(params),
            signal: controller.signal
        })
            .then(response => {
                clearTimeout(timeoutId);
                if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
                return response.json();
            })
            .then(data => {
                // Verifica se ainda pode enviar resposta
                try {
                    sendResponse({ success: true, data: data });
                } catch (e) {
                    console.warn('SyntaxMentor BG: Não foi possível enviar resposta (contexto inválido)');
                }
            })
            .catch(err => {
                clearTimeout(timeoutId);

                // 🛡️ Não tenta enviar resposta se o contexto já foi invalidado
                if (err.name === 'AbortError') {
                    console.warn('SyntaxMentor BG: Requisição abortada (timeout ou contexto inválido)');
                    try {
                        sendResponse({ success: false, error: 'Timeout ao verificar' });
                    } catch (e) { }
                    return;
                }

                console.error("SyntaxMentor API Error:", err.message);
                try {
                    sendResponse({ success: false, error: err.message });
                } catch (e) {
                    console.warn('SyntaxMentor BG: Contexto inválido ao enviar erro');
                }
            });

        // Retorna true para indicar resposta assíncrona
        return true;
    }

    return false;
});

// 🆕 Auto-limpeza quando o service worker é desativado
self.addEventListener('unload', () => {
    console.log('SyntaxMentor: Service worker desativado.');
});