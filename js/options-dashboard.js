// SyntaxMentor - options-dashboard.js v2.5.0 (Final)
document.addEventListener('DOMContentLoaded', () => {

    const heroTotal = document.getElementById('hero-total');
    const heroNivel = document.getElementById('hero-nivel');
    const statAceitas = document.getElementById('stat-aceitas');
    const statRecusadas = document.getElementById('stat-recusadas');
    const statTaxa = document.getElementById('stat-taxa');
    const statDic = document.getElementById('stat-dic');
    const statIdioma = document.getElementById('stat-idioma');
    const statCloud = document.getElementById('stat-cloud');
    const listaErrosComuns = document.getElementById('lista-erros-comuns');
    const listaConquistas = document.getElementById('lista-conquistas');

    function carregarDashboard() {
        chrome.storage.local.get({
            totalCorrigidas: 0, totalAceitas: 0, totalRecusadas: 0,
            dicionario_pessoal: [], language: 'pt-BR', erroMaisComum: {},
            darkMode: false, cloudSync: false
        }, (res) => {
            const total = res.totalCorrigidas || 0;
            const aceitas = res.totalAceitas || 0;
            const recusadas = res.totalRecusadas || 0;

            heroTotal.textContent = total.toLocaleString();
            let nivel = '🟢 Iniciante';
            if (total >= 1000) nivel = '👑 Lendário';
            else if (total >= 500) nivel = '⭐ Mestre';
            else if (total >= 100) nivel = '🔥 Avançado';
            else if (total >= 10) nivel = '📈 Intermediário';
            heroNivel.textContent = 'Nível: ' + nivel;

            statAceitas.textContent = aceitas.toLocaleString();
            statRecusadas.textContent = recusadas.toLocaleString();
            statDic.textContent = (res.dicionario_pessoal || []).length.toLocaleString();
            statIdioma.textContent = res.language || 'pt-BR';
            statCloud.textContent = res.cloudSync ? '☁️ Ligado' : 'Desligado';

            const totalIteracoes = aceitas + recusadas;
            statTaxa.textContent = totalIteracoes > 0 ? Math.round((aceitas / totalIteracoes) * 100) + '%' : '100%';

            const erros = res.erroMaisComum || {};
            const ordenados = Object.entries(erros).sort((a, b) => b[1] - a[1]).slice(0, 6);

            if (ordenados.length === 0) {
                listaErrosComuns.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">Corrija alguns erros para ver suas estatísticas aqui!</p>';
            } else {
                const max = ordenados[0][1];
                listaErrosComuns.innerHTML = ordenados.map(([palavra, count]) => {
                    const pct = Math.max(Math.round((count / max) * 100), 10);
                    return `<div class="barra-container-dash"><div class="barra-label-dash"><span>${palavra}</span><span>${count}x</span></div><div class="barra-dash"><div class="barra-preenchida-dash" style="width:${pct}%;">${count}x</div></div></div>`;
                }).join('');
            }

            const conquistas = [
                { nome: 'Primeira Correção', desbloqueada: total >= 1 },
                { nome: '10 Correções', desbloqueada: total >= 10 },
                { nome: '50 Correções', desbloqueada: total >= 50 },
                { nome: '100 Correções', desbloqueada: total >= 100 },
                { nome: '500 Correções', desbloqueada: total >= 500 },
                { nome: '1000 Correções', desbloqueada: total >= 1000 },
                { nome: '10 Palavras no Dicionário', desbloqueada: (res.dicionario_pessoal || []).length >= 10 },
                { nome: '50 Palavras no Dicionário', desbloqueada: (res.dicionario_pessoal || []).length >= 50 },
                { nome: 'Usou Cloud Sync', desbloqueada: res.cloudSync || false }
            ];

            listaConquistas.innerHTML = conquistas.map(c =>
                `<div class="conquista-card ${c.desbloqueada ? 'unlock' : 'lock'}"><div class="conquista-icon">${c.desbloqueada ? '🏆' : '🔒'}</div><div class="conquista-nome">${c.nome}</div></div>`
            ).join('');

            if (res.darkMode) document.body.classList.add('dark-mode');
            else document.body.classList.remove('dark-mode');
        });
    }

    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'local') return;
        if (changes.darkMode) {
            if (changes.darkMode.newValue) document.body.classList.add('dark-mode');
            else document.body.classList.remove('dark-mode');
        }
        if (changes.totalCorrigidas || changes.totalAceitas || changes.totalRecusadas || changes.dicionario_pessoal || changes.erroMaisComum || changes.language || changes.cloudSync) {
            carregarDashboard();
        }
    });

    carregarDashboard();
});