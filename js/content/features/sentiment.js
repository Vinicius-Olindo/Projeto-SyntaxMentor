// =============================================
// SyntaxMentor - Sentiment Analysis
// Análise de sentimento com detecção de emoções e sugestões
// =============================================

import { configManager } from '../core/config.js';
import { feedbackUI } from '../ui/feedback.js';
import { correctionEngine } from '../core/correction-engine.js';

class SentimentManager {
    constructor() {
        this.isEnabled = true;
        this.lastAnalysis = null;
        this.analysisHistory = [];
        this.maxHistorySize = 20;
        
        // Base de palavras e suas pontuações
        this.wordScores = this.initWordScores();
        
        // Intensificadores
        this.intensifiers = ['muito', 'extremamente', 'super', 'bem', 'bastante', 'tão', 'demais', 'totalmente'];
        
        // Negadores
        this.negations = ['não', 'nunca', 'jamais', 'nem', 'nenhum', 'nada', 'ninguém', 'sem'];
        
        // Padrões de emoção
        this.emotionPatterns = this.initEmotionPatterns();
        
        // Bind dos métodos
        this.analyze = this.analyze.bind(this);
        this.getSuggestions = this.getSuggestions.bind(this);
        this.improveTone = this.improveTone.bind(this);
    }
    
    /**
     * Inicializa base de palavras com scores
     */
    initWordScores() {
        return {
            // Negativas
            'ruim': { score: -0.5, emotion: 'disgust', suggestion: 'insatisfatório' },
            'péssimo': { score: -1, emotion: 'anger', suggestion: 'aquém do esperado' },
            'horrível': { score: -1, emotion: 'anger', suggestion: 'não ideal' },
            'odeio': { score: -0.8, emotion: 'anger', suggestion: 'tenho ressalvas sobre' },
            'detesto': { score: -0.8, emotion: 'anger', suggestion: 'prefiro não' },
            'problema': { score: -0.4, emotion: 'sadness', suggestion: 'desafio' },
            'erro': { score: -0.4, emotion: 'sadness', suggestion: 'oportunidade de melhoria' },
            'falha': { score: -0.5, emotion: 'sadness', suggestion: 'ponto a melhorar' },
            'impossível': { score: -0.7, emotion: 'frustration', suggestion: 'desafiador' },
            'nunca': { score: -0.3, emotion: 'sadness', suggestion: 'ainda não' },
            'triste': { score: -0.6, emotion: 'sadness', suggestion: 'com ressalvas' },
            'chato': { score: -0.4, emotion: 'boredom', suggestion: 'pouco interessante' },
            'cansado': { score: -0.3, emotion: 'tired', suggestion: 'exausto' },
            
            // Positivas
            'ótimo': { score: 0.6, emotion: 'joy', suggestion: 'excelente' },
            'excelente': { score: 0.8, emotion: 'joy', suggestion: 'excelente' },
            'maravilhoso': { score: 0.8, emotion: 'joy', suggestion: 'maravilhoso' },
            'perfeito': { score: 0.7, emotion: 'joy', suggestion: 'perfeito' },
            'incrível': { score: 0.7, emotion: 'surprise', suggestion: 'incrível' },
            'fantástico': { score: 0.7, emotion: 'joy', suggestion: 'fantástico' },
            'bom': { score: 0.4, emotion: 'joy', suggestion: 'bom' },
            'boa': { score: 0.4, emotion: 'joy', suggestion: 'boa' },
            'adorei': { score: 0.7, emotion: 'joy', suggestion: 'adorei' },
            'adoro': { score: 0.6, emotion: 'joy', suggestion: 'adoro' },
            'feliz': { score: 0.6, emotion: 'joy', suggestion: 'feliz' },
            'alegre': { score: 0.5, emotion: 'joy', suggestion: 'alegre' },
            
            // Neutras profissionais
            'analisar': { score: 0.1, emotion: 'neutral', suggestion: 'analisar' },
            'considerar': { score: 0.1, emotion: 'neutral', suggestion: 'considerar' },
            'avaliar': { score: 0.1, emotion: 'neutral', suggestion: 'avaliar' },
            'propor': { score: 0.2, emotion: 'neutral', suggestion: 'propor' },
            'sugerir': { score: 0.2, emotion: 'neutral', suggestion: 'sugerir' },
            'oportunidade': { score: 0.3, emotion: 'optimism', suggestion: 'oportunidade' }
        };
    }
    
