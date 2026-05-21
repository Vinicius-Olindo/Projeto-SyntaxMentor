// =============================================
// SyntaxMentor - Correction Engine
// Núcleo da lógica de correção ortográfica e gramatical
// =============================================

import { configManager } from './config.js';
import { queueManager } from './queue-manager.js';
import { feedbackUI } from '../ui/feedback.js';
import { undoManager } from '../features/undo-manager.js';
import { learningManager } from '../features/learning.js';

class CorrectionEngine {
    constructor() {
        this.errosGlobais = [];
        this.elementoGlobal = null;
        this.ignoradosTemporarios = [];
        this.erroMaisComumTemp = {};
        this.currentFetchController = null;
        this.isLoading = false;
        this.atualizarInterfaceCallback = null;
        
        this.REGRAS_IGNORADAS = new Set([
            'UPPERCASE_SENTENCE_START',
            'PUNCTUATION_PARAGRAPH_END',
            'DOUBLE_PUNCTUATION',
            'COMMA_PARENTHESIS_WHITESPACE',
            'EN_QUOTES',
            'DASH_RULE'
        ]);
        
        this.sitesSemGrifos = [
            'mail.google.com', 'linkedin.com', 'docs.google.com', 
            'notion.so', 'twitter.com', 'x.com'
        ];
    }
    
    isSiteRestrito() {
        return this.sitesSemGrifos.some(d => window.location.hostname.includes(d));
    }
    
    escapeHtml(texto) {
        if (!texto) return '';
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }
    
    verificarPontuacaoComum(texto) {
        const errosPontuacao = [];
        
        const regras = [
            { regex: /\s+(?=[.,;:](?!\.{2}))/g, msg: 'Espaço desnecessário antes da pontuação', replace: '' },
            { regex: /(?<!\.)\.{2}(?!\.)/g, msg: 'Pontuação duplicada. Use apenas um ponto ou reticências (...).', replace: '.' },
            { regex: /,([a-zA-Zà-úÀ-Ú])/g, msg: 'Falta um espaço após a vírgula', replace: (m, p1) => ', ' + p1 },
            { regex: /([!?])([a-zA-Zà-úÀ-Ú])/g, msg: 'Falta um espaço após o sinal', replace: (m, p1, p2) => p1 + ' ' + p2 }
        ];
        
        regras.forEach(regra => {
            const re = new RegExp(regra.regex.source, regra.regex.flags.includes('g') ? regra.regex.flags : regra.regex.flags + 'g');
            let match;
            while ((match = re.exec(texto)) !== null) {
                const pos = match.index;
                const len = match[0].length;
                const corrigido = typeof regra.replace === 'function' ? regra.replace(match[0], ...match.slice(1)) : regra.replace;
                errosPontuacao.push({
                    context: { text: texto, offset: pos, length: len },
                    message: regra.msg,
                    replacements: [{ value: corrigido }],
                    rule: { id: 'LOCAL_PUNCTUATION', category: { name: 'Pontuação' } }
                });
                if (len === 0) re.lastIndex++;
            }
        });
        
        return errosPontuacao;
    }
    
    processarPontuacao(matches) {
        if (!matches || matches.length === 0) return matches;
        
        return matches.map(match => {
            const novoMatch = { ...match };
            const original = match.context.text.substr(match.context.offset, match.context.length);
            const palavraLimpa = original.replace(/^[.,;:!?¿¡"''()\[\]{}…\-—–\s]+/, '').replace(/[.,;:!?¿¡"''()\[\]{}…\-—–\s]+$/, '');
            
            if (palavraLimpa !== original && palavraLimpa.length > 0) {
                const pontuacaoInicio = original.indexOf(palavraLimpa);
                const novoOffset = match.context.offset + pontuacaoInicio;
                novoMatch.offset = (match.offset || 0) + pontuacaoInicio;
                novoMatch.length = palavraLimpa.length;
                novoMatch.context = {
                    ...match.context,
                    offset: novoOffset,
                    length: palavraLimpa.length
                };
            }
            
            return novoMatch;
        });
    }
    
