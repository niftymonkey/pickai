---
paths:
  - '**/*.{ts,tsx}'
---

# Code structure: the TypeScript forms

The TypeScript renderings of the core rules in `code-core.md`. Pinned examples live in `design/agents/code-examples.md`; read a rule's entry there when the rule alone leaves the path forward unclear.

## Module form

- Functions are `const` values. The module's public interface is one `export` block at the bottom, so the seam reads in one place and a function can be renamed at the seam (`as`) without touching its body.

```ts
const scalePayoutByFreshness = (freshness: number): number =>
  Math.max(freshness, FRESHNESS_PAYOUT_FLOOR);

const swallow = (state: RunState, food: Swallowable): SimEvent[] => {
  const paid = food.payout * scalePayoutByFreshness(food.freshness);
  ...
};

export { swallow };
```

- An entry point ends in exactly one call: `main().catch(...)`. Never an IIFE.
- A display component's create function returns a plain record: the view plus a `render(data)` function. No class, no `extends` of a framework class.

## Tests

- Tests live in a `__tests__` subfolder of the source folder. The test file keeps the module's name plus `.test.ts`: `swallow.ts` is tested by `__tests__/swallow.test.ts`.

```text
src/game/
  swallow.ts
  __tests__/
    swallow.test.ts
```

## Comments

- A multi-line comment is JSDoc on the declaration. A single-line comment is a `//` line.
