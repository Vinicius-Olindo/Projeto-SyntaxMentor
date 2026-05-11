// SyntaxMentor - popup.js v2.0.1 (Dark Mode Fix)
document.addEventListener('DOMContentLoaded', () => {
    const wordInput = document.getElementById('word-input');
    const addBtn = document.getElementById('add-btn');
    const wordList = document.getElementById('word-list');
    const linkOpcoes = document.getElementById('link-opcoes');

    let currentDictionary = [];

    // =============================================
    // 🌙 CARREGAR TEMA ESCURO
    // =============================================
    function carregarTema() {
        chrome.storage.local.get(['darkMode'], (res) => {
            if (res.darkMode) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        });
    }

    // Sincroniza tema em tempo real
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'local') {
            if (changes.darkMode) {
                if (changes.darkMode.newValue) {
                    document.body.classList.add('dark-mode');
                } else {
                    document.body.classList.remove('dark-mode');
                }
            }
            if (changes.dicionario_pessoal) {
                currentDictionary = changes.dicionario_pessoal.newValue || [];
                if (!Array.isArray(currentDictionary)) currentDictionary = [];
                renderizarLista();
            }
        }
    });

    // =============================================
    // 1. CARREGAR DICIONÁRIO
    // =============================================
    function carregarDicionario() {
        chrome.storage.local.get(['dicionario_pessoal'], (res) => {
            // Garante que sempre será uma lista (array), mesmo se der erro no banco
            currentDictionary = res.dicionario_pessoal || [];
            if (!Array.isArray(currentDictionary)) currentDictionary = [];

            renderizarLista();
        });
    }

    // =============================================
    // 2. RENDERIZAR LISTA
    // =============================================
    function renderizarLista() {
        if (!wordList) return;
        wordList.innerHTML = '';
        currentDictionary.forEach((word, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${word}</span>
                <button class="btn-remove" data-index="${index}" title="Remover">✕</button>
            `;
            wordList.appendChild(li);
        });

        document.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                currentDictionary.splice(idx, 1);
                salvarDicionario();
            });
        });
    }

    // =============================================
    // 3. SALVAR DICIONÁRIO
    // =============================================
    function salvarDicionario() {
        chrome.storage.local.set({ dicionario_pessoal: currentDictionary }, () => {
            renderizarLista();
            if (wordInput) wordInput.focus();
        });
    }

    // =============================================
    // 4. ADICIONAR NOVA PALAVRA
    // =============================================
    function adicionarPalavra() {
        if (!wordInput) return;
        const word = wordInput.value.trim().toLowerCase();

        if (word && !currentDictionary.includes(word)) {
            currentDictionary.unshift(word); // Adiciona no topo
            wordInput.value = '';
            salvarDicionario();
        } else {
            wordInput.value = ''; // Apenas limpa se for repetida ou vazia
        }
    }

    // =============================================
    // EVENTOS DE CLIQUE E TECLADO
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
    // INICIALIZAÇÃO
    // =============================================
    carregarTema();
    carregarDicionario();
});