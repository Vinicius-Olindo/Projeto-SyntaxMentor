// =============================================
// SyntaxMentor - popup.js v2.5.0 (Live Sync Fix)
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    const wordInput = document.getElementById('word-input');
    const addBtn = document.getElementById('add-btn');
    const wordList = document.getElementById('word-list');
    const linkOpcoes = document.getElementById('link-opcoes');

    let currentDictionary = [];

    // =============================================
    // CARREGAR DICIONÁRIO
    // =============================================
    function carregarDicionario() {
        chrome.storage.local.get(['dicionario_pessoal'], (res) => {
            if (chrome.runtime.lastError) {
                console.warn('Erro ao carregar dicionário:', chrome.runtime.lastError.message);
                currentDictionary = [];
            } else {
                currentDictionary = res.dicionario_pessoal || [];
                if (!Array.isArray(currentDictionary)) currentDictionary = [];
            }
            renderizarLista();
        });
    }

    // =============================================
    // 🌙 CARREGAR TEMA ESCURO
    // =============================================
    function carregarTema() {
        chrome.storage.local.get(['darkMode'], (res) => {
            if (chrome.runtime.lastError) return;
            if (res.darkMode) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        });
    }

    // =============================================
    // RENDERIZAR LISTA
    // =============================================
    function renderizarLista() {
        if (!wordList) return;
        wordList.innerHTML = '';

        if (currentDictionary.length === 0) {
            wordList.innerHTML = '<li style="color:#9ca3af;text-align:center;padding:15px;font-size:12px;">📭 Nenhuma palavra adicionada</li>';
            return;
        }

        currentDictionary.forEach((word, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span style="flex:1;">${escapeHtml(word)}</span>
                <button class="btn-remove" data-index="${index}" title="Remover">✕</button>
            `;
            wordList.appendChild(li);
        });

        // Adicionar listeners de remoção
        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.target.getAttribute('data-index'));
                if (idx >= 0 && idx < currentDictionary.length) {
                    const removida = currentDictionary[idx];
                    currentDictionary.splice(idx, 1);
                    salvarDicionario();
                    console.log(`🗑️ Palavra removida: "${removida}"`);
                }
            });
        });
    }

    // =============================================
    // SALVAR DICIONÁRIO
    // =============================================
    function salvarDicionario() {
        chrome.storage.local.set({ dicionario_pessoal: currentDictionary }, () => {
            if (chrome.runtime.lastError) {
                console.warn('Erro ao salvar dicionário:', chrome.runtime.lastError.message);
                return;
            }
            renderizarLista();
            if (wordInput) wordInput.focus();
        });
    }

    // =============================================
    // ADICIONAR NOVA PALAVRA
    // =============================================
    function adicionarPalavra() {
        if (!wordInput) return;
        const word = wordInput.value.trim().toLowerCase();

        if (!word) {
            wordInput.value = '';
            return;
        }

        if (word.length < 2) {
            wordInput.style.borderColor = '#e53e3e';
            setTimeout(() => { wordInput.style.borderColor = ''; }, 1000);
            return;
        }

        if (!currentDictionary.includes(word)) {
            currentDictionary.unshift(word);
            wordInput.value = '';
            salvarDicionario();
        } else {
            wordInput.value = '';
            wordInput.style.borderColor = '#f59e0b';
            setTimeout(() => { wordInput.style.borderColor = ''; }, 1000);
        }
    }

    // =============================================
    // EVENTOS
    // =============================================
    if (addBtn) {
        addBtn.addEventListener('click', adicionarPalavra);
    }

    if (wordInput) {
        wordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                adicionarPalavra();
            }
        });
    }

    if (linkOpcoes) {
        linkOpcoes.addEventListener('click', (e) => {
            e.preventDefault();
            if (chrome.runtime.openOptionsPage) {
                chrome.runtime.openOptionsPage();
            } else {
                window.open(chrome.runtime.getURL('options.html'));
            }
        });
    }

    // =============================================
    // 🆕 LIVE SYNC (CORRIGIDO)
    // =============================================
    chrome.storage.onChanged.addListener((changes, namespace) => {
        // Só responde a mudanças no storage local
        if (namespace !== 'local') return;

        // 🆕 Atualiza dicionário se mudou
        if (changes.dicionario_pessoal) {
            console.log('📖 Dicionário atualizado via sync:', 
                (changes.dicionario_pessoal.newValue || []).length, 'palavras');
            currentDictionary = changes.dicionario_pessoal.newValue || [];
            if (!Array.isArray(currentDictionary)) currentDictionary = [];
            renderizarLista();
        }

        // 🆕 Atualiza tema se mudou
        if (changes.darkMode) {
            if (changes.darkMode.newValue) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }
    });

    // =============================================
    // UTILITÁRIOS
    // =============================================
    function escapeHtml(texto) {
        if (!texto) return '';
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }

    // =============================================
    // INICIALIZAÇÃO
    // =============================================
    carregarTema();
    carregarDicionario();
});