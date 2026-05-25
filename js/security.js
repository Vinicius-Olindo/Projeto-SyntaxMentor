// =============================================
// SyntaxMentor - Security Module v1.0
// Proteção contra injeção e roubo de dados
// =============================================

(function() {
    'use strict';
    
    // =============================================
    // SANITIZAÇÃO DE ENTRADA
    // =============================================
    
    /**
     * Sanitiza texto para evitar XSS
     * @param {string} texto - Texto a ser sanitizado
     * @returns {string}
     */
    function sanitizeInput(texto) {
        if (!texto || typeof texto !== 'string') return '';
        
        // Remove caracteres potencialmente perigosos
        return texto
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/`/g, '&#96;')
            .replace(/\//g, '&#47;')
            .replace(/\\/g, '&#92;');
    }
    
    /**
     * Valida se é uma palavra segura (apenas letras, números, hífen, apóstrofo)
     * @param {string} palavra - Palavra a validar
     * @returns {boolean}
     */
    function isValidWord(palavra) {
        if (!palavra || typeof palavra !== 'string') return false;
        if (palavra.length > 60) return false;
        // Apenas letras (incluindo acentos), números, hífen, apóstrofo
        return /^[\p{L}\p{N}\-'’]+$/u.test(palavra);
    }
    
    /**
     * Valida domínio (blacklist/whitelist)
     * @param {string} dominio - Domínio a validar
     * @returns {boolean}
     */
    function isValidDomain(dominio) {
        if (!dominio || typeof dominio !== 'string') return false;
        if (dominio.length > 255) return false;
        // Formato de domínio válido
        return /^[a-zA-Z0-9][a-zA-Z0-9.-]*[a-zA-Z0-9]$/.test(dominio);
    }
    
    // =============================================
    // VALIDAÇÃO DE STORAGE
    // =============================================
    
    /**
     * Valida dados antes de salvar no storage
     * @param {Object} dados - Dados a serem validados
     * @returns {Object}
     */
    function validateStorageData(dados) {
        const validados = {};
        
        // Validar dicionário pessoal
        if (dados.dicionario_pessoal && Array.isArray(dados.dicionario_pessoal)) {
            validados.dicionario_pessoal = dados.dicionario_pessoal
                .filter(word => isValidWord(word))
                .slice(0, 500); // Limite de 500 palavras
        }
        
        // Validar blacklist
        if (dados.blacklist && Array.isArray(dados.blacklist)) {
            validados.blacklist = dados.blacklist
                .filter(domain => isValidDomain(domain))
                .slice(0, 200); // Limite de 200 sites
        }
        
        // Validar whitelist
        if (dados.whitelist && Array.isArray(dados.whitelist)) {
            validados.whitelist = dados.whitelist
                .filter(domain => isValidDomain(domain))
                .slice(0, 200);
        }
        
        // Validar idioma
        const idiomasValidos = ['pt-BR', 'en-US', 'es', 'fr', 'de', 'it'];
        if (dados.language && idiomasValidos.includes(dados.language)) {
            validados.language = dados.language;
        }
        
        // Validar API URL
        if (dados.apiUrl && typeof dados.apiUrl === 'string') {
            const urlValida = /^https?:\/\/[a-zA-Z0-9.-]+(:[0-9]+)?(\/.*)?$/.test(dados.apiUrl);
            if (urlValida && dados.apiUrl.length < 200) {
                validados.apiUrl = dados.apiUrl;
            }
        }
        
        return validados;
    }
    
    // =============================================
    // PROTEÇÃO DE API
    // =============================================
    
    // Rate limiting por domínio
    const rateLimitMap = new Map();
    const RATE_LIMIT = 50; // requisições por minuto
    const RATE_WINDOW = 60000; // 1 minuto
    
    /**
     * Verifica rate limit para um domínio
     * @param {string} dominio - Domínio da requisição
     * @returns {boolean}
     */
    function checkRateLimit(dominio) {
        const now = Date.now();
        const record = rateLimitMap.get(dominio) || { count: 0, resetTime: now + RATE_WINDOW };
        
        if (now > record.resetTime) {
            record.count = 0;
            record.resetTime = now + RATE_WINDOW;
        }
        
        if (record.count >= RATE_LIMIT) {
            return false;
        }
        
        record.count++;
        rateLimitMap.set(dominio, record);
        return true;
    }
    
    /**
     * Verifica se a origem da requisição é confiável
     * @param {string} origem - Origem da requisição
     * @returns {boolean}
     */
    function isTrustedOrigin(origem) {
        if (!origem) return false;
        
        // Origens confiáveis permitidas
        const trustedOrigins = [
            'https://api.languagetool.org',
            'https://*.digisac.com.br',
            'https://*.digisac.io',
            'https://*.blip.ai',
            'https://*.take.io'
        ];
        
        // Permite localhost para desenvolvimento
        if (origem.startsWith('http://localhost') || origem.startsWith('http://127.0.0.1')) {
            return true;
        }
        
        return trustedOrigins.some(trusted => {
            if (trusted.includes('*')) {
                const pattern = trusted.replace('*.', '');
                return origem.includes(pattern);
            }
            return origem === trusted;
        });
    }
    
    // =============================================
    // PROTEÇÃO DE EVENTOS
    // =============================================
    
    /**
     * Previne injeção de eventos maliciosos
     * @param {Event} event - Evento do DOM
     * @returns {boolean}
     */
    function isSafeEvent(event) {
        if (!event || !event.target) return false;
        
        // Prevenir eventos de elementos maliciosos
        const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form'];
        let target = event.target;
        
        while (target && target !== document.body) {
            if (dangerousTags.includes(target.tagName?.toLowerCase())) {
                return false;
            }
            target = target.parentElement;
        }
        
        return true;
    }
    
    // =============================================
    // PROTEÇÃO DE MENSAGENS
    // =============================================
    
    /**
     * Valida mensagem recebida
     * @param {Object} message - Mensagem recebida
     * @returns {boolean}
     */
    function isValidMessage(message) {
        if (!message || typeof message !== 'object') return false;
        
        // Actions permitidas
        const allowedActions = [
            'togglePainel', 'ignorarErroAtual', 'getErrosAtivos',
            'aplicarCorrecaoPopup', 'revisarSelecao', 'ignorarTemporariamente',
            'corrigirTudo', 'revisarPaginaInteira', 'toggleSite', 'siteToggled',
            'ping', 'updateBadge', 'resetBadge', 'checkBlacklist', 'exportData',
            'detectLanguage', 'toggleSiteGlobal', 'checkGrammar'
        ];
        
        if (!allowedActions.includes(message.action)) {
            return false;
        }
        
        // Validar tamanho do texto
        if (message.text && message.text.length > 10000) {
            return false;
        }
        
        return true;
    }
    
    // =============================================
    // EXPORTAÇÃO DOS MÉTODOS
    // =============================================
    
    window.SyntaxMentorSecurity = {
        sanitizeInput,
        isValidWord,
        isValidDomain,
        validateStorageData,
        checkRateLimit,
        isTrustedOrigin,
        isSafeEvent,
        isValidMessage
    };
    
    // =============================================
    // INICIALIZAÇÃO DAS PROTEÇÕES
    // =============================================
    
    function initSecurity() {
        // Proteger contra eventos maliciosos
        document.addEventListener('click', (e) => {
            if (!isSafeEvent(e)) {
                e.preventDefault();
                e.stopPropagation();
                console.warn('[SyntaxMentor] Evento bloqueado por segurança');
            }
        }, true);
        
        // Prevenir injeção de DOM
        const originalInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
        if (originalInnerHTML) {
            Object.defineProperty(Element.prototype, 'innerHTML', {
                get: originalInnerHTML.get,
                set: function(value) {
                    if (typeof value === 'string' && (
                        value.includes('<script') ||
                        value.includes('javascript:') ||
                        value.includes('onload=') ||
                        value.includes('onerror=')
                    )) {
                        console.warn('[SyntaxMentor] Tentativa de injeção bloqueada');
                        return;
                    }
                    originalInnerHTML.set.call(this, value);
                }
            });
        }
        
        console.log('[SyntaxMentor] Módulo de segurança ativado');
    }
    
    // Inicializar
    initSecurity();
})();