import express from "express";
import validateBody from '../../../infrastructure/security/validateBody.middleware.js'
import { AuthController } from "../controllers/auth.controller.js";
import { loginSchema } from "../../../application/validationSchemas/login.schema.js";

const router = express.Router();

router.post("/login", validateBody(loginSchema), AuthController.login);
// router.post("/refresh", AuthController.refreshToken);
// router.post("/logout", AuthController.logout);

export default router;
