import { Router, Request, Response } from "express";
import { randomUUID } from "crypto";
import path from "path";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/async-handler";
import * as store from "../data/store";

const router = Router();

// GET /admin — the dashboard itself, gated by requireAuth
router.get("/admin", requireAuth, (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "..", "views", "admin-dashboard.html"));
});

// ---------- File uploads (photo / resume) ----------

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // Stay within serverless request-body limits.
  fileFilter: (_req, file, cb) => {
    const allowed = [".png", ".jpg", ".jpeg", ".webp", ".pdf"];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  },
});

function configureCloudinary(_req: Request, res: Response, next: () => void): void {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    res.status(503).json({ error: "Cloudinary uploads are not configured." });
    return;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
  next();
}

router.post(
  "/api/admin/apk-upload-signature",
  requireAuth,
  configureCloudinary,
  (_req: Request, res: Response) => {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      res.status(503).json({ error: "Cloudinary uploads are not configured." });
      return;
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "kailas-portfolio/apps";
    const publicId = `${randomUUID()}.apk`;
    const params = { folder, public_id: publicId, timestamp };
    res.json({
      cloudName: CLOUDINARY_CLOUD_NAME,
      apiKey: CLOUDINARY_API_KEY,
      timestamp,
      folder,
      publicId,
      signature: cloudinary.utils.api_sign_request(params, CLOUDINARY_API_SECRET),
    });
  }
);

function uploadToCloudinary(file: Express.Multer.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "kailas-portfolio",
        resource_type: "auto",
        filename_override: file.originalname,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error("Cloudinary returned no upload result."));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(file.buffer);
  });
}

router.post(
  "/api/admin/upload",
  requireAuth,
  configureCloudinary,
  upload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded, or file type not allowed." });
      return;
    }
    let url: string;
    try {
      url = await uploadToCloudinary(req.file);
    } catch (error) {
      console.error("Cloudinary upload failed:", error);
      res.status(502).json({ error: "Cloudinary upload failed. Please try again." });
      return;
    }
    const asset = path.extname(req.file.originalname).toLowerCase() === ".pdf"
      ? "resumeUrl"
      : "photoUrl";
    await store.setProfileAsset(asset, url);
    res.status(201).json({ url, asset });
  })
);

// ---------- Projects CRUD (all protected) ----------

router.post("/api/admin/projects", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { name, description, tags, liveUrl, sourceUrl, apkUrl } = req.body ?? {};
  if (!name || !description) {
    res.status(400).json({ error: "name and description are required." });
    return;
  }
  if (apkUrl !== undefined && !isHttpsUrl(apkUrl)) {
    res.status(400).json({ error: "apkUrl must be a valid HTTPS URL." });
    return;
  }
  const created = await store.addProject({
    name,
    description,
    tags: Array.isArray(tags) ? tags : [],
    liveUrl,
    sourceUrl,
    ...(apkUrl !== undefined ? { apkUrl } : {}),
  });
  res.status(201).json(created);
}));

router.put("/api/admin/projects/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const updates = req.body ?? {};
  if (Object.prototype.hasOwnProperty.call(updates, "apkUrl") && !isHttpsUrl(updates.apkUrl)) {
    res.status(400).json({ error: "apkUrl must be a valid HTTPS URL." });
    return;
  }
  const updated = await store.updateProject(req.params.id, updates);
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

function isHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
