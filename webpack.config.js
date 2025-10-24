const path = require("node:path");
const CopyPlugin = require("copy-webpack-plugin");
const dotenv = require("dotenv");
const webpack = require("webpack");
const env = dotenv.config().parsed; // load .env file

const envKeys = Object.keys(env).reduce((prev, next) => {
	prev[`process.env.${next}`] = JSON.stringify(env[next]);
	return prev;
}, {});

module.exports = {
	mode: "production",
	devtool: false, // Disable source maps to avoid encoding issues
	entry: {
		background: "./src/background/service-worker.ts",
		content: "./src/content/recorder.ts",
		popup: "./src/popup/popup.ts",
		player: "./src/content/player.ts",
	},
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: "[name].js",
		charset: true,
		clean: true,
	},
	target: "web",
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: {
					loader: "ts-loader",
					options: {
						transpileOnly: true,
					},
				},
				exclude: /node_modules/,
			},
		],
	},
	resolve: {
		extensions: [".ts", ".js"],
		fallback: {
			// Prevent polyfills that might cause encoding issues
			fs: false,
			path: false,
		},
	},
	optimization: {
		minimize: true,
		usedExports: true,
		minimizer: [
			(compiler) => {
				const TerserPlugin = require("terser-webpack-plugin");
				new TerserPlugin({
					terserOptions: {
						format: {
							ascii_only: true, // Ensure ASCII output
							comments: false,
						},
						compress: {
							drop_console: false,
							drop_debugger: true,
						},
					},
				}).apply(compiler);
			},
		],
	},
	plugins: [
		new CopyPlugin({
			patterns: [{ from: "public", to: "." }],
		}),
		new webpack.DefinePlugin(envKeys),
	],
	performance: {
		hints: false, // Disable performance hints
		maxAssetSize: 512000,
		maxEntrypointSize: 512000,
	},
};
