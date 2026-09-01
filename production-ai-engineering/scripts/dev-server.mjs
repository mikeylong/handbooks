import { createReadStream, existsSync, watch } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspace = path.resolve(scriptDirectory, "..");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const liveReloadEndpoint = "/__live_reload";
const serverId = randomUUID();
const allowedHostnames = new Set(["127.0.0.1", "localhost", "[::1]", "::1"]);

if (host !== "0.0.0.0" && host !== "::") {
  allowedHostnames.add(host.toLowerCase());
}

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error(`PORT must be an integer from 1 to 65535; received ${process.env.PORT}`);
}

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".gif", "image/gif"],
  [".html", "text/html; charset=utf-8"],
  [".ico", "image/x-icon"],
  [".jpeg", "image/jpeg"],
  [".jpg", "image/jpeg"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".md", "text/markdown; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".pdf", "application/pdf"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
  [".woff2", "font/woff2"],
]);

const liveReloadClient = `<script data-dev-live-reload>
(() => {
  const root = document.documentElement;
  const serverKey = "production-ai-handbook-live-reload-server";
  const events = new EventSource("${liveReloadEndpoint}");

  events.addEventListener("connected", (event) => {
    const previousServer = sessionStorage.getItem(serverKey);
    root.dataset.liveReload = "connected";

    if (previousServer && previousServer !== event.data) {
      sessionStorage.setItem(serverKey, event.data);
      window.location.reload();
      return;
    }

    sessionStorage.setItem(serverKey, event.data);
  });

  events.addEventListener("reload", () => window.location.reload());
  events.addEventListener("error", () => {
    root.dataset.liveReload = "reconnecting";
  });
})();
</script>`;

const reloadClients = new Set();
const watchers = [];
const pendingChanges = new Set();
let reloadTimer;
let reloadSequence = 0;

function sendText(response, statusCode, body, headers = {}) {
  const payload = Buffer.from(body);
  response.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Length": payload.length,
    "Content-Type": "text/plain; charset=utf-8",
    ...headers,
  });
  response.end(payload);
}

function openLiveReloadStream(request, response) {
  response.writeHead(200, {
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "X-Accel-Buffering": "no",
  });
  response.write(`event: connected\ndata: ${serverId}\n\n`);
  reloadClients.add(response);

  const keepAlive = setInterval(() => response.write(": keep-alive\n\n"), 25_000);
  const close = () => {
    clearInterval(keepAlive);
    reloadClients.delete(response);
  };

  request.on("close", close);
  response.on("close", close);
}

function broadcastReload() {
  reloadTimer = undefined;
  reloadSequence += 1;
  const changed = [...pendingChanges].sort();
  pendingChanges.clear();
  const payload = JSON.stringify({ changed, sequence: reloadSequence });

  for (const response of reloadClients) {
    response.write(`event: reload\ndata: ${payload}\n\n`);
  }

  console.log(`Reload ${reloadSequence}: ${changed.join(", ")}`);
}

function scheduleReload(changedPath) {
  pendingChanges.add(changedPath.split(path.sep).join("/"));
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(broadcastReload, 150);
}

function requestHostIsAllowed(request) {
  const hostHeader = request.headers.host?.trim();
  if (!hostHeader) return false;

  try {
    const hostname = new URL(`http://${hostHeader}`).hostname.toLowerCase();
    return allowedHostnames.has(hostname);
  } catch {
    return false;
  }
}

function requestPathIsPublic(pathname) {
  return pathname === "/handbook"
    || pathname.startsWith("/handbook/")
    || pathname === "/output/pdf/production-ai-engineering-v1.2.0-2026-08-31.pdf";
}

function resolveRequestPath(pathname) {
  let decodedPath;

  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  if (decodedPath.includes("\0")) return null;

  const segments = decodedPath.split("/").filter(Boolean);
  if (segments.some((segment) => segment === ".." || segment.startsWith("."))) {
    return null;
  }

  const resolvedPath = path.resolve(workspace, `.${decodedPath}`);
  if (resolvedPath !== workspace && !resolvedPath.startsWith(`${workspace}${path.sep}`)) {
    return null;
  }

  return resolvedPath;
}

