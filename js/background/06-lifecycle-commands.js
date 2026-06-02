// SyntaxMentor background module: lifecycle, storage changes and commands.

function registrarEventosInstalacao() {
    chrome.runtime.onInstalled.addListener((details) => {
        smLog('SyntaxMentor v2.8.0 instalado.');

        if (details.reason === 'install') {
            chrome.tabs.create({ url: chrome.runtime.getURL('options.html') });
        }

        if (details.reason === 'update') {
            smLog('SyntaxMentor atualizado para versao 2.8.0');
        }

        criarMenuContexto();
    });

    chrome.runtime.onStartup.addListener(() => {
        smLog('Chrome iniciado, restaurando estado do SyntaxMentor');
        criarMenuContexto();
    });
}

function registrarStorageListenerBackground() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace !== 'local') return;

        if (changes.blacklist || changes.disabled || changes.modoWhitelist || changes.whitelist || changes.userBlacklistOverrides || changes.userWhitelistOverrides) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (chrome.runtime.lastError) return;
                if (tabs[0]) verificarIconeParaTab(tabs[0].id);
            });
        }
    });
}

function enviarComandoParaAbaAtiva(action) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id && tabs[0]?.url && !tabs[0].url.startsWith('chrome://')) {
            chrome.tabs.sendMessage(tabs[0].id, { action }).catch(() => {});
            smLog(`Comando enviado: ${action}`);
        }
    });
}

function registrarAtalhosBackground() {
    chrome.commands.onCommand.addListener((command) => {
        smLog(`Atalho pressionado: ${command}`);

        if (command === 'ativar-extensao') {
            executarToggleSiteAtivo(true);
            return;
        }

        if (command === 'desativar-extensao') {
            executarToggleSiteAtivo(false);
            return;
        }

        if (command === 'abrir-painel') {
            enviarComandoParaAbaAtiva('togglePainel');
        }

        if (command === 'corrigir-tudo') {
            enviarComandoParaAbaAtiva('corrigirTudo');
        }
    });
}
