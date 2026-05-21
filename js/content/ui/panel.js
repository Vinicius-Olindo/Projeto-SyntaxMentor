// =============================================
// SyntaxMentor - Panel UI
// Gerenciamento do painel de sugestões com abas (Gramática, Sentimento, Histórico)
// =============================================

import { configManager } from '../core/config.js';
import { correctionEngine } from '../core/correction-engine.js';
import { feedbackUI } from './feedback.js';
import { learningManager } from '../features/learning.js';
import { undoManager } from '../features/undo-manager.js';
import { sentimentManager } from '../features/sentiment.js';

class PanelUI {
    constructor() {
        this.painelElement = null;
        this.painelAberto = false;
        this.currentTab = 'grammar';
        this.errosNavegaveis = [];
        this.erroNavIdx = -1;
        
        // Bind dos métodos
        this.exibir = this.exibir.bind(this);
        this.fechar = this.fechar.bind(this);
        this.atualizar = this.atualizar.bind(this);
        this.navegarErros = this.navegarErros.bind(this);
    }
    
    /**
     * Exibe o painel de sugestões
     */
    exibir() {
        if (this.painelAberto && this.painelElement) {
            this.atualizar();
            return;
        }
        
        this.painelAberto = true;
        this.erroNavIdx = -1;
        
        // Criar ou obter painel
        let painel = document.getElementById('syntax-mentor-painel');
        if (!painel) {
            painel = document.createElement('div');
            painel.id = 'syntax-mentor-painel';
            document.body.appendChild(painel);
        }
        
        this.painelElement = painel;
        
        // Aplicar tema
        this.aplicarTema();
        
        // Renderizar conteúdo
        this.renderizar();
        
        // Tornar arrastável
        this.tornarArrastavel();
        
        // Configurar listeners
        this.configurarListeners();
    }
    
    /**
     * Aplica tema escuro/claro ao painel
     */
    aplicarTema() {
        if (!this.painelElement) return;
        
        const isDark = configManager.get('darkMode');
        if (isDark) {
            this.painelElement.classList.add('sm-dark');
        } else {
            this.painelElement.classList.remove('sm-dark');
        }
    }
    
    /**
     * Renderiza o conteúdo do painel
     */
    renderizar() {
        if (!this.painelElement) return;
        
        const errors = correctionEngine.getErrors();
        const isModoLeitura = configManager.isModoLeitura();
        
        // Atualizar erros navegáveis
        this.errosNavegaveis = errors.filter(e => {
            const o = e.context.text?.substr(e.context.offset, e.context.length);
            return o && o.trim();
        });
        
        // Construir HTML do painel
        let html = `
            <div id="syntax-mentor-header">
                <div class="sm-header-title">
                    <span>${isModoLeitura ? '👁️ Revisão' : '📝 Sugestões'}</span>
                    ${learningManager.isActive ? '<span class="sm-learning-badge" title="Modo Aprendizado Ativo">📚 Aprendizado</span>' : ''}
                </div>
                <div class="sm-header-actions">
                    <button id="btn-aprendizado" class="sm-header-btn" title="Meu Aprendizado">📚</button>
                    <button id="btn-fechar-painel" class="sm-header-btn" title="Fechar">✕</button>
                </div>
            </div>
            
            <div class="sm-tabs-container">
                <button class="sm-tab-btn ${this.currentTab === 'grammar' ? 'active' : ''}" data-tab="grammar">
                    📝 Gramática
                    ${this.errosNavegaveis.length > 0 ? `<span class="tab-badge">${this.errosNavegaveis.length}</span>` : ''}
                </button>
                <button class="sm-tab-btn ${this.currentTab === 'sentiment' ? 'active' : ''}" data-tab="sentiment">
                    😊 Sentimento
                </button>
                <button class="sm-tab-btn ${this.currentTab === 'history' ? 'active' : ''}" data-tab="history">
                    🕓 Histórico
                    ${undoManager.getStats().totalActions > 0 ? `<span class="tab-badge">${undoManager.getStats().totalActions}</span>` : ''}
                </button>
            </div>
            
            <div id="syntax-mentor-content">
                <!-- Conteúdo será preenchido dinamicamente -->
            </div>
        `;
        
        this.painelElement.innerHTML = html;
        
        // Renderizar conteúdo da aba atual
        this.renderizarAba(this.currentTab);
    }
    