async function serveFile(request, response, filePath, fileStats) {
  const extension = path.extname(filePath).toLowerCase();
  const contentType = contentTypes.get(extension) || "application/octet-stream";

  if (extension === ".html") {
    const source = await readFile(filePath, "utf8");
    const developmentAssetToken = `${serverId}-${reloadSequence}`;
    const versionedSource = source.replace(
      /((?:href|src)=")(styles\.css|app\.js)(\?[^\"]*)?(\")/g,
      (_match, prefix, asset, query = "", suffix) => (
        `${prefix}${asset}${query}${query ? "&" : "?"}dev=${developmentAssetToken}${suffix}`
      ),
    );
    const html = /<\/body>/i.test(versionedSource)
      ? versionedSource.replace(/<\/body>/i, `${liveReloadClient}\n</body>`)
      : `${versionedSource}\n${liveReloadClient}`;
    const payload = Buffer.from(html);

    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Length": payload.length,
      "Content-Type": contentType,
    });
    response.end(request.method === "HEAD" ? undefined : payload);
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Length": fileStats.size,
    "Content-Type": contentType,
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  const stream = createReadStream(filePath);
  stream.on("error", (error) => {
    console.error(error);
    response.destroy(error);
  });
  stream.pipe(response);
}

async function handleRequest(request, response) {
  if (!requestHostIsAllowed(request)) {
    sendText(response, 421, "Misdirected request");
    return;
  }

  const requestUrl = new URL(request.url || "/", `http://${request.headers.host || host}`);

  if (requestUrl.pathname === liveReloadEndpoint) {
    if (request.method !== "GET") {
      sendText(response, 405, "Method not allowed", { Allow: "GET" });
      return;
    }

    openLiveReloadStream(request, response);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    sendText(response, 405, "Method not allowed", { Allow: "GET, HEAD" });
    return;
  }

  if (requestUrl.pathname === "/") {
    response.writeHead(302, { Location: "/handbook/" });
    response.end();
    return;
  }

  if (!requestPathIsPublic(requestUrl.pathname)) {
    sendText(response, 404, "Not found");
    return;
  }

  let filePath = resolveRequestPath(requestUrl.pathname);
  if (!filePath) {
    sendText(response, 400, "Invalid path");
    return;
  }

  let fileStats;
  try {
    fileStats = await stat(filePath);
  } catch {
    sendText(response, 404, "Not found");
    return;
  }

  if (fileStats.isDirectory()) {
    if (!requestUrl.pathname.endsWith("/")) {
      response.writeHead(302, { Location: `${requestUrl.pathname}/${requestUrl.search}` });
      response.end();
      return;
    }

    filePath = path.join(filePath, "index.html");
    try {
      fileStats = await stat(filePath);
    } catch {
      sendText(response, 404, "Not found");
      return;
    }
  }

  if (!fileStats.isFile()) {
    sendText(response, 404, "Not found");
    return;
  }

  await serveFile(request, response, filePath, fileStats);
}

const server = createServer((request, response) => {
  handleRequest(request, response).catch((error) => {
    console.error(error);
    if (!response.headersSent) sendText(response, 500, "Internal server error");
    else response.destroy(error);
  });
});

for (const target of [path.join(workspace, "handbook"), path.join(workspace, "output", "pdf")]) {
  if (!existsSync(target)) continue;

  const watcher = watch(target, { recursive: true }, (_eventType, filename) => {
    const changedPath = path.relative(workspace, path.join(target, filename?.toString() || ""));
    if (changedPath.split(path.sep).some((segment) => segment.startsWith("."))) return;
    scheduleReload(changedPath);
  });

  watcher.on("error", (error) => console.error(`Watcher error for ${target}:`, error));
  watchers.push(watcher);
}

function shutdown(signal) {
  console.log(`\n${signal} received; stopping development server.`);
  clearTimeout(reloadTimer);
  for (const watcher of watchers) watcher.close();
  for (const response of reloadClients) response.end();
  server.close(() => process.exit(0));
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

server.listen(port, host, () => {
  console.log(`Production AI Engineering development server`);
  console.log(`http://${host}:${port}/handbook/`);
  console.log("Live reload watches handbook/ and output/pdf/. Press Ctrl+C to stop.");
});
