function importarDados(dados) {
    return new Promise((resolve, reject) => {
        try {
            // 1. Tenta fazer parse do JSON
            let backup;
            try {
                backup = typeof dados === 'string' ? JSON.parse(dados) : dados;
            } catch (parseError) {
                reject(new Error('Arquivo JSON inválido. Verifique se o arquivo não está corrompido.'));
                return;
            }

            // 2. Verifica se é um objeto
            if (!backup || typeof backup !== 'object') {
                reject(new Error('Formato inválido: o arquivo não é um objeto JSON válido.'));
                return;
            }

            // 3. Extrai os dados (suporta formato antigo {dados: {...}} e novo direto)
            const dadosFonte = backup.dados || backup;

            // 4. Verifica se tem pelo menos alguns campos reconhecíveis
            const camposConhecidos = [
                'dicionario_pessoal', 'blacklist', 'modoLeituraSites',
                'language', 'pickyMode', 'speed', 'darkMode',
                'whitelist', 'modoLeituraGlobal', 'modoConfirmacao'
            ];

            const temCampos = camposConhecidos.some(campo => dadosFonte[campo] !== undefined);

            if (!temCampos) {
                reject(new Error(
                    'O arquivo não contém dados reconhecíveis do SyntaxMentor.\n\n' +
                    'Certifique-se de que é um arquivo exportado pela extensão.'
                ));
                return;
            }

            // 5. Constrói objeto de restauração com validações
            const dadosParaRestaurar = {};

            // Dicionário (array de strings)
            if (Array.isArray(dadosFonte.dicionario_pessoal)) {
                dadosParaRestaurar.dicionario_pessoal = dadosFonte.dicionario_pessoal
                    .filter(item => typeof item === 'string' && item.trim().length > 0)
                    .map(item => item.trim());
            } else if (dadosFonte.dicionario_pessoal) {
                dadosParaRestaurar.dicionario_pessoal = [];
            }

            // Blacklist (array de strings)
            if (Array.isArray(dadosFonte.blacklist)) {
                dadosParaRestaurar.blacklist = dadosFonte.blacklist
                    .filter(item => typeof item === 'string' && item.trim().length > 0)
                    .map(item => item.trim().toLowerCase());
            } else if (dadosFonte.blacklist) {
                dadosParaRestaurar.blacklist = [];
            }

            // Modo leitura (array de strings)
            if (Array.isArray(dadosFonte.modoLeituraSites)) {
                dadosParaRestaurar.modoLeituraSites = dadosFonte.modoLeituraSites
                    .filter(item => typeof item === 'string' && item.trim().length > 0)
                    .map(item => item.trim().toLowerCase());
            } else if (dadosFonte.modoLeituraSites) {
                dadosParaRestaurar.modoLeituraSites = [];
            }

            // Whitelist (array de strings)
            if (Array.isArray(dadosFonte.whitelist)) {
                dadosParaRestaurar.whitelist = dadosFonte.whitelist
                    .filter(item => typeof item === 'string' && item.trim().length > 0)
                    .map(item => item.trim().toLowerCase());
            } else if (dadosFonte.whitelist) {
                dadosParaRestaurar.whitelist = [];
            }

            // Configurações com fallbacks
            dadosParaRestaurar.language = dadosFonte.language || 'pt-BR';
            dadosParaRestaurar.pickyMode = dadosFonte.pickyMode !== undefined ? !!dadosFonte.pickyMode : true;
            dadosParaRestaurar.speed = parseInt(dadosFonte.speed) || 500;
            dadosParaRestaurar.darkMode = !!dadosFonte.darkMode;
            dadosParaRestaurar.autoHideBubble = !!dadosFonte.autoHideBubble;
            dadosParaRestaurar.strictMode = !!dadosFonte.strictMode;
            dadosParaRestaurar.modoConfirmacao = !!dadosFonte.modoConfirmacao;
            dadosParaRestaurar.modoLeituraGlobal = !!dadosFonte.modoLeituraGlobal;
            dadosParaRestaurar.modoWhitelist = !!dadosFonte.modoWhitelist;

            // 6. Preserva a API Key atual (NUNCA sobrescreve)
            chrome.storage.local.get(['apiKey'], (res) => {
                if (res.apiKey) {
                    dadosParaRestaurar.apiKey = res.apiKey;
                }

                // 7. Salva no storage com callback de erro
                chrome.storage.local.set(dadosParaRestaurar, () => {
                    if (chrome.runtime.lastError) {
                        const erroMsg = chrome.runtime.lastError.message || '';

                        if (erroMsg.includes('QUOTA') || erroMsg.includes('MAX')) {
                            reject(new Error(
                                'Espaço de armazenamento excedido (limite: 10MB).\n\n' +
                                'Tente limpar algumas palavras do dicionário antes de importar.'
                            ));
                        } else if (erroMsg.includes('MAX_ITEMS')) {
                            reject(new Error(
                                'Número máximo de itens excedido.\n\n' +
                                'Tente reduzir o tamanho do dicionário ou blacklist.'
                            ));
                        } else {
                            reject(new Error('Erro ao salvar: ' + erroMsg));
                        }
                        return;
                    }

                    // 8. Sucesso - retorna resumo
                    resolve({
                        sucesso: true,
                        resumo: {
                            palavrasDicionario: (dadosParaRestaurar.dicionario_pessoal || []).length,
                            sitesBlacklist: (dadosParaRestaurar.blacklist || []).length,
                            sitesLeitura: (dadosParaRestaurar.modoLeituraSites || []).length,
                            sitesWhitelist: (dadosParaRestaurar.whitelist || []).length,
                            idioma: dadosParaRestaurar.language,
                            versaoBackup: backup.versao || 'desconhecida'
                        }
                    });
                });
            });

        } catch (e) {
            reject(new Error('Erro inesperado: ' + (e.message || 'Falha ao processar')));
        }
    });
}