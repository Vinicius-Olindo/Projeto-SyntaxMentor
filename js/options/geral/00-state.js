// SyntaxMentor options geral module: state and DOM references.

var smGeralPage = document.body.classList.contains('geral-page');
var smGeralInicializada = false;

var elLanguage = document.getElementById('language');
var elPickyMode = document.getElementById('pickyMode');
var elDarkMode = document.getElementById('darkMode');
var elAutoHideBubble = document.getElementById('autoHideBubble');
var elSpeedOptions = document.querySelectorAll('input[name="speed"]');
var btnSalvar = document.getElementById('btn-salvar');

var blacklistInput = document.getElementById('blacklist-input');
var btnAddBlacklist = document.getElementById('btn-add-blacklist');
var blacklistUl = document.getElementById('blacklist-list');
var btnClearBlacklist = document.getElementById('btn-clear-blacklist');
var currentBlacklist = [];

var dictionaryInput = document.getElementById('dictionary-input');
var btnAddDictionary = document.getElementById('btn-add-dictionary');
var dictionaryUl = document.getElementById('dictionary-list');
var btnClearDictionary = document.getElementById('btn-clear-dictionary');
var currentDictionary = [];

var recordingTarget = null;
var activeBtn = null;

var SM_GERAL_SHORTCUT_DEFAULTS = {
    toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's', display: 'Alt + S' },
    ignoreShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 'i', display: 'Alt + I' },
    corrigirTudoShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 's', display: 'Alt + Shift + S' },
    ativarShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 'a', display: 'Alt + Shift + A' },
    desativarShortcut: { altKey: true, ctrlKey: false, shiftKey: true, key: 'd', display: 'Alt + Shift + D' }
};

function smShortcutKeys() {
    return Object.keys(SM_GERAL_SHORTCUT_DEFAULTS);
}
