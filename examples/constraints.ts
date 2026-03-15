import {
  fromModelsDev, recommend,
  Purpose, DIRECT_PROVIDERS,
  perProvider, perFamily,
  type Model, type Constraint,
} from "pickai";

const models = await fromModelsDev();

// Without constraints: top 5 might all be from the same provider
const unconstrained = recommend(models, Purpose.Coding, {
  filter: { providers: [...DIRECT_PROVIDERS] },
  limit: 5,
});

console.log("--- Without constraints ---");
for (const m of unconstrained) {
  console.log(`  ${m.score.toFixed(3)} | ${m.name} (${m.provider})`);
}

// With perProvider(1): one model per provider
const byProvider = recommend(models, Purpose.Coding, {
  filter: { providers: [...DIRECT_PROVIDERS] },
  constraints: [perProvider(1)],
  limit: 5,
});

console.log("\n--- With perProvider(1) ---");
for (const m of byProvider) {
  console.log(`  ${m.score.toFixed(3)} | ${m.name} (${m.provider})`);
}

// With perFamily(1): one model per family
const byFamily = recommend(models, Purpose.Coding, {
  filter: { providers: [...DIRECT_PROVIDERS] },
  constraints: [perFamily(1)],
  limit: 10,
});

console.log("\n--- With perFamily(1) ---");
for (const m of byFamily) {
  console.log(`  ${m.score.toFixed(3)} | ${m.name} (${m.provider}, ${m.family ?? "unknown"})`);
}

// Custom constraint: at most 2 models over $3/M input
const limitCostly: Constraint = (selected, candidate) => {
  const isCostly = (m: Model) => (m.cost?.input ?? 0) > 3;
  if (!isCostly(candidate)) return true;
  return selected.filter(isCostly).length < 2;
};

// Combine all three: built-in + custom constraints together
const everything = recommend(models, Purpose.Coding, {
  filter: { providers: [...DIRECT_PROVIDERS] },
  constraints: [perProvider(2), perFamily(1), limitCostly],
  limit: 10,
});

console.log("\n--- With perProvider(2) + perFamily(1) + limitCostly ---");
for (const m of everything) {
  const cost = m.cost?.input != null ? `$${m.cost.input}/M` : "unknown";
  console.log(`  ${m.score.toFixed(3)} | ${m.name} (${m.provider}) | ${cost}`);
}
