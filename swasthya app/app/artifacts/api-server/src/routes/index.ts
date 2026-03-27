import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import childrenRouter from "./children";
import vaccinesRouter from "./vaccines";
import centersRouter from "./centers";
import bookingsRouter from "./bookings";
import recordsRouter from "./records";
import aiRouter from "./ai";
import dashboardRouter from "./dashboard";
import assistantRouter from "./assistant";
import middlewareRouter from "./middleware";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/users", usersRouter);
router.use("/children", childrenRouter);
router.use("/vaccines", vaccinesRouter);
router.use("/centers", centersRouter);
router.use("/bookings", bookingsRouter);
router.use("/records", recordsRouter);
router.use("/ai", aiRouter);
router.use("/dashboard", dashboardRouter);
router.use("/assistant", assistantRouter);
router.use("/hardware", middlewareRouter);

export default router;
