// SyntaxMentor options geral module: settings, events and storage sync.

function configurarSalvar() {
    if (!btnSalvar) return;

    btnSalvar.addEventListener('click', () => {
        var selectedSpeed = '500';
        elSpeedOptions.forEach((opt) => {
            if (opt.checked) selectedSpeed = opt.value;
        });

            smStorageLocalSet({
                language: elLanguage?.value || 'pt-BR',
                pickyMode: elPickyMode?.checked ?? true,
                modoManual: elModoManual?.checked || false,
                speed: selectedSpeed,
            autoHideBubble: elAutoHideBubble?.checked || false
        }, () => {
            mostrarNotificacao('Guardado com sucesso!', 'success');
            atualizarStatusGeral();
        });
    });
}

function configurarEventosRealtime() {
    if (elDarkMode) {
        elDarkMode.addEventListener('change', (e) => {
            document.body.classList.toggle('dark-mode', e.target.checked);
            smStorageLocalSet({ darkMode: e.target.checked });
        });
    }

    if (elAutoHideBubble) {
        elAutoHideBubble.addEventListener('change', (e) => {
            smStorageLocalSet({ autoHideBubble: e.target.checked });
        });
    }

    if (elModoManual) {
        elModoManual.addEventListener('change', (e) => {
            smStorageLocalSet({ modoManual: e.target.checked }, atualizarStatusGeral);
        });
    }

    configurarEventosBlacklist();
    configurarEventosDicionario();
}

function configurarEventosBlacklist() {
    if (btnAddBlacklist) {
        btnAddBlacklist.addEventListener('click', () => {
            var domain = normalizarDominio(blacklistInput.value);
            if (!domain) return;

            if (!isValidDomain(domain)) {
                mostrarNotificacao('Informe um dominio valido, ex: gmail.com', 'warning');
                return;
            }

            if (currentBlacklist.includes(domain)) {
                mostrarNotificacao('Este site ja esta na lista', 'info');
                blacklistInput.value = '';
                return;
            }

            currentBlacklist.unshift(domain);
            blacklistInput.value = '';
            salvarListaStorage(currentBlacklist, 'blacklist', () => {
                renderizarBlacklist();
                mostrarNotificacao(`"${domain}" bloqueado`, 'success');
                atualizarStatusGeral();
            });
        });
        adicionarEnterListener(blacklistInput, () => btnAddBlacklist.click());
    }

    if (btnClearBlacklist) {
        btnClearBlacklist.addEventListener('click', () => {
            if (currentBlacklist.length === 0) {
                mostrarNotificacao('A lista de sites ja esta vazia.', 'info');
                return;
            }

            smConfirmOptions(`Remover todos os ${currentBlacklist.length} sites bloqueados?`, () => {
                currentBlacklist = [];
                salvarListaStorage(currentBlacklist, 'blacklist', () => {
                    renderizarBlacklist();
                    mostrarNotificacao('Todos os sites foram removidos!', 'success');
                    atualizarStatusGeral();
                });
            });
        });
    }
}

function configurarEventosDicionario() {
    if (btnAddDictionary) {
        btnAddDictionary.addEventListener('click', () => {
            var word = dictionaryInput.value.trim().toLowerCase();
            if (!word) return;

            if (!isValidDictionaryWord(word)) {
                mostrarNotificacao('Informe uma palavra valida', 'warning');
                return;
            }

            if (currentDictionary.includes(word)) {
                mostrarNotificacao('Esta palavra ja existe no dicionario', 'info');
                dictionaryInput.value = '';
                return;
            }

            currentDictionary.unshift(word);
            dictionaryInput.value = '';
            salvarListaStorage(currentDictionary, 'dicionario_pessoal', () => {
                renderizarDicionario();
                mostrarNotificacao(`"${word}" adicionado`, 'success');
                atualizarStatusGeral();
            });
        });
        adicionarEnterListener(dictionaryInput, () => btnAddDictionary.click());
    }

    if (btnClearDictionary) {
        btnClearDictionary.addEventListener('click', () => {
            if (currentDictionary.length === 0) {
                mostrarNotificacao('O dicionario ja esta vazio.', 'info');
                return;
            }

            smConfirmOptions(`Remover todas as ${currentDictionary.length} palavras do dicionario?`, () => {
                currentDictionary = [];
                salvarListaStorage(currentDictionary, 'dicionario_pessoal', () => {
                    renderizarDicionario();
                    mostrarNotificacao('Todas as palavras foram removidas!', 'success');
                    atualizarStatusGeral();
                });
            });
        });
    }
}

