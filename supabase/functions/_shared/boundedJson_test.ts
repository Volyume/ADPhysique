import { readBoundedJson, RequestBodyError } from "./boundedJson.ts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("readBoundedJson accepts an exact byte boundary", async () => {
  const max = 128;
  const overhead = new TextEncoder().encode('{"value":""}').byteLength;
  const text = JSON.stringify({ value: "x".repeat(max - overhead) });
  assert(new TextEncoder().encode(text).byteLength === max, "fixture must be exact");
  const parsed = await readBoundedJson<{ value: string }>(
    new Request("https://isolated.invalid", { method: "POST", body: text }),
    max,
  );
  assert(parsed.value.length === max - overhead, "exact-boundary JSON should parse");
});

Deno.test("readBoundedJson rejects an absent or lying content length by streamed bytes", async () => {
  const body = JSON.stringify({ value: "x".repeat(200) });
  const request = new Request("https://isolated.invalid", {
    method: "POST",
    headers: { "content-length": "1" },
    body,
  });
  let status = 0;
  try { await readBoundedJson(request, 64); } catch (error) {
    status = error instanceof RequestBodyError ? error.status : 0;
  }
  assert(status === 413, "actual streamed size must defeat declared size");
});

Deno.test("readBoundedJson rejects malformed UTF-8 before JSON parsing", async () => {
  const bytes = new Uint8Array([0x7b, 0x22, 0x78, 0x22, 0x3a, 0xff, 0x7d]);
  let status = 0;
  try {
    await readBoundedJson(
      new Request("https://isolated.invalid", { method: "POST", body: bytes }),
      64,
    );
  } catch (error) {
    status = error instanceof RequestBodyError ? error.status : 0;
  }
  assert(status === 400, "malformed UTF-8 must fail closed");
});
