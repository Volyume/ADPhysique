export class RequestBodyError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RequestBodyError";
    this.status = status;
  }
}

/** Read JSON with a hard byte cap even when Content-Length is absent or lies. */
export async function readBoundedJson<T>(req: Request, maxBytes: number): Promise<T> {
  const declaredRaw = req.headers.get("content-length");
  if (declaredRaw != null) {
    const declared = Number(declaredRaw);
    if (!Number.isSafeInteger(declared) || declared < 0) {
      throw new RequestBodyError("invalid content length", 400);
    }
    if (declared > maxBytes) throw new RequestBodyError("payload too large", 413);
  }
  if (!req.body) throw new RequestBodyError("missing request body", 400);

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      // eslint-disable-next-line no-await-in-loop
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel("payload too large").catch(() => {});
        throw new RequestBodyError("payload too large", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let text = "";
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); } catch (_) {
    throw new RequestBodyError("malformed utf-8", 400);
  }
  try { return JSON.parse(text) as T; } catch (_) {
    throw new RequestBodyError("bad json", 400);
  }
}
