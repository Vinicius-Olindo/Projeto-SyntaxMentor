// =============================================
// SyntaxMentor - Public API v1.0
// Permite que outros sites usem o corretor
// =============================================

(function() {
    'use strict';
    
    // Verificar se já foi inicializado
    if (window.SyntaxMentor) {
        console.warn('SyntaxMentor API já está carregada');
        return;
    }

    // Rate limiting — máx 10 chamadas/s e debounce de 300ms
    let _lastCallTime = 0;
    let _callCount = 0;
    let _callWindowStart = Date.now();
    let _debounceTimer = null;

    function _checkRateLimit() {
        const now = Date.now();
        if (now - _callWindowStart > 1000) {
            _callCount = 0;
            _callWindowStart = now;
        }
        if (_callCount >= 10) {
            throw new Error('Limite de requisições atingido (10/s). Aguarde um momento.');
        }
        _callCount++;
        _lastCallTime = now;
    }
    
    // =============================================
    // CONFIGURAÇÃO DA API
    // =============================================
    
    const config = {
        version: '2.7.1',
        language: 'pt-BR',
        pickyMode: true,
        apiUrl: 'https://api.languagetool.org/v2/check'
    };
    
    // Fila de requisições
    let requestQueue = [];
    let isProcessing = false;
    
    // =============================================
    // FUNÇÕES PRIVADAS
    // =============================================
    
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
        
        try {
            const response = await fetch(config.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return formatResponse(data, text);
        } catch (error) {
            console.error('SyntaxMentor API Error:', error);
            return {
                success: false,
                error: error.message,
                text: text
            };
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
        // Processa de trás para frente para não deslocar os offsets das correções seguintes
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
     * Processa a fila de requisições
     */
    async function processQueue() {
        if (isProcessing || requestQueue.length === 0) return;
        
        isProcessing = true;
        const { text, callback, options } = requestQueue.shift();
        
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
        
        if (callback) callback(result);
        
        isProcessing = false;
        processQueue();
    }
    
    // =============================================
    // FUNÇÕES PÚBLICAS
    // =============================================
    
    /**
     * API Pública do SyntaxMentor
     */
    window.SyntaxMentor = {
        /**
         * Versão da API
         */
        version: config.version,
        
        /**
         * Configura a API
         * @param {Object} options - Opções de configuração
         */
        configure: function(options) {
            if (options.language) config.language = options.language;
            if (options.pickyMode !== undefined) config.pickyMode = options.pickyMode;
            if (options.apiUrl) config.apiUrl = options.apiUrl;
            
            console.log('SyntaxMentor API configurada:', config);
            return this;
        },
        
        /**
         * Corrige um texto
         * @param {string} text - Texto a ser corrigido
         * @param {Object} options - Opções (callback, language, etc)
         * @returns {Promise<Object>}
         */
        correct: function(text, options = {}) {
            return new Promise((resolve, reject) => {
                if (!text || typeof text !== 'string') {
                    reject(new Error('Texto inválido'));
                    return;
                }

                // Debounce de 300ms + rate limit de 10/s
                clearTimeout(_debounceTimer);
                _debounceTimer = setTimeout(() => {
                    try { _checkRateLimit(); } catch (e) { reject(e); return; }

                const callback = (result) => {
                    if (result.success) {
                        resolve(result);
                    } else {
                        reject(new Error(result.error));
                    }
                };
                
                requestQueue.push({
                    text: text,
                    callback: callback,
                    options: options
                });

                processQueue();
                }, 300); // fim debounce
            });
        },
        
        /**
         * Corrige um texto (versão síncrona com callback)
         * @param {string} text - Texto a ser corrigido
         * @param {Object} options - Opções (callback, language, etc)
         */
        correctAsync: function(text, options = {}) {
            const callback = options.callback || function() {};
            
            if (!text || typeof text !== 'string') {
                callback({ success: false, error: 'Texto inválido' });
                return;
            }
            
            requestQueue.push({
                text: text,
                callback: callback,
                options: options
            });
            
            processQueue();
        },
        
        /**
         * Obtém sugestões para um texto
         * @param {string} text - Texto a ser analisado
         * @param {Object} options - Opções
         * @returns {Promise<Array>}
         */
        getSuggestions: async function(text, options = {}) {
            const result = await this.correct(text, options);
            if (result.success) {
                return result.corrections;
            }
            return [];
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
         * Adiciona palavras ao dicionário pessoal
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