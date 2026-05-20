// =============================================
// SyntaxMentor - Análise de Sentimento v1.0
// Detecta tom do texto e sugere melhorias
// =============================================

const sentimentAnalysis = {
    // Palavras negativas e sugestões positivas
    negativeWords: {
        'ruim': { positive: 'bom', professional: 'insatisfatório', score: -0.5 },
        'péssimo': { positive: 'excelente', professional: 'aquém do esperado', score: -1 },
        'horrível': { positive: 'maravilhoso', professional: 'não ideal', score: -1 },
        'odeio': { positive: 'prefiro', professional: 'tenho ressalvas', score: -0.8 },
        'detesto': { positive: 'gosto mais de', professional: 'tenho objeções', score: -0.8 },
        'problema': { positive: 'desafio', professional: 'oportunidade de melhoria', score: -0.5 },
        'erro': { positive: 'ajuste', professional: 'divergência', score: -0.5 },
        'falha': { positive: 'melhoria', professional: 'não conformidade', score: -0.5 },
        'nunca': { positive: 'ainda não', professional: 'eventualmente', score: -0.3 },
        'impossível': { positive: 'desafiador', professional: 'com dificuldade', score: -0.8 }
    },
    
    // Palavras agressivas (marca texto)
    aggressiveWords: ['calma', 'escuta', 'presta atenção', 'você precisa', 'você deve'],
    
    // Palavras positivas
    positiveWords: ['ótimo', 'excelente', 'maravilhoso', 'perfeito', 'incrível', 'fantástico'],
    
    // Palavras neutras profissionais
    professionalWords: ['analisar', 'considerar', 'avaliar', 'propor', 'sugerir', 'oportunidade'],
    
    // Analisar sentimento do texto
    analyze(text) {
        const lowerText = text.toLowerCase();
        let score = 0;
        const issues = [];
        
        // Verificar palavras negativas
        Object.entries(this.negativeWords).forEach(([word, data]) => {
            if (lowerText.includes(word)) {
                score += data.score;
                issues.push({
                    type: 'negative',
                    original: word,
                    suggestion: data.professional,
                    position: lowerText.indexOf(word),
                    message: `Palavra negativa: "${word}". Sugestão: "${data.professional}"`
                });
            }
        });
        
        // Verificar palavras agressivas
        this.aggressiveWords.forEach(word => {
            if (lowerText.includes(word)) {
                issues.push({
                    type: 'aggressive',
                    original: word,
                    suggestion: 'considerar, sugerir, propor',
                    position: lowerText.indexOf(word),
                    message: `Tom agressivo: "${word}". Sugestão: Use linguagem mais colaborativa`
                });
            }
        });
        
        // Determinar sentimento geral
        let sentiment = 'neutral';
        let sentimentMessage = '';
        
        if (score < -1) {
            sentiment = 'negative';
            sentimentMessage = '⚠️ Tom negativo detectado. Considere uma abordagem mais construtiva.';
        } else if (score < -0.3) {
            sentiment = 'slightly_negative';
            sentimentMessage = '📉 Texto com tendência negativa. Pequenos ajustes podem melhorar o tom.';
        } else if (score > 0.5) {
            sentiment = 'positive';
            sentimentMessage = '✅ Tom positivo! Continue assim.';
        } else if (score > 0) {
            sentiment = 'slightly_positive';
            sentimentMessage = '👍 Tom levemente positivo. Ótimo trabalho!';
        } else {
            sentimentMessage = '📝 Tom neutro. Profissional e objetivo.';
        }
        
        return {
            score: Math.round(score * 100) / 100,
            sentiment,
            message: sentimentMessage,
            issues,
            suggestions: issues.length
        };
    },
    
    // Sugerir reescrita de frase
    suggestRewrite(sentence) {
        let rewritten = sentence;
        const changes = [];
        
        Object.entries(this.negativeWords).forEach(([word, data]) => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            if (regex.test(rewritten)) {
                rewritten = rewritten.replace(regex, data.professional);
                changes.push({
                    original: word,
                    new: data.professional
                });
            }
        });
        
        return rewritten !== sentence ? { rewritten, changes } : null;
    },
    
    // Melhorar tom do texto
    improveTone(text) {
        let improved = text;
        const improvements = [];
        
        Object.entries(this.negativeWords).forEach(([word, data]) => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            if (regex.test(improved)) {
                improved = improved.replace(regex, data.positive);
                improvements.push({
                    original: word,
                    improvement: data.positive,
                    reason: 'Tom mais positivo'
                });
            }
        });
        
        return improvements.length > 0 ? { improved, improvements } : null;
    }
};

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = sentimentAnalysis;
}