document.addEventListener('DOMContentLoaded', () => {
    const fechar = document.getElementById('btn-fechar-welcome');
    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const animaveis = Array.from(document.querySelectorAll('[data-animate]'));
    const cards = Array.from(document.querySelectorAll('[data-step-card]'));
    const painel = document.querySelector('[data-tilt-panel]');
    const botaoPrincipal = document.querySelector('.welcome-primary');
    const marca = document.querySelector('.welcome-brand');
    const autoReview = document.getElementById('welcome-auto-review');
    const languageTool = document.getElementById('welcome-language-tool');

    function obterPreferenciasIniciais() {
        return {
            modoManual: !(autoReview?.checked ?? true),
            languageToolConsent: languageTool?.checked ?? true
        };
    }

    function salvarPreferenciasIniciais(callback) {
        const prefs = obterPreferenciasIniciais();
        if (typeof chrome !== 'undefined' && chrome.storage?.local?.set) {
            chrome.storage.local.set(prefs, () => callback?.());
            return;
        }

        callback?.();
    }

    function fecharWelcome() {
        if (typeof chrome !== 'undefined' && chrome.tabs?.getCurrent && chrome.tabs?.remove) {
            chrome.tabs.getCurrent((tab) => {
                if (tab?.id) chrome.tabs.remove(tab.id);
                else window.close();
            });
            return;
        }

        window.close();
    }

    animaveis.forEach((el, index) => {
        el.style.setProperty('--delay', `${index * 85}ms`);
        requestAnimationFrame(() => el.classList.add('is-visible'));
    });

    if (marca && !reduzirMovimento) {
        window.setTimeout(() => marca.classList.add('is-ready'), 350);
    }

    if (cards.length > 0 && !reduzirMovimento) {
        let cardAtual = 0;
        const destacarCard = () => {
            cards.forEach((card, index) => card.classList.toggle('is-current', index === cardAtual));
            cardAtual = (cardAtual + 1) % cards.length;
        };

        destacarCard();
        window.setInterval(destacarCard, 2200);
    }

    if (painel && !reduzirMovimento) {
        document.addEventListener('mousemove', (event) => {
            const largura = window.innerWidth || 1;
            const altura = window.innerHeight || 1;
            const x = (event.clientX / largura - 0.5) * 4;
            const y = (event.clientY / altura - 0.5) * -4;

            painel.style.setProperty('--tilt-x', `${y.toFixed(2)}deg`);
            painel.style.setProperty('--tilt-y', `${x.toFixed(2)}deg`);
        });
    }

    if (botaoPrincipal && !reduzirMovimento) {
        window.setTimeout(() => botaoPrincipal.classList.add('is-attention'), 1200);
        botaoPrincipal.addEventListener('animationend', () => {
            botaoPrincipal.classList.remove('is-attention');
        });
    }

    if (botaoPrincipal) {
        botaoPrincipal.addEventListener('click', (event) => {
            event.preventDefault();
            const destino = botaoPrincipal.getAttribute('href') || 'options.html';
            salvarPreferenciasIniciais(() => {
                window.location.href = destino;
            });
        });
    }

    if (!fechar) return;

    fechar.addEventListener('click', () => {
        salvarPreferenciasIniciais(fecharWelcome);
    });
});
