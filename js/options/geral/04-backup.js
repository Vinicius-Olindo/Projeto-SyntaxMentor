// SyntaxMentor options geral module: backup import/export.

function smConfirmOptions(mensagem, onConfirm) {
    var existing = document.getElementById('sm-confirm-modal-options');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'sm-confirm-modal-options';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:100000;display:flex;align-items:center;justify-content:center;font-family:Segoe UI,system-ui,sans-serif';

    var box = document.createElement('div');
    box.style.cssText = 'background:var(--color-background-primary,#fff);border-radius:16px;padding:24px 28px;max-width:420px;width:90%;box-shadow:0 20px 40px rgba(0,0,0,.2)';

    var msg = document.createElement('p');
    msg.style.cssText = 'margin:0 0 20px;font-size:14px;line-height:1.6;color:var(--color-text-primary,#333);white-space:pre-line';
    msg.textContent = mensagem;

    var actions = document.createElement('div');
    actions.style.cssText = 'display:flex;gap:12px;justify-content:flex-end';

    var cancelar = document.createElement('button');
    cancelar.textContent = 'Cancelar';
    cancelar.style.cssText = 'padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer;border-radius:8px;border:1px solid #d1d5db;background:#f3f4f6;color:#6b7280';

    var confirmar = document.createElement('button');
    confirmar.textContent = 'Confirmar';
    confirmar.style.cssText = 'padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer;border-radius:8px;border:none;background:linear-gradient(135deg,#6f42c1,#8b5cf6);color:#fff';

    var fechar = () => overlay.remove();
    cancelar.addEventListener('click', fechar);
    confirmar.addEventListener('click', () => {
        fechar();
        onConfirm();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) fechar();
    });

    actions.appendChild(cancelar);
    actions.appendChild(confirmar);
    box.appendChild(msg);
    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    cancelar.focus();
}

function configurarBackup() {
    var btnExportar = document.getElementById('btn-exportar');
    var btnImportar = document.getElementById('btn-importar');
    var inputImportar = document.getElementById('input-importar');

    if (btnExportar) {
        btnExportar.addEventListener('click', () => {
            mostrarNotificacao('Gerando backup...', 'info');
            smStorageLocalGet(null, (dados) => {
                delete dados.apiKey;

                var backup = {
                    versao: '2.8.1',
                    data: new Date().toISOString(),
                    dados
                };

                var blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                var url = URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = `syntaxmentor-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                mostrarNotificacao('Backup exportado!', 'success');
            });
        });
    }

    if (btnImportar && inputImportar) {
        btnImportar.addEventListener('click', () => inputImportar.click());
        inputImportar.addEventListener('change', (e) => importarBackup(e, inputImportar));
    }
}

function importarBackup(event, inputImportar) {
    var file = event.target.files[0];
    if (!file) return;

    var ext = file.name.split('.').pop().toLowerCase();
    if (ext !== 'json' && ext !== 'txt') {
        mostrarNotificacao('Use arquivo .txt ou .json', 'error');
        inputImportar.value = '';
        return;
    }

    if (file.size > 10 * 1024 * 1024) {
        mostrarNotificacao('Arquivo muito grande (max 10MB)', 'error');
        inputImportar.value = '';
        return;
    }

    var reader = new FileReader();
    reader.onload = (loadEvent) => {
        try {
            processarImportacao(loadEvent.target.result, ext, inputImportar);
        } catch (err) {
            mostrarNotificacao('Erro ao ler arquivo', 'error');
            inputImportar.value = '';
        }
    };
    reader.onerror = () => {
        mostrarNotificacao('Erro ao ler arquivo', 'error');
        inputImportar.value = '';
    };
    reader.readAsText(file);
}

function processarImportacao(conteudo, ext, inputImportar) {
    var palavrasImportadas = [];
    var blacklistImportada = [];
    var idiomaImportado = null;

    if (ext === 'txt') {
        palavrasImportadas = conteudo
            .split(/\r?\n/)
            .map(linha => linha.trim().toLowerCase())
            .filter(linha => linha.length > 0 && !linha.startsWith('#'))
            .filter(isValidDictionaryWord);
    } else {
        var backup = JSON.parse(conteudo);
        var fonte = backup.dados || backup;
        palavrasImportadas = (fonte.dicionario_pessoal || [])
            .map(palavra => String(palavra || '').trim().toLowerCase())
            .filter(isValidDictionaryWord);
        blacklistImportada = (fonte.blacklist || [])
            .map(normalizarDominio)
            .filter(isValidDomain);
        idiomaImportado = fonte.language || null;
    }

    smStorageLocalGet(['dicionario_pessoal', 'blacklist', 'language'], (res) => {
        confirmarImportacao({
            palavrasImportadas,
            blacklistImportada,
            idiomaImportado,
            inputImportar,
            dicAtual: res.dicionario_pessoal || [],
            blackAtual: res.blacklist || [],
            idiomaAtual: res.language
        });
    });
}

function confirmarImportacao(ctx) {
    var novasPalavras = ctx.palavrasImportadas.filter(p => !ctx.dicAtual.includes(p)).length;
    var duplicadasPalavras = ctx.palavrasImportadas.length - novasPalavras;
    var novosSites = ctx.blacklistImportada.filter(s => !ctx.blackAtual.includes(s)).length;
    var duplicadosSites = ctx.blacklistImportada.length - novosSites;

    var mensagem = [
        'Resumo da Importacao:',
        '',
        `Dicionario: +${novasPalavras} novas, ${duplicadasPalavras} duplicadas`,
        `Blacklist: +${novosSites} novos, ${duplicadosSites} duplicados`,
        '',
        'Confirmar importacao?'
    ].join('\n');

    smConfirmOptions(mensagem, () => aplicarImportacao(ctx, novasPalavras, novosSites));
}

function aplicarImportacao(ctx, novasPalavras, novosSites) {
    var dicFinal = [...ctx.dicAtual];
    var blackFinal = [...ctx.blackAtual];

    ctx.palavrasImportadas.forEach((palavra) => {
        if (!dicFinal.includes(palavra)) dicFinal.push(palavra);
    });

    ctx.blacklistImportada.forEach((site) => {
        if (!blackFinal.includes(site)) blackFinal.push(site);
    });

    var dadosSalvar = {
        dicionario_pessoal: dicFinal,
        blacklist: blackFinal
    };

    if (ctx.idiomaImportado && ctx.idiomaImportado !== ctx.idiomaAtual) {
        dadosSalvar.language = ctx.idiomaImportado;
    }

    smStorageLocalSet(dadosSalvar, () => {
        currentDictionary = dicFinal;
        currentBlacklist = blackFinal;
        renderizarDicionario();
        renderizarBlacklist();

        if (ctx.idiomaImportado && elLanguage) elLanguage.value = ctx.idiomaImportado;
        atualizarStatusGeral();
        ctx.inputImportar.value = '';

        var msg = [];
        if (novasPalavras > 0) msg.push(`+${novasPalavras} palavras`);
        if (novosSites > 0) msg.push(`+${novosSites} sites`);
        mostrarNotificacao(msg.join(' | ') || 'Importado!', 'success');
    });
}
