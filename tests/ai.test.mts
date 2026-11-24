// node --test tests/   (npm run test:unit)
import { test } from "node:test";
import assert from "node:assert/strict";
import { aiConfig, generateText } from "../src/lib/ai.ts";

test("no provider configured → null (template fallback)", async () => {
  assert.equal(aiConfig({}), null);
  assert.equal(await generateText({ system: "s", prompt: "p" }, {}), null);
});

test("Anthropic is preferred when both are configured, unless forced", () => {
  const env = { ANTHROPIC_API_KEY: "k", AZURE_AI_ENDPOINT: "https://x", AZURE_AI_KEY: "a", AZURE_AI_DEPLOYMENT: "gpt" };
  assert.equal(aiConfig(env)?.provider, "anthropic");
  assert.equal(aiConfig({ ...env, RECAP_AI_PROVIDER: "azure" })?.provider, "azure");
  assert.equal(aiConfig({ AZURE_AI_ENDPOINT: "https://x", AZURE_AI_KEY: "a", AZURE_AI_DEPLOYMENT: "gpt" })?.provider, "azure");
});

test("Anthropic request shape and response parsing", async () => {
  let seen: { url: string; init: RequestInit } | null = null;
  const fake = (async (url: string, init: RequestInit) => {
    seen = { url, init };
    return new Response(JSON.stringify({ content: [{ type: "text", text: " Hello " }] }), { status: 200 });
  }) as unknown as typeof fetch;
  const out = await generateText({ system: "sys", prompt: "go" }, { ANTHROPIC_API_KEY: "k", ANTHROPIC_MODEL: "m1" }, fake);
  assert.deepEqual(out, { text: "Hello", model: "m1" });
  assert.equal(seen!.url, "https://api.anthropic.com/v1/messages");
  const body = JSON.parse(seen!.init.body as string);
  assert.equal(body.model, "m1");
  assert.equal(body.system, "sys");
  assert.deepEqual(body.messages, [{ role: "user", content: "go" }]);
  assert.equal((seen!.init.headers as Record<string, string>)["x-api-key"], "k");
});

test("Azure request shape and response parsing", async () => {
  let url = "";
  const fake = (async (u: string) => {
    url = u;
    return new Response(JSON.stringify({ choices: [{ message: { content: "Hi" } }] }), { status: 200 });
  }) as unknown as typeof fetch;
  const out = await generateText({ system: "s", prompt: "p" }, { AZURE_AI_ENDPOINT: "https://res.openai.azure.com/", AZURE_AI_KEY: "a", AZURE_AI_DEPLOYMENT: "gpt-4o" }, fake);
  assert.deepEqual(out, { text: "Hi", model: "azure:gpt-4o" });
  assert.match(url, /^https:\/\/res\.openai\.azure\.com\/openai\/deployments\/gpt-4o\/chat\/completions\?api-version=/);
});

test("API errors surface", async () => {
  const fake = (async () => new Response("nope", { status: 401 })) as unknown as typeof fetch;
  await assert.rejects(generateText({ system: "s", prompt: "p" }, { ANTHROPIC_API_KEY: "k" }, fake), /Anthropic API 401/);
});
