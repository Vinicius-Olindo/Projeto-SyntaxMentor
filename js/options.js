// SyntaxMentor - options.js v2.3.0 (Página Geral)
document.addEventListener('DOMContentLoaded', () => {

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

    // CARREGAR
    chrome.storage.local.get({
        language: 'pt-BR', pickyMode: true, darkMode: false, autoHideBubble: false,
        speed: '500', blacklist: [], dicionario_pessoal: [],
        toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's', display: 'Alt + S' },
        ignoreShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 'i', display: 'Alt + I' },
        corrigirTudoShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 's', display: 'Alt + Shift + S' }
    }, (res) => {
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
    });

    // LIVE SYNC
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'local') return;
        if (changes.dicionario_pessoal) { currentDictionary = changes.dicionario_pessoal.newValue || []; renderizarDicionario(); }
        if (changes.blacklist) { currentBlacklist = changes.blacklist.newValue || []; renderizarBlacklist(); }
        if (changes.darkMode) {
            if (elDarkMode) elDarkMode.checked = changes.darkMode.newValue;
            if (changes.darkMode.newValue) document.body.classList.add('dark-mode');
            else document.body.classList.remove('dark-mode');
        }
        if (changes.autoHideBubble && elAutoHideBubble) elAutoHideBubble.checked = changes.autoHideBubble.newValue;
    });

    if (elDarkMode) elDarkMode.addEventListener('change', (e) => {
        if (e.target.checked) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
        chrome.storage.local.set({ darkMode: e.target.checked });
    });

    if (elAutoHideBubble) elAutoHideBubble.addEventListener('change', (e) => {
        chrome.storage.local.set({ autoHideBubble: e.target.checked });
    });

    // SALVAR
    if (btnSalvar) btnSalvar.addEventListener('click', () => {
        let selectedSpeed = '500'; elSpeedOptions.forEach(opt => { if (opt.checked) selectedSpeed = opt.value; });
        chrome.storage.local.set({
            language: elLanguage?.value || 'pt-BR',
            pickyMode: elPickyMode?.checked ?? true,
            speed: selectedSpeed,
            autoHideBubble: elAutoHideBubble?.checked || false
        }, () => {
            saveStatus.style.opacity = '1';
            saveStatus.style.color = '#28a745';
            saveStatus.textContent = '✓ Salvo com sucesso!';
            setTimeout(() => { saveStatus.style.opacity = '0'; }, 2000);
        });
    });

    // BLACKLIST
    if (btnAddBlacklist) btnAddBlacklist.addEventListener('click', () => {
        const domain = blacklistInput.value.trim().toLowerCase();
        if (domain && !currentBlacklist.includes(domain)) {
            currentBlacklist.unshift(domain); blacklistInput.value = '';
            chrome.storage.local.set({ blacklist: currentBlacklist });
        }
    });

    function renderizarBlacklist() {
        if (!blacklistUl) return;
        blacklistUl.innerHTML = '';
        currentBlacklist.forEach((domain, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="item-text">${domain}</span><input type="text" class="edit-input" value="${domain}" style="display:none;"><div class="action-btns"><button class="btn-edit" data-index="${index}" title="Editar">✏️</button><button class="btn-remove" data-index="${index}" title="Remover">✕</button></div>`;
            blacklistUl.appendChild(li);
        });
        adicionarOuvintesLista(blacklistUl, currentBlacklist, 'blacklist');
    }

    // DICIONÁRIO
    if (btnAddDictionary) btnAddDictionary.addEventListener('click', () => {
        const word = dictionaryInput.value.trim().toLowerCase();
        if (word && !currentDictionary.includes(word)) {
            currentDictionary.unshift(word); dictionaryInput.value = '';
            chrome.storage.local.set({ dicionario_pessoal: currentDictionary });
        }
    });

    function renderizarDicionario() {
        if (!dictionaryUl) return;
        dictionaryUl.innerHTML = '';
        currentDictionary.forEach((word, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="item-text">${word}</span><input type="text" class="edit-input" value="${word}" style="display:none;"><div class="action-btns"><button class="btn-edit" data-index="${index}" title="Editar">✏️</button><button class="btn-remove" data-index="${index}" title="Remover">✕</button></div>`;
            dictionaryUl.appendChild(li);
        });
        adicionarOuvintesLista(dictionaryUl, currentDictionary, 'dicionario_pessoal');
    }

    function adicionarOuvintesLista(listaUl, arrayAtual, storageKey) {
        listaUl.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                arrayAtual.splice(e.target.getAttribute('data-index'), 1);
                chrome.storage.local.set({ [storageKey]: arrayAtual });
            });
        });
        listaUl.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const li = e.target.closest('li');
                const span = li.querySelector('.item-text');
                const input = li.querySelector('.edit-input');
                if (input.style.display === 'none') {
                    span.style.display = 'none'; input.style.display = 'block'; input.focus();
                    e.target.textContent = '✓'; e.target.style.color = '#28a745';
                } else {
                    salvarEdicaoInline(li, arrayAtual, storageKey);
                }
            });
        });
        listaUl.querySelectorAll('.edit-input').forEach(input => {
            input.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); salvarEdicaoInline(e.target.closest('li'), arrayAtual, storageKey); } });
            input.addEventListener('blur', () => {
                const li = input.closest('li');
                setTimeout(() => { if (li.querySelector('.edit-input').style.display !== 'none') salvarEdicaoInline(li, arrayAtual, storageKey); }, 150);
            });
        });
    }

    function salvarEdicaoInline(li, arrayAtual, storageKey) {
        const span = li.querySelector('.item-text');
        const input = li.querySelector('.edit-input');
        const btnEdit = li.querySelector('.btn-edit');
        const idx = btnEdit.getAttribute('data-index');
        const novoValor = input.value.trim().toLowerCase();
        span.style.display = 'block'; input.style.display = 'none'; btnEdit.textContent = '✏️'; btnEdit.style.color = '#6f42c1';
        if (novoValor && novoValor !== arrayAtual[idx]) { arrayAtual[idx] = novoValor; span.textContent = novoValor; chrome.storage.local.set({ [storageKey]: arrayAtual }); }
        else if (!novoValor) input.value = arrayAtual[idx];
    }

    // ATALHOS
    function iniciarGravacao(botaoElement, configKey) {
        if (activeBtn) cancelarGravacao();
        recordingTarget = configKey; activeBtn = botaoElement;
        activeBtn.textContent = "Pressione..."; activeBtn.classList.add('gravando');
    }
    function cancelarGravacao() {
        if (!activeBtn) return;
        activeBtn.classList.remove('gravando');
        chrome.storage.local.get(recordingTarget, (res) => { if (res[recordingTarget]) activeBtn.textContent = res[recordingTarget].display; });
        recordingTarget = null; activeBtn = null;
    }
    if (btnGravarToggle) btnGravarToggle.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); iniciarGravacao(btnGravarToggle, 'toggleShortcut'); });
    if (btnGravarIgnore) btnGravarIgnore.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); iniciarGravacao(btnGravarIgnore, 'ignoreShortcut'); });
    if (btnGravarCorrigirTudo) btnGravarCorrigirTudo.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); iniciarGravacao(btnGravarCorrigirTudo, 'corrigirTudoShortcut'); });

    document.addEventListener('keydown', (e) => {
        if (!recordingTarget) return;
        if (['Control', 'Alt', 'Shift', 'Meta', 'Escape'].includes(e.key)) return;
        e.preventDefault();
        const shortcut = { altKey: e.altKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, key: e.key.toLowerCase(), display: (e.ctrlKey ? 'Ctrl + ' : '') + (e.altKey ? 'Alt + ' : '') + (e.shiftKey ? 'Shift + ' : '') + e.key.toUpperCase() };
        if (!e.ctrlKey && !e.altKey && !e.shiftKey) { shortcut.altKey = true; shortcut.display = "Alt + " + e.key.toUpperCase(); }
        chrome.storage.local.set({ [recordingTarget]: shortcut }, () => { activeBtn.textContent = shortcut.display; activeBtn.classList.remove('gravando'); recordingTarget = null; activeBtn = null; });
    });
    document.addEventListener('click', (e) => { if (recordingTarget && e.target !== activeBtn) cancelarGravacao(); });

    // BACKUP
    if (btnExportar) btnExportar.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'exportData' }, (response) => {
            if (response?.success) {
                const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `syntaxmentor-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
                mostrarNotificacao('✅ Backup exportado!', 'success');
            }
        });
    });

    if (btnImportar && inputImportar) {
        btnImportar.addEventListener('click', () => inputImportar.click());
        inputImportar.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                chrome.runtime.sendMessage({ action: 'importData', data: event.target.result }, (response) => {
                    if (response?.success) { mostrarNotificacao('✅ Restaurado!', 'success'); setTimeout(() => location.reload(), 1500); }
                    else mostrarNotificacao('❌ ' + (response?.error || 'Inválido'), 'error');
                });
            };
            reader.readAsText(file);
        });
    }

    function mostrarNotificacao(msg, tipo) {
        saveStatus.textContent = msg; saveStatus.style.opacity = '1';
        saveStatus.style.color = tipo === 'success' ? '#28a745' : '#e53e3e';
        setTimeout(() => { saveStatus.style.opacity = '0'; }, 3000);
    }
});