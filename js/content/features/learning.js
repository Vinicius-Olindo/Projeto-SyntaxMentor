// =============================================
// SyntaxMentor - Learning Mode
// Modo aprendizado com explicações detalhadas
// =============================================

import { configManager } from '../core/config.js';
import { feedbackUI } from '../ui/feedback.js';

class LearningManager {
    constructor() {
        this.isActive = false;
        this.explanationsQueue = [];
        this.isShowingExplanation = false;
        this.explanationHistory = [];
        this.userLevel = 'Novato';
        
        this.ruleKnowledgeBase = {
            'MORFOLOGIK_RULE_PT_BR': {
                category: '📝 Ortografia',
                title: 'Erro de Digitação',
                description: 'Uma palavra foi escrita de forma incorreta.',
                example: '❌ "programaçao" → ✅ "programação"',
                tip: 'Pratique a escrita das palavras que mais erra.'
            },
            'UPPERCASE_SENTENCE_START': {
                category: '🔠 Capitalização',
                title: 'Letra Maiúscula',
                description: 'Frases devem começar com letra maiúscula.',
                example: '❌ "joão foi à escola." → ✅ "João foi à escola."',
                tip: 'Sempre use letra maiúscula no início de cada frase.'
            },
            'default': {
                category: '📚 Gramática',
                title: 'Sugestão de Melhoria',
                description: 'Esta correção melhora a clareza do seu texto.',
                example: 'Revise a sugestão e veja como ela se aplica.',
                tip: 'Compare o texto original com o corrigido para entender.'
            }
        };
        
        this.showExplanation = this.showExplanation.bind(this);
    }
    
    setActive(active) {
        this.isActive = active;
        configManager.saveConfig('modoAprendizado', active);
        
        if (active) {
            feedbackUI.mostrarFeedback('📚 Modo Aprendizado ativado!', 'success', 3000);
        } else {
            feedbackUI.mostrarFeedback('Modo Aprendizado desativado', 'info', 2000);
        }
    }
    
    toggle() {
        this.setActive(!this.isActive);
        return this.isActive;
    }
    
