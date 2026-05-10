const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return env;
      const separator = trimmed.indexOf("=");
      if (separator === -1) return env;

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      env[key] = value.replace(/^["']|["']$/g, "");
      return env;
    }, {});
}

const localEnv = loadEnvFile(path.resolve(__dirname, ".env.local"));
const appEnv = Object.entries({ ...localEnv, ...process.env })
  .filter(([key]) => key.startsWith("REACT_APP_"))
  .reduce((env, [key, value]) => {
    env[`process.env.${key}`] = JSON.stringify(value);
    return env;
  }, {});

module.exports = {
  entry: path.resolve(__dirname, "src/main.jsx"),
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "assets/[name].[contenthash].js",
    assetModuleFilename: "assets/[hash][ext][query]",
    clean: true,
    publicPath: "/",
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              ["@babel/preset-env", { targets: "defaults" }],
              ["@babel/preset-react", { runtime: "automatic" }],
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
      {
        test: /\.(png|jpe?g|gif|webp|svg|mp4|webm|ogg)$/i,
        type: "asset/resource",
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "index.html"),
    }),
    {
      apply(compiler) {
        compiler.hooks.afterEmit.tap("CopyPublicAssetsPlugin", () => {
          const publicDir = path.resolve(__dirname, "public");
          const outputDir = path.resolve(__dirname, "dist");
          if (!fs.existsSync(publicDir)) return;
          fs.cpSync(publicDir, outputDir, { recursive: true });
        });
      },
    },
    new webpack.DefinePlugin(appEnv),
  ],
  devServer: {
    historyApiFallback: true,
    hot: true,
    static: {
      directory: path.resolve(__dirname, "public"),
    },
  },
};
