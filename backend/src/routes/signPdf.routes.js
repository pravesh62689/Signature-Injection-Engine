import { Router } from "express";
import { signPdfController } from "../services/signPdf.service.js";

const router = Router();

router.post("/sign-pdf", signPdfController);

export default router;
