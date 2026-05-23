// =============================================
// SyntaxMentor - Testes Manuais
// Execute com: node tests/run-tests.js
// =============================================

console.log('\n🧪 Executando testes do SyntaxMentor...\n');

// =============================================
// Função 1: escapeHtml
// =============================================
function escapeHtml(texto) {
    if (!texto) return '';
    const div = { textContent: '' };
    div.textContent = texto;
    return div.textContent;
    // Nota: Versão simplificada para teste em Node
}

// Versão real para teste
function escapeHtmlReal(texto) {
    if (!texto) return '';
    return texto
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// =============================================
// Função 2: verificarPontuacaoComum
// =============================================
function verificarPontuacaoComum(texto) {
    const errosPontuacao = [];
    
    const regras = [
        { regex: /\s+\./g, msg: 'Espaço desnecessário antes do ponto final', replace: '.' },
        { regex: /\s+,/g, msg: 'Espaço desnecessário antes da vírgula', replace: ',' },
        { regex: /\.\./g, msg: 'Pontuação duplicada. Use apenas um ponto.', replace: '.' },
        { regex: /,([a-zA-Zà-úÀ-Ú])/g, msg: 'Falta um espaço após a vírgula', replace: (m, p1) => ', ' + p1 },
        { regex: /([!?])([a-zA-Zà-úÀ-Ú])/g, msg: 'Falta um espaço após o sinal', replace: (m, p1, p2) => p1 + ' ' + p2 }
    ];
    
    regras.forEach(regra => {
        const regex = new RegExp(regra.regex);
        const matches = texto.match(regex);
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

// =============================================
// Função 3: processarPontuacao
// =============================================
function processarPontuacao(matches) {
    if (!matches || matches.length === 0) return matches;
    
    return matches.map(match => {
        const novoMatch = { ...match };
        const original = match.context.text.substr(match.context.offset, match.context.length);
        const palavraLimpa = original.replace(/^[.,;:!?¿¡"''()\[\]{}…\-—–\s]+/, '').replace(/[.,;:!?¿¡"''()\[\]{}…\-—–\s]+$/, '');
        
        if (palavraLimpa !== original) {
            const pontuacaoInicio = original.indexOf(palavraLimpa);
            novoMatch.context = {
                ...match.context,
                offset: match.context.offset + pontuacaoInicio,
                length: palavraLimpa.length
            };
        }
        
        return novoMatch;
    });
}

// =============================================
// EXECUTAR TESTES
// =============================================

let passaram = 0;
let falharam = 0;

// Teste 1: escapeHtml
console.log('📝 Testando escapeHtml...');
const test1 = escapeHtmlReal('<script>alert("xss")</script>') === '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;';
if (test1) {
    console.log('   ✅ escapeHtml - PASSOU');
    passaram++;
} else {
    console.log('   ❌ escapeHtml - FALHOU');
    falharam++;
}

// Teste 2: escapeHtml com texto normal
const test2 = escapeHtmlReal('texto normal') === 'texto normal';
if (test2) {
    console.log('   ✅ escapeHtml (texto normal) - PASSOU');
    passaram++;
} else {
    console.log('   ❌ escapeHtml (texto normal) - FALHOU');
    falharam++;
}

// Teste 3: verificarPontuacaoComum - espaço antes do ponto
console.log('\n📝 Testando verificarPontuacaoComum...');
const erros1 = verificarPontuacaoComum('Isso é um teste .');
const test3 = erros1.length > 0 && erros1[0].message.includes('Espaço');
if (test3) {
    console.log('   ✅ Espaço antes do ponto - PASSOU');
    passaram++;
} else {
    console.log('   ❌ Espaço antes do ponto - FALHOU');
    falharam++;
}

// Teste 4: verificarPontuacaoComum - espaço antes da vírgula
const erros2 = verificarPontuacaoComum('Olá , mundo');
const test4 = erros2.length > 0;
if (test4) {
    console.log('   ✅ Espaço antes da vírgula - PASSOU');
    passaram++;
} else {
    console.log('   ❌ Espaço antes da vírgula - FALHOU');
    falharam++;
}

// Teste 5: verificarPontuacaoComum - texto sem erros
const erros3 = verificarPontuacaoComum('Isso é um teste normal.');
const test5 = erros3.length === 0;
if (test5) {
    console.log('   ✅ Texto sem erros - PASSOU');
    passaram++;
} else {
    console.log('   ❌ Texto sem erros - FALHOU');
    falharam++;
}

// Teste 6: processarPontuacao
console.log('\n📝 Testando processarPontuacao...');
const matches = [{
    context: {
        text: 'Olá, mundo',
        offset: 0,
        length: 5
    }
}];
const resultado = processarPontuacao(matches);
const test6 = resultado && resultado.length === 1;
if (test6) {
    console.log('   ✅ processarPontuacao - PASSOU');
    passaram++;
} else {
    console.log('   ❌ processarPontuacao - FALHOU');
    falharam++;
}

// Teste 7: processarPontuacao com array vazio
const test7 = processarPontuacao([]) !== null;
if (test7) {
    console.log('   ✅ processarPontuacao (vazio) - PASSOU');
    passaram++;
} else {
    console.log('   ❌ processarPontuacao (vazio) - FALHOU');
    falharam++;
}

// =============================================
// RESULTADO FINAL
// =============================================
console.log('\n' + '='.repeat(50));
console.log(`📊 RESULTADO: ${passaram} testes passaram, ${falharam} falharam`);
console.log('='.repeat(50));

if (falharam === 0) {
    console.log('🎉 PARABÉNS! Todos os testes passaram! 🎉\n');
} else {
    console.log('⚠️ Alguns testes falharam. Verifique as funções.\n');
}