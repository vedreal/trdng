import { Router, type IRouter } from "express";

const router: IRouter = Router();

const FAPI_BASE = "https://fapi.binance.com/fapi/v1";

router.get("/binance/klines", async (req, res) => {
  const { symbol = "BTCUSDT", interval = "5m", limit = "100" } = req.query;
  try {
    const url = `${FAPI_BASE}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      res.status(response.status).json({ error: "Upstream error" });
      return;
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch klines" });
  }
});

router.get("/binance/ticker", async (req, res) => {
  const { symbol = "BTCUSDT" } = req.query;
  try {
    const url = `${FAPI_BASE}/ticker/24hr?symbol=${symbol}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) {
      res.status(response.status).json({ error: "Upstream error" });
      return;
    }
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Failed to fetch ticker" });
  }
});

export default router;
