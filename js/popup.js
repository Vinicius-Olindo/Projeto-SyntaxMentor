// =============================================
// SyntaxMentor - Live Sync + Corrigir Tudo + Revisar Página
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    const wordInput = document.getElementById('word-input');
    const addBtn = document.getElementById('add-btn');
    const wordList = document.getElementById('word-list');
    const linkOpcoes = document.getElementById('link-opcoes');
    const btnCorrigirTudo = document.getElementById('btn-corrigir-tudo');
    const btnRevisarPagina = document.getElementById('btn-revisar-pagina');

    let currentDictionary = [];

    function carregarDicionario() { chrome.storage.local.get(['dicionario_pessoal'], (res) => { if (chrome.runtime.lastError) { console.warn('Erro ao carregar dicionário:', chrome.runtime.lastError.message); currentDictionary = []; } else { currentDictionary = res.dicionario_pessoal || []; if (!Array.isArray(currentDictionary)) currentDictionary = []; } renderizarLista(); }); }
    function carregarTema() { chrome.storage.local.get(['darkMode'], (res) => { if (chrome.runtime.lastError) return; document.body.classList.toggle('dark-mode', res.darkMode); }); }

    function renderizarLista() { if (!wordList) return; wordList.innerHTML = ''; if (currentDictionary.length === 0) { wordList.innerHTML = '<li style="color:#9ca3af;text-align:center;padding:15px;font-size:12px;">📭 Nenhuma palavra adicionada</li>'; return; } currentDictionary.forEach((word, index) => { const li = document.createElement('li'); li.innerHTML = `<span style="flex:1;">${escapeHtml(word)}</span><button class="btn-remove" data-index="${index}" title="Remover">✕</button>`; wordList.appendChild(li); }); document.querySelectorAll('.btn-remove').forEach(btn => { btn.addEventListener('click', (e) => { e.stopPropagation(); const idx = parseInt(e.target.getAttribute('data-index')); if (idx >= 0 && idx < currentDictionary.length) { currentDictionary.splice(idx, 1); salvarDicionario(); } }); }); }
    function salvarDicionario() { chrome.storage.local.set({ dicionario_pessoal: currentDictionary }, () => { if (chrome.runtime.lastError) return; renderizarLista(); if (wordInput) wordInput.focus(); }); }

    function adicionarPalavra() { if (!wordInput) return; const word = wordInput.value.trim().toLowerCase(); if (!word) { wordInput.value = ''; return; } if (word.length < 2) { wordInput.style.borderColor = '#e53e3e'; setTimeout(() => { wordInput.style.borderColor = ''; }, 1000); return; } if (!currentDictionary.includes(word)) { currentDictionary.unshift(word); wordInput.value = ''; salvarDicionario(); } else { wordInput.value = ''; wordInput.style.borderColor = '#f59e0b'; setTimeout(() => { wordInput.style.borderColor = ''; }, 1000); } }

    function enviarMensagemParaAba(action) { chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => { if (tabs[0] && tabs[0].id) { chrome.tabs.sendMessage(tabs[0].id, { action: action }, () => { if (chrome.runtime.lastError) console.warn('Erro:', chrome.runtime.lastError.message); }); } }); }

    if (addBtn) addBtn.addEventListener('click', adicionarPalavra);
    if (wordInput) wordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); adicionarPalavra(); } });
    if (btnCorrigirTudo) btnCorrigirTudo.addEventListener('click', () => { enviarMensagemParaAba('corrigirTudo'); window.close(); });
    if (btnRevisarPagina) btnRevisarPagina.addEventListener('click', () => { enviarMensagemParaAba('revisarPaginaInteira'); window.close(); });
    if (linkOpcoes) { linkOpcoes.addEventListener('click', (e) => { e.preventDefault(); if (chrome.runtime.openOptionsPage) { chrome.runtime.openOptionsPage(); } else { window.open(chrome.runtime.getURL('options.html')); } }); }

    chrome.storage.onChanged.addListener((changes, namespace) => { if (namespace !== 'local') return; if (changes.dicionario_pessoal) { currentDictionary = changes.dicionario_pessoal.newValue || []; if (!Array.isArray(currentDictionary)) currentDictionary = []; renderizarLista(); } if (changes.darkMode) { document.body.classList.toggle('dark-mode', changes.darkMode.newValue); } });

    function escapeHtml(texto) { if (!texto) return ''; const div = document.createElement('div'); div.textContent = texto; return div.innerHTML; }

    carregarTema();
    carregarDicionario();
});