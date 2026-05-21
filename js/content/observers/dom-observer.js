// =============================================
// SyntaxMentor - DOM Observer
// Gerenciamento de Shadow DOM, iframes e elementos dinâmicos
// =============================================

import { configManager } from '../core/config.js';
import { correctionEngine } from '../core/correction-engine.js';

class DOMObserver {
    constructor() {
        this.observers = [];
        this.processedIframes = new WeakSet();
        this.processedShadowRoots = new WeakSet();
        this.isProcessing = false;
        this.debounceTimer = null;
        this.mutationBuffer = [];
        this.isInitialized = false;
        
        this.handleMutations = this.handleMutations.bind(this);
        this.processNewNode = this.processNewNode.bind(this);
    }
    
    init() {
        if (this.isInitialized) return;
        
        this.observeDocument();
        this.processExistingElements();
        this.setupIframeObserver();
        
        this.isInitialized = true;
        console.log('🌳 DOMObserver inicializado');
    }
    
    observeDocument() {
        const bodyObserver = new MutationObserver(this.handleMutations);
        bodyObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['contenteditable']
        });
        this.observers.push(bodyObserver);
        
        this.observeShadowRoots(document.body);
    }
    
    processExistingElements() {
        document.querySelectorAll('iframe').forEach(iframe => {
            if (!this.processedIframes.has(iframe)) this.setupIframe(iframe);
        });
        
        this.findAndObserveEditableFields(document.body);
        this.findAllShadowRoots(document.body);
    }
    
    findAndObserveEditableFields(root) {
        const selectors = ['textarea', 'input[type="text"]', 'input[type="search"]', 'input[type="url"]', 'input[type="email"]', '[contenteditable="true"]', '[role="textbox"]'];
        const fields = root.querySelectorAll(selectors.join(','));
        fields.forEach(field => this.attachInputListener(field));
    }
    
    attachInputListener(element) {
        if (element._smListenerAttached) return;
        
        element._smListenerAttached = true;
        element.addEventListener('input', this.handleInput.bind(this));
        element.addEventListener('focus', this.handleFocus.bind(this));
    }
    
    handleInput(e) {
        if (configManager.get('disabled')) return;
        
        let el = e.target;
        if (el.closest?.('[contenteditable="true"]')) el = el.closest('[contenteditable="true"]');
        
        if (this.isEditableElement(el)) {
            document.dispatchEvent(new CustomEvent('sm-input', { detail: { target: el } }));
        }
    }
    
    handleFocus(e) {
        if (configManager.get('disabled')) return;
        
        let el = e.target;
        if (el.closest?.('[contenteditable="true"]')) el = el.closest('[contenteditable="true"]');
        
        if (this.isEditableElement(el)) {
            document.dispatchEvent(new CustomEvent('sm-focus', { detail: { target: el } }));
        }
    }
    
    isEditableElement(el) {
        return el.tagName === 'TEXTAREA' ||
               el.isContentEditable ||
               el.getAttribute?.('contenteditable') === 'true' ||
               el.getAttribute?.('role') === 'textbox' ||
               (el.tagName === 'INPUT' && ['text', 'search', 'url', 'email'].includes(el.type));
    }
    
    handleMutations(mutations) {
        clearTimeout(this.debounceTimer);
        this.mutationBuffer.push(...mutations);
        
        this.debounceTimer = setTimeout(() => {
            this.processMutations();
            this.mutationBuffer = [];
        }, 150);
    }
    
    processMutations() {
        if (this.isProcessing) return;
        this.isProcessing = true;
        
        try {
            const uniqueNodes = new Set();
            
            this.mutationBuffer.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) uniqueNodes.add(node);
                });
                
                if (mutation.type === 'attributes' && mutation.attributeName === 'contenteditable') {
                    if (mutation.target && this.isEditableElement(mutation.target)) {
                        this.attachInputListener(mutation.target);
                    }
                }
            });
            
            uniqueNodes.forEach(node => this.processNewNode(node));
        } finally {
            this.isProcessing = false;
        }
    }
    
    processNewNode(node) {
        if (!node || node.nodeType !== Node.ELEMENT_NODE) return;
        
        if (node.tagName === 'IFRAME') this.setupIframe(node);
        if (node.shadowRoot) this.observeShadowRoot(node.shadowRoot);
        
        this.findAndObserveEditableFields(node);
        
        node.querySelectorAll('*').forEach(child => {
            if (child.shadowRoot) this.observeShadowRoot(child.shadowRoot);
            if (child.tagName === 'IFRAME' && !this.processedIframes.has(child)) this.setupIframe(child);
        });
    }
    
    setupIframe(iframe) {
        if (this.processedIframes.has(iframe)) return;
        this.processedIframes.add(iframe);
        
        this.tryAccessIframe(iframe);
        iframe.addEventListener('load', () => this.handleIframeLoad(iframe), { once: true });
        
        const srcObserver = new MutationObserver((mutations) => {
            mutations.forEach(() => {
                this.processedIframes.delete(iframe);
                this.setupIframe(iframe);
            });
        });
        srcObserver.observe(iframe, { attributes: true, attributeFilter: ['src'] });
        this.observers.push(srcObserver);
    }
    
    tryAccessIframe(iframe) {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (iframeDoc && iframeDoc.body) this.observeIframeContent(iframe, iframeDoc);
        } catch (e) {
            console.debug('Não foi possível acessar iframe (cross-origin):', e.message);
        }
    }
    
    handleIframeLoad(iframe) {
        this.tryAccessIframe(iframe);
    }
    
    observeIframeContent(iframe, iframeDoc) {
        if (!iframeDoc.body) return;
        
        const iframeObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) this.processNewNodeInIframe(iframe, node);
                });
            });
        });
        iframeObserver.observe(iframeDoc.body, { childList: true, subtree: true });
        this.observers.push(iframeObserver);
        
        this.findAndObserveEditableFields(iframeDoc.body);
        this.findAllShadowRoots(iframeDoc.body);
    }
    
    processNewNodeInIframe(iframe, node) {
        if (this.isEditableElement(node)) this.attachInputListener(node);
        if (node.shadowRoot) this.observeShadowRoot(node.shadowRoot);
        
        node.querySelectorAll('*').forEach(child => {
            if (child.shadowRoot) this.observeShadowRoot(child.shadowRoot);
        });
    }
    
    setupIframeObserver() {
        const iframeObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName === 'IFRAME') this.setupIframe(node);
                        node.querySelectorAll('iframe').forEach(iframe => {
                            if (!this.processedIframes.has(iframe)) this.setupIframe(iframe);
                        });
                    }
                });
            });
        });
        iframeObserver.observe(document.body, { childList: true, subtree: true });
        this.observers.push(iframeObserver);
    }
    
    findAllShadowRoots(root) {
        root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) this.observeShadowRoot(el.shadowRoot);
        });
    }
    
    observeShadowRoot(shadowRoot) {
        if (this.processedShadowRoots.has(shadowRoot)) return;
        this.processedShadowRoots.add(shadowRoot);
        
        const fields = shadowRoot.querySelectorAll('textarea, input[type="text"], [contenteditable="true"], [role="textbox"]');
        fields.forEach(field => this.attachInputListener(field));
        
        const shadowObserver = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (this.isEditableElement(node)) this.attachInputListener(node);
                        if (node.shadowRoot) this.observeShadowRoot(node.shadowRoot);
                    }
                });
            });
        });
        shadowObserver.observe(shadowRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['contenteditable'] });
        this.observers.push(shadowObserver);
    }
    
    observeShadowRoots(root) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.shadowRoot) this.observeShadowRoot(node.shadowRoot);
                        node.querySelectorAll('*').forEach(child => {
                            if (child.shadowRoot && !this.processedShadowRoots.has(child.shadowRoot)) {
                                this.observeShadowRoot(child.shadowRoot);
                            }
                        });
                    }
                });
            });
        });
        observer.observe(root, { childList: true, subtree: true });
        this.observers.push(observer);
    }
    
    disconnect() {
        this.observers.forEach(observer => { try { observer.disconnect(); } catch (e) {} });
        this.observers = [];
        this.processedIframes = new WeakSet();
        this.processedShadowRoots = new WeakSet();
        this.isInitialized = false;
        console.log('🌳 DOMObserver desconectado');
    }
    
    restart() {
        this.disconnect();
        this.init();
    }
}

export const domObserver = new DOMObserver();