import { clearGlobalPolicy } from './security-policy';
import { PathCache } from './path-cache';
import { PluginRegistry } from './plugin-registry';
import { SchemaRegistry } from './schema-registry';
import { clearAuditListeners } from './audit-emitter';

/**
 * Resets all global/static state. Intended for test teardown.
 *
 * Usage:
 *   import { resetAll } from '@safe-access-inline/safe-access-inline/testing';
 *   afterEach(() => resetAll());
 */
export function resetAll(): void {
    clearGlobalPolicy();
    clearAuditListeners();
    PathCache.clear();
    PluginRegistry.reset();
    SchemaRegistry.clearDefaultAdapter();
}
