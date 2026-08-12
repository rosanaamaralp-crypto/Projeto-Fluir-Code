import { Router } from "express";
import { AddressesController } from "../controllers/addresses.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import { UpsertAddressSchema } from "../validators/addresses.validator.js";
import { ParamsClientIdSchema } from "../validators/params.validator.js";

const router = Router();

// P6: UUID de clientId validado antes de chegar ao controller
router.get("/clients/:clientId/addresses", requireAuth, validateParams(ParamsClientIdSchema), AddressesController.get);
router.post("/clients/:clientId/addresses", requireAuth, validateParams(ParamsClientIdSchema), validateBody(UpsertAddressSchema), AddressesController.upsert);
router.put("/clients/:clientId/addresses", requireAuth, validateParams(ParamsClientIdSchema), validateBody(UpsertAddressSchema), AddressesController.upsert);
router.delete("/clients/:clientId/addresses", requireAuth, validateParams(ParamsClientIdSchema), AddressesController.remove);

export default router;
