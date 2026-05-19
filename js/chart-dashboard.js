// =============================================
// SyntaxMentor - Gráfico de Evolução v1.0
// =============================================

class EvolutionChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.dados = [];
    }

    /**
     * Carrega dados dos últimos 30 dias
     */
    async carregarDados() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['correcoesDiarias'], (res) => {
                this.dados = res.correcoesDiarias || [];
                resolve(this.dados);
            });
        });
    }

    /**
     * Desenha o gráfico
     */
    desenhar() {
        if (!this.ctx || this.dados.length === 0) return;
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        const padding = 40;
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;
        
        // Limpar canvas
        this.ctx.clearRect(0, 0, width, height);
        
        // Encontrar valor máximo
        const maxValue = Math.max(...this.dados.map(d => d.total), 10);
        
        // Desenhar eixos
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#ccc';
        this.ctx.lineWidth = 1;
        
        // Eixo Y
        this.ctx.moveTo(padding, padding);
        this.ctx.lineTo(padding, height - padding);
        // Eixo X
        this.ctx.moveTo(padding, height - padding);
        this.ctx.lineTo(width - padding, height - padding);
        this.ctx.stroke();
        
        // Desenhar linha dos dados
        if (this.dados.length > 1) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = '#6f42c1';
            this.ctx.lineWidth = 2;
            
            const step = graphWidth / (this.dados.length - 1);
            
            this.dados.forEach((ponto, index) => {
                const x = padding + index * step;
                const y = height - padding - (ponto.total / maxValue) * graphHeight;
                
                if (index === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            });
            this.ctx.stroke();
            
            // Desenhar pontos
            this.dados.forEach((ponto, index) => {
                const x = padding + index * step;
                const y =height - padding - (ponto.total / maxValue) * graphHeight;
                
                this.ctx.beginPath();
                this.ctx.fillStyle = '#6f42c1';
                this.ctx.arc(x, y, 4, 0, Math.PI * 2);
                this.ctx.fill();
            });
        }
        
        // Adicionar labels dos dias
        this.ctx.fillStyle = '#666';
        this.ctx.font = '10px "Segoe UI"';
        
        const diasAbreviados = ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'D-1', 'Hoje'];
        const step = graphWidth / 6;
        
        for (let i = 0; i <= 6; i++) {
            const x = padding + i * step;
            this.ctx.fillText(diasAbreviados[i] || '', x - 10, height - padding + 15);
        }
    }

    /**
     * Atualiza o gráfico com novos dados
     */
    async atualizar() {
        await this.carregarDados();
        this.desenhar();
    }
}

// Inicializar quando o dashboard carregar
if (document.getElementById('evolution-chart')) {
    const chart = new EvolutionChart('evolution-chart');
    chart.atualizar();
    
    // Atualizar a cada 30 segundos
    setInterval(() => chart.atualizar(), 30000);
}