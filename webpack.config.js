const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    mode: 'production',
    entry: {
        content: './src/content/index.js',
        background: './src/background.js',
        popup: './src/popup.js',
        options: './src/options.js',
        'public-api': './src/public-api.js'
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].bundle.js',
        clean: true
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }
            }
        ]
    },
    plugins: [
        new CopyWebpackPlugin({
            patterns: [
                { from: 'manifest.json', to: 'manifest.json' },
                { from: 'css', to: 'css' },
                { from: 'icons', to: 'icons' },
                { from: '*.html', to: '[name][ext]' },
                { from: 'welcome.html', to: 'welcome.html' },
                { from: 'teste.html', to: 'teste.html' },
                { from: 'api-usage.html', to: 'api-usage.html' },
                { from: 'api-docs.html', to: 'api-docs.html' }
            ]
        })
    ],
    optimization: {
        minimize: true
    }
};