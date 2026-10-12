import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/async-handler";
import * as store from "../data/store";
import { ContactPayload, ContactResult } from "../types";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(body: Partial<ContactPayload>): ContactResult {
  const errors: ContactResult["errors"] = {};

  if (typeof body.name !== "string" || body.name.trim().length < 2) {
    errors.name = "Enter your name (at least 2 characters).";
  }
  if (typeof body.email !== "string" || !EMAIL_RE.test(body.email)) {
    errors.email = "Enter a valid email address.";
  }
  if (typeof body.message !== "string" || body.message.trim().length < 10) {
    errors.message = "Message should be at least 10 characters.";
  }

  return { success: Object.keys(errors).length === 0, errors };
}

// POST /api/contact — validate and save a contact form submission.
router.post("/contact", asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const payload: ContactPayload = {
    name: typeof body.name === "string" ? body.name.trim() : "",
    email: typeof body.email === "string" ? body.email.trim() : "",
    message: typeof body.message === "string" ? body.message.trim() : "",
  };
  const result = validate(payload);

  if (!result.success) {
    return res.status(400).json(result);
  }

  await store.addContact({
    name: payload.name,
    email: payload.email,
    message: payload.message,
  });

  return res.status(200).json({ success: true });
}));

export default router;
