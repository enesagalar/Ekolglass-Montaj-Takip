import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"];
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required.");
}

export interface JwtPayload {
  id: string;
  username: string;
  name: string;
  role: string;
  type?: "access" | "refresh";
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET!) as JwtPayload;
    if (payload.type === "refresh") {
      res.status(401).json({ error: "Access token required" });
      return;
    }
    (req as any).user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as JwtPayload;
    if (!roles.includes(user?.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