    /**
     * Inicializa padrões de emoção
     */
    initEmotionPatterns() {
        return {
            'joy': { icon: '😊', name: 'Alegria', color: '#fbbf24', bg: '#fef3c7' },
            'sadness': { icon: '😔', name: 'Tristeza', color: '#60a5fa', bg: '#eff6ff' },
            'anger': { icon: '😠', name: 'Raiva', color: '#ef4444', bg: '#fee2e2' },
            'fear': { icon: '😨', name: 'Medo', color: '#a855f7', bg: '#f3e8ff' },
            'surprise': { icon: '😲', name: 'Surpresa', color: '#f97316', bg: '#fff7ed' },
            'disgust': { icon: '😖', name: 'Repulsa', color: '#84cc16', bg: '#f7fee7' },
            'frustration': { icon: '😤', name: 'Frustração', color: '#f59e0b', bg: '#fffbeb' },
            'boredom': { icon: '😐', name: 'Tédio', color: '#9ca3af', bg: '#f3f4f6' },
            'tired': { icon: '😫', name: 'Cansaço', color: '#8b5cf6', bg: '#f5f3ff' },
            'optimism': { icon: '🌟', name: 'Otimismo', color: '#10b981', bg: '#ecfdf5' },
            'neutral': { icon: '😐', name: 'Neutro', color: '#6b7280', bg: '#f8f9fa' }
        };
    }
    
    /**
     * Analisa o sentimento de um texto
     * @param {string} text - Texto a ser analisado
     * @returns {Object} Resultado da análise
     */
    analyze(text) {
        if (!text || text.length < 10) {
            return {
                success: false,
                message: 'Texto muito curto para análise (mínimo 10 caracteres)',
                needsMoreText: true
            };
        }
        
        const lowerText = text.toLowerCase();
        const words = lowerText.split(/\s+/);
        
        let totalScore = 0;
        let foundWords = [];
        let issues = [];
        let emotions = {};
        let suggestions = [];
        
        // Analisar palavra por palavra
        for (let i = 0; i < words.length; i++) {
            const word = words[i].replace(/[^a-záéíóúãõâêîôûç]/g, '');
            const nextWord = i + 1 < words.length ? words[i + 1].replace(/[^a-záéíóúãõâêîôûç]/g, '') : '';
            
            if (this.wordScores[word]) {
                const data = this.wordScores[word];
                let score = data.score;
                
                // Verificar intensificador antes
                if (i > 0 && this.intensifiers.includes(words[i - 1])) {
                    score = score * 1.5;
                }
                
                // Verificar negação antes
                let isNegated = false;
                if (i > 0 && this.negations.includes(words[i - 1])) {
                    score = -score * 0.7;
                    isNegated = true;
                }
                if (i > 1 && this.negations.includes(words[i - 2]) && !this.intensifiers.includes(words[i - 1])) {
                    score = -score * 0.7;
                    isNegated = true;
                }
                
                totalScore += score;
                foundWords.push({ word, score, isNegated, emotion: data.emotion });
                
                // Registrar emoção
                emotions[data.emotion] = (emotions[data.emotion] || 0) + 1;
                
                // Criar issue se for negativo e não negado
                if (score < -0.3 && !isNegated) {
                    issues.push({
                        type: 'negative',
                        original: word,
                        suggestion: data.suggestion,
                        position: text.toLowerCase().indexOf(word),
                        score: score,
                        emotion: data.emotion,
                        message: `Palavra de tom negativo: "${word}". Considere usar "${data.suggestion}" para um tom mais neutro.`
                    });
                }
            }
            
            // Detectar padrões de agressividade
            if (this.isAggressivePhrase(word, nextWord)) {
                issues.push({
                    type: 'aggressive',
                    original: word + (nextWord ? ' ' + nextWord : ''),
                    suggestion: 'considerar, sugerir, propor',
                    score: -0.8,
                    emotion: 'anger',
                    message: `Tom agressivo detectado. Use linguagem mais colaborativa como "considerar" ou "sugerir".`
                });
                totalScore -= 0.5;
            }
        }
        
        // Normalizar score (entre -1 e 1)
        const normalizedScore = Math.max(-1, Math.min(1, totalScore / Math.max(words.length / 10, 1)));
        
        // Determinar sentimento principal
        const primaryEmotion = this.getPrimaryEmotion(emotions);
        const emotionInfo = this.emotionPatterns[primaryEmotion] || this.emotionPatterns.neutral;
        
        // Calcular polaridade
        let polarity = 'neutral';
        let polarityColor = '#6b7280';
        let polarityIcon = '😐';
        
        if (normalizedScore < -0.4) {
            polarity = 'negative';
            polarityColor = '#ef4444';
            polarityIcon = '😔';
        } else if (normalizedScore < -0.1) {
            polarity = 'slightly_negative';
            polarityColor = '#f97316';
            polarityIcon = '😕';
        } else if (normalizedScore < 0.15) {
            polarity = 'neutral';
            polarityColor = '#6b7280';
            polarityIcon = '😐';
        } else if (normalizedScore < 0.5) {
            polarity = 'slightly_positive';
            polarityColor = '#10b981';
            polarityIcon = '🙂';
        } else {
            polarity = 'positive';
            polarityColor = '#22c55e';
            polarityIcon = '😊';
        }
        
        // Gerar sugestões de melhoria
        suggestions = this.generateSuggestions(issues, normalizedScore, polarity);
        
        // Gerar resumo
        const summary = this.generateSummary(normalizedScore, polarity, issues.length);
        
        const analysis = {
            success: true,
            score: Math.round(normalizedScore * 100) / 100,
            scorePercent: Math.round((normalizedScore + 1) / 2 * 100),
            polarity: polarity,
            polarityIcon: polarityIcon,
            polarityColor: polarityColor,
            primaryEmotion: primaryEmotion,
            emotionIcon: emotionInfo.icon,
            emotionName: emotionInfo.name,
            emotionColor: emotionInfo.color,
            summary: summary,
            issues: issues,
            suggestions: suggestions,
            stats: {
                totalWords: words.length,
                emotionalWords: foundWords.length,
                negativeCount: issues.filter(i => i.type === 'negative').length,
                aggressiveCount: issues.filter(i => i.type === 'aggressive').length,
                emotions: emotions
            },
            timestamp: Date.now()
        };
        
        // Salvar no histórico
        this.lastAnalysis = analysis;
        this.analysisHistory.unshift(analysis);
        if (this.analysisHistory.length > this.maxHistorySize) {
            this.analysisHistory.pop();
        }
        
        return analysis;
    }
    
