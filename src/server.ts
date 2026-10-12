import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import session from "express-session";
import portfolioRoutes from "./routes/portfolio.route";
import contactRoutes from "./routes/contact.route";
import authRoutes from "./routes/auth.route";
import adminRoutes from "./routes/admin.route";
import { closeStore, connectStore } from "./data/store";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

if (!process.env.SESSION_SECRET) {
  console.warn(
    "Warning: SESSION_SECRET is not set in .env — using an insecure default. Set it before deploying."
  );
}

app.use(cors());
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-only-insecure-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      // Set SESSION_SECURE_COOKIE=true in .env once the site is served over HTTPS.
      secure: process.env.SESSION_SECURE_COOKIE === "true",
      maxAge: 1000 * 60 * 60 * 8, // 8 hours
    },
  })
);
app.use(express.static(path.join(__dirname, "..", "public")));
app.get("/admin-assets/admin.css", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "admin", "admin.css"));
});

// Public API
app.use("/api", portfolioRoutes);
app.use("/api", contactRoutes);

// Admin auth + protected dashboard/API
app.use(authRoutes);
app.use(adminRoutes);

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

async function startServer(): Promise<void> {
  await connectStore();
  const server = app.listen(PORT, () => {
    console.log(`Portfolio server running at http://localhost:${PORT}`);
  });

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals): void => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}; closing server and MongoDB connection.`);

    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(() => {
      void closeStore().then(() => {
        clearTimeout(timeout);
        process.exit(0);
      }).catch((error: unknown) => {
        console.error("Error closing MongoDB connection:", error);
        process.exit(1);
      });
    });
  };

  for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"] as const) {
    process.once(signal, () => shutdown(signal));
  }
}

startServer().catch((error: unknown) => {
  console.error("Unable to start the server:", error);
  process.exit(1);
});
