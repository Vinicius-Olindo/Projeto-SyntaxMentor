// =============================================
// SyntaxMentor - options-geral.js v2.7.1
// Lógica da página de configurações gerais
// =============================================

// Verificar se está na página correta
if (document.body.classList.contains('geral-page')) {
    
    // =============================================
    // ELEMENTOS DOM
    // =============================================
    const elLanguage = document.getElementById('language');
    const elPickyMode = document.getElementById('pickyMode');
    const elDarkMode = document.getElementById('darkMode');
    const elAutoHideBubble = document.getElementById('autoHideBubble');
    const elSpeedOptions = document.querySelectorAll('input[name="speed"]');
    const btnSalvar = document.getElementById('btn-salvar');
    
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
    // STATUS BADGES
    // =============================================
    
    function atualizarStatusGeral() {
        const statusIdiomaBadge = document.getElementById('status-idioma-badge');
        const statusSpeedBadge = document.getElementById('status-speed-badge');
        const statusPickyBadge = document.getElementById('status-picky-badge');
        const statusDicBadge = document.getElementById('status-dic-badge');
        const blacklistCount = document.getElementById('blacklist-count');
        const dicCount = document.getElementById('dic-count');
        
        if (!statusIdiomaBadge) return;
        
        chrome.storage.local.get({ 
            language: 'pt-BR', 
            speed: '500', 
            pickyMode: true, 
            dicionario_pessoal: [], 
            blacklist: [] 
        }, (res) => {
            const nomesIdiomas = { 
                'pt-BR': 'Português (Brasil)', 
                'en-US': 'English (US)', 
                'es': 'Español', 
                'fr': 'Français', 
                'de': 'Deutsch', 
                'it': 'Italiano' 
            };
            
            const nomesVelocidade = { 
                '300': '🚀 Rápido', 
                '500': '⚖️ Equilibrado', 
                '1000': '🐢 Leve' 
            };
            
            if (statusIdiomaBadge) statusIdiomaBadge.textContent = nomesIdiomas[res.language] || res.language;
            if (statusSpeedBadge) statusSpeedBadge.textContent = nomesVelocidade[res.speed] || res.speed + 'ms';
            if (statusPickyBadge) statusPickyBadge.textContent = res.pickyMode ? '✅ Picky Ativado' : 'Padrão';
            if (statusDicBadge) statusDicBadge.textContent = (res.dicionario_pessoal || []).length + ' palavras';
            if (blacklistCount) blacklistCount.textContent = (res.blacklist || []).length;
            if (dicCount) dicCount.textContent = (res.dicionario_pessoal || []).length;
        });
    }
    
    // =============================================
    // BLACKLIST
    // =============================================
    
    function renderizarBlacklist() {
        if (!blacklistUl) return;
        
        blacklistUl.innerHTML = '';
        
        if (currentBlacklist.length === 0) {
            blacklistUl.innerHTML = '<li style="color:#9ca3af;text-align:center;padding:10px;">Nenhum site bloqueado</li>';
            return;
        }
        
        currentBlacklist.forEach((domain, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="item-text">${escapeHtml(domain)}</span>
                <input type="text" class="edit-input" value="${escapeHtml(domain)}" style="display:none;">
                <div class="action-btns">
                    <button class="btn-edit" data-index="${index}" title="Editar">✏️</button>
                    <button class="btn-remove" data-index="${index}" title="Remover">✕</button>
                </div>
            `;
            blacklistUl.appendChild(li);
        });
        
        adicionarOuvintesLista(blacklistUl, currentBlacklist, 'blacklist');
        atualizarStatusGeral();
    }
    
    // =============================================
    // DICIONÁRIO
    // =============================================
    
    function renderizarDicionario() {
        if (!dictionaryUl) return;
        
        dictionaryUl.innerHTML = '';
        
        if (currentDictionary.length === 0) {
            dictionaryUl.innerHTML = '<li style="color:#9ca3af;text-align:center;padding:10px;">Nenhuma palavra adicionada</li>';
            return;
        }
        
        currentDictionary.forEach((word, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span class="item-text">${escapeHtml(word)}</span>
                <input type="text" class="edit-input" value="${escapeHtml(word)}" style="display:none;">
                <div class="action-btns">
                    <button class="btn-edit" data-index="${index}" title="Editar">✏️</button>
                    <button class="btn-remove" data-index="${index}" title="Remover">✕</button>
                </div>
            `;
            dictionaryUl.appendChild(li);
        });
        
        adicionarOuvintesLista(dictionaryUl, currentDictionary, 'dicionario_pessoal');
        atualizarStatusGeral();
    }
    
    // =============================================
    // FUNÇÃO COMPARTILHADA DE OUVINTES
    // =============================================
    
    function adicionarOuvintesLista(listaUl, arrayAtual, storageKey) {
        // Botões remover
        listaUl.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.target.getAttribute('data-index'));
                if (idx >= 0 && idx < arrayAtual.length) {
                    const removido = arrayAtual[idx];
                    arrayAtual.splice(idx, 1);
                    salvarListaStorage(arrayAtual, storageKey, () => {
                        mostrarNotificacao(`🗑️ "${removido}" removido`, 'info');
                        atualizarStatusGeral();
                    });
                }
            });
        });
        
        // Botões editar
        listaUl.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.target.getAttribute('data-index'));
                const li = e.target.closest('li');
                const span = li.querySelector('.item-text');
                const input = li.querySelector('.edit-input');
                
                if (!input || !span) return;
                
                if (input.style.display === 'none') {
                    span.style.display = 'none';
                    input.style.display = 'block';
                    input.focus();
                    input.select();
                    e.target.textContent = '✓';
                    e.target.style.color = '#28a745';
                } else {
                    salvarEdicaoInline(li, idx, arrayAtual, storageKey);
                }
            });
        });
        
        // Inputs de edição
        listaUl.querySelectorAll('.edit-input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const li = e.target.closest('li');
                    const idx = parseInt(li.querySelector('.btn-edit').getAttribute('data-index'));
                    salvarEdicaoInline(li, idx, arrayAtual, storageKey);
                }
            });
            
            input.addEventListener('blur', () => {
                const li = input.closest('li');
                if (!li) return;
                setTimeout(() => {
                    const editInput = li.querySelector('.edit-input');
                    if (editInput && editInput.style.display !== 'none') {
                        const idx = parseInt(li.querySelector('.btn-edit').getAttribute('data-index'));
                        salvarEdicaoInline(li, idx, arrayAtual, storageKey);
                    }
                }, 150);
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const li = e.target.closest('li');
                    const span = li.querySelector('.item-text');
                    const btnEdit = li.querySelector('.btn-edit');
                    span.style.display = 'block';
                    input.style.display = 'none';
                    input.value = span.textContent;
                    btnEdit.textContent = '✏️';
                    btnEdit.style.color = '#6f42c1';
                }
            });
        });
    }
    
    function salvarEdicaoInline(li, idx, arrayAtual, storageKey) {
        const span = li.querySelector('.item-text');
        const input = li.querySelector('.edit-input');
        const btnEdit = li.querySelector('.btn-edit');
        
        if (!span || !input || !btnEdit) return;
        
        const novoValor = input.value.trim().toLowerCase();
        span.style.display = 'block';
        input.style.display = 'none';
        btnEdit.textContent = '✏️';
        btnEdit.style.color = '#6f42c1';
        
        if (novoValor && novoValor !== arrayAtual[idx]) {
            const duplicata = arrayAtual.some((item, i) => i !== idx && item === novoValor);
            if (duplicata) {
                mostrarNotificacao('⚠️ Este item já existe na lista', 'info');
                input.value = arrayAtual[idx];
                return;
            }
            
            arrayAtual[idx] = novoValor;
            span.textContent = novoValor;
            salvarListaStorage(arrayAtual, storageKey, () => {
                mostrarNotificacao('✅ Atualizado com sucesso', 'success');
                atualizarStatusGeral();
            });
        } else if (!novoValor) {
            input.value = arrayAtual[idx];
            mostrarNotificacao('⚠️ O valor não pode estar vazio', 'info');
        }
    }
    
    // =============================================
    // ATALHOS DE TECLADO (COMPLETO)
    // =============================================

    function iniciarGravacao(botaoElement, configKey) {
        if (activeBtn) cancelarGravacao();
        recordingTarget = configKey;
        activeBtn = botaoElement;
        activeBtn.textContent = "Pressione a tecla...";
        activeBtn.classList.add('gravando');
    }

    function cancelarGravacao() {
        if (!activeBtn) return;
        
        const btnLocal = activeBtn;
        const targetLocal = recordingTarget;
        
        btnLocal.classList.remove('gravando');
        
        chrome.storage.local.get(targetLocal, (res) => {
            if (res[targetLocal]) btnLocal.textContent = res[targetLocal].display;
        });
        
        recordingTarget = null;
        activeBtn = null;
    }

    function configurarGravacaoAtalhos() {
        const btnGravarToggle = document.getElementById('btn-gravar-atalho');
        const btnGravarIgnore = document.getElementById('btn-gravar-ignorar');
        const btnGravarCorrigirTudo = document.getElementById('btn-gravar-corrigir-tudo');
        const btnGravarAtivar = document.getElementById('btn-gravar-ativar');
        const btnGravarDesativar = document.getElementById('btn-gravar-desativar');
        
        if (btnGravarToggle) {
            btnGravarToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                iniciarGravacao(btnGravarToggle, 'toggleShortcut');
            });
        }
        
        if (btnGravarIgnore) {
            btnGravarIgnore.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                iniciarGravacao(btnGravarIgnore, 'ignoreShortcut');
            });
        }
        
        if (btnGravarCorrigirTudo) {
            btnGravarCorrigirTudo.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                iniciarGravacao(btnGravarCorrigirTudo, 'corrigirTudoShortcut');
            });
        }
        
        if (btnGravarAtivar) {
            btnGravarAtivar.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                iniciarGravacao(btnGravarAtivar, 'ativarShortcut');
            });
        }
        
        if (btnGravarDesativar) {
            btnGravarDesativar.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                iniciarGravacao(btnGravarDesativar, 'desativarShortcut');
            });
        }
        
        document.addEventListener('keydown', (e) => {
            if (!recordingTarget) return;
            if (['Control', 'Alt', 'Shift', 'Meta', 'Escape'].includes(e.key)) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const partes = [];
            if (e.ctrlKey) partes.push('Ctrl');
            if (e.altKey) partes.push('Alt');
            if (e.shiftKey) partes.push('Shift');
            partes.push(e.key.toUpperCase());
            
            const shortcut = {
                altKey: e.altKey,
                ctrlKey: e.ctrlKey,
                shiftKey: e.shiftKey,
                key: e.key.toLowerCase(),
                display: partes.join(' + ')
            };
            
            if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
                shortcut.altKey = true;
                shortcut.ctrlKey = false;
                shortcut.shiftKey = false;
                shortcut.display = 'Alt + ' + e.key.toUpperCase();
            }
            
            chrome.storage.local.set({ [recordingTarget]: shortcut }, () => {
                if (activeBtn) {
                    activeBtn.textContent = shortcut.display;
                    activeBtn.classList.remove('gravando');
                }
                mostrarNotificacao(`✅ Atalho gravado: ${shortcut.display}`, 'success');
                recordingTarget = null;
                activeBtn = null;
            });
        });
        
        document.addEventListener('click', (e) => {
            if (recordingTarget && activeBtn && e.target !== activeBtn) {
                cancelarGravacao();
            }
        });
    }

    // Carregar configurações dos atalhos
    function carregarAtalhos() {
        const btnGravarToggle = document.getElementById('btn-gravar-atalho');
        const btnGravarIgnore = document.getElementById('btn-gravar-ignorar');
        const btnGravarCorrigirTudo = document.getElementById('btn-gravar-corrigir-tudo');
        const btnGravarAtivar = document.getElementById('btn-gravar-ativar');
        const btnGravarDesativar = document.getElementById('btn-gravar-desativar');
        
        chrome.storage.local.get({
            toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's', display: 'Alt + S' },
            ignoreShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 'i', display: 'Alt + I' },
            corrigirTudoShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 's', display: 'Alt + Shift + S' },
            ativarShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 'a', display: 'Alt + Shift + A' },
            desativarShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 'd', display: 'Alt + Shift + D' }
        }, (res) => {
            if (btnGravarToggle) btnGravarToggle.textContent = res.toggleShortcut.display;
            if (btnGravarIgnore) btnGravarIgnore.textContent = res.ignoreShortcut.display;
            if (btnGravarCorrigirTudo) btnGravarCorrigirTudo.textContent = res.corrigirTudoShortcut.display;
            if (btnGravarAtivar) btnGravarAtivar.textContent = res.ativarShortcut.display;
            if (btnGravarDesativar) btnGravarDesativar.textContent = res.desativarShortcut.display;
        });
    }
    
    // =============================================
    // BACKUP (EXPORTAR/IMPORTAR)
    // =============================================
    
    function configurarBackup() {
        if (btnExportar) {
            btnExportar.addEventListener('click', () => {
                mostrarNotificacao('⏳ A gerar backup...', 'info');
                
                chrome.storage.local.get(null, (dados) => {
                    delete dados.apiKey;
                    delete dados.dataInstalacao;
                    
                    const jsonStr = JSON.stringify({
                        versao: '2.7.1',
                        data: new Date().toISOString(),
                        dados
                    }, null, 2);
                    
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    
                    a.href = url;
                    a.download = `syntaxmentor-backup-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    mostrarNotificacao('✅ Backup exportado com sucesso!', 'success');
                });
            });
        }
        
        if (btnImportar && inputImportar) {
            btnImportar.addEventListener('click', () => inputImportar.click());
            
            inputImportar.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                const ext = file.name.split('.').pop().toLowerCase();
                if (ext !== 'json' && ext !== 'txt') {
                    mostrarNotificacao('❌ Formato inválido. Use .txt ou .json', 'error');
                    inputImportar.value = '';
                    return;
                }
                
                if (file.size > 10 * 1024 * 1024) {
                    mostrarNotificacao('❌ Ficheiro muito grande. Máximo: 10MB', 'error');
                    inputImportar.value = '';
                    return;
                }
                
                mostrarNotificacao('⏳ A preparar importação...', 'info');
                
                const reader = new FileReader();
                
                reader.onerror = () => {
                    mostrarNotificacao('❌ Erro ao ler o ficheiro', 'error');
                    inputImportar.value = '';
                };
                
                reader.onload = (event) => {
                    try {
                        const conteudo = event.target.result;
                        let palavrasImportadas = [];
                        let blacklistImportada = [];
                        let idiomaImportado = null;
                        
                        if (ext === 'txt') {
                            palavrasImportadas = conteudo.split(/\r?\n/)
                                .map(l => l.trim().toLowerCase())
                                .filter(l => l.length > 0 && !l.startsWith('#') && !l.startsWith('//'));
                        } else {
                            let backup;
                            try {
                                backup = JSON.parse(conteudo);
                            } catch (err) {
                                mostrarNotificacao('❌ JSON inválido', 'error');
                                inputImportar.value = '';
                                return;
                            }
                            
                            const fonte = backup.dados || backup;
                            palavrasImportadas = Array.isArray(fonte.dicionario_pessoal) ? fonte.dicionario_pessoal : [];
                            blacklistImportada = Array.isArray(fonte.blacklist) ? fonte.blacklist : [];
                            if (fonte.language) idiomaImportado = fonte.language;
                        }
                        
                        chrome.storage.local.get(['dicionario_pessoal', 'blacklist', 'language'], (res) => {
                            const dicFinal = [...(res.dicionario_pessoal || [])];
                            const blackFinal = [...(res.blacklist || [])];
                            
                            let novasPalavras = 0, duplicadasPalavras = 0;
                            let novosSites = 0, duplicadosSites = 0;
                            
                            palavrasImportadas.forEach(p => {
                                if (!dicFinal.includes(p)) {
                                    dicFinal.push(p);
                                    novasPalavras++;
                                } else {
                                    duplicadasPalavras++;
                                }
                            });
                            
                            blacklistImportada.forEach(s => {
                                if (!blackFinal.includes(s)) {
                                    blackFinal.push(s);
                                    novosSites++;
                                } else {
                                    duplicadosSites++;
                                }
                            });
                            
                            let msg = "📊 Resumo da Importação:\n\n";
                            if (novasPalavras > 0 || duplicadasPalavras > 0) {
                                msg += `📖 Dicionário: ➕${novasPalavras} novas, ⏭️${duplicadasPalavras} duplicadas\n\n`;
                            }
                            if (novosSites > 0 || duplicadosSites > 0) {
                                msg += `🚫 Blacklist: ➕${novosSites} novos, ⏭️${duplicadosSites} duplicados\n\n`;
                            }
                            msg += "Deseja confirmar?";
                            
                            if (!window.confirm(msg)) {
                                mostrarNotificacao('❌ Importação cancelada', 'info');
                                inputImportar.value = '';
                                return;
                            }
                            
                            const dadosParaSalvar = {
                                dicionario_pessoal: dicFinal,
                                blacklist: blackFinal
                            };
                            
                            if (idiomaImportado) dadosParaSalvar.language = idiomaImportado;
                            
                            chrome.storage.local.set(dadosParaSalvar, () => {
                                if (chrome.runtime.lastError) {
                                    mostrarNotificacao('❌ Erro ao guardar', 'error');
                                    return;
                                }
                                
                                mostrarNotificacao('✅ Importação concluída!', 'success');
                                currentDictionary = dicFinal;
                                currentBlacklist = blackFinal;
                                renderizarDicionario();
                                renderizarBlacklist();
                                if (idiomaImportado && elLanguage) elLanguage.value = idiomaImportado;
                                atualizarStatusGeral();
                                inputImportar.value = '';
                            });
                        });
                    } catch (err) {
                        mostrarNotificacao('❌ Erro ao processar', 'error');
                        inputImportar.value = '';
                    }
                };
                
                reader.readAsText(file);
            });
        }
    }
    
    // =============================================
    // SALVAR CONFIGURAÇÕES
    // =============================================
    
    function configurarSalvar() {
        if (!btnSalvar) return;
        
        btnSalvar.addEventListener('click', () => {
            let selectedSpeed = '500';
            elSpeedOptions.forEach(opt => {
                if (opt.checked) selectedSpeed = opt.value;
            });
            
            chrome.storage.local.set({
                language: elLanguage?.value || 'pt-BR',
                pickyMode: elPickyMode?.checked ?? true,
                speed: selectedSpeed,
                autoHideBubble: elAutoHideBubble?.checked || false
            }, () => {
                mostrarNotificacao('✓ Guardado com sucesso!', 'success');
                atualizarStatusGeral();
            });
        });
    }
    
    // =============================================
    // EVENTOS EM TEMPO REAL
    // =============================================
    
    function configurarEventosRealtime() {
        if (elDarkMode) {
            elDarkMode.addEventListener('change', (e) => {
                document.body.classList.toggle('dark-mode', e.target.checked);
                chrome.storage.local.set({ darkMode: e.target.checked });
            });
        }
        
        if (elAutoHideBubble) {
            elAutoHideBubble.addEventListener('change', (e) => {
                chrome.storage.local.set({ autoHideBubble: e.target.checked });
            });
        }
        
        if (btnAddBlacklist) {
            btnAddBlacklist.addEventListener('click', () => {
                const domain = blacklistInput.value.trim().toLowerCase();
                if (!domain) return;
                
                if (!currentBlacklist.includes(domain)) {
                    currentBlacklist.unshift(domain);
                    blacklistInput.value = '';
                    salvarListaStorage(currentBlacklist, 'blacklist', () => {
                        renderizarBlacklist();
                        mostrarNotificacao(`🚫 "${domain}" bloqueado`, 'success');
                        atualizarStatusGeral();
                    });
                } else {
                    mostrarNotificacao('⚠️ Este site já está na lista', 'info');
                    blacklistInput.value = '';
                }
            });
            adicionarEnterListener(blacklistInput, () => btnAddBlacklist.click());
        }
        
        if (btnClearBlacklist) {
            btnClearBlacklist.addEventListener('click', () => {
                if (currentBlacklist.length === 0) {
                    mostrarNotificacao('📭 A lista de sites já está vazia.', 'info');
                    return;
                }
                
                if (confirm(`⚠️ Tem certeza que deseja remover TODOS os ${currentBlacklist.length} sites bloqueados?\n\nEsta ação não pode ser desfeita.`)) {
                    currentBlacklist = [];
                    salvarListaStorage(currentBlacklist, 'blacklist', () => {
                        renderizarBlacklist();
                        mostrarNotificacao('🗑️ Todos os sites foram removidos!', 'success');
                        atualizarStatusGeral();
                    });
                }
            });
        }
        
        if (btnAddDictionary) {
            btnAddDictionary.addEventListener('click', () => {
                const word = dictionaryInput.value.trim().toLowerCase();
                if (!word) return;
                
                if (!currentDictionary.includes(word)) {
                    currentDictionary.unshift(word);
                    dictionaryInput.value = '';
                    salvarListaStorage(currentDictionary, 'dicionario_pessoal', () => {
                        renderizarDicionario();
                        mostrarNotificacao(`✨ "${word}" adicionado`, 'success');
                        atualizarStatusGeral();
                    });
                } else {
                    mostrarNotificacao('⚠️ Esta palavra já existe no dicionário', 'info');
                    dictionaryInput.value = '';
                }
            });
            adicionarEnterListener(dictionaryInput, () => btnAddDictionary.click());
        }
        
        if (btnClearDictionary) {
            btnClearDictionary.addEventListener('click', () => {
                if (currentDictionary.length === 0) {
                    mostrarNotificacao('📭 O dicionário já está vazio.', 'info');
                    return;
                }
                
                if (confirm(`⚠️ Tem certeza que deseja remover TODAS as ${currentDictionary.length} palavras do dicionário?\n\nEsta ação não pode ser desfeita.`)) {
                    currentDictionary = [];
                    salvarListaStorage(currentDictionary, 'dicionario_pessoal', () => {
                        renderizarDicionario();
                        mostrarNotificacao('🗑️ Todas as palavras foram removidas!', 'success');
                        atualizarStatusGeral();
                    });
                }
            });
        }
    }
    
    // =============================================
    // CARREGAR CONFIGURAÇÕES INICIAIS
    // =============================================
    
    function carregarConfiguracoesIniciais() {
        chrome.storage.local.get({
            language: 'pt-BR',
            pickyMode: true,
            darkMode: false,
            autoHideBubble: false,
            speed: '500',
            blacklist: [],
            dicionario_pessoal: [],
            toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's', display: 'Alt + S' },
            ignoreShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 'i', display: 'Alt + I' },
            corrigirTudoShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 's', display: 'Alt + Shift + S' },
            ativarShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 'a', display: 'Alt + Shift + A' },
            desativarShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 'd', display: 'Alt + Shift + D' }
        }, (res) => {
            if (elLanguage) elLanguage.value = res.language;
            if (elPickyMode) elPickyMode.checked = res.pickyMode;
            if (elDarkMode) {
                elDarkMode.checked = res.darkMode;
                document.body.classList.toggle('dark-mode', res.darkMode);
            }
            if (elAutoHideBubble) elAutoHideBubble.checked = res.autoHideBubble || false;
            
            elSpeedOptions.forEach(opt => {
                if (opt.value === res.speed.toString()) opt.checked = true;
            });
            
            currentBlacklist = res.blacklist;
            renderizarBlacklist();
            
            currentDictionary = res.dicionario_pessoal;
            renderizarDicionario();
            
            const btnGravarAtivar = document.getElementById('btn-gravar-ativar');
            const btnGravarDesativar = document.getElementById('btn-gravar-desativar');
            if (btnGravarToggle) btnGravarToggle.textContent = res.toggleShortcut.display;
            if (btnGravarIgnore) btnGravarIgnore.textContent = res.ignoreShortcut.display;
            if (btnGravarCorrigirTudo) btnGravarCorrigirTudo.textContent = res.corrigirTudoShortcut.display;
            if (btnGravarAtivar) btnGravarAtivar.textContent = res.ativarShortcut.display;
            if (btnGravarDesativar) btnGravarDesativar.textContent = res.desativarShortcut.display;
            
            atualizarStatusGeral();
        });
    }
    
    // =============================================
    // STORAGE LISTENER
    // =============================================
    
    function configurarStorageListener() {
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace !== 'local') return;
            
            if (changes.dicionario_pessoal) {
                currentDictionary = changes.dicionario_pessoal.newValue || [];
                renderizarDicionario();
            }
            
            if (changes.blacklist) {
                currentBlacklist = changes.blacklist.newValue || [];
                renderizarBlacklist();
            }
            
            if (changes.darkMode && elDarkMode) {
                elDarkMode.checked = changes.darkMode.newValue;
                document.body.classList.toggle('dark-mode', changes.darkMode.newValue);
            }
            
            if (changes.language || changes.speed || changes.pickyMode || changes.dicionario_pessoal || changes.blacklist) {
                atualizarStatusGeral();
            }
        });
    }

    // Dentro da função carregarConfiguracoesIniciais ou similar
    // Adicione esta informação na seção de atalhos

    function adicionarInfoAtalhosSite() {
        const atalhosContainer = document.querySelector('.card-atalhos');
        if (!atalhosContainer) return;
        
        const infoHtml = `
            <hr class="divisor">
            <div style="margin-top: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span class="atalho-title">🎯 Ativar no site atual</span>
                    <kbd class="tecla-kbd">Alt + Shift + A</kbd>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="atalho-title">⛔ Desativar no site atual</span>
                    <kbd class="tecla-kbd">Alt + Shift + D</kbd>
                </div>
                <p class="desc" style="margin-top: 8px; font-size: 11px;">
                    Use esses atalhos para ativar ou desativar o SyntaxMentor rapidamente no site que você está visitando.
                </p>
            </div>
        `;
        
        atalhosContainer.insertAdjacentHTML('beforeend', infoHtml);
    }

    // Chamar a função depois de carregar as configurações
    
    // =============================================
    // INICIALIZAR
    // =============================================
    
    function iniciarPaginaGeral() {
        // Migração: corrigir atalhos gravados sem modificador onde altKey ficou false
        const keysAtalhos = ['toggleShortcut','ignoreShortcut','corrigirTudoShortcut','ativarShortcut','desativarShortcut'];
        chrome.storage.local.get(keysAtalhos, (res) => {
            const correcoes = {};
            keysAtalhos.forEach(k => {
                const s = res[k];
                if (s && !s.altKey && !s.ctrlKey && !s.shiftKey) {
                    correcoes[k] = { ...s, altKey: true, display: 'Alt + ' + s.key.toUpperCase() };
                }
            });
            if (Object.keys(correcoes).length > 0) {
                chrome.storage.local.set(correcoes, () => carregarConfiguracoesIniciais());
            } else {
                carregarConfiguracoesIniciais();
            }
        });
        configurarEventosRealtime();
        configurarSalvar();
        configurarGravacaoAtalhos();
        configurarBackup();
        configurarStorageListener();
        carregarTema();
    }
    
    iniciarPaginaGeral();
}