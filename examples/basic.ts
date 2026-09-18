/**
 * Fake Orders API — two contract versions compared for deploy gating.
 *
 * Run: npm run example
 */
import { compareContracts, type ServiceContract } from "../src/index.js";

const ordersV1: ServiceContract = {
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

/** Additive: optional currency on GET, new list endpoint. Compatible. */
const ordersV1_1: ServiceContract = {
  name: "orders",
  version: "1.1.0",
  endpoints: [
    {
      method: "GET",
      path: "/orders/{id}",
      response: [
        { name: "id", type: "string", required: true },
        { name: "status", type: "string", required: true },
        { name: "total", type: "number", required: true },
        { name: "currency", type: "string", required: false },
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
    {
      method: "GET",
      path: "/orders",
      response: [
        { name: "items", type: "array", required: true },
        { name: "count", type: "number", required: true },
      ],
    },
  ],
};

/** Breaking: removes note, changes total type, adds required priority. */
const ordersV2: ServiceContract = {
  name: "orders",
  version: "2.0.0",
  endpoints: [
    {
      method: "GET",
      path: "/orders/{id}",
      response: [
        { name: "id", type: "string", required: true },
        { name: "status", type: "string", required: true },
        { name: "total", type: "string", required: true },
      ],
    },
    {
      method: "POST",
      path: "/orders",
      request: [
        { name: "sku", type: "string", required: true },
        { name: "qty", type: "number", required: true },
        { name: "priority", type: "string", required: true },
      ],
      response: [
        { name: "id", type: "string", required: true },
        { name: "status", type: "string", required: true },
      ],
    },
  ],
};

function printReport(label: string, oldC: ServiceContract, newC: ServiceContract): void {
  const report = compareContracts(oldC, newC);
  console.log(`\n=== ${label} ===`);
  console.log(`compatible: ${report.compatible}`);
  if (report.changes.length === 0) {
    console.log("No breaking changes.");
    return;
  }
  for (const c of report.changes) {
    console.log(`  [${c.kind}] ${c.path} — ${c.detail}`);
  }
}

printReport("v1 → v1.1 (additive, should pass gate)", ordersV1, ordersV1_1);
printReport("v1 → v2 (breaking, should block deploy)", ordersV1, ordersV2);
