// =============================================
// SyntaxMentor - Config Manager
// Gerenciamento de configurações e storage
// =============================================

class ConfigManager {
    constructor() {
        this.defaultConfig = {
            language: 'pt-BR',
            pickyMode: true,
            speed: 500,
            darkMode: false,
            blacklist: [],
            apiUrl: '',
            apiKey: '',
            strictMode: false,
            disabled: false,
            autoHideBubble: false,
            modoConfirmacao: false,
            modoLeituraGlobal: false,
            modoLeituraSites: [],
            modoWhitelist: false,
            whitelist: [],
            modoFoco: false,
            modoAprendizado: false,
            toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's' },
            ignoreShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 'i' },
            corrigirTudoShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 's' },
            ativarShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 'a' },
            desativarShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 'd' }
        };
        
        this.smConfig = { ...this.defaultConfig };
        this.dicCache = [];
        this.idiomaSugerido = false;
        this.contextoExtensaoValido = true;
    }
    
    isExtensaoAtiva() {
        try {
            return !!(chrome && chrome.runtime && chrome.runtime.id);
        } catch (e) {
            return false;
        }
    }
    
    async loadConfig() {
        return new Promise((resolve) => {
            if (!this.isExtensaoAtiva()) {
                resolve(false);
                return;
            }
            
            chrome.storage.session.get({ apiKey: '' }, (sess) => {
                chrome.storage.local.get(this.defaultConfig, (res) => {
                    Object.assign(this.smConfig, res);
                    this.dicCache = (res.dicionario_pessoal || []).map(w => w.toLowerCase());
                    
                    const host = window.location.hostname;
                    const overrides = res.userBlacklistOverrides || [];
                    
                    if (overrides.includes(host)) {
                        this.smConfig.disabled = true;
                    } else if (this.smConfig.modoWhitelist) {
                        this.smConfig.disabled = !(this.smConfig.whitelist || []).some(d => host.includes(d));
                    } else {
                        this.smConfig.disabled = (this.smConfig.blacklist || []).some(d => host.includes(d));
                    }
                    
                    this.smConfig.apiKey = sess.apiKey || '';
                    resolve(true);
                });
            });
        });
    }
    
    saveConfig(key, value) {
        if (!this.isExtensaoAtiva()) return;
        
        this.smConfig[key] = value;
        chrome.storage.local.set({ [key]: value });
    }
    
    updateDictionaryCache(dictionary) {
        this.dicCache = (dictionary || []).map(w => w.toLowerCase());
    }
    
    isModoLeitura() {
        if (this.smConfig.modoLeituraGlobal) return true;
        return (this.smConfig.modoLeituraSites || []).some(d => window.location.hostname.includes(d));
    }
    
    handleStorageChange(changes) {
        const campos = [
            'language', 'pickyMode', 'speed', 'darkMode', 'blacklist', 'apiUrl', 'apiKey',
            'strictMode', 'disabled', 'autoHideBubble', 'modoConfirmacao', 'modoLeituraGlobal',
            'modoLeituraSites', 'modoWhitelist', 'whitelist', 'modoFoco', 'modoAprendizado',
            'userBlacklistOverrides', 'toggleShortcut', 'ignoreShortcut', 'corrigirTudoShortcut',
            'ativarShortcut', 'desativarShortcut'
        ];
        
        campos.forEach(k => {
            if (changes[k] !== undefined) this.smConfig[k] = changes[k].newValue;
        });
        
        if (changes.dicionario_pessoal !== undefined) {
            this.updateDictionaryCache(changes.dicionario_pessoal.newValue);
        }
        
        const host = window.location.hostname;
        const overrides = this.smConfig.userBlacklistOverrides || [];
        
        if (overrides.includes(host)) {
            this.smConfig.disabled = true;
        } else if (this.smConfig.modoWhitelist) {
            this.smConfig.disabled = !(this.smConfig.whitelist || []).some(d => host.includes(d));
        } else {
            this.smConfig.disabled = (this.smConfig.blacklist || []).some(d => host.includes(d));
        }
    }
    
    get(key) {
        return this.smConfig[key];
    }
    
    getAll() {
        return { ...this.smConfig };
    }
}

export const configManager = new ConfigManager();