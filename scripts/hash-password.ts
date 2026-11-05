import bcrypt from "bcryptjs";

declare const process: {
  argv: string[];
  exit(code?: number): never;
};

const password = process.argv[2];

if (!password) {
  console.error("Usage: npm run hash-password -- <your-password>");
  process.exit(1);
}

bcrypt.hash(password, 10).then((hash) => {
  console.log("\nAdd this to your .env file:\n");
  console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
});
