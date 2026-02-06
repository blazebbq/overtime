import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  migrate: {
    datasource: {
      provider: "postgresql",
      url: process.env.DATABASE_URL!,
    },
  },
});
