import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import assembliesRouter from "./assemblies.js";
import usersRouter from "./users.js";
import stockRouter from "./stock.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(assembliesRouter);
router.use(usersRouter);
router.use(stockRouter);

export default router;