    /**
     * Verifica se é uma frase agressiva
     */
    isAggressivePhrase(word, nextWord) {
        const aggressivePhrases = [
            'calma', 'escuta', 'presta atenção', 'você precisa', 'você deve',
            'é obrigatório', 'tem que', 'não adianta', 'para de'
        ];
        
        const fullPhrase = word + (nextWord ? ' ' + nextWord : '');
        return aggressivePhrases.some(phrase => fullPhrase.includes(phrase));
    }
    
    /**
     * Obtém a emoção primária baseada na frequência
     */
    getPrimaryEmotion(emotions) {
        if (Object.keys(emotions).length === 0) return 'neutral';
        
        let maxEmotion = null;
        let maxCount = 0;
        
        for (const [emotion, count] of Object.entries(emotions)) {
            if (count > maxCount) {
                maxCount = count;
                maxEmotion = emotion;
            }
        }
        
        return maxEmotion || 'neutral';
    }
    
    /**
     * Gera sugestões de melhoria
     */
    generateSuggestions(issues, score, polarity) {
        const suggestions = [];
        
        if (issues.length > 0) {
            suggestions.push({
                type: 'vocabulary',
                title: 'Vocabulário',
                description: `Evite ${issues.length} palavra(s) de tom negativo.`,
                action: 'Substitua por alternativas mais neutras.'
            });
        }
        
        if (score < -0.3) {
            suggestions.push({
                type: 'tone',
                title: 'Tom geral',
                description: 'O texto tem um tom predominantemente negativo.',
                action: 'Considere adicionar elementos positivos ou soluções construtivas.'
            });
        }
        
        if (polarity === 'neutral' && issues.length === 0) {
            suggestions.push({
                type: 'engagement',
                title: 'Engajamento',
                description: 'O texto é neutro e objetivo.',
                action: 'Para engajar mais, adicione linguagem mais expressiva e personalizada.'
            });
        }
        
        return suggestions;
    }
    
