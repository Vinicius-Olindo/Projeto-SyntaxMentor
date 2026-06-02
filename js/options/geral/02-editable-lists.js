// SyntaxMentor options geral module: blacklist and dictionary lists.

function criarItemEditavel(valor, index) {
    var li = document.createElement('li');

    var span = document.createElement('span');
    span.className = 'item-text';
    span.textContent = valor;

    var input = document.createElement('input');
    input.type = 'text';
    input.className = 'edit-input';
    input.value = valor;
    input.style.display = 'none';

    var actions = document.createElement('div');
    actions.className = 'action-btns';

    var btnEdit = document.createElement('button');
    btnEdit.className = 'btn-edit';
    btnEdit.dataset.index = String(index);
    btnEdit.title = 'Editar';
    btnEdit.textContent = 'Editar';

    var btnRemove = document.createElement('button');
    btnRemove.className = 'btn-remove';
    btnRemove.dataset.index = String(index);
    btnRemove.title = 'Remover';
    btnRemove.textContent = 'Remover';

    actions.appendChild(btnEdit);
    actions.appendChild(btnRemove);
    li.appendChild(span);
    li.appendChild(input);
    li.appendChild(actions);

    return li;
}

function renderizarListaEditavel(listaUl, valores, storageKey, mensagemVazia) {
    if (!listaUl) return;

    listaUl.replaceChildren();

    if (!valores || valores.length === 0) {
        var li = document.createElement('li');
        li.style.color = '#9ca3af';
        li.style.textAlign = 'center';
        li.style.padding = '10px';
        li.textContent = mensagemVazia;
        listaUl.appendChild(li);
        atualizarStatusGeral();
        return;
    }

    valores.forEach((valor, index) => {
        listaUl.appendChild(criarItemEditavel(valor, index));
    });

    adicionarOuvintesLista(listaUl, valores, storageKey);
    atualizarStatusGeral();
}

function renderizarBlacklist() {
    renderizarListaEditavel(blacklistUl, currentBlacklist, 'blacklist', 'Nenhum site bloqueado');
}

function renderizarDicionario() {
    renderizarListaEditavel(dictionaryUl, currentDictionary, 'dicionario_pessoal', 'Nenhuma palavra adicionada');
}

function adicionarOuvintesLista(listaUl, arrayAtual, storageKey) {
    listaUl.querySelectorAll('.btn-remove').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            var idx = Number(e.currentTarget.dataset.index);
            if (idx < 0 || idx >= arrayAtual.length) return;

            var removido = arrayAtual[idx];
            arrayAtual.splice(idx, 1);
            salvarListaStorage(arrayAtual, storageKey, () => {
                renderizarListaAposAlteracao(storageKey);
                mostrarNotificacao(`"${removido}" removido`, 'info');
                atualizarStatusGeral();
            });
        });
    });

    listaUl.querySelectorAll('.btn-edit').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            var idx = Number(e.currentTarget.dataset.index);
            var li = e.currentTarget.closest('li');
            if (!li) return;

            var input = li.querySelector('.edit-input');
            if (input && input.style.display === 'none') {
                iniciarEdicaoInline(li);
                return;
            }

            salvarEdicaoInline(li, idx, arrayAtual, storageKey);
        });
    });

    listaUl.querySelectorAll('.edit-input').forEach((input) => {
        input.addEventListener('keypress', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            var li = e.currentTarget.closest('li');
            var idx = Number(li?.querySelector('.btn-edit')?.dataset.index);
            salvarEdicaoInline(li, idx, arrayAtual, storageKey);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            cancelarEdicaoInline(e.currentTarget.closest('li'));
        });
    });
}

function iniciarEdicaoInline(li) {
    var span = li.querySelector('.item-text');
    var input = li.querySelector('.edit-input');
    var btnEdit = li.querySelector('.btn-edit');
    if (!span || !input || !btnEdit) return;

    span.style.display = 'none';
    input.style.display = 'block';
    input.focus();
    input.select();
    btnEdit.textContent = 'Salvar';
    btnEdit.style.color = '#28a745';
}

function cancelarEdicaoInline(li) {
    var span = li?.querySelector('.item-text');
    var input = li?.querySelector('.edit-input');
    var btnEdit = li?.querySelector('.btn-edit');
    if (!span || !input || !btnEdit) return;

    input.value = span.textContent;
    span.style.display = 'block';
    input.style.display = 'none';
    btnEdit.textContent = 'Editar';
    btnEdit.style.color = '#6f42c1';
}

function salvarEdicaoInline(li, idx, arrayAtual, storageKey) {
    var span = li?.querySelector('.item-text');
    var input = li?.querySelector('.edit-input');
    var btnEdit = li?.querySelector('.btn-edit');
    if (!span || !input || !btnEdit || idx < 0 || idx >= arrayAtual.length) return;

    var novoValor = storageKey === 'blacklist'
        ? normalizarDominio(input.value)
        : input.value.trim().toLowerCase();

    span.style.display = 'block';
    input.style.display = 'none';
    btnEdit.textContent = 'Editar';
    btnEdit.style.color = '#6f42c1';

    if (!novoValor) {
        input.value = arrayAtual[idx];
        mostrarNotificacao('O valor nao pode estar vazio', 'info');
        return;
    }

    if (novoValor === arrayAtual[idx]) return;

    var valido = storageKey === 'blacklist'
        ? isValidDomain(novoValor)
        : isValidDictionaryWord(novoValor);

    if (!valido) {
        input.value = arrayAtual[idx];
        mostrarNotificacao(storageKey === 'blacklist' ? 'Dominio invalido' : 'Palavra invalida', 'warning');
        return;
    }

    var duplicata = arrayAtual.some((item, i) => i !== idx && item === novoValor);
    if (duplicata) {
        input.value = arrayAtual[idx];
        mostrarNotificacao('Este item ja existe na lista', 'info');
        return;
    }

    arrayAtual[idx] = novoValor;
    span.textContent = novoValor;
    input.value = novoValor;

    salvarListaStorage(arrayAtual, storageKey, () => {
        mostrarNotificacao('Atualizado com sucesso', 'success');
        atualizarStatusGeral();
    });
}

function renderizarListaAposAlteracao(storageKey) {
    if (storageKey === 'blacklist') {
        renderizarBlacklist();
        return;
    }

    renderizarDicionario();
}
