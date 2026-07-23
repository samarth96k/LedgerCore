import "express";

declare global {
    namespace Express {
        interface Request {
            user: {
                id: string;
                accountId: string;
                role: string;
            };
        }
    }
}