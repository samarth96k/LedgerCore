import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { logger } from "../config/logger.js";

declare global {
    namespace Express {
        interface Request {
            traceId: string;
        }
    }
}

export const requestLogger = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const traceId = crypto.randomUUID();

    req.traceId = traceId;

    const start = process.hrtime.bigint();

    logger.info(
        {
            traceId,
            method: req.method,
            url: req.originalUrl,
            ip: req.ip,
        },
        "Incoming Request"
    );

    res.on("finish", () => {
        const end = process.hrtime.bigint();

        const duration =
            Number(end - start) / 1_000_000;

        logger.info(
            {
                traceId,
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                duration: `${duration.toFixed(2)} ms`,
            },
            "Request Completed"
        );
    });

    next();
};