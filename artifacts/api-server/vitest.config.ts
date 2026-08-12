import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Executar arquivos de teste sequencialmente para evitar race conditions no BD
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
