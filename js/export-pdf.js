// =============================================
// SyntaxMentor - Exportar PDF v1.0
// =============================================

const pdfExporter = {
    /**
     * Gera PDF do relatório
     */
    async exportarPDF() {
        mostrarNotificacao('📄 Gerando PDF...', 'info');
        
        // Criar janela de impressão
        const html = await this.gerarHTMLImpressao();
        const janela = window.open();
        janela.document.write(html);
        janela.document.close();
        
        // Aguardar carregamento e imprimir
        janela.onload = () => {
            setTimeout(() => {
                janela.print();
                janela.close();
            }, 500);
        };
    },

    /**
     * Gera HTML otimizado para impressão/PDF
     */
    async gerarHTMLImpressao() {
        return new Promise((resolve) => {
            chrome.storage.local.get([
                'totalCorrigidas', 'totalAceitas', 'totalRecusadas',
                'dicionario_pessoal', 'erroMaisComum', 'language',
                'estreakDias', 'correcoesHoje'
            ], (res) => {
                const total = res.totalCorrigidas || 0;
                const aceitas = res.totalAceitas || 0;
                const recusadas = res.totalRecusadas || 0;
                const streak = res.estreakDias || 0;
                
                let nivel = 'Iniciante';
                if (total >= 1000) nivel = 'Lendário';
                else if (total >= 500) nivel = 'Mestre';
                else if (total >= 100) nivel = 'Avançado';
                else if (total >= 10) nivel = 'Intermediário';
                
                const erros = res.erroMaisComum || {};
                const topErros = Object.entries(erros).sort((a, b) => b[1] - a[1]).slice(0, 10);
                
                const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>SyntaxMentor - Relatório</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', 'Arial', sans-serif;
            padding: 40px;
            color: #333;
        }
        @media print {
            body { padding: 20px; }
            .no-print { display: none; }
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #6f42c1;
        }
        .logo { font-size: 48px; margin-bottom: 10px; }
        h1 { color: #6f42c1; font-size: 24px; }
        .date { color: #666; font-size: 12px; margin-top: 8px; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 1px solid #e5e7eb;
        }
        .stat-value { font-size: 32px; font-weight: bold; color: #6f42c1; }
        .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
        .section { margin-bottom: 25px; }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            border-left: 4px solid #6f42c1;
            padding-left: 12px;
            margin-bottom: 15px;
        }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f8f9fa; }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: #999;
        }
        .btn-print {
            display: block;
            margin: 20px auto;
            padding: 10px 24px;
            background: #6f42c1;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">✨</div>
        <h1>SyntaxMentor - Relatório de Estatísticas</h1>
        <div class="date">Gerado em: ${new Date().toLocaleString()}</div>
    </div>
    
    <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${total}</div><div class="stat-label">Correções</div></div>
        <div class="stat-card"><div class="stat-value">${aceitas}</div><div class="stat-label">Aceitas</div></div>
        <div class="stat-card"><div class="stat-value">${recusadas}</div><div class="stat-label">Recusadas</div></div>
        <div class="stat-card"><div class="stat-value">${streak}</div><div class="stat-label">Streak</div></div>
    </div>
    
    <div class="section">
        <div class="section-title">📊 Informações Gerais</div>
        <table>
            <tr><th>Nível</th><td>${nivel}</td></tr>
            <tr><th>Nível para próximo</th><td>${total >= 1000 ? 'MAX' : total >= 500 ? 1000 : total >= 100 ? 500 : total >= 10 ? 100 : 10}</td></tr>
            <tr><th>Palavras no Dicionário</th><td>${(res.dicionario_pessoal || []).length}</td></tr>
            <tr><th>Idioma</th><td>${res.language === 'pt-BR' ? 'Português (Brasil)' : res.language || 'Português'}</td></tr>
        </table>
    </div>
    
    ${topErros.length > 0 ? `
    <div class="section">
        <div class="section-title">🔝 Erros Mais Comuns</div>
        <table>
            <tr><th>Palavra</th><th>Quantidade</th></tr>
            ${topErros.map(([p, c]) => `<tr><td><strong>${p}</strong></td><td>${c}x</td></tr>`).join('')}
        </table>
    </div>
    ` : ''}
    
    <div class="footer">
        <p>SyntaxMentor v2.9.0 - Seu mentor ortográfico</p>
        <p>Gerado automaticamente pelo SyntaxMentor</p>
    </div>
    
    <button class="btn-print no-print" onclick="window.print()">🖨️ Salvar como PDF</button>
</body>
</html>`;
                resolve(html);
            });
        });
    }
};

// Adicionar botão no dashboard
function adicionarBotaoPDF() {
    const exportSection = document.querySelector('.export-section');
    if (exportSection && !document.getElementById('sm-export-pdf')) {
        const btnPDF = document.createElement('button');
        btnPDF.id = 'sm-export-pdf';
        btnPDF.textContent = '📄 Exportar PDF';
        btnPDF.style.cssText = 'background:#dc3545;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;';
        btnPDF.addEventListener('click', () => pdfExporter.exportarPDF());
        exportSection.appendChild(btnPDF);
    }
}

// Chamar após carregar o dashboard
setTimeout(adicionarBotaoPDF, 1000);