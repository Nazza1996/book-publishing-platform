import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_SECRET!;

export const signToken = (payload: object) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

export const verifyToken = (token: string) => {
    return jwt.verify(token, JWT_SECRET);
}

export const signRefreshToken = (payload: object) => {
    return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "30d" });
}

export const verifyRefreshToken = (token: string) => {
    return jwt.verify(token, REFRESH_SECRET);
}