    /**
     * Gera resumo da análise
     */
    generateSummary(score, polarity, issuesCount) {
        const summaries = {
            positive: '✨ Texto com tom positivo! Continue assim para manter uma comunicação construtiva.',
            slightly_positive: '👍 Texto levemente positivo. Pequenos ajustes podem torná-lo ainda mais impactante.',
            neutral: '📝 Texto neutro e objetivo. Perfeito para comunicações profissionais e imparciais.',
            slightly_negative: '⚠️ Texto com tendência negativa. Considere suavizar o tom para ser mais construtivo.',
            negative: '🔴 Texto com tom negativo. Recomendamos revisar a escolha de palavras para um tom mais profissional.'
        };
        
        let summary = summaries[polarity] || summaries.neutral;
        
        if (issuesCount > 0) {
            summary += ` Foram identificados ${issuesCount} ponto(s) que podem ser melhorados.`;
        }
        
        return summary;
    }
    
    /**
     * Obtém sugestões específicas para melhorar o texto
     */
    getSuggestions(analysis) {
        if (!analysis || !analysis.success) return [];
        
        const suggestions = [];
        
        for (const issue of analysis.issues) {
            suggestions.push({
                original: issue.original,
                suggestion: issue.suggestion,
                type: issue.type,
                score: issue.score,
                message: issue.message
            });
        }
        
        return suggestions;
    }
    
    /**
     * Melhora o tom de um texto aplicando sugestões
     * @param {string} text - Texto original
     * @param {Array} suggestions - Lista de sugestões
     * @returns {Object} Texto melhorado e mudanças aplicadas
     */
    improveTone(text, suggestions) {
        if (!text || !suggestions || suggestions.length === 0) {
            return { improved: text, changes: [] };
        }
        
        let improved = text;
        const changes = [];
        
        suggestions.forEach(suggestion => {
            const regex = new RegExp(`\\b${this.escapeRegex(suggestion.original)}\\b`, 'gi');
            if (regex.test(improved)) {
                improved = improved.replace(regex, suggestion.suggestion);
                changes.push({
                    original: suggestion.original,
                    improved: suggestion.suggestion,
                    reason: suggestion.message
                });
            }
        });
        
        return {
            improved: improved,
            changes: changes,
            hasChanges: changes.length > 0
        };
    }
    
    /**
     * Analisa e sugere melhorias em tempo real para um elemento
     * @param {HTMLElement} element - Elemento a ser analisado
     * @returns {Promise<Object>} Resultado da análise
     */
    async analyzeElement(element) {
        if (!element) return null;
        
        const text = element.value || element.textContent || element.innerText || '';
        const analysis = this.analyze(text);
        
        if (analysis.success && analysis.issues.length > 0) {
            // Adicionar indicador visual
            this.addSentimentIndicator(element, analysis);
        }
        
        return analysis;
    }
    
