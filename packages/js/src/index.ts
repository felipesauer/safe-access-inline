// Barrel export
export { SafeAccess } from './safe-access';
export { Format } from './enums/format.enum';
export { SegmentType } from './enums/segment-type.enum';
export { AbstractAccessor } from './core/abstract-accessor';
export type { AccessorInterface, ToJsonOptions } from './contracts/accessor.interface';
export type { FilterCondition, FilterExpression } from './contracts/filter-expression.interface';
/**
 * @internal Implementation detail exposed for advanced use cases. Do not rely on this in application code.
 */
export { DotNotationParser } from './core/parsers/dot-notation-parser';
/**
 * @internal Implementation detail exposed for advanced use cases. Do not rely on this in application code.
 */
export { SegmentParser } from './core/parsers/segment-parser';
export type { Segment } from './core/parsers/segment-parser';
/**
 * @internal Implementation detail exposed for advanced use cases. Do not rely on this in application code.
 */
export { PathResolver } from './core/resolvers/path-resolver';
export { FilterParser } from './core/parsers/filter-parser';
export { TypeDetector } from './core/rendering/type-detector';
export { ArrayAccessor } from './accessors/array.accessor';
export { ObjectAccessor } from './accessors/object.accessor';
export { JsonAccessor } from './accessors/json.accessor';
export { XmlAccessor } from './accessors/xml.accessor';
export { YamlAccessor } from './accessors/yaml.accessor';
export { TomlAccessor } from './accessors/toml.accessor';
export { IniAccessor } from './accessors/ini.accessor';
export { EnvAccessor } from './accessors/env.accessor';
export { NdjsonAccessor } from './accessors/ndjson.accessor';
export { AccessorError } from './exceptions/accessor.error';
export { InvalidFormatError } from './exceptions/invalid-format.error';
export { PathNotFoundError } from './exceptions/path-not-found.error';
export { UnsupportedTypeError } from './exceptions/unsupported-type.error';
export { SecurityError } from './exceptions/security.error';
/**
 * @internal Implementation detail exposed for advanced use cases. Do not rely on this in application code.
 */
export { SecurityGuard } from './security/guards/security-guard';
export { deepFreeze } from './core/operations/deep-freeze';
export { ReadonlyViolationError } from './exceptions/readonly-violation.error';
export { PluginRegistry } from './core/registries/plugin-registry';
export type { ParserPlugin, SerializerPlugin } from './core/registries/plugin-registry';
export type { IPluginRegistry } from './contracts/plugin-registry.contract';
export { JsYamlParser } from './plugins/js-yaml.parser';
export { JsYamlSerializer } from './plugins/js-yaml.serializer';
export { SmolTomlParser } from './plugins/smol-toml.parser';
export { SmolTomlSerializer } from './plugins/smol-toml.serializer';
export { PathCache } from './core/resolvers/path-cache';
export type { ParserConfig } from './core/config/parser-config';
export { DEFAULT_PARSER_CONFIG } from './core/config/parser-config';
export type { CacheConfig } from './core/config/cache-config';
export { DEFAULT_CACHE_CONFIG } from './core/config/cache-config';
export {
    assertPayloadSize,
    assertMaxKeys,
    assertMaxDepth,
} from './security/guards/security-options';
export type { SecurityOptions } from './security/guards/security-options';
export type { SecurityPolicy } from './security/guards/security-policy';
export {
    defaultPolicy,
    setGlobalPolicy,
    clearGlobalPolicy,
    getGlobalPolicy,
} from './security/guards/security-policy';

// ── Convenience Type Aliases ────────────────────
export type { AbstractAccessor as ReadonlyAccessor } from './core/abstract-accessor';
