// =============================================
// SyntaxMentor - Sugestões de Palavras v1.0
// =============================================

const synonymAPI = {
    // Dicionário local de sinônimos (fallback offline)
    localSynonyms: {
        'bom': ['ótimo', 'excelente', 'positivo', 'favorável', 'adequado'],
        'ruim': ['péssimo', 'negativo', 'desfavorável', 'inadequado', 'precário'],
        'fazer': ['realizar', 'executar', 'produzir', 'elaborar', 'desempenhar'],
        'dizer': ['afirmar', 'declarar', 'expressar', 'mencionar', 'comunicar'],
        'importante': ['significativo', 'relevante', 'essencial', 'fundamental', 'crucial'],
        'grande': ['enorme', 'imenso', 'vasto', 'extenso', 'considerável'],
        'pequeno': ['reduzido', 'mínimo', 'limitado', 'compacto', 'insignificante'],
        'rápido': ['veloz', 'ágil', 'ligeiro', 'apressado', 'instantâneo'],
        'lento': ['devagar', 'moroso', 'demorado', 'pausado', 'arrastado'],
        'bonito': ['belo', 'lindo', 'formoso', 'elegante', 'atraente'],
        'feio': ['desagradável', 'horroroso', 'repulsivo', 'deformado', 'mal-acabado'],
        'feliz': ['alegre', 'contente', 'satisfeito', 'radiante', 'jubiloso'],
        'triste': ['melancólico', 'deprimido', 'abatido', 'desolado', 'infeliz']
    },

    /**
     * Busca sinônimos para uma palavra
     * @param {string} palavra - Palavra para buscar sinônimos
     * @returns {Promise<Array>}
     */
    async buscarSinonimos(palavra) {
        const palavraLower = palavra.toLowerCase();
        
        // Verificar no dicionário local primeiro
        if (this.localSynonyms[palavraLower]) {
            return this.localSynonyms[palavraLower];
        }
        
        // Tentar API online (se disponível)
        try {
            const response = await fetch(`https://api.datamuse.com/words?rel_syn=${encodeURIComponent(palavra)}&max=5`);
            if (response.ok) {
                const data = await response.json();
                return data.map(item => item.word);
            }
        } catch (e) {
            console.debug('Erro ao buscar sinônimos online:', e);
        }
        
        return [];
    },

    /**
     * Mostra sugestões de sinônimos para uma palavra selecionada
     * @param {string} palavra - Palavra selecionada
     * @param {number} x - Posição X do mouse
     * @param {number} y - Posição Y do mouse
     */
    async mostrarSugestoes(palavra, x, y) {
        const sinonimos = await this.buscarSinonimos(palavra);
        
        if (sinonimos.length === 0) return;
        
        // Remover menu anterior se existir
        const menuExistente = document.getElementById('sm-synonym-menu');
        if (menuExistente) menuExistente.remove();
        
        const menu = document.createElement('div');
        menu.id = 'sm-synonym-menu';
        menu.style.cssText = `
            position: fixed;
            top: ${y + 10}px;
            left: ${x}px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 2147483647;
            min-width: 180px;
            max-width: 280px;
            font-family: 'Segoe UI', sans-serif;
            font-size: 13px;
            border: 1px solid #e5e7eb;
            overflow: hidden;
        `;
        
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 10px 12px;
            background: #6f42c1;
            color: white;
            font-weight: 600;
            font-size: 12px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
        `;
        header.textContent = `Sinônimos para "${palavra}"`;
        
        const list = document.createElement('div');
        list.style.cssText = `
            max-height: 200px;
            overflow-y: auto;
        `;
        
        sinonimos.forEach(sinonimo => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 8px 12px;
                cursor: pointer;
                transition: background 0.2s;
                border-bottom: 1px solid #f0f0f0;
            `;
            item.textContent = sinonimo;
            
            item.addEventListener('mouseenter', () => {
                item.style.background = '#f3e8ff';
            });
            item.addEventListener('mouseleave', () => {
                item.style.background = 'transparent';
            });
            
            item.addEventListener('click', () => {
                this.substituirPalavra(palavra, sinonimo);
                menu.remove();
            });
            
            list.appendChild(item);
        });
        
        menu.appendChild(header);
        menu.appendChild(list);
        document.body.appendChild(menu);
        
        // Fechar ao clicar fora
        setTimeout(() => {
            document.addEventListener('click', function fecharMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', fecharMenu);
                }
            });
        }, 100);
    },

    /**
     * Substitui a palavra selecionada pelo sinônimo escolhido
     * @param {string} original - Palavra original
     * @param {string} novapalavra - Nova palavra
     */
    substituirPalavra(original, novapalavra) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;
        
        const range = selection.getRangeAt(0);
        const textoSelecionado = range.toString();
        
        if (textoSelecionado.toLowerCase() === original.toLowerCase()) {
            range.deleteContents();
            range.insertNode(document.createTextNode(novapalavra));
            
            // Disparar eventos
            const evento = new Event('input', { bubbles: true });
            range.commonAncestorContainer.dispatchEvent(evento);
            
            mostrarFeedback(`✨ "${original}" → "${novapalavra}"`, 'success');
        }
    }
};

// Exportar
if (typeof module !== 'undefined' && module.exports) {
    module.exports = synonymAPI;
}