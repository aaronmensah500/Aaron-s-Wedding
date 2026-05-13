export function getClientIp(request: Request): string {
  // Prefer platform-set headers that cannot be injected by the client:
  //   cf-connecting-ip  — set by Cloudflare (overwrites any client value)
  //   x-real-ip         — set by Nginx/Vercel reverse proxy
  const cf = request.headers.get("cf-connecting-ip");
  if (cf?.trim()) return cf.trim();

  const real = request.headers.get("x-real-ip");
  if (real?.trim()) return real.trim();

  // X-Forwarded-For is a comma-separated list where the client appends its own
  // IP at the left and each proxy appends at the right. Taking the leftmost value
  // is trivially spoofable — a client can send an arbitrary header. Taking the
  // rightmost value gives the IP as seen by the outermost trusted proxy, which is
  // much harder to fake when the platform terminates TLS.
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const ips = fwd.split(",").map(s => s.trim()).filter(Boolean);
    const last = ips[ips.length - 1];
    if (last) return last;
  }

  return "unknown";
}