    async showExplanation(original, suggestion, errorObj, context = '') {
        if (!this.isActive) return;
        if (this.isShowingExplanation) {
            this.explanationsQueue.push({ original, suggestion, errorObj, context });
            return;
        }
        
        this.isShowingExplanation = true;
        
        const ruleId = errorObj?.rule?.id || 'default';
        const ruleInfo = this.ruleKnowledgeBase[ruleId] || this.ruleKnowledgeBase.default;
        
        const modal = this.createExplanationModal({
            original, suggestion,
            category: ruleInfo.category,
            title: ruleInfo.title,
            description: errorObj?.message || ruleInfo.description,
            example: ruleInfo.example,
            tip: ruleInfo.tip,
            context
        });
        
        document.body.appendChild(modal);
        
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
            const content = modal.querySelector('.sm-learning-modal-content');
            if (content) content.style.transform = 'translateY(0)';
        });
        
        this.explanationHistory.push({
            original, suggestion, ruleId,
            timestamp: Date.now(),
            category: ruleInfo.category
        });
        
        if (this.explanationHistory.length > 50) this.explanationHistory.shift();
        
        return new Promise((resolve) => {
            const closeModal = () => {
                modal.style.opacity = '0';
                const content = modal.querySelector('.sm-learning-modal-content');
                if (content) content.style.transform = 'translateY(-20px)';
                setTimeout(() => {
                    modal.remove();
                    this.isShowingExplanation = false;
                    resolve();
                    if (this.explanationsQueue.length > 0) {
                        const next = this.explanationsQueue.shift();
                        this.showExplanation(next.original, next.suggestion, next.errorObj, next.context);
                    }
                }, 300);
            };
            
            modal.querySelector('.sm-learning-close')?.addEventListener('click', closeModal);
            modal.querySelector('.sm-learning-gotit')?.addEventListener('click', closeModal);
            modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
            
            const escHandler = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', escHandler); } };
            document.addEventListener('keydown', escHandler);
        });
    }
    
    createExplanationModal(data) {
        const modal = document.createElement('div');
        const isDark = configManager.get('darkMode');
        
        modal.className = 'sm-learning-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.7); z-index: 2147483647;
            display: flex; align-items: center; justify-content: center;
            opacity: 0; transition: opacity 0.3s ease;
            font-family: 'Segoe UI', system-ui, sans-serif;
        `;
        
        modal.innerHTML = `
            <div class="sm-learning-modal-content" style="
                background: ${isDark ? '#1a1a2e' : '#ffffff'};
                color: ${isDark ? '#e0e0e0' : '#333'};
                border-radius: 20px; max-width: 500px; width: 90%;
                transform: translateY(-20px); transition: transform 0.3s ease;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden;
            ">
                <div style="padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <span style="background: #6f42c1; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px;">${this.escapeHtml(data.category)}</span>
                        <button class="sm-learning-close" style="background: none; border: none; font-size: 24px; cursor: pointer; color: ${isDark ? '#888' : '#999'}">&times;</button>
                    </div>
                    <h3 style="margin: 0 0 8px 0;">📚 ${this.escapeHtml(data.title)}</h3>
                    <div style="background: ${isDark ? '#2a2a3e' : '#f8f9fa'}; border-radius: 12px; padding: 16px; margin: 16px 0; text-align: center;">
                        <span style="color: #e53e3e; text-decoration: line-through; font-size: 18px;">${this.escapeHtml(data.original)}</span>
                        <span style="margin: 0 10px;">→</span>
                        <span style="color: #28a745; font-size: 18px; font-weight: 600;">${this.escapeHtml(data.suggestion)}</span>
                    </div>
                    <div style="margin: 16px 0;">
                        <div style="font-weight: 600; margin-bottom: 8px;">💡 Por quê?</div>
                        <p style="margin: 0; line-height: 1.6;">${this.escapeHtml(data.description)}</p>
                    </div>
                    <div style="background: ${isDark ? '#2a2a3e' : '#fef3c7'}; border-radius: 12px; padding: 16px; margin: 16px 0;">
                        <div style="font-weight: 600; margin-bottom: 8px;">📖 Exemplo:</div>
                        <p style="margin: 0;">${this.escapeHtml(data.example)}</p>
                    </div>
                    <div style="background: ${isDark ? '#1a3a2a' : '#d1fae5'}; border-radius: 12px; padding: 16px; margin: 16px 0;">
                        <div style="font-weight: 600; margin-bottom: 8px;">✨ Dica:</div>
                        <p style="margin: 0;">${this.escapeHtml(data.tip)}</p>
                    </div>
                    <div style="display: flex; gap: 12px; margin-top: 24px;">
                        <button class="sm-learning-gotit" style="flex: 1; background: linear-gradient(135deg, #6f42c1, #8b5cf6); color: white; border: none; border-radius: 10px; padding: 12px; cursor: pointer; font-weight: 600;">✓ Entendi</button>
                    </div>
                </div>
            </div>
        `;
        
        return modal;
    }
    
    showLearningPanel() {
        const isDark = configManager.get('darkMode');
        
        const panel = document.createElement('div');
        panel.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
            width: 90%; max-width: 500px; max-height: 80vh;
            background: ${isDark ? '#1a1a2e' : '#ffffff'};
            border-radius: 20px; z-index: 2147483647;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden; display: flex; flex-direction: column;
        `;
        
        const categories = {};
        this.explanationHistory.forEach(item => {
            if (!categories[item.category]) categories[item.category] = [];
            categories[item.category].push(item);
        });
        
        panel.innerHTML = `
            <div style="padding: 20px; border-bottom: 1px solid ${isDark ? '#333' : '#eee'}; display: flex; justify-content: space-between;">
                <h3 style="margin: 0;">📚 Meu Aprendizado</h3>
                <button class="sm-learning-panel-close" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
            </div>
            <div style="padding: 20px; overflow-y: auto;">
                <div style="font-size: 32px; font-weight: bold; color: #6f42c1;">${this.explanationHistory.length}</div>
                <div style="color: #666; margin-bottom: 20px;">correções aprendidas</div>
                ${Object.entries(categories).map(([cat, items]) => `
                    <div style="margin-bottom: 12px;">
                        <div>${cat}</div>
                        <div style="background: ${isDark ? '#2a2a3e' : '#f0f0f0'}; border-radius: 10px; height: 8px; margin-top: 4px;">
                            <div style="width: ${(items.length / Math.max(1, this.explanationHistory.length)) * 100}%; height: 100%; background: #6f42c1; border-radius: 10px;"></div>
                        </div>
                    </div>
                `).join('')}
                <div style="margin-top: 20px;"><strong>🕐 Últimas:</strong></div>
                ${this.explanationHistory.slice(-5).reverse().map(item => `
                    <div style="padding: 8px 0; border-bottom: 1px solid ${isDark ? '#333' : '#eee'}; display: flex; justify-content: space-between;">
                        <span><span style="color: #e53e3e; text-decoration: line-through;">${this.escapeHtml(item.original)}</span> → <span style="color: #28a745;">${this.escapeHtml(item.suggestion)}</span></span>
                        <span style="font-size: 11px; color: #666;">${new Date(item.timestamp).toLocaleTimeString()}</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.body.appendChild(panel);
        panel.querySelector('.sm-learning-panel-close').addEventListener('click', () => panel.remove());
        panel.addEventListener('click', (e) => { if (e.target === panel) panel.remove(); });
    }
    
    escapeHtml(texto) {
        if (!texto) return '';
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }
    
    getStatus() {
        return {
            isActive: this.isActive,
            totalLearned: this.explanationHistory.length,
            userLevel: this.userLevel,
            history: this.explanationHistory
        };
    }
}

export const learningManager = new LearningManager();

chrome.storage.local.get({ modoAprendizado: false }, (res) => {
    learningManager.isActive = res.modoAprendizado;
});