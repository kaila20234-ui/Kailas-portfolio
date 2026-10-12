import { Request, Response, NextFunction } from "express";

// Blocks anyone without an authenticated admin session.
// API calls get a 401; direct page loads get redirected to the login page.
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.isAdmin) {
    next();
    return;
  }

  if (req.path.startsWith("/api/")) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  res.redirect("/admin/login");
}
