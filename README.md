# SyntaxMentor

Extensão de correção ortográfica e gramatical para Chrome (Manifest V3), com suporte a múltiplos idiomas, modo offline, análise de sentimentos e API pública.

**Versão atual:** 2.7.1 Elite

---

## Funcionalidades

- Correção ortográfica e gramatical em tempo real via [LanguageTool](https://languagetool.org)
- Detecção automática de idioma (pt-BR, en-US, es, fr, de, it)
- Modo offline com dicionário local
- Análise de sentimentos do texto
- Dicionário pessoal (palavras ignoradas)
- Modo Aprendizado — explica o motivo de cada correção
- Modo Foco — oculta a interface durante a digitação
- Modo Confirmação — pede aprovação antes de aplicar correções
- Suporte a Shadow DOM e iframes (ex: Digisac, Blip)
- Histórico de desfazer (Ctrl+Z)
- Exportação de relatórios
- API pública para integração em outros sites

---

## Instalação

### No Chrome (modo desenvolvedor)

1. Faça o download ou clone este repositório
2. Acesse `chrome://extensions`
3. Ative o **Modo do desenvolvedor** (canto superior direito)
4. Clique em **Carregar sem compactação**
5. Selecione a pasta raiz do projeto

### Atalhos de teclado

| Atalho        | Ação                               |
| ------------- | ---------------------------------- |
| `Alt+Shift+A` | Ativar a extensão no site atual    |
| `Alt+Shift+D` | Desativar a extensão no site atual |
| `Alt+S`       | Abrir/fechar painel de correções   |
| `Alt+I`       | Ignorar erro selecionado           |
| `Alt+Shift+S` | Corrigir tudo automaticamente      |

---

## Configuração

### API Key (opcional)

Acesse as configurações da extensão → aba **Segurança** e informe sua API Key do LanguageTool Premium para remover os limites de requisição da versão gratuita.

### API URL personalizada

Se você hospeda sua própria instância do LanguageTool, informe a URL na aba **Segurança**:

```
http://localhost:8010/v2/check
```

---

## API Pública

O SyntaxMentor expõe uma API global (`window.SyntaxMentor`) para sites que queiram usar o corretor programaticamente.

### Uso básico

```javascript
// Verificar se a API está disponível
if (window.SyntaxMentor) {
  // Corrigir um texto
  const resultado = await window.SyntaxMentor.correct(
    "Eu gosto de programaçao",
  );
  console.log(resultado.correctedText); // "Eu gosto de programação"
  console.log(resultado.corrections); // array de erros encontrados
  console.log(resultado.totalErrors); // 1
}
```

### Configuração da API

```javascript
window.SyntaxMentor.configure({
  language: "pt-BR", // idioma (padrão: pt-BR)
  pickyMode: true, // modo rigoroso
  apiUrl: "https://api.languagetool.org/v2/check",
});
```

### Corrigir elemento HTML

```javascript
const input = document.getElementById("meu-textarea");
await window.SyntaxMentor.correctElement(input);
```

### Adicionar palavras ao dicionário

```javascript
window.SyntaxMentor.addToDictionary("SyntaxMentor");
window.SyntaxMentor.addToDictionary(["Digisac", "Blip"]);
```

### Estrutura do retorno de `correct()`

```json
{
  "success": true,
  "text": "texto original",
  "correctedText": "texto corrigido",
  "totalErrors": 2,
  "language": "pt-BR",
  "corrections": [
    {
      "original": "programaçao",
      "suggestions": ["programação"],
      "message": "Possível erro ortográfico",
      "offset": 15,
      "length": 11,
      "rule": {
        "id": "MORFOLOGIK_RULE_PT_BR",
        "category": "Possíveis erros",
        "categoryId": "TYPOS"
      }
    }
  ]
}
```

### Evento de carregamento

```javascript
window.addEventListener("syntaxmentor-ready", (e) => {
  console.log("API pronta, versão:", e.detail.version);
});
```

---

## Estrutura do projeto

```
├── manifest.json               # Configuração da extensão (MV3)
├── popup.html / js/popup.js    # Interface do popup
├── options.html                # Página de configurações gerais
├── options-dashboard.html      # Dashboard de estatísticas
├── options-seguranca.html      # Configurações de API e segurança
├── welcome.html                # Página de boas-vindas (pós-install)
├── api-docs.html               # Documentação da API pública
├── api-usage.html              # Exemplos de uso da API
├── js/
│   ├── background.js           # Service Worker principal
│   ├── content.js              # Script injetado nas páginas
│   ├── popup.js                # Lógica do popup
│   ├── public-api.js           # API pública (window.SyntaxMentor)
│   ├── offline-grammar.js      # Verificador offline
│   ├── offline-mode.js         # Gerenciador do modo offline
│   ├── sentiment-analysis.js   # Análise de sentimentos
│   ├── sentiment-ui.js         # UI da análise de sentimentos
│   ├── export-reports.js       # Exportação de relatórios
│   ├── options-dashboard.js    # Lógica do dashboard
│   ├── options-geral.js        # Lógica das configurações gerais
│   ├── options-seguranca.js    # Lógica das configurações de segurança
│   ├── options-utils.js        # Utilitários compartilhados
│   └── options.js              # Navegação entre abas de configurações
├── css/                        # Estilos
├── icons/                      # Ícones da extensão (16, 32, 48, 128px)
├── Arquivos-Dicionario/        # Dicionário local para modo offline
└── tests/                      # Testes automatizados (Jest)
```

---

## Testes

```bash
# Instalar dependências
npm install

# Rodar os testes
npm test

# Rodar em modo watch
npm run test:watch

# Gerar relatório de cobertura
npm run test:coverage
```

---

## Licença

Projeto privado. Todos os direitos reservados.
