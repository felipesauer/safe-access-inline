import { afterEach } from 'vitest';
import { clearGlobalPolicy } from '../src/core/security-policy';
import { clearAuditListeners } from '../src/core/audit-emitter';

// Ensure module-level singletons are reset between tests regardless of whether
// individual test files call their own cleanup in afterEach.
afterEach(() => {
    clearGlobalPolicy();
    clearAuditListeners();
});
