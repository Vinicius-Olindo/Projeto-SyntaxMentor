// SyntaxMentor options geral module: keyboard shortcuts.

function iniciarGravacao(botaoElement, configKey) {
    if (activeBtn) cancelarGravacao();
    recordingTarget = configKey;
    activeBtn = botaoElement;
    activeBtn.textContent = 'Pressione a tecla...';
    activeBtn.classList.add('gravando');
}

function cancelarGravacao() {
    if (!activeBtn) return;

    var btnLocal = activeBtn;
    var targetLocal = recordingTarget;
    btnLocal.classList.remove('gravando');

    smStorageLocalGet(SM_GERAL_SHORTCUT_DEFAULTS, (res) => {
        if (targetLocal && res[targetLocal]) {
            btnLocal.textContent = res[targetLocal].display;
        }
    });

    recordingTarget = null;
    activeBtn = null;
}

function configurarBotaoGravacao(id, storageKey) {
    var botao = document.getElementById(id);
    if (!botao) return;

    botao.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        iniciarGravacao(botao, storageKey);
    });
}

function configurarGravacaoAtalhos() {
    configurarBotaoGravacao('btn-gravar-atalho', 'toggleShortcut');
    configurarBotaoGravacao('btn-gravar-ignorar', 'ignoreShortcut');
    configurarBotaoGravacao('btn-gravar-corrigir-tudo', 'corrigirTudoShortcut');
    configurarBotaoGravacao('btn-gravar-ativar', 'ativarShortcut');
    configurarBotaoGravacao('btn-gravar-desativar', 'desativarShortcut');

    document.addEventListener('keydown', (e) => {
        if (!recordingTarget) return;
        if (['Control', 'Alt', 'Shift', 'Meta', 'Escape'].includes(e.key)) return;

        e.preventDefault();
        e.stopPropagation();

        var shortcut = criarShortcut(e);
        smStorageLocalSet({ [recordingTarget]: shortcut }, () => {
            if (activeBtn) {
                activeBtn.textContent = shortcut.display;
                activeBtn.classList.remove('gravando');
            }
            mostrarNotificacao(`Atalho gravado: ${shortcut.display}`, 'success');
            recordingTarget = null;
            activeBtn = null;
        });
    });

    document.addEventListener('click', (e) => {
        if (recordingTarget && activeBtn && e.target !== activeBtn) {
            cancelarGravacao();
        }
    });
}

function criarShortcut(e) {
    var partes = [];
    if (e.ctrlKey) partes.push('Ctrl');
    if (e.altKey) partes.push('Alt');
    if (e.shiftKey) partes.push('Shift');
    partes.push(e.key.toUpperCase());

    var shortcut = {
        altKey: e.altKey,
        ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey,
        key: e.key.toLowerCase(),
        display: partes.join(' + ')
    };

    if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
        shortcut.altKey = true;
        shortcut.display = `Alt + ${e.key.toUpperCase()}`;
    }

    return shortcut;
}

function carregarAtalhos() {
    smStorageLocalGet(SM_GERAL_SHORTCUT_DEFAULTS, (res) => {
        atualizarTextoAtalho('btn-gravar-atalho', res.toggleShortcut);
        atualizarTextoAtalho('btn-gravar-ignorar', res.ignoreShortcut);
        atualizarTextoAtalho('btn-gravar-corrigir-tudo', res.corrigirTudoShortcut);
        atualizarTextoAtalho('btn-gravar-ativar', res.ativarShortcut);
        atualizarTextoAtalho('btn-gravar-desativar', res.desativarShortcut);
    });
}

function atualizarTextoAtalho(id, shortcut) {
    var botao = document.getElementById(id);
    if (botao && shortcut) botao.textContent = shortcut.display;
}
