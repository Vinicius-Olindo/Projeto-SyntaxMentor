// SyntaxMentor - options-seguranca.js v2.4.0
document.addEventListener('DOMContentLoaded', () => {

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

    const btnSalvar = document.getElementById('btn-salvar');
    const saveStatus = document.getElementById('save-status');

    // =============================================
    // CARREGAR CONFIGURAÇÕES
    // =============================================
    chrome.storage.local.get({
        apiUrl: '', apiKey: '',
        modoConfirmacao: false, modoLeituraGlobal: false, modoLeituraSites: [],
        modoWhitelist: false, whitelist: [],
        cloudSync: false,
        darkMode: false
    }, (res) => {
        if (elApiUrl) elApiUrl.value = res.apiUrl || '';
        if (elApiKey) elApiKey.value = res.apiKey || '';
        if (elModoConfirmacao) elModoConfirmacao.checked = res.modoConfirmacao || false;
        if (elModoLeituraGlobal) elModoLeituraGlobal.checked = res.modoLeituraGlobal || false;
        if (elModoWhitelist) elModoWhitelist.checked = res.modoWhitelist || false;
        if (elCloudSync) elCloudSync.checked = res.cloudSync || false;

        currentModoLeitura = res.modoLeituraSites || [];
        currentWhitelist = res.whitelist || [];

        renderizarModoLeitura();
        renderizarWhitelist();

        if (res.darkMode) document.body.classList.add('dark-mode');
    });

    // =============================================
    // LIVE SYNC
    // =============================================
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'local') return;
        if (changes.modoLeituraSites) { currentModoLeitura = changes.modoLeituraSites.newValue || []; renderizarModoLeitura(); }
        if (changes.whitelist) { currentWhitelist = changes.whitelist.newValue || []; renderizarWhitelist(); }
        if (changes.modoConfirmacao && elModoConfirmacao) elModoConfirmacao.checked = changes.modoConfirmacao.newValue;
        if (changes.modoLeituraGlobal && elModoLeituraGlobal) elModoLeituraGlobal.checked = changes.modoLeituraGlobal.newValue;
        if (changes.modoWhitelist && elModoWhitelist) elModoWhitelist.checked = changes.modoWhitelist.newValue;
        if (changes.cloudSync && elCloudSync) elCloudSync.checked = changes.cloudSync.newValue;
        if (changes.darkMode) {
            if (changes.darkMode.newValue) document.body.classList.add('dark-mode');
            else document.body.classList.remove('dark-mode');
        }
    });

    // =============================================
    // EVENTOS EM TEMPO REAL
    // =============================================
    if (elModoConfirmacao) elModoConfirmacao.addEventListener('change', (e) => chrome.storage.local.set({ modoConfirmacao: e.target.checked }));
    if (elModoLeituraGlobal) elModoLeituraGlobal.addEventListener('change', (e) => chrome.storage.local.set({ modoLeituraGlobal: e.target.checked }));
    if (elModoWhitelist) elModoWhitelist.addEventListener('change', (e) => chrome.storage.local.set({ modoWhitelist: e.target.checked }));
    if (elCloudSync) elCloudSync.addEventListener('change', (e) => chrome.storage.local.set({ cloudSync: e.target.checked }));

    // =============================================
    // TESTAR API
    // =============================================
    if (btnTestarApi) btnTestarApi.addEventListener('click', async () => {
        const url = (elApiUrl?.value || 'https://api.languagetool.org/v2/check').trim();
        const key = elApiKey?.value?.trim() || '';
        statusApi.textContent = '⏳ Testando...';
        statusApi.style.color = '#f59e0b';
        detalhesApi.style.display = 'none';

        try {
            const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
            if (key) headers['Authorization'] = `Bearer ${key}`;
            const resp = await fetch(url, {
                method: 'POST',
                headers,
                body: new URLSearchParams({ text: 'Hello world', language: 'en-US' })
            });

            if (resp.ok) {
                const data = await resp.json();
                statusApi.textContent = '✅ Conectado!';
                statusApi.style.color = '#28a745';
                detalhesApi.style.display = 'block';
                apiInfo.textContent = `Idioma: ${data.language?.name || 'OK'} | ${new URL(url).hostname}`;
                chrome.storage.local.set({ apiUrl: url, apiKey: key });
            } else {
                throw new Error(`HTTP ${resp.status}`);
            }
        } catch (err) {
            statusApi.textContent = '❌ ' + err.message;
            statusApi.style.color = '#e53e3e';
            detalhesApi.style.display = 'none';
        }
    });

    // =============================================
    // TOGGLE VISIBILIDADE API KEY
    // =============================================
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
    // MODO LEITURA
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
                    <span style="font-size:10px;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;margin-right:10px;">📖 Leitura</span>
                    <button class="btn-remove" data-index="${index}">✕</button>
                </div>`;
            modoLeituraUl.appendChild(li);
        });
        modoLeituraUl.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentModoLeitura.splice(e.target.getAttribute('data-index'), 1);
                chrome.storage.local.set({ modoLeituraSites: currentModoLeitura });
            });
        });
    }

    // =============================================
    // WHITELIST
    // =============================================
    if (btnAddWhitelist) {
        btnAddWhitelist.addEventListener('click', () => {
            const domain = whitelistInput.value.trim().toLowerCase();
            if (domain && !currentWhitelist.includes(domain)) {
                currentWhitelist.unshift(domain);
                whitelistInput.value = '';
                chrome.storage.local.set({ whitelist: currentWhitelist });
            }
        });
    }

    function renderizarWhitelist() {
        if (!whitelistUl) return;
        whitelistUl.innerHTML = '';
        currentWhitelist.forEach((domain, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="item-text">${domain}</span>
                <div class="action-btns">
                    <span style="font-size:10px;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;margin-right:10px;">✅ Permitido</span>
                    <button class="btn-remove" data-index="${index}">✕</button>
                </div>`;
            whitelistUl.appendChild(li);
        });
        whitelistUl.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                currentWhitelist.splice(e.target.getAttribute('data-index'), 1);
                chrome.storage.local.set({ whitelist: currentWhitelist });
            });
        });
    }

    // =============================================
    // SALVAR
    // =============================================
    if (btnSalvar) {
        btnSalvar.addEventListener('click', () => {
            chrome.storage.local.set({
                apiUrl: elApiUrl?.value?.trim() || '',
                apiKey: elApiKey?.value?.trim() || '',
                modoConfirmacao: elModoConfirmacao?.checked || false,
                modoLeituraGlobal: elModoLeituraGlobal?.checked || false,
                modoWhitelist: elModoWhitelist?.checked || false,
                cloudSync: elCloudSync?.checked || false
            }, () => {
                saveStatus.style.opacity = '1';
                saveStatus.style.color = '#28a745';
                saveStatus.textContent = '✓ Salvo com sucesso!';
                setTimeout(() => { saveStatus.style.opacity = '0'; }, 2000);
            });
        });
    }
});