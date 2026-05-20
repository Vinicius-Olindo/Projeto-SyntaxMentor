// =============================================
// Testes para options-geral.js — v2.8.0
// =============================================

describe('migracao de atalhos (altKey incorreto)', () => {
    function migrarAtalhos(storage) {
        const correcoes = {};
        const keys = ['toggleShortcut','ignoreShortcut','corrigirTudoShortcut','ativarShortcut','desativarShortcut'];
        keys.forEach(k => {
            const s = storage[k];
            if (s && !s.altKey && !s.ctrlKey && !s.shiftKey) {
                correcoes[k] = { ...s, altKey: true, display: 'Alt + ' + s.key.toUpperCase() };
            }
        });
        return correcoes;
    }

    test('corrige atalho gravado sem modificador', () => {
        const storage = {
            toggleShortcut: { altKey: false, ctrlKey: false, shiftKey: false, key: 's', display: 'Alt + S' }
        };
        const result = migrarAtalhos(storage);
        expect(result.toggleShortcut.altKey).toBe(true);
        expect(result.toggleShortcut.display).toBe('Alt + S');
    });

    test('nao altera atalho com altKey correto', () => {
        const storage = {
            toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's', display: 'Alt + S' }
        };
        const result = migrarAtalhos(storage);
        expect(result.toggleShortcut).toBeUndefined();
    });

    test('nao altera atalho com ctrlKey', () => {
        const storage = {
            toggleShortcut: { altKey: false, ctrlKey: true, shiftKey: false, key: 's', display: 'Ctrl + S' }
        };
        const result = migrarAtalhos(storage);
        expect(result.toggleShortcut).toBeUndefined();
    });

    test('corrige multiplos atalhos de uma vez', () => {
        const storage = {
            ativarShortcut:   { altKey: false, ctrlKey: false, shiftKey: false, key: '4', display: 'Alt + 4' },
            desativarShortcut: { altKey: false, ctrlKey: false, shiftKey: false, key: '5', display: 'Alt + 5' }
        };
        const result = migrarAtalhos(storage);
        expect(result.ativarShortcut.altKey).toBe(true);
        expect(result.desativarShortcut.altKey).toBe(true);
    });

    test('retorna objeto vazio se nenhuma correcao necessaria', () => {
        const storage = {
            toggleShortcut: { altKey: true, ctrlKey: false, shiftKey: false, key: 's', display: 'Alt + S' }
        };
        expect(Object.keys(migrarAtalhos(storage)).length).toBe(0);
    });
});

describe('gravacao de atalho (forcedAltKey)', () => {
    function montarShortcut(e) {
        const shortcut = {
            altKey: e.altKey,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            key: e.key.toLowerCase()
        };

        let display = [];
        if (shortcut.ctrlKey)  display.push('Ctrl');
        if (shortcut.altKey)   display.push('Alt');
        if (shortcut.shiftKey) display.push('Shift');
        display.push(e.key.toUpperCase());

        if (!e.ctrlKey && !e.altKey && !e.shiftKey) {
            shortcut.altKey = true;
            shortcut.ctrlKey = false;
            shortcut.shiftKey = false;
            shortcut.display = 'Alt + ' + e.key.toUpperCase();
        } else {
            shortcut.display = display.join(' + ');
        }

        return shortcut;
    }

    test('forca altKey quando nenhum modificador pressionado', () => {
        const s = montarShortcut({ altKey: false, ctrlKey: false, shiftKey: false, key: 's' });
        expect(s.altKey).toBe(true);
        expect(s.display).toBe('Alt + S');
    });

    test('preserva combinacao com Ctrl', () => {
        const s = montarShortcut({ altKey: false, ctrlKey: true, shiftKey: false, key: 'k' });
        expect(s.ctrlKey).toBe(true);
        expect(s.altKey).toBe(false);
        expect(s.display).toBe('Ctrl + K');
    });

    test('preserva combinacao com Alt+Shift', () => {
        const s = montarShortcut({ altKey: true, ctrlKey: false, shiftKey: true, key: 'a' });
        expect(s.altKey).toBe(true);
        expect(s.shiftKey).toBe(true);
        expect(s.display).toBe('Alt + Shift + A');
    });

    test('key fica em lowercase no objeto', () => {
        const s = montarShortcut({ altKey: true, ctrlKey: false, shiftKey: false, key: 'S' });
        expect(s.key).toBe('s');
    });
});