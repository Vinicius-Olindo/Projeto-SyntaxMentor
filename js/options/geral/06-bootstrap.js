// SyntaxMentor options geral module: bootstrap.

function iniciarPaginaGeral() {
    if (!smGeralPage || smGeralInicializada) return;
    smGeralInicializada = true;

    migrarAtalhosSemModificador(() => {
        carregarConfiguracoesIniciais();
    });

    configurarEventosRealtime();
    configurarSalvar();
    configurarGravacaoAtalhos();
    configurarBackup();
    configurarStorageListener();
    adicionarInfoAtalhosSite();
    carregarTema();
}

function migrarAtalhosSemModificador(callback) {
    var keysAtalhos = smShortcutKeys();
    smStorageLocalGet(keysAtalhos, (res) => {
        var correcoes = {};

        keysAtalhos.forEach((key) => {
            var shortcut = res[key];
            if (shortcut && !shortcut.altKey && !shortcut.ctrlKey && !shortcut.shiftKey) {
                correcoes[key] = {
                    ...shortcut,
                    altKey: true,
                    display: `Alt + ${shortcut.key.toUpperCase()}`
                };
            }
        });

        if (Object.keys(correcoes).length > 0) {
            smStorageLocalSet(correcoes, callback);
            return;
        }

        callback();
    });
}
