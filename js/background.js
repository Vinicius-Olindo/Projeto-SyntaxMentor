// SyntaxMentor background service worker entrypoint.

importScripts(
    'shared/storage.js',
    'background/00-config.js',
    'background/01-sites-storage.js',
    'background/02-language-tool.js',
    'background/03-badge-tabs.js',
    'background/04-context-menu.js',
    'background/05-messaging.js',
    'background/06-lifecycle-commands.js'
);

registrarEventosInstalacao();
registrarEventosAbas();
registrarMenuContexto();
registrarMensagensBackground();
registrarStorageListenerBackground();
registrarAtalhosBackground();

smLog('SyntaxMentor Background Service Worker v2.8.1 iniciado.');
