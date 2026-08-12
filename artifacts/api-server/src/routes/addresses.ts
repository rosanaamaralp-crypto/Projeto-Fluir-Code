import { Router } from "express";
import { AddressesController } from "../controllers/addresses.controller.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { validateBody } from "../middlewares/validate.js";
import { UpsertAddressSchema } from "../validators/addresses.validator.js";

const router = Router();

router.get("/clients/:clientId/addresses", requireAuth, AddressesController.get);
router.post("/clients/:clientId/addresses", requireAuth, validateBody(UpsertAddressSchema), AddressesController.upsert);
router.put("/clients/:clientId/addresses", requireAuth, validateBody(UpsertAddressSchema), AddressesController.upsert);
router.delete("/clients/:clientId/addresses", requireAuth, AddressesController.remove);

export default router;
