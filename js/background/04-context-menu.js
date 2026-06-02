// SyntaxMentor background module: context menu.

function criarMenuContexto() {
    chrome.contextMenus.removeAll(() => {
        if (chrome.runtime.lastError) {
            smDebug('Erro ao remover menus:', chrome.runtime.lastError.message);
        }

        chrome.contextMenus.create({
            id: 'revisar-selecao',
            title: 'SyntaxMentor: Revisar selecao',
            contexts: ['selection']
        });

        chrome.contextMenus.create({
            id: 'ignorar-palavra',
            title: 'Adicionar ao Dicionario',
            contexts: ['selection']
        });

        chrome.contextMenus.create({
            id: 'ignorar-sessao',
            title: 'Ignorar nesta sessao',
            contexts: ['selection']
        });

        smLog('Menu de contexto criado');
    });
}

function registrarMenuContexto() {
    chrome.contextMenus.onClicked.addListener((info, tab) => {
        if (!tab.id) return;

        if (info.menuItemId === 'revisar-selecao' && info.selectionText) {
            chrome.tabs.sendMessage(tab.id, {
                action: 'revisarSelecao',
                texto: info.selectionText.trim()
            }).catch(() => {});
        }

        if (info.menuItemId === 'ignorar-palavra' && info.selectionText) {
            const palavra = info.selectionText.trim().split(/\s+/)[0];
            smStorageLocalGet(['dicionario_pessoal'], (res, erro) => {
                if (erro) return;

                const dic = res.dicionario_pessoal || [];
                if (!dic.includes(palavra)) {
                    dic.push(palavra);
                    smStorageLocalSet({ dicionario_pessoal: dic });
                    smLog(`Palavra adicionada ao dicionario: ${palavra}`);
                }
            });
        }

        if (info.menuItemId === 'ignorar-sessao' && info.selectionText) {
            const palavra = info.selectionText.trim().split(/\s+/)[0];
            chrome.tabs.sendMessage(tab.id, {
                action: 'ignorarTemporariamente',
                palavra
            }).catch(() => {});
        }
    });
}
