// =============================================
// SyntaxMentor - Keyboard Manager
// Sistema centralizado de gerenciamento de atalhos
// =============================================

import { configManager } from '../core/config.js';
import { correctionEngine } from '../core/correction-engine.js';
import { panelUI } from '../ui/panel.js';
import { bubbleUI } from '../ui/bubble.js';
import { feedbackUI } from '../ui/feedback.js';
import { undoManager } from '../features/undo-manager.js';

class KeyboardManager {
    constructor() {
        this.isEnabled = true;
        this.shortcuts = {
            undo: { ctrlKey: true, altKey: false, shiftKey: false, key: 'z', description: 'Desfazer' },
            redo: { ctrlKey: true, altKey: false, shiftKey: true, key: 'z', description: 'Refazer' },
            closePanel: { ctrlKey: false, altKey: false, shiftKey: false, key: 'Escape', description: 'Fechar painel' },
            nextError: { ctrlKey: false, altKey: false, shiftKey: false, key: 'ArrowDown', description: 'Próximo erro' },
            prevError: { ctrlKey: false, altKey: false, shiftKey: false, key: 'ArrowUp', description: 'Erro anterior' },
            applySuggestion: { ctrlKey: false, altKey: false, shiftKey: false, key: 'Enter', description: 'Aplicar sugestão' },
            togglePanel: null,
            ignoreAll: null,
            fixAll: null,
            activate: null,
            deactivate: null
        };
        
        this.handleKeydown = this.handleKeydown.bind(this);
    }
    
    init() {
        this.loadShortcuts();
        this.setupEventListeners();
        console.log('⌨️ KeyboardManager inicializado');
    }
    
    loadShortcuts() {
        const shortcutKeys = ['toggleShortcut', 'ignoreShortcut', 'corrigirTudoShortcut', 'ativarShortcut', 'desativarShortcut'];
        
        chrome.storage.local.get(shortcutKeys, (res) => {
            this.shortcuts.togglePanel = res.toggleShortcut || { altKey: true, ctrlKey: false, shiftKey: false, key: 's', display: 'Alt + S' };
            this.shortcuts.ignoreAll = res.ignoreShortcut || { altKey: true, ctrlKey: false, shiftKey: false, key: 'i', display: 'Alt + I' };
            this.shortcuts.fixAll = res.corrigirTudoShortcut || { altKey: true, ctrlKey: false, shiftKey: true, key: 's', display: 'Alt + Shift + S' };
            this.shortcuts.activate = res.ativarShortcut || { altKey: true, ctrlKey: false, shiftKey: true, key: 'a', display: 'Alt + Shift + A' };
            this.shortcuts.deactivate = res.desativarShortcut || { altKey: true, ctrlKey: false, shiftKey: true, key: 'd', display: 'Alt + Shift + D' };
        });
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', this.handleKeydown, true);
    }
    
    handleKeydown(e) {
        if (!this.isEnabled) return;
        if (configManager.get('disabled')) return;
        
        if (this.shouldIgnoreEvent(e)) return;
        
        if (this.checkFixedShortcut(e)) return;
        if (this.checkCustomShortcut(e)) return;
    }
    
