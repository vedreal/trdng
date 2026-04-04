import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/binance/klines", async (req, res) => {
  const { symbol = "BTCUSDT", interval = "1m", limit = "60" } = req.query;
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url);
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
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`;
    const response = await fetch(url);
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
