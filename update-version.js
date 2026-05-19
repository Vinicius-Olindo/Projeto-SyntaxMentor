const fs = require('fs');
const path = require('path');

const novaVersao = process.argv[2];

if (!novaVersao) {
    console.error('\n❌ Uso: node update-version.js 2.9.0\n');
    process.exit(1);
}

console.log(`\n📦 Atualizando para versão ${novaVersao}...\n`);

const arquivos = [
    // =============================================
    // ARQUIVOS PRINCIPAIS
    // =============================================
    {
        path: 'manifest.json',
        update: (content) => {
            const json = JSON.parse(content);
            json.version = novaVersao;
            json.version_name = `${novaVersao} Elite`;
            return JSON.stringify(json, null, 4);
        }
    },
    {
        path: 'README.md',
        update: (content) => content.replace(/\*\*Versão atual:\*\* \d+\.\d+\.\d+/, `**Versão atual:** ${novaVersao}`)
    },
    {
        path: 'package.json',
        update: (content) => {
            const json = JSON.parse(content);
            json.version = novaVersao;
            return JSON.stringify(json, null, 2);
        }
    },

    // =============================================
    // ARQUIVOS JS
    // =============================================
    {
        path: 'js/background.js',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'js/popup.js',
        update: (content) => content.replace(/popup\.js v\d+\.\d+\.\d+/, `popup.js v${novaVersao}`)
    },
    {
        path: 'js/content.js',
        update: (content) => content.replace(/content\.js v\d+\.\d+\.\d+/, `content.js v${novaVersao}`)
    },
    {
        path: 'js/public-api.js',
        update: (content) => {
            let novo = content.replace(/version: '\d+\.\d+\.\d+'/, `version: '${novaVersao}'`);
            novo = novo.replace(/v\d+\.\d+\.\d+ carregada/, `v${novaVersao} carregada`);
            return novo;
        }
    },
    {
        path: 'js/options.js',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'js/options-utils.js',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'js/options-geral.js',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'js/options-segurança.js',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'js/options-dashboard.js',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'js/auto-dark-mode.js',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'js/chart-dashboard.js',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'js/export-pdf.js',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'js/export-reports.js',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'js/offline-grammar.js',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'js/offline-mode.js',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'js/sentiment-analysis.js',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'js/sentiment-ui.js',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'js/synonyms.js',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'js/api-usage.js',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },

    // =============================================
    // ARQUIVOS HTML
    // =============================================
    {
        path: 'options.html',
        update: (content) => content.replace(/v\d+\.\d+\.\d+ Elite/, `v${novaVersao} Elite`)
    },
    {
        path: 'options-segurança.html',
        update: (content) => content.replace(/v\d+\.\d+\.\d+ Elite/, `v${novaVersao} Elite`)
    },
    {
        path: 'options-dashboard.html',
        update: (content) => content.replace(/v\d+\.\d+\.\d+ Elite/, `v${novaVersao} Elite`)
    },
    {
        path: 'popup.html',
        update: (content) => content.replace(/SyntaxMentor - \d+\.\d+\.\d+/, `SyntaxMentor - ${novaVersao}`)
    },
    {
        path: 'welcome.html',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'api-docs.html',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'api-usage.html',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'teste.html',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },

    // =============================================
    // ARQUIVOS CSS
    // =============================================
    {
        path: 'css/popup.css',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'css/sentiment.css',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    },
    {
        path: 'css/style.css',
        update: (content) => content.replace(/v\d+\.\d+\.\d+/, `v${novaVersao}`)
    }
];

let atualizados = 0;
let naoEncontrados = 0;
let erros = 0;

console.log('📋 Atualizando arquivos...\n');

arquivos.forEach(arquivo => {
    try {
        const caminho = path.join(__dirname, arquivo.path);
        if (fs.existsSync(caminho)) {
            let content = fs.readFileSync(caminho, 'utf8');
            const novoContent = arquivo.update(content);
            fs.writeFileSync(caminho, novoContent, 'utf8');
            console.log(`✅ ${arquivo.path}`);
            atualizados++;
        } else {
            console.log(`⚠️ ${arquivo.path} - não encontrado`);
            naoEncontrados++;
        }
    } catch (err) {
        console.log(`❌ ${arquivo.path}: ${err.message}`);
        erros++;
    }
});

console.log('\n' + '='.repeat(50));
console.log(`📊 RESUMO:`);
console.log(`   ✅ Atualizados: ${atualizados}`);
console.log(`   ⚠️ Não encontrados: ${naoEncontrados}`);
console.log(`   ❌ Erros: ${erros}`);
console.log('='.repeat(50));

if (erros === 0) {
    console.log(`\n🎉 VERSÃO ATUALIZADA PARA ${novaVersao} COM SUCESSO! 🎉\n`);
} else {
    console.log(`\n⚠️ Alguns arquivos não foram atualizados. Verifique os erros acima.\n`);
}