// =============================================
// SyntaxMentor - Integração Offline
// =============================================

// Verificar status da internet
let isOnline = navigator.onLine;

// Atualizar status quando mudar
window.addEventListener('online', () => {
    isOnline = true;
    console.log('🌐 SyntaxMentor: Conexão restaurada - Usando API online');
    mostrarNotificacaoOffline('🌐 Conexão restaurada! Usando correção online.', 'success');
});

window.addEventListener('offline', () => {
    isOnline = false;
    console.log('📴 SyntaxMentor: Modo offline ativado - Usando correção local');
    mostrarNotificacaoOffline('📴 Sem internet! Usando correção offline básica.', 'warning');
});

// Mostrar notificação de mudança de modo
function mostrarNotificacaoOffline(mensagem, tipo) {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: ${tipo === 'warning' ? '#f59e0b' : '#28a745'};
        color: white;
        padding: 10px 16px;
        border-radius: 8px;
        font-size: 12px;
        font-family: 'Segoe UI', sans-serif;
        z-index: 2147483647;
        animation: sm-offline-notif 3s forwards;
        pointer-events: none;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    notif.textContent = mensagem;
    document.body.appendChild(notif);
    
    setTimeout(() => notif.remove(), 3000);
}

// Modificar a função verificarTexto para usar offline quando necessário
// Adicione esta função ao seu content.js
async function verificarTextoComFallback(texto, elemento) {
    // Se estiver online, usar API normal
    if (isOnline) {
        try {
            await verificarTexto(texto, elemento);
        } catch (error) {
            console.warn('API offline, usando modo offline');
            verificarTextoOffline(texto, elemento);
        }
    } else {
        // Usar modo offline
        verificarTextoOffline(texto, elemento);
    }
}

// Verificação offline
function verificarTextoOffline(texto, elemento) {
    const errosOffline = offlineGrammar.check(texto);
    
    // Converter para o mesmo formato da API
    errosGlobais = errosOffline.map(err => ({
        context: {
            text: texto,
            offset: err.position,
            length: err.length
        },
        message: err.message || `Erro comum: "${err.original}" → "${err.sugestao}"`,
        replacements: [{ value: err.sugestao }],
        rule: { category: { name: 'Offline Check' } }
    }));
    
    elementoGlobal = elemento;
    
    if (!isSiteRestrito && elemento.isContentEditable) {
        aplicarGrifos(errosGlobais, elemento);
    }
    
    atualizarInterface();
    
    // Mostrar indicador de modo offline
    const bubble = document.getElementById('syntax-mentor-bubble');
    if (bubble && !isOnline) {
        bubble.setAttribute('data-offline', 'true');
        bubble.title = 'Modo Offline - Correção básica ativa';
    }
}
// Expor globalmente para uso no content.js
window.verificarTextoOffline = verificarTextoOffline;