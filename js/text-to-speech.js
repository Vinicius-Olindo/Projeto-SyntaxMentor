// =============================================
// SyntaxMentor - Leitura em Voz Alta v1.0
// =============================================

class TextToSpeech {
    constructor() {
        this.synth = window.speechSynthesis;
        this.utterance = null;
        this.isPlaying = false;
        this.currentText = '';
        this.speed = 1.0;
        this.voice = null;
        this.availableVoices = [];
        
        // Carregar vozes disponíveis
        this.carregarVozes();
        
        // Configurar evento de mudança de vozes
        if (this.synth) {
            this.synth.onvoiceschanged = () => this.carregarVozes();
        }
    }
    
    /**
     * Carrega as vozes disponíveis no sistema
     */
    carregarVozes() {
        if (!this.synth) return;
        
        this.availableVoices = this.synth.getVoices();
        
        // Salvar preferência de voz do usuário
        chrome.storage.local.get(['ttsVoice'], (res) => {
            if (res.ttsVoice) {
                this.setVoiceByName(res.ttsVoice);
            } else {
                // Selecionar voz padrão em português
                const vozPt = this.availableVoices.find(v => 
                    v.lang === 'pt-BR' || v.lang === 'pt' || v.lang.startsWith('pt')
                );
                if (vozPt) this.voice = vozPt;
            }
        });
    }
    
    /**
     * Define a voz pelo nome
     * @param {string} nome - Nome da voz
     */
    setVoiceByName(nome) {
        const voz = this.availableVoices.find(v => v.name === nome);
        if (voz) {
            this.voice = voz;
            chrome.storage.local.set({ ttsVoice: nome });
        }
    }
    
    /**
     * Define a velocidade da leitura
     * @param {number} rate - Velocidade (0.5 a 2.0)
     */
    setSpeed(rate) {
        this.speed = Math.max(0.5, Math.min(2.0, rate));
        chrome.storage.local.set({ ttsSpeed: this.speed });
    }
    
    /**
     * Lê um texto em voz alta
     * @param {string} texto - Texto a ser lido
     * @param {Function} callback - Callback opcional
     */
    falar(texto, callback) {
        if (!this.synth) {
            console.warn('Web Speech API não suportada neste navegador');
            if (callback) callback(false);
            return;
        }
        
        // Parar leitura atual
        this.parar();
        
        if (!texto || texto.trim().length === 0) {
            if (callback) callback(false);
            return;
        }
        
        this.currentText = texto;
        this.utterance = new SpeechSynthesisUtterance(texto);
        this.utterance.rate = this.speed;
        
        if (this.voice) {
            this.utterance.voice = this.voice;
        }
        
        this.utterance.onstart = () => {
            this.isPlaying = true;
            this.atualizarInterfacePlayback(true);
        };
        
        this.utterance.onend = () => {
            this.isPlaying = false;
            this.atualizarInterfacePlayback(false);
            if (callback) callback(true);
        };
        
        this.utterance.onerror = (err) => {
            console.error('Erro na leitura:', err);
            this.isPlaying = false;
            this.atualizarInterfacePlayback(false);
            if (callback) callback(false);
        };
        
        this.synth.speak(this.utterance);
    }
    
    /**
     * Pausa a leitura atual
     */
    pausar() {
        if (this.synth && this.isPlaying) {
            this.synth.pause();
            this.isPlaying = false;
            this.atualizarInterfacePlayback(false);
        }
    }
    
    /**
     * Retoma a leitura pausada
     */
    retomar() {
        if (this.synth && this.utterance && !this.isPlaying) {
            this.synth.resume();
            this.isPlaying = true;
            this.atualizarInterfacePlayback(true);
        }
    }
    
    /**
     * Para a leitura atual
     */
    parar() {
        if (this.synth) {
            this.synth.cancel();
            this.isPlaying = false;
            this.atualizarInterfacePlayback(false);
            this.utterance = null;
        }
    }
    
