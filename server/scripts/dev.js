import { spawn } from "child_process";
import http from "http";
import net from "net";

const port = Number(process.env.PORT || 5001);

function isPortFree(portToCheck) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(portToCheck, "::");
  });
}

function healthCheck() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });

    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function main() {
  const free = await isPortFree(port);

  if (!free) {
    const isCurrentServer = await healthCheck();
    if (isCurrentServer) {
      console.log(`Server is already running: http://localhost:${port}`);
      return;
    }

    console.error(`Port ${port} is already in use by another process.`);
    console.error(`Stop that process or set a different PORT before starting the server.`);
    process.exit(1);
  }

  const child = spawn(process.execPath, ["--watch", "src/index.js"], {
    stdio: "inherit",
    shell: false,
  });

  child.on("exit", (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
