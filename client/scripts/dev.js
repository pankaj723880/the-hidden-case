const { spawn } = require("child_process");
const net = require("net");
const path = require("path");

const preferredPorts = [3000, 3001, 3002, 3003, 3004, 3005];

function canListen(port, host) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

async function isPortFree(port) {
  const ipv4Free = await canListen(port, "0.0.0.0");
  if (!ipv4Free) return false;
  return canListen(port, "::");
}

async function findFreePort() {
  for (const port of preferredPorts) {
    if (await isPortFree(port)) return port;
  }

  throw new Error(`No free port found in ${preferredPorts.join(", ")}`);
}

async function main() {
  const port = await findFreePort();
  console.log(`Starting Webpack dev server on http://localhost:${port}`);

  const webpackServePackage = require.resolve("webpack-dev-server/package.json");
  const webpackServeBin = path.join(
    path.dirname(webpackServePackage),
    "bin",
    "webpack-dev-server.js",
  );
  const child = spawn(
    process.execPath,
    [
      webpackServeBin,
      "--mode",
      "development",
      "--host",
      "0.0.0.0",
      "--port",
      String(port),
      "--config",
      "webpack.config.cjs",
    ],
    {
      stdio: "inherit",
      shell: false,
    },
  );

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
