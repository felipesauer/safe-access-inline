// Barrel export
export { SafeAccess } from './safe-access';
export { Format } from './format.enum';
export { AbstractAccessor } from './core/abstract-accessor';
export type { AccessorInterface } from './contracts/accessor.interface';
export type { ReadableInterface } from './contracts/readable.interface';
export type { WritableInterface } from './contracts/writable.interface';
export type { TransformableInterface } from './contracts/transformable.interface';
export { DotNotationParser } from './core/dot-notation-parser';
export { FilterParser } from './core/filter-parser';
export type { FilterCondition, FilterExpression } from './core/filter-parser';
export { TypeDetector } from './core/type-detector';
export { ArrayAccessor } from './accessors/array.accessor';
export { ObjectAccessor } from './accessors/object.accessor';
export { JsonAccessor } from './accessors/json.accessor';
export { XmlAccessor } from './accessors/xml.accessor';
export { YamlAccessor } from './accessors/yaml.accessor';
export { TomlAccessor } from './accessors/toml.accessor';
export { IniAccessor } from './accessors/ini.accessor';
export { CsvAccessor } from './accessors/csv.accessor';
export { EnvAccessor } from './accessors/env.accessor';
export { NdjsonAccessor } from './accessors/ndjson.accessor';
export { AccessorError } from './exceptions/accessor.error';
export { InvalidFormatError } from './exceptions/invalid-format.error';
export { PathNotFoundError } from './exceptions/path-not-found.error';
export { UnsupportedTypeError } from './exceptions/unsupported-type.error';
export { SecurityError } from './exceptions/security.error';
export { SecurityGuard } from './core/security-guard';
export { deepFreeze } from './core/deep-freeze';
export { diff, applyPatch } from './core/json-patch';
export type { JsonPatchOp } from './core/json-patch';
export { ReadonlyViolationError } from './exceptions/readonly-violation.error';
export { PluginRegistry } from './core/plugin-registry';
export type { ParserPlugin, SerializerPlugin } from './core/plugin-registry';
export { JsYamlParser } from './plugins/js-yaml.parser';
export { JsYamlSerializer } from './plugins/js-yaml.serializer';
export { SmolTomlParser } from './plugins/smol-toml.parser';
export { SmolTomlSerializer } from './plugins/smol-toml.serializer';
export type { DeepPaths, ValueAtPath } from './types/deep-paths';
export {
    readFileSync,
    readFile,
    fetchUrl,
    resolveFormatFromExtension,
    assertPathWithinAllowedDirs,
} from './core/io-loader';
export {
    assertSafeUrl,
    isPrivateIp,
    ipToLong,
    isIpv6Loopback,
    assertResolvedIpNotPrivate,
} from './core/ip-range-checker';
export { deepMerge } from './core/deep-merger';
export { PathCache } from './core/path-cache';
export { watchFile } from './core/file-watcher';
export { sanitizeCsvCell, sanitizeCsvRow } from './core/csv-sanitizer';
export { mask } from './core/data-masker';
export type { MaskPattern } from './core/data-masker';
export { assertPayloadSize, assertMaxKeys, assertMaxDepth } from './core/security-options';
export type { SecurityOptions } from './core/security-options';
export type {
    SchemaAdapterInterface,
    SchemaValidationResult,
    SchemaValidationIssue,
} from './contracts/schema-adapter.interface';
export { SchemaValidationError } from './exceptions/schema-validation.error';
export { SchemaRegistry } from './core/schema-registry';
export { ZodSchemaAdapter } from './schema-adapters/zod.adapter';
export { ValibotSchemaAdapter } from './schema-adapters/valibot.adapter';
export { YupSchemaAdapter } from './schema-adapters/yup.adapter';
export type { SecurityPolicy, UrlPolicy } from './core/security-policy';
export {
    mergePolicy,
    defaultPolicy,
    STRICT_POLICY,
    PERMISSIVE_POLICY,
    setGlobalPolicy,
    clearGlobalPolicy,
} from './core/security-policy';
export { onAudit, emitAudit, clearAuditListeners } from './core/audit-emitter';
export type { AuditEvent, AuditEventType, AuditListener } from './core/audit-emitter';

// ── Convenience Type Aliases ────────────────────
export type { AbstractAccessor as ReadonlyAccessor } from './core/abstract-accessor';

// ── Framework Integrations ──────────────────────
export {
    createSafeAccessProvider,
    createSafeAccessServiceProvider,
    SafeAccessModule,
    SafeAccessService,
    SAFE_ACCESS,
} from './integrations/nestjs';
export type { SafeAccessModuleOptions } from './integrations/nestjs';
export { safeAccessPlugin, loadConfig } from './integrations/vite';
export type { VitePluginOptions } from './integrations/vite';
