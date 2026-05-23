const defaultBackendOrigin = "http://127.0.0.1:8000";
const hopByHopHeaders = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade", "host"]);

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyBackend(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyBackend(request, context);
}

export async function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyBackend(request, context);
}

export async function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyBackend(request, context);
}

async function proxyBackend(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const upstream = buildUpstreamUrl(request, path);
  const headers = new Headers(request.headers);
  for (const header of hopByHopHeaders) headers.delete(header);

  try {
    const response = await fetch(upstream, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      cache: "no-store"
    });
    const responseHeaders = new Headers(response.headers);
    for (const header of hopByHopHeaders) responseHeaders.delete(header);
    responseHeaders.set("x-qeal-backend-proxy", "nextjs-codespaces-proxy");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    return Response.json({
      ok: false,
      data: null,
      error: error instanceof Error ? error.message : "Backend proxy failed",
      dataSource: "Error",
      sourceNote: `Next.js backend proxy could not reach ${getBackendOrigin()}. Make sure FastAPI is running on port 8000.`,
      generatedAt: new Date().toISOString()
    }, { status: 502 });
  }
}

function buildUpstreamUrl(request: Request, path: string[]): string {
  const incoming = new URL(request.url);
  const upstream = new URL(`/${path.map(encodeURIComponent).join("/")}`, getBackendOrigin());
  upstream.search = incoming.search;
  return upstream.toString();
}

function getBackendOrigin(): string {
  const explicit = process.env.BACKEND_INTERNAL_URL || process.env.BACKEND_URL;
  if (explicit && !explicit.startsWith("/")) return explicit.replace(/\/$/, "");
  return defaultBackendOrigin;
}