    /**
     * Adiciona indicador visual de sentimento no elemento
     */
    addSentimentIndicator(element, analysis) {
        // Remover indicador existente
        this.removeSentimentIndicator(element);
        
        if (analysis.polarity === 'negative' || analysis.polarity === 'slightly_negative') {
            const indicator = document.createElement('div');
            indicator.className = 'sm-sentiment-indicator';
            indicator.setAttribute('data-sentiment', analysis.polarity);
            indicator.innerHTML = `
                <span class="sm-sentiment-icon">${analysis.polarityIcon}</span>
                <span class="sm-sentiment-text">Tom ${analysis.polarity === 'negative' ? 'Negativo' : 'Levemente Negativo'}</span>
                <button class="sm-sentiment-fix" title="Melhorar tom">✨ Melhorar</button>
            `;
            
            indicator.style.cssText = `
                position: absolute;
                right: 10px;
                top: -30px;
                background: ${analysis.polarityColor};
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 11px;
                display: flex;
                align-items: center;
                gap: 8px;
                z-index: 2147483646;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                pointer-events: auto;
            `;
            
            const fixBtn = indicator.querySelector('.sm-sentiment-fix');
            fixBtn.addEventListener('click', () => {
                const text = element.value || element.textContent || '';
                const suggestions = this.getSuggestions(analysis);
                const improved = this.improveTone(text, suggestions);
                
                if (improved.hasChanges && improved.improved !== text) {
                    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
                        element.value = improved.improved;
                        correctionEngine.dispararEventosNativos(element);
                    } else if (element.isContentEditable) {
                        element.innerHTML = improved.improved;
                        correctionEngine.atualizarElementoComEventos(element);
                    }
                    feedbackUI.mostrarFeedback('✨ Tom melhorado!', 'success', 2000);
                    indicator.remove();
                }
            });
            
            // Posicionar relativamente ao elemento
            if (element.getBoundingClientRect) {
                const rect = element.getBoundingClientRect();
                indicator.style.position = 'fixed';
                indicator.style.top = `${rect.top - 30}px`;
                indicator.style.left = `${rect.right - 150}px`;
                document.body.appendChild(indicator);
                
                // Remover após 5 segundos
                setTimeout(() => indicator.remove(), 5000);
            }
        }
    }
    
    /**
     * Remove indicador de sentimento
     */
    removeSentimentIndicator(element) {
        const indicators = document.querySelectorAll('.sm-sentiment-indicator');
        indicators.forEach(ind => ind.remove());
    }
    
    /**
     * Escapa regex
     */
    escapeRegex(texto) {
        return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    
    /**
     * Obtém o histórico de análises
     */
    getHistory() {
        return [...this.analysisHistory];
    }
    
    /**
     * Obtém estatísticas de análise
     */
    getStats() {
        if (this.analysisHistory.length === 0) {
            return { total: 0, averageScore: 0, mostCommonEmotion: 'none' };
        }
        
        const total = this.analysisHistory.length;
        const avgScore = this.analysisHistory.reduce((sum, a) => sum + a.score, 0) / total;
        
        const emotions = {};
        this.analysisHistory.forEach(a => {
            emotions[a.primaryEmotion] = (emotions[a.primaryEmotion] || 0) + 1;
        });
        
        let mostCommonEmotion = 'neutral';
        let maxCount = 0;
        for (const [emotion, count] of Object.entries(emotions)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommonEmotion = emotion;
            }
        }
        
        return {
            total,
            averageScore: Math.round(avgScore * 100) / 100,
            mostCommonEmotion,
            emotionInfo: this.emotionPatterns[mostCommonEmotion] || this.emotionPatterns.neutral
        };
    }
    
    /**
     * Limpa o histórico
     */
    clearHistory() {
        this.analysisHistory = [];
        this.lastAnalysis = null;
        feedbackUI.mostrarFeedback('📊 Histórico de análise limpo!', 'info', 1500);
    }
    
    /**
     * Habilita/desabilita o módulo
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        if (!enabled) {
            this.removeAllIndicators();
        }
    }
    
    /**
     * Remove todos os indicadores
     */
    removeAllIndicators() {
        document.querySelectorAll('.sm-sentiment-indicator').forEach(ind => ind.remove());
    }
    
    /**
     * Gera relatório em formato texto
     */
    generateReport() {
        const stats = this.getStats();
        let report = `📊 RELATÓRIO DE SENTIMENTO\n`;
        report += `═'.repeat(40)}\n\n`;
        report += `Total de análises: ${stats.total}\n`;
        report += `Score médio: ${stats.averageScore}\n`;
        report += `Emoção mais comum: ${stats.emotionInfo.name} ${stats.emotionInfo.icon}\n\n`;
        
        if (this.analysisHistory.length > 0) {
            report += `Últimas análises:\n`;
            this.analysisHistory.slice(0, 5).forEach((a, i) => {
                const date = new Date(a.timestamp).toLocaleString();
                report += `${i + 1}. ${date} - Score: ${a.score} (${a.polarity}) - ${a.emotionIcon} ${a.emotionName}\n`;
            });
        }
        
        return report;
    }
}

// Singleton
export const sentimentManager = new SentimentManager();

// Exportar classe para debugging
export { SentimentManager };