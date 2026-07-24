import express from "express";  
import { authRouter } from "./modules/users/auth.routes.js";
import { requestLogger } from "./common/middleware/requestLogger.js";
import {logger} from "./common/config/logger.js";
import { router } from "./modules/account/account.routes.js";
import { transactionRouter } from "./modules/Transactions/transaction.routes.js";
import { ledgerRouter } from "./modules/Ledger/ledger.routes.js";

const PORT = process.env.PORT||3000;
const app = express();

app.use(requestLogger);
app.use(express.json());

app.use("/api/user",authRouter);    
app.use("/api/account",router);
app.use("/banking/transaction",transactionRouter);
app.use("/bankind/ledger",ledgerRouter);













































app.get("/",(req,res)=>{res.send("API Working");})
app.listen(PORT,()=>{
    logger.info(`Server started at: ${PORT}`);
})