    shouldIgnoreEvent(e) {
        if (e.target.closest && e.target.closest('#syntax-mentor-painel, #syntax-mentor-bubble')) return false;
        
        const isTyping = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;
        
        if (isTyping) {
            const hasAlt = e.altKey;
            const isUndo = (e.ctrlKey && e.key.toLowerCase() === 'z');
            const isRedo = (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') || (e.ctrlKey && e.key.toLowerCase() === 'y');
            return !(hasAlt || isUndo || isRedo);
        }
        
        return false;
    }
    
    checkFixedShortcut(e) {
        if (this.matchShortcut(e, this.shortcuts.undo)) {
            e.preventDefault();
            e.stopPropagation();
            undoManager.undo();
            return true;
        }
        
        if (this.matchShortcut(e, this.shortcuts.redo)) {
            e.preventDefault();
            e.stopPropagation();
            undoManager.redo();
            return true;
        }
        
        if (this.matchShortcut(e, this.shortcuts.closePanel)) {
            if (panelUI.isAberto()) {
                e.preventDefault();
                e.stopPropagation();
                panelUI.fechar();
                feedbackUI.mostrarFeedback('Painel fechado', 'info', 1000);
                return true;
            }
            return false;
        }
        
        if (this.matchShortcut(e, this.shortcuts.nextError) && panelUI.isAberto()) {
            e.preventDefault();
            e.stopPropagation();
            this.navigateToNextError();
            return true;
        }
        
        if (this.matchShortcut(e, this.shortcuts.prevError) && panelUI.isAberto()) {
            e.preventDefault();
            e.stopPropagation();
            this.navigateToPrevError();
            return true;
        }
        
        if (this.matchShortcut(e, this.shortcuts.applySuggestion) && panelUI.isAberto()) {
            e.preventDefault();
            e.stopPropagation();
            this.applyCurrentSuggestion();
            return true;
        }
        
        return false;
    }
    
    checkCustomShortcut(e) {
        if (this.shortcuts.togglePanel && this.matchShortcut(e, this.shortcuts.togglePanel)) {
            e.preventDefault();
            e.stopPropagation();
            this.togglePanel();
            return true;
        }
        
        if (this.shortcuts.ignoreAll && this.matchShortcut(e, this.shortcuts.ignoreAll)) {
            e.preventDefault();
            e.stopPropagation();
            this.ignoreAllErrors();
            return true;
        }
        
        if (this.shortcuts.fixAll && this.matchShortcut(e, this.shortcuts.fixAll)) {
            e.preventDefault();
            e.stopPropagation();
            this.fixAllErrors();
            return true;
        }
        
        if (this.shortcuts.activate && this.matchShortcut(e, this.shortcuts.activate)) {
            e.preventDefault();
            e.stopPropagation();
            this.activateExtension();
            return true;
        }
        
        if (this.shortcuts.deactivate && this.matchShortcut(e, this.shortcuts.deactivate)) {
            e.preventDefault();
            e.stopPropagation();
            this.deactivateExtension();
            return true;
        }
        
        return false;
    }
    
    matchShortcut(e, shortcut) {
        if (!shortcut) return false;
        return e.ctrlKey === (shortcut.ctrlKey || false) &&
               e.altKey === (shortcut.altKey || false) &&
               e.shiftKey === (shortcut.shiftKey || false) &&
               e.key.toLowerCase() === shortcut.key.toLowerCase();
    }
    
    togglePanel() {
        const errors = correctionEngine.getErrors();
        if (errors.length === 0) {
            feedbackUI.mostrarFeedback('✅ Nenhum erro encontrado', 'info', 1500);
            return;
        }
        
        if (panelUI.isAberto()) {
            panelUI.fechar();
        } else {
            panelUI.exibir();
        }
    }
    
    ignoreAllErrors() {
        const errors = correctionEngine.getErrors();
        if (errors.length === 0) {
            feedbackUI.mostrarFeedback('📭 Nenhum erro para ignorar', 'info', 1500);
            return;
        }
        
        const elemento = correctionEngine.getCurrentElement();
        if (elemento && elemento.isContentEditable && !correctionEngine.isSiteRestrito()) {
            elemento.innerHTML = elemento.innerHTML.replace(/<mark class="sm-highlight">(.*?)<\/mark>/gi, '$1');
            correctionEngine.atualizarElementoComEventos(elemento);
        }
        
        correctionEngine.clear();
        bubbleUI.atualizarAparencia();
        
        if (panelUI.isAberto()) panelUI.fechar();
        feedbackUI.mostrarFeedback(`🧹 ${errors.length} erro(s) ignorado(s)`, 'success', 2000);
    }
    
    fixAllErrors() {
        const errors = correctionEngine.getErrors();
        if (errors.length === 0) {
            feedbackUI.mostrarFeedback('✅ Nenhum erro para corrigir', 'info', 1500);
            return;
        }
        
        correctionEngine.corrigirTudo();
        bubbleUI.animateCorrection();
        feedbackUI.mostrarFeedback(`✨ ${errors.length} correção(ões) aplicada(s)!`, 'success', 2000);
    }
    
    activateExtension() {
        if (!configManager.get('disabled')) {
            feedbackUI.mostrarFeedback('✅ SyntaxMentor já está ATIVADO', 'info');
            return;
        }
        
        configManager.saveConfig('disabled', false);
        
        const host = window.location.hostname;
        chrome.storage.local.get(['userBlacklistOverrides'], (res) => {
            const overrides = res.userBlacklistOverrides || [];
            const index = overrides.indexOf(host);
            if (index > -1) {
                overrides.splice(index, 1);
                chrome.storage.local.set({ userBlacklistOverrides: overrides });
            }
        });
        
        const campoAtivo = document.activeElement;
        if (campoAtivo && (campoAtivo.tagName === 'TEXTAREA' || campoAtivo.tagName === 'INPUT' || campoAtivo.isContentEditable)) {
            const texto = campoAtivo.value || campoAtivo.textContent || '';
            if (texto.trim().length > 1) correctionEngine.verificarTexto(texto, campoAtivo);
        }
        
        bubbleUI.atualizarAparencia();
        feedbackUI.mostrarFeedback('✅ SyntaxMentor ATIVADO neste site', 'success');
        bubbleUI.blink();
    }
    
    deactivateExtension() {
        if (configManager.get('disabled')) {
            feedbackUI.mostrarFeedback('⛔ SyntaxMentor já está DESATIVADO', 'info');
            return;
        }
        
        configManager.saveConfig('disabled', true);
        
        const host = window.location.hostname;
        chrome.storage.local.get(['userBlacklistOverrides'], (res) => {
            const overrides = res.userBlacklistOverrides || [];
            if (!overrides.includes(host)) {
                overrides.push(host);
                chrome.storage.local.set({ userBlacklistOverrides: overrides });
            }
        });
        
        const elemento = correctionEngine.getCurrentElement();
        if (elemento && elemento.isContentEditable && !correctionEngine.isSiteRestrito()) {
            elemento.innerHTML = elemento.innerHTML.replace(/<mark class="sm-highlight">(.*?)<\/mark>/gi, '$1');
            correctionEngine.atualizarElementoComEventos(elemento);
        }
        
        correctionEngine.clear();
        if (panelUI.isAberto()) panelUI.fechar();
        bubbleUI.atualizarAparencia();
        feedbackUI.mostrarFeedback('⛔ SyntaxMentor DESATIVADO neste site', 'info');
    }
    
    navigateToNextError() {
        const botoes = document.querySelectorAll('#syntax-mentor-painel .btn-sugestao');
        if (botoes.length === 0) return;
        
        const currentIndex = Array.from(botoes).findIndex(btn => btn === document.activeElement);
        const nextIndex = (currentIndex + 1) % botoes.length;
        botoes[nextIndex].focus();
        botoes[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    navigateToPrevError() {
        const botoes = document.querySelectorAll('#syntax-mentor-painel .btn-sugestao');
        if (botoes.length === 0) return;
        
        const currentIndex = Array.from(botoes).findIndex(btn => btn === document.activeElement);
        const prevIndex = (currentIndex - 1 + botoes.length) % botoes.length;
        botoes[prevIndex].focus();
        botoes[prevIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    applyCurrentSuggestion() {
        const btnAtivo = document.activeElement;
        if (btnAtivo && btnAtivo.classList && btnAtivo.classList.contains('btn-sugestao')) {
            btnAtivo.click();
        }
    }
    
    destroy() {
        document.removeEventListener('keydown', this.handleKeydown, true);
    }
}

export const keyboardManager = new KeyboardManager();