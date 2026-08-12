import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import clientsRouter from "./clients.js";
import professionalsRouter from "./professionals.js";
import servicesRouter from "./services.js";
import resourcesRouter from "./resources.js";
import professionalServicesRouter from "./professional-services.js";
import availabilityRouter from "./availability.js";
import blockedPeriodsRouter from "./blocked-periods.js";
import addressesRouter from "./addresses.js";
import slotsRouter from "./slots.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(clientsRouter);
router.use(professionalsRouter);
router.use(servicesRouter);
router.use(resourcesRouter);
router.use(professionalServicesRouter);
router.use(availabilityRouter);
router.use(blockedPeriodsRouter);
router.use(addressesRouter);
router.use(slotsRouter);

export default router;
