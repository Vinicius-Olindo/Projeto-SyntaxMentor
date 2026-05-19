// =============================================
// SyntaxMentor - Modo Escuro Automático v1.0
// =============================================

const autoDarkMode = {
    /**
     * Detecta o tema do sistema operacional
     * @returns {boolean}
     */
    isSystemDarkMode() {
        return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    },

    /**
     * Aplica o tema baseado no sistema
     */
    aplicarTemaSistema() {
        const isDark = this.isSystemDarkMode();
        
        chrome.storage.local.get(['darkModeAuto', 'darkMode'], (res) => {
            const autoMode = res.darkModeAuto || false;
            
            if (autoMode) {
                const deveSerDark = isDark;
                if (res.darkMode !== deveSerDark) {
                    chrome.storage.local.set({ darkMode: deveSerDark });
                    document.body.classList.toggle('dark-mode', deveSerDark);
                    
                    // Atualizar painel se estiver aberto
                    const painel = document.getElementById('syntax-mentor-painel');
                    if (painel) {
                        if (deveSerDark) painel.classList.add('sm-dark');
                        else painel.classList.remove('sm-dark');
                    }
                }
            }
        });
    },

    /**
     * Observa mudanças no tema do sistema
     */
    observarMudancas() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => {
            this.aplicarTemaSistema();
        });
    },

    /**
     * Inicializa o modo automático
     */
    init() {
        this.aplicarTemaSistema();
        this.observarMudancas();
    }
};

autoDarkMode.init();