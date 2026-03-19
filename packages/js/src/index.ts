// Barrel export
export { SafeAccess } from './safe-access';
export { Format } from './enums/format.enum';
export { SegmentType } from './enums/segment-type.enum';
export { PatchOperationType } from './enums/patch-operation-type.enum';
export type { AuditEventType } from './enums/audit-event-type.enum';
export { AbstractAccessor } from './core/abstract-accessor';
export type { AccessorInterface } from './contracts/accessor.interface';
export type { ReadableInterface } from './contracts/readable.interface';
export type { WritableInterface } from './contracts/writable.interface';
export type { TransformableInterface } from './contracts/transformable.interface';
export type { AuditEvent, AuditListener } from './contracts/audit-event.interface';
export type { FilterCondition, FilterExpression } from './contracts/filter-expression.interface';
export type { JsonPatchOp } from './contracts/json-patch-op.interface';
export { DotNotationParser } from './core/parsers/dot-notation-parser';
export { SegmentParser } from './core/parsers/segment-parser';
export type { Segment } from './core/parsers/segment-parser';
export { PathResolver } from './core/resolvers/path-resolver';
export { renderTemplate } from './core/rendering/template-renderer';
export { ArrayOperations } from './core/operations/array-operations';
export { FormatSerializer } from './core/rendering/format-serializer';
export { FilterParser } from './core/parsers/filter-parser';
export { TypeDetector } from './core/rendering/type-detector';
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
export { JsonPatchTestFailedError } from './exceptions/json-patch-test-failed.error';
export { SecurityGuard } from './security/guards/security-guard';
export { deepFreeze } from './core/operations/deep-freeze';
export { diff, applyPatch, validatePatch } from './core/operations/json-patch';
export { ReadonlyViolationError } from './exceptions/readonly-violation.error';
export { PluginRegistry } from './core/registries/plugin-registry';
export type { ParserPlugin, SerializerPlugin } from './core/registries/plugin-registry';
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
} from './core/io/io-loader';
export {
    assertSafeUrl,
    isPrivateIp,
    ipToLong,
    isIpv6Loopback,
    assertResolvedIpNotPrivate,
} from './security/sanitizers/ip-range-checker';
export { deepMerge } from './core/operations/deep-merger';
export { PathCache } from './core/resolvers/path-cache';
export type { SafeAccessConfig } from './core/config/safe-access-config';
export { DEFAULT_SAFE_ACCESS_CONFIG } from './core/config/safe-access-config';
export type { ParserConfig } from './core/config/parser-config';
export { DEFAULT_PARSER_CONFIG } from './core/config/parser-config';
export type { CacheConfig } from './core/config/cache-config';
export { DEFAULT_CACHE_CONFIG } from './core/config/cache-config';
export type { MergerConfig } from './core/config/merger-config';
export { DEFAULT_MERGER_CONFIG } from './core/config/merger-config';
export type { MaskerConfig } from './core/config/masker-config';
export { DEFAULT_MASKER_CONFIG } from './core/config/masker-config';
export type { AuditConfig } from './core/config/audit-config';
export { DEFAULT_AUDIT_CONFIG } from './core/config/audit-config';
export type { FilterParserConfig } from './core/config/filter-parser-config';
export { DEFAULT_FILTER_PARSER_CONFIG } from './core/config/filter-parser-config';
export type { IoLoaderConfig } from './core/config/io-loader-config';
export { DEFAULT_IO_LOADER_CONFIG } from './core/config/io-loader-config';
export { configureIoLoader, resetIoLoaderConfig } from './core/io/io-loader';
export { watchFile } from './core/io/file-watcher';
export { sanitizeCsvCell, sanitizeCsvRow } from './security/sanitizers/csv-sanitizer';
export { mask } from './security/sanitizers/data-masker';
export type { MaskPattern } from './security/sanitizers/data-masker';
export {
    assertPayloadSize,
    assertMaxKeys,
    assertMaxDepth,
} from './security/guards/security-options';
export type { SecurityOptions } from './security/guards/security-options';
export type {
    SchemaAdapterInterface,
    SchemaValidationResult,
    SchemaValidationIssue,
} from './contracts/schema-adapter.interface';
export { SchemaValidationError } from './exceptions/schema-validation.error';
export { SchemaRegistry } from './core/registries/schema-registry';
export { ZodSchemaAdapter } from './schema-adapters/zod.adapter';
export { ValibotSchemaAdapter } from './schema-adapters/valibot.adapter';
export { YupSchemaAdapter } from './schema-adapters/yup.adapter';
export { JsonSchemaAdapter } from './schema-adapters/json-schema.adapter';
export type { SecurityPolicy, UrlPolicy } from './security/guards/security-policy';
export {
    mergePolicy,
    defaultPolicy,
    STRICT_POLICY,
    PERMISSIVE_POLICY,
    setGlobalPolicy,
    clearGlobalPolicy,
    getGlobalPolicy,
} from './security/guards/security-policy';
export { onAudit, emitAudit, clearAuditListeners } from './security/audit/audit-emitter';

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
