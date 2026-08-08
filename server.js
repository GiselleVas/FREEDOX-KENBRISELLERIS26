const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "frontend");
const port = Number(process.env.PORT) || 8080;
const env = Object.fromEntries(
  fs.readFileSync(path.join(__dirname, ".env"), "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split("="))
);
const supabaseUrl = env.PUBLIC_SUPABASE_URL;
const supabaseKey = env.PUBLIC_SUPABASE_ANON_KEY;
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

function sendJson(response, status, data) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(data));
}

async function readBody(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

async function supabase(table, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}${options.query || ""}`, {
    method: options.method || "GET",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Supabase returned ${response.status}`);
  return text ? JSON.parse(text) : null;
}

async function handleApi(request, response, pathname) {
  try {
    if (request.method === "GET" && pathname === "/api/data") {
      const [companies, placementDrives, academicYears] = await Promise.all([
        supabase("companies", { query: "?select=*&order=id" }),
        supabase("placement_drives", { query: "?select=*&order=id" }),
        supabase("academic_years", { query: "?select=*&order=id" })
      ]);
      sendJson(response, 200, { companies, placementDrives, academicYears });
      return;
    }

    const body = await readBody(request);
    if (request.method === "POST" && pathname === "/api/companies") {
      sendJson(response, 201, (await supabase("companies", { method: "POST", body }))[0]);
      return;
    }
    if (request.method === "POST" && pathname === "/api/academic-years") {
      sendJson(response, 201, (await supabase("academic_years", { method: "POST", body }))[0]);
      return;
    }
    if (request.method === "POST" && pathname === "/api/drives") {
      sendJson(response, 201, (await supabase("placement_drives", { method: "POST", body }))[0]);
      return;
    }

    const driveId = pathname.match(/^\/api\/drives\/(\d+)$/)?.[1];
    if (driveId && request.method === "PATCH") {
      sendJson(response, 200, (await supabase("placement_drives", { method: "PATCH", query: `?id=eq.${driveId}`, body }))[0]);
      return;
    }
    if (driveId && request.method === "DELETE") {
      await supabase("placement_drives", { method: "DELETE", query: `?id=eq.${driveId}` });
      response.writeHead(204).end();
      return;
    }
    sendJson(response, 404, { error: "API route not found" });
  } catch (error) {
    console.error(error);
    sendJson(response, 500, { error: "Database request failed" });
  }
}

http.createServer((request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname.startsWith("/api/")) {
    handleApi(request, response, pathname);
    return;
  }
  const relativePath = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(root + path.sep) && filePath !== path.join(root, "index.html")) {
    response.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === "ENOENT" ? 404 : 500).end(error.code === "ENOENT" ? "Not found" : "Server error");
      return;
    }
    response.writeHead(200, { "Content-Type": types[path.extname(filePath)] || "application/octet-stream" });
    response.end(content);
  });
}).listen(port, "127.0.0.1", () => {
  console.log(`Frontend running at http://localhost:${port}`);
});
