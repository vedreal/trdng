import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  coin: string;
}

const COIN_KEYWORDS: Record<string, string[]> = {
  BTC: ["bitcoin", "btc"],
  ETH: ["ethereum", "eth"],
  BNB: ["bnb", "binance coin", "binance smart chain"],
  SOL: ["solana", "sol"],
};

function detectCoin(text: string): string {
  const lower = text.toLowerCase();
  for (const [coin, kws] of Object.entries(COIN_KEYWORDS)) {
    if (kws.some((k) => lower.includes(k))) return coin;
  }
  return "CRYPTO";
}

function extractTag(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i");
  return xml.match(re)?.[1]?.trim() ?? "";
}

async function fetchFeed(url: string, source: string): Promise<NewsItem[]> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CryptoNewsBot/1.0)" },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();

  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  const result: NewsItem[] = [];
  for (const item of items) {
    const title = extractTag(item, "title");
    if (!title) continue;
    const link =
      extractTag(item, "link") ||
      extractTag(item, "guid") ||
      "#";
    const pubDate = extractTag(item, "pubDate");
    result.push({ title, link, pubDate, source, coin: detectCoin(title) });
  }
  return result;
}

router.get("/news", async (_req, res) => {
  const FEEDS = [
    { url: "https://cointelegraph.com/rss",  source: "Cointelegraph" },
    { url: "https://bitcoinist.com/feed/",   source: "Bitcoinist"   },
    { url: "https://decrypt.co/feed",        source: "Decrypt"      },
    { url: "https://cryptopotato.com/feed/", source: "CryptoPotato" },
  ];

  const allItems: NewsItem[] = [];
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

  await Promise.allSettled(
    FEEDS.map(async ({ url, source }) => {
      try {
        const items = await fetchFeed(url, source);
        allItems.push(...items);
      } catch {
        /* skip failed source */
      }
    })
  );

  allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  const seen = new Set<string>();
  const result = allItems
    .filter((it) => {
      const ts = it.pubDate ? new Date(it.pubDate).getTime() : 0;
      if (ts > 0 && ts < thirtyDaysAgo) return false;
      if (seen.has(it.title)) return false;
      seen.add(it.title);
      return true;
    })
    .slice(0, 5);

  res.set("Cache-Control", "no-store");
  res.json(result);
});

export default router;
