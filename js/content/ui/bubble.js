// =============================================
// SyntaxMentor - Bubble UI
// Gerenciamento da bolinha flutuante
// =============================================

import { configManager } from '../core/config.js';
import { correctionEngine } from '../core/correction-engine.js';
import { panelUI } from './panel.js';
import { feedbackUI } from './feedback.js';

class BubbleUI {
    constructor() {
        this.bubbleElement = null;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.bubblePosX = null;
        this.bubblePosY = null;
        this.isVisible = true;
        
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleClick = this.handleClick.bind(this);
    }
    
    criar() {
        if (this.bubbleElement && document.getElementById('syntax-mentor-bubble')) {
            this.bubbleElement = document.getElementById('syntax-mentor-bubble');
            return;
        }
        
        this.bubbleElement = document.createElement('div');
        this.bubbleElement.id = 'syntax-mentor-bubble';
        this.bubbleElement.title = 'SyntaxMentor - Clique para ver sugestões';
        this.bubbleElement.setAttribute('aria-label', 'SyntaxMentor - Corretor Ortográfico');
        
        this.bubbleElement.style.cssText = `
            position: fixed;
            z-index: 2147483646;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: grab;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            transition: transform 0.2s, opacity 0.2s, background-color 0.3s;
            font-family: 'Segoe UI', system-ui, sans-serif;
            user-select: none;
            will-change: transform, left, top;
        `;
        
        document.body.appendChild(this.bubbleElement);
        
        this.setupEventListeners();
        this.carregarPosicao();
        this.aplicarTema();
        this.atualizarAparencia();
        
        console.log('🎈 Bolha do SyntaxMentor criada');
    }
    
    setupEventListeners() {
        this.bubbleElement.addEventListener('mousedown', this.handleMouseDown);
        this.bubbleElement.addEventListener('click', this.handleClick);
        this.bubbleElement.addEventListener('dragstart', (e) => e.preventDefault());
    }
    
    handleMouseDown(e) {
        e.preventDefault();
        
        this.isDragging = false;
        this.dragStartX = e.clientX;
        this.dragStartY = e.clientY;
        
        this.bubbleElement.style.cursor = 'grabbing';
        
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        
        this.bubbleElement.classList.add('sm-bubble-dragging');
    }
    
    handleMouseMove(e) {
        const dx = Math.abs(e.clientX - this.dragStartX);
        const dy = Math.abs(e.clientY - this.dragStartY);
        
        if (dx > 5 || dy > 5) {
            this.isDragging = true;
            
            const rect = this.bubbleElement.getBoundingClientRect();
            let newLeft = rect.left + (e.clientX - this.dragStartX);
            let newTop = rect.top + (e.clientY - this.dragStartY);
            
            const maxLeft = window.innerWidth - rect.width - 10;
            const maxTop = window.innerHeight - rect.height - 10;
            
            newLeft = Math.max(10, Math.min(newLeft, maxLeft));
            newTop = Math.max(10, Math.min(newTop, maxTop));
            
            this.bubbleElement.style.left = `${newLeft}px`;
            this.bubbleElement.style.top = `${newTop}px`;
            this.bubbleElement.style.right = 'auto';
            this.bubbleElement.style.bottom = 'auto';
            
            this.bubblePosX = this.bubbleElement.style.left;
            this.bubblePosY = this.bubbleElement.style.top;
            
            this.dragStartX = e.clientX;
            this.dragStartY = e.clientY;
        }
    }
    
    handleMouseUp() {
        this.bubbleElement.style.cursor = 'grab';
        this.bubbleElement.classList.remove('sm-bubble-dragging');
        
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        
        if (this.isDragging && this.bubblePosX && this.bubblePosY) {
            this.salvarPosicao();
        }
        
        setTimeout(() => { this.isDragging = false; }, 100);
    }
    
