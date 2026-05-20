// =============================================
// SyntaxMentor - UI de Análise de Sentimento
// =============================================

// Adicionar aba de sentimento no painel
function adicionarAbaSentimento() {
    const painel = document.getElementById('syntax-mentor-painel');
    if (!painel) return;
    
    // Verificar se já existe a aba
    if (document.getElementById('sm-sentiment-tab')) return;
    
    const tabs = document.createElement('div');
    tabs.id = 'sm-sentiment-tabs';
    tabs.style.cssText = `
        display: flex;
        border-bottom: 1px solid #e5e7eb;
        margin-bottom: 12px;
    `;
    
    tabs.innerHTML = `
        <button class="sm-tab-btn active" data-tab="grammar">📝 Gramática</button>
        <button class="sm-tab-btn" data-tab="sentiment">😊 Sentimento</button>
    `;
    
    const header = painel.querySelector('#syntax-mentor-header');
    if (header) {
        header.insertAdjacentElement('afterend', tabs);
    }
    
    // Adicionar conteúdo da aba de sentimento
    const content = painel.querySelector('#syntax-mentor-content');
    const sentimentContent = document.createElement('div');
    sentimentContent.id = 'sm-sentiment-content';
    sentimentContent.style.display = 'none';
    sentimentContent.className = 'body-cards';
    
    content.parentNode.insertBefore(sentimentContent, content.nextSibling);
    
    // Eventos das abas
    tabs.querySelectorAll('.sm-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.querySelectorAll('.sm-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tabName = btn.dataset.tab;
            if (tabName === 'grammar') {
                content.style.display = 'block';
                sentimentContent.style.display = 'none';
            } else {
                content.style.display = 'none';
                sentimentContent.style.display = 'block';
                atualizarAnaliseSentimento(sentimentContent);
            }
        });
    });
}

// Atualizar análise de sentimento
function atualizarAnaliseSentimento(container) {
    if (!elementoGlobal) return;
    
    const texto = elementoGlobal.value || elementoGlobal.textContent || elementoGlobal.innerText || '';
    if (texto.length < 10) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#888;">
                <div style="font-size:48px;margin-bottom:16px;">📝</div>
                <p>Digite mais texto para analisar o sentimento</p>
                <p style="font-size:12px;">Mínimo de 10 caracteres</p>
            </div>
        `;
        return;
    }
    
    const analysis = sentimentAnalysis.analyze(texto);
    
    const scoreColor = analysis.score < 0 ? '#e53e3e' : analysis.score > 0 ? '#28a745' : '#6b7280';
    const scoreIcon = analysis.score < 0 ? '😔' : analysis.score > 0 ? '😊' : '😐';
    
    let html = `
        <div class="sentiment-header" style="text-align:center;margin-bottom:24px;">
            <div style="font-size:64px;">${scoreIcon}</div>
            <h3 style="margin:8px 0 4px;">Sentimento: ${analysis.sentiment}</h3>
            <p style="color:${scoreColor};font-weight:bold;margin:0;">Score: ${analysis.score}</p>
            <p style="font-size:12px;color:#666;margin-top:8px;">${analysis.message}</p>
        </div>
    `;
    
    if (analysis.issues.length > 0) {
        html += `
            <div class="sentiment-issues">
                <h4 style="margin:0 0 12px;">🔍 Pontos de atenção:</h4>
                <div class="issues-list">
        `;
        
        analysis.issues.forEach(issue => {
            const icon = issue.type === 'negative' ? '⚠️' : '🔊';
            html += `
                <div class="issue-card" style="background:#f8f9fa;border-radius:8px;padding:12px;margin-bottom:12px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                        <span>${icon}</span>
                        <strong>"${issue.original}"</strong>
                        <span>→</span>
                        <span style="color:#28a745;">"${issue.suggestion}"</span>
                    </div>
                    <p style="margin:0;font-size:12px;color:#666;">${issue.message}</p>
                    <button class="btn-fix-sentiment" data-word="${issue.original}" data-suggestion="${issue.suggestion}" 
                            style="margin-top:8px;background:#6f42c1;color:white;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;">
                        🔧 Aplicar sugestão
                    </button>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    } else {
        html += `
            <div style="text-align:center;padding:20px;background:#f0fdf4;border-radius:12px;">
                <div style="font-size:32px;">✨</div>
                <p style="color:#166534;margin:8px 0 0;">Texto com tom adequado!</p>
                <p style="font-size:11px;color:#666;">Nenhum ponto negativo detectado</p>
            </div>
        `;
    }
    
    container.innerHTML = html;
    
    // Adicionar eventos dos botões
    container.querySelectorAll('.btn-fix-sentiment').forEach(btn => {
        btn.addEventListener('click', () => {
            const original = btn.dataset.word;
            const sugestao = btn.dataset.suggestion;
            
            if (elementoGlobal) {
                // Aplicar correção de sentimento
                const regex = new RegExp(`\\b${original}\\b`, 'gi');
                if (elementoGlobal.tagName === 'TEXTAREA' || elementoGlobal.tagName === 'INPUT') {
                    elementoGlobal.value = elementoGlobal.value.replace(regex, sugestao);
                    dispararEventosNativos(elementoGlobal);
                } else if (elementoGlobal.isContentEditable) {
                    elementoGlobal.innerHTML = elementoGlobal.innerHTML.replace(regex, sugestao);
                    atualizarElementoComEventos(elementoGlobal);
                }
                
                mostrarFeedback(`✨ Tom melhorado: "${original}" → "${sugestao}"`, 'success');
                
                // Atualizar análise
                atualizarAnaliseSentimento(container);
            }
        });
    });
}

// Integrar com o painel existente
// Modificar a função exibirPainel para incluir a aba de sentimento
const originalExibirPainel = exibirPainel;
exibirPainel = function() {
    originalExibirPainel();
    adicionarAbaSentimento();
};