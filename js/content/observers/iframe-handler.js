// =============================================
// SyntaxMentor - Iframe & Shadow DOM Handler
// Gerenciamento especializado de iframes e Shadow DOM
// =============================================

import { configManager } from '../core/config.js';
import { correctionEngine } from '../core/correction-engine.js';
import { queueManager } from '../core/queue-manager.js';

class IframeHandler {
    constructor() {
        this.processedIframes = new WeakSet();
        this.processedShadowRoots = new WeakSet();
        this.iframeObservers = new Map();
        this.pendingIframes = new Map();
        this.crossOriginIframes = new Set();
        
        // Configurações
        this.maxRetries = 3;
        this.retryDelay = 500;
        
        // Bind dos métodos
        this.handleIframeLoad = this.handleIframeLoad.bind(this);
        this.processIframe = this.processIframe.bind(this);
        this.observeShadowRoot = this.observeShadowRoot.bind(this);
    }
    
    /**
     * Inicializa o handler
     */
    init() {
        this.scanExistingIframes();
        this.scanExistingShadowRoots();
        this.setupMutationObserver();
        console.log('🌐 IframeHandler inicializado');
    }
    
    /**
     * Escaneia iframes existentes na página
     */
    scanExistingIframes() {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            if (!this.processedIframes.has(iframe)) {
                this.setupIframe(iframe);
            }
        });
    }
    
    /**
     * Escaneia Shadow DOMs existentes
     */
    scanExistingShadowRoots() {
        const scanElement = (element) => {
            if (element.shadowRoot && !this.processedShadowRoots.has(element.shadowRoot)) {
                this.observeShadowRoot(element.shadowRoot);
            }
            element.querySelectorAll('*').forEach(child => {
                if (child.shadowRoot && !this.processedShadowRoots.has(child.shadowRoot)) {
                    this.observeShadowRoot(child.shadowRoot);
                }
            });
        };
        
        scanElement(document.body);
    }
    
    /**
     * Configura um iframe para monitoramento
     */
    setupIframe(iframe) {
        if (this.processedIframes.has(iframe)) return;
        this.processedIframes.add(iframe);
        
        // Adicionar atributo identificador
        if (!iframe.hasAttribute('data-sm-tracked')) {
            iframe.setAttribute('data-sm-tracked', 'true');
        }
        
        // Tentar acessar imediatamente
        this.tryAccessIframe(iframe);
        
        // Listener para load
        iframe.addEventListener('load', () => this.handleIframeLoad(iframe), { once: true });
        
        // Observer para mudanças no src
        const srcObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'src') {
                    this.handleIframeSrcChange(iframe);
                }
            });
        });
        
        srcObserver.observe(iframe, { attributes: true, attributeFilter: ['src'] });
        this.iframeObservers.set(iframe, srcObserver);
    }
    
    /**
     * Tenta acessar o conteúdo do iframe
     */
    tryAccessIframe(iframe, retryCount = 0) {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            
            if (iframeDoc && iframeDoc.body) {
                // Iframe acessível
                this.crossOriginIframes.delete(iframe);
                this.processIframeContent(iframe, iframeDoc);
                return true;
            } else if (retryCount < this.maxRetries) {
                // Aguardar e tentar novamente
                setTimeout(() => {
                    this.tryAccessIframe(iframe, retryCount + 1);
                }, this.retryDelay);
                return false;
            } else {
                // Cross-origin ou inacessível
                this.crossOriginIframes.add(iframe);
                this.handleCrossOriginIframe(iframe);
                return false;
            }
        } catch (e) {
            // Erro de cross-origin
            this.crossOriginIframes.add(iframe);
            this.handleCrossOriginIframe(iframe);
            return false;
        }
    }
    
    /**
     * Processa o conteúdo de um iframe
     */
    processIframeContent(iframe, iframeDoc) {
        if (!iframeDoc.body) return;
        
        // Adicionar marcação de processamento
        iframe.setAttribute('data-sm-processed', 'true');
        
        // Encontrar campos editáveis dentro do iframe
        this.findEditableFieldsInIframe(iframeDoc);
        
        // Configurar observer para mudanças no iframe
        const iframeObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.processNewNodeInIframe(iframe, node);
                    }
                });
            });
        });
        
        iframeObserver.observe(iframeDoc.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['contenteditable']
        });
        
        this.iframeObservers.set(iframe, iframeObserver);
        
        // Processar Shadow DOMs dentro do iframe
        this.scanShadowRootsInIframe(iframeDoc);
        
        console.log(`✅ Iframe processado: ${iframe.src || 'dynamic'}`);
    }
    
    /**
     * Encontra campos editáveis dentro de um iframe
     */
    findEditableFieldsInIframe(iframeDoc) {
        const selectors = [
            'textarea',
            'input[type="text"]',
            'input[type="search"]',
            'input[type="url"]',
            'input[type="email"]',
            '[contenteditable="true"]',
            '[role="textbox"]'
        ];
        
        const fields = iframeDoc.querySelectorAll(selectors.join(','));
        fields.forEach(field => {
            this.attachIframeInputListener(field, iframeDoc);
        });
    }
    
    /**
     * Adiciona listener de input a campos dentro de iframe
     */
    attachIframeInputListener(element, iframeDoc) {
        if (element._smIframeListenerAttached) return;
        
        element._smIframeListenerAttached = true;
        
        const handleInput = (e) => {
            if (configManager.get('disabled')) return;
            
            let el = e.target;
            if (el.closest?.('[contenteditable="true"]')) {
                el = el.closest('[contenteditable="true"]');
            }
            
            // Disparar evento global com informação do iframe
            document.dispatchEvent(new CustomEvent('sm-iframe-input', {
                detail: {
                    target: el,
                    iframe: el.ownerDocument?.defaultView?.frameElement,
                    isIframe: true
                }
            }));
        };
        
        element.addEventListener('input', handleInput);
        element.addEventListener('focus', () => {
            document.dispatchEvent(new CustomEvent('sm-iframe-focus', {
                detail: { target: element, isIframe: true }
            }));
        });
    }
    
    /**
     * Processa novo nó dentro de um iframe
     */
    processNewNodeInIframe(iframe, node) {
        // Verificar se é campo editável
        const isEditable = node.tagName === 'TEXTAREA' ||
                           node.isContentEditable ||
                           node.getAttribute?.('contenteditable') === 'true' ||
                           (node.tagName === 'INPUT' && ['text', 'search', 'url', 'email'].includes(node.type));
        
        if (isEditable) {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc) {
                this.attachIframeInputListener(node, iframeDoc);
            }
        }
        
        // Verificar Shadow DOM dentro do iframe
        if (node.shadowRoot) {
            this.observeShadowRoot(node.shadowRoot, iframe);
        }
        
        // Verificar filhos
        node.querySelectorAll('*').forEach(child => {
            if (child.shadowRoot) {
                this.observeShadowRoot(child.shadowRoot, iframe);
            }
            if (child.tagName === 'IFRAME') {
                this.setupIframe(child);
            }
        });
    }
    
    /**
     * Escaneia Shadow DOMs dentro de um iframe
     */
    scanShadowRootsInIframe(iframeDoc) {
        const elements = iframeDoc.querySelectorAll('*');
        elements.forEach(el => {
            if (el.shadowRoot) {
                this.observeShadowRoot(el.shadowRoot);
            }
        });
    }
    
    /**
     * Observa um Shadow Root
     */
    observeShadowRoot(shadowRoot, parentIframe = null) {
        if (this.processedShadowRoots.has(shadowRoot)) return;
        this.processedShadowRoots.add(shadowRoot);
        
        // Encontrar campos editáveis dentro do Shadow DOM
        const selectors = [
            'textarea',
            'input[type="text"]',
            '[contenteditable="true"]',
            '[role="textbox"]'
        ];
        
        const fields = shadowRoot.querySelectorAll(selectors.join(','));
        fields.forEach(field => {
            if (parentIframe) {
                this.attachIframeInputListener(field, parentIframe.contentDocument);
            } else {
                this.attachShadowInputListener(field, shadowRoot);
            }
        });
        
        // Observer para mudanças dentro do Shadow DOM
        const shadowObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const isEditable = node.tagName === 'TEXTAREA' ||
                                           node.isContentEditable ||
                                           node.getAttribute?.('contenteditable') === 'true';
                        
                        if (isEditable) {
                            if (parentIframe) {
                                this.attachIframeInputListener(node, parentIframe.contentDocument);
                            } else {
                                this.attachShadowInputListener(node, shadowRoot);
                            }
                        }
                        
                        if (node.shadowRoot) {
                            this.observeShadowRoot(node.shadowRoot, parentIframe);
                        }
                    }
                });
            });
        });
        
        shadowObserver.observe(shadowRoot, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['contenteditable']
        });
        
        this.iframeObservers.set(shadowRoot, shadowObserver);
    }
    
    /**
     * Adiciona listener para campos em Shadow DOM
     */
    attachShadowInputListener(element, shadowRoot) {
        if (element._smShadowListenerAttached) return;
        
        element._smShadowListenerAttached = true;
        
        const handleInput = (e) => {
            if (configManager.get('disabled')) return;
            
            let el = e.target;
            if (el.closest?.('[contenteditable="true"]')) {
                el = el.closest('[contenteditable="true"]');
            }
            
            document.dispatchEvent(new CustomEvent('sm-shadow-input', {
                detail: {
                    target: el,
                    shadowRoot: shadowRoot,
                    isShadowDom: true
                }
            }));
        };
        
        element.addEventListener('input', handleInput);
        element.addEventListener('focus', () => {
            document.dispatchEvent(new CustomEvent('sm-shadow-focus', {
                detail: { target: element, isShadowDom: true }
            }));
        });
    }
    
    /**
     * Handler para iframe load
     */
    handleIframeLoad(iframe) {
        // Pequeno delay para garantir que o DOM está pronto
        setTimeout(() => {
            this.tryAccessIframe(iframe);
        }, 100);
    }
    
    /**
     * Handler para mudança de src do iframe
     */
    handleIframeSrcChange(iframe) {
        // Resetar estado do iframe
        this.processedIframes.delete(iframe);
        this.crossOriginIframes.delete(iframe);
        
        // Remover observer antigo
        const oldObserver = this.iframeObservers.get(iframe);
        if (oldObserver) {
            oldObserver.disconnect();
            this.iframeObservers.delete(iframe);
        }
        
        // Reconfigurar
        this.setupIframe(iframe);
    }
    
    /**
     * Trata iframe cross-origin (não acessível)
     */
    handleCrossOriginIframe(iframe) {
        if (!iframe.hasAttribute('data-sm-crossorigin')) {
            iframe.setAttribute('data-sm-crossorigin', 'true');
            console.debug(`🌐 Iframe cross-origin detectado: ${iframe.src || 'dynamic'}`);
        }
        
        // Tentar injetar via postMessage (se suportado)
        this.tryPostMessageInjection(iframe);
    }
    
    /**
     * Tenta injetar via postMessage em iframes cross-origin
     */
    tryPostMessageInjection(iframe) {
        // Verificar se o iframe pode receber mensagens
        const targetOrigin = this.getIframeOrigin(iframe);
        if (!targetOrigin) return;
        
        // Mensagem de saudação
        iframe.contentWindow?.postMessage({
            type: 'SYNTAXMENTOR_HANDSHAKE',
            version: '2.8.0',
            action: 'init'
        }, targetOrigin);
        
        // Listener para resposta
        const messageHandler = (event) => {
            if (event.source !== iframe.contentWindow) return;
            
            if (event.data?.type === 'SYNTAXMENTOR_READY') {
                console.log(`✅ Iframe cross-origin respondeu: ${iframe.src}`);
                iframe.setAttribute('data-sm-postmessage', 'true');
                
                // Remover listener
                window.removeEventListener('message', messageHandler);
            }
        };
        
        window.addEventListener('message', messageHandler);
    }
    
    /**
     * Obtém a origem de um iframe
     */
    getIframeOrigin(iframe) {
        try {
            const src = iframe.src;
            if (!src || src === 'about:blank') return '*';
            
            const url = new URL(src, window.location.href);
            return url.origin;
        } catch (e) {
            return '*';
        }
    }
    
    /**
     * Configura observer para novos iframes
     */
    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Verificar se é iframe
                        if (node.tagName === 'IFRAME') {
                            this.setupIframe(node);
                        }
                        
                        // Verificar iframes dentro do nó
                        node.querySelectorAll('iframe').forEach(iframe => {
                            if (!this.processedIframes.has(iframe)) {
                                this.setupIframe(iframe);
                            }
                        });
                        
                        // Verificar Shadow DOM
                        if (node.shadowRoot && !this.processedShadowRoots.has(node.shadowRoot)) {
                            this.observeShadowRoot(node.shadowRoot);
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        this.iframeObservers.set('mutationObserver', observer);
    }
    
    /**
     * Força reprocessamento de todos os iframes
     */
    reprocessAllIframes() {
        this.processedIframes = new WeakSet();
        this.scanExistingIframes();
        console.log('🔄 Todos os iframes foram reprocessados');
    }
    
    /**
     * Obtém status de todos os iframes
     */
    getIframesStatus() {
        const iframes = document.querySelectorAll('iframe');
        const status = {
            total: iframes.length,
            processed: 0,
            crossOrigin: this.crossOriginIframes.size,
            pending: 0
        };
        
        iframes.forEach(iframe => {
            if (this.processedIframes.has(iframe)) {
                status.processed++;
            } else if (this.crossOriginIframes.has(iframe)) {
                // Já contabilizado
            } else {
                status.pending++;
            }
        });
        
        return status;
    }
    
    /**
     * Envia mensagem para todos os iframes processados
     */
    broadcastToIframes(message) {
        const iframes = document.querySelectorAll('iframe[data-sm-processed="true"]');
        iframes.forEach(iframe => {
            try {
                const targetOrigin = this.getIframeOrigin(iframe);
                iframe.contentWindow?.postMessage(message, targetOrigin);
            } catch (e) {
                // Ignorar erro
            }
        });
    }
    
    /**
     * Limpa todos os observers
     */
    cleanup() {
        this.iframeObservers.forEach((observer, key) => {
            try {
                observer.disconnect();
            } catch (e) {}
        });
        this.iframeObservers.clear();
        this.processedIframes = new WeakSet();
        this.processedShadowRoots = new WeakSet();
        this.crossOriginIframes.clear();
        this.pendingIframes.clear();
        
        console.log('🌐 IframeHandler limpo');
    }
}

// Singleton
export const iframeHandler = new IframeHandler();

// Exportar classe para debugging
export { IframeHandler };