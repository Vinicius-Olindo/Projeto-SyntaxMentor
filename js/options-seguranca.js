// =============================================
// SyntaxMentor - options-seguranca.js v2.8.1
// Lógica da página de configurações de segurança
// =============================================

// Verificar se está na página correta
if (document.body.classList.contains('seguranca-page')) {
    
    // =============================================
    // ELEMENTOS DOM
    // =============================================
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
    const elLanguageToolConsent = document.getElementById('languageToolConsent');
    const modoLeituraInput = document.getElementById('modo-leitura-input');
    const btnAddModoLeitura = document.getElementById('btn-add-modo-leitura');
    const modoLeituraUl = document.getElementById('modo-leitura-list');
    let currentModoLeitura = [];
    const elModoWhitelist = document.getElementById('modoWhitelist');
    const whitelistInput = document.getElementById('whitelist-input');
    const btnAddWhitelist = document.getElementById('btn-add-whitelist');
    const whitelistUl = document.getElementById('whitelist-list');
    let currentWhitelist = [];
    const btnSalvar = document.getElementById('btn-salvar');

    // =============================================
    // STATUS BADGES
    // =============================================
    
    function atualizarStatusSeguranca() {
        const statusApiBadge = document.getElementById('status-api-badge');
        const statusModoBadge = document.getElementById('status-modo-badge');
        const statusConsentBadge = document.getElementById('status-consent-badge');
        if (!statusApiBadge && !statusModoBadge && !statusConsentBadge) return;
        
        smStorageSessionGet({ apiKey: '' }, (sess) => {
        smStorageLocalGet({ modoLeituraGlobal: false, languageToolConsent: false }, (res) => {
        res.apiKey = sess.apiKey || '';
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
            if (statusConsentBadge) {
                if (res.languageToolConsent === false) {
                    statusConsentBadge.textContent = 'Local apenas';
                    statusConsentBadge.className = 'seguranca-status-value api-off';
                } else {
                    statusConsentBadge.textContent = 'Permitida';
                    statusConsentBadge.className = 'seguranca-status-value modo-normal';
                }
            }
        }); // fecha local.get
        }); // fecha session.get
    }
    
    // =============================================
    // TESTAR API
    // =============================================
    
    function configurarTesteApi() {
        if (!btnTestarApi) return;
        
        btnTestarApi.addEventListener('click', async () => {
            const key = elApiKey?.value?.trim() || '';
            const url = 'https://api.languagetool.org/v2/check';
            
            if (statusApi) {
                statusApi.textContent = '⏳ Testando...';
                statusApi.style.color = '#f59e0b';
            }
            if (detalhesApi) detalhesApi.style.display = 'none';
            
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
                    
                    if (statusApi) {
                        statusApi.textContent = '✅ Conectado!';
                        statusApi.style.color = '#28a745';
                    }
                    if (detalhesApi) detalhesApi.style.display = 'block';
                    if (apiInfo) apiInfo.textContent = `Idioma: ${data.language?.name || 'OK'} | api.languagetool.org`;
                    
                    smStorageSessionSet({ apiKey: key }, atualizarStatusSeguranca);
                } else {
                    throw new Error(`HTTP ${resp.status}`);
                }
            } catch (err) {
                if (statusApi) {
                    statusApi.textContent = '❌ ' + err.message;
                    statusApi.style.color = '#e53e3e';
                }
                if (detalhesApi) detalhesApi.style.display = 'none';
            }
        });
    }
    
    function configurarVisibilidadeApi() {
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
    }
    
    // =============================================
    // MODO LEITURA (SITES)
    // =============================================
    
    function renderizarModoLeitura() {
        if (!modoLeituraUl) return;
        
        modoLeituraUl.replaceChildren();
        
        currentModoLeitura.forEach((domain, index) => {
            const texto = smCriarElemento('span', {
                className: 'item-text',
                textContent: domain
            });
            const badge = smCriarElemento('span', {
                textContent: 'Leitura',
                style: 'font-size:10px;background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:10px;margin-right:10px;'
            });
            const remover = smCriarElemento('button', {
                className: 'btn-remove',
                textContent: 'x',
                dataset: { index }
            });
            const actions = smCriarElemento('div', { className: 'action-btns' }, [badge, remover]);
            const li = smCriarElemento('li', {}, [texto, actions]);
            modoLeituraUl.appendChild(li);
        });
        
        modoLeituraUl.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                currentModoLeitura.splice(idx, 1);
                salvarListaStorage(currentModoLeitura, 'modoLeituraSites');
            });
        });
    }
    
    function configurarModoLeitura() {
        if (btnAddModoLeitura) {
            btnAddModoLeitura.addEventListener('click', () => {
                const domain = normalizarDominio(modoLeituraInput.value);
                if (domain && !currentModoLeitura.includes(domain)) {
                    if (!isValidDomain(domain)) {
                        mostrarNotificacao('⚠️ Informe um domínio válido', 'warning');
                        return;
                    }
                    currentModoLeitura.unshift(domain);
                    modoLeituraInput.value = '';
                    salvarListaStorage(currentModoLeitura, 'modoLeituraSites', renderizarModoLeitura);
                }
            });
            adicionarEnterListener(modoLeituraInput, () => btnAddModoLeitura.click());
        }
    }
    
    // =============================================
    // WHITELIST
    // =============================================
    
    function renderizarWhitelist() {
        if (!whitelistUl) return;
        
        whitelistUl.replaceChildren();
        
        currentWhitelist.forEach((domain, index) => {
            const texto = smCriarElemento('span', {
                className: 'item-text',
                textContent: domain
            });
            const badge = smCriarElemento('span', {
                textContent: 'Permitido',
                style: 'font-size:10px;background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;margin-right:10px;'
            });
            const remover = smCriarElemento('button', {
                className: 'btn-remove',
                textContent: 'x',
                dataset: { index }
            });
            const actions = smCriarElemento('div', { className: 'action-btns' }, [badge, remover]);
            const li = smCriarElemento('li', {}, [texto, actions]);
            whitelistUl.appendChild(li);
        });
        
        whitelistUl.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-index'));
                currentWhitelist.splice(idx, 1);
                salvarListaStorage(currentWhitelist, 'whitelist', renderizarWhitelist);
            });
        });
    }
    
    function configurarWhitelist() {
        if (btnAddWhitelist) {
            btnAddWhitelist.addEventListener('click', () => {
                const domain = normalizarDominio(whitelistInput.value);
                if (domain && !currentWhitelist.includes(domain)) {
                    if (!isValidDomain(domain)) {
                        mostrarNotificacao('⚠️ Informe um domínio válido', 'warning');
                        return;
                    }
                    currentWhitelist.unshift(domain);
                    whitelistInput.value = '';
                    salvarListaStorage(currentWhitelist, 'whitelist', renderizarWhitelist);
                }
            });
            adicionarEnterListener(whitelistInput, () => btnAddWhitelist.click());
        }
    }
    
    // =============================================
    // SALVAR CONFIGURAÇÕES
    // =============================================
    
    function configurarSalvar() {
        if (!btnSalvar) return;

        btnSalvar.addEventListener('click', () => {
            const apiKey = elApiKey?.value?.trim() || '';

            // apiKey fica em session storage (nao persiste entre sessoes)
            smStorageSessionSet({ apiKey }, () => {
                smStorageLocalSet({
                    modoConfirmacao: elModoConfirmacao?.checked || false,
                    modoLeituraGlobal: elModoLeituraGlobal?.checked || false,
                    languageToolConsent: elLanguageToolConsent?.checked ?? false,
                    modoFoco: elModoFoco?.checked || false,
                    modoAprendizado: elModoAprendizado?.checked || false,
                    modoWhitelist: elModoWhitelist?.checked || false
                }, () => {
                    mostrarNotificacao('✓ Guardado com sucesso!', 'success');
                    atualizarStatusSeguranca();
                });
            });
        });
    }
    
    // =============================================
    // EVENTOS EM TEMPO REAL
    // =============================================
    
    function configurarEventosRealtime() {
        if (elModoConfirmacao) {
            elModoConfirmacao.addEventListener('change', (e) => {
                smStorageLocalSet({ modoConfirmacao: e.target.checked });
            });
        }
        
        if (elModoLeituraGlobal) {
            elModoLeituraGlobal.addEventListener('change', (e) => {
                smStorageLocalSet({ modoLeituraGlobal: e.target.checked }, atualizarStatusSeguranca);
            });
        }

        if (elLanguageToolConsent) {
            elLanguageToolConsent.addEventListener('change', (e) => {
                smStorageLocalSet({ languageToolConsent: e.target.checked }, atualizarStatusSeguranca);
            });
        }
        
        if (elModoFoco) {
            elModoFoco.addEventListener('change', (e) => {
                smStorageLocalSet({ modoFoco: e.target.checked });
            });
        }
        
        if (elModoAprendizado) {
            elModoAprendizado.addEventListener('change', (e) => {
                smStorageLocalSet({ modoAprendizado: e.target.checked });
            });
        }
        
        if (elModoWhitelist) {
            elModoWhitelist.addEventListener('change', (e) => {
                smStorageLocalSet({ modoWhitelist: e.target.checked });
            });
        }
    }
    
    // =============================================
    // CARREGAR CONFIGURAÇÕES INICIAIS
    // =============================================
    
    function carregarConfiguracoesIniciais() {
        smStorageSessionGet({ apiKey: '' }, (sess) => {
        smStorageLocalGet({
            modoConfirmacao: false,
            modoLeituraGlobal: false,
            languageToolConsent: false,
            modoLeituraSites: [],
            modoWhitelist: false,
            whitelist: [],
            modoFoco: false,
            modoAprendizado: false
        }, (res) => {
            if (elApiKey) elApiKey.value = sess.apiKey || '';
            if (elModoConfirmacao) elModoConfirmacao.checked = res.modoConfirmacao || false;
            if (elModoLeituraGlobal) elModoLeituraGlobal.checked = res.modoLeituraGlobal || false;
            if (elLanguageToolConsent) elLanguageToolConsent.checked = !!res.languageToolConsent;
            if (elModoFoco) elModoFoco.checked = res.modoFoco || false;
            if (elModoAprendizado) elModoAprendizado.checked = res.modoAprendizado || false;
            if (elModoWhitelist) elModoWhitelist.checked = res.modoWhitelist || false;

            currentModoLeitura = res.modoLeituraSites || [];
            renderizarModoLeitura();

            currentWhitelist = res.whitelist || [];
            renderizarWhitelist();

            atualizarStatusSeguranca();
        }); // fecha local.get
        }); // fecha session.get
    }
    
    // =============================================
    // STORAGE LISTENER
    // =============================================
    
    function configurarStorageListener() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace !== 'local') return;
            
            if (changes.modoLeituraSites) {
                currentModoLeitura = changes.modoLeituraSites.newValue || [];
                renderizarModoLeitura();
            }
            
            if (changes.whitelist) {
                currentWhitelist = changes.whitelist.newValue || [];
                renderizarWhitelist();
            }
            
            if (changes.modoConfirmacao && elModoConfirmacao) {
                elModoConfirmacao.checked = changes.modoConfirmacao.newValue;
            }
            
            if (changes.modoLeituraGlobal && elModoLeituraGlobal) {
                elModoLeituraGlobal.checked = changes.modoLeituraGlobal.newValue;
            }

            if (changes.languageToolConsent && elLanguageToolConsent) {
                elLanguageToolConsent.checked = !!changes.languageToolConsent.newValue;
            }
            
            if (changes.modoFoco && elModoFoco) {
                elModoFoco.checked = changes.modoFoco.newValue;
            }
            
            if (changes.modoAprendizado && elModoAprendizado) {
                elModoAprendizado.checked = changes.modoAprendizado.newValue;
            }
            
            if (changes.modoWhitelist && elModoWhitelist) {
                elModoWhitelist.checked = changes.modoWhitelist.newValue;
            }
            
            if (changes.apiKey || changes.modoLeituraGlobal || changes.languageToolConsent) {
                atualizarStatusSeguranca();
            }
        });
    }
    
    // =============================================
    // INICIALIZAR
    // =============================================
    
    function iniciarPaginaSeguranca() {
        carregarConfiguracoesIniciais();
        configurarEventosRealtime();
        configurarSalvar();
        configurarTesteApi();
        configurarVisibilidadeApi();
        configurarModoLeitura();
        configurarWhitelist();
        configurarStorageListener();
        carregarTema();
    }
    
    iniciarPaginaSeguranca();
}