    /**
     * Alterna entre play/pause
     */
    toggle() {
        if (this.isPlaying) {
            this.pausar();
        } else if (this.utterance) {
            this.retomar();
        } else if (this.currentText) {
            this.falar(this.currentText);
        }
    }
    
    /**
     * Atualiza a interface de playback
     * @param {boolean} playing - Se está tocando
     */
    atualizarInterfacePlayback(playing) {
        const btnPlay = document.querySelector('#sm-tts-play');
        const btnPause = document.querySelector('#sm-tts-pause');
        
        if (btnPlay && btnPause) {
            btnPlay.style.display = playing ? 'none' : 'inline-flex';
            btnPause.style.display = playing ? 'inline-flex' : 'none';
        }
    }
    
    /**
     * Adiciona controles de TTS no painel
     */
    adicionarControles(container) {
        if (!container) return;
        
        // Verificar se já existe
        if (document.querySelector('.sm-tts-controls')) return;
        
        const controls = document.createElement('div');
        controls.className = 'sm-tts-controls';
        controls.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px;
            background: var(--color-background-secondary, #f8f9fa);
            border-radius: 12px;
            margin-top: 12px;
        `;
        
        controls.innerHTML = `
            <button id="sm-tts-play" class="sm-tts-btn" title="Ouvir texto" style="background:#6f42c1;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px">
                🔊 Ouvir Texto
            </button>
            <button id="sm-tts-pause" class="sm-tts-btn" title="Pausar" style="background:#f59e0b;color:white;border:none;padding:8px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600;display:none;align-items:center;gap:6px">
                ⏸️ Pausar
            </button>
            <button id="sm-tts-stop" class="sm-tts-btn" title="Parar" style="background:#6b7280;color:white;border:none;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">
                ⏹️
            </button>
            <div class="sm-tts-speed" style="display:flex;align-items:center;gap:4px;margin-left:8px">
                <span style="font-size:11px;">🐢</span>
                <input type="range" id="sm-tts-speed" min="0.5" max="2.0" step="0.1" value="${this.speed}" style="width:80px">
                <span style="font-size:11px;">🐇</span>
                <span id="sm-tts-speed-value" style="font-size:10px;width:35px">${this.speed}x</span>
            </div>
        `;
        
        container.appendChild(controls);
        
        // Eventos
        const btnPlay = document.getElementById('sm-tts-play');
        const btnPause = document.getElementById('sm-tts-pause');
        const btnStop = document.getElementById('sm-tts-stop');
        const speedSlider = document.getElementById('sm-tts-speed');
        const speedValue = document.getElementById('sm-tts-speed-value');
        
        if (btnPlay) {
            btnPlay.addEventListener('click', () => {
                const texto = this.obterTextoAtivo();
                if (texto) {
                    this.falar(texto);
                }
            });
        }
        
        if (btnPause) {
            btnPause.addEventListener('click', () => this.pausar());
        }
        
        if (btnStop) {
            btnStop.addEventListener('click', () => this.parar());
        }
        
        if (speedSlider) {
            speedSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.setSpeed(val);
                if (speedValue) speedValue.textContent = val + 'x';
            });
        }
    }
    
    /**
     * Obtém o texto ativo do elemento global
     * @returns {string}
     */
    obterTextoAtivo() {
        if (elementoGlobal) {
            return elementoGlobal.value || elementoGlobal.textContent || elementoGlobal.innerText || '';
        }
        return '';
    }
    
    /**
     * Lê o texto selecionado
     */
    lerSelecao() {
        const selection = window.getSelection();
        const textoSelecionado = selection.toString().trim();
        
        if (textoSelecionado) {
            this.falar(textoSelecionado);
            mostrarFeedback('🔊 Lendo texto selecionado...', 'info');
        } else {
            const texto = this.obterTextoAtivo();
            if (texto) {
                this.falar(texto);
            } else {
                mostrarFeedback('📭 Nenhum texto para ler', 'info');
            }
        }
    }
}

// Inicializar TTS globalmente
const smTTS = new TextToSpeech();