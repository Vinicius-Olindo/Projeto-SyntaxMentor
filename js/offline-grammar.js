// =============================================
// SyntaxMentor - Modo Offline v1.0
// Corretor gramatical básico para uso offline
// =============================================

const offlineGrammar = {
    // Dicionário de erros comuns em português
    commonErrors: {
        'mais': { correct: 'mas', context: 'conjunção adversativa' },
        'mas': { correct: 'mais', context: 'quantidade' },
        'traz': { correct: 'trás', context: 'preposição' },
        'trás': { correct: 'traz', context: 'verbo trazer' },
        'atraz': { correct: 'atrás', context: 'posição' },
        'de traz': { correct: 'detrás', context: 'posição' },
        'comcerteza': { correct: 'com certeza', context: 'expressão' },
        'concerteza': { correct: 'com certeza', context: 'expressão' },
        'mas': { correct: 'mais', context: 'quantidade' },
        'agente': { correct: 'a gente', context: 'nós' },
        'gente': { correct: 'agente', context: 'pessoa que age' },
        'ao inves': { correct: 'em vez', context: 'substituição' },
        'a muito': { correct: 'há muito', context: 'tempo passado' },
        'a tras': { correct: 'atrás', context: 'posição' },
        'de traz': { correct: 'detrás', context: 'posição' }
    },
    
    // Regras de pontuação
    punctuationRules: [
        { pattern: /\s+\./g, replacement: '.', message: 'Espaço antes do ponto final' },
        { pattern: /\s+,/g, replacement: ',', message: 'Espaço antes da vírgula' },
        { pattern: /\.\./g, replacement: '.', message: 'Ponto duplicado' },
        { pattern: / ,/g, replacement: ',', message: 'Espaço antes da vírgula' },
        { pattern: / \./g, replacement: '.', message: 'Espaço antes do ponto' }
    ],
    
    // Verificar texto offline
    check(texto) {
        const erros = [];
        const palavras = texto.toLowerCase().split(/\s+/);
        
        // Verificar erros comuns
        Object.entries(this.commonErrors).forEach(([errado, info]) => {
            const regex = new RegExp(`\\b${errado}\\b`, 'gi');
            let match;
            while ((match = regex.exec(texto)) !== null) {
                erros.push({
                    original: match[0],
                    sugestao: info.correct,
                    contexto: info.context,
                    position: match.index,
                    length: errado.length
                });
            }
        });
        
        // Verificar pontuação
        this.punctuationRules.forEach(rule => {
            const matches = texto.match(rule.pattern);
            if (matches) {
                matches.forEach(match => {
                    const pos = texto.indexOf(match);
                    erros.push({
                        original: match,
                        sugestao: rule.replacement,
                        message: rule.message,
                        position: pos,
                        length: match.length
                    });
                });
            }
        });
        
        return erros;
    },
    
    // Sugerir correção
    suggest(word) {
        const lowerWord = word.toLowerCase();
        if (this.commonErrors[lowerWord]) {
            return this.commonErrors[lowerWord].correct;
        }
        
        // Sugestões por similaridade (Levenshtein simples)
        const similar = Object.keys(this.commonErrors).filter(key => {
            const distance = this.levenshteinDistance(lowerWord, key);
            return distance <= 2 && distance > 0;
        });
        
        if (similar.length > 0) {
            return this.commonErrors[similar[0]].correct;
        }
        
        return null;
    },
    
    // Distância de Levenshtein para sugestões
    levenshteinDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                const cost = a[j - 1] === b[i - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        return matrix[b.length][a.length];
    }
};

// Exportar para uso
if (typeof module !== 'undefined' && module.exports) {
    module.exports = offlineGrammar;
}