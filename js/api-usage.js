// api-usage.js — lógica da página de demonstração da API

const textoEl = document.getElementById('texto');
const btnCorrigir = document.getElementById('btnCorrigir');
const btnLimpar = document.getElementById('btnLimpar');
const btnExemplo = document.getElementById('btnExemplo');
const btnCopiarCodigo = document.getElementById('btnCopiarCodigo');
const resultadoEl = document.getElementById('resultado');

const textoExemplo = `Eu to fazendo um texto maior agora, cheiu de errus de ortografia pra testa uma extensão direita. As palavras tão tudo trocadas, faltando letra e as ves com letra a mais também. Nao sei si isso ta suficient, mais vo continua escrevendo coizas sem muito sentido, misturando pontuacao errada, acentu faltando e umas frase meio confuza pra fica bem bagunsadu e dificiu de le.`;

btnExemplo.addEventListener('click', () => {
    textoEl.value = textoExemplo;
    resultadoEl.classList.remove('show');
});

btnLimpar.addEventListener('click', () => {
    textoEl.value = '';
    resultadoEl.classList.remove('show');
});

btnCopiarCodigo.addEventListener('click', () => {
    const codigo = `// Correção simples
const resultado = await SyntaxMentor.correct("texto com erro");

// Com configuração
const resultado = await SyntaxMentor.correct("Hello world", {
    language: "en-US",
    pickyMode: true
});`;
    navigator.clipboard.writeText(codigo);

    const originalText = btnCopiarCodigo.innerHTML;
    btnCopiarCodigo.innerHTML = '<span>✅</span> Copiado!';
    setTimeout(() => {
        btnCopiarCodigo.innerHTML = originalText;
    }, 2000);
});

async function corrigirTexto() {
    const texto = textoEl.value.trim();

    if (!texto) {
        mostrarErro('Digite um texto para corrigir');
        return;
    }

    resultadoEl.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <span>Analisando texto com LanguageTool...</span>
        </div>
    `;
    resultadoEl.classList.add('show');

    btnCorrigir.disabled = true;
    btnCorrigir.innerHTML = '<span>⏳</span> Processando...';

    try {
        if (!window.SyntaxMentor) {
            await new Promise(resolve => {
                window.addEventListener('syntaxmentor-ready', resolve);
                setTimeout(resolve, 3000);
            });
        }

        if (!window.SyntaxMentor) {
            throw new Error('API não disponível. Certifique-se de que a extensão está instalada.');
        }

        const resultado = await window.SyntaxMentor.correct(texto, {
            language: 'pt-BR',
            pickyMode: true
        });

        if (resultado.success) {
            mostrarResultado(resultado);
        } else {
            mostrarErro(resultado.error);
        }
    } catch (error) {
        mostrarErro(error.message);
    } finally {
        btnCorrigir.disabled = false;
        btnCorrigir.innerHTML = '<span>🔍</span> Corrigir Texto';
    }
}

function mostrarResultado(resultado) {
    const temCorrecoes = resultado.corrections.length > 0;

    let html = `
        <div class="result-header">
            <div>
                <span class="result-badge ${temCorrecoes ? 'warning' : 'success'}">
                    ${temCorrecoes ? '⚠️ ' + resultado.corrections.length + ' correções encontradas' : '✅ Nenhum erro encontrado'}
                </span>
            </div>
        </div>
    `;

    if (temCorrecoes) {
        html += `
            <div class="stats">
                <div class="stat">
                    <div class="stat-value">${resultado.corrections.length}</div>
                    <div class="stat-label">Correções</div>
                </div>
                <div class="stat">
                    <div class="stat-value">${resultado.text.length}</div>
                    <div class="stat-label">Caracteres</div>
                </div>
            </div>

            <div class="text-compare">
                <div class="text-box original">
                    <div class="text-box-title">📄 Original</div>
                    <div>${escapeHtml(resultado.text)}</div>
                </div>
                <div class="text-box corrected">
                    <div class="text-box-title">✨ Corrigido</div>
                    <div>${escapeHtml(resultado.correctedText)}</div>
                </div>
            </div>

            <div class="corrections-list">
                <strong style="font-size: 13px;">📋 Detalhe das correções:</strong>
                ${resultado.corrections.map(c => `
                    <div class="correction-item">
                        <span class="badge-original">${escapeHtml(c.original)}</span>
                        <span class="arrow">→</span>
                        <span class="badge-suggestion">${escapeHtml(c.suggestions[0] || '[remover]')}</span>
                        <span class="correction-message">💡 ${escapeHtml(c.message)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        html += `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="font-size: 48px; margin-bottom: 16px;">✨</div>
                <p style="color: #065f46; font-weight: 500;">Parabéns! Seu texto está correto!</p>
                <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">Nenhum erro ortográfico ou gramatical encontrado.</p>
            </div>
        `;
    }

    resultadoEl.innerHTML = html;
}

function mostrarErro(mensagem) {
    resultadoEl.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <div class="result-badge error" style="display: inline-block;">❌ Erro</div>
            <p style="color: #991b1b; margin-top: 16px;">${escapeHtml(mensagem)}</p>
            <p style="font-size: 12px; color: #6b7280; margin-top: 8px;">Verifique se a extensão SyntaxMentor está instalada e ativa.</p>
        </div>
    `;
}

function escapeHtml(texto) {
    if (!texto) return '';
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

btnCorrigir.addEventListener('click', corrigirTexto);

textoEl.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        corrigirTexto();
    }
});