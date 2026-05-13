// SyntaxMentor - options.js v2.7.0 (Unified: Geral + Segurança + Dashboard + Status Badges + Modo Aprendizado)
document.addEventListener('DOMContentLoaded', () => {

    // =============================================
    // 0. APLICAR TEMA ESCURO AO INICIAR
    // =============================================
    chrome.storage.local.get({ darkMode: false }, (res) => {
        document.body.classList.toggle('dark-mode', res.darkMode);
    });

    // =============================================
    // ELEMENTOS DA INTERFACE - GERAL
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
    const btnClearBlacklist = document.getElementById('btn-clear-blacklist');
    let currentBlacklist = [];

    const dictionaryInput = document.getElementById('dictionary-input');
    const btnAddDictionary = document.getElementById('btn-add-dictionary');
    const dictionaryUl = document.getElementById('dictionary-list');
    const btnClearDictionary = document.getElementById('btn-clear-dictionary');
    let currentDictionary = [];

    const btnGravarToggle = document.getElementById('btn-gravar-atalho');
    const btnGravarIgnore = document.getElementById('btn-gravar-ignorar');
    const btnGravarCorrigirTudo = document.getElementById('btn-gravar-corrigir-tudo');
    let recordingTarget = null;
    let activeBtn = null;

    const btnExportar = document.getElementById('btn-exportar');
    const btnImportar = document.getElementById('btn-importar');
    const inputImportar = document.getElementById('input-importar');

    // =============================================
    // ELEMENTOS DA INTERFACE - SEGURANÇA
    // =============================================
    const elApiUrl = document.getElementById('api-url');
    const elApiKey = document.getElementById('api-key');
    const btnTestarApi = document.getElementById('btn-testar-api');
    const btnToggleVisibilidade = document.getElementById('btn-toggle-visibilidade');
    const statusApi = document.getElementById('status-api');
    const detalhesApi = document.getElementById('detalhes-api');
    const apiInfo = document.getElementById('api-info');
    const elModoConfirmacao = document.getElementById('modoConfirmacao');
    const elModoLeituraGlobal = document.getElementById('modoLeituraGlobal');
    const elModoFoco = document.getElementById('modoFoco');
    const elModoAprendizado = document.getElementById('modoAprendizado');
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

    // =============================================
    // ELEMENTOS DA INTERFACE - DASHBOARD
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
    // 🆕 ATUALIZAR STATUS DA PÁGINA GERAL
    // =============================================
    function atualizarStatusGeral() {
        const statusIdiomaBadge = document.getElementById('status-idioma-badge');
        const statusSpeedBadge = document.getElementById('status-speed-badge');
        const statusPickyBadge = document.getElementById('status-picky-badge');
        const statusDicBadge = document.getElementById('status-dic-badge');
        const blacklistCount = document.getElementById('blacklist-count');
        const dicCount = document.getElementById('dic-count');
        if (!statusIdiomaBadge && !statusSpeedBadge && !blacklistCount && !dicCount) return;
        chrome.storage.local.get({ language: 'pt-BR', speed: '500', pickyMode: true, dicionario_pessoal: [], blacklist: [] }, (res) => {
            const nomesIdiomas = { 'pt-BR': 'Português (Brasil)', 'en-US': 'English (US)', 'es': 'Español', 'fr': 'Français', 'de': 'Deutsch', 'it': 'Italiano' };
            const nomesVelocidade = { '300': '🚀 Rápido', '500': '⚖️ Equilibrado', '1000': '🐢 Leve' };
            if (statusIdiomaBadge) statusIdiomaBadge.textContent = nomesIdiomas[res.language] || res.language;
            if (statusSpeedBadge) statusSpeedBadge.textContent = nomesVelocidade[res.speed] || res.speed + 'ms';
            if (statusPickyBadge) statusPickyBadge.textContent = res.pickyMode ? '✅ Picky Ativado' : 'Padrão';
            if (statusDicBadge) statusDicBadge.textContent = (res.dicionario_pessoal || []).length + ' palavras';
            if (blacklistCount) blacklistCount.textContent = (res.blacklist || []).length;
            if (dicCount) dicCount.textContent = (res.dicionario_pessoal || []).length;
        });
    }

    // =============================================
    // 🆕 ATUALIZAR STATUS DA PÁGINA DE SEGURANÇA
    // =============================================
    function atualizarStatusSeguranca() {
        const statusApiBadge = document.getElementById('status-api-badge');
        const statusModoBadge = document.getElementById('status-modo-badge');
        const statusCloudBadge = document.getElementById('status-cloud-badge');
        if (!statusApiBadge && !statusModoBadge && !statusCloudBadge) return;
        chrome.storage.local.get({ apiKey: '', modoLeituraGlobal: false, cloudSync: false }, (res) => {
            if (statusApiBadge) {
                if (res.apiKey && res.apiKey.trim() !== '') {
                    statusApiBadge.textContent = '✅ Configurada';
                    statusApiBadge.className = 'seguranca-status-value api-ok';
                } else {
                    statusApiBadge.textContent = 'Não configurada';
                    statusApiBadge.className = 'seguranca-status-value api-off';
                }
            }
            if (statusModoBadge) {
                if (res.modoLeituraGlobal) {
                    statusModoBadge.textContent = '📖 Somente Leitura';
                    statusModoBadge.className = 'seguranca-status-value modo-leitura';
                } else {
                    statusModoBadge.textContent = 'Normal';
                    statusModoBadge.className = 'seguranca-status-value modo-normal';
                }
            }
            if (statusCloudBadge) {
                if (res.cloudSync) {
                    statusCloudBadge.textContent = '☁️ Ligado';
                    statusCloudBadge.className = 'seguranca-status-value cloud-on';
                } else {
                    statusCloudBadge.textContent = 'Desligado';
                    statusCloudBadge.className = 'seguranca-status-value cloud-off';
                }
            }
        });
    }

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
        modoFoco: false, modoAprendizado: false,
        totalCorrigidas: 0, totalAceitas: 0, totalRecusadas: 0, erroMaisComum: {}
    }, (res) => {
        // Geral
        if (elLanguage) elLanguage.value = res.language;
        if (elPickyMode) elPickyMode.checked = res.pickyMode;
        if (elDarkMode) { elDarkMode.checked = res.darkMode; document.body.classList.toggle('dark-mode', res.darkMode); }
        if (elAutoHideBubble) elAutoHideBubble.checked = res.autoHideBubble || false;
        elSpeedOptions.forEach(opt => { if (opt.value === res.speed.toString()) opt.checked = true; });
        currentBlacklist = res.blacklist; renderizarBlacklist();
        currentDictionary = res.dicionario_pessoal; renderizarDicionario();
        if (btnGravarToggle) btnGravarToggle.textContent = res.toggleShortcut.display;
        if (btnGravarIgnore) btnGravarIgnore.textContent = res.ignoreShortcut.display;
        if (btnGravarCorrigirTudo) btnGravarCorrigirTudo.textContent = res.corrigirTudoShortcut.display;
        atualizarStatusGeral();

        // Segurança
        if (elApiUrl) elApiUrl.value = res.apiUrl || '';
        if (elApiKey) elApiKey.value = res.apiKey || '';
        if (elModoConfirmacao) elModoConfirmacao.checked = res.modoConfirmacao || false;
        if (elModoLeituraGlobal) elModoLeituraGlobal.checked = res.modoLeituraGlobal || false;
        if (elModoFoco) elModoFoco.checked = res.modoFoco || false;
        if (elModoAprendizado) elModoAprendizado.checked = res.modoAprendizado || false;
        if (elModoWhitelist) elModoWhitelist.checked = res.modoWhitelist || false;
        if (elCloudSync) elCloudSync.checked = res.cloudSync || false;
        currentModoLeitura = res.modoLeituraSites || []; renderizarModoLeitura();
        currentWhitelist = res.whitelist || []; renderizarWhitelist();
        atualizarStatusSeguranca();

        // Dashboard
        carregarDashboard(res);
    });

    // =============================================
    // 2. LIVE SYNC
    // =============================================
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'local') return;

        // Geral
        if (changes.dicionario_pessoal) { currentDictionary = changes.dicionario_pessoal.newValue || []; renderizarDicionario(); }
        if (changes.blacklist) { currentBlacklist = changes.blacklist.newValue || []; renderizarBlacklist(); }
        if (changes.darkMode) {
            if (elDarkMode) elDarkMode.checked = changes.darkMode.newValue;
            document.body.classList.toggle('dark-mode', changes.darkMode.newValue);
        }
        if (changes.autoHideBubble && elAutoHideBubble) elAutoHideBubble.checked = changes.autoHideBubble.newValue;
        if (changes.language || changes.speed || changes.pickyMode || changes.dicionario_pessoal || changes.blacklist) atualizarStatusGeral();

        // Segurança
        if (changes.modoLeituraSites) { currentModoLeitura = changes.modoLeituraSites.newValue || []; renderizarModoLeitura(); }
        if (changes.whitelist) { currentWhitelist = changes.whitelist.newValue || []; renderizarWhitelist(); }
        if (changes.modoConfirmacao && elModoConfirmacao) elModoConfirmacao.checked = changes.modoConfirmacao.newValue;
        if (changes.modoLeituraGlobal && elModoLeituraGlobal) elModoLeituraGlobal.checked = changes.modoLeituraGlobal.newValue;
        if (changes.modoFoco && elModoFoco) elModoFoco.checked = changes.modoFoco.newValue;
        if (changes.modoAprendizado && elModoAprendizado) elModoAprendizado.checked = changes.modoAprendizado.newValue;
        if (changes.modoWhitelist && elModoWhitelist) elModoWhitelist.checked = changes.modoWhitelist.newValue;
        if (changes.cloudSync && elCloudSync) elCloudSync.checked = changes.cloudSync.newValue;
        if (changes.apiKey || changes.modoLeituraGlobal || changes.cloudSync) atualizarStatusSeguranca();

        // Dashboard
        if (changes.totalCorrigidas || changes.totalAceitas || changes.totalRecusadas || changes.dicionario_pessoal || changes.erroMaisComum || changes.language || changes.cloudSync) {
            chrome.storage.local.get({ totalCorrigidas: 0, totalAceitas: 0, totalRecusadas: 0, dicionario_pessoal: [], language: 'pt-BR', erroMaisComum: {}, cloudSync: false, modoLeituraGlobal: false }, (r) => {
                carregarDashboard(r);
                atualizarStatusSeguranca();
                atualizarStatusGeral();
            });
        }
    });

    // =============================================
    // 3. EVENTOS EM TEMPO REAL
    // =============================================
    if (elDarkMode) elDarkMode.addEventListener('change', (e) => { document.body.classList.toggle('dark-mode', e.target.checked); chrome.storage.local.set({ darkMode: e.target.checked }); });
    if (elAutoHideBubble) elAutoHideBubble.addEventListener('change', (e) => chrome.storage.local.set({ autoHideBubble: e.target.checked }));
    if (elModoConfirmacao) elModoConfirmacao.addEventListener('change', (e) => chrome.storage.local.set({ modoConfirmacao: e.target.checked }));
    if (elModoLeituraGlobal) elModoLeituraGlobal.addEventListener('change', (e) => { chrome.storage.local.set({ modoLeituraGlobal: e.target.checked }, atualizarStatusSeguranca); });
    if (elModoFoco) elModoFoco.addEventListener('change', (e) => chrome.storage.local.set({ modoFoco: e.target.checked }));
    if (elModoAprendizado) elModoAprendizado.addEventListener('change', (e) => chrome.storage.local.set({ modoAprendizado: e.target.checked }));
    if (elModoWhitelist) elModoWhitelist.addEventListener('change', (e) => chrome.storage.local.set({ modoWhitelist: e.target.checked }));
    if (elCloudSync) elCloudSync.addEventListener('change', (e) => { chrome.storage.local.set({ cloudSync: e.target.checked }, () => { atualizarStatusSeguranca(); chrome.storage.local.get({ totalCorrigidas: 0, totalAceitas: 0, totalRecusadas: 0, dicionario_pessoal: [], language: 'pt-BR', erroMaisComum: {}, cloudSync: e.target.checked }, carregarDashboard); }); });

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
            modoFoco: elModoFoco?.checked || false,
            modoAprendizado: elModoAprendizado?.checked || false,
            modoWhitelist: elModoWhitelist?.checked || false,
            cloudSync: elCloudSync?.checked || false
        }, () => {
            mostrarNotificacao('✓ Guardado com sucesso!', 'success');
            atualizarStatusGeral();
            atualizarStatusSeguranca();
        });
    });

    // =============================================
    // 5. BLACKLIST
    // =============================================
    if (btnAddBlacklist) {
        btnAddBlacklist.addEventListener('click', () => { const domain = blacklistInput.value.trim().toLowerCase(); if (!domain) return; if (!currentBlacklist.includes(domain)) { currentBlacklist.unshift(domain); blacklistInput.value = ''; chrome.storage.local.set({ blacklist: currentBlacklist }, atualizarStatusGeral); } else { mostrarNotificacao('⚠️ Este site já está na lista', 'info'); blacklistInput.value = ''; } });
        blacklistInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); btnAddBlacklist.click(); } });
    }
    if (btnClearBlacklist) { btnClearBlacklist.addEventListener('click', () => { if (currentBlacklist.length === 0) { mostrarNotificacao('📭 A lista de sites já está vazia.', 'info'); return; } if (confirm(`⚠️ Tem certeza que deseja remover TODOS os ${currentBlacklist.length} sites bloqueados?\n\nEsta ação não pode ser desfeita.`)) { currentBlacklist = []; chrome.storage.local.set({ blacklist: [] }, () => { renderizarBlacklist(); mostrarNotificacao('🗑️ Todos os sites foram removidos!', 'success'); atualizarStatusGeral(); }); } }); }

    function renderizarBlacklist() { if (!blacklistUl) return; blacklistUl.innerHTML = ''; if (currentBlacklist.length === 0) { blacklistUl.innerHTML = '<li style="color:#9ca3af;text-align:center;padding:10px;">Nenhum site bloqueado</li>'; return; } currentBlacklist.forEach((domain, index) => { const li = document.createElement('li'); li.innerHTML = `<span class="item-text">${escapeHtml(domain)}</span><input type="text" class="edit-input" value="${escapeHtml(domain)}" style="display:none;"><div class="action-btns"><button class="btn-edit" data-index="${index}" title="Editar">✏️</button><button class="btn-remove" data-index="${index}" title="Remover">✕</button></div>`; blacklistUl.appendChild(li); }); adicionarOuvintesLista(blacklistUl, currentBlacklist, 'blacklist'); atualizarStatusGeral(); }

    // =============================================
    // 6. DICIONÁRIO
    // =============================================
    if (btnAddDictionary) {
        btnAddDictionary.addEventListener('click', () => { const word = dictionaryInput.value.trim().toLowerCase(); if (!word) return; if (!currentDictionary.includes(word)) { currentDictionary.unshift(word); dictionaryInput.value = ''; chrome.storage.local.set({ dicionario_pessoal: currentDictionary }, atualizarStatusGeral); } else { mostrarNotificacao('⚠️ Esta palavra já existe no dicionário', 'info'); dictionaryInput.value = ''; } });
        dictionaryInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); btnAddDictionary.click(); } });
    }
    if (btnClearDictionary) { btnClearDictionary.addEventListener('click', () => { if (currentDictionary.length === 0) { mostrarNotificacao('📭 O dicionário já está vazio.', 'info'); return; } if (confirm(`⚠️ Tem certeza que deseja remover TODAS as ${currentDictionary.length} palavras do dicionário?\n\nEsta ação não pode ser desfeita.`)) { currentDictionary = []; chrome.storage.local.set({ dicionario_pessoal: [] }, () => { renderizarDicionario(); mostrarNotificacao('🗑️ Todas as palavras foram removidas!', 'success'); atualizarStatusGeral(); }); } }); }

    function renderizarDicionario() { if (!dictionaryUl) return; dictionaryUl.innerHTML = ''; if (currentDictionary.length === 0) { dictionaryUl.innerHTML = '<li style="color:#9ca3af;text-align:center;padding:10px;">Nenhuma palavra adicionada</li>'; return; } currentDictionary.forEach((word, index) => { const li = document.createElement('li'); li.innerHTML = `<span class="item-text">${escapeHtml(word)}</span><input type="text" class="edit-input" value="${escapeHtml(word)}" style="display:none;"><div class="action-btns"><button class="btn-edit" data-index="${index}" title="Editar">✏️</button><button class="btn-remove" data-index="${index}" title="Remover">✕</button></div>`; dictionaryUl.appendChild(li); }); adicionarOuvintesLista(dictionaryUl, currentDictionary, 'dicionario_pessoal'); atualizarStatusGeral(); }

    // =============================================
    // 7. FUNÇÃO COMPARTILHADA DE OUVINTES
    // =============================================
    function adicionarOuvintesLista(listaUl, arrayAtual, storageKey) {
        listaUl.querySelectorAll('.btn-remove').forEach(btn => { btn.addEventListener('click', (e) => { e.stopPropagation(); const idx = parseInt(e.target.getAttribute('data-index')); if (idx >= 0 && idx < arrayAtual.length) { const removido = arrayAtual[idx]; arrayAtual.splice(idx, 1); chrome.storage.local.set({ [storageKey]: arrayAtual }, () => { mostrarNotificacao(`🗑️ "${removido}" removido`, 'info'); atualizarStatusGeral(); }); } }); });
        listaUl.querySelectorAll('.btn-edit').forEach(btn => { btn.addEventListener('click', (e) => { e.stopPropagation(); const idx = parseInt(e.target.getAttribute('data-index')); const li = e.target.closest('li'); const span = li.querySelector('.item-text'); const input = li.querySelector('.edit-input'); if (!input || !span) return; if (input.style.display === 'none') { span.style.display = 'none'; input.style.display = 'block'; input.focus(); input.select(); e.target.textContent = '✓'; e.target.style.color = '#28a745'; } else { salvarEdicaoInline(li, idx, arrayAtual, storageKey); } }); });
        listaUl.querySelectorAll('.edit-input').forEach(input => { input.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); const li = e.target.closest('li'); const idx = parseInt(li.querySelector('.btn-edit').getAttribute('data-index')); salvarEdicaoInline(li, idx, arrayAtual, storageKey); } }); input.addEventListener('blur', () => { const li = input.closest('li'); if (!li) return; setTimeout(() => { const editInput = li.querySelector('.edit-input'); if (editInput && editInput.style.display !== 'none') { const idx = parseInt(li.querySelector('.btn-edit').getAttribute('data-index')); salvarEdicaoInline(li, idx, arrayAtual, storageKey); } }, 150); }); input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const li = e.target.closest('li'); const span = li.querySelector('.item-text'); const btnEdit = li.querySelector('.btn-edit'); span.style.display = 'block'; input.style.display = 'none'; input.value = span.textContent; btnEdit.textContent = '✏️'; btnEdit.style.color = '#6f42c1'; } }); });
    }

    function salvarEdicaoInline(li, idx, arrayAtual, storageKey) { const span = li.querySelector('.item-text'); const input = li.querySelector('.edit-input'); const btnEdit = li.querySelector('.btn-edit'); if (!span || !input || !btnEdit) return; const novoValor = input.value.trim().toLowerCase(); span.style.display = 'block'; input.style.display = 'none'; btnEdit.textContent = '✏️'; btnEdit.style.color = '#6f42c1'; if (novoValor && novoValor !== arrayAtual[idx]) { const duplicata = arrayAtual.some((item, i) => i !== idx && item === novoValor); if (duplicata) { mostrarNotificacao('⚠️ Este item já existe na lista', 'info'); input.value = arrayAtual[idx]; return; } arrayAtual[idx] = novoValor; span.textContent = novoValor; chrome.storage.local.set({ [storageKey]: arrayAtual }, () => { mostrarNotificacao('✅ Atualizado com sucesso', 'success'); atualizarStatusGeral(); }); } else if (!novoValor) { input.value = arrayAtual[idx]; mostrarNotificacao('⚠️ O valor não pode estar vazio', 'info'); } }

    // =============================================
    // 8. GRAVAÇÃO DE ATALHOS
    // =============================================
    function iniciarGravacao(botaoElement, configKey) { if (activeBtn) cancelarGravacao(); recordingTarget = configKey; activeBtn = botaoElement; activeBtn.textContent = "Pressione a tecla..."; activeBtn.classList.add('gravando'); }
    function cancelarGravacao() { if (!activeBtn) return; const btnLocal = activeBtn; const targetLocal = recordingTarget; btnLocal.classList.remove('gravando'); chrome.storage.local.get(targetLocal, (res) => { if (res[targetLocal]) btnLocal.textContent = res[targetLocal].display; }); recordingTarget = null; activeBtn = null; }
    if (btnGravarToggle) btnGravarToggle.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); iniciarGravacao(btnGravarToggle, 'toggleShortcut'); });
    if (btnGravarIgnore) btnGravarIgnore.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); iniciarGravacao(btnGravarIgnore, 'ignoreShortcut'); });
    if (btnGravarCorrigirTudo) btnGravarCorrigirTudo.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); iniciarGravacao(btnGravarCorrigirTudo, 'corrigirTudoShortcut'); });
    document.addEventListener('keydown', (e) => { if (!recordingTarget) return; if (['Control', 'Alt', 'Shift', 'Meta', 'Escape'].includes(e.key)) return; e.preventDefault(); e.stopPropagation(); const partes = []; if (e.ctrlKey) partes.push('Ctrl'); if (e.altKey) partes.push('Alt'); if (e.shiftKey) partes.push('Shift'); partes.push(e.key.toUpperCase()); const shortcut = { altKey: e.altKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, key: e.key.toLowerCase(), display: partes.join(' + ') }; if (!e.ctrlKey && !e.altKey && !e.shiftKey) { shortcut.altKey = true; shortcut.display = "Alt + " + e.key.toUpperCase(); } chrome.storage.local.set({ [recordingTarget]: shortcut }, () => { if (activeBtn) { activeBtn.textContent = shortcut.display; activeBtn.classList.remove('gravando'); } mostrarNotificacao(`✅ Atalho gravado: ${shortcut.display}`, 'success'); recordingTarget = null; activeBtn = null; }); });
    document.addEventListener('click', (e) => { if (recordingTarget && activeBtn && e.target !== activeBtn) cancelarGravacao(); });

    // =============================================
    // 9. EXPORTAR BACKUP
    // =============================================
    if (btnExportar) btnExportar.addEventListener('click', () => { mostrarNotificacao('⏳ A gerar backup...', 'info'); chrome.storage.local.get(null, (dados) => { delete dados.apiKey; delete dados.dataInstalacao; const jsonStr = JSON.stringify({ versao: '2.7.0', data: new Date().toISOString(), dados }, null, 2); const blob = new Blob([jsonStr], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `syntaxmentor-backup-${new Date().toISOString().split('T')[0]}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); mostrarNotificacao('✅ Backup exportado com sucesso!', 'success'); }); });

    // =============================================
    // 10. IMPORTAR BACKUP
    // =============================================
    if (btnImportar && inputImportar) { btnImportar.addEventListener('click', () => inputImportar.click()); inputImportar.addEventListener('change', (e) => { const file = e.target.files[0]; if (!file) return; const ext = file.name.split('.').pop().toLowerCase(); if (ext !== 'json' && ext !== 'txt') { mostrarNotificacao('❌ Formato inválido. Use .txt ou .json', 'error'); inputImportar.value = ''; return; } if (file.size > 10 * 1024 * 1024) { mostrarNotificacao('❌ Ficheiro muito grande. Máximo: 10MB', 'error'); inputImportar.value = ''; return; } mostrarNotificacao('⏳ A preparar importação...', 'info'); const reader = new FileReader(); reader.onerror = () => { mostrarNotificacao('❌ Erro ao ler o ficheiro', 'error'); inputImportar.value = ''; }; reader.onload = (event) => { try { const conteudo = event.target.result; let palavrasImportadas = [], blacklistImportada = [], idiomaImportado = null; if (ext === 'txt') { palavrasImportadas = conteudo.split(/\r?\n/).map(l => l.trim().toLowerCase()).filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('//')); } else { let backup; try { backup = JSON.parse(conteudo); } catch (err) { mostrarNotificacao('❌ JSON inválido', 'error'); inputImportar.value = ''; return; } const fonte = backup.dados || backup; palavrasImportadas = Array.isArray(fonte.dicionario_pessoal) ? fonte.dicionario_pessoal : []; blacklistImportada = Array.isArray(fonte.blacklist) ? fonte.blacklist : []; if (fonte.language) idiomaImportado = fonte.language; } chrome.storage.local.get(['dicionario_pessoal', 'blacklist', 'language'], (res) => { const dicFinal = [...(res.dicionario_pessoal || [])], blackFinal = [...(res.blacklist || [])]; let novasPalavras = 0, duplicadasPalavras = 0, novosSites = 0, duplicadosSites = 0; palavrasImportadas.forEach(p => { if (!dicFinal.includes(p)) { dicFinal.push(p); novasPalavras++; } else duplicadasPalavras++; }); blacklistImportada.forEach(s => { if (!blackFinal.includes(s)) { blackFinal.push(s); novosSites++; } else duplicadosSites++; }); let msg = "📊 Resumo da Importação:\n\n"; if (novasPalavras > 0 || duplicadasPalavras > 0) msg += `📖 Dicionário: ➕${novasPalavras} novas, ⏭️${duplicadasPalavras} duplicadas\n\n`; if (novosSites > 0 || duplicadosSites > 0) msg += `🚫 Blacklist: ➕${novosSites} novos, ⏭️${duplicadosSites} duplicados\n\n`; msg += "Deseja confirmar?"; if (!window.confirm(msg)) { mostrarNotificacao('❌ Importação cancelada', 'info'); inputImportar.value = ''; return; } const dadosParaSalvar = { dicionario_pessoal: dicFinal, blacklist: blackFinal }; if (idiomaImportado) dadosParaSalvar.language = idiomaImportado; chrome.storage.local.set(dadosParaSalvar, () => { if (chrome.runtime.lastError) { mostrarNotificacao('❌ Erro ao guardar', 'error'); return; } mostrarNotificacao('✅ Importação concluída!', 'success'); currentDictionary = dicFinal; currentBlacklist = blackFinal; renderizarDicionario(); renderizarBlacklist(); if (idiomaImportado && elLanguage) elLanguage.value = idiomaImportado; atualizarStatusGeral(); inputImportar.value = ''; }); }); } catch (err) { mostrarNotificacao('❌ Erro ao processar', 'error'); inputImportar.value = ''; } }; reader.readAsText(file); }); }

    // =============================================
    // 11. TESTAR API (SEGURANÇA)
    // =============================================
    if (btnTestarApi) btnTestarApi.addEventListener('click', async () => { const url = (elApiUrl?.value || 'https://api.languagetool.org/v2/check').trim(); const key = elApiKey?.value?.trim() || ''; if (statusApi) { statusApi.textContent = '⏳ Testando...'; statusApi.style.color = '#f59e0b'; } if (detalhesApi) detalhesApi.style.display = 'none'; try { const headers = { 'Content-Type': 'application/x-www-form-urlencoded' }; if (key) headers['Authorization'] = `Bearer ${key}`; const resp = await fetch(url, { method: 'POST', headers, body: new URLSearchParams({ text: 'Hello world', language: 'en-US' }) }); if (resp.ok) { const data = await resp.json(); if (statusApi) { statusApi.textContent = '✅ Conectado!'; statusApi.style.color = '#28a745'; } if (detalhesApi) { detalhesApi.style.display = 'block'; } if (apiInfo) apiInfo.textContent = `Idioma: ${data.language?.name || 'OK'} | ${new URL(url).hostname}`; chrome.storage.local.set({ apiUrl: url, apiKey: key }, atualizarStatusSeguranca); } else throw new Error(`HTTP ${resp.status}`); } catch (err) { if (statusApi) { statusApi.textContent = '❌ ' + err.message; statusApi.style.color = '#e53e3e'; } if (detalhesApi) detalhesApi.style.display = 'none'; } });
    if (btnToggleVisibilidade && elApiKey) btnToggleVisibilidade.addEventListener('click', () => { if (elApiKey.type === 'password') { elApiKey.type = 'text'; btnToggleVisibilidade.textContent = '🙈 Ocultar'; } else { elApiKey.type = 'password'; btnToggleVisibilidade.textContent = '👁️ Mostrar'; } });

    // =============================================
    // 12. MODO LEITURA (SEGURANÇA)
    // =============================================
    if (btnAddModoLeitura) btnAddModoLeitura.addEventListener('click', () => { const domain = modoLeituraInput.value.trim().toLowerCase(); if (domain && !currentModoLeitura.includes(domain)) { currentModoLeitura.unshift(domain); modoLeituraInput.value = ''; chrome.storage.local.set({ modoLeituraSites: currentModoLeitura }); } });
    function renderizarModoLeitura() { if (!modoLeituraUl) return; modoLeituraUl.innerHTML = ''; currentModoLeitura.forEach((domain, index) => { const li = document.createElement('li'); li.innerHTML = `<span class="item-text">${domain}</span><div class="action-btns"><span style="font-size:10px;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;margin-right:10px;">📖 Leitura</span><button class="btn-remove" data-index="${index}">✕</button></div>`; modoLeituraUl.appendChild(li); }); modoLeituraUl.querySelectorAll('.btn-remove').forEach(btn => btn.addEventListener('click', (e) => { currentModoLeitura.splice(e.target.getAttribute('data-index'), 1); chrome.storage.local.set({ modoLeituraSites: currentModoLeitura }); })); }

    // =============================================
    // 13. WHITELIST (SEGURANÇA)
    // =============================================
    if (btnAddWhitelist) btnAddWhitelist.addEventListener('click', () => { const domain = whitelistInput.value.trim().toLowerCase(); if (domain && !currentWhitelist.includes(domain)) { currentWhitelist.unshift(domain); whitelistInput.value = ''; chrome.storage.local.set({ whitelist: currentWhitelist }); } });
    function renderizarWhitelist() { if (!whitelistUl) return; whitelistUl.innerHTML = ''; currentWhitelist.forEach((domain, index) => { const li = document.createElement('li'); li.innerHTML = `<span class="item-text">${domain}</span><div class="action-btns"><span style="font-size:10px;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;margin-right:10px;">✅ Permitido</span><button class="btn-remove" data-index="${index}">✕</button></div>`; whitelistUl.appendChild(li); }); whitelistUl.querySelectorAll('.btn-remove').forEach(btn => btn.addEventListener('click', (e) => { currentWhitelist.splice(e.target.getAttribute('data-index'), 1); chrome.storage.local.set({ whitelist: currentWhitelist }); })); }

    // =============================================
    // 14. DASHBOARD
    // =============================================
    function carregarDashboard(res) { if (!heroTotalMini && !listaConquistas && !listaErrosComuns) return; const total = res.totalCorrigidas || 0; const aceitas = res.totalAceitas || 0; const recusadas = res.totalRecusadas || 0; const dicSize = (res.dicionario_pessoal || []).length; let nivel = '🟢 Iniciante'; let nivelCurto = 'Iniciante'; let progresso = 0; if (total >= 1000) { nivel = '👑 Lendário'; nivelCurto = 'Lendário'; progresso = 1; } else if (total >= 500) { nivel = '⭐ Mestre'; nivelCurto = 'Mestre'; progresso = 0.8; } else if (total >= 100) { nivel = '🔥 Avançado'; nivelCurto = 'Avançado'; progresso = 0.6; } else if (total >= 10) { nivel = '📈 Intermediário'; nivelCurto = 'Inter.'; progresso = 0.4; } else { progresso = Math.min(total / 10, 0.2); } if (heroTotalMini) heroTotalMini.textContent = total.toLocaleString(); if (heroNivelCompact) heroNivelCompact.textContent = nivel; if (heroProgressRing) { const circunferencia = 2 * Math.PI * 54; const offset = circunferencia - (progresso * circunferencia); heroProgressRing.style.strokeDasharray = circunferencia; heroProgressRing.style.strokeDashoffset = offset; heroProgressRing.style.transition = 'stroke-dashoffset 1s ease'; } if (statNivelCurto) statNivelCurto.textContent = nivelCurto; if (statDicCurto) statDicCurto.textContent = dicSize.toLocaleString(); if (statIdiomaMini) statIdiomaMini.textContent = '🌐 ' + (res.language || 'pt-BR'); if (statCloudMini) statCloudMini.textContent = res.cloudSync ? '☁️ Ligado' : '☁️ Desligado'; if (statAceitas) statAceitas.textContent = aceitas.toLocaleString(); if (statRecusadas) statRecusadas.textContent = recusadas.toLocaleString(); if (statTaxa) statTaxa.textContent = (aceitas + recusadas) > 0 ? Math.round((aceitas / (aceitas + recusadas)) * 100) + '%' : '100%'; if (statDic) statDic.textContent = dicSize.toLocaleString(); if (statCorrigidasHoje) { const hoje = new Date().toISOString().split('T')[0]; chrome.storage.local.get({ correcoesHoje: {}, dataUltimaCorrecao: '' }, (r) => { const correcoesHoje = r.correcoesHoje || {}; statCorrigidasHoje.textContent = (correcoesHoje[hoje] || 0).toLocaleString(); let sequencia = 0; let data = new Date(); while (true) { const chave = data.toISOString().split('T')[0]; if (correcoesHoje[chave] && correcoesHoje[chave] > 0) { sequencia++; data.setDate(data.getDate() - 1); } else if (chave === hoje) { data.setDate(data.getDate() - 1); } else break; } if (statSequencia) statSequencia.textContent = sequencia; }); } if (listaErrosComuns) { const erros = res.erroMaisComum || {}; const ordenados = Object.entries(erros).sort((a, b) => b[1] - a[1]).slice(0, 5); if (ordenados.length === 0) { listaErrosComuns.innerHTML = '<p style="color:#888;text-align:center;padding:20px;">Corrija alguns erros para ver suas estatísticas aqui!</p>'; } else { const max = ordenados[0][1]; listaErrosComuns.innerHTML = ordenados.map(([palavra, count]) => { const pct = Math.max(Math.round((count / max) * 100), 10); return `<div class="barra-container-dash"><div class="barra-label-dash"><span>${palavra}</span><span>${count}x</span></div><div class="barra-dash"><div class="barra-preenchida-dash" style="width:${pct}%;">${count}x</div></div></div>`; }).join(''); } } if (listaConquistas) { const conquistas = [{ nome: 'Primeira Correção', desbloqueada: total >= 1 }, { nome: '10 Correções', desbloqueada: total >= 10 }, { nome: '50 Correções', desbloqueada: total >= 50 }, { nome: '100 Correções', desbloqueada: total >= 100 }, { nome: '500 Correções', desbloqueada: total >= 500 }, { nome: '1000 Correções', desbloqueada: total >= 1000 }, { nome: '10 Palavras no Dicionário', desbloqueada: dicSize >= 10 }, { nome: '50 Palavras no Dicionário', desbloqueada: dicSize >= 50 }, { nome: 'Usou Cloud Sync', desbloqueada: res.cloudSync || false }]; const desbloqueadas = conquistas.filter(c => c.desbloqueada).length; if (conquistasDesbloqueadas) conquistasDesbloqueadas.textContent = desbloqueadas + '/9'; listaConquistas.innerHTML = conquistas.map(c => `<div class="conquista-card ${c.desbloqueada ? 'unlock' : 'lock'}"><div class="conquista-icon">${c.desbloqueada ? '🏆' : '🔒'}</div><div class="conquista-nome">${c.nome}</div></div>`).join(''); } }

    // =============================================
    // 15. UTILITÁRIOS
    // =============================================
    function mostrarNotificacao(mensagem, tipo) { if (!saveStatus) return; saveStatus.textContent = mensagem; saveStatus.style.opacity = '1'; saveStatus.style.color = tipo === 'success' ? '#28a745' : tipo === 'error' ? '#e53e3e' : '#6b7280'; const duracao = tipo === 'error' ? 4000 : tipo === 'success' ? 3000 : 2000; clearTimeout(saveStatus._timeout); saveStatus._timeout = setTimeout(() => { saveStatus.style.opacity = '0'; }, duracao); }
    function escapeHtml(texto) { if (!texto) return ''; const div = document.createElement('div'); div.textContent = texto; return div.innerHTML; }
});