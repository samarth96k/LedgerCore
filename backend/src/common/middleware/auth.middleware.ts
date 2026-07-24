import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { JwtUserPayload } from "../../modules/users/auth.types.js";
export function authUser(req: Request, res: Response, next: NextFunction) {
  const { token } = req.headers;
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorised to access this service",
    });
  }
  try {
    if (typeof token !== "string") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
    const token_decode = jwt.verify(token, process.env.JWT_SECRET!) as JwtUserPayload;
    req.user = token_decode;
    console.log(token_decode);
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export function requireAdmin(
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (req.user.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin privileges required.",
        });
    }
    next();
}