function carregarConfiguracoesIniciais() {
    smStorageLocalGet({
        language: 'pt-BR',
        pickyMode: true,
        modoManual: false,
        darkMode: false,
        autoHideBubble: false,
        speed: '500',
        blacklist: [],
        dicionario_pessoal: [],
        ...SM_GERAL_SHORTCUT_DEFAULTS
    }, (res) => {
        if (elLanguage) elLanguage.value = res.language;
        if (elPickyMode) elPickyMode.checked = res.pickyMode;
        if (elModoManual) elModoManual.checked = !!res.modoManual;
        if (elDarkMode) {
            elDarkMode.checked = res.darkMode;
            document.body.classList.toggle('dark-mode', res.darkMode);
        }
        if (elAutoHideBubble) elAutoHideBubble.checked = !!res.autoHideBubble;

        elSpeedOptions.forEach((opt) => {
            opt.checked = opt.value === String(res.speed);
        });

        currentBlacklist = Array.isArray(res.blacklist) ? res.blacklist : [];
        currentDictionary = Array.isArray(res.dicionario_pessoal) ? res.dicionario_pessoal : [];
        renderizarBlacklist();
        renderizarDicionario();
        carregarAtalhos();
        atualizarStatusGeral();
    });
}

function configurarStorageListener() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'local') return;

        if (changes.dicionario_pessoal) {
            currentDictionary = changes.dicionario_pessoal.newValue || [];
            renderizarDicionario();
        }

        if (changes.blacklist) {
            currentBlacklist = changes.blacklist.newValue || [];
            renderizarBlacklist();
        }

        if (changes.darkMode && elDarkMode) {
            elDarkMode.checked = changes.darkMode.newValue;
            document.body.classList.toggle('dark-mode', changes.darkMode.newValue);
        }

        if (changes.modoManual && elModoManual) {
            elModoManual.checked = !!changes.modoManual.newValue;
        }

        if (changes.language || changes.speed || changes.pickyMode || changes.modoManual || changes.dicionario_pessoal || changes.blacklist) {
            atualizarStatusGeral();
        }
    });
}

function adicionarInfoAtalhosSite() {
    var atalhosContainer = document.querySelector('.card-atalhos');
    if (!atalhosContainer || document.getElementById('atalhos-site-info')) return;

    var wrapper = document.createElement('div');
    wrapper.id = 'atalhos-site-info';
    wrapper.style.marginTop = '12px';
    const divisor = smCriarElemento('hr', { className: 'divisor' });
    const linhaAtivar = smCriarElemento('div', {
        style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;'
    }, [
        smCriarElemento('span', { className: 'atalho-title', textContent: 'Ativar no site atual' }),
        smCriarElemento('kbd', { className: 'tecla-kbd', textContent: 'Alt + Shift + A' })
    ]);
    const linhaDesativar = smCriarElemento('div', {
        style: 'display:flex;justify-content:space-between;align-items:center;'
    }, [
        smCriarElemento('span', { className: 'atalho-title', textContent: 'Desativar no site atual' }),
        smCriarElemento('kbd', { className: 'tecla-kbd', textContent: 'Alt + Shift + D' })
    ]);
    const descricao = smCriarElemento('p', {
        className: 'desc',
        textContent: 'Use esses atalhos para ativar ou desativar o SyntaxMentor rapidamente no site atual.',
        style: 'margin-top:8px;font-size:11px;'
    });
    wrapper.append(divisor, linhaAtivar, linhaDesativar, descricao);
    atalhosContainer.appendChild(wrapper);
}
