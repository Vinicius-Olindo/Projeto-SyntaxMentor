// =============================================
// Testes para funções do content.js — v2.7.1
// =============================================

// ── verificarPontuacaoComum ──────────────────
describe('verificarPontuacaoComum', () => {
    function verificarPontuacaoComum(texto) {
        const errosPontuacao = [];
        const regras = [
            { regex: /\s+(?=[.,;:](?!\.{2}))/g, msg: 'Espaço desnecessário antes da pontuação', replace: '' },
            { regex: /(?<!\.)\.{2}(?!\.)/g, msg: 'Pontuação duplicada. Use apenas um ponto ou reticências (...).', replace: '.' },
            { regex: /,([a-zA-ZÀ-úÀ-Ú])/g, msg: 'Falta um espaço após a vírgula', replace: (m, p1) => ', ' + p1 },
            { regex: /([!?])([a-zA-ZÀ-úÀ-Ú])/g, msg: 'Falta um espaço após o sinal', replace: (m, p1, p2) => p1 + ' ' + p2 }
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

    test('detecta espaço antes da pontuação', () => {
        const erros = verificarPontuacaoComum('Isso é um teste .');
        expect(erros.length).toBeGreaterThan(0);
        expect(erros[0].message).toContain('Espaço desnecessário');
    });

    test('detecta espaço antes da vírgula', () => {
        expect(verificarPontuacaoComum('Olá , mundo').length).toBeGreaterThan(0);
    });

    test('detecta ponto duplicado', () => {
        const erros = verificarPontuacaoComum('Isso é um teste..');
        expect(erros.length).toBeGreaterThan(0);
        expect(erros[0].message).toContain('duplicada');
    });

    test('NAO flagra reticencias (...)', () => {
        const pontDup = verificarPontuacaoComum('Espere...').filter(e => e.message.includes('duplicada'));
        expect(pontDup.length).toBe(0);
    });

    test('detecta multiplas ocorrencias na posicao exata', () => {
        const texto = 'Erro aqui.. e outro..';
        const erros = verificarPontuacaoComum(texto).filter(e => e.message.includes('duplicada'));
        expect(erros.length).toBe(2);
        expect(erros[0].context.offset).toBe(9);
        expect(erros[1].context.offset).toBe(19);
    });

    test('detecta falta de espaço após vírgula', () => {
        const erros = verificarPontuacaoComum('bom,dia');
        expect(erros.length).toBeGreaterThan(0);
        expect(erros[0].replacements[0].value).toBe(', dia');
    });

    test('texto sem erros retorna array vazio', () => {
        expect(verificarPontuacaoComum('Isso é um teste normal.').length).toBe(0);
    });
});

// ── processarPontuacao ───────────────────────
describe('processarPontuacao', () => {
    function processarPontuacao(matches) {
        if (!matches || matches.length === 0) return matches;
        return matches.map(match => {
            const novoMatch = { ...match };
            const original = match.context.text.substr(match.context.offset, match.context.length);
            const palavraLimpa = original.replace(/^[.,;:!?\s]+/, '').replace(/[.,;:!?\s]+$/, '');
            if (palavraLimpa !== original && palavraLimpa.length > 0) {
                const pontuacaoInicio = original.indexOf(palavraLimpa);
                novoMatch.offset = (match.offset || 0) + pontuacaoInicio;
                novoMatch.length = palavraLimpa.length;
                novoMatch.context = { ...match.context, offset: match.context.offset + pontuacaoInicio, length: palavraLimpa.length };
            }
            return novoMatch;
        });
    }

    test('sincroniza offset e length ao remover pontuacao', () => {
        const match = { offset: 0, length: 7, context: { text: ',erro,.', offset: 0, length: 7 }, replacements: [{ value: 'certo' }], message: 'Erro' };
        const [r] = processarPontuacao([match]);
        expect(r.length).toBe(4);
        expect(r.offset).toBe(1);
    });

    test('nao altera match sem pontuacao nas bordas', () => {
        const match = { offset: 0, length: 5, context: { text: 'teste', offset: 0, length: 5 }, replacements: [{ value: 'certo' }], message: 'Erro' };
        const [r] = processarPontuacao([match]);
        expect(r.offset).toBe(0);
        expect(r.length).toBe(5);
    });

    test('retorna array vazio se input vazio', () => {
        expect(processarPontuacao([])).toEqual([]);
    });
});

// ── salvarEstadoParaDesfazer ─────────────────
describe('salvarEstadoParaDesfazer', () => {
    let historicoDesfazer = [];
    const MAX = 20;

    function salvarEstadoParaDesfazer(elemento, textoOriginal, textoNovo) {
        if (!elemento) return;
        historicoDesfazer.push({ elemento, textoAnterior: textoOriginal, textoNovo, timestamp: Date.now() });
        if (historicoDesfazer.length > MAX) historicoDesfazer.shift();
    }

    beforeEach(() => { historicoDesfazer = []; });

    test('adiciona item ao historico', () => {
        salvarEstadoParaDesfazer({}, 'erro', 'certo');
        expect(historicoDesfazer[0].textoAnterior).toBe('erro');
    });

    test('nao adiciona se elemento for invalido', () => {
        salvarEstadoParaDesfazer(null, 'erro', 'certo');
        expect(historicoDesfazer.length).toBe(0);
    });

    test('limita historico ao maximo e mantem mais recente', () => {
        for (let i = 0; i < 25; i++) salvarEstadoParaDesfazer({}, `e${i}`, `c${i}`);
        expect(historicoDesfazer.length).toBe(MAX);
        expect(historicoDesfazer[MAX - 1].textoAnterior).toBe('e24');
    });
});

// ── filtro de erros (REGRAS_IGNORADAS) ───────
describe('filtro de erros', () => {
    const REGRAS_IGNORADAS = new Set(['UPPERCASE_SENTENCE_START','PUNCTUATION_PARAGRAPH_END','DOUBLE_PUNCTUATION','COMMA_PARENTHESIS_WHITESPACE','EN_QUOTES','DASH_RULE']);

    function filtrar(matches, dic = [], ignorados = []) {
        return matches.filter(m => {
            if (!m.replacements?.length) return false;
            if (REGRAS_IGNORADAS.has(m.rule?.id || '')) return false;
            const o = m.context.text.substr(m.context.offset, m.context.length);
            if (!o.trim()) return false;
            const ol = o.toLowerCase();
            if (ol.match(/^[0-9]+$/) || ol.match(/^https?:\/\//)) return false;
            return !dic.includes(ol) && !ignorados.includes(ol);
        });
    }

    test('remove matches sem sugestoes', () => {
        expect(filtrar([{ replacements: [], rule: { id: 'X' }, context: { text: 'a', offset: 0, length: 1 } }]).length).toBe(0);
    });

    test('remove regras ignoradas', () => {
        expect(filtrar([{ replacements: [{ value: 'X' }], rule: { id: 'UPPERCASE_SENTENCE_START' }, context: { text: 'teste', offset: 0, length: 5 } }]).length).toBe(0);
    });

    test('remove palavras do dicionario pessoal', () => {
        expect(filtrar([{ replacements: [{ value: 'x' }], rule: { id: 'RULE' }, context: { text: 'SyntaxMentor', offset: 0, length: 12 } }], ['syntaxmentor']).length).toBe(0);
    });

    test('remove numeros puros', () => {
        expect(filtrar([{ replacements: [{ value: 'x' }], rule: { id: 'R' }, context: { text: '2024', offset: 0, length: 4 } }]).length).toBe(0);
    });

    test('mantem erros validos', () => {
        expect(filtrar([{ replacements: [{ value: 'programação' }], rule: { id: 'MORFOLOGIK_RULE_PT_BR' }, context: { text: 'programaçao', offset: 0, length: 11 } }]).length).toBe(1);
    });
});