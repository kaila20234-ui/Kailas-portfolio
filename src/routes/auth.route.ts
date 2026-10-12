import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import path from "path";

const router = Router();

// GET /admin/login — public login page
router.get("/admin/login", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "..", "views", "admin-login.html"));
});

// POST /admin/login — verify credentials against env vars, start a session
router.post("/admin/login", async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminUsername || !adminPasswordHash) {
    console.error("ADMIN_USERNAME / ADMIN_PASSWORD_HASH are not set in .env");
    res.status(500).json({ success: false, message: "Admin login is not configured yet." });
    return;
  }

  const usernameMatches = username === adminUsername;
  const passwordMatches = usernameMatches
    ? await bcrypt.compare(password ?? "", adminPasswordHash)
    : false;

  if (!usernameMatches || !passwordMatches) {
    res.status(401).json({ success: false, message: "Incorrect username or password." });
    return;
  }

  req.session.isAdmin = true;
  res.json({ success: true });
});

// POST /admin/logout — end the session
router.post("/admin/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

export default router;
