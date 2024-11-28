const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");
const {
    NODE_ENV = 'production',
} = process.env;
module.exports = {
    entry: './src/app.ts',
    mode: NODE_ENV,
    target: 'node',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'jhs-thirdpartyapi-gateway.js',        
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    'ts-loader',
                ]
            }
        ]
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                {
                    from: "./thirdpartyconfig.json",
                },
            ],
        }),
    ],
    optimization: {
        minimize: false
    }
}