    filtrarErros(matches, dicCache) {
        return matches.filter(m => {
            if (!m.replacements?.length) return false;
            
            const ruleId = m.rule?.id || '';
            if (this.REGRAS_IGNORADAS.has(ruleId)) return false;
            
            const o = m.context.text.substr(m.context.offset, m.context.length);
            if (!o.trim()) return false;
            
            const ol = o.toLowerCase();
            
            if (ol.match(/^[0-9]+$/) || ol.match(/^https?:\/\//)) return false;
            
            if (o.trim()) {
                this.erroMaisComumTemp[ol] = (this.erroMaisComumTemp[ol] || 0) + 1;
                this.registrarErroPorSite(ol);
            }
            
            return !dicCache.includes(ol) && !this.ignoradosTemporarios.includes(ol);
        });
    }
    
    registrarErroPorSite(palavra) {
        const host = window.location.hostname;
        
        chrome.storage.local.get({ erroMaisComum: {}, estatisticasPorSite: {} }, (res) => {
            const global = res.erroMaisComum || {};
            global[palavra] = (global[palavra] || 0) + 1;
            
            const porSite = res.estatisticasPorSite || {};
            if (!porSite[host]) {
                porSite[host] = { erros: {}, corrigidas: 0, aceitas: 0, recusadas: 0 };
            }
            porSite[host].erros[palavra] = (porSite[host].erros[palavra] || 0) + 1;
            
            chrome.storage.local.set({ erroMaisComum: global, estatisticasPorSite: porSite });
        });
    }
    
    aplicarGrifos(erros, el) {
        if (!el?.isContentEditable || this.isSiteRestrito()) return;
        if (!erros || erros.length === 0) return;
        
        window._isExtensaoMutando = true;
        
        try {
            const marksExistentes = el.querySelectorAll('mark.sm-highlight');
            marksExistentes.forEach(mark => {
                const parent = mark.parentNode;
                const texto = document.createTextNode(mark.textContent);
                parent.replaceChild(texto, mark);
                parent.normalize();
            });
            
            const palavras = [...new Set(erros.map(e => 
                e.context.text.substr(e.context.offset, e.context.length)
            ).filter(Boolean))];
            
            if (palavras.length === 0) return;
            
            const regexPalavras = new RegExp(`\\b(${palavras.map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
            
            const walker = document.createTreeWalker(
                el,
                NodeFilter.SHOW_TEXT,
                {
                    acceptNode: function(node) {
                        if (node.parentElement?.closest?.('mark.sm-highlight, script, style')) {
                            return NodeFilter.FILTER_REJECT;
                        }
                        if (node.textContent && node.textContent.trim().length > 0) {
                            return NodeFilter.FILTER_ACCEPT;
                        }
                        return NodeFilter.FILTER_SKIP;
                    }
                }
            );
            
            const nodesToReplace = [];
            while (walker.nextNode()) {
                nodesToReplace.push(walker.currentNode);
            }
            
            nodesToReplace.forEach(node => {
                const texto = node.textContent;
                if (!regexPalavras.test(texto)) return;
                
                regexPalavras.lastIndex = 0;
                
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                let match;
                
                while ((match = regexPalavras.exec(texto)) !== null) {
                    if (match.index > lastIndex) {
                        fragment.appendChild(document.createTextNode(texto.substring(lastIndex, match.index)));
                    }
                    
                    const mark = document.createElement('mark');
                    mark.className = 'sm-highlight';
                    mark.textContent = match[0];
                    fragment.appendChild(mark);
                    
                    lastIndex = match.index + match[0].length;
                }
                
                if (lastIndex < texto.length) {
                    fragment.appendChild(document.createTextNode(texto.substring(lastIndex)));
                }
                
                node.parentNode.replaceChild(fragment, node);
            });
        } finally {
            window._isExtensaoMutando = false;
        }
    }
    
    async verificarTexto(texto, elemento) {
        if (configManager.get('disabled')) return;
        
        if (this.currentFetchController) {
            this.currentFetchController.abort();
        }
        
        this.currentFetchController = new AbortController();
        const signal = this.currentFetchController.signal;
        
        this.isLoading = true;
        this.atualizarEstadoCarregamento(true);
        
        const url = configManager.get('apiUrl') || 'https://api.languagetool.org/v2/check';
        const params = new URLSearchParams({
            text: texto,
            language: configManager.get('language')
        });
        
        if (configManager.get('pickyMode')) params.set('level', 'picky');
        
        if (elemento._smModoVoz) {
            params.set('enabledRules', 'UPPERCASE_SENTENCE_START,PUNCTUATION_PARAGRAPH_END,COMMA_PARENTHESIS_WHITESPACE,PT_QUESTION_MARK');
            params.set('enabledOnly', 'false');
            params.set('disabledCategories', 'TYPOS');
        }
        
        const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
        const apiKey = configManager.get('apiKey');
        if (apiKey?.trim()) headers['Authorization'] = `Bearer ${apiKey.trim()}`;
        
        const timeoutId = setTimeout(() => {
            if (this.currentFetchController) this.currentFetchController.abort();
        }, 15000);
        
        try {
            if (signal.aborted) throw new Error('AbortError');
            
            const resp = await fetch(url, { method: 'POST', headers, body: params, signal });
            clearTimeout(timeoutId);
            
            if (!resp.ok) {
                let errorMsg = `HTTP ${resp.status}`;
                if (resp.status === 401) errorMsg = 'API Key inválida - Verifique suas configurações';
                if (resp.status === 429) errorMsg = 'Muitas requisições - Aguarde um momento';
                throw new Error(errorMsg);
            }
            
            const data = await resp.json();
            
            if (signal.aborted) throw new Error('AbortError');
            
            const atual = (elemento.value || elemento.textContent || elemento.innerText || '').trim();
            if (atual !== texto) throw new Error('TextChanged');
            
            const matchesProcessados = this.processarPontuacao(data.matches || []);
            const errosPontuacaoLocal = this.verificarPontuacaoComum(texto);
            const todosMatches = [...matchesProcessados, ...errosPontuacaoLocal];
            
            const dicCache = configManager.dicCache;
            this.errosGlobais = this.filtrarErros(todosMatches, dicCache);
            
            this.elementoGlobal = elemento;
            
            if (!this.isSiteRestrito() && elemento.isContentEditable && 
                elemento.tagName !== 'TEXTAREA' && elemento.tagName !== 'INPUT') {
                this.aplicarGrifos(this.errosGlobais, elemento);
            }
            
            if (this.atualizarInterfaceCallback) this.atualizarInterfaceCallback();
            
            return this.errosGlobais;
            
        } catch (err) {
            if (err.name === 'AbortError' || err.message === 'AbortError') {
                return null;
            }
            if (err.message === 'TextChanged') {
                return null;
            }
            
            console.warn('SyntaxMentor API Error:', err.message);
            
            let mensagemErro = '⚠️ Erro de conexão com o servidor';
            if (err.message.includes('API Key inválida')) {
                mensagemErro = '🔑 API Key inválida - Verifique suas configurações';
            } else if (err.message.includes('Muitas requisições')) {
                mensagemErro = '⏳ Muitas correções seguidas - Aguarde alguns segundos';
            } else if (err.message.includes('Failed to fetch')) {
                mensagemErro = '🌐 Sem conexão com a internet - Verifique sua rede';
            }
            
            feedbackUI.mostrarFeedback(mensagemErro, 'error');
            return null;
            
        } finally {
            this.isLoading = false;
            this.atualizarEstadoCarregamento(false);
            if (this.currentFetchController?.signal === signal) {
                this.currentFetchController = null;
            }
        }
    }
    
    atualizarEstadoCarregamento(on) {
        const bubble = document.getElementById('syntax-mentor-bubble');
        if (bubble) {
            bubble.style.opacity = on ? '0.6' : '1';
            bubble.style.cursor = on ? 'wait' : 'grab';
        }
    }
    
    aplicarCorrecao(original, sugestao, el, pularConfirmacao = false) {
        if (!el || !original || !sugestao) return;
        
        const executarCorrecao = () => {
            const esc = original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
                const valorAntigo = el.value;
                el.value = el.value.replace(new RegExp(`(?<![\\p{L}])${esc}(?![\\p{L}])`, 'gu'), sugestao);
                
                if (el.value !== valorAntigo) {
                    undoManager.saveState(el, original, sugestao, {
                        ruleId: 'correction',
                        category: 'Correção Gramatical'
                    });
                    this.dispararEventosNativos(el);
                    setTimeout(() => {
                        el.blur();
                        el.focus();
                        this.dispararEventosNativos(el);
                    }, 100);
                }
            } else if (el.isContentEditable) {
                let html = el.innerHTML;
                const markRegex = new RegExp(`<mark class="sm-highlight">${esc}</mark>`, 'g');
                
                if (markRegex.test(html)) {
                    html = html.replace(markRegex, `<span class="sm-correction-feedback">${sugestao}</span>`);
                } else {
                    html = html.replace(new RegExp(`(?<!<[^>]*)(?<![\\p{L}])${esc}(?![\\p{L}])(?![^<]*>)`, 'gu'), 
                        `<span class="sm-correction-feedback">${sugestao}</span>`);
                }
                
                if (html !== el.innerHTML) {
                    undoManager.saveState(el, original, sugestao, {
                        ruleId: 'correction',
                        category: 'Correção Gramatical'
                    });
                    el.innerHTML = html;
                    
                    const elementoCorrigido = el.querySelector('.sm-correction-feedback');
                    if (elementoCorrigido) {
                        setTimeout(() => {
                            const span = elementoCorrigido;
                            const parent = span.parentNode;
                            if (parent) {
                                const texto = document.createTextNode(span.textContent);
                                parent.replaceChild(texto, span);
                                parent.normalize();
                            }
                        }, 500);
                    }
                }
                this.atualizarElementoComEventos(el);
            }
            
            this.removerErroGlobal(original);
            const olOriginal = original.toLowerCase();
            if (!this.ignoradosTemporarios.includes(olOriginal)) {
                this.ignoradosTemporarios.push(olOriginal);
                setTimeout(() => {
                    this.ignoradosTemporarios = this.ignoradosTemporarios.filter(p => p !== olOriginal);
                }, 5000);
            }
            
            this.incrementarStats(1);
            
            feedbackUI.mostrarFeedback(`✓ "${original}" → "${sugestao}"`, 'success', 1500);
            
            const bubble = document.getElementById('syntax-mentor-bubble');
            if (bubble) {
                bubble.classList.add('sm-bubble-correction');
                setTimeout(() => bubble.classList.remove('sm-bubble-correction'), 300);
            }
            
            // Modo aprendizado
            if (learningManager.isActive) {
                const erroEncontrado = this.errosGlobais.find(e => {
                    const o = e.context.text.substr(e.context.offset, e.context.length);
                    return o === original;
                });
                if (erroEncontrado) {
                    setTimeout(() => {
                        learningManager.showExplanation(original, sugestao, erroEncontrado);
                    }, 500);
                }
            }
        };
        
        if (pularConfirmacao || !configManager.get('modoConfirmacao')) {
            executarCorrecao();
        } else {
            this.confirmarCorrecao(original, sugestao, (confirmado) => {
                if (confirmado) executarCorrecao();
            });
        }
    }
    
    confirmarCorrecao(original, sugestao, callback) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 2147483646;
            display: flex; align-items: center; justify-content: center;
        `;
        
        const dialog = document.createElement('div');
        const isDark = configManager.get('darkMode');
        dialog.style.cssText = `
            background: ${isDark ? '#1a1a1a' : 'white'};
            color: ${isDark ? '#e0e0e0' : 'inherit'};
            border-radius: 12px; padding: 24px; max-width: 420px; width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        `;
        
        dialog.innerHTML = `
            <h3 style="margin:0 0 12px;font-size:16px;">Confirmar Correção</h3>
            <p style="margin:0 0 16px;font-size:14px;line-height:1.5;">
                Corrigir <strong style="color:#e53e3e;text-decoration:line-through;">${this.escapeHtml(original)}</strong> 
                para <strong style="color:#28a745;">${this.escapeHtml(sugestao)}</strong>?
            </p>
            <div style="display:flex;gap:8px;justify-content:flex-end;">
                <button class="sm-dlg-cancel" style="background:#f3f4f6;border:1px solid #d1d5db;color:#374151;padding:8px 16px;border-radius:6px;cursor:pointer;">Não</button>
                <button class="sm-dlg-confirm" style="background:linear-gradient(135deg,#6f42c1,#8b5cf6);border:none;color:white;padding:8px 16px;border-radius:6px;cursor:pointer;">Sim, corrigir</button>
            </div>
        `;
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        dialog.querySelector('.sm-dlg-confirm').onclick = () => {
            overlay.remove();
            callback(true);
        };
        
        dialog.querySelector('.sm-dlg-cancel').onclick = () => {
            overlay.remove();
            callback(false);
        };
        
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
                callback(false);
            }
        };
    }
    
    dispararEventosNativos(elemento) {
        if (!elemento) return;
        
        const start = elemento.selectionStart;
        const end = elemento.selectionEnd;
        const valor = elemento.value;
        
        const eventos = [
            new Event('input', { bubbles: true }),
            new Event('change', { bubbles: true }),
            new InputEvent('input', { bubbles: true, inputType: 'insertText', data: valor }),
            new FocusEvent('blur', { bubbles: true }),
            new FocusEvent('focus', { bubbles: true })
        ];
        
        eventos.forEach(evt => {
            try { elemento.dispatchEvent(evt); } catch (e) {}
        });
        
        try { elemento.setSelectionRange(start, end); } catch (e) {}
    }
    
    atualizarElementoComEventos(elemento) {
        if (!elemento) return;
        
        const eventos = [
            new Event('input', { bubbles: true }),
            new Event('change', { bubbles: true }),
            new FocusEvent('blur', { bubbles: true }),
            new FocusEvent('focus', { bubbles: true })
        ];
        
        eventos.forEach(evt => {
            try { elemento.dispatchEvent(evt); } catch (e) {}
        });
        
        elemento.focus();
        setTimeout(() => {
            elemento.blur();
            elemento.focus();
        }, 50);
    }
    
    removerErroGlobal(original) {
        this.errosGlobais = this.errosGlobais.filter(err => {
            const o = err.context.text.substr(err.context.offset, err.context.length);
            return o !== original;
        });
        if (this.atualizarInterfaceCallback) this.atualizarInterfaceCallback();
    }
    
    corrigirTudo() {
        if (!this.elementoGlobal) return;
        
        const unicos = {};
        this.errosGlobais.forEach(err => {
            const o = err.context.text.substr(err.context.offset, err.context.length);
            const s = err.replacements[0]?.value || "";
            if (o.trim() && s && !unicos[o]) unicos[o] = s;
        });
        
        const correcoes = Object.entries(unicos);
        if (correcoes.length === 0) return;
        
        const actions = [];
        correcoes.forEach(([o, s]) => {
            actions.push({
                originalText: o,
                correctedText: s,
                element: this.elementoGlobal
            });
            this.aplicarCorrecao(o, s, this.elementoGlobal, true);
        });
        
        undoManager.saveGroupState(actions, 'Correção em lote');
        
        this.errosGlobais = [];
        if (this.atualizarInterfaceCallback) this.atualizarInterfaceCallback();
        feedbackUI.mostrarFeedback(`✓ ${correcoes.length} correção(ões) aplicada(s)!`, 'success');
    }
    
    ignorarTemporariamente(palavra) {
        const pl = palavra.toLowerCase();
        if (!this.ignoradosTemporarios.includes(pl)) {
            this.ignoradosTemporarios.push(pl);
        }
        
        if (!this.isSiteRestrito() && this.elementoGlobal?.isContentEditable) {
            const esc = palavra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            this.elementoGlobal.innerHTML = this.elementoGlobal.innerHTML.replace(
                new RegExp(`<mark class="sm-highlight">${esc}</mark>`, 'g'), 
                palavra
            );
            this.atualizarElementoComEventos(this.elementoGlobal);
        }
        
        this.removerErroGlobal(palavra);
        feedbackUI.mostrarFeedback(`"${palavra}" ignorada nesta sessão`, 'info');
    }
    
    incrementarStats(qtd) {
        chrome.storage.local.get({ totalCorrigidas: 0 }, (res) => {
            const novoTotal = (res.totalCorrigidas || 0) + qtd;
            chrome.storage.local.set({ totalCorrigidas: novoTotal });
        });
    }
    
    onInterfaceUpdate(callback) {
        this.atualizarInterfaceCallback = callback;
    }
    
    getErrors() {
        return [...this.errosGlobais];
    }
    
    getCurrentElement() {
        return this.elementoGlobal;
    }
    
    clear() {
        this.errosGlobais = [];
        this.ignoradosTemporarios = [];
        this.erroMaisComumTemp = {};
        if (this.currentFetchController) {
            this.currentFetchController.abort();
            this.currentFetchController = null;
        }
        this.isLoading = false;
    }
}

export const correctionEngine = new CorrectionEngine();