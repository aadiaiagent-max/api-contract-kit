import type {
  BreakingChange,
  CompatibilityReport,
  EndpointContract,
  FieldSchema,
  ServiceContract,
} from "../types.js";

function endpointKey(ep: EndpointContract): string {
  return `${ep.method} ${ep.path}`;
}

function fieldMap(fields: FieldSchema[] | undefined): Map<string, FieldSchema> {
  const map = new Map<string, FieldSchema>();
  for (const f of fields ?? []) {
    map.set(f.name, f);
  }
  return map;
}

function isRequired(field: FieldSchema): boolean {
  return field.required === true;
}

/**
 * Compare field lists on one side (request or response) of an endpoint.
 * Breaking:
 *   - removed field (required or optional)
 *   - type change
 *   - newly required field (optional → required, or brand-new required)
 * Non-breaking:
 *   - added optional field
 */
function compareFields(
  oldFields: FieldSchema[] | undefined,
  newFields: FieldSchema[] | undefined,
  locationPrefix: string,
  changes: BreakingChange[],
): void {
  const oldMap = fieldMap(oldFields);
  const newMap = fieldMap(newFields);

  for (const [name, oldField] of oldMap) {
    const fieldPath = `${locationPrefix}.${name}`;
    const newField = newMap.get(name);

    if (!newField) {
      changes.push({
        kind: "field_removed",
        path: fieldPath,
        detail: `Field "${name}" was removed from ${locationPrefix}`,
      });
      continue;
    }

    if (oldField.type !== newField.type) {
      changes.push({
        kind: "type_changed",
        path: fieldPath,
        detail: `Field "${name}" type changed from ${oldField.type} to ${newField.type}`,
      });
    }

    if (!isRequired(oldField) && isRequired(newField)) {
      changes.push({
        kind: "field_became_required",
        path: fieldPath,
        detail: `Field "${name}" became required on ${locationPrefix}`,
      });
    }
  }

  for (const [name, newField] of newMap) {
    if (oldMap.has(name)) continue;
    if (isRequired(newField)) {
      const fieldPath = `${locationPrefix}.${name}`;
      changes.push({
        kind: "field_became_required",
        path: fieldPath,
        detail: `New required field "${name}" added to ${locationPrefix}`,
      });
    }
    // Added optional fields are non-breaking — intentionally ignored.
  }
}

/**
 * Compare two service contracts for backward-compatible evolution.
 *
 * Breaking changes:
 *   - removed endpoint
 *   - removed required or optional field
 *   - field type change
 *   - newly required field (including new required fields)
 *
 * Non-breaking:
 *   - added endpoint
 *   - added optional field
 */
export function compareContracts(
  oldContract: ServiceContract,
  newContract: ServiceContract,
): CompatibilityReport {
  const changes: BreakingChange[] = [];

  const oldEndpoints = new Map(
    oldContract.endpoints.map((ep) => [endpointKey(ep), ep]),
  );
  const newEndpoints = new Map(
    newContract.endpoints.map((ep) => [endpointKey(ep), ep]),
  );

  for (const [key, oldEp] of oldEndpoints) {
    const newEp = newEndpoints.get(key);

    if (!newEp) {
      changes.push({
        kind: "endpoint_removed",
        path: key,
        detail: `Endpoint ${key} was removed`,
      });
      continue;
    }

    compareFields(oldEp.request, newEp.request, `${key}.request`, changes);
    compareFields(oldEp.response, newEp.response, `${key}.response`, changes);
  }

  // Added endpoints are non-breaking — intentionally ignored.

  return {
    compatible: changes.length === 0,
    changes,
  };
}