    handleClick(e) {
        if (this.isDragging) return;
        
        const errors = correctionEngine.getErrors();
        const isLoading = correctionEngine.isLoading;
        
        if (isLoading) {
            feedbackUI.mostrarFeedback('⏳ Analisando texto...', 'info', 1000);
            return;
        }
        
        if (errors.length === 0) {
            this.animateSuccess();
            feedbackUI.mostrarFeedback('✅ Nenhum erro encontrado!', 'success', 1500);
            return;
        }
        
        if (panelUI.isAberto()) {
            panelUI.fechar();
            this.animateShrink();
        } else {
            panelUI.exibir();
            this.animateGrow();
        }
    }
    
    atualizarAparencia() {
        if (!this.bubbleElement) return;
        
        if (configManager.get('disabled')) {
            this.bubbleElement.style.display = 'none';
            return;
        }
        
        this.bubbleElement.style.display = 'flex';
        
        const errors = correctionEngine.getErrors();
        const totalErros = errors.filter(e => {
            const o = e.context.text?.substr(e.context.offset, e.context.length);
            return o && o.trim();
        }).length;
        
        const isLoading = correctionEngine.isLoading;
        const isModoLeitura = configManager.isModoLeitura();
        
        this.bubbleElement.classList.remove('sm-bubble-error', 'sm-bubble-success', 'sm-bubble-loading');
        
        if (isLoading) {
            this.bubbleElement.classList.add('sm-bubble-loading');
            this.bubbleElement.innerHTML = `<span class="sm-bubble-icon">⏳</span><span class="sm-bubble-spinner"></span>`;
        } else if (totalErros === 0) {
            this.bubbleElement.classList.add('sm-bubble-success');
            this.bubbleElement.innerHTML = '<span class="sm-bubble-icon">✓</span>';
        } else {
            this.bubbleElement.classList.add('sm-bubble-error');
            const displayCount = totalErros > 99 ? '99+' : totalErros;
            this.bubbleElement.innerHTML = `
                <span class="sm-bubble-icon">${isModoLeitura ? '👁️' : '✏️'}</span>
                <span class="sm-bubble-badge">${displayCount}</span>
            `;
        }
        
        if (totalErros === 0) {
            this.bubbleElement.title = 'SyntaxMentor - Nenhum erro encontrado';
        } else {
            this.bubbleElement.title = `SyntaxMentor - ${totalErros} erro${totalErros > 1 ? 's' : ''} encontrado${totalErros > 1 ? 's' : ''}`;
        }
        
        this.aplicarTema();
        this.atualizarVisibilidade();
    }
    
    atualizarVisibilidade() {
        if (!this.bubbleElement) return;
        
        const autoHide = configManager.get('autoHideBubble');
        const isTyping = correctionEngine.isLoading;
        
        if (autoHide && isTyping && !panelUI.isAberto()) {
            this.esconder(true);
        } else if (!this.isVisible) {
            this.mostrar(true);
        }
    }
    
    esconder(animado = true) {
        if (!this.bubbleElement || !this.isVisible) return;
        
        this.isVisible = false;
        
        if (animado) {
            this.bubbleElement.style.transition = 'opacity 0.3s ease, transform 0.2s ease';
            this.bubbleElement.style.opacity = '0';
            this.bubbleElement.style.transform = 'scale(0.8)';
            this.bubbleElement.style.pointerEvents = 'none';
        } else {
            this.bubbleElement.style.display = 'none';
        }
    }
    
    mostrar(animado = true) {
        if (!this.bubbleElement || this.isVisible) return;
        
        this.isVisible = true;
        
        if (animado) {
            this.bubbleElement.style.display = 'flex';
            this.bubbleElement.style.transition = 'opacity 0.3s ease, transform 0.2s ease';
            this.bubbleElement.style.opacity = '1';
            this.bubbleElement.style.transform = 'scale(1)';
            this.bubbleElement.style.pointerEvents = 'auto';
            setTimeout(() => { if (this.bubbleElement) this.bubbleElement.style.transition = ''; }, 300);
        } else {
            this.bubbleElement.style.display = 'flex';
            this.bubbleElement.style.opacity = '1';
            this.bubbleElement.style.pointerEvents = 'auto';
        }
    }
    
