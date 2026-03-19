import { afterEach } from 'vitest';
import { SafeAccess } from '../src/safe-access';

// Ensure module-level singletons are reset between tests regardless of whether
// individual test files call their own cleanup in afterEach.
afterEach(() => {
    SafeAccess.resetAll();
});
