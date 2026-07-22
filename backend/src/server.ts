import express from "express";  
import { authRouter } from "./modules/users/auth.routes.js";
import { requestLogger } from "./common/middleware/requestLogger.js";
const PORT = process.env.PORT||3000;
const app = express();

app.use(requestLogger);
app.use(express.json());
app.use("/api/auth",authRouter);



app.get("/",(req,res)=>{res.send("API Working");})
app.listen(PORT,()=>{
    console.log(`Server started at: ${PORT}`);
})