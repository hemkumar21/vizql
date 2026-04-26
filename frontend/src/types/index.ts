export interface ExplainObject {
  filters: string[];
  groupBy: string[];
  aggregates: string[];
  sourceTables: string[];
  naturalExplanation: string;
}

export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  inferred_chart: "bar" | "line" | null;
  sql: string;
  warnings: string[];
  explain: ExplainObject;
  conversation_id: string;
}

export interface ParseResult {
  sql: string;
  warnings: string[];
  explain: ExplainObject;
  conversation_id: string;
}

export interface SchemaColumn {
  name: string;
  type: string;
  label: string;
  derived?: string;
}

export interface SchemaTable {
  name: string;
  label: string;
  columns: SchemaColumn[];
}

export type MessageRole = "user" | "assistant" | "error";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  result?: QueryResult;
  timestamp: Date;
  isLoading?: boolean;
}

export interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}