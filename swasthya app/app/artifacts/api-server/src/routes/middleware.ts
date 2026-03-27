import { Router, type IRouter } from "express";
import {
  fetchHardwareMiddlewareInfo,
  getHardwareMiddlewareConfig,
  lookupHardwareContainerPin,
} from "../../../../../../shared/hardwareMiddleware";

const router: IRouter = Router();

router.get("/middleware/info", async (_req, res) => {
  try {
    const payload = await fetchHardwareMiddlewareInfo();
    res.json(payload);
  } catch (error) {
    const config = getHardwareMiddlewareConfig();
    res.status(config.baseUrl ? 502 : 503).json({
      error: error instanceof Error ? error.message : "Unable to reach hardware middleware",
      configuredBaseUrl: config.baseUrl || null,
      timeoutMs: config.timeoutMs,
    });
  }
});

router.get("/middleware/pins/:containerPin", async (req, res) => {
  try {
    const payload = await lookupHardwareContainerPin(req.params.containerPin);
    res.json(payload);
  } catch (error) {
    const config = getHardwareMiddlewareConfig();
    res.status(config.baseUrl ? 502 : 503).json({
      error: error instanceof Error ? error.message : "Unable to reach hardware middleware",
      configuredBaseUrl: config.baseUrl || null,
      timeoutMs: config.timeoutMs,
      containerPin: req.params.containerPin,
    });
  }
});

export default router;
