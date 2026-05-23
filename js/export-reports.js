// =============================================
// SyntaxMentor - Exportar Relatórios v1.0
// Gera relatórios em CSV e PDF das estatísticas
// =============================================

const reportExporter = {
    
    // Gerar relatório CSV
    async generateCSV() {
        return new Promise((resolve) => {
            chrome.storage.local.get([
                'totalCorrigidas', 'totalAceitas', 'totalRecusadas',
                'dicionario_pessoal', 'erroMaisComum', 'language'
            ], (res) => {
                
                const stats = {
                    data: new Date().toISOString().split('T')[0],
                    totalCorrecoes: res.totalCorrigidas || 0,
                    totalAceitas: res.totalAceitas || 0,
                    totalRecusadas: res.totalRecusadas || 0,
                    taxaAceitacao: ((res.totalAceitas || 0) / ((res.totalAceitas || 0) + (res.totalRecusadas || 0)) * 100).toFixed(1) + '%',
                    dicionarioSize: (res.dicionario_pessoal || []).length,
                    idioma: res.language || 'pt-BR'
                };
                
                // Cabeçalho do CSV
                let csv = "Data,Total Correções,Correções Aceitas,Correções Recusadas,Taxa de Aceitação,Palavras no Dicionário,Idioma\n";
                csv += `${stats.data},${stats.totalCorrecoes},${stats.totalAceitas},${stats.totalRecusadas},${stats.taxaAceitacao},${stats.dicionarioSize},${stats.idioma}\n`;
                
                // Adicionar erros mais comuns
                const erros = res.erroMaisComum || {};
                const topErros = Object.entries(erros).sort((a, b) => b[1] - a[1]).slice(0, 10);
                
                if (topErros.length > 0) {
                    csv += "\n\nTOP 10 ERROS MAIS COMUNS\n";
                    csv += "Palavra,Quantidade\n";
                    topErros.forEach(([palavra, count]) => {
                        csv += `${palavra},${count}\n`;
                    });
                }
                
                resolve(csv);
            });
        });
    },
    
    // Baixar arquivo
    download(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    // Exportar como CSV
    async exportCSV() {
        const csv = await this.generateCSV();
        this.download(csv, `syntaxmentor-report-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
        return true;
    },
    
    // Exportar como HTML (para impressão/PDF)
    async exportHTML() {
        return new Promise((resolve) => {
            chrome.storage.local.get([
                'totalCorrigidas', 'totalAceitas', 'totalRecusadas',
                'dicionario_pessoal', 'erroMaisComum', 'language'
            ], (res) => {
                
                const total = res.totalCorrigidas || 0;
                const aceitas = res.totalAceitas || 0;
                const recusadas = res.totalRecusadas || 0;
                const dicSize = (res.dicionario_pessoal || []).length;
                const taxa = ((aceitas / (aceitas + recusadas)) * 100).toFixed(1);
                
                let nivel = 'Iniciante';
                if (total >= 1000) nivel = '👑 Lendário';
                else if (total >= 500) nivel = '⭐ Mestre';
                else if (total >= 100) nivel = '🔥 Avançado';
                else if (total >= 10) nivel = '📈 Intermediário';
                
                const erros = res.erroMaisComum || {};
                const topErros = Object.entries(erros).sort((a, b) => b[1] - a[1]).slice(0, 10);
                
                const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>SyntaxMentor - Relatório de Estatísticas</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 40px;
            color: #333;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #6f42c1;
        }
        .logo {
            font-size: 32px;
            color: #6f42c1;
        }
        .date {
            color: #666;
            font-size: 12px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            border: 1px solid #e5e7eb;
        }
        .stat-value {
            font-size: 28px;
            font-weight: bold;
            color: #6f42c1;
        }
        .stat-label {
            font-size: 12px;
            color: #666;
            margin-top: 8px;
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            border-left: 4px solid #6f42c1;
            padding-left: 12px;
            margin-bottom: 16px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        th {
            background: #f8f9fa;
            font-weight: bold;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 11px;
            color: #999;
        }
        .nivel-badge {
            display: inline-block;
            background: linear-gradient(135deg, #6f42c1, #8b5cf6);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">✨ SyntaxMentor</div>
        <h2>Relatório de Estatísticas</h2>
        <div class="date">Gerado em: ${new Date().toLocaleString()}</div>
    </div>
    
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-value">${total}</div>
            <div class="stat-label">Total de Correções</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${aceitas}</div>
            <div class="stat-label">Correções Aceitas</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${recusadas}</div>
            <div class="stat-label">Correções Recusadas</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${taxa}%</div>
            <div class="stat-label">Taxa de Aceitação</div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">📊 Informações Gerais</div>
        <table>
            <tr><th>Nível</th><td><span class="nivel-badge">${nivel}</span></td></tr>
            <tr><th>Palavras no Dicionário</th><td>${dicSize}</td></tr>
            <tr><th>Idioma</th><td>${res.language === 'pt-BR' ? 'Português (Brasil)' : res.language || 'Português'}</td></tr>
        </table>
    </div>
    
    ${topErros.length > 0 ? `
    <div class="section">
        <div class="section-title">🔝 Erros Mais Comuns</div>
        <table>
            <tr><th>Palavra</th><th>Quantidade</th></tr>
            ${topErros.map(([palavra, count]) => `<tr><td><strong>${palavra}</strong></td><td>${count}x</td></tr>`).join('')}
        </table>
    </div>
    ` : ''}
    
    <div class="footer">
        Relatório gerado pelo SyntaxMentor v2.7.1<br>
        ${new Date().getFullYear()} - Todos os direitos reservados
    </div>
</body>
</html>
                `;
                
                resolve(html);
            });
        });
    },
    
    // Exportar como HTML
    async exportHTMLAndOpen() {
        const html = await this.exportHTML();
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return true;
    },
    
    // Adicionar botão de exportar no dashboard
    addExportButton() {
        const dashboardContent = document.querySelector('#syntax-mentor-content');
        if (!dashboardContent) return;
        
        const exportSection = document.createElement('div');
        exportSection.className = 'export-section';
        exportSection.style.cssText = `
            margin-top: 20px;
            padding-top: 15px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            gap: 10px;
            justify-content: center;
        `;
        
        exportSection.innerHTML = `
            <button id="sm-export-csv" class="btn-export" style="background:#28a745;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">
                📊 Exportar CSV
            </button>
            <button id="sm-export-html" class="btn-export" style="background:#6f42c1;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;">
                📄 Gerar Relatório
            </button>
        `;
        
        dashboardContent.appendChild(exportSection);
        
        document.getElementById('sm-export-csv')?.addEventListener('click', () => {
            this.exportCSV();
            mostrarFeedback('📊 Relatório CSV exportado!', 'success');
        });
        
        document.getElementById('sm-export-html')?.addEventListener('click', () => {
            this.exportHTMLAndOpen();
            mostrarFeedback('📄 Relatório gerado!', 'success');
        });
    }
};

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = reportExporter;
}