import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import * as store from "../data/store";

const router = Router();

// GET /api/projects — list all projects (reflects admin edits immediately)
router.get("/projects", asyncHandler(async (_req: Request, res: Response) => {
  res.json({ projects: await store.getProjects() });
}));

// GET /api/experience — list work history (reflects admin edits immediately)
router.get("/experience", asyncHandler(async (_req: Request, res: Response) => {
  res.json({ experience: await store.getExperience() });
}));

router.get("/profile-assets", asyncHandler(async (_req: Request, res: Response) => {
  res.json({ profileAssets: await store.getProfileAssets() });
}));

export default router;
