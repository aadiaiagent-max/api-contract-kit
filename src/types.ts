/**
 * Primitive field types supported by contract schemas.
 */
export type FieldType = "string" | "number" | "boolean" | "object" | "array";

/**
 * A named field in a request or response payload.
 */
export interface FieldSchema {
  name: string;
  type: FieldType;
  /** Defaults to false when omitted. */
  required?: boolean;
}

/**
 * Contract for a single HTTP endpoint.
 */
export interface EndpointContract {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  request?: FieldSchema[];
  response?: FieldSchema[];
}

/**
 * Versioned service-level contract bundling endpoints.
 */
export interface ServiceContract {
  name: string;
  version: string;
  endpoints: EndpointContract[];
}

/**
 * Classification of a detected breaking change.
 */
export type BreakingChangeKind =
  | "endpoint_removed"
  | "field_removed"
  | "type_changed"
  | "field_became_required";

/**
 * A single breaking change between two contract versions.
 */
export interface BreakingChange {
  kind: BreakingChangeKind;
  /** Dot-separated location, e.g. "POST /orders.request.id" */
  path: string;
  detail: string;
}

/**
 * Result of comparing an old contract against a candidate new contract.
 */
export interface CompatibilityReport {
  compatible: boolean;
  changes: BreakingChange[];
}
