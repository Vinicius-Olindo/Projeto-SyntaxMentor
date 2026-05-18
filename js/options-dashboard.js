// =============================================
// SyntaxMentor - options-dashboard.js v2.7.1
// Lógica da página de dashboard
// =============================================

// Verificar se está na página correta
if (document.body.classList.contains('dashboard-page')) {
    
    // =============================================
    // ELEMENTOS DOM
    // =============================================
    const heroTotalMini = document.getElementById('hero-total-mini');
    const heroNivelCompact = document.getElementById('hero-nivel-compact');
    const heroProgressRing = document.getElementById('hero-progress-ring');
    const statCorrigidasHoje = document.getElementById('stat-corrigidas-hoje');
    const statSequencia = document.getElementById('stat-sequencia');
    const statNivelCurto = document.getElementById('stat-nivel-curto');
    const statDicCurto = document.getElementById('stat-dic-curto');
    const statIdiomaMini = document.getElementById('stat-idioma-mini');
    const statCloudMini = document.getElementById('stat-cloud-mini');
    const statAceitas = document.getElementById('stat-aceitas');
    const statRecusadas = document.getElementById('stat-recusadas');
    const statTaxa = document.getElementById('stat-taxa');
    const statDic = document.getElementById('stat-dic');
    const conquistasDesbloqueadas = document.getElementById('conquistas-desbloqueadas');
    const listaConquistas = document.getElementById('lista-conquistas');
    const listaErrosComuns = document.getElementById('lista-erros-comuns');
    
    // =============================================
    // CARREGAR DASHBOARD
    // =============================================
    
    function carregarDashboard(res) {
        if (!heroTotalMini && !listaConquistas && !listaErrosComuns) return;
        
        const total = res.totalCorrigidas || 0;
        const aceitas = res.totalAceitas || 0;
        const recusadas = res.totalRecusadas || 0;
        const dicSize = (res.dicionario_pessoal || []).length;
        
        let nivel = '🟢 Iniciante';
        let nivelCurto = 'Iniciante';
        let progresso = 0;
        
        if (total >= 1000) {
            nivel = '👑 Lendário';
            nivelCurto = 'Lendário';
            progresso = 1;
        } else if (total >= 500) {
            nivel = '⭐ Mestre';
            nivelCurto = 'Mestre';
            progresso = 0.8;
        } else if (total >= 100) {
            nivel = '🔥 Avançado';
            nivelCurto = 'Avançado';
            progresso = 0.6;
        } else if (total >= 10) {
            nivel = '📈 Intermediário';
            nivelCurto = 'Inter.';
            progresso = 0.4;
        } else {
            progresso = Math.min(total / 10, 0.2);
        }
        
        if (heroTotalMini) heroTotalMini.textContent = total.toLocaleString();
        if (heroNivelCompact) heroNivelCompact.textContent = nivel;
        
        if (heroProgressRing) {
            const circunferencia = 2 * Math.PI * 54;
            const offset = circunferencia - (progresso * circunferencia);
            heroProgressRing.style.strokeDasharray = circunferencia;
            heroProgressRing.style.strokeDashoffset = offset;
            heroProgressRing.style.transition = 'stroke-dashoffset 1s ease';
        }
        
        if (statNivelCurto) statNivelCurto.textContent = nivelCurto;
        if (statDicCurto) statDicCurto.textContent = dicSize.toLocaleString();
        if (statIdiomaMini) statIdiomaMini.textContent = '🌐 ' + (res.language || 'pt-BR');
        if (statCloudMini) statCloudMini.textContent = res.cloudSync ? '☁️ Ligado' : '☁️ Desligado';
        if (statAceitas) statAceitas.textContent = aceitas.toLocaleString();
        if (statRecusadas) statRecusadas.textContent = recusadas.toLocaleString();
        if (statTaxa) statTaxa.textContent = (aceitas + recusadas) > 0 ? Math.round((aceitas / (aceitas + recusadas)) * 100) + '%' : '100%';
        if (statDic) statDic.textContent = dicSize.toLocaleString();
        
        // Correções de hoje e sequência
        if (statCorrigidasHoje) {
            const hoje = new Date().toISOString().split('T')[0];
            chrome.storage.local.get({ correcoesHoje: {}, dataUltimaCorrecao: '' }, (r) => {
                const correcoesHoje = r.correcoesHoje || {};
                statCorrigidasHoje.textContent = (correcoesHoje[hoje] || 0).toLocaleString();
                
                let sequencia = 0;
                let data = new Date();
                while (true) {
                    const chave = data.toISOString().split('T')[0];
                    if (correcoesHoje[chave] && correcoesHoje[chave] > 0) {
                        sequencia++;
                        data.setDate(data.getDate() - 1);
                    } else if (chave === hoje) {
                        data.setDate(data.getDate() - 1);
                    } else {
                        break;
                    }
                }
                if (statSequencia) statSequencia.textContent = sequencia;
            });
        }
        
        // Erros mais comuns
        if (listaErrosComuns) {
            const erros = res.erroMaisComum || {};
            const ordenados = Object.entries(erros).sort((a, b) => b[1] - a[1]).slice(0, 5);
            
            if (ordenados.length === 0) {
                listaErrosComuns.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">Corrija alguns erros para ver suas estatísticas aqui!</p>';
            } else {
                const max = ordenados[0][1];
                listaErrosComuns.innerHTML = ordenados.map(([palavra, count]) => {
                    const pct = Math.max(Math.round((count / max) * 100), 10);
                    return `
                        <div class="barra-container-dash">
                            <div class="barra-label-dash">
                                <span>${escapeHtml(palavra)}</span>
                                <span>${count}x</span>
                            </div>
                            <div class="barra-dash">
                                <div class="barra-preenchida-dash" style="width:${pct}%;">${count}x</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }
        
        // Conquistas
        if (listaConquistas) {
            const conquistas = [
                { nome: 'Primeira Correção', desbloqueada: total >= 1 },
                { nome: '10 Correções', desbloqueada: total >= 10 },
                { nome: '50 Correções', desbloqueada: total >= 50 },
                { nome: '100 Correções', desbloqueada: total >= 100 },
                { nome: '500 Correções', desbloqueada: total >= 500 },
                { nome: '1000 Correções', desbloqueada: total >= 1000 },
                { nome: '10 Palavras no Dicionário', desbloqueada: dicSize >= 10 },
                { nome: '50 Palavras no Dicionário', desbloqueada: dicSize >= 50 },
                { nome: 'Usou Cloud Sync', desbloqueada: res.cloudSync || false }
            ];
            
            const desbloqueadas = conquistas.filter(c => c.desbloqueada).length;
            if (conquistasDesbloqueadas) conquistasDesbloqueadas.textContent = desbloqueadas + '/9';
            
            listaConquistas.innerHTML = conquistas.map(c => `
                <div class="conquista-card ${c.desbloqueada ? 'unlock' : 'lock'}">
                    <div class="conquista-icon">${c.desbloqueada ? '🏆' : '🔒'}</div>
                    <div class="conquista-nome">${c.nome}</div>
                </div>
            `).join('');
        }
    }
    
    // =============================================
    // CARREGAR DADOS INICIAIS
    // =============================================
    
    function carregarDadosIniciais() {
        chrome.storage.local.get({
            totalCorrigidas: 0,
            totalAceitas: 0,
            totalRecusadas: 0,
            dicionario_pessoal: [],
            language: 'pt-BR',
            erroMaisComum: {},
            estatisticasPorSite: {},
            cloudSync: false,
            modoLeituraGlobal: false,
            streakDias: 0,
            correcoesHoje: 0,
            lastUseDate: ''
        }, (res) => {
            carregarDashboard(res);
            renderizarEstatisticasPorSite(res.estatisticasPorSite || {});
            renderizarStreak(res);
        });
    }

    function renderizarStreak(res) {
        const container = document.getElementById('sm-streak-card');
        if (!container) return;

        const streak = res.streakDias || 0;
        const hoje = res.correcoesHoje || 0;
        const meta = 10; // meta diária fixa de 10 correções
        const pct = Math.min(100, Math.round((hoje / meta) * 100));

        const emoji = streak >= 30 ? '🔥🔥🔥' : streak >= 7 ? '🔥🔥' : streak >= 1 ? '🔥' : '💤';

        // Gerar calendário dos últimos 7 dias
        const dias = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(Date.now() - i * 86400000);
            const label = d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3);
            const isHoje = i === 0;
            const ativo = i === 0 ? hoje > 0 : streak > i; // estimativa simplificada
            dias.push({ label, isHoje, ativo });
        }

        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
                <div>
                    <div style="font-size:28px;font-weight:600;line-height:1">${emoji} ${streak}</div>
                    <div style="font-size:12px;color:var(--color-text-tertiary);margin-top:2px">dia${streak !== 1 ? 's' : ''} consecutivo${streak !== 1 ? 's' : ''}</div>
                </div>
                <div style="text-align:right">
                    <div style="font-size:20px;font-weight:500">${hoje}<span style="font-size:12px;color:var(--color-text-tertiary)">/${meta}</span></div>
                    <div style="font-size:12px;color:var(--color-text-tertiary)">correções hoje</div>
                </div>
            </div>
            <div style="height:6px;background:var(--color-background-secondary);border-radius:3px;margin-bottom:14px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:#f97316;border-radius:3px;transition:width .4s"></div>
            </div>
            <div style="display:flex;justify-content:space-between;gap:4px">
                ${dias.map(d => `
                    <div style="flex:1;text-align:center">
                        <div style="width:28px;height:28px;border-radius:6px;margin:0 auto 4px;background:${d.ativo ? '#f97316' : 'var(--color-background-secondary)'};opacity:${d.isHoje ? 1 : 0.7}"></div>
                        <div style="font-size:10px;color:var(--color-text-tertiary)">${d.label}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderizarEstatisticasPorSite(porSite) {
        const container = document.getElementById('stats-por-site');
        if (!container) return;

        const sites = Object.entries(porSite)
            .map(([host, data]) => ({
                host,
                total: Object.values(data.erros || {}).reduce((a, b) => a + b, 0),
                aceitas: data.aceitas || 0,
                recusadas: data.recusadas || 0
            }))
            .filter(s => s.total > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, 10);

        if (sites.length === 0) {
            container.innerHTML = '<p style="color:var(--color-text-tertiary);font-size:13px;text-align:center;padding:20px 0">Nenhum dado ainda. Use a extensão em alguns sites para ver as estatísticas.</p>';
            return;
        }

        const maxTotal = sites[0].total;
        container.innerHTML = sites.map(s => {
            const taxa = s.aceitas + s.recusadas > 0
                ? Math.round((s.aceitas / (s.aceitas + s.recusadas)) * 100)
                : null;
            const barWidth = Math.round((s.total / maxTotal) * 100);
            return `
                <div style="margin-bottom:14px">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
                        <span style="font-size:13px;font-weight:500;color:var(--color-text-primary)">${escapeHtml(s.host)}</span>
                        <div style="display:flex;gap:8px;align-items:center">
                            ${taxa !== null ? `<span style="font-size:11px;color:var(--color-text-success)">${taxa}% aceitas</span>` : ''}
                            <span style="font-size:12px;color:var(--color-text-tertiary)">${s.total} erros</span>
                        </div>
                    </div>
                    <div style="height:6px;background:var(--color-background-secondary);border-radius:3px;overflow:hidden">
                        <div style="height:100%;width:${barWidth}%;background:var(--color-text-info);border-radius:3px;transition:width .3s"></div>
                    </div>
                </div>`;
        }).join('');
    }

    function escapeHtml(texto) {
        const d = document.createElement('div');
        d.textContent = texto;
        return d.innerHTML;
    }
    
    // =============================================
    // STORAGE LISTENER
    // =============================================
    
    function configurarStorageListener() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace !== 'local') return;
            
            if (changes.totalCorrigidas || changes.totalAceitas || changes.totalRecusadas || 
                changes.dicionario_pessoal || changes.erroMaisComum || changes.language || 
                changes.cloudSync || changes.modoLeituraGlobal) {
                
                chrome.storage.local.get({
                    totalCorrigidas: 0,
                    totalAceitas: 0,
                    totalRecusadas: 0,
                    dicionario_pessoal: [],
                    language: 'pt-BR',
                    erroMaisComum: {},
                    cloudSync: false,
                    modoLeituraGlobal: false
                }, (r) => {
                    carregarDashboard(r);
                });
            }
        });
    }

    // =============================================
    // API PÚBLICA - EVENTOS
    // =============================================

    function configurarApiPublica() {
        const btnCopiar = document.getElementById('btn-copiar-api-exemplo');
        const btnDemo = document.getElementById('btn-abrir-demo');
        const linkDoc = document.getElementById('link-documentacao');
        
        // Copiar código exemplo
        if (btnCopiar) {
            btnCopiar.addEventListener('click', () => {
                const codigo = `// SyntaxMentor API - Exemplo de uso
    const resultado = await SyntaxMentor.correct("texto com erro");
    console.log(resultado.correctedText);

    // Com configuração
    const resultado = await SyntaxMentor.correct("Hello world", {
        language: "en-US",
        pickyMode: true
    });

    // Corrigir elemento HTML
    await SyntaxMentor.correctElement(document.getElementById("meu-texto"));`;
                
                navigator.clipboard.writeText(codigo);
                mostrarNotificacao('✅ Código copiado!', 'success');
            });
        }
        
        // Abrir demonstração
        if (btnDemo) {
            btnDemo.addEventListener('click', () => {
                // Abrir página de exemplo
                chrome.tabs.create({ url: chrome.runtime.getURL('api-usage.html') });
            });
        }
        
        // Link documentação
        if (linkDoc) {
            linkDoc.addEventListener('click', (e) => {
                e.preventDefault();
                // Abrir documentação online
                window.open('https://github.com/seu-usuario/syntaxmentor-api', '_blank');
            });
        }
    }

    // Chamar a função
    configurarApiPublica();
    
    // =============================================
    // INICIALIZAR
    // =============================================
    
    function iniciarPaginaDashboard() {
        carregarDadosIniciais();
        configurarStorageListener();
        carregarTema();
    }
    
    iniciarPaginaDashboard();
}