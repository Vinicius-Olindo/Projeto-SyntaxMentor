// =============================================
// SyntaxMentor - popup.js v2.7.0 (Quick Action Toggle)
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    const wordInput = document.getElementById('word-input');
    const addBtn = document.getElementById('add-btn');
    const wordList = document.getElementById('word-list');
    const linkOpcoes = document.getElementById('link-opcoes');

    // Elementos da Ação Rápida
    const siteLabel = document.getElementById('current-site-label');
    const toggleSite = document.getElementById('toggle-site-active');
    const statusDot = document.getElementById('site-status-dot');

    let currentDictionary = [];
    let currentHost = "";
    let currentBlacklist = [];

    // =============================================
    // 1. CARREGAR TEMA ESCURO
    // =============================================
    function carregarTema() {
        chrome.storage.local.get(['darkMode'], (res) => {
            if (res.darkMode) document.body.classList.add('dark-mode');
        });
    }

    // =============================================
    // 2. VERIFICAR SITE ATUAL E BLACKLIST
    // =============================================
    function carregarSiteAtual() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0] || !tabs[0].url || tabs[0].url.startsWith('chrome://')) {
                siteLabel.textContent = "Página do Sistema";
                toggleSite.disabled = true;
                return;
            }

            try {
                const url = new URL(tabs[0].url);
                currentHost = url.hostname.replace(/^www\./, ''); // Limpa o www.
                siteLabel.textContent = currentHost;

                chrome.storage.local.get(['blacklist'], (res) => {
                    currentBlacklist = res.blacklist || [];
                    const isBlocked = currentBlacklist.includes(currentHost);

                    // Se não está bloqueado, o switch está CHECADO (Ativo)
                    toggleSite.checked = !isBlocked;
                    atualizarPontoVisual(!isBlocked);
                });
            } catch (e) {
                siteLabel.textContent = "Site Inválido";
                toggleSite.disabled = true;
            }
        });
    }

    // =============================================
    // 3. EVENTO DO SWITCH (LIGAR/DESLIGAR NO SITE)
    // =============================================
    if (toggleSite) {
        toggleSite.addEventListener('change', (e) => {
            const isAtivando = e.target.checked;
            atualizarPontoVisual(isAtivando);

            if (isAtivando) {
                // Remove da Blacklist
                currentBlacklist = currentBlacklist.filter(d => d !== currentHost);
            } else {
                // Adiciona na Blacklist
                if (!currentBlacklist.includes(currentHost)) {
                    currentBlacklist.push(currentHost);
                }
            }

            // Salva e força o reload silencioso do ícone (o background lida com isso)
            chrome.storage.local.set({ blacklist: currentBlacklist }, () => {
                // Opcional: Dar reload na aba para aplicar a mudança imediatamente
                // chrome.tabs.reload(); 
            });
        });
    }

    function atualizarPontoVisual(isAtivo) {
        if (isAtivo) {
            statusDot.classList.add('active');
        } else {
            statusDot.classList.remove('active');
        }
    }

    // =============================================
    // 4. LÓGICA DO DICIONÁRIO (MANTIDA)
    // =============================================
    function carregarDicionario() {
        chrome.storage.local.get(['dicionario_pessoal'], (res) => {
            currentDictionary = res.dicionario_pessoal || [];
            if (!Array.isArray(currentDictionary)) currentDictionary = [];
            renderizarLista();
        });
    }

    function renderizarLista() {
        if (!wordList) return;
        wordList.innerHTML = '';

        if (currentDictionary.length === 0) {
            wordList.innerHTML = '<li style="color:#9ca3af;text-align:center;padding:15px;font-size:12px;">📭 Nenhuma palavra</li>';
            return;
        }

        currentDictionary.forEach((word, index) => {
            const li = document.createElement('li');
            li.innerHTML = `<span style="flex:1;">${escapeHtml(word)}</span><button class="btn-remove" data-index="${index}" title="Remover">✕</button>`;
            wordList.appendChild(li);
        });

        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                currentDictionary.splice(idx, 1);
                salvarDicionario();
            });
        });
    }

    function salvarDicionario() {
        chrome.storage.local.set({ dicionario_pessoal: currentDictionary }, renderizarLista);
    }

    function adicionarPalavra() {
        if (!wordInput) return;
        const word = wordInput.value.trim().toLowerCase();
        if (word.length < 2) return;

        if (!currentDictionary.includes(word)) {
            currentDictionary.unshift(word);
            wordInput.value = '';
            salvarDicionario();
        }
    }

    if (addBtn) addBtn.addEventListener('click', adicionarPalavra);
    if (wordInput) wordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') adicionarPalavra(); });

    if (linkOpcoes) {
        linkOpcoes.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.runtime.openOptionsPage ? chrome.runtime.openOptionsPage() : window.open(chrome.runtime.getURL('options.html'));
        });
    }

    // Live Sync para atualizar se mudar nas opções
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'local') return;
        if (changes.dicionario_pessoal) {
            currentDictionary = changes.dicionario_pessoal.newValue || [];
            renderizarLista();
        }
        if (changes.darkMode) {
            changes.darkMode.newValue ? document.body.classList.add('dark-mode') : document.body.classList.remove('dark-mode');
        }
        if (changes.blacklist) {
            currentBlacklist = changes.blacklist.newValue || [];
            toggleSite.checked = !currentBlacklist.includes(currentHost);
            atualizarPontoVisual(toggleSite.checked);
        }
    });

    function escapeHtml(texto) {
        const div = document.createElement('div'); div.textContent = texto; return div.innerHTML;
    }

    // Inicializar
    carregarTema();
    carregarSiteAtual();
    carregarDicionario();
});