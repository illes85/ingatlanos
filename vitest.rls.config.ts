import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

/** RLS-tesztek: futó helyi Supabase + lefuttatott seed szükséges (npm run db:setup). */
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/rls/**/*.test.ts"],
    testTimeout: 20_000,
    fileParallelism: false,
  },
});
