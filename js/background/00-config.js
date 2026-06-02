// SyntaxMentor background module: shared config and domain helpers.

const SM_DEBUG = false;
const smLog = (...args) => { if (SM_DEBUG) console.log('[SM]', ...args); };
const smDebug = (...args) => { if (SM_DEBUG) console.debug('[SM]', ...args); };
const smWarn = (...args) => { if (SM_DEBUG) console.warn('[SM]', ...args); };
const smError = (...args) => { if (SM_DEBUG) console.error('[SM]', ...args); };

const SM_LANGUAGETOOL_API_URL = 'https://api.languagetool.org/v2/check';

function normalizarDominio(valor) {
    return String(valor || '')
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0];
}

function hostCorrespondeDominio(host, dominio) {
    const hostNormalizado = normalizarDominio(host);
    const dominioNormalizado = normalizarDominio(dominio);
    return !!dominioNormalizado && (
        hostNormalizado === dominioNormalizado ||
        hostNormalizado.endsWith(`.${dominioNormalizado}`)
    );
}

function listaTemDominio(host, lista) {
    return (lista || []).some(d => hostCorrespondeDominio(host, d));
}
