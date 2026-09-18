import { describe, expect, it } from "vitest";
import { compareContracts } from "../src/compare/compareContracts.js";
import type { ServiceContract } from "../src/types.js";

const baseOrders: ServiceContract = {
  name: "orders",
  version: "1.0.0",
  endpoints: [
    {
      method: "GET",
      path: "/orders/{id}",
      response: [
        { name: "id", type: "string", required: true },
        { name: "status", type: "string", required: true },
        { name: "total", type: "number", required: true },
      ],
    },
    {
      method: "POST",
      path: "/orders",
      request: [
        { name: "sku", type: "string", required: true },
        { name: "qty", type: "number", required: true },
        { name: "note", type: "string", required: false },
      ],
      response: [
        { name: "id", type: "string", required: true },
        { name: "status", type: "string", required: true },
      ],
    },
  ],
};

describe("compareContracts", () => {
  it("marks additive changes as compatible (new endpoint + optional field)", () => {
    const next: ServiceContract = {
      ...baseOrders,
      version: "1.1.0",
      endpoints: [
        ...baseOrders.endpoints.map((ep) => {
          if (ep.method === "GET" && ep.path === "/orders/{id}") {
            return {
              ...ep,
              response: [
                ...(ep.response ?? []),
                { name: "currency", type: "string", required: false },
              ],
            };
          }
          return ep;
        }),
        {
          method: "DELETE" as const,
          path: "/orders/{id}",
          response: [{ name: "ok", type: "boolean", required: true }],
        },
      ],
    };

    const report = compareContracts(baseOrders, next);
    expect(report.compatible).toBe(true);
    expect(report.changes).toEqual([]);
  });

  it("breaks when an endpoint is removed", () => {
    const next: ServiceContract = {
      ...baseOrders,
      version: "2.0.0",
      endpoints: baseOrders.endpoints.filter(
        (ep) => !(ep.method === "POST" && ep.path === "/orders"),
      ),
    };

    const report = compareContracts(baseOrders, next);
    expect(report.compatible).toBe(false);
    expect(report.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "endpoint_removed",
          path: "POST /orders",
        }),
      ]),
    );
  });

  it("breaks when a field is removed (required or optional)", () => {
    const next: ServiceContract = {
      ...baseOrders,
      version: "2.0.0",
      endpoints: baseOrders.endpoints.map((ep) => {
        if (ep.method === "POST" && ep.path === "/orders") {
          return {
            ...ep,
            request: (ep.request ?? []).filter((f) => f.name !== "note"),
          };
        }
        return ep;
      }),
    };

    const report = compareContracts(baseOrders, next);
    expect(report.compatible).toBe(false);
    expect(report.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "field_removed",
          path: "POST /orders.request.note",
        }),
      ]),
    );
  });

  it("breaks when a field type changes", () => {
    const next: ServiceContract = {
      ...baseOrders,
      version: "2.0.0",
      endpoints: baseOrders.endpoints.map((ep) => {
        if (ep.method === "GET" && ep.path === "/orders/{id}") {
          return {
            ...ep,
            response: (ep.response ?? []).map((f) =>
              f.name === "total" ? { ...f, type: "string" as const } : f,
            ),
          };
        }
        return ep;
      }),
    };

    const report = compareContracts(baseOrders, next);
    expect(report.compatible).toBe(false);
    expect(report.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "type_changed",
          path: "GET /orders/{id}.response.total",
        }),
      ]),
    );
  });

  it("breaks when a field becomes newly required", () => {
    const next: ServiceContract = {
      ...baseOrders,
      version: "2.0.0",
      endpoints: baseOrders.endpoints.map((ep) => {
        if (ep.method === "POST" && ep.path === "/orders") {
          return {
            ...ep,
            request: [
              ...(ep.request ?? []).map((f) =>
                f.name === "note" ? { ...f, required: true } : f,
              ),
              { name: "priority", type: "string", required: true },
            ],
          };
        }
        return ep;
      }),
    };

    const report = compareContracts(baseOrders, next);
    expect(report.compatible).toBe(false);
    expect(report.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "field_became_required",
          path: "POST /orders.request.note",
        }),
        expect.objectContaining({
          kind: "field_became_required",
          path: "POST /orders.request.priority",
        }),
      ]),
    );
  });
});
