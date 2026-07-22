import express from "express";
import { loginUser,registerUser } from "./auth.controller.js";
import { authUser } from "../../common/middleware/auth.middleware.js";
export const authRouter = express.Router();

authRouter.post('/register',registerUser);
authRouter.post('/login',loginUser);

//ROUTES AND CONTROLLERS TO BE ADDED
/**Change password */