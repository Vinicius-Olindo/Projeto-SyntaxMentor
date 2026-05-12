// SyntaxMentor - options.js v2.6.0 (Clear All Integration)
document.addEventListener('DOMContentLoaded', () => {

    // =============================================
    // ELEMENTOS DA INTERFACE
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
    // 1. CARREGAR CONFIGURAÇÕES
    // =============================================
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
        corrigirTudoShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 's', display: 'Alt + Shift + S' }
    }, (res) => {
        if (elLanguage) elLanguage.value = res.language;
        if (elPickyMode) elPickyMode.checked = res.pickyMode;
        if (elDarkMode) {
            elDarkMode.checked = res.darkMode;
            if (res.darkMode) document.body.classList.add('dark-mode');
        }
        if (elAutoHideBubble) elAutoHideBubble.checked = res.autoHideBubble || false;

        elSpeedOptions.forEach(opt => {
            if (opt.value === res.speed.toString()) opt.checked = true;
        });

        currentBlacklist = res.blacklist;
        renderizarBlacklist();

        currentDictionary = res.dicionario_pessoal;
        renderizarDicionario();

        if (btnGravarToggle) btnGravarToggle.textContent = res.toggleShortcut.display;
        if (btnGravarIgnore) btnGravarIgnore.textContent = res.ignoreShortcut.display;
        if (btnGravarCorrigirTudo) btnGravarCorrigirTudo.textContent = res.corrigirTudoShortcut.display;
    });

    // =============================================
    // 2. LIVE SYNC
    // =============================================
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

        if (changes.darkMode) {
            if (elDarkMode) elDarkMode.checked = changes.darkMode.newValue;
            if (changes.darkMode.newValue) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        }

        if (changes.autoHideBubble && elAutoHideBubble) {
            elAutoHideBubble.checked = changes.autoHideBubble.newValue;
        }
    });

    // =============================================
    // 3. EVENTOS EM TEMPO REAL
    // =============================================
    if (elDarkMode) {
        elDarkMode.addEventListener('change', (e) => {
            const isDark = e.target.checked;
            if (isDark) {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            chrome.storage.local.set({ darkMode: isDark });
        });
    }

    if (elAutoHideBubble) {
        elAutoHideBubble.addEventListener('change', (e) => {
            chrome.storage.local.set({ autoHideBubble: e.target.checked });
        });
    }

    // =============================================
    // 4. SALVAR CONFIGURAÇÕES GERAIS
    // =============================================
    if (btnSalvar) {
        btnSalvar.addEventListener('click', () => {
            let selectedSpeed = '500';
            elSpeedOptions.forEach(opt => {
                if (opt.checked) selectedSpeed = opt.value;
            });

            const config = {
                language: elLanguage ? elLanguage.value : 'pt-BR',
                pickyMode: elPickyMode ? elPickyMode.checked : true,
                speed: selectedSpeed,
                autoHideBubble: elAutoHideBubble ? elAutoHideBubble.checked : false
            };

            chrome.storage.local.set(config, () => {
                mostrarNotificacao('✓ Guardado com sucesso!', 'success');
            });
        });
    }

    // =============================================
    // 5. BLACKLIST E LIMPEZA
    // =============================================
    if (btnAddBlacklist) {
        btnAddBlacklist.addEventListener('click', () => {
            const domain = blacklistInput.value.trim().toLowerCase();
            if (!domain) return;

            if (!currentBlacklist.includes(domain)) {
                currentBlacklist.unshift(domain);
                blacklistInput.value = '';
                chrome.storage.local.set({ blacklist: currentBlacklist });
            } else {
                mostrarNotificacao('⚠️ Este site já está na lista', 'info');
                blacklistInput.value = '';
            }
        });

        blacklistInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                btnAddBlacklist.click();
            }
        });
    }

    // Limpar toda a Blacklist
    if (btnClearBlacklist) {
        btnClearBlacklist.addEventListener('click', () => {
            if (currentBlacklist.length === 0) {
                mostrarNotificacao('A lista de sites já está vazia.', 'info');
                return;
            }
            if (confirm(`⚠️ ATENÇÃO!\n\nTem a certeza que deseja APAGAR TODOS os ${currentBlacklist.length} sites bloqueados?\n\nEsta ação não pode ser desfeita.`)) {
                currentBlacklist = [];
                chrome.storage.local.set({ blacklist: [] }, () => {
                    renderizarBlacklist();
                    mostrarNotificacao('🗑️ Lista de sites limpa com sucesso!', 'success');
                });
            }
        });
    }

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
    }

    // =============================================
    // 6. DICIONÁRIO E LIMPEZA
    // =============================================
    if (btnAddDictionary) {
        btnAddDictionary.addEventListener('click', () => {
            const word = dictionaryInput.value.trim();
            if (!word) return;

            const wordLower = word.toLowerCase();

            if (!currentDictionary.includes(wordLower)) {
                currentDictionary.unshift(wordLower);
                dictionaryInput.value = '';
                chrome.storage.local.set({ dicionario_pessoal: currentDictionary });
            } else {
                mostrarNotificacao('⚠️ Esta palavra já existe no dicionário', 'info');
                dictionaryInput.value = '';
            }
        });

        dictionaryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                btnAddDictionary.click();
            }
        });
    }

    // Limpar todo o Dicionário
    if (btnClearDictionary) {
        btnClearDictionary.addEventListener('click', () => {
            if (currentDictionary.length === 0) {
                mostrarNotificacao('O dicionário já está vazio.', 'info');
                return;
            }
            if (confirm(`⚠️ ATENÇÃO!\n\nTem a certeza que deseja APAGAR TODAS as ${currentDictionary.length} palavras do seu dicionário?\n\nEsta ação não pode ser desfeita.`)) {
                currentDictionary = [];
                chrome.storage.local.set({ dicionario_pessoal: [] }, () => {
                    renderizarDicionario();
                    mostrarNotificacao('🗑️ Dicionário limpo com sucesso!', 'success');
                });
            }
        });
    }

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
    }

    // =============================================
    // 7. FUNÇÃO COMPARTILHADA DE OUVINTES
    // =============================================
    function adicionarOuvintesLista(listaUl, arrayAtual, storageKey) {
        listaUl.querySelectorAll('.btn-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.target.getAttribute('data-index'));
                if (idx >= 0 && idx < arrayAtual.length) {
                    const removido = arrayAtual[idx];
                    arrayAtual.splice(idx, 1);
                    chrome.storage.local.set({ [storageKey]: arrayAtual }, () => {
                        mostrarNotificacao(`🗑️ "${removido}" removido`, 'info');
                    });
                }
            });
        });

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

        listaUl.querySelectorAll('.edit-input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const li = e.target.closest('li');
                    const btnEdit = li.querySelector('.btn-edit');
                    const idx = parseInt(btnEdit.getAttribute('data-index'));
                    salvarEdicaoInline(li, idx, arrayAtual, storageKey);
                }
            });

            input.addEventListener('blur', () => {
                const li = input.closest('li');
                if (!li) return;
                setTimeout(() => {
                    const editInput = li.querySelector('.edit-input');
                    if (editInput && editInput.style.display !== 'none') {
                        const btnEdit = li.querySelector('.btn-edit');
                        const idx = parseInt(btnEdit.getAttribute('data-index'));
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

            const antigo = arrayAtual[idx];
            arrayAtual[idx] = novoValor;
            span.textContent = novoValor;
            chrome.storage.local.set({ [storageKey]: arrayAtual }, () => {
                mostrarNotificacao(`✅ Atualizado com sucesso`, 'success');
            });
        } else if (!novoValor) {
            input.value = arrayAtual[idx];
            mostrarNotificacao('⚠️ O valor não pode estar vazio', 'info');
        }
    }

    // =============================================
    // 8. GRAVAÇÃO DE ATALHOS
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
            if (res[targetLocal]) {
                btnLocal.textContent = res[targetLocal].display;
            }
        });
        recordingTarget = null;
        activeBtn = null;
    }

    if (btnGravarToggle) {
        btnGravarToggle.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            iniciarGravacao(btnGravarToggle, 'toggleShortcut');
        });
    }

    if (btnGravarIgnore) {
        btnGravarIgnore.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            iniciarGravacao(btnGravarIgnore, 'ignoreShortcut');
        });
    }

    if (btnGravarCorrigirTudo) {
        btnGravarCorrigirTudo.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            iniciarGravacao(btnGravarCorrigirTudo, 'corrigirTudoShortcut');
        });
    }

    document.addEventListener('keydown', (e) => {
        if (!recordingTarget) return;
        if (['Control', 'Alt', 'Shift', 'Meta', 'Escape'].includes(e.key)) return;

        e.preventDefault(); e.stopPropagation();

        const partes = [];
        if (e.ctrlKey) partes.push('Ctrl');
        if (e.altKey) partes.push('Alt');
        if (e.shiftKey) partes.push('Shift');
        partes.push(e.key.toUpperCase());

        const shortcut = {
            altKey: e.altKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey,
            key: e.key.toLowerCase(), display: partes.join(' + ')
        };

        if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
            shortcut.altKey = true;
            shortcut.display = "Alt + " + e.key.toUpperCase();
        }

        const updateData = {};
        updateData[recordingTarget] = shortcut;

        chrome.storage.local.set(updateData, () => {
            if (activeBtn) {
                activeBtn.textContent = shortcut.display;
                activeBtn.classList.remove('gravando');
            }
            mostrarNotificacao(`✅ Atalho gravado: ${shortcut.display}`, 'success');
            recordingTarget = null; activeBtn = null;
        });
    });

    document.addEventListener('click', (e) => {
        if (recordingTarget && activeBtn && e.target !== activeBtn) {
            cancelarGravacao();
        }
    });

    // =============================================
    // 9. EXPORTAR BACKUP
    // =============================================
    if (btnExportar) {
        btnExportar.addEventListener('click', () => {
            mostrarNotificacao('⏳ A gerar backup...', 'info');

            chrome.storage.local.get(null, (dados) => {
                const jsonStr = JSON.stringify({ dados: dados }, null, 2);
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const data = new Date().toISOString().split('T')[0];
                const nomeArquivo = `syntaxmentor-backup-${data}.json`;

                const a = document.createElement('a');
                a.href = url; a.download = nomeArquivo;
                document.body.appendChild(a); a.click();
                document.body.removeChild(a); URL.revokeObjectURL(url);

                mostrarNotificacao('✅ Backup exportado com sucesso!', 'success');
            });
        });
    }

    // =============================================
    // 10. IMPORTAR BACKUP (COM CONFIRMAÇÃO VISUAL)
    // =============================================
    if (btnImportar && inputImportar) {
        btnImportar.addEventListener('click', () => {
            inputImportar.click();
        });

        inputImportar.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const ext = file.name.split('.').pop().toLowerCase();
            if (ext !== 'json' && ext !== 'txt') {
                mostrarNotificacao('❌ Formato inválido. Use .txt ou .json', 'error');
                inputImportar.value = '';
                return;
            }

            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
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
                            mostrarNotificacao('❌ JSON inválido. Tente usar um ficheiro .txt', 'error');
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
                        
                        let novasPalavras = 0;
                        let duplicadasPalavras = 0;
                        let novosSites = 0;
                        let duplicadosSites = 0;

                        palavrasImportadas.forEach(p => {
                            if (!dicFinal.includes(p)) { dicFinal.push(p); novasPalavras++; }
                            else { duplicadasPalavras++; }
                        });
                        
                        blacklistImportada.forEach(s => {
                            if (!blackFinal.includes(s)) { blackFinal.push(s); novosSites++; }
                            else { duplicadosSites++; }
                        });

                        let msgConfirmacao = "📊 Resumo da Importação:\n\n";
                        let temAlgoNovo = false;

                        if (novasPalavras > 0 || duplicadasPalavras > 0) {
                            msgConfirmacao += `📖 Dicionário Pessoal:\n`;
                            msgConfirmacao += `   ➕ ${novasPalavras} novas palavras a adicionar.\n`;
                            if (duplicadasPalavras > 0) msgConfirmacao += `   ⏭️ ${duplicadasPalavras} palavras ignoradas (já existem).\n\n`;
                            if (novasPalavras > 0) temAlgoNovo = true;
                        }

                        if (novosSites > 0 || duplicadosSites > 0) {
                            msgConfirmacao += `🚫 Sites Ignorados:\n`;
                            msgConfirmacao += `   ➕ ${novosSites} novos sites a adicionar.\n`;
                            if (duplicadosSites > 0) msgConfirmacao += `   ⏭️ ${duplicadosSites} sites ignorados (já existem).\n\n`;
                            if (novosSites > 0) temAlgoNovo = true;
                        }

                        if (idiomaImportado && idiomaImportado !== res.language) {
                            msgConfirmacao += `🌐 Idioma: Será alterado para '${idiomaImportado}'.\n\n`;
                            temAlgoNovo = true;
                        }

                        if (!temAlgoNovo && (!idiomaImportado || idiomaImportado === res.language)) {
                            mostrarNotificacao('⚠️ O ficheiro não contém itens novos.', 'info');
                            inputImportar.value = '';
                            return;
                        }

                        msgConfirmacao += "Deseja confirmar e guardar estas alterações?";

                        const confirmar = window.confirm(msgConfirmacao);

                        if (!confirmar) {
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
                                mostrarNotificacao('❌ Erro ao guardar: ' + chrome.runtime.lastError.message, 'error');
                                return;
                            }
                            mostrarNotificacao(`✅ Alterações aplicadas com sucesso!`, 'success');
                            
                            currentDictionary = dicFinal;
                            currentBlacklist = blackFinal;
                            renderizarDicionario();
                            renderizarBlacklist();
                            if (idiomaImportado && elLanguage) elLanguage.value = idiomaImportado;
                            
                            inputImportar.value = '';
                        });
                    });

                } catch (err) {
                    mostrarNotificacao('❌ Erro ao processar ficheiro.', 'error');
                    console.error(err);
                    inputImportar.value = '';
                }
            };
            reader.readAsText(file);
        });
    }

    // =============================================
    // 11. UTILITÁRIOS
    // =============================================
    function mostrarNotificacao(mensagem, tipo) {
        if (!saveStatus) return;

        saveStatus.textContent = mensagem;
        saveStatus.style.opacity = '1';

        switch (tipo) {
            case 'success':
                saveStatus.style.color = '#28a745';
                break;
            case 'error':
                saveStatus.style.color = '#e53e3e';
                break;
            case 'info':
                saveStatus.style.color = '#6b7280';
                break;
            default:
                saveStatus.style.color = '#333';
        }

        const duracao = tipo === 'error' ? 4000 : tipo === 'success' ? 3000 : 2000;

        clearTimeout(saveStatus._timeout);
        saveStatus._timeout = setTimeout(() => {
            saveStatus.style.opacity = '0';
        }, duracao);
    }

    function escapeHtml(texto) {
        if (!texto) return '';
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }
});