/* eslint-disable no-console */
import http from "node:http";

interface HealthStatus {
  status: "healthy" | "unhealthy";
  worker: string;
  uptime: number;
  timestamp: string;
}

export function startHealthServer(workerName: string, port: number): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      const status: HealthStatus = {
        status: "healthy",
        worker: workerName,
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(status));
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  });

  server.listen(port, () => {
    console.log(`[${workerName}] Health server listening on port ${port}`);
  });

  return server;
}
