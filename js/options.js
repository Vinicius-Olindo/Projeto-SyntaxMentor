// SyntaxMentor - options.js v2.5.0 (Importação Robusta + Validações)
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
                saveStatus.style.opacity = '1';
                saveStatus.style.color = '#28a745';
                saveStatus.textContent = '✓ Salvo com sucesso!';
                setTimeout(() => {
                    saveStatus.style.opacity = '0';
                }, 2000);
            });
        });
    }

    // =============================================
    // 5. BLACKLIST
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

        // Adicionar com Enter
        blacklistInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                btnAddBlacklist.click();
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
    // 6. DICIONÁRIO
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

        // Adicionar com Enter
        dictionaryInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                btnAddDictionary.click();
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
        // Remover
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

        // Editar
        listaUl.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(e.target.getAttribute('data-index'));
                const li = e.target.closest('li');
                const span = li.querySelector('.item-text');
                const input = li.querySelector('.edit-input');

                if (!input || !span) return;

                if (input.style.display === 'none') {
                    // Entrar no modo edição
                    span.style.display = 'none';
                    input.style.display = 'block';
                    input.focus();
                    input.select();
                    e.target.textContent = '✓';
                    e.target.style.color = '#28a745';
                } else {
                    // Salvar edição
                    salvarEdicaoInline(li, idx, arrayAtual, storageKey);
                }
            });
        });

        // Salvar com Enter
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

            // Salvar ao perder foco
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

            // Cancelar com Escape
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

        const novoValor = storageKey === 'blacklist'
            ? input.value.trim().toLowerCase()
            : input.value.trim().toLowerCase();

        // Voltar ao modo visualização
        span.style.display = 'block';
        input.style.display = 'none';
        btnEdit.textContent = '✏️';
        btnEdit.style.color = '#6f42c1';

        // Valida e salva
        if (novoValor && novoValor !== arrayAtual[idx]) {
            // Verifica duplicata
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
                mostrarNotificacao(`✅ "${antigo}" → "${novoValor}" atualizado`, 'success');
            });
        } else if (!novoValor) {
            // Não permite valor vazio, restaura original
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

    document.addEventListener('keydown', (e) => {
        if (!recordingTarget) return;

        // Ignora teclas modificadoras isoladas
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

        // Se não tiver nenhuma tecla modificadora, adiciona Alt por padrão
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
            recordingTarget = null;
            activeBtn = null;
        });
    });

    // Cancela gravação se clicar fora
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
            mostrarNotificacao('⏳ Gerando backup...', 'info');

            chrome.runtime.sendMessage({ action: 'exportData' }, (response) => {
                if (response && response.success) {
                    const jsonStr = JSON.stringify(response.data, null, 2);
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);

                    const data = new Date().toISOString().split('T')[0];
                    const nomeArquivo = `syntaxmentor-backup-${data}.json`;

                    const a = document.createElement('a');
                    a.href = url;
                    a.download = nomeArquivo;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);

                    const palavras = response.data.dados?.dicionario_pessoal?.length || 0;
                    const sites = response.data.dados?.blacklist?.length || 0;
                    mostrarNotificacao(`✅ Backup exportado! 📖 ${palavras} palavras, 🚫 ${sites} sites`, 'success');
                } else {
                    mostrarNotificacao('❌ Erro ao exportar backup', 'error');
                    console.error('SyntaxMentor Export:', response?.error || 'Erro desconhecido');
                }
            });
        });
    }

    // =============================================
    // 10. IMPORTAR BACKUP (VERSÃO CORRIGIDA)
    // =============================================
    if (btnImportar && inputImportar) {
        btnImportar.addEventListener('click', () => {
            inputImportar.click();
        });

        inputImportar.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Valida tipo de arquivo
            if (!file.name.endsWith('.json')) {
                mostrarNotificacao('❌ O arquivo deve ser .json', 'error');
                inputImportar.value = '';
                return;
            }

            // Valida tamanho máximo (10MB)
            const maxSize = 10 * 1024 * 1024;
            if (file.size > maxSize) {
                mostrarNotificacao('❌ Arquivo muito grande. Máximo: 10MB', 'error');
                inputImportar.value = '';
                return;
            }

            // Confirmação antes de importar
            const confirmar = confirm(
                '⚠️ Tem certeza que deseja importar este backup?\n\n' +
                'Isso irá SUBSTITUIR:\n' +
                '• Seu dicionário pessoal\n' +
                '• Sites bloqueados (blacklist)\n' +
                '• Sites em modo leitura\n' +
                '• Configurações de idioma e velocidade\n\n' +
                'Sua API Key NÃO será alterada.\n\n' +
                'Deseja continuar?'
            );

            if (!confirmar) {
                inputImportar.value = '';
                mostrarNotificacao('❌ Importação cancelada', 'info');
                return;
            }

            mostrarNotificacao('⏳ Lendo arquivo...', 'info');

            const reader = new FileReader();

            reader.onerror = () => {
                mostrarNotificacao('❌ Erro ao ler o arquivo', 'error');
                inputImportar.value = '';
            };

            reader.onload = (event) => {
                const dadosBrutos = event.target.result;
                
                // Validação rápida antes de enviar
                try {
                    const json = JSON.parse(dadosBrutos);
                    if (!json.dados && !json.dicionario_pessoal && !json.blacklist) {
                        mostrarNotificacao('❌ O arquivo não parece ser um backup do SyntaxMentor', 'error');
                        inputImportar.value = '';
                        return;
                    }
                } catch (err) {
                    mostrarNotificacao('❌ Arquivo JSON inválido ou corrompido', 'error');
                    inputImportar.value = '';
                    return;
                }

                mostrarNotificacao('⏳ Processando e salvando dados...', 'info');

                chrome.runtime.sendMessage({
                    action: 'importData',
                    data: dadosBrutos
                }, (response) => {
                    // Verifica erro de comunicação
                    if (chrome.runtime.lastError) {
                        mostrarNotificacao('❌ Erro de comunicação: ' + chrome.runtime.lastError.message, 'error');
                        inputImportar.value = '';
                        return;
                    }

                    if (response && response.success) {
                        const r = response.resumo;

                        // 🆕 ATUALIZA A INTERFACE IMEDIATAMENTE
                        // Recarrega os dados do storage para garantir sincronia
                        chrome.storage.local.get({
                            dicionario_pessoal: [],
                            blacklist: [],
                            language: 'pt-BR',
                            speed: '500',
                            pickyMode: true,
                            darkMode: false,
                            autoHideBubble: false
                        }, (res) => {
                            // Atualiza as variáveis locais
                            currentDictionary = res.dicionario_pessoal || [];
                            currentBlacklist = res.blacklist || [];

                            // 🆕 RECONSTRÓI as listas na interface
                            renderizarDicionario();
                            renderizarBlacklist();

                            // Atualiza os campos de configuração
                            if (elLanguage) elLanguage.value = res.language;
                            if (elPickyMode) elPickyMode.checked = res.pickyMode;
                            if (elDarkMode) {
                                elDarkMode.checked = res.darkMode;
                                if (res.darkMode) {
                                    document.body.classList.add('dark-mode');
                                } else {
                                    document.body.classList.remove('dark-mode');
                                }
                            }
                            if (elAutoHideBubble) elAutoHideBubble.checked = res.autoHideBubble || false;

                            elSpeedOptions.forEach(opt => {
                                if (opt.value === res.speed.toString()) opt.checked = true;
                            });

                            // Feedback detalhado
                            mostrarNotificacao(
                                `✅ Importado: ${r.palavrasDicionario} palavras no dicionário, ${r.sitesBlacklist} sites bloqueados`,
                                'success'
                            );

                            // Alerta com resumo completo
                            setTimeout(() => {
                                const partes = [];
                                partes.push('✅ Backup importado com sucesso!');
                                partes.push('');
                                if (r.palavrasDicionario > 0) partes.push(`📖 ${r.palavrasDicionario} palavras no dicionário`);
                                else partes.push('📖 Nenhuma palavra no dicionário');
                                if (r.sitesBlacklist > 0) partes.push(`🚫 ${r.sitesBlacklist} sites bloqueados`);
                                if (r.sitesLeitura > 0) partes.push(`📖 ${r.sitesLeitura} sites em modo leitura`);
                                if (r.sitesWhitelist > 0) partes.push(`✅ ${r.sitesWhitelist} sites na whitelist`);
                                partes.push(`🌐 Idioma: ${r.idioma}`);
                                if (r.versaoBackup) partes.push(`📦 Versão do backup: ${r.versaoBackup}`);
                                
                                alert(partes.join('\n'));
                            }, 500);

                            // Limpa o input
                            inputImportar.value = '';
                        });

                    } else {
                        const erro = response?.error || 'Erro desconhecido ao processar o arquivo';
                        mostrarNotificacao('❌ ' + erro, 'error');
                        console.error('SyntaxMentor Import Error:', erro);
                        inputImportar.value = '';
                    }
                });
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

        // Timer para ocultar (mais longo para mensagens importantes)
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