    /**
     * Renderiza a aba atual
     */
    renderizarAba(tab) {
        const content = document.getElementById('syntax-mentor-content');
        if (!content) return;
        
        if (tab === 'grammar') {
            this.renderizarAbaGramatica(content);
        } else if (tab === 'sentiment') {
            this.renderizarAbaSentimento(content);
        } else if (tab === 'history') {
            this.renderizarAbaHistorico(content);
        }
    }
    
    /**
     * Renderiza aba de gramática
     */
    renderizarAbaGramatica(container) {
        const errors = correctionEngine.getErrors();
        const mapa = {};
        let total = 0;
        
        // Agrupar erros por palavra
        errors.forEach(e => {
            const o = e.context.text?.substr(e.context.offset, e.context.length);
            if (!o || !o.trim()) return;
            
            if (!mapa[o]) {
                mapa[o] = {
                    s: e.replacements[0]?.value || '',
                    c: 0,
                    msg: e.message || ''
                };
            }
            mapa[o].c++;
            total++;
        });
        
        // Atualizar erros navegáveis
        this.errosNavegaveis = errors.filter(e => {
            const o = e.context.text?.substr(e.context.offset, e.context.length);
            return o && o.trim();
        });
        
        let html = `
            <div class="sm-grammar-header">
                <div class="sm-nav-controls">
                    <button id="btn-erro-prev" class="sm-nav-btn" ${this.errosNavegaveis.length === 0 ? 'disabled' : ''} title="Erro anterior">
                        ⬆ Anterior
                    </button>
                    <span id="sm-nav-contador" class="sm-nav-counter">
                        ${this.errosNavegaveis.length > 0 ? `1 / ${this.errosNavegaveis.length}` : '0 / 0'}
                    </span>
                    <button id="btn-erro-next" class="sm-nav-btn" ${this.errosNavegaveis.length === 0 ? 'disabled' : ''} title="Próximo erro">
                        Próximo ⬇
                    </button>
                </div>
            </div>
            <div class="body-cards">
        `;
        
        if (Object.keys(mapa).length === 0) {
            html += `
                <div class="sm-empty-state">
                    <div class="sm-empty-icon">✅</div>
                    <p>Nenhum erro encontrado!</p>
                    <p class="sm-empty-subtitle">Seu texto está correto.</p>
                </div>
            `;
        } else {
            Object.entries(mapa).forEach(([o, info]) => {
                const msgEscapada = this.escapeHtml(info.msg);
                const oEscapado = this.escapeHtml(o);
                const sEscapado = this.escapeHtml(info.s);
                
                html += `
                    <div class="erro-card" data-palavra="${oEscapado.replace(/"/g, '&quot;')}">
                        <p class="erro-msg" title="${msgEscapada}">
                            <span class="erro-categoria">${this.getCategoriaIcon(info.msg)}</span>
                            <strong>${oEscapado}</strong>
                        </p>
                        <div class="sugestao-container">
                            <div class="sugestoes-lista">
                                <button class="btn-sugestao" data-original="${oEscapado.replace(/"/g, '&quot;')}" data-sugestao="${sEscapado.replace(/"/g, '&quot;')}">
                                    ${sEscapado || '[Remover]'}
                                </button>
                            </div>
                            <div class="acoes-secundarias">
                                <button class="btn-ignorar-sessao" data-palavra="${oEscapado.replace(/"/g, '&quot;')}" title="Ignorar nesta sessão">
                                    ↩
                                </button>
                                <button class="btn-adicionar-dicionario" data-palavra="${oEscapado.replace(/"/g, '&quot;')}" title="Adicionar ao dicionário">
                                    📖
                                </button>
                            </div>
                        </div>
                        ${info.c > 1 ? `<div class="erro-ocorrencias">⚠️ ocorre ${info.c}x no texto</div>` : ''}
                    </div>
                `;
            });
        }
        
        html += `
            </div>
            <div class="footer-actions">
                <button id="btn-corrigir-tudo" class="btn-primary-action">
                    ✨ Corrigir Tudo (${Object.keys(mapa).length})
                </button>
                <button id="btn-ignorar-tudo" class="btn-secondary-action">
                    Ignorar Tudo
                </button>
            </div>
            <div class="sm-footer-hints">
                <span>💡 Dica: Ctrl+Z = Desfazer | Ctrl+Y = Refazer</span>
                <span>⚡ Atalho: Alt+Shift+S corrige tudo</span>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Configurar eventos da gramática
        this.configurarEventosGramatica(container);
    }
    
    /**
     * Renderiza aba de sentimento
     */
    renderizarAbaSentimento(container) {
        const elemento = correctionEngine.getCurrentElement();
        const texto = elemento ? (elemento.value || elemento.textContent || elemento.innerText || '') : '';
        
        if (texto.length < 10) {
            container.innerHTML = `
                <div class="sm-empty-state">
                    <div class="sm-empty-icon">📝</div>
                    <p>Digite mais texto para analisar o sentimento</p>
                    <p class="sm-empty-subtitle">Mínimo de 10 caracteres</p>
                </div>
            `;
            return;
        }
        
        const analysis = sentimentManager.analyze(texto);
        
        if (!analysis.success) {
            container.innerHTML = `
                <div class="sm-empty-state">
                    <div class="sm-empty-icon">⚠️</div>
                    <p>${this.escapeHtml(analysis.message)}</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div class="sentiment-container">
                <div class="sentiment-header">
                    <div class="sentiment-score-circle" style="border-color: ${analysis.polarityColor}">
                        <span class="sentiment-score-icon">${analysis.polarityIcon}</span>
                    </div>
                    <div class="sentiment-info">
                        <h3>Sentimento: ${this.getPolarityLabel(analysis.polarity)}</h3>
                        <div class="sentiment-bar-container">
                            <div class="sentiment-bar" style="width: ${analysis.scorePercent}%; background: ${analysis.polarityColor}"></div>
                        </div>
                        <div class="sentiment-stats">
                            <span>Score: ${analysis.score}</span>
                            <span>${analysis.emotionIcon} ${analysis.emotionName}</span>
                        </div>
                        <p class="sentiment-message">${this.escapeHtml(analysis.summary)}</p>
                    </div>
                </div>
        `;
        
        if (analysis.issues && analysis.issues.length > 0) {
            html += `
                <div class="sentiment-issues">
                    <h4>🔍 Pontos de atenção:</h4>
                    <div class="issues-list">
            `;
            
            analysis.issues.forEach(issue => {
                const icon = issue.type === 'negative' ? '⚠️' : '🔊';
                html += `
                    <div class="issue-card">
                        <div class="issue-header">
                            <span>${icon}</span>
                            <strong>"${this.escapeHtml(issue.original)}"</strong>
                            <span>→</span>
                            <span class="issue-suggestion">"${this.escapeHtml(issue.suggestion)}"</span>
                        </div>
                        <p class="issue-message">${this.escapeHtml(issue.message)}</p>
                        <button class="btn-fix-sentiment" data-original="${this.escapeHtml(issue.original)}" data-suggestion="${this.escapeHtml(issue.suggestion)}">
                            🔧 Aplicar sugestão
                        </button>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        } else {
            html += `
                <div class="sentiment-positive">
                    <div class="sentiment-positive-icon">✨</div>
                    <p>Texto com tom adequado!</p>
                    <p class="sentiment-positive-sub">Nenhum ponto negativo detectado</p>
                </div>
            `;
        }
        
