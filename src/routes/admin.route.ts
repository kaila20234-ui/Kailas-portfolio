import { Router, Request, Response } from "express";
import path from "path";
import multer from "multer";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import * as store from "../data/store";

const router = Router();

// GET /admin — the dashboard itself, gated by requireAuth
router.get("/admin", requireAuth, (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "..", "views", "admin-dashboard.html"));
});

// ---------- File uploads (photo / resume) ----------

const uploadDir = path.join(__dirname, "..", "..", "public", "uploads");

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const safeName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, safeName);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".png", ".jpg", ".jpeg", ".webp", ".pdf"];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

router.post(
  "/api/admin/upload",
  requireAuth,
  upload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded, or file type not allowed." });
      return;
    }
    const url = `/uploads/${req.file.filename}`;
    const asset = path.extname(req.file.originalname).toLowerCase() === ".pdf"
      ? "resumeUrl"
      : "photoUrl";
    await store.setProfileAsset(asset, url);
    res.status(201).json({ url, asset });
  })
);

// ---------- Projects CRUD (all protected) ----------

router.post("/api/admin/projects", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { name, description, tags, liveUrl, sourceUrl } = req.body ?? {};
  if (!name || !description) {
    res.status(400).json({ error: "name and description are required." });
    return;
  }
  const created = await store.addProject({
    name,
    description,
    tags: Array.isArray(tags) ? tags : [],
    liveUrl,
    sourceUrl,
  });
  res.status(201).json(created);
}));

router.put("/api/admin/projects/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const updated = await store.updateProject(req.params.id, req.body ?? {});
  if (!updated) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  res.json(updated);
}));

router.delete("/api/admin/projects/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const ok = await store.deleteProject(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Project not found." });
    return;
  }
  res.status(204).send();
}));

// ---------- Contact inbox (all protected) ----------

router.get("/api/admin/contacts", requireAuth, asyncHandler(async (_req: Request, res: Response) => {
  res.json({ contacts: await store.getContacts() });
}));

router.patch("/api/admin/contacts/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const updates: { isRead?: boolean; handled?: boolean } = {};
  if (typeof req.body?.isRead === "boolean") updates.isRead = req.body.isRead;
  if (typeof req.body?.handled === "boolean") updates.handled = req.body.handled;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Provide isRead or handled as a boolean." });
    return;
  }
  const updated = await store.updateContact(req.params.id, updates);
  if (!updated) {
    res.status(404).json({ error: "Contact message not found." });
    return;
  }
  res.json(updated);
}));

router.delete("/api/admin/contacts/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const ok = await store.deleteContact(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Contact message not found." });
    return;
  }
  res.status(204).send();
}));

// ---------- Experience CRUD (all protected) ----------

router.post("/api/admin/experience", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { dateRange, role, org, description } = req.body ?? {};
  if (!dateRange || !role || !org || !description) {
    res.status(400).json({ error: "dateRange, role, org, and description are required." });
    return;
  }
  const created = await store.addExperience({ dateRange, role, org, description });
  res.status(201).json(created);
}));

router.put("/api/admin/experience/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const updated = await store.updateExperience(req.params.id, req.body ?? {});
  if (!updated) {
    res.status(404).json({ error: "Experience entry not found." });
    return;
  }
  res.json(updated);
}));

router.delete("/api/admin/experience/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const ok = await store.deleteExperience(req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Experience entry not found." });
    return;
  }
  res.status(204).send();
}));

export default router;
