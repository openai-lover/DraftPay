const LOCAL_SITE_URL = "http://localhost:3000";

function withProtocol(value: string): string {
  return /^https?:\/\//u.test(value) ? value : `https://${value}`;
}

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  return withProtocol(configured || vercel || LOCAL_SITE_URL).replace(/\/$/u, "");
}
