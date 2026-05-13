// =============================================
// SyntaxMentor - options.js v2.6.0 (Unified: Geral + Segurança + Dashboard)
// =============================================

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

    const blacklistInput = document.getElementById('blacklist-input');
    const btnAddBlacklist = document.getElementById('btn-add-blacklist');
    const blacklistUl = document.getElementById('blacklist-list');
    let currentBlacklist = [];

    const dictionaryInput = document.getElementById('dictionary-input');
    const btnAddDictionary = document.getElementById('btn-add-dictionary');
    const dictionaryUl = document.getElementById('dictionary-list');
    let currentDictionary = [];

    const btnGravarToggle = document.getElementById('btn-gravar-atalho');
    const btnGravarIgnore = document.getElementById('btn-gravar-ignorar');
    const btnGravarCorrigirTudo = document.getElementById('btn-gravar-corrigir-tudo');
    let recordingTarget = null;
    let activeBtn = null;

    const btnExportar = document.getElementById('btn-exportar');
    const btnImportar = document.getElementById('btn-importar');
    const inputImportar = document.getElementById('input-importar');

    // 🆕 Segurança
    const elApiUrl = document.getElementById('api-url');
    const elApiKey = document.getElementById('api-key');
    const btnTestarApi = document.getElementById('btn-testar-api');
    const btnToggleVisibilidade = document.getElementById('btn-toggle-visibilidade');
    const statusApi = document.getElementById('status-api');
    const detalhesApi = document.getElementById('detalhes-api');
    const apiInfo = document.getElementById('api-info');
    const elModoConfirmacao = document.getElementById('modoConfirmacao');
    const elModoLeituraGlobal = document.getElementById('modoLeituraGlobal');
    const modoLeituraInput = document.getElementById('modo-leitura-input');
    const btnAddModoLeitura = document.getElementById('btn-add-modo-leitura');
    const modoLeituraUl = document.getElementById('modo-leitura-list');
    let currentModoLeitura = [];
    const elModoWhitelist = document.getElementById('modoWhitelist');
    const whitelistInput = document.getElementById('whitelist-input');
    const btnAddWhitelist = document.getElementById('btn-add-whitelist');
    const whitelistUl = document.getElementById('whitelist-list');
    let currentWhitelist = [];
    const elCloudSync = document.getElementById('cloudSync');

    // 🆕 Dashboard
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

    // =============================================
    // 0. APLICAR TEMA ESCURO AO INICIAR
    // =============================================
    chrome.storage.local.get({ darkMode: false }, (res) => {
        if (res.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    });

    // =============================================
    // 1. CARREGAR CONFIGURAÇÕES
    // =============================================
    chrome.storage.local.get({
        language: 'pt-BR', pickyMode: true, darkMode: false, autoHideBubble: false,
        speed: '500', blacklist: [], dicionario_pessoal: [],
        toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's', display: 'Alt + S' },
        ignoreShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 'i', display: 'Alt + I' },
        corrigirTudoShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 's', display: 'Alt + Shift + S' },
        apiUrl: '', apiKey: '', modoConfirmacao: false, modoLeituraGlobal: false,
        modoLeituraSites: [], modoWhitelist: false, whitelist: [], cloudSync: false,
        totalCorrigidas: 0, totalAceitas: 0, totalRecusadas: 0, erroMaisComum: {}
    }, (res) => {
        // Geral
        if (elLanguage) elLanguage.value = res.language;
        if (elPickyMode) elPickyMode.checked = res.pickyMode;
        if (elDarkMode) { elDarkMode.checked = res.darkMode; if (res.darkMode) document.body.classList.add('dark-mode'); }
        if (elAutoHideBubble) elAutoHideBubble.checked = res.autoHideBubble || false;
        elSpeedOptions.forEach(opt => { if (opt.value === res.speed.toString()) opt.checked = true; });
        currentBlacklist = res.blacklist; renderizarBlacklist();
        currentDictionary = res.dicionario_pessoal; renderizarDicionario();
        if (btnGravarToggle) btnGravarToggle.textContent = res.toggleShortcut.display;
        if (btnGravarIgnore) btnGravarIgnore.textContent = res.ignoreShortcut.display;
        if (btnGravarCorrigirTudo) btnGravarCorrigirTudo.textContent = res.corrigirTudoShortcut.display;

        // Segurança
        if (elApiUrl) elApiUrl.value = res.apiUrl || '';
        if (elApiKey) elApiKey.value = res.apiKey || '';
        if (elModoConfirmacao) elModoConfirmacao.checked = res.modoConfirmacao || false;
        if (elModoLeituraGlobal) elModoLeituraGlobal.checked = res.modoLeituraGlobal || false;
        if (elModoWhitelist) elModoWhitelist.checked = res.modoWhitelist || false;
        if (elCloudSync) elCloudSync.checked = res.cloudSync || false;
        currentModoLeitura = res.modoLeituraSites || []; renderizarModoLeitura();
        currentWhitelist = res.whitelist || []; renderizarWhitelist();

        // Dashboard
        carregarDashboard(res);
    });

    // =============================================
    // 2. LIVE SYNC
    // =============================================
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'local') return;
        if (changes.dicionario_pessoal) { currentDictionary = changes.dicionario_pessoal.newValue || []; renderizarDicionario(); }
        if (changes.blacklist) { currentBlacklist = changes.blacklist.newValue || []; renderizarBlacklist(); }
        if (changes.darkMode) {
            if (elDarkMode) elDarkMode.checked = changes.darkMode.newValue;
            document.body.classList.toggle('dark-mode', changes.darkMode.newValue);
        }
        if (changes.autoHideBubble && elAutoHideBubble) elAutoHideBubble.checked = changes.autoHideBubble.newValue;
        if (changes.modoLeituraSites) { currentModoLeitura = changes.modoLeituraSites.newValue || []; renderizarModoLeitura(); }
        if (changes.whitelist) { currentWhitelist = changes.whitelist.newValue || []; renderizarWhitelist(); }
        if (changes.modoConfirmacao && elModoConfirmacao) elModoConfirmacao.checked = changes.modoConfirmacao.newValue;
        if (changes.modoLeituraGlobal && elModoLeituraGlobal) elModoLeituraGlobal.checked = changes.modoLeituraGlobal.newValue;
        if (changes.modoWhitelist && elModoWhitelist) elModoWhitelist.checked = changes.modoWhitelist.newValue;
        if (changes.cloudSync && elCloudSync) elCloudSync.checked = changes.cloudSync.newValue;
        if (changes.totalCorrigidas || changes.totalAceitas || changes.totalRecusadas || changes.dicionario_pessoal || changes.erroMaisComum || changes.language || changes.cloudSync) {
            chrome.storage.local.get({ totalCorrigidas: 0, totalAceitas: 0, totalRecusadas: 0, dicionario_pessoal: [], language: 'pt-BR', erroMaisComum: {}, cloudSync: false }, carregarDashboard);
        }
    });

    // =============================================
    // 3. EVENTOS EM TEMPO REAL
    // =============================================
    if (elDarkMode) elDarkMode.addEventListener('change', (e) => {
        document.body.classList.toggle('dark-mode', e.target.checked);
        chrome.storage.local.set({ darkMode: e.target.checked });
    });
    if (elAutoHideBubble) elAutoHideBubble.addEventListener('change', (e) => chrome.storage.local.set({ autoHideBubble: e.target.checked }));
    if (elModoConfirmacao) elModoConfirmacao.addEventListener('change', (e) => chrome.storage.local.set({ modoConfirmacao: e.target.checked }));
    if (elModoLeituraGlobal) elModoLeituraGlobal.addEventListener('change', (e) => chrome.storage.local.set({ modoLeituraGlobal: e.target.checked }));
    if (elModoWhitelist) elModoWhitelist.addEventListener('change', (e) => chrome.storage.local.set({ modoWhitelist: e.target.checked }));
    if (elCloudSync) elCloudSync.addEventListener('change', (e) => chrome.storage.local.set({ cloudSync: e.target.checked }));

    // =============================================
    // 4. SALVAR CONFIGURAÇÕES GERAIS
    // =============================================
    if (btnSalvar) btnSalvar.addEventListener('click', () => {
        let selectedSpeed = '500';
        elSpeedOptions.forEach(opt => { if (opt.checked) selectedSpeed = opt.value; });
        chrome.storage.local.set({
            language: elLanguage?.value || 'pt-BR',
            pickyMode: elPickyMode?.checked ?? true,
            speed: selectedSpeed,
            autoHideBubble: elAutoHideBubble?.checked || false,
            apiUrl: elApiUrl?.value?.trim() || '',
            apiKey: elApiKey?.value?.trim() || '',
            modoConfirmacao: elModoConfirmacao?.checked || false,
            modoLeituraGlobal: elModoLeituraGlobal?.checked || false,
            modoWhitelist: elModoWhitelist?.checked || false,
            cloudSync: elCloudSync?.checked || false
        }, () => mostrarNotificacao('✓ Guardado com sucesso!', 'success'));
    });

    // =============================================
    // 5. BLACKLIST
    // =============================================
    if (btnAddBlacklist) {
        btnAddBlacklist.addEventListener('click', () => {
            const domain = blacklistInput.value.trim().toLowerCase();
            if (!domain) return;
            if (!currentBlacklist.includes(domain)) { currentBlacklist.unshift(domain); blacklistInput.value = ''; chrome.storage.local.set({ blacklist: currentBlacklist }); }
            else { mostrarNotificacao('⚠️ Este site já está na lista', 'info'); blacklistInput.value = ''; }
        });
        blacklistInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); btnAddBlacklist.click(); } });
    }

    function renderizarBlacklist() {
        if (!blacklistUl) return;
        blacklistUl.innerHTML = '';
        if (currentBlacklist.length === 0) { blacklistUl.innerHTML = '<li style="color:#9ca3af;text-align:center;padding:10px;">Nenhum site bloqueado</li>'; return; }
        currentBlacklist.forEach((domain, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="item-text">${escapeHtml(domain)}</span><input type="text" class="edit-input" value="${escapeHtml(domain)}" style="display:none;"><div class="action-btns"><button class="btn-edit" data-index="${index}" title="Editar">✏️</button><button class="btn-remove" data-index="${index}" title="Remover">✕</button></div>`;
            blacklistUl.appendChild(li);
        });
        adicionarOuvintesLista(blacklistUl, currentBlacklist, 'blacklist');
    }

    // =============================================
    // 6. DICIONÁRIO
    // =============================================
    if (btnAddDictionary) {
        btnAddDictionary.addEventListener('click', () => {
            const word = dictionaryInput.value.trim().toLowerCase();
            if (!word) return;
            if (!currentDictionary.includes(word)) { currentDictionary.unshift(word); dictionaryInput.value = ''; chrome.storage.local.set({ dicionario_pessoal: currentDictionary }); }
            else { mostrarNotificacao('⚠️ Esta palavra já existe no dicionário', 'info'); dictionaryInput.value = ''; }
        });
        dictionaryInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); btnAddDictionary.click(); } });
    }

    function renderizarDicionario() {
        if (!dictionaryUl) return;
        dictionaryUl.innerHTML = '';
        if (currentDictionary.length === 0) { dictionaryUl.innerHTML = '<li style="color:#9ca3af;text-align:center;padding:10px;">Nenhuma palavra adicionada</li>'; return; }
        currentDictionary.forEach((word, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="item-text">${escapeHtml(word)}</span><input type="text" class="edit-input" value="${escapeHtml(word)}" style="display:none;"><div class="action-btns"><button class="btn-edit" data-index="${index}" title="Editar">✏️</button><button class="btn-remove" data-index="${index}" title="Remover">✕</button></div>`;
            dictionaryUl.appendChild(li);
        });
        adicionarOuvintesLista(dictionaryUl, currentDictionary, 'dicionario_pessoal');
    }

    // =============================================
    // 7. FUNÇÃO COMPARTILHADA DE OUVINTES
    // =============================================
    function adicionarOuvintesLista(listaUl, arrayAtual, storageKey) {
        listaUl.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.target.getAttribute('data-index'));
                if (idx >= 0 && idx < arrayAtual.length) { const removido = arrayAtual[idx]; arrayAtual.splice(idx, 1); chrome.storage.local.set({ [storageKey]: arrayAtual }, () => mostrarNotificacao(`🗑️ "${removido}" removido`, 'info')); }
            });
        });
        listaUl.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.target.getAttribute('data-index'));
                const li = e.target.closest('li');
                const span = li.querySelector('.item-text');
                const input = li.querySelector('.edit-input');
                if (!input || !span) return;
                if (input.style.display === 'none') { span.style.display = 'none'; input.style.display = 'block'; input.focus(); input.select(); e.target.textContent = '✓'; e.target.style.color = '#28a745'; }
                else { salvarEdicaoInline(li, idx, arrayAtual, storageKey); }
            });
        });
        listaUl.querySelectorAll('.edit-input').forEach(input => {
            input.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); const li = e.target.closest('li'); const idx = parseInt(li.querySelector('.btn-edit').getAttribute('data-index')); salvarEdicaoInline(li, idx, arrayAtual, storageKey); } });
            input.addEventListener('blur', () => {
                const li = input.closest('li'); if (!li) return;
                setTimeout(() => { const editInput = li.querySelector('.edit-input'); if (editInput && editInput.style.display !== 'none') { const idx = parseInt(li.querySelector('.btn-edit').getAttribute('data-index')); salvarEdicaoInline(li, idx, arrayAtual, storageKey); } }, 150);
            });
            input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const li = e.target.closest('li'); const span = li.querySelector('.item-text'); const btnEdit = li.querySelector('.btn-edit'); span.style.display = 'block'; input.style.display = 'none'; input.value = span.textContent; btnEdit.textContent = '✏️'; btnEdit.style.color = '#6f42c1'; } });
        });
    }

    function salvarEdicaoInline(li, idx, arrayAtual, storageKey) {
        const span = li.querySelector('.item-text'); const input = li.querySelector('.edit-input'); const btnEdit = li.querySelector('.btn-edit');
        if (!span || !input || !btnEdit) return;
        const novoValor = input.value.trim().toLowerCase();
        span.style.display = 'block'; input.style.display = 'none'; btnEdit.textContent = '✏️'; btnEdit.style.color = '#6f42c1';
        if (novoValor && novoValor !== arrayAtual[idx]) {
            const duplicata = arrayAtual.some((item, i) => i !== idx && item === novoValor);
            if (duplicata) { mostrarNotificacao('⚠️ Este item já existe na lista', 'info'); input.value = arrayAtual[idx]; return; }
            arrayAtual[idx] = novoValor; span.textContent = novoValor;
            chrome.storage.local.set({ [storageKey]: arrayAtual }, () => mostrarNotificacao('✅ Atualizado com sucesso', 'success'));
        } else if (!novoValor) { input.value = arrayAtual[idx]; mostrarNotificacao('⚠️ O valor não pode estar vazio', 'info'); }
    }

    // =============================================
    // 8. GRAVAÇÃO DE ATALHOS
    // =============================================
    function iniciarGravacao(botaoElement, configKey) { if (activeBtn) cancelarGravacao(); recordingTarget = configKey; activeBtn = botaoElement; activeBtn.textContent = "Pressione a tecla..."; activeBtn.classList.add('gravando'); }
    function cancelarGravacao() { if (!activeBtn) return; const btnLocal = activeBtn; const targetLocal = recordingTarget; btnLocal.classList.remove('gravando'); chrome.storage.local.get(targetLocal, (res) => { if (res[targetLocal]) btnLocal.textContent = res[targetLocal].display; }); recordingTarget = null; activeBtn = null; }
    if (btnGravarToggle) btnGravarToggle.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); iniciarGravacao(btnGravarToggle, 'toggleShortcut'); });
    if (btnGravarIgnore) btnGravarIgnore.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); iniciarGravacao(btnGravarIgnore, 'ignoreShortcut'); });
    if (btnGravarCorrigirTudo) btnGravarCorrigirTudo.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); iniciarGravacao(btnGravarCorrigirTudo, 'corrigirTudoShortcut'); });
    document.addEventListener('keydown', (e) => {
        if (!recordingTarget) return;
        if (['Control', 'Alt', 'Shift', 'Meta', 'Escape'].includes(e.key)) return;
        e.preventDefault(); e.stopPropagation();
        const partes = []; if (e.ctrlKey) partes.push('Ctrl'); if (e.altKey) partes.push('Alt'); if (e.shiftKey) partes.push('Shift'); partes.push(e.key.toUpperCase());
        const shortcut = { altKey: e.altKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, key: e.key.toLowerCase(), display: partes.join(' + ') };
        if (!e.ctrlKey && !e.altKey && !e.shiftKey) { shortcut.altKey = true; shortcut.display = "Alt + " + e.key.toUpperCase(); }
        chrome.storage.local.set({ [recordingTarget]: shortcut }, () => { if (activeBtn) { activeBtn.textContent = shortcut.display; activeBtn.classList.remove('gravando'); } mostrarNotificacao(`✅ Atalho gravado: ${shortcut.display}`, 'success'); recordingTarget = null; activeBtn = null; });
    });
    document.addEventListener('click', (e) => { if (recordingTarget && activeBtn && e.target !== activeBtn) cancelarGravacao(); });

    // =============================================
    // 9. EXPORTAR BACKUP
    // =============================================
    if (btnExportar) btnExportar.addEventListener('click', () => {
        mostrarNotificacao('⏳ A gerar backup...', 'info');
        chrome.storage.local.get(null, (dados) => {
            delete dados.apiKey;
            const jsonStr = JSON.stringify({ versao: '2.6.0', data: new Date().toISOString(), dados }, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `syntaxmentor-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
            mostrarNotificacao('✅ Backup exportado com sucesso!', 'success');
        });
    });

    // =============================================
    // 10. IMPORTAR BACKUP
    // =============================================
    if (btnImportar && inputImportar) {
        btnImportar.addEventListener('click', () => inputImportar.click());
        inputImportar.addEventListener('change', (e) => {
            const file = e.target.files[0]; if (!file) return;
            const ext = file.name.split('.').pop().toLowerCase();
            if (ext !== 'json' && ext !== 'txt') { mostrarNotificacao('❌ Formato inválido. Use .txt ou .json', 'error'); inputImportar.value = ''; return; }
            if (file.size > 10 * 1024 * 1024) { mostrarNotificacao('❌ Ficheiro muito grande. Máximo: 10MB', 'error'); inputImportar.value = ''; return; }
            mostrarNotificacao('⏳ A preparar importação...', 'info');
            const reader = new FileReader();
            reader.onerror = () => { mostrarNotificacao('❌ Erro ao ler o ficheiro', 'error'); inputImportar.value = ''; };
            reader.onload = (event) => {
                try {
                    const conteudo = event.target.result;
                    let palavrasImportadas = [], blacklistImportada = [], idiomaImportado = null;
                    if (ext === 'txt') {
                        palavrasImportadas = conteudo.split(/\r?\n/).map(l => l.trim().toLowerCase()).filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));
                    } else {
                        let backup; try { backup = JSON.parse(conteudo); } catch (err) { mostrarNotificacao('❌ JSON inválido', 'error'); inputImportar.value = ''; return; }
                        const fonte = backup.dados || backup;
                        palavrasImportadas = Array.isArray(fonte.dicionario_pessoal) ? fonte.dicionario_pessoal : [];
                        blacklistImportada = Array.isArray(fonte.blacklist) ? fonte.blacklist : [];
                        if (fonte.language) idiomaImportado = fonte.language;
                    }
                    chrome.storage.local.get(['dicionario_pessoal', 'blacklist', 'language'], (res) => {
                        const dicFinal = [...(res.dicionario_pessoal || [])], blackFinal = [...(res.blacklist || [])];
                        let novasPalavras = 0, duplicadasPalavras = 0, novosSites = 0, duplicadosSites = 0;
                        palavrasImportadas.forEach(p => { if (!dicFinal.includes(p)) { dicFinal.push(p); novasPalavras++; } else duplicadasPalavras++; });
                        blacklistImportada.forEach(s => { if (!blackFinal.includes(s)) { blackFinal.push(s); novosSites++; } else duplicadosSites++; });
                        let msg = "📊 Resumo da Importação:\n\n";
                        if (novasPalavras > 0 || duplicadasPalavras > 0) { msg += `📖 Dicionário: ➕${novasPalavras} novas, ⏭️${duplicadasPalavras} duplicadas\n\n`; }
                        if (novosSites > 0 || duplicadosSites > 0) { msg += `🚫 Blacklist: ➕${novosSites} novos, ⏭️${duplicadosSites} duplicados\n\n`; }
                        msg += "Deseja confirmar?";
                        if (!window.confirm(msg)) { mostrarNotificacao('❌ Importação cancelada', 'info'); inputImportar.value = ''; return; }
                        const dadosParaSalvar = { dicionario_pessoal: dicFinal, blacklist: blackFinal };
                        if (idiomaImportado) dadosParaSalvar.language = idiomaImportado;
                        chrome.storage.local.set(dadosParaSalvar, () => {
                            if (chrome.runtime.lastError) { mostrarNotificacao('❌ Erro ao guardar', 'error'); return; }
                            mostrarNotificacao('✅ Importação concluída!', 'success');
                            currentDictionary = dicFinal; currentBlacklist = blackFinal;
                            renderizarDicionario(); renderizarBlacklist();
                            if (idiomaImportado && elLanguage) elLanguage.value = idiomaImportado;
                            inputImportar.value = '';
                        });
                    });
                } catch (err) { mostrarNotificacao('❌ Erro ao processar', 'error'); inputImportar.value = ''; }
            };
            reader.readAsText(file);
        });
    }

    // =============================================
    // 11. TESTAR API (SEGURANÇA)
    // =============================================
    if (btnTestarApi) btnTestarApi.addEventListener('click', async () => {
        const url = (elApiUrl?.value || 'https://api.languagetool.org/v2/check').trim();
        const key = elApiKey?.value?.trim() || '';
        statusApi.textContent = '⏳ Testando...'; statusApi.style.color = '#f59e0b'; detalhesApi.style.display = 'none';
        try {
            const headers = { 'Content-Type': 'application/x-www-form-urlencoded' }; if (key) headers['Authorization'] = `Bearer ${key}`;
            const resp = await fetch(url, { method: 'POST', headers, body: new URLSearchParams({ text: 'Hello world', language: 'en-US' }) });
            if (resp.ok) { const data = await resp.json(); statusApi.textContent = '✅ Conectado!'; statusApi.style.color = '#28a745'; detalhesApi.style.display = 'block'; apiInfo.textContent = `Idioma: ${data.language?.name || 'OK'} | ${new URL(url).hostname}`; chrome.storage.local.set({ apiUrl: url, apiKey: key }); }
            else throw new Error(`HTTP ${resp.status}`);
        } catch (err) { statusApi.textContent = '❌ ' + err.message; statusApi.style.color = '#e53e3e'; detalhesApi.style.display = 'none'; }
    });
    if (btnToggleVisibilidade && elApiKey) btnToggleVisibilidade.addEventListener('click', () => {
        if (elApiKey.type === 'password') { elApiKey.type = 'text'; btnToggleVisibilidade.textContent = '🙈 Ocultar'; }
        else { elApiKey.type = 'password'; btnToggleVisibilidade.textContent = '👁️ Mostrar'; }
    });

    // =============================================
    // 12. MODO LEITURA (SEGURANÇA)
    // =============================================
    if (btnAddModoLeitura) btnAddModoLeitura.addEventListener('click', () => {
        const domain = modoLeituraInput.value.trim().toLowerCase();
        if (domain && !currentModoLeitura.includes(domain)) { currentModoLeitura.unshift(domain); modoLeituraInput.value = ''; chrome.storage.local.set({ modoLeituraSites: currentModoLeitura }); }
    });
    function renderizarModoLeitura() {
        if (!modoLeituraUl) return; modoLeituraUl.innerHTML = '';
        currentModoLeitura.forEach((domain, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="item-text">${domain}</span><div class="action-btns"><span style="font-size:10px;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;margin-right:10px;">📖 Leitura</span><button class="btn-remove" data-index="${index}">✕</button></div>`;
            modoLeituraUl.appendChild(li);
        });
        modoLeituraUl.querySelectorAll('.btn-remove').forEach(btn => btn.addEventListener('click', (e) => { currentModoLeitura.splice(e.target.getAttribute('data-index'), 1); chrome.storage.local.set({ modoLeituraSites: currentModoLeitura }); }));
    }

    // =============================================
    // 13. WHITELIST (SEGURANÇA)
    // =============================================
    if (btnAddWhitelist) btnAddWhitelist.addEventListener('click', () => {
        const domain = whitelistInput.value.trim().toLowerCase();
        if (domain && !currentWhitelist.includes(domain)) { currentWhitelist.unshift(domain); whitelistInput.value = ''; chrome.storage.local.set({ whitelist: currentWhitelist }); }
    });
    function renderizarWhitelist() {
        if (!whitelistUl) return; whitelistUl.innerHTML = '';
        currentWhitelist.forEach((domain, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="item-text">${domain}</span><div class="action-btns"><span style="font-size:10px;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;margin-right:10px;">✅ Permitido</span><button class="btn-remove" data-index="${index}">✕</button></div>`;
            whitelistUl.appendChild(li);
        });
        whitelistUl.querySelectorAll('.btn-remove').forEach(btn => btn.addEventListener('click', (e) => { currentWhitelist.splice(e.target.getAttribute('data-index'), 1); chrome.storage.local.set({ whitelist: currentWhitelist }); }));
    }

    // =============================================
    // 14. DASHBOARD
    // =============================================
    function carregarDashboard(res) {
        if (!heroTotal) return;
        const total = res.totalCorrigidas || 0, aceitas = res.totalAceitas || 0, recusadas = res.totalRecusadas || 0;
        heroTotal.textContent = total.toLocaleString();
        let nivel = '🟢 Iniciante';
        if (total >= 1000) nivel = '👑 Lendário'; else if (total >= 500) nivel = '⭐ Mestre'; else if (total >= 100) nivel = '🔥 Avançado'; else if (total >= 10) nivel = '📈 Intermediário';
        heroNivel.textContent = 'Nível: ' + nivel;
        statAceitas.textContent = aceitas.toLocaleString();
        statRecusadas.textContent = recusadas.toLocaleString();
        statDic.textContent = (res.dicionario_pessoal || []).length.toLocaleString();
        statIdioma.textContent = res.language || 'pt-BR';
        statCloud.textContent = res.cloudSync ? '☁️ Ligado' : 'Desligado';
        statTaxa.textContent = (aceitas + recusadas) > 0 ? Math.round((aceitas / (aceitas + recusadas)) * 100) + '%' : '100%';

        const erros = res.erroMaisComum || {};
        const ordenados = Object.entries(erros).sort((a, b) => b[1] - a[1]).slice(0, 6);
        if (ordenados.length === 0) { listaErrosComuns.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">Corrija alguns erros para ver suas estatísticas aqui!</p>'; }
        else { const max = ordenados[0][1]; listaErrosComuns.innerHTML = ordenados.map(([p, c]) => `<div class="barra-container-dash"><div class="barra-label-dash"><span>${p}</span><span>${c}x</span></div><div class="barra-dash"><div class="barra-preenchida-dash" style="width:${Math.max(Math.round((c/max)*100),10)}%;">${c}x</div></div></div>`).join(''); }

        const conquistas = [
            { nome: 'Primeira Correção', desbloqueada: total >= 1 }, { nome: '10 Correções', desbloqueada: total >= 10 },
            { nome: '50 Correções', desbloqueada: total >= 50 }, { nome: '100 Correções', desbloqueada: total >= 100 },
            { nome: '500 Correções', desbloqueada: total >= 500 }, { nome: '1000 Correções', desbloqueada: total >= 1000 },
            { nome: '10 Palavras no Dicionário', desbloqueada: (res.dicionario_pessoal || []).length >= 10 },
            { nome: '50 Palavras no Dicionário', desbloqueada: (res.dicionario_pessoal || []).length >= 50 },
            { nome: 'Usou Cloud Sync', desbloqueada: res.cloudSync || false }
        ];
        listaConquistas.innerHTML = conquistas.map(c => `<div class="conquista-card ${c.desbloqueada ? 'unlock' : 'lock'}"><div class="conquista-icon">${c.desbloqueada ? '🏆' : '🔒'}</div><div class="conquista-nome">${c.nome}</div></div>`).join('');
    }

    // =============================================
    // 15. UTILITÁRIOS
    // =============================================
    function mostrarNotificacao(mensagem, tipo) {
        if (!saveStatus) return;
        saveStatus.textContent = mensagem; saveStatus.style.opacity = '1';
        saveStatus.style.color = tipo === 'success' ? '#28a745' : tipo === 'error' ? '#e53e3e' : '#6b7280';
        const duracao = tipo === 'error' ? 4000 : tipo === 'success' ? 3000 : 2000;
        clearTimeout(saveStatus._timeout);
        saveStatus._timeout = setTimeout(() => { saveStatus.style.opacity = '0'; }, duracao);
    }

    function escapeHtml(texto) { if (!texto) return ''; const div = document.createElement('div'); div.textContent = texto; return div.innerHTML; }
});