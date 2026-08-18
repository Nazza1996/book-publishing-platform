import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt.js";
import User from "../models/User.js";

export interface AuthUser {
    id: number;
    username: string;
    role: "admin" | "reader";
    active: boolean;
    passwordChangedAt?: number | null;
}

export function getAccessTokenUser(req: Request): AuthUser | null {
    const token = req.cookies?.token;

    if (!token) {
        return null;
    }

    try {
        return verifyToken(token) as AuthUser;
    } catch {
        return null;
    }
}

export function hasValidAccessToken(req: Request) {
    const user = getAccessTokenUser(req);
    return Boolean(user?.active);
}

export async function getCurrentActiveUser(req: Request): Promise<AuthUser | null> {
    const tokenUser = getAccessTokenUser(req);

    if (!tokenUser) {
        return null;
    }

    const user = await User.findByPk(tokenUser.id, {
        attributes: ["id", "username", "role", "active", "password_changed_at"],
    });

    if (!user || !user.active || !isTokenCurrentForUser(tokenUser, user)) {
        return null;
    }

    return {
        id: user.id,
        username: user.username,
        role: user.role,
        active: user.active,
        passwordChangedAt: user.password_changed_at?.getTime() ?? null,
    };
}

export function isTokenCurrentForUser(tokenUser: AuthUser, user: User) {
    if (!user.password_changed_at) {
        return true;
    }

    return tokenUser.passwordChangedAt === user.password_changed_at.getTime();
}

export async function requireAccessToken(req: Request, res: Response, next: NextFunction) {
    const user = await getCurrentActiveUser(req);

    if (user) {
        (req as any).user = user;
        return next();
    }

    return res.status(401).json({ error: "Not authenticated" });
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const tokenUser = getAccessTokenUser(req);
    const user = await getCurrentActiveUser(req);

    if (user?.role === "admin") {
        (req as any).user = user;
        return next();
    }

    return res.status(tokenUser ? 403 : 401).json({ error: tokenUser ? "Admin access required" : "Not authenticated" });
}
