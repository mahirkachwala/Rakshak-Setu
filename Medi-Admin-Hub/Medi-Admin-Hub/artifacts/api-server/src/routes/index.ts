import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import dashboardRouter from "./dashboard";
import appointmentsRouter from "./appointments";
import patientsRouter from "./patients";
import slotsRouter from "./slots";
import centersRouter from "./centers";
import vaccinationsRouter from "./vaccinations";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/dashboard", dashboardRouter);
router.use("/appointments", appointmentsRouter);
router.use("/patients", patientsRouter);
router.use("/slots", slotsRouter);
router.use("/centers", centersRouter);
router.use("/vaccinations", vaccinationsRouter);

export default router;
