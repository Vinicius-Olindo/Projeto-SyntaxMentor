// =============================================
// IMPORTAÇÃO DE DADOS (VERSÃO DEBUGADA)
// =============================================
function importarDados(dados) {
    console.log('🔍 SyntaxMentor BG: Iniciando importação...');
    
    return new Promise((resolve, reject) => {
        try {
            // 1. Tenta fazer parse do JSON
            let backup;
            try {
                backup = typeof dados === 'string' ? JSON.parse(dados) : dados;
                console.log('✅ JSON parseado com sucesso');
            } catch (parseError) {
                console.error('❌ Erro no parse JSON:', parseError.message);
                reject(new Error('Arquivo JSON inválido. Verifique se o arquivo não está corrompido.'));
                return;
            }

            // 2. Verifica se é um objeto
            if (!backup || typeof backup !== 'object') {
                console.error('❌ Backup não é um objeto:', typeof backup);
                reject(new Error('Formato inválido: o arquivo não é um objeto JSON válido.'));
                return;
            }

            // 3. Extrai os dados (suporta formato {dados: {...}} e formato direto)
            let dadosFonte;
            if (backup.dados && typeof backup.dados === 'object') {
                dadosFonte = backup.dados;
                console.log('📦 Formato detectado: {dados: {...}}');
            } else if (backup.dicionario_pessoal || backup.blacklist) {
                dadosFonte = backup;
                console.log('📦 Formato detectado: direto');
            } else {
                console.error('❌ Estrutura não reconhecida:', Object.keys(backup));
                reject(new Error('O arquivo não contém dados reconhecíveis do SyntaxMentor.'));
                return;
            }

            // 4. Verifica campos mínimos
            if (!dadosFonte.dicionario_pessoal && !dadosFonte.blacklist && !dadosFonte.language) {
                console.error('❌ Nenhum campo reconhecido encontrado');
                reject(new Error('O arquivo não contém dados do SyntaxMentor (dicionário, blacklist, etc).'));
                return;
            }

            console.log('📊 Dados encontrados:', {
                dicionario: (dadosFonte.dicionario_pessoal || []).length + ' palavras',
                blacklist: (dadosFonte.blacklist || []).length + ' sites',
                idioma: dadosFonte.language || 'não especificado'
            });

            // 5. Constrói objeto de restauração
            const dadosParaRestaurar = {};

            // Dicionário
            if (Array.isArray(dadosFonte.dicionario_pessoal)) {
                dadosParaRestaurar.dicionario_pessoal = dadosFonte.dicionario_pessoal
                    .filter(item => typeof item === 'string' && item.trim().length > 0)
                    .map(item => item.trim());
            } else {
                dadosParaRestaurar.dicionario_pessoal = [];
            }

            // Blacklist
            if (Array.isArray(dadosFonte.blacklist)) {
                dadosParaRestaurar.blacklist = dadosFonte.blacklist
                    .filter(item => typeof item === 'string' && item.trim().length > 0)
                    .map(item => item.trim().toLowerCase());
            } else {
                dadosParaRestaurar.blacklist = [];
            }

            // Modo Leitura
            if (Array.isArray(dadosFonte.modoLeituraSites)) {
                dadosParaRestaurar.modoLeituraSites = dadosFonte.modoLeituraSites
                    .filter(item => typeof item === 'string' && item.trim().length > 0)
                    .map(item => item.trim().toLowerCase());
            } else {
                dadosParaRestaurar.modoLeituraSites = [];
            }

            // Whitelist
            if (Array.isArray(dadosFonte.whitelist)) {
                dadosParaRestaurar.whitelist = dadosFonte.whitelist
                    .filter(item => typeof item === 'string' && item.trim().length > 0)
                    .map(item => item.trim().toLowerCase());
            } else {
                dadosParaRestaurar.whitelist = [];
            }

            // Configurações
            dadosParaRestaurar.language = dadosFonte.language || 'pt-BR';
            dadosParaRestaurar.pickyMode = dadosFonte.pickyMode !== undefined ? !!dadosFonte.pickyMode : true;
            dadosParaRestaurar.speed = parseInt(dadosFonte.speed) || 500;
            dadosParaRestaurar.darkMode = !!dadosFonte.darkMode;
            dadosParaRestaurar.autoHideBubble = !!dadosFonte.autoHideBubble;
            dadosParaRestaurar.strictMode = !!dadosFonte.strictMode;
            dadosParaRestaurar.modoConfirmacao = !!dadosFonte.modoConfirmacao;
            dadosParaRestaurar.modoLeituraGlobal = !!dadosFonte.modoLeituraGlobal;
            dadosParaRestaurar.modoWhitelist = !!dadosFonte.modoWhitelist;

            console.log('💾 Dados preparados para salvar:', {
                palavras: dadosParaRestaurar.dicionario_pessoal.length,
                blacklist: dadosParaRestaurar.blacklist.length,
                idioma: dadosParaRestaurar.language
            });

            // 6. Preserva API Key
            chrome.storage.local.get(['apiKey'], (res) => {
                if (chrome.runtime.lastError) {
                    console.warn('⚠️ Erro ao ler API Key:', chrome.runtime.lastError.message);
                }
                
                if (res && res.apiKey) {
                    dadosParaRestaurar.apiKey = res.apiKey;
                    console.log('🔑 API Key preservada');
                }

                // 7. Salva no storage
                console.log('💾 Salvando no storage...');
                chrome.storage.local.set(dadosParaRestaurar, () => {
                    if (chrome.runtime.lastError) {
                        console.error('❌ Erro ao salvar:', chrome.runtime.lastError.message);
                        const erroMsg = chrome.runtime.lastError.message || '';
                        
                        if (erroMsg.includes('QUOTA') || erroMsg.includes('MAX')) {
                            reject(new Error('Espaço de armazenamento excedido (limite: 10MB).'));
                        } else {
                            reject(new Error('Erro ao salvar: ' + erroMsg));
                        }
                        return;
                    }

                    // 8. Verifica se salvou corretamente
                    chrome.storage.local.get(['dicionario_pessoal'], (verifyRes) => {
                        const palavrasSalvas = (verifyRes.dicionario_pessoal || []).length;
                        console.log('✅ Importação concluída!', palavrasSalvas, 'palavras no storage');
                        
                        resolve({
                            sucesso: true,
                            resumo: {
                                palavrasDicionario: dadosParaRestaurar.dicionario_pessoal.length,
                                sitesBlacklist: dadosParaRestaurar.blacklist.length,
                                sitesLeitura: dadosParaRestaurar.modoLeituraSites.length,
                                sitesWhitelist: dadosParaRestaurar.whitelist.length,
                                idioma: dadosParaRestaurar.language,
                                versaoBackup: backup.versao || 'desconhecida'
                            }
                        });
                    });
                });
            });

        } catch (e) {
            console.error('❌ Erro inesperado na importação:', e);
            reject(new Error('Erro inesperado: ' + (e.message || 'Falha ao processar')));
        }
    });
}