        html += `
                <div class="sentiment-footer">
                    <button id="btn-melhorar-tom" class="btn-melhorar-tom" ${analysis.issues.length === 0 ? 'disabled' : ''}>
                        ✨ Melhorar Tom Automaticamente
                    </button>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Configurar eventos da aba de sentimento
        this.configurarEventosSentimento(container);
    }
    
    /**
     * Renderiza aba de histórico
     */
    renderizarAbaHistorico(container) {
        const stats = undoManager.getStats();
        const history = undoManager.getHistory();
        
        if (stats.totalActions === 0) {
            container.innerHTML = `
                <div class="sm-empty-state">
                    <div class="sm-empty-icon">📭</div>
                    <p>Nenhuma correção feita ainda</p>
                    <p class="sm-empty-subtitle">Corrija algum texto para ver o histórico aqui.</p>
                    <p class="sm-empty-subtitle">💡 Dica: Use Ctrl+Z para desfazer</p>
                </div>
            `;
            return;
        }
        
        const historicoReverse = [...history].reverse();
        
        let html = `
            <div class="historico-container">
                <div class="historico-header">
                    <div>
                        <span>📋 Histórico de correções</span>
                        <span class="historico-badge">${stats.totalActions} ação(ões)</span>
                    </div>
                    <div class="historico-actions">
                        <button id="btn-limpar-historico" class="btn-limpar-historico" title="Limpar histórico">
                            🗑️ Limpar
                        </button>
                    </div>
                </div>
                <div class="historico-stats">
                    <div class="historico-stat">
                        <span class="stat-value">${stats.availableUndo}</span>
                        <span class="stat-label">disponíveis para desfazer</span>
                    </div>
                    <div class="historico-stat">
                        <span class="stat-value">${stats.availableRedo}</span>
                        <span class="stat-label">disponíveis para refazer</span>
                    </div>
                </div>
                <div class="historico-lista">
        `;
        
        historicoReverse.slice(0, 30).forEach((item, idx) => {
            const data = new Date(item.timestamp);
            const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const realIdx = history.length - 1 - idx;
            
            if (item.isGroup) {
                html += `
                    <div class="historico-item group" data-idx="${realIdx}">
                        <div class="historico-icon">📦</div>
                        <div class="historico-content">
                            <div class="historico-title">${this.escapeHtml(item.groupName)}</div>
                            <div class="historico-desc">${item.metadata.actionCount} correções agrupadas</div>
                        </div>
                        <div class="historico-meta">
                            <span class="historico-hora">${hora}</span>
                            <button class="btn-reverter" data-idx="${realIdx}" title="Desfazer este grupo">
                                ↩ Desfazer
                            </button>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div class="historico-item" data-idx="${realIdx}">
                        <div class="historico-palavras">
                            <span class="historico-original">${this.escapeHtml(item.originalText)}</span>
                            <span class="historico-seta">→</span>
                            <span class="historico-corrigido">${this.escapeHtml(item.correctedText)}</span>
                        </div>
                        <div class="historico-meta">
                            <span class="historico-hora">${hora}</span>
                            ${item.metadata?.category ? `<span class="historico-categoria">${this.escapeHtml(item.metadata.category)}</span>` : ''}
                            <button class="btn-reverter" data-idx="${realIdx}" title="Desfazer esta correção">
                                ↩ Desfazer
                            </button>
                        </div>
                    </div>
                `;
            }
        });
        
        html += `
                </div>
                <div class="historico-footer">
                    <span>💡 Atalhos: Ctrl+Z = Desfazer | Ctrl+Y = Refazer</span>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Configurar eventos do histórico
        this.configurarEventosHistorico(container);
    }
    
    /**
     * Configura eventos da aba de gramática
     */
    configurarEventosGramatica(container) {
        // Navegação entre erros
        const btnPrev = document.getElementById('btn-erro-prev');
        const btnNext = document.getElementById('btn-erro-next');
        
        if (btnPrev) {
            btnPrev.onclick = () => this.navegarErros(-1);
        }
        if (btnNext) {
            btnNext.onclick = () => this.navegarErros(1);
        }
        
        // Botões de correção
        const botoesCorrigir = container.querySelectorAll('.btn-sugestao');
        botoesCorrigir.forEach(btn => {
            btn.onclick = () => {
                const original = btn.dataset.original;
                const sugestao = btn.dataset.sugestao;
                const elemento = correctionEngine.getCurrentElement();
                
                correctionEngine.aplicarCorrecao(original, sugestao, elemento);
                setTimeout(() => this.atualizar(), 500);
            };
        });
        
        // Botões ignorar sessão
        const botoesIgnorar = container.querySelectorAll('.btn-ignorar-sessao');
        botoesIgnorar.forEach(btn => {
            btn.onclick = () => {
                const palavra = btn.dataset.palavra;
                correctionEngine.ignorarTemporariamente(palavra);
                setTimeout(() => this.atualizar(), 500);
            };
        });
        
        // Botões adicionar ao dicionário
        const botoesAdicionar = container.querySelectorAll('.btn-adicionar-dicionario');
        botoesAdicionar.forEach(btn => {
            btn.onclick = () => {
                const palavra = btn.dataset.palavra;
                chrome.storage.local.get(['dicionario_pessoal'], (res) => {
                    const dic = res.dicionario_pessoal || [];
                    if (!dic.includes(palavra)) {
                        dic.push(palavra);
                        chrome.storage.local.set({ dicionario_pessoal: dic });
                        feedbackUI.mostrarFeedback(`"${palavra}" adicionado ao dicionário`, 'success');
                        correctionEngine.removerErroGlobal(palavra);
                        setTimeout(() => this.atualizar(), 500);
                    }
                });
            };
        });
        
        // Corrigir tudo
        const btnCorrigirTudo = document.getElementById('btn-corrigir-tudo');
        if (btnCorrigirTudo) {
            btnCorrigirTudo.onclick = () => {
                correctionEngine.corrigirTudo();
                setTimeout(() => this.atualizar(), 500);
            };
        }
        
        // Ignorar tudo
        const btnIgnorarTudo = document.getElementById('btn-ignorar-tudo');
        if (btnIgnorarTudo) {
            btnIgnorarTudo.onclick = () => {
                correctionEngine.clear();
                this.atualizar();
                feedbackUI.mostrarFeedback('Todos os erros foram ignorados', 'info');
            };
        }
    }
    
    /**
     * Configura eventos da aba de sentimento
     */
    configurarEventosSentimento(container) {
        // Botões de correção individual
        const botoesFix = container.querySelectorAll('.btn-fix-sentiment');
        botoesFix.forEach(btn => {
            btn.onclick = () => {
                const original = btn.dataset.original;
                const sugestao = btn.dataset.suggestion;
                const elemento = correctionEngine.getCurrentElement();
                
                if (elemento) {
                    const regex = new RegExp(`\\b${this.escapeRegex(original)}\\b`, 'gi');
                    if (elemento.tagName === 'TEXTAREA' || elemento.tagName === 'INPUT') {
                        elemento.value = elemento.value.replace(regex, sugestao);
                        correctionEngine.dispararEventosNativos(elemento);
                    } else if (elemento.isContentEditable) {
                        elemento.innerHTML = elemento.innerHTML.replace(regex, sugestao);
                        correctionEngine.atualizarElementoComEventos(elemento);
                    }
                    
                    feedbackUI.mostrarFeedback(`✨ Tom melhorado: "${original}" → "${sugestao}"`, 'success');
                    setTimeout(() => {
                        const novoTexto = elemento.value || elemento.textContent || '';
                        if (novoTexto) {
                            const newAnalysis = sentimentManager.analyze(novoTexto);
                            if (newAnalysis.success && container) {
                                this.renderizarAbaSentimento(container);
                            }
                        }
                    }, 500);
                }
            };
        });
        
        // Botão de melhoria automática geral
        const btnMelhorarTom = container.querySelector('#btn-melhorar-tom');
        if (btnMelhorarTom) {
            btnMelhorarTom.onclick = () => {
                const elemento = correctionEngine.getCurrentElement();
                if (elemento) {
                    const texto = elemento.value || elemento.textContent || '';
                    const analysis = sentimentManager.analyze(texto);
                    
                    if (analysis && analysis.success && analysis.issues.length > 0) {
                        const suggestions = sentimentManager.getSuggestions(analysis);
                        const improved = sentimentManager.improveTone(texto, suggestions);
                        
                        if (improved.hasChanges && improved.improved !== texto) {
                            if (elemento.tagName === 'TEXTAREA' || elemento.tagName === 'INPUT') {
                                elemento.value = improved.improved;
                                correctionEngine.dispararEventosNativos(elemento);
                            } else if (elemento.isContentEditable) {
                                elemento.innerHTML = improved.improved;
                                correctionEngine.atualizarElementoComEventos(elemento);
                            }
                            
                            feedbackUI.mostrarFeedback(`✨ Tom geral melhorado! ${improved.changes.length} ajuste(s) aplicado(s)`, 'success', 3000);
                            setTimeout(() => {
                                if (container) this.renderizarAbaSentimento(container);
                            }, 500);
                        } else {
                            feedbackUI.mostrarFeedback('Nenhuma melhoria adicional necessária', 'info', 2000);
                        }
                    }
                }
            };
        }
    }
    
    /**
     * Configura eventos da aba de histórico
     */
    configurarEventosHistorico(container) {
        // Botão de limpar histórico
        const btnLimpar = container.querySelector('#btn-limpar-historico');
        if (btnLimpar) {
            btnLimpar.onclick = () => {
                if (confirm('Tem certeza que deseja limpar todo o histórico de correções? Esta ação não pode ser desfeita.')) {
                    undoManager.clear();
                    this.renderizarAbaHistorico(container);
                    feedbackUI.mostrarFeedback('🗑️ Histórico limpo!', 'success', 2000);
                }
            };
        }
        
        // Botões de reverter
        const botoesReverter = container.querySelectorAll('.btn-reverter');
        botoesReverter.forEach(btn => {
            btn.onclick = () => {
                const idx = parseInt(btn.dataset.idx);
                const history = undoManager.getHistory();
                const item = history[idx];
                
                if (item && item.element && document.contains(item.element)) {
                    // Desfazer o item específico
                    if (item.isGroup) {
                        // Desfazer grupo todo de uma vez (do mais novo para o mais antigo)
                        for (let i = item.actions.length - 1; i >= 0; i--) {
                            const action = item.actions[i];
                            if (action.element && document.contains(action.element)) {
                                const escAnterior = action.correctedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                if (action.element.tagName === 'TEXTAREA' || action.element.tagName === 'INPUT') {
                                    action.element.value = action.element.value.replace(
                                        new RegExp(escAnterior, 'g'), 
                                        action.originalText
                                    );
                                } else {
                                    action.element.innerHTML = action.element.innerHTML.replace(
                                        new RegExp(escAnterior, 'g'), 
                                        action.originalText
                                    );
                                }
                                correctionEngine.dispararEventosNativos(action.element);
                            }
                        }
                        feedbackUI.mostrarFeedback(`↩ Grupo "${item.groupName}" desfeito!`, 'success', 2000);
                    } else {
                        // Desfazer item individual
                        const escAnterior = item.correctedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        if (item.element.tagName === 'TEXTAREA' || item.element.tagName === 'INPUT') {
                            item.element.value = item.element.value.replace(
                                new RegExp(escAnterior, 'g'), 
                                item.originalText
                            );
                        } else if (item.element.isContentEditable) {
                            item.element.innerHTML = item.element.innerHTML.replace(
                                new RegExp(escAnterior, 'g'), 
                                item.originalText
                            );
                        }
                        correctionEngine.dispararEventosNativos(item.element);
                        feedbackUI.mostrarFeedback(`↩ Correção desfeita: "${item.originalText}" → "${item.correctedText}"`, 'success', 2000);
                    }
                    
                    // Remover do histórico e atualizar
                    undoManager.history.splice(idx, 1);
                    undoManager.saveToStorage();
                    undoManager.notifyListeners();
                    this.renderizarAbaHistorico(container);
                    
                    // Re-verificar texto
                    if (item.element) {
                        const texto = item.element.value || item.element.textContent || '';
                        if (texto) correctionEngine.verificarTexto(texto, item.element);
                    }
                } else {
                    feedbackUI.mostrarFeedback('⚠️ Elemento não está mais disponível. Removendo do histórico.', 'warning', 2000);
                    undoManager.history.splice(idx, 1);
                    undoManager.saveToStorage();
                    this.renderizarAbaHistorico(container);
                }
            };
        });
    }
    
    /**
     * Navega entre erros
     */
    navegarErros(direcao) {
        if (this.errosNavegaveis.length === 0) return;
        
        this.erroNavIdx = (this.erroNavIdx + direcao + this.errosNavegaveis.length) % this.errosNavegaveis.length;
        const erro = this.errosNavegaveis[this.erroNavIdx];
        const palavra = erro.context.text.substr(erro.context.offset, erro.context.length);
        
        // Atualizar contador
        const contador = document.getElementById('sm-nav-contador');
        if (contador) {
            contador.textContent = `${this.erroNavIdx + 1} / ${this.errosNavegaveis.length}`;
        }
        
        // Scroll e destaque no DOM
        const marks = document.querySelectorAll('mark.sm-highlight');
        marks.forEach(m => m.style.outline = '');
        marks.forEach(m => {
            if (m.textContent === palavra) {
                m.style.outline = '2px solid #f97316';
                m.style.backgroundColor = 'rgba(249, 115, 22, 0.2)';
                m.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // Remover destaque após 2 segundos
                setTimeout(() => {
                    if (m) {
                        m.style.outline = '';
                        m.style.backgroundColor = '';
                    }
                }, 2000);
            }
        });
        
        // Destacar card correspondente no painel
        const cards = document.querySelectorAll('.erro-card');
        cards.forEach(card => {
            const strong = card.querySelector('strong');
            if (strong && strong.textContent === palavra) {
                card.style.background = 'var(--color-background-warning, #fef3c7)';
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                setTimeout(() => {
                    card.style.background = '';
                }, 1500);
            }
        });
    }
    
    /**
     * Configura listeners do painel
     */
    configurarListeners() {
        if (!this.painelElement) return;
        
        // Fechar painel
        const btnFechar = document.getElementById('btn-fechar-painel');
        if (btnFechar) {
            btnFechar.onclick = () => this.fechar();
        }
        
        // Botão de aprendizado
        const btnAprendizado = document.getElementById('btn-aprendizado');
        if (btnAprendizado) {
            btnAprendizado.onclick = () => learningManager.showLearningPanel();
        }
        
        // Abas
        const tabs = this.painelElement.querySelectorAll('.sm-tab-btn');
        tabs.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = btn.dataset.tab;
                if (tab) {
                    this.currentTab = tab;
                    this.renderizar();
                }
            });
        });
    }
    
    /**
     * Torna o painel arrastável
     */
    tornarArrastavel() {
        const header = document.getElementById('syntax-mentor-header');
        if (!header || !this.painelElement) return;
        
        let startX, startY, initialX, initialY;
        
        const dragStart = (e) => {
            if (e.target.closest('.sm-header-actions')) return;
            
            startX = e.clientX;
            startY = e.clientY;
            initialX = this.painelElement.offsetLeft;
            initialY = this.painelElement.offsetTop;
            
            document.addEventListener('mousemove', dragMove);
            document.addEventListener('mouseup', dragEnd);
            this.painelElement.style.cursor = 'grabbing';
            e.preventDefault();
        };
        
        const dragMove = (e) => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            
            let newLeft = initialX + dx;
            let newTop = initialY + dy;
            
            // Limitar à viewport
            const maxLeft = window.innerWidth - this.painelElement.offsetWidth - 10;
            const maxTop = window.innerHeight - this.painelElement.offsetHeight - 10;
            
            newLeft = Math.max(10, Math.min(newLeft, maxLeft));
            newTop = Math.max(10, Math.min(newTop, maxTop));
            
            this.painelElement.style.left = `${newLeft}px`;
            this.painelElement.style.top = `${newTop}px`;
            this.painelElement.style.right = 'auto';
            this.painelElement.style.bottom = 'auto';
        };
        
        const dragEnd = () => {
            document.removeEventListener('mousemove', dragMove);
            document.removeEventListener('mouseup', dragEnd);
            this.painelElement.style.cursor = '';
        };
        
        header.addEventListener('mousedown', dragStart);
        header.style.cursor = 'grab';
    }
    
    /**
     * Atualiza o painel
     */
    atualizar() {
        if (!this.painelAberto) return;
        this.renderizar();
    }
    
    /**
     * Fecha o painel
     */
    fechar() {
        if (this.painelElement) {
            this.painelElement.remove();
            this.painelElement = null;
        }
        this.painelAberto = false;
    }
    
    /**
     * Verifica se painel está aberto
     */
    isAberto() {
        return this.painelAberto;
    }
    
    /**
     * Obtém ícone da categoria do erro
     */
    getCategoriaIcon(mensagem) {
        if (mensagem.includes('ortográfico')) return '📝';
        if (mensagem.includes('gramatical')) return '📚';
        if (mensagem.includes('pontuação')) return '🔖';
        if (mensagem.includes('estilo')) return '🎨';
        return '⚠️';
    }
    
    /**
     * Obtém label do sentimento
     */
    getPolarityLabel(polarity) {
        const labels = {
            'positive': 'Positivo',
            'slightly_positive': 'Levemente positivo',
            'neutral': 'Neutro',
            'slightly_negative': 'Levemente negativo',
            'negative': 'Negativo'
        };
        return labels[polarity] || 'Neutro';
    }
    
    /**
     * Escapa HTML
     */
    escapeHtml(texto) {
        if (!texto) return '';
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }
    
    /**
     * Escapa regex
     */
    escapeRegex(texto) {
        return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}

// Singleton
export const panelUI = new PanelUI();