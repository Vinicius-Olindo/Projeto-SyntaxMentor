// SyntaxMentor - options.js v1.9.20 (Blur Fix)
document.addEventListener('DOMContentLoaded', () => {

    // Elementos da Interface
    const elLanguage = document.getElementById('language');
    const elPickyMode = document.getElementById('pickyMode');
    const elDarkMode = document.getElementById('darkMode');
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
    let recordingTarget = null;
    let activeBtn = null;

    // 1. CARREGAR CONFIGURAÇÕES DO BANCO DE DADOS
    chrome.storage.local.get({
        language: 'pt-BR',
        pickyMode: true,
        darkMode: false,
        speed: '500',
        blacklist: [],
        dicionario_pessoal: [],
        toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's', display: 'Alt + S' },
        ignoreShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 'i', display: 'Alt + I' }
    }, (res) => {
        if (elLanguage) elLanguage.value = res.language;
        if (elPickyMode) elPickyMode.checked = res.pickyMode;
        if (elDarkMode) { elDarkMode.checked = res.darkMode; if (res.darkMode) document.body.classList.add('dark-mode'); }

        elSpeedOptions.forEach(opt => { if (opt.value === res.speed.toString()) opt.checked = true; });

        currentBlacklist = res.blacklist; renderizarBlacklist();
        currentDictionary = res.dicionario_pessoal; renderizarDicionario();

        if (btnGravarToggle) btnGravarToggle.textContent = res.toggleShortcut.display;
        if (btnGravarIgnore) btnGravarIgnore.textContent = res.ignoreShortcut.display;
    });

    // ✨ ESCUTAR MUDANÇAS EXTERNAS (Live Sync)
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.dicionario_pessoal) { currentDictionary = changes.dicionario_pessoal.newValue || []; renderizarDicionario(); }
            if (changes.blacklist) { currentBlacklist = changes.blacklist.newValue || []; renderizarBlacklist(); }
            if (changes.darkMode) {
                if (elDarkMode) elDarkMode.checked = changes.darkMode.newValue;
                if (changes.darkMode.newValue) document.body.classList.add('dark-mode');
                else document.body.classList.remove('dark-mode');
            }
        }
    });

    // Tema em Tempo Real
    if (elDarkMode) {
        elDarkMode.addEventListener('change', (e) => {
            const isDark = e.target.checked;
            if (isDark) document.body.classList.add('dark-mode'); else document.body.classList.remove('dark-mode');
            chrome.storage.local.set({ darkMode: isDark });
        });
    }

    // 2. SALVAR CONFIGURAÇÕES GERAIS
    if (btnSalvar) {
        btnSalvar.addEventListener('click', () => {
            let selectedSpeed = '500'; elSpeedOptions.forEach(opt => { if (opt.checked) selectedSpeed = opt.value; });
            const novasConfiguracoes = {
                language: elLanguage ? elLanguage.value : 'pt-BR',
                pickyMode: elPickyMode ? elPickyMode.checked : true,
                speed: selectedSpeed
            };
            chrome.storage.local.set(novasConfiguracoes, () => {
                saveStatus.style.opacity = '1'; setTimeout(() => { saveStatus.style.opacity = '0'; }, 2000);
            });
        });
    }

    // ==========================================
    // 3. LÓGICA DA BLACKLIST COM INLINE EDIT
    // ==========================================
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

    // ==========================================
    // 4. LÓGICA DO DICIONÁRIO COM INLINE EDIT
    // ==========================================
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
    }

    // ==========================================
    // FUNÇÃO COMPARTILHADA DE OUVINTES (Editar/Remover)
    // ==========================================
    function adicionarOuvintesLista(listaUl, arrayAtual, storageKey) {
        // Remover
        listaUl.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                arrayAtual.splice(idx, 1);
                chrome.storage.local.set({ [storageKey]: arrayAtual });
            });
        });

        // Editar
        listaUl.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                const li = e.target.closest('li');
                const span = li.querySelector('.item-text');
                const input = li.querySelector('.edit-input');

                if (input.style.display === 'none') {
                    // Mudar para o modo Edição
                    span.style.display = 'none';
                    input.style.display = 'block';
                    input.focus();
                    e.target.textContent = '✓';
                    e.target.style.color = '#28a745';
                } else {
                    // Salvar Edição
                    salvarEdicaoInline(li, arrayAtual, storageKey);
                }
            });
        });

        // 🆕 Salvar com a tecla ENTER
        listaUl.querySelectorAll('.edit-input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const li = e.target.closest('li');
                    salvarEdicaoInline(li, arrayAtual, storageKey);
                }
            });

            // 🆕 Salvar ao perder o foco (blur)
            input.addEventListener('blur', (e) => {
                const li = e.target.closest('li');
                // Pequeno delay para não conflitar com o clique no botão de editar
                setTimeout(() => {
                    if (li.querySelector('.edit-input').style.display !== 'none') {
                        salvarEdicaoInline(li, arrayAtual, storageKey);
                    }
                }, 150);
            });
        });
    }

    // 🆕 Função auxiliar para salvar edição inline
    function salvarEdicaoInline(li, arrayAtual, storageKey) {
        const span = li.querySelector('.item-text');
        const input = li.querySelector('.edit-input');
        const btnEdit = li.querySelector('.btn-edit');
        const idx = btnEdit.getAttribute('data-index');

        const novoValor = input.value.trim().toLowerCase();

        // Volta ao modo visualização
        span.style.display = 'block';
        input.style.display = 'none';
        btnEdit.textContent = '✏️';
        btnEdit.style.color = '#6f42c1';

        if (novoValor && novoValor !== arrayAtual[idx]) {
            arrayAtual[idx] = novoValor;
            span.textContent = novoValor;
            chrome.storage.local.set({ [storageKey]: arrayAtual });
        } else if (!novoValor) {
            // Não salva valores vazios, restaura o original
            input.value = arrayAtual[idx];
        }
    }

    // 5. GRAVAÇÃO DOS ATALHOS
    function iniciarGravacao(botaoElement, configKey) {
        if (activeBtn) cancelarGravacao();
        recordingTarget = configKey; activeBtn = botaoElement;
        activeBtn.textContent = "Pressione a tecla..."; activeBtn.classList.add('gravando');
    }
    function cancelarGravacao() {
        if (!activeBtn) return;
        const btnLocal = activeBtn; const targetLocal = recordingTarget;
        btnLocal.classList.remove('gravando');
        chrome.storage.local.get(targetLocal, (res) => { btnLocal.textContent = res[targetLocal].display; });
        recordingTarget = null; activeBtn = null;
    }
    if (btnGravarToggle) btnGravarToggle.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); iniciarGravacao(btnGravarToggle, 'toggleShortcut'); });
    if (btnGravarIgnore) btnGravarIgnore.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); iniciarGravacao(btnGravarIgnore, 'ignoreShortcut'); });

    document.addEventListener('keydown', (e) => {
        if (!recordingTarget) return;
        if (['Control', 'Alt', 'Shift', 'Meta', 'Escape'].includes(e.key)) return;
        e.preventDefault();
        const shortcut = { altKey: e.altKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, key: e.key.toLowerCase(), display: (e.ctrlKey ? 'Ctrl + ' : '') + (e.altKey ? 'Alt + ' : '') + (e.shiftKey ? 'Shift + ' : '') + e.key.toUpperCase() };
        if (!e.ctrlKey && !e.altKey && !e.shiftKey) { shortcut.altKey = true; shortcut.display = "Alt + " + e.key.toUpperCase(); }
        let updateData = {}; updateData[recordingTarget] = shortcut;
        chrome.storage.local.set(updateData, () => { activeBtn.textContent = shortcut.display; activeBtn.classList.remove('gravando'); recordingTarget = null; activeBtn = null; });
    });
    document.addEventListener('click', (e) => { if (recordingTarget && e.target !== activeBtn) cancelarGravacao(); });
});