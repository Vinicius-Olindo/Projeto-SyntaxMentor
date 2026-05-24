# ✨ SyntaxMentor

**Extensão de correção ortográfica e gramatical para Chrome — Manifest V3**

[![Version](https://img.shields.io/badge/version-2.8.2-blue.svg)]()
[![Chrome](https://img.shields.io/badge/Chrome-Extension-green.svg)]()
[![Manifest](https://img.shields.io/badge/Manifest-V3-orange.svg)]()
[![License](https://img.shields.io/badge/license-Private-red.svg)]()

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades](#-funcionalidades)
- [Instalação](#-instalação)
- [Atalhos de Teclado](#-atalhos-de-teclado)
- [Menu de Contexto](#-menu-de-contexto)
- [API Pública](#-api-pública)
- [Configurações](#-configurações)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Testes](#-testes)
- [Segurança](#-segurança)
- [Sites Suportados](#-sites-suportados)
- [Changelog](#-changelog)

---

## 🚀 Visão Geral

SyntaxMentor é uma extensão para Chrome que realiza correção ortográfica e gramatical em tempo real diretamente nos campos de texto da web. Integrada ao [LanguageTool](https://languagetool.org), ela suporta múltiplos idiomas, oferece análise de sentimentos, dicionário pessoal, sincronização em nuvem e uma API pública para integração com outras ferramentas.

Desenvolvida com Manifest V3, usa Service Worker como background, `chrome.storage` para sincronização e `chrome.alarms` para tarefas agendadas.

**Versão atual:** `2.8.2 Elite`

---

## 🎯 Funcionalidades

### 📝 Correção Gramatical

Correção em tempo real via LanguageTool com suporte a pt-BR, en-US, es, fr, de e it. A extensão detecta automaticamente o idioma do texto e possui perfil dedicado para correção de transcrições de voz. O histórico armazena até 20 ações, com desfazer individual por item (Ctrl+Z).

### 🎨 Interface

Uma bolinha flutuante e arrastável exibe a contagem de erros ativos. Durante a verificação, a bolinha pulsa e emite ondas magnéticas. O painel lateral possui três abas: Gramática, Sentimento e Histórico. Cards compactos com layout responsivo apresentam cada erro com opções de correção, ignorar ou adicionar ao dicionário. Um tooltip flutuante é exibido ao revisar texto selecionado.

Modos especiais disponíveis:

- **Modo Foco** — oculta a interface durante a digitação
- **Modo Confirmação** — exige aprovação antes de aplicar cada correção
- **Modo Aprendizado** — explica a categoria, motivo e fornece link de referência para cada correção

### 📊 Análise de Sentimento

Detecta tom negativo, palavras agressivas e intensificadores no texto, sugerindo alternativas mais neutras ou profissionais. Os resultados são exibidos na aba Sentimento do painel.

### 📚 Dashboard de Aprendizado

Acessível pelas configurações, o dashboard exibe estatísticas de uso, streak diário, conquistas desbloqueadas e os erros mais frequentes do usuário.

### ⚙️ Configurações

Todas as configurações são acessíveis em `chrome://extensions` → SyntaxMentor → Detalhes → Opções, ou clicando com o botão direito no ícone da extensão.

| Funcionalidade        | Descrição                                                             |
| --------------------- | --------------------------------------------------------------------- |
| Dicionário pessoal    | Adicione palavras que não devem ser sinalizadas (validação Unicode)   |
| Blacklist / Whitelist | Controle por domínio: bloqueie ou libere sites individualmente        |
| Modo Whitelist        | Ativa a extensão apenas nos sites autorizados                         |
| Cloud Sync            | Sincroniza configurações entre dispositivos via `chrome.storage.sync` |
| API Key Premium       | Remove limites de requisição (armazenada em `sessionStorage`)         |
| Exportar / Importar   | Backup completo de configurações em JSON ou TXT                       |
| Relatórios            | Exportação do histórico de correções em CSV ou HTML                   |

---

## 📦 Instalação

### Pré-requisitos

- Google Chrome 88 ou superior
- Modo desenvolvedor habilitado

### Passo a passo

```bash
# 1. Clone o repositório ou extraia o ZIP
git clone https://github.com/seu-usuario/SyntaxMentor.git

# 2. Acesse a página de extensões do Chrome
# Cole na barra de endereços:
chrome://extensions

# 3. Ative o "Modo do desenvolvedor" (canto superior direito)

# 4. Clique em "Carregar sem compactação"

# 5. Selecione a pasta raiz do projeto (onde está o manifest.json)
```

Após carregar, o ícone do SyntaxMentor aparecerá na barra de ferramentas. Clique nele para abrir o popup e começar a configurar.

---

## ⌨️ Atalhos de Teclado

| Atalho            | Ação                                    |
| ----------------- | --------------------------------------- |
| `Alt + S`         | Abrir / fechar painel de correções      |
| `Alt + Shift + A` | Ativar SyntaxMentor no site atual       |
| `Alt + Shift + D` | Desativar SyntaxMentor no site atual    |
| `Alt + Shift + S` | Corrigir todos os erros automaticamente |
| `Ctrl + Z`        | Desfazer última correção aplicada       |

> Os atalhos podem ser personalizados em `chrome://extensions/shortcuts`.

---

## 🖱️ Menu de Contexto

Ao selecionar um texto em qualquer página e clicar com o botão direito, o SyntaxMentor adiciona opções ao menu de contexto para revisão rápida do trecho selecionado.

---

## 🔌 API Pública

O SyntaxMentor expõe uma API JavaScript acessível via `window.SyntaxMentor` em qualquer página onde a extensão esteja ativa.

### Limites

- **Rate limit:** 10 chamadas por segundo
- **Cache LRU:** resultados cacheados por 1 minuto (até 50 entradas)

### Métodos disponíveis

```javascript
// Verificar texto manualmente
await window.SyntaxMentor.check("Texto para verficar");

// Obter erros ativos na página
window.SyntaxMentor.getErrors();

// Aplicar todas as correções sugeridas
window.SyntaxMentor.fixAll();

// Verificar status da extensão
window.SyntaxMentor.getStatus();
```

Para documentação completa da API, abra `api-docs.html` no navegador ou acesse a página de uso em `api-usage.html`.

---

## 🗂️ Estrutura do Projeto

```
SyntaxMentor/
│
├── manifest.json               # Configuração da extensão (Manifest V3)
├── package.json                # Dependências de desenvolvimento (Jest)
├── popup.html                  # Interface do popup da barra de ferramentas
├── options.html                # Página principal de configurações
├── options-dashboard.html      # Dashboard de estatísticas
├── options-seguranca.html      # Configurações de segurança e privacidade
├── welcome.html                # Página de boas-vindas (pós-instalação)
├── api-docs.html               # Documentação da API pública
├── api-usage.html              # Monitor de uso da API
├── teste.html                  # Página de testes manuais
│
├── js/
│   ├── background.js           # Service Worker — núcleo da extensão
│   ├── content.js              # Script injetado nas páginas (UI + correção)
│   ├── popup.js                # Lógica do popup
│   ├── public-api.js           # API pública (window.SyntaxMentor)
│   ├── sentiment-analysis.js   # Motor de análise de sentimento
│   ├── sentiment-ui.js         # Interface da análise de sentimento
│   ├── options-geral.js        # Lógica das configurações gerais
│   ├── options-seguranca.js    # Lógica das configurações de segurança
│   ├── options-dashboard.js    # Lógica do dashboard
│   ├── options-utils.js        # Utilitários compartilhados de opções
│   ├── options.js              # Entrypoint das opções
│   ├── export-reports.js       # Exportação de relatórios (CSV/HTML)
│   └── api-usage.js            # Monitor de consumo da API
│
├── css/
│   ├── style.css               # Estilos globais
│   ├── content.css             # Estilos injetados nas páginas
│   ├── popup.css               # Estilos do popup
│   └── sentiment.css           # Estilos do painel de sentimento
│
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   ├── icon128.png
│   └── logo.svg
│
├── prompt/
│   └── prompt.txt              # Prompt do agente de revisão de código
│
├── Arquivos-Dicionario/
│   ├── dicionario.json         # Dicionário pessoal padrão (termos técnicos)
│   └── palavras-teste.txt      # Palavras para testes de dicionário
│
└── tests/
    ├── content.test.js         # Testes unitários do content script
    ├── options-geral.js        # Testes das configurações gerais
    ├── public-api-js           # Testes da API pública
    ├── run-tests.js            # Runner de testes
    └── setup.js                # Configuração do ambiente de testes
```

---

## 🧪 Testes

O projeto usa **Jest** para testes unitários.

```bash
# Instalar dependências
npm install

# Rodar todos os testes
npm test

# Rodar em modo watch (re-executa ao salvar)
npm run test:watch

# Gerar relatório de cobertura
npm run test:coverage
```

Os testes cobrem as principais funções do `content.js`, configurações gerais e a API pública. O arquivo `setup.js` configura os mocks necessários para simular o ambiente de extensão Chrome (chrome.storage, chrome.runtime etc.).

---

## 🔒 Segurança

**Permissões declaradas no manifest:**

| Permissão      | Motivo                                        |
| -------------- | --------------------------------------------- |
| `storage`      | Salvar e sincronizar configurações do usuário |
| `activeTab`    | Acessar a aba ativa para injetar a interface  |
| `scripting`    | Injetar o content script programaticamente    |
| `contextMenus` | Adicionar opções ao menu de contexto          |
| `alarms`       | Agendar remoção do badge "NEW" após 7 dias    |

**Host permissions:** a extensão faz requisições apenas para `https://api.languagetool.org` e domínios específicos pré-autorizados (digisac, blip.ai, take.io).

**Armazenamento de API Key:** a chave de API premium é armazenada em `sessionStorage`, nunca em `localStorage` ou `chrome.storage`, garantindo que não persiste entre sessões.

**Configurações de segurança** adicionais estão disponíveis em `options-seguranca.html`, incluindo controles de blacklist/whitelist por domínio e override de usuário.

---

## 🌐 Sites Suportados

A extensão é ativada em todos os sites (`<all_urls>`) por padrão. O usuário pode restringir o funcionamento via:

- **Blacklist** — bloquear domínios específicos
- **Whitelist** — ativar apenas nos domínios autorizados (Modo Whitelist)
- **Override manual** — bloquear um site mesmo que ele esteja na whitelist

Domínios com suporte especial pré-configurado: `digisac.com.br`, `digisac.io`, `blip.ai`, `take.io`.

---

## 📝 Changelog

### v2.8.2 — Atual

- Efeito visual aprimorado: pulsação e ondas magnéticas na bolinha durante verificação
- Cards de erro compactos com largura adaptada ao conteúdo
- Botões "Ignorar" e "+Dic" redesenhados com textos curtos e melhor alinhamento
- Modo escuro completo e consistente em todas as abas de configuração
- Histórico de correções com reversão individual por item
- Contador de navegação corrigido (ex: `1/28` em vez de `—/28`)
- Filtro de erros: remove duplicatas por posição sem agrupar palavras distintas
- Primeiro erro destacado visualmente ao abrir o painel
- API pública com rate limit de 10 req/s e cache LRU de 1 minuto
- Desfazer (Ctrl+Z) totalmente funcional e confiável

### v2.8.1

- Migração completa para Manifest V3
- Service Worker como background script
- Uso de `chrome.alarms` para gerenciamento do badge "NEW"

### v2.8.0

- Lançamento da API pública (`window.SyntaxMentor`)
- Dashboard de estatísticas e conquistas
- Cloud Sync via `chrome.storage.sync`

---

> Desenvolvido com ❤️ — Projeto privado. Todos os direitos reservados.
