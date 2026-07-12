module.exports = [
    {
        ignores: ['dist/**', 'node_modules/**', 'store-assets/chrome-web-store/**'],
    },
    {
        files: ['js/**/*.js', 'tests/**/*.js', 'scripts/**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'script',
            globals: {
                chrome: 'readonly',
                document: 'readonly',
                window: 'readonly',
                Node: 'readonly',
                MutationObserver: 'readonly',
                AbortController: 'readonly',
                URLSearchParams: 'readonly',
                fetch: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                console: 'readonly',
                localStorage: 'readonly'
            }
        },
        rules: {
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'off'
        }
    }
];
