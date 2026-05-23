import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const envPath = join(process.cwd(), ".env.local");
const codespaceName = process.env.CODESPACE_NAME;
const forwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || "app.github.dev";

function hasBackendUrl(content) {
  return /^NEXT_PUBLIC_BACKEND_URL\s*=\s*.+/m.test(content);
}

function buildCodespaceBackendUrl() {
  if (!codespaceName) return null;
  return `https://${codespaceName}-8000.${forwardingDomain}`;
}

const existing = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

if (process.env.NEXT_PUBLIC_BACKEND_URL || hasBackendUrl(existing)) {
  console.log("[dev-env] NEXT_PUBLIC_BACKEND_URL already configured.");
  process.exit(0);
}

const backendUrl = buildCodespaceBackendUrl();

if (!backendUrl) {
  console.log("[dev-env] Not running in GitHub Codespaces; using app fallback http://localhost:8000.");
  process.exit(0);
}

const nextContent = `${existing}${existing && !existing.endsWith("\n") ? "\n" : ""}NEXT_PUBLIC_BACKEND_URL=${backendUrl}\n`;
writeFileSync(envPath, nextContent, "utf8");
console.log(`[dev-env] Wrote NEXT_PUBLIC_BACKEND_URL=${backendUrl} to .env.local`);
console.log("[dev-env] Make sure Codespaces port 8000 is running and public/visible to your browser.");
