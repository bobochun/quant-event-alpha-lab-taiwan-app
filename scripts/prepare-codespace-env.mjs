import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const envPath = join(process.cwd(), ".env.local");
const codespaceName = process.env.CODESPACE_NAME;
const proxyBackendUrl = "/api/backend";

function hasBackendUrl(content) {
  return /^NEXT_PUBLIC_BACKEND_URL\s*=\s*.+/m.test(content);
}

const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

if (process.env.NEXT_PUBLIC_BACKEND_URL || hasBackendUrl(existing)) {
  console.log("[dev-env] NEXT_PUBLIC_BACKEND_URL already configured.");
  console.log("[dev-env] Remove .env.local and rerun npm run dev:codespace if you want to use the same-origin proxy.");
  process.exit(0);
}

if (!codespaceName) {
  console.log("[dev-env] Not running in GitHub Codespaces; using app fallback http://localhost:8000.");
  process.exit(0);
}

const nextContent = `${existing}${existing && !existing.endsWith("\n") ? "\n" : ""}NEXT_PUBLIC_BACKEND_URL=${proxyBackendUrl}\n`;
writeFileSync(envPath, nextContent, "utf8");
console.log(`[dev-env] Wrote NEXT_PUBLIC_BACKEND_URL=${proxyBackendUrl} to .env.local`);
console.log("[dev-env] Browser requests will go to Next.js /api/backend/*, then proxy to FastAPI on localhost:8000.");
console.log("[dev-env] Make sure FastAPI is running inside Codespaces on port 8000.");
