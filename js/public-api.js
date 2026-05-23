// =============================================
// SyntaxMentor - Public API v2.8.0b
// =============================================

(function() {
    'use strict';
    
    // Verificar se já foi inicializado
    if (window.SyntaxMentor) {
        console.warn('SyntaxMentor API já está carregada');
        return;
    }

    // =============================================
    // RATE LIMITING MELHORADO
    // =============================================
    let _callTimestamps = []; // Array de timestamps das últimas chamadas
    const MAX_CALLS_PER_SECOND = 10;
    const RATE_WINDOW_MS = 1000;
    
    // Cache LRU simples para evitar chamadas repetidas ao mesmo texto em curto período
    const _cache = new Map();
    const CACHE_MAX_SIZE = 50;
    const CACHE_TTL_MS = 60000; // 1 minuto

    function _checkRateLimit() {
        const now = Date.now();
        
        // Limpar timestamps antigos
        _callTimestamps = _callTimestamps.filter(ts => now - ts < RATE_WINDOW_MS);
        
        if (_callTimestamps.length >= MAX_CALLS_PER_SECOND) {
            throw new Error(`Limite de requisições atingido (${MAX_CALLS_PER_SECOND}/s). Aguarde um momento.`);
        }
        
        _callTimestamps.push(now);
    }
    
    function _getCached(key) {
        const cached = _cache.get(key);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
            return cached.result;
        }
        _cache.delete(key);
        return null;
    }
    
    function _setCache(key, result) {
        // Limitar tamanho do cache
        if (_cache.size >= CACHE_MAX_SIZE) {
            const firstKey = _cache.keys().next().value;
            _cache.delete(firstKey);
        }
        _cache.set(key, { result, timestamp: Date.now() });
    }
    
    function _getCacheKey(text, options) {
        return `${text}|${options.language || ''}|${options.pickyMode !== undefined ? options.pickyMode : ''}`;
    }
    
    // =============================================
    // CONFIGURAÇÃO DA API
    // =============================================
    
    const config = {
        version: '2.8.1',
        language: 'pt-BR',
        pickyMode: true,
        apiUrl: 'https://api.languagetool.org/v2/check',
        maxTextLength: 10000 // Limite de segurança
    };
    
    // Fila de requisições com limite de tamanho
    let requestQueue = [];
    let isProcessing = false;
    const MAX_QUEUE_SIZE = 20;
    
    // =============================================
    // FUNÇÕES PRIVADAS
    // =============================================
    
    /**
     * Valida e sanitiza entrada
     */
    function _validateText(text) {
        if (!text || typeof text !== 'string') {
            throw new Error('Texto inválido: deve ser uma string não vazia');
        }
        if (text.length > config.maxTextLength) {
            throw new Error(`Texto muito longo (máximo ${config.maxTextLength} caracteres)`);
        }
        return text.trim();
    }
    
    /**
     * Faz requisição para a API LanguageTool
     * @param {string} text - Texto a ser verificado
     * @returns {Promise<Object>}
     */
    async function checkGrammar(text) {
        const params = new URLSearchParams({
            text: text,
            language: config.language
        });
        
        if (config.pickyMode) params.set('level', 'picky');
        
        // Timeout de 10 segundos
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
            const response = await fetch(config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                if (response.status === 429) {
                    throw new Error('Muitas requisições. Aguarde um momento.');
                }
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return formatResponse(data, text);
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Timeout: O servidor demorou para responder');
            }
            throw error;
        }
    }
    
    /**
     * Formata a resposta da API
     * @param {Object} data - Dados da API
     * @param {string} originalText - Texto original
     * @returns {Object}
     */
    function formatResponse(data, originalText) {
        const matches = data.matches || [];
        const corrections = matches.map(match => {
            const original = match.context.text.substr(
                match.context.offset,
                match.context.length
            );
            
            return {
                original: original,
                suggestions: (match.replacements || []).map(r => r.value),
                message: match.message,
                shortMessage: match.shortMessage,
                offset: match.context.offset,
                length: match.context.length,
                rule: {
                    id: match.rule?.id,
                    category: match.rule?.category?.name,
                    categoryId: match.rule?.category?.id
                }
            };
        });
        
        // Texto corrigido (aplica a primeira sugestão de cada erro)
        let correctedText = originalText;
        const correcoesPorOffset = matches
            .filter(m => m.replacements && m.replacements.length > 0)
            .sort((a, b) => b.offset - a.offset);

        correcoesPorOffset.forEach(match => {
            const inicio = match.offset;
            const fim = match.offset + match.length;
            const sugestao = match.replacements[0].value;
            correctedText = correctedText.slice(0, inicio) + sugestao + correctedText.slice(fim);
        });
        
        return {
            success: true,
            text: originalText,
            correctedText: correctedText,
            corrections: corrections,
            totalErrors: corrections.length,
            language: config.language
        };
    }
    
    /**
     * Processa a fila de requisições (SEM DEBOUNCE INTERNO)
     */
    async function processQueue() {
        if (isProcessing || requestQueue.length === 0) return;
        
        isProcessing = true;
        const { text, resolve, reject, options } = requestQueue.shift();
        
        try {
            // Aplica rate limit ANTES de processar
            _checkRateLimit();
            
            // Verifica cache
            const cacheKey = _getCacheKey(text, options);
            const cached = _getCached(cacheKey);
            if (cached) {
                resolve(cached);
                isProcessing = false;
                processQueue();
                return;
            }
            
            // Atualizar configuração temporária se fornecida
            const previousLang = config.language;
            const previousPicky = config.pickyMode;
            
            if (options) {
                if (options.language) config.language = options.language;
                if (options.pickyMode !== undefined) config.pickyMode = options.pickyMode;
            }
            
            const result = await checkGrammar(text);
            
            // Restaurar configuração
            config.language = previousLang;
            config.pickyMode = previousPicky;
            
            // Armazena em cache
            _setCache(cacheKey, result);
            
            resolve(result);
        } catch (error) {
            reject(error);
        } finally {
            isProcessing = false;
            processQueue();
        }
    }
    
    // =============================================
    // FUNÇÕES PÚBLICAS
    // =============================================
    
    window.SyntaxMentor = {
        version: config.version,
        
        /**
         * Configura a API
         * @param {Object} options - Opções de configuração
         */
        configure: function(options) {
            if (options.language) config.language = options.language;
            if (options.pickyMode !== undefined) config.pickyMode = options.pickyMode;
            if (options.apiUrl) config.apiUrl = options.apiUrl;
            if (options.maxTextLength) config.maxTextLength = options.maxTextLength;
            
            console.log('SyntaxMentor API configurada:', { language: config.language, pickyMode: config.pickyMode });
            return this;
        },
        
        /**
         * Corrige um texto (SEM DEBOUNCE, respeita rate limit)
         * @param {string} text - Texto a ser corrigido
         * @param {Object} options - Opções
         * @returns {Promise<Object>}
         */
        correct: function(text, options = {}) {
            return new Promise((resolve, reject) => {
                try {
                    const textoValidado = _validateText(text);
                    
                    // Verificar se a fila não está cheia
                    if (requestQueue.length >= MAX_QUEUE_SIZE) {
                        reject(new Error('Fila de requisições cheia. Aguarde.'));
                        return;
                    }
                    
                    requestQueue.push({
                        text: textoValidado,
                        resolve,
                        reject,
                        options
                    });
                    
                    processQueue();
                } catch (err) {
                    reject(err);
                }
            });
        },
        
        /**
         * Obtém sugestões para um texto
         * @param {string} text - Texto a ser analisado
         * @param {Object} options - Opções
         * @returns {Promise<Array>}
         */
        getSuggestions: async function(text, options = {}) {
            const result = await this.correct(text, options);
            return result.corrections;
        },
        
        /**
         * Aplica correções automaticamente em um elemento
         * @param {HTMLElement} element - Elemento a ser corrigido
         * @param {Object} options - Opções
         * @returns {Promise<Object>}
         */
        correctElement: async function(element, options = {}) {
            if (!element || !element.isContentEditable) {
                throw new Error('Elemento não é editável');
            }
            
            const text = element.innerText || element.textContent;
            const result = await this.correct(text, options);
            
            if (result.success && result.correctedText !== text) {
                element.innerText = result.correctedText;
                
                // Disparar eventos para frameworks
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            return result;
        },
        
        /**
         * Obtém a configuração atual
         * @returns {Object}
         */
        getConfig: function() {
            return { ...config };
        },
        
        /**
         * Verifica se a API está disponível
         * @returns {boolean}
         */
        isAvailable: function() {
            return true;
        },
        
        /**
         * Limpa o cache da API
         */
        clearCache: function() {
            _cache.clear();
            _callTimestamps = [];
            console.log('Cache da API limpo');
            return this;
        },
        
        /**
         * Adiciona palavras ao dicionário pessoal (com validação)
         * @param {string|Array} words - Palavra ou array de palavras
         */
        addToDictionary: function(words) {
            const wordList = Array.isArray(words) ? words : [words];
            
            const validas = wordList
                .filter(w => typeof w === 'string')
                .map(w => w.trim().toLowerCase())
                .filter(w => w.length > 0 && w.length <= 60 && /^[\p{L}\p{M}'-]+$/u.test(w));
            
            if (validas.length === 0) return this;
            
            chrome.storage.local.get(['dicionario_pessoal'], (res) => {
                const dic = res.dicionario_pessoal || [];
                validas.forEach(word => {
                    if (!dic.includes(word)) dic.push(word);
                });
                chrome.storage.local.set({ dicionario_pessoal: dic });
            });
            
            return this;
        }
    };
    
    // Disparar evento de carregamento da API
    window.dispatchEvent(new CustomEvent('syntaxmentor-ready', {
        detail: { version: config.version }
    }));
    
    console.log('🚀 SyntaxMentor Public API v' + config.version + ' carregada');
})();