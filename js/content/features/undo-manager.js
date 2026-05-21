// =============================================
// SyntaxMentor - Undo/Redo Manager
// Sistema completo de histórico de correções
// =============================================

import { feedbackUI } from '../ui/feedback.js';

class UndoManager {
    constructor() {
        this.history = [];
        this.redoStack = [];
        this.maxHistorySize = 50;
        this.isProcessing = false;
        this.listeners = [];
        
        this.saveState = this.saveState.bind(this);
        this.undo = this.undo.bind(this);
        this.redo = this.redo.bind(this);
    }
    
    init() {
        this.loadFromStorage();
        console.log('↩️ UndoManager inicializado');
    }
    
    saveState(element, originalText, correctedText, metadata = {}) {
        if (this.isProcessing) return;
        if (!element || !originalText || !correctedText) return;
        
        const action = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            element: element,
            originalText: originalText,
            correctedText: correctedText,
            metadata: { ruleId: metadata.ruleId || 'unknown', category: metadata.category || 'Correção' }
        };
        
        this.history.push(action);
        if (this.history.length > this.maxHistorySize) this.history.shift();
        
        this.redoStack = [];
        this.saveToStorage();
        this.notifyListeners();
        
        if (this.history.length === 1 || this.history.length % 5 === 0) {
            feedbackUI.mostrarFeedback('💡 Dica: Use Ctrl+Z para desfazer', 'info', 3000);
        }
    }
    
    saveGroupState(actions, groupName = 'Correção em lote') {
        if (this.isProcessing) return;
        if (!actions || actions.length === 0) return;
        
        const groupAction = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            isGroup: true,
            groupName: groupName,
            actions: actions,
            metadata: { category: 'Correção em lote', actionCount: actions.length }
        };
        
        this.history.push(groupAction);
        if (this.history.length > this.maxHistorySize) this.history.shift();
        
        this.redoStack = [];
        this.saveToStorage();
        this.notifyListeners();
    }
    
    async undo() {
        if (this.history.length === 0) {
            feedbackUI.mostrarFeedback('📭 Nada para desfazer', 'info', 1500);
            return false;
        }
        
        this.isProcessing = true;
        
        try {
            const action = this.history.pop();
            
            if (!action.element || !document.contains(action.element)) {
                feedbackUI.mostrarFeedback('⚠️ Elemento não está mais disponível', 'info', 1500);
                this.isProcessing = false;
                return false;
            }
            
            const textToRestore = action.isGroup ? action.actions[0]?.originalText : action.originalText;
            const success = this.restoreState(action.element, textToRestore);
            
            if (success) {
                this.redoStack.push(action);
                this.saveToStorage();
                this.notifyListeners();
                this.animateUndo(action.element);
                return true;
            }
        } catch (error) {
            console.error('Erro ao desfazer:', error);
        } finally {
            this.isProcessing = false;
        }
        
        return false;
    }
    
    async redo() {
        if (this.redoStack.length === 0) {
            feedbackUI.mostrarFeedback('📭 Nada para refazer', 'info', 1500);
            return false;
        }
        
        this.isProcessing = true;
        
        try {
            const action = this.redoStack.pop();
            
            if (!action.element || !document.contains(action.element)) {
                feedbackUI.mostrarFeedback('⚠️ Elemento não está mais disponível', 'info', 1500);
                this.isProcessing = false;
                return false;
            }
            
            const textToRestore = action.isGroup ? action.actions[0]?.correctedText : action.correctedText;
            const success = this.restoreState(action.element, textToRestore);
            
            if (success) {
                this.history.push(action);
                this.saveToStorage();
                this.notifyListeners();
                this.animateRedo(action.element);
                return true;
            }
        } catch (error) {
            console.error('Erro ao refazer:', error);
        } finally {
            this.isProcessing = false;
        }
        
        return false;
    }
    
    restoreState(element, text) {
        try {
            if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
                element.value = text;
                this.dispatchNativeEvents(element);
            } else if (element.isContentEditable) {
                element.innerHTML = text;
                this.dispatchNativeEvents(element);
            }
            return true;
        } catch (error) {
            console.error('Erro ao restaurar estado:', error);
            return false;
        }
    }
    
    dispatchNativeEvents(element) {
        const events = [new Event('input', { bubbles: true }), new Event('change', { bubbles: true })];
        events.forEach(event => { try { element.dispatchEvent(event); } catch (e) {} });
    }
    
    animateUndo(element) {
        const originalTransition = element.style.transition;
        element.style.transition = 'background-color 0.3s ease';
        element.style.backgroundColor = '#fef3c7';
        setTimeout(() => {
            element.style.backgroundColor = '';
            setTimeout(() => { element.style.transition = originalTransition; }, 300);
        }, 300);
    }
    
    animateRedo(element) {
        const originalTransition = element.style.transition;
        element.style.transition = 'background-color 0.3s ease';
        element.style.backgroundColor = '#d1fae5';
        setTimeout(() => {
            element.style.backgroundColor = '';
            setTimeout(() => { element.style.transition = originalTransition; }, 300);
        }, 300);
    }
    
    clear() {
        this.history = [];
        this.redoStack = [];
        this.saveToStorage();
        this.notifyListeners();
        feedbackUI.mostrarFeedback('🗑️ Histórico limpo!', 'info', 1500);
    }
    
    getHistory() {
        return [...this.history];
    }
    
    getStats() {
        return {
            totalActions: this.history.length,
            availableUndo: this.history.length,
            availableRedo: this.redoStack.length,
            maxHistorySize: this.maxHistorySize
        };
    }
    
    canUndo() { return this.history.length > 0; }
    canRedo() { return this.redoStack.length > 0; }
    
    addListener(callback) { this.listeners.push(callback); }
    removeListener(callback) { const i = this.listeners.indexOf(callback); if (i > -1) this.listeners.splice(i, 1); }
    
    notifyListeners() {
        const stats = this.getStats();
        this.listeners.forEach(cb => { try { cb(stats); } catch (e) {} });
    }
    
    saveToStorage() {
        try {
            const historyToSave = this.history.map(a => ({
                id: a.id, timestamp: a.timestamp, isGroup: a.isGroup,
                groupName: a.groupName, originalText: a.originalText,
                correctedText: a.correctedText, metadata: a.metadata
            }));
            chrome.storage.local.set({ undoHistory: historyToSave });
        } catch (e) {}
    }
    
    loadFromStorage() {
        chrome.storage.local.get(['undoHistory'], (res) => {
            if (res.undoHistory && Array.isArray(res.undoHistory)) {
                this.history = res.undoHistory.map(a => ({ ...a, element: null }));
                this.notifyListeners();
            }
        });
    }
}

export const undoManager = new UndoManager();