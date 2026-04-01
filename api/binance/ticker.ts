export const config = { runtime: "edge" };

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol") ?? "BTCUSDT";

  const binanceUrl = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;

  try {
    const response = await fetch(binanceUrl);
    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Upstream error" }), {
        status: response.status,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch ticker" }), {
      status: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
