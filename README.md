# SyntaxMentor

Extensao Chrome para correcao ortografica e gramatical em campos de texto da web.

## Ideia Principal

O SyntaxMentor fica ativo nas paginas permitidas, detecta texto digitado, consulta o LanguageTool e mostra sugestoes em um painel leve. O foco do projeto e corrigir texto com pouca friccao, sem transformar a extensao em plataforma ou produto gamificado.

## Funcionalidades

- Correcao ortografica e gramatical via LanguageTool.
- Painel lateral com sugestoes, acao de corrigir, ignorar e adicionar ao dicionario.
- Correcao em lote.
- Desfazer ultima correcao.
- Dicionario pessoal.
- Blacklist e whitelist por dominio.
- Modo confirmacao, modo leitura, modo foco e modo aprendizado.
- Configuracao de idioma, velocidade, tema e API personalizada.

## Estrutura

```text
SyntaxMentor/
├── manifest.json
├── popup.html
├── options.html
├── options-seguranca.html
├── css/
│   ├── style.css
│   ├── popup.css
│   ├── content/
│   ├── options/
│   └── popup/
├── js/
│   ├── background.js
│   ├── popup.js
│   ├── options.js
│   ├── options-geral.js
│   ├── options-seguranca.js
│   ├── options-utils.js
│   ├── content/
│   └── options/geral/
├── icons/
├── docs/
└── tests/
```

## Permissoes

- `storage`: salvar configuracoes, dicionario e listas de sites.
- `activeTab`: comunicar com a aba ativa.
- `contextMenus`: adicionar acoes rapidas no menu de contexto.
- `https://api.languagetool.org/*`: motor externo de correcao.

## Desenvolvimento

```bash
npm test
```

Os testes validam sintaxe, referencias de arquivos, manifest e pontos criticos do content script/configuracoes.

## Seguranca

- A API publica para desenvolvedores foi removida.
- `web_accessible_resources` nao expoe scripts para paginas externas.
- URLs de API personalizada sao validadas antes do uso.
- Textos renderizados na interface passam por escape de HTML.

## Versao

Atual: `2.8.0`
