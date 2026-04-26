import type { QueryResult, ParseResult, SchemaTable } from "@/types";

const BASE = "/api";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { detail?: string })?.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function runQuery(prompt: string, conversationId?: string): Promise<QueryResult> {
  const res = await fetch(`${BASE}/nlq/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, conversation_id: conversationId }),
  });
  return handleResponse<QueryResult>(res);
}

export async function refineQuery(conversationId: string, followup: string): Promise<QueryResult> {
  const res = await fetch(`${BASE}/conversation/refine`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversation_id: conversationId, followup }),
  });
  return handleResponse<QueryResult>(res);
}

export async function parseOnly(prompt: string, conversationId?: string): Promise<ParseResult> {
  const res = await fetch(`${BASE}/nlq/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, conversation_id: conversationId }),
  });
  return handleResponse<ParseResult>(res);
}

export async function fetchSchema(): Promise<{ tables: SchemaTable[] }> {
  const res = await fetch(`${BASE}/schema/describe`);
  return handleResponse<{ tables: SchemaTable[] }>(res);
}

export async function checkHealth(): Promise<{ status: string }> {
  const res = await fetch(`/health`);
  return handleResponse<{ status: string }>(res);
}