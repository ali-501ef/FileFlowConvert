import { Router } from "express";
import { heicConvertIfHeic } from "./controllers/heicController";

const router = Router();
// Mount on SAME path your client already posts to.
// This runs first and only handles HEIC; non‑HEIC calls next()
router.post("/convert", heicConvertIfHeic);

export default router;