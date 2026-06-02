// SyntaxMentor shared DOM helpers.

function smCriarElemento(tag, opcoes = {}, filhos = []) {
    const el = document.createElement(tag);

    if (opcoes.id) el.id = opcoes.id;
    if (opcoes.className) el.className = opcoes.className;
    if (opcoes.textContent !== undefined) el.textContent = opcoes.textContent;
    if (opcoes.title) el.title = opcoes.title;
    if (opcoes.type) el.type = opcoes.type;
    if (opcoes.value !== undefined) el.value = opcoes.value;
    if (opcoes.style) el.style.cssText = opcoes.style;
    if (opcoes.attributes) {
        Object.entries(opcoes.attributes).forEach(([chave, valor]) => {
            el.setAttribute(chave, valor);
        });
    }
    if (opcoes.dataset) {
        Object.entries(opcoes.dataset).forEach(([chave, valor]) => {
            el.dataset[chave] = String(valor);
        });
    }

    filhos.forEach(filho => {
        if (filho) el.appendChild(filho);
    });

    return el;
}

function smLimparElemento(el) {
    if (el) el.replaceChildren();
}

function smAplicarEstilo(el, cssText) {
    if (el) el.style.cssText = cssText;
    return el;
}
