// SyntaxMentor - options-dashboard.js v2.4.0
document.addEventListener('DOMContentLoaded', () => {

    const heroTotal = document.getElementById('hero-total');
    const heroNivel = document.getElementById('hero-nivel');
    const statAceitas = document.getElementById('stat-aceitas');
    const statRecusadas = document.getElementById('stat-recusadas');
    const statDic = document.getElementById('stat-dic');
    const statIdioma = document.getElementById('stat-idioma');
    const listaErrosComuns = document.getElementById('lista-erros-comuns');
    const listaConquistas = document.getElementById('lista-conquistas');

    function carregarDashboard() {
        chrome.storage.local.get({
            totalCorrigidas: 0,
            totalAceitas: 0,
            totalRecusadas: 0,
            dicionario_pessoal: [],
            language: 'pt-BR',
            erroMaisComum: {},
            darkMode: false
        }, (res) => {
            const total = res.totalCorrigidas || 0;
            heroTotal.textContent = total.toLocaleString();

            // Nível
            let nivel = 'Iniciante';
            if (total >= 1000) nivel = '👑 Lendário';
            else if (total >= 500) nivel = '⭐ Mestre';
            else if (total >= 100) nivel = '🔥 Avançado';
            else if (total >= 10) nivel = '📈 Intermediário';
            heroNivel.textContent = 'Nível: ' + nivel;

            statAceitas.textContent = (res.totalAceitas || 0).toLocaleString();
            statRecusadas.textContent = (res.totalRecusadas || 0).toLocaleString();
            statDic.textContent = (res.dicionario_pessoal || []).length.toLocaleString();
            statIdioma.textContent = res.language || 'pt-BR';

            // Erros mais comuns
            const erros = res.erroMaisComum || {};
            const ordenados = Object.entries(erros).sort((a, b) => b[1] - a[1]).slice(0, 5);

            if (ordenados.length === 0) {
                listaErrosComuns.innerHTML = '<p style="color:#888;">Corrija alguns erros para ver suas estatísticas!</p>';
            } else {
                const max = ordenados[0][1];
                listaErrosComuns.innerHTML = ordenados.map(([palavra, count]) => {
                    const pct = Math.round((count / max) * 100);
                    return `
                        <div class="barra-container">
                            <div class="barra-label"><span>${palavra}</span><span>${count}x</span></div>
                            <div class="barra"><div class="barra-preenchida" style="width: ${pct}%;">${count}x</div></div>
                        </div>`;
                }).join('');
            }

            // Conquistas
            const conquistas = [
                { nome: 'Primeira Correção', desbloqueada: total >= 1 },
                { nome: '10 Correções', desbloqueada: total >= 10 },
                { nome: '50 Correções', desbloqueada: total >= 50 },
                { nome: '100 Correções', desbloqueada: total >= 100 },
                { nome: '10 Palavras no Dicionário', desbloqueada: (res.dicionario_pessoal || []).length >= 10 },
                { nome: 'Usou Cloud Sync', desbloqueada: res.cloudSync || false }
            ];

            listaConquistas.innerHTML = conquistas.map(c =>
                `<div class="conquista ${c.desbloqueada ? 'desbloqueada' : ''}">
                    ${c.desbloqueada ? '🏆' : '🔒'} ${c.nome}
                </div>`
            ).join('');

            if (res.darkMode) document.body.classList.add('dark-mode');
        });
    }

    carregarDashboard();

    chrome.storage.onChanged.addListener((changes) => {
        if (changes.totalCorrigidas || changes.totalAceitas || changes.totalRecusadas ||
            changes.dicionario_pessoal || changes.erroMaisComum) {
            carregarDashboard();
        }
    });
});