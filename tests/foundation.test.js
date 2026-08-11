import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the foundation keeps the health contract", async () => {
  const openapi = await readFile("lib/api-spec/openapi.yaml", "utf8");
  assert.match(openapi, /\/healthz:/);
  assert.match(openapi, /operationId: healthCheck/);
  assert.match(openapi, /HealthStatus/);
});

test("business schemas are intentionally absent in Phase 1", async () => {
  const schema = await readFile("lib/db/src/schema/index.ts", "utf8");
  assert.match(schema, /export \{\}/);
  assert.doesNotMatch(schema, /pgTable\(/);
});

test("the project documentation records the Phase 1 boundary", async () => {
  const documentation = await readFile(
    "docs/FASE-1-FUNDACAO-TECNICA.md",
    "utf8",
  );
  assert.match(documentation, /Não implementado nesta fase/);
  assert.match(documentation, /schema definitivo/);
});