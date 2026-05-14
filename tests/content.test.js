// =============================================
// Testes para funções do content.js
// =============================================

describe('verificarPontuacaoComum', () => {
    // Copie a função real do seu content.js
    function verificarPontuacaoComum(texto) {
        const errosPontuacao = [];
        
        const regras = [
            { regex: /\s+\./g, msg: 'Espaço desnecessário antes do ponto final', replace: '.' },
            { regex: /\s+,/g, msg: 'Espaço desnecessário antes da vírgula', replace: ',' },
            { regex: /\.\./g, msg: 'Pontuação duplicada. Use apenas um ponto.', replace: '.' }
        ];
        
        regras.forEach(regra => {
            const matches = texto.match(regra.regex);
            if (matches) {
                matches.forEach(match => {
                    const pos = texto.indexOf(match);
                    if (pos >= 0) {
                        errosPontuacao.push({
                            context: { text: texto, offset: pos, length: match.length },
                            message: regra.msg,
                            replacements: [{ value: typeof regra.replace === 'function' ? regra.replace(match) : regra.replace }],
                            rule: { category: { name: 'Pontuação' } }
                        });
                    }
                });
            }
        });
        
        return errosPontuacao;
    }
    
    test('deve detectar espaço antes do ponto final', () => {
        const texto = 'Isso é um teste .';
        const erros = verificarPontuacaoComum(texto);
        expect(erros.length).toBeGreaterThan(0);
        expect(erros[0].message).toContain('Espaço desnecessário');
    });
    
    test('deve detectar espaço antes da vírgula', () => {
        const texto = 'Olá , mundo';
        const erros = verificarPontuacaoComum(texto);
        expect(erros.length).toBeGreaterThan(0);
    });
    
    test('deve detectar ponto duplicado', () => {
        const texto = 'Isso é um teste..';
        const erros = verificarPontuacaoComum(texto);
        expect(erros.length).toBeGreaterThan(0);
        expect(erros[0].message).toContain('duplicada');
    });
    
    test('texto sem erros de pontuação deve retornar array vazio', () => {
        const texto = 'Isso é um teste normal.';
        const erros = verificarPontuacaoComum(texto);
        expect(erros.length).toBe(0);
    });
});

describe('salvarEstadoParaDesfazer', () => {
    let historicoDesfazer = [];
    const MAX_HISTORICO_DESFAZER = 20;
    
    function salvarEstadoParaDesfazer(elemento, textoOriginal, textoNovo) {
        if (!elemento) return;
        
        historicoDesfazer.push({
            elemento: elemento,
            textoAnterior: textoOriginal,
            textoNovo: textoNovo,
            timestamp: Date.now()
        });
        
        if (historicoDesfazer.length > MAX_HISTORICO_DESFAZER) {
            historicoDesfazer.shift();
        }
    }
    
    beforeEach(() => {
        historicoDesfazer = [];
    });
    
    test('deve adicionar item ao histórico', () => {
        const elemento = { tagName: 'INPUT' };
        salvarEstadoParaDesfazer(elemento, 'erro', 'certo');
        expect(historicoDesfazer.length).toBe(1);
        expect(historicoDesfazer[0].textoAnterior).toBe('erro');
        expect(historicoDesfazer[0].textoNovo).toBe('certo');
    });
    
    test('não deve adicionar se elemento for inválido', () => {
        salvarEstadoParaDesfazer(null, 'erro', 'certo');
        expect(historicoDesfazer.length).toBe(0);
    });
    
    test('deve limitar o histórico ao máximo definido', () => {
        for (let i = 0; i < 25; i++) {
            salvarEstadoParaDesfazer({}, `erro${i}`, `certo${i}`);
        }
        expect(historicoDesfazer.length).toBe(MAX_HISTORICO_DESFAZER);
    });
});