# Cross-Parity Test Fixtures

Shared dataset and test cases consumed by **both** the JS/TS and PHP packages
to guarantee that they produce identical results for the same inputs.

## Files

| File         | Purpose                                                                     |
| ------------ | --------------------------------------------------------------------------- |
| `data.json`  | Canonical dataset with nested objects, arrays, falsy values, and edge cases |
| `cases.json` | Array of test case objects — each describes a query and the expected result |

## Case Format

Each object in `cases.json` has:

```jsonc
{
    "id": "unique-kebab-case-id",
    "description": "Why this case exists (one sentence)",
    "path": "dot.notation.path",
    "defaultValue": null, // or any JSON value — passed as the default
    "expected": "expected result",
}
```

## How to add a new case

1. If the case needs new data, add it to `data.json`.
2. Append a new object to `cases.json` with a unique `id` and a clear `description`.
3. Run both test suites to verify:

    ```bash
    # JS
    cd packages/js && npx vitest run tests/cross-parity.test.ts

    # PHP
    cd packages/php && vendor/bin/pest tests/CrossParityTest.php
    ```

4. Both must produce the same output. If they diverge, see the section below.

## What if JS and PHP diverge?

| Scenario                             | Action                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Only JS fails                        | Bug is in the JS implementation — fix in `packages/js/src/`                                                                     |
| Only PHP fails                       | Bug is in the PHP implementation — fix in `packages/php/src/`                                                                   |
| Both fail                            | The fixture case itself may be wrong — review `cases.json`                                                                      |
| Both pass but with different results | Compare semantics (e.g. XML always returns strings for numbers) and document the allowed difference in the case's `description` |

## Consuming from tests

### JS (Vitest)

```typescript
import cases from "../../fixtures/cross-parity/cases.json";
import data from "../../fixtures/cross-parity/data.json";
import { SafeAccess } from "../src/safe-access";

const accessor = SafeAccess.fromObject(data);

for (const c of cases) {
    it(c.id, () => {
        const result = accessor.get(c.path, c.defaultValue);
        expect(result).toEqual(c.expected);
    });
}
```

### PHP (Pest)

```php
$cases = json_decode(file_get_contents(__DIR__ . '/../../fixtures/cross-parity/cases.json'), true);
$data  = json_decode(file_get_contents(__DIR__ . '/../../fixtures/cross-parity/data.json'), true);

$accessor = SafeAccess::fromArray($data);

foreach ($cases as $case) {
    it($case['id'], function () use ($accessor, $case) {
        $result = $accessor->get($case['path'], $case['defaultValue']);
        expect($result)->toEqual($case['expected']);
    });
}
```
