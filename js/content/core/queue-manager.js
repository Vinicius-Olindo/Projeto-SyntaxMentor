// =============================================
// SyntaxMentor - Queue Manager
// Gerencia fila de requisições para API
// =============================================

class QueueManager {
    constructor() {
        this.filaRequisicoes = [];
        this.processandoFila = false;
        this.currentFetchController = null;
        this.timeoutDigitacao = null;
        this.ultimoTextoValido = '';
        this.textoUltimaVerificacao = '';
        this.usuarioDigitando = false;
        this.requestId = 0;
    }
    
    cancelCurrentRequest() {
        if (this.currentFetchController) {
            this.currentFetchController.abort();
            this.currentFetchController = null;
        }
    }
    
    clearTypingTimeout() {
        if (this.timeoutDigitacao) {
            clearTimeout(this.timeoutDigitacao);
            this.timeoutDigitacao = null;
        }
    }
    
    scheduleCheck(texto, elemento, speed, callback) {
        this.clearTypingTimeout();
        this.cancelCurrentRequest();
        
        this.timeoutDigitacao = setTimeout(() => {
            this.usuarioDigitando = false;
            
            if (texto.length <= 1) {
                callback(null, true);
                return;
            }
            
            if (texto === this.ultimoTextoValido) {
                return;
            }
            
            this.ultimoTextoValido = texto;
            this.textoUltimaVerificacao = texto;
            
            this.addToQueue(texto, elemento, callback);
        }, parseInt(speed) || 500);
    }
    
    addToQueue(texto, elemento, callback) {
        this.filaRequisicoes.push({ texto, elemento, callback });
        this.processQueue();
    }
    
    async processQueue() {
        if (this.processandoFila || this.filaRequisicoes.length === 0) return;
        
        this.processandoFila = true;
        const currentRequestId = ++this.requestId;
        const ultima = this.filaRequisicoes[this.filaRequisicoes.length - 1];
        this.filaRequisicoes = [];
        
        try {
            if (currentRequestId === this.requestId && ultima.callback) {
                await ultima.callback(ultima.texto, ultima.elemento);
            }
        } catch (error) {
            console.warn('SyntaxMentor Queue:', error);
        }
        
        this.processandoFila = false;
        if (this.filaRequisicoes.length > 0) this.processQueue();
    }
    
    setTypingState(isTyping) {
        this.usuarioDigitando = isTyping;
    }
    
    getLastText() {
        return this.textoUltimaVerificacao;
    }
    
    clear() {
        this.filaRequisicoes = [];
        this.processandoFila = false;
        this.cancelCurrentRequest();
        this.clearTypingTimeout();
    }
}

export const queueManager = new QueueManager();