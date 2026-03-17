import { afterEach } from 'vitest';
import { resetAll } from '../src/core/reset-all';

// Ensure module-level singletons are reset between tests regardless of whether
// individual test files call their own cleanup in afterEach.
afterEach(() => {
    resetAll();
});
