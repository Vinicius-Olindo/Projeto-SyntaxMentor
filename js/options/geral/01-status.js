// SyntaxMentor options geral module: status badges.

function atualizarStatusGeral() {
    if (!smGeralPage) return;

    var statusIdiomaBadge = document.getElementById('status-idioma-badge');
    var statusSpeedBadge = document.getElementById('status-speed-badge');
    var statusPickyBadge = document.getElementById('status-picky-badge');
    var statusDicBadge = document.getElementById('status-dic-badge');
    var statusModoRevisaoBadge = document.getElementById('status-modo-revisao-badge');
    var blacklistCount = document.getElementById('blacklist-count');
    var dicCount = document.getElementById('dic-count');

    if (!statusIdiomaBadge && !statusSpeedBadge && !statusPickyBadge && !statusDicBadge && !statusModoRevisaoBadge) return;

    smStorageLocalGet({
        language: 'pt-BR',
        speed: '500',
        pickyMode: true,
        modoManual: false,
        dicionario_pessoal: [],
        blacklist: []
    }, (res) => {
        var nomesIdiomas = {
            'pt-BR': 'Portugues (Brasil)',
            'en-US': 'English (US)',
            es: 'Espanol',
            fr: 'Francais',
            de: 'Deutsch',
            it: 'Italiano'
        };

        var nomesVelocidade = {
            300: 'Rapido',
            500: 'Equilibrado',
            1000: 'Leve'
        };

        if (statusIdiomaBadge) statusIdiomaBadge.textContent = nomesIdiomas[res.language] || res.language;
        if (statusSpeedBadge) statusSpeedBadge.textContent = nomesVelocidade[res.speed] || `${res.speed}ms`;
        if (statusPickyBadge) statusPickyBadge.textContent = res.pickyMode ? 'Picky ativado' : 'Padrao';
        if (statusDicBadge) statusDicBadge.textContent = `${(res.dicionario_pessoal || []).length} palavras`;
        if (statusModoRevisaoBadge) statusModoRevisaoBadge.textContent = res.modoManual ? 'Manual' : 'Automatica';
        if (blacklistCount) blacklistCount.textContent = (res.blacklist || []).length;
        if (dicCount) dicCount.textContent = (res.dicionario_pessoal || []).length;
    });
}
