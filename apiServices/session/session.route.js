import express from 'express';
import validateBody from '../../middlewares/validateBody.js';
import { loginSchema } from './validationSchemas/loginSchema.js';
import { loginController } from './session.controller.js';

const sessionRouter = express.Router();

sessionRouter.post('/login', validateBody(loginSchema), loginController);

export default sessionRouter;
