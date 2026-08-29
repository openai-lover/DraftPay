import type { MetadataRoute } from "next";
import { createDemoContests } from "@draftpay/shared";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const now = new Date();
  const staticPaths = ["", "/contests", "/activity", "/agents/northstar", "/proof"];
  const contestPaths = createDemoContests().flatMap((contest) => [
    `/contests/${contest.id}`,
    `/contests/${contest.id}/compare`,
  ]);

  return [...staticPaths, ...contestPaths].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/proof" ? 0.9 : 0.7,
  }));
}
