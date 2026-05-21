// =============================================
// SyntaxMentor - Feedback UI
// Notificações, toasts e mensagens flutuantes
// =============================================

class FeedbackUI {
    constructor() {
        this.timeouts = [];
    }
    
    escapeHtml(texto) {
        if (!texto) return '';
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }
    
    mostrarFeedback(msg, tipo, duracaoMs = null) {
        document.querySelectorAll('.sm-feedback-flutuante').forEach(el => el.remove());
        
        const feedback = document.createElement('div');
        feedback.textContent = msg;
        feedback.className = 'sm-feedback-flutuante';
        
        const cores = {
            success: '#28a745',
            error: '#e53e3e',
            info: '#6b7280',
            warning: '#f59e0b'
        };
        
        feedback.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 2147483647;
            background: ${cores[tipo] || cores.info};
            color: #fff;
            padding: 12px 18px;
            border-radius: 8px;
            font: 600 14px 'Segoe UI', sans-serif;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            pointer-events: none;
            max-width: 350px;
            word-wrap: break-word;
            line-height: 1.4;
        `;
        
        document.body.appendChild(feedback);
        
        if (!document.querySelector('#sm-feedback-style')) {
            const style = document.createElement('style');
            style.id = 'sm-feedback-style';
            style.textContent = `
                @keyframes sm-feedback-fadeout {
                    0% { opacity: 1; transform: translateX(0); }
                    70% { opacity: 1; transform: translateX(0); }
                    100% { opacity: 0; transform: translateX(20px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        let duracao = duracaoMs;
        if (!duracao) {
            duracao = Math.min(8000, Math.max(2000, msg.length * 50 + 1500));
        }
        
        feedback.style.animation = `sm-feedback-fadeout ${duracao / 1000}s forwards`;
        
        const timeout = setTimeout(() => {
            if (feedback.parentNode) feedback.remove();
        }, duracao);
        
        this.timeouts.push(timeout);
    }
    
    mostrarConquista(mensagem) {
        const notif = document.createElement('div');
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 2147483647;
            background: linear-gradient(135deg, #f59e0b, #fbbf24);
            color: #1a1a1a;
            padding: 16px 28px;
            border-radius: 16px;
            font: 700 16px 'Segoe UI', system-ui, sans-serif;
            text-align: center;
            box-shadow: 0 10px 40px rgba(245, 158, 11, 0.5);
            animation: sm-conquista-in .5s ease, sm-conquista-out .5s ease 3s forwards;
            pointer-events: none;
            max-width: 90vw;
        `;
        
        notif.textContent = mensagem;
        document.body.appendChild(notif);
        
        const timeout = setTimeout(() => {
            if (notif.parentNode) notif.remove();
        }, 3700);
        
        this.timeouts.push(timeout);
    }
    
    clear() {
        this.timeouts.forEach(timeout => clearTimeout(timeout));
        this.timeouts = [];
    }
}

export const feedbackUI = new FeedbackUI();