import express from "express";  
import { authRouter } from "./modules/users/auth.routes.js";
import { requestLogger } from "./common/middleware/requestLogger.js";
import { authUser } from "./common/middleware/auth.middleware.js";
import {logger} from "./common/config/logger.js;
const PORT = process.env.PORT||3000;
const app = express();

app.use(requestLogger);
app.use(express.json());
app.use("/api/user",authRouter);
app.use("/api/account",authUser,)


app.get("/",(req,res)=>{res.send("API Working");})
app.listen(PORT,()=>{
    logger.info(`Server started at: ${PORT}`);
})