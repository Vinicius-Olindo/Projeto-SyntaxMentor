// SyntaxMentor - options.js v2.3.0 (API Key + Modo Leitura)
document.addEventListener('DOMContentLoaded', () => {

    // =============================================
    // ELEMENTOS DA INTERFACE
    // =============================================
    const elLanguage = document.getElementById('language');
    const elPickyMode = document.getElementById('pickyMode');
    const elDarkMode = document.getElementById('darkMode');
    const elAutoHideBubble = document.getElementById('autoHideBubble');
    const elSpeedOptions = document.querySelectorAll('input[name="speed"]');
    const btnSalvar = document.getElementById('btn-salvar');
    const saveStatus = document.getElementById('save-status');

    // Blacklist
    const blacklistInput = document.getElementById('blacklist-input');
    const btnAddBlacklist = document.getElementById('btn-add-blacklist');
    const blacklistUl = document.getElementById('blacklist-list');
    let currentBlacklist = [];

    // Dicionário
    const dictionaryInput = document.getElementById('dictionary-input');
    const btnAddDictionary = document.getElementById('btn-add-dictionary');
    const dictionaryUl = document.getElementById('dictionary-list');
    let currentDictionary = [];

    // Atalhos
    const btnGravarToggle = document.getElementById('btn-gravar-atalho');
    const btnGravarIgnore = document.getElementById('btn-gravar-ignorar');
    const btnGravarCorrigirTudo = document.getElementById('btn-gravar-corrigir-tudo');
    let recordingTarget = null;
    let activeBtn = null;

    // Backup
    const btnExportar = document.getElementById('btn-exportar');
    const btnImportar = document.getElementById('btn-importar');
    const inputImportar = document.getElementById('input-importar');

    // 🆕 API Key
    const elApiUrl = document.getElementById('api-url');
    const elApiKey = document.getElementById('api-key');
    const btnTestarApi = document.getElementById('btn-testar-api');
    const btnToggleVisibilidade = document.getElementById('btn-toggle-visibilidade');
    const statusApi = document.getElementById('status-api');
    const detalhesApi = document.getElementById('detalhes-api');
    const apiInfo = document.getElementById('api-info');

    // 🆕 Modo Leitura
    const elModoConfirmacao = document.getElementById('modoConfirmacao');
    const elModoLeituraGlobal = document.getElementById('modoLeituraGlobal');
    const modoLeituraInput = document.getElementById('modo-leitura-input');
    const btnAddModoLeitura = document.getElementById('btn-add-modo-leitura');
    const modoLeituraUl = document.getElementById('modo-leitura-list');
    let currentModoLeitura = [];

    // 🆕 Estatísticas
    const statTotalCorrigidas = document.getElementById('stat-total-corrigidas');
    const statTaxaAceitacao = document.getElementById('stat-taxa-aceitacao');
    const statDicionario = document.getElementById('stat-dicionario');

    // Tabs
    const menuItems = document.querySelectorAll('.menu li');
    const abas = {
        geral: document.getElementById('aba-geral'),
        seguranca: document.getElementById('aba-seguranca')
    };
    const tituloPagina = document.getElementById('titulo-pagina');
    const subtituloPagina = document.getElementById('subtitulo-pagina');

    // =============================================
    // NAVEGAÇÃO DE ABAS
    // =============================================
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');

            // Atualiza menu
            menuItems.forEach(m => m.classList.remove('active'));
            item.classList.add('active');

            // Atualiza conteúdo
            Object.keys(abas).forEach(key => abas[key].classList.add('hidden-section'));
            abas[tab].classList.remove('hidden-section');
            abas[tab].classList.add('active-section');

            // Atualiza título
            if (tab === 'seguranca') {
                tituloPagina.textContent = 'Segurança & Privacidade';
                subtituloPagina.textContent = 'Configure a API, modo de correção e permissões.';
            } else {
                tituloPagina.textContent = 'Configurações do Mentor';
                subtituloPagina.textContent = 'Personalize como a extensão deve se comportar enquanto você escreve.';
            }
        });
    });

    // =============================================
    // 1. CARREGAR CONFIGURAÇÕES
    // =============================================
    chrome.storage.local.get({
        language: 'pt-BR',
        pickyMode: true,
        darkMode: false,
        autoHideBubble: false,
        speed: '500',
        blacklist: [],
        dicionario_pessoal: [],
        modoLeituraSites: [],
        modoConfirmacao: false,
        modoLeituraGlobal: false,
        apiUrl: '',
        apiKey: '',
        toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's', display: 'Alt + S' },
        ignoreShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 'i', display: 'Alt + I' },
        corrigirTudoShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 's', display: 'Alt + Shift + S' },
        totalCorrigidas: 0,
        totalAceitas: 0,
        totalRecusadas: 0
    }, (res) => {
        if (elLanguage) elLanguage.value = res.language;
        if (elPickyMode) elPickyMode.checked = res.pickyMode;
        if (elDarkMode) { elDarkMode.checked = res.darkMode; if (res.darkMode) document.body.classList.add('dark-mode'); }
        if (elAutoHideBubble) elAutoHideBubble.checked = res.autoHideBubble || false;

        elSpeedOptions.forEach(opt => { if (opt.value === res.speed.toString()) opt.checked = true; });

        currentBlacklist = res.blacklist; renderizarBlacklist();
        currentDictionary = res.dicionario_pessoal; renderizarDicionario();
        currentModoLeitura = res.modoLeituraSites || []; renderizarModoLeitura();

        if (btnGravarToggle) btnGravarToggle.textContent = res.toggleShortcut.display;
        if (btnGravarIgnore) btnGravarIgnore.textContent = res.ignoreShortcut.display;
        if (btnGravarCorrigirTudo) btnGravarCorrigirTudo.textContent = res.corrigirTudoShortcut.display;

        // API
        if (elApiUrl) elApiUrl.value = res.apiUrl || '';
        if (elApiKey) elApiKey.value = res.apiKey || '';

        // Modo Leitura
        if (elModoConfirmacao) elModoConfirmacao.checked = res.modoConfirmacao || false;
        if (elModoLeituraGlobal) elModoLeituraGlobal.checked = res.modoLeituraGlobal || false;

        // Estatísticas
        atualizarEstatisticas(res.totalCorrigidas || 0, res.totalAceitas || 0, res.totalRecusadas || 0);
    });

    // =============================================
    // LIVE SYNC
    // =============================================
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.dicionario_pessoal) { currentDictionary = changes.dicionario_pessoal.newValue || []; renderizarDicionario(); }
            if (changes.blacklist) { currentBlacklist = changes.blacklist.newValue || []; renderizarBlacklist(); }
            if (changes.modoLeituraSites) { currentModoLeitura = changes.modoLeituraSites.newValue || []; renderizarModoLeitura(); }
            if (changes.darkMode) {
                if (elDarkMode) elDarkMode.checked = changes.darkMode.newValue;
                if (changes.darkMode.newValue) document.body.classList.add('dark-mode');
                else document.body.classList.remove('dark-mode');
            }
            if (changes.autoHideBubble && elAutoHideBubble) elAutoHideBubble.checked = changes.autoHideBubble.newValue;
            if (changes.modoConfirmacao && elModoConfirmacao) elModoConfirmacao.checked = changes.modoConfirmacao.newValue;
            if (changes.modoLeituraGlobal && elModoLeituraGlobal) elModoLeituraGlobal.checked = changes.modoLeituraGlobal.newValue;
        }
    });

    // =============================================
    // EVENTOS EM TEMPO REAL
    // =============================================
    if (elDarkMode) elDarkMode.addEventListener('change', (e) => {
        const isDark = e.target.checked;
        if (isDark) document.body.classList.add('dark-mode'); else document.body.classList.remove('dark-mode');
        chrome.storage.local.set({ darkMode: isDark });
    });

    if (elAutoHideBubble) elAutoHideBubble.addEventListener('change', (e) => {
        chrome.storage.local.set({ autoHideBubble: e.target.checked });
    });

    if (elModoConfirmacao) elModoConfirmacao.addEventListener('change', (e) => {
        chrome.storage.local.set({ modoConfirmacao: e.target.checked });
    });

    if (elModoLeituraGlobal) elModoLeituraGlobal.addEventListener('change', (e) => {
        chrome.storage.local.set({ modoLeituraGlobal: e.target.checked });
    });

    // =============================================
    // 🆕 TESTAR API
    // =============================================
    if (btnTestarApi) {
        btnTestarApi.addEventListener('click', async () => {
            const url = (elApiUrl?.value || 'https://api.languagetool.org/v2/check').trim();
            const key = elApiKey?.value?.trim() || '';

            statusApi.textContent = '⏳ Testando...';
            statusApi.style.color = '#f59e0b';
            detalhesApi.style.display = 'none';

            const params = new URLSearchParams({ text: 'Hello world', language: 'en-US' });

            try {
                const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
                if (key) headers['Authorization'] = `Bearer ${key}`;

                const resp = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: params
                });

                if (resp.ok) {
                    const data = await resp.json();
                    statusApi.textContent = '✅ Conectado!';
                    statusApi.style.color = '#28a745';
                    detalhesApi.style.display = 'block';
                    apiInfo.textContent = `Idioma detectado: ${data.language?.name || 'OK'} | Servidor: ${new URL(url).hostname}`;

                    // Salva automaticamente
                    chrome.storage.local.set({ apiUrl: url, apiKey: key });
                } else {
                    throw new Error(`HTTP ${resp.status}`);
                }
            } catch (err) {
                statusApi.textContent = '❌ Falhou: ' + err.message;
                statusApi.style.color = '#e53e3e';
                detalhesApi.style.display = 'none';
            }
        });
    }

    // 🆕 Toggle visibilidade da API Key
    if (btnToggleVisibilidade && elApiKey) {
        btnToggleVisibilidade.addEventListener('click', () => {
            if (elApiKey.type === 'password') {
                elApiKey.type = 'text';
                btnToggleVisibilidade.textContent = '🙈 Ocultar';
            } else {
                elApiKey.type = 'password';
                btnToggleVisibilidade.textContent = '👁️ Mostrar';
            }
        });
    }

    // =============================================
    // SALVAR
    // =============================================
    if (btnSalvar) {
        btnSalvar.addEventListener('click', () => {
            let selectedSpeed = '500';
            elSpeedOptions.forEach(opt => { if (opt.checked) selectedSpeed = opt.value; });

            const config = {
                language: elLanguage?.value || 'pt-BR',
                pickyMode: elPickyMode?.checked ?? true,
                speed: selectedSpeed,
                autoHideBubble: elAutoHideBubble?.checked || false,
                apiUrl: elApiUrl?.value?.trim() || '',
                apiKey: elApiKey?.value?.trim() || '',
                modoConfirmacao: elModoConfirmacao?.checked || false,
                modoLeituraGlobal: elModoLeituraGlobal?.checked || false
            };

            chrome.storage.local.set(config, () => {
                saveStatus.style.opacity = '1';
                saveStatus.style.color = '#28a745';
                saveStatus.textContent = '✓ Salvo com sucesso!';
                setTimeout(() => { saveStatus.style.opacity = '0'; }, 2000);
            });
        });
    }

    // =============================================
    // BLACKLIST
    // =============================================
    if (btnAddBlacklist) {
        btnAddBlacklist.addEventListener('click', () => {
            const domain = blacklistInput.value.trim().toLowerCase();
            if (domain && !currentBlacklist.includes(domain)) {
                currentBlacklist.unshift(domain);
                blacklistInput.value = '';
                chrome.storage.local.set({ blacklist: currentBlacklist });
            }
        });
    }

    function renderizarBlacklist() {
        if (!blacklistUl) return;
        blacklistUl.innerHTML = '';
        currentBlacklist.forEach((domain, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="item-text">${domain}</span>
                <input type="text" class="edit-input" value="${domain}" style="display:none;">
                <div class="action-btns">
                    <button class="btn-edit" data-index="${index}" title="Editar">✏️</button>
                    <button class="btn-remove" data-index="${index}" title="Remover">✕</button>
                </div>
            `;
            blacklistUl.appendChild(li);
        });
        adicionarOuvintesLista(blacklistUl, currentBlacklist, 'blacklist');
    }

    // =============================================
    // DICIONÁRIO
    // =============================================
    if (btnAddDictionary) {
        btnAddDictionary.addEventListener('click', () => {
            const word = dictionaryInput.value.trim().toLowerCase();
            if (word && !currentDictionary.includes(word)) {
                currentDictionary.unshift(word);
                dictionaryInput.value = '';
                chrome.storage.local.set({ dicionario_pessoal: currentDictionary });
            }
        });
    }

    function renderizarDicionario() {
        if (!dictionaryUl) return;
        dictionaryUl.innerHTML = '';
        currentDictionary.forEach((word, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="item-text">${word}</span>
                <input type="text" class="edit-input" value="${word}" style="display:none;">
                <div class="action-btns">
                    <button class="btn-edit" data-index="${index}" title="Editar">✏️</button>
                    <button class="btn-remove" data-index="${index}" title="Remover">✕</button>
                </div>
            `;
            dictionaryUl.appendChild(li);
        });
        adicionarOuvintesLista(dictionaryUl, currentDictionary, 'dicionario_pessoal');
        atualizarEstatisticas(null, null, null, currentDictionary.length);
    }

    // =============================================
    // 🆕 MODO LEITURA
    // =============================================
    if (btnAddModoLeitura) {
        btnAddModoLeitura.addEventListener('click', () => {
            const domain = modoLeituraInput.value.trim().toLowerCase();
            if (domain && !currentModoLeitura.includes(domain)) {
                currentModoLeitura.unshift(domain);
                modoLeituraInput.value = '';
                chrome.storage.local.set({ modoLeituraSites: currentModoLeitura });
            }
        });
    }

    function renderizarModoLeitura() {
        if (!modoLeituraUl) return;
        modoLeituraUl.innerHTML = '';
        currentModoLeitura.forEach((domain, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="item-text">${domain}</span>
                <div class="action-btns">
                    <span style="font-size: 10px; background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 10px; margin-right: 10px;">📖 Leitura</span>
                    <button class="btn-remove" data-index="${index}" title="Remover">✕</button>
                </div>
            `;
            modoLeituraUl.appendChild(li);
        });

        modoLeituraUl.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                currentModoLeitura.splice(idx, 1);
                chrome.storage.local.set({ modoLeituraSites: currentModoLeitura });
            });
        });
    }

    // =============================================
    // COMPARTILHADO: EDITAR/REMOVER
    // =============================================
    function adicionarOuvintesLista(listaUl, arrayAtual, storageKey) {
        listaUl.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                arrayAtual.splice(idx, 1);
                chrome.storage.local.set({ [storageKey]: arrayAtual });
            });
        });

        listaUl.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                const li = e.target.closest('li');
                const span = li.querySelector('.item-text');
                const input = li.querySelector('.edit-input');

                if (input.style.display === 'none') {
                    span.style.display = 'none';
                    input.style.display = 'block';
                    input.focus();
                    e.target.textContent = '✓';
                    e.target.style.color = '#28a745';
                } else {
                    salvarEdicaoInline(li, arrayAtual, storageKey);
                }
            });
        });

        listaUl.querySelectorAll('.edit-input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const li = e.target.closest('li');
                    salvarEdicaoInline(li, arrayAtual, storageKey);
                }
            });

            input.addEventListener('blur', () => {
                const li = input.closest('li');
                setTimeout(() => {
                    if (li.querySelector('.edit-input').style.display !== 'none') {
                        salvarEdicaoInline(li, arrayAtual, storageKey);
                    }
                }, 150);
            });
        });
    }

    function salvarEdicaoInline(li, arrayAtual, storageKey) {
        const span = li.querySelector('.item-text');
        const input = li.querySelector('.edit-input');
        const btnEdit = li.querySelector('.btn-edit');
        const idx = btnEdit.getAttribute('data-index');

        const novoValor = input.value.trim().toLowerCase();

        span.style.display = 'block';
        input.style.display = 'none';
        btnEdit.textContent = '✏️';
        btnEdit.style.color = '#6f42c1';

        if (novoValor && novoValor !== arrayAtual[idx]) {
            arrayAtual[idx] = novoValor;
            span.textContent = novoValor;
            chrome.storage.local.set({ [storageKey]: arrayAtual });
        } else if (!novoValor) {
            input.value = arrayAtual[idx];
        }
    }

    // =============================================
    // ATALHOS
    // =============================================
    function iniciarGravacao(botaoElement, configKey) {
        if (activeBtn) cancelarGravacao();
        recordingTarget = configKey; activeBtn = botaoElement;
        activeBtn.textContent = "Pressione..."; activeBtn.classList.add('gravando');
    }

    function cancelarGravacao() {
        if (!activeBtn) return;
        activeBtn.classList.remove('gravando');
        chrome.storage.local.get(recordingTarget, (res) => {
            if (res[recordingTarget]) activeBtn.textContent = res[recordingTarget].display;
        });
        recordingTarget = null; activeBtn = null;
    }

    if (btnGravarToggle) btnGravarToggle.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); iniciarGravacao(btnGravarToggle, 'toggleShortcut'); });
    if (btnGravarIgnore) btnGravarIgnore.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); iniciarGravacao(btnGravarIgnore, 'ignoreShortcut'); });
    if (btnGravarCorrigirTudo) btnGravarCorrigirTudo.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); iniciarGravacao(btnGravarCorrigirTudo, 'corrigirTudoShortcut'); });

    document.addEventListener('keydown', (e) => {
        if (!recordingTarget) return;
        if (['Control', 'Alt', 'Shift', 'Meta', 'Escape'].includes(e.key)) return;
        e.preventDefault();
        const shortcut = {
            altKey: e.altKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey,
            key: e.key.toLowerCase(),
            display: (e.ctrlKey ? 'Ctrl + ' : '') + (e.altKey ? 'Alt + ' : '') + (e.shiftKey ? 'Shift + ' : '') + e.key.toUpperCase()
        };
        if (!e.ctrlKey && !e.altKey && !e.shiftKey) { shortcut.altKey = true; shortcut.display = "Alt + " + e.key.toUpperCase(); }
        chrome.storage.local.set({ [recordingTarget]: shortcut }, () => {
            activeBtn.textContent = shortcut.display;
            activeBtn.classList.remove('gravando');
            recordingTarget = null; activeBtn = null;
        });
    });

    document.addEventListener('click', (e) => { if (recordingTarget && e.target !== activeBtn) cancelarGravacao(); });

    // =============================================
    // BACKUP
    // =============================================
    if (btnExportar) {
        btnExportar.addEventListener('click', () => {
            chrome.runtime.sendMessage({ action: 'exportData' }, (response) => {
                if (response?.success) {
                    const jsonStr = JSON.stringify(response.data, null, 2);
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `syntaxmentor-backup-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    mostrarNotificacao('✅ Backup exportado!', 'success');
                } else {
                    mostrarNotificacao('❌ Erro ao exportar', 'error');
                }
            });
        });
    }

    if (btnImportar && inputImportar) {
        btnImportar.addEventListener('click', () => inputImportar.click());
        inputImportar.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                chrome.runtime.sendMessage({ action: 'importData', data: event.target.result }, (response) => {
                    if (response?.success) {
                        mostrarNotificacao('✅ Restaurado! Recarregue.', 'success');
                        setTimeout(() => location.reload(), 1500);
                    } else {
                        mostrarNotificacao('❌ ' + (response?.error || 'Inválido'), 'error');
                    }
                });
            };
            reader.readAsText(file);
        });
    }

    function mostrarNotificacao(msg, tipo) {
        saveStatus.textContent = msg;
        saveStatus.style.opacity = '1';
        saveStatus.style.color = tipo === 'success' ? '#28a745' : '#e53e3e';
        setTimeout(() => { saveStatus.style.opacity = '0'; }, 3000);
    }

    // =============================================
    // 🆕 ESTATÍSTICAS
    // =============================================
    function atualizarEstatisticas(totalCorrigidas, totalAceitas, totalRecusadas, dicSize) {
        if (statTotalCorrigidas && totalCorrigidas !== null) statTotalCorrigidas.textContent = totalCorrigidas.toLocaleString();
        if (statDicionario && dicSize !== null) statDicionario.textContent = dicSize.toLocaleString();
        if (statTaxaAceitacao && totalAceitas !== null && totalRecusadas !== null) {
            const total = totalAceitas + totalRecusadas;
            if (total > 0) {
                statTaxaAceitacao.textContent = Math.round((totalAceitas / total) * 100) + '%';
            } else {
                statTaxaAceitacao.textContent = '100%';
            }
        }
    }
});