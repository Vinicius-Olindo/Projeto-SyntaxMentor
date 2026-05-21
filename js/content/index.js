// =============================================
// SyntaxMentor - Entry Point v2.8.0
// Carrega todos os módulos dinamicamente
// =============================================

(function() {
    'use strict';
    
    // Lista de módulos na ordem correta de carregamento
    const modules = [
        'core/config.js',
        'core/queue-manager.js',
        'core/correction-engine.js',
        'ui/feedback.js',
        'ui/panel.js',
        'ui/bubble.js',
        'observers/keyboard.js',
        'observers/dom-observer.js',
        'observers/iframe-handler.js',
        'features/learning.js',
        'features/undo-manager.js',
        'features/sentiment.js'
    ];
    
    let loadedCount = 0;
    
    function loadModule(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = chrome.runtime.getURL(`js/content/${src}`);
            script.onload = () => {
                script.remove();
                resolve();
            };
            script.onerror = (err) => {
                console.error(`Erro ao carregar módulo: ${src}`, err);
                reject(err);
            };
            (document.head || document.documentElement).appendChild(script);
        });
    }
    
    async function loadAllModules() {
        for (const module of modules) {
            await loadModule(module);
            loadedCount++;
            console.log(`✅ Carregado: ${module} (${loadedCount}/${modules.length})`);
        }
    }
    
    async function init() {
        console.log('🚀 SyntaxMentor v2.8.0 iniciando...');
        
        await loadAllModules();
        
        // Aguardar um tick para garantir que os módulos foram inicializados
        setTimeout(() => {
            if (window.configManager && window.correctionEngine && window.bubbleUI) {
                startExtension();
            } else {
                console.warn('Módulos não encontrados, tentando novamente...');
                setTimeout(startExtension, 500);
            }
        }, 100);
    }
    
    function startExtension() {
        const configManager = window.configManager;
        const correctionEngine = window.correctionEngine;
        const bubbleUI = window.bubbleUI;
        const panelUI = window.panelUI;
        const queueManager = window.queueManager;
        const feedbackUI = window.feedbackUI;
        const keyboardManager = window.keyboardManager;
        const domObserver = window.domObserver;
        const iframeHandler = window.iframeHandler;
        const undoManager = window.undoManager;
        
        configManager.loadConfig().then(() => {
            correctionEngine.onInterfaceUpdate(() => {
                bubbleUI.atualizarAparencia();
                updateBadge(correctionEngine.getErrors().length);
            });
            
            domObserver.init();
            iframeHandler.init();
            bubbleUI.criar();
            updateTheme();
            keyboardManager.init();
            undoManager.init();
            
            loadPublicAPI();
            
            console.log('✅ SyntaxMentor v2.8.0 inicializado com sucesso!');
        });
    }
    
    function updateBadge(total) {
        try {
            chrome.runtime.sendMessage({ action: 'updateBadge', totalErros: total }).catch(() => {});
        } catch (e) {}
    }
    
    function updateTheme() {
        if (window.configManager) {
            const isDark = window.configManager.get('darkMode');
            document.body.classList.toggle('dark-mode', isDark);
            if (window.bubbleUI) window.bubbleUI.aplicarTema();
        }
    }
    
    function loadPublicAPI() {
        if (window.SyntaxMentor) return;
        const script = document.createElement('script');
        script.src = chrome.runtime.getURL('js/public-api.js');
        script.onload = () => script.remove();
        (document.head || document.documentElement).appendChild(script);
    }
    
    // Iniciar
    init();
    
})();