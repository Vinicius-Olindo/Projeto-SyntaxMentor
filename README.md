# ✨ SyntaxMentor

**Extensão de correção ortográfica e gramatical para Chrome (Manifest V3)**

[![Version](https://img.shields.io/badge/version-2.8.2-blue.svg)]()
[![Chrome](https://img.shields.io/badge/Chrome-Extension-green.svg)]()
[![License](https://img.shields.io/badge/license-Private-red.svg)]()

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Novidades v2.8.2](#novidades-v282)
- [Funcionalidades](#funcionalidades)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Atalhos de Teclado](#atalhos-de-teclado)
- [Menu de Contexto](#menu-de-contexto)
- [API Pública](#api-pública)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Testes](#testes)
- [Segurança](#segurança)
- [Changelog](#changelog)
- [Sites Suportados](#sites-suportados)

---

## 🚀 Visão Geral

SyntaxMentor é uma extensão poderosa para Chrome que corrige erros ortográficos e gramaticais em tempo real. Com suporte a múltiplos idiomas, análise de sentimentos, API pública e sincronização entre dispositivos, ela é a ferramenta ideal para quem escreve muito na web.

**Versão atual:** `2.8.2 Elite`

---

## ✨ Novidades v2.8.2

| Funcionalidade                  | Descrição                                                   |
| ------------------------------- | ----------------------------------------------------------- |
| **🎬 Efeito visual aprimorado** | Bolinha com pulsação e ondas magnéticas durante verificação |
| **📦 Cards de erro compactos**  | Layout otimizado com largura adequada ao conteúdo           |
| **🔘 Botões redesenhados**      | "Ignorar" e "+Dic" com textos curtos e alinhados            |
| **🌙 Modo escuro completo**     | Interface consistente em todas as abas                      |
| **🕓 Histórico de correções**   | Reverta correções individuais com um clique                 |
| **🔢 Contador de navegação**    | Funciona corretamente (1/28 em vez de —/28)                 |
| **🔍 Filtro de erros**          | Remove duplicatas por posição sem agrupar palavras          |
| **🎯 Primeiro erro destacado**  | Visualmente identificado ao abrir o painel                  |
| **⚡ API Pública**              | Rate limit 10/s e cache LRU de 1 minuto                     |
| **🔄 Desfazer (Ctrl+Z)**        | Totalmente funcional e confiável                            |

---

## 🎯 Funcionalidades

### 📝 Correção

| Funcionalidade             | Descrição                                    |
| -------------------------- | -------------------------------------------- |
| **Correção em tempo real** | Via [LanguageTool](https://languagetool.org) |
| **Múltiplos idiomas**      | pt-BR, en-US, es, fr, de, it                 |
| **Detecção automática**    | Identifica o idioma do texto                 |
| **Correção de voz**        | Perfil dedicado para transcrições de áudio   |
| **Histórico de correções** | Reverter individual por item                 |
| **Desfazer (Ctrl+Z)**      | Histórico de até 20 ações                    |

### 🎨 Interface

| Funcionalidade          | Descrição                                   |
| ----------------------- | ------------------------------------------- |
| **Bolinha flutuante**   | Arrastável com contagem de erros            |
| **Efeito de pulsação**  | Durante verificação de texto                |
| **Ondas magnéticas**    | Saindo dos lados da bolinha                 |
| **Painel de sugestões** | Três abas: Gramática, Sentimento, Histórico |
| **Cards compactos**     | Layout responsivo com largura automática    |
| **Preview no popup**    | Erros ativos com aplicação rápida           |
| **Tooltip flutuante**   | Ao revisar texto selecionado                |
| **Modo Foco**           | Oculta interface durante digitação          |
| **Modo Confirmação**    | Pede aprovação antes de corrigir            |

### 📚 Aprendizado

| Funcionalidade            | Descrição                                                     |
| ------------------------- | ------------------------------------------------------------- |
| **Modo Aprendizado**      | Explica motivo de cada correção com categoria, exemplo e link |
| **Análise de sentimento** | Detecta negação, intensificadores e sugere melhorias          |
| **Dashboard**             | Estatísticas, streak diário, conquistas, erros mais comuns    |

### ⚙️ Configuração

| Funcionalidade          | Descrição                                                    |
| ----------------------- | ------------------------------------------------------------ |
| **Dicionário pessoal**  | Palavras ignoradas (validação Unicode)                       |
| **Blacklist/Whitelist** | Controle granular por site                                   |
| **Cloud Sync**          | Sincroniza entre dispositivos via `chrome.storage.sync`      |
| **API Key Premium**     | Remove limites de requisição (armazenada em session storage) |
| **Exportar/Importar**   | Backup de configurações em JSON/TXT                          |
| **Relatórios**          | Exportação em CSV/HTML                                       |

---

## 📦 Instalação

### Chrome (modo desenvolvedor)

```bash
1. Faça o download ou clone este repositório
2. Acesse chrome://extensions
3. Ative o "Modo do desenvolvedor" (canto superior direito)
4. Clique em "Carregar sem compactação"
5. Selecione a pasta raiz do projeto
```