    aplicarTema() {
        if (!this.bubbleElement) return;
        
        const isDark = configManager.get('darkMode');
        if (isDark) {
            this.bubbleElement.classList.add('sm-dark');
        } else {
            this.bubbleElement.classList.remove('sm-dark');
        }
    }
    
    carregarPosicao() {
        chrome.storage.local.get({ bubblePosX: null, bubblePosY: null }, (res) => {
            if (res.bubblePosX && res.bubblePosY && this.bubbleElement) {
                this.bubbleElement.style.left = res.bubblePosX;
                this.bubbleElement.style.top = res.bubblePosY;
                this.bubbleElement.style.right = 'auto';
                this.bubbleElement.style.bottom = 'auto';
                this.bubblePosX = res.bubblePosX;
                this.bubblePosY = res.bubblePosY;
            } else {
                this.setDefaultPosition();
            }
        });
    }
    
    setDefaultPosition() {
        if (!this.bubbleElement) return;
        
        const margin = 20;
        this.bubbleElement.style.right = `${margin}px`;
        this.bubbleElement.style.bottom = `${margin}px`;
        this.bubbleElement.style.left = 'auto';
        this.bubbleElement.style.top = 'auto';
        
        setTimeout(() => {
            const rect = this.bubbleElement.getBoundingClientRect();
            this.bubblePosX = `${rect.left}px`;
            this.bubblePosY = `${rect.top}px`;
            this.salvarPosicao();
        }, 100);
    }
    
    salvarPosicao() {
        if (this.bubblePosX && this.bubblePosY) {
            chrome.storage.local.set({ bubblePosX: this.bubblePosX, bubblePosY: this.bubblePosY });
        }
    }
    
    animateSuccess() {
        if (!this.bubbleElement) return;
        this.bubbleElement.classList.add('sm-bubble-success-flash');
        setTimeout(() => { if (this.bubbleElement) this.bubbleElement.classList.remove('sm-bubble-success-flash'); }, 500);
    }
    
    animateGrow() {
        if (!this.bubbleElement) return;
        this.bubbleElement.style.transform = 'scale(1.1)';
        setTimeout(() => { if (this.bubbleElement) this.bubbleElement.style.transform = ''; }, 200);
    }
    
    animateShrink() {
        if (!this.bubbleElement) return;
        this.bubbleElement.style.transform = 'scale(0.9)';
        setTimeout(() => { if (this.bubbleElement) this.bubbleElement.style.transform = ''; }, 200);
    }
    
    animateCorrection() {
        if (!this.bubbleElement) return;
        this.bubbleElement.classList.add('sm-bubble-correction');
        setTimeout(() => { if (this.bubbleElement) this.bubbleElement.classList.remove('sm-bubble-correction'); }, 300);
    }
    
    blink() {
        if (!this.bubbleElement || !this.isVisible) return;
        
        let count = 0;
        const interval = setInterval(() => {
            if (!this.bubbleElement || count >= 3) {
                clearInterval(interval);
                if (this.bubbleElement) this.bubbleElement.style.opacity = '1';
                return;
            }
            this.bubbleElement.style.opacity = this.bubbleElement.style.opacity === '0.5' ? '1' : '0.5';
            count++;
        }, 200);
    }
    
    remover() {
        if (this.bubbleElement) {
            this.bubbleElement.removeEventListener('mousedown', this.handleMouseDown);
            this.bubbleElement.removeEventListener('click', this.handleClick);
            this.bubbleElement.remove();
            this.bubbleElement = null;
        }
    }
}

export const bubbleUI = new BubbleUI();