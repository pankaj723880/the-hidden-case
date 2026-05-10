import http from "http";
import { createApp } from "./app.js";
import { setupSocket } from "./socket.js";
import { env } from "./config/env.js";
import { connectToMongo } from "./db/mongoose.js";
import { initScheduler } from "./scheduler.js";
import { initWorkers } from "./queues/workers.js";

export async function startServer() {
  await connectToMongo();

  const app = createApp();
  const httpServer = http.createServer(app);

  setupSocket(httpServer);
  initScheduler();
  initWorkers();

  const port = Number(process.env.PORT ?? env.PORT);
  httpServer.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      // eslint-disable-next-line no-console
      console.log(`Server is already running or port ${port} is busy.`);
      // eslint-disable-next-line no-console
      console.log(`Use http://localhost:${port} if the existing server is this app.`);
      process.exit(0);
    }

    throw err;
  });

  httpServer.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on http://localhost:${port}`);
  });
}
