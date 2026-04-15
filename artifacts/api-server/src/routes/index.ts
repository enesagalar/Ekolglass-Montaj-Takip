import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import assembliesRouter from "./assemblies.js";
import usersRouter from "./users.js";
import stockRouter from "./stock.js";
import glassRequestsRouter from "./glass-requests.js";
import uploadRouter from "./upload.js";
import photosRouter from "./photos.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(assembliesRouter);
router.use(usersRouter);
router.use(stockRouter);
router.use(glassRequestsRouter);
router.use(uploadRouter);
router.use(photosRouter);

export default router;
