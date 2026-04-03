import { Router, type IRouter } from "express";
import healthRouter from "./health";
import binanceRouter from "./binance";
import newsRouter from "./news";

const router: IRouter = Router();

router.use(healthRouter);
router.use(binanceRouter);
router.use(newsRouter);

export default router;
