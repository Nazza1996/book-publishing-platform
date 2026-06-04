import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt.js";

export function hasValidAccessToken(req: Request) {
    const token = req.cookies?.token;

    if (!token) {
        return false;
    }

    try {
        verifyToken(token);
        return true;
    } catch {
        return false;
    }
}

export function requireAccessToken(req: Request, res: Response, next: NextFunction) {
    if (hasValidAccessToken(req)) {
        return next();
    }

    return res.status(401).json({ error: "Not authenticated" });
}