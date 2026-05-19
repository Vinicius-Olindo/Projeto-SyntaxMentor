const fs = require('fs');
const path = require('path');

const novaVersao = process.argv[2];

if (!novaVersao) {
    console.error('\n❌ Uso: node update-version.js 2.9.0\n');
    process.exit(1);
}

console.log(`\n📦 Atualizando para versão ${novaVersao}...\n`);

const arquivos = [
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
        path: 'options.html',
        update: (content) => content.replace(/v\d+\.\d+\.\d+ Elite/, `v${novaVersao} Elite`)
    },
    {
        path: 'options-seguranca.html',
        update: (content) => content.replace(/v\d+\.\d+\.\d+ Elite/, `v${novaVersao} Elite`)
    },
    {
        path: 'options-dashboard.html',
        update: (content) => content.replace(/v\d+\.\d+\.\d+ Elite/, `v${novaVersao} Elite`)
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
    }
];

let atualizados = 0;
let erros = 0;

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
            console.log(`⚠️ ${arquivo.path} não encontrado`);
        }
    } catch (err) {
        console.log(`❌ ${arquivo.path}: ${err.message}`);
        erros++;
    }
});

console.log(`\n📊 Resumo: ${atualizados} atualizados, ${erros} erros`);
console.log(`🎉 Versão atualizada para ${novaVersao}!\n`);