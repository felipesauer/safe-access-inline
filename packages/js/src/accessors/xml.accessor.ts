import { AbstractAccessor } from '../core/abstract-accessor';
import { InvalidFormatError } from '../exceptions/invalid-format.error';
import { SecurityError } from '../exceptions/security.error';
import { SecurityGuard } from '../security/guards/security-guard';
import { DEFAULT_PARSER_CONFIG, type ParserConfig } from '../core/config/parser-config';

/**
 * Accessor for XML strings.
 * Parses XML into a nested object structure using a simple recursive parser.
 * No external dependencies — uses a lightweight built-in parser.
 */
export class XmlAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends AbstractAccessor<T> {
    private originalXml: string;
    private parserConfig: ParserConfig = DEFAULT_PARSER_CONFIG;

    /**
     * @param raw - The XML string to parse.
     * @param options - Optional accessor options (e.g. `readonly`).
     * @param parserConfig - Parser configuration with XML depth limits.
     */
    constructor(
        raw: unknown,
        options?: { readonly?: boolean },
        parserConfig: ParserConfig = DEFAULT_PARSER_CONFIG,
    ) {
        super(raw, options);
        this.originalXml = raw as string;
        this.parserConfig = parserConfig;
    }

    /**
     * Creates an accessor from an XML string.
     *
     * @param data - A valid XML string.
     * @returns A new {@link XmlAccessor} instance.
     * @throws {InvalidFormatError} If `data` is not a string.
     * @throws {SecurityError} If the XML contains DOCTYPE or ENTITY declarations.
     */
    static from(data: unknown, options?: { readonly?: boolean }): XmlAccessor {
        if (typeof data !== 'string') {
            throw new InvalidFormatError('XmlAccessor expects an XML string.');
        }
        return new XmlAccessor(data, options);
    }

    /**
     * Parses an XML string into a nested plain record.
     *
     * @param raw - The raw XML string.
     * @returns A plain record representing the XML element tree.
     * @throws {InvalidFormatError} If the XML structure is invalid.
     * @throws {SecurityError} If DOCTYPE or ENTITY declarations are found.
     */
    protected parse(raw: unknown): Record<string, unknown> {
        const xml = raw as string;
        XmlAccessor.assertSafeXml(xml);
        const maxDepth = this.parserConfig?.maxXmlDepth ?? DEFAULT_PARSER_CONFIG.maxXmlDepth;
        try {
            return XmlAccessor.parseXmlToObject(xml, maxDepth);
        } catch (e) {
            if (e instanceof SecurityError) throw e;
            throw new InvalidFormatError('XmlAccessor failed to parse XML string.');
        }
    }

    /**
     * Returns a new {@link XmlAccessor} wrapping the given data, preserving the
     * original XML string for reference.
     *
     * @param data - The record to wrap.
     * @returns A new {@link XmlAccessor} instance.
     */
    clone(data: Record<string, unknown>): XmlAccessor<T> {
        // Rebuild a minimal XML from data for roundtrip (stores as JSON internally)
        const inst = Object.create(XmlAccessor.prototype) as XmlAccessor<T>;
        inst.raw = this.originalXml;
        inst.data = data;
        inst.originalXml = this.originalXml;
        inst.parserConfig = this.parserConfig;
        return inst;
    }

    /**
     * Returns the original unparsed XML string.
     *
     * @returns The raw XML string passed at construction time.
     */
    getOriginalXml(): string {
        return this.originalXml;
    }

    /**
     * Rejects XML with DOCTYPE or ENTITY declarations (XXE prevention).
     *
     * @param xml - The raw XML string to inspect.
     * @throws {SecurityError} If DOCTYPE or ENTITY declarations are present.
     */
    private static assertSafeXml(xml: string): void {
        if (/<!DOCTYPE/i.test(xml)) {
            throw new SecurityError('XML DOCTYPE declarations are blocked for security.');
        }
        if (/<!ENTITY/i.test(xml)) {
            throw new SecurityError('XML ENTITY declarations are blocked for security.');
        }
    }

    /**
     * Simple recursive XML-to-object parser.
     * Handles elements, text content, and attributes.
     * Strips the root element wrapper, returning its children as top-level keys.
     *
     * @param xml - The cleaned XML string (no XML declaration).
     * @param maxDepth - Maximum allowed nesting depth.
     * @returns A plain record of the root element's children.
     * @throws {Error} If the XML structure does not have a valid root element.
     */
    private static parseXmlToObject(xml: string, maxDepth: number): Record<string, unknown> {
        // Remove XML declaration
        const cleaned = xml.replace(/<\?xml[^?]*\?>\s*/gi, '').trim();

        // Extract root element
        const rootMatch = cleaned.match(/^<(\w+)[^>]*>([\s\S]*)<\/\1>$/);
        if (!rootMatch) {
            throw new Error('Invalid XML structure');
        }

        return XmlAccessor.parseChildren(rootMatch[2].trim(), 0, maxDepth);
    }

    /**
     * Recursively parses child XML content into a plain record.
     *
     * Elements without attributes and without child elements are stored as plain strings.
     * Elements with attributes are represented as objects with an `@attributes` key containing
     * a string record of `name → value` pairs — matching the shape produced by PHP's
     * `json_encode(simplexml_load_string(...))` conversion.
     * Elements with both attributes and text content additionally carry a `#text` key.
     *
     * @param content - The inner XML content string.
     * @param depth - Current recursion depth (guards against excessive nesting).
     * @param maxDepth - Maximum allowed nesting depth from {@link ParserConfig.maxXmlDepth}.
     * @returns A plain record keyed by element names.
     * @throws {Error} If nesting depth exceeds the configured maximum.
     */
    private static parseChildren(
        content: string,
        depth: number,
        maxDepth: number,
    ): Record<string, unknown> {
        if (depth > maxDepth) {
            throw new Error(`XML nesting depth exceeds maximum of ${maxDepth}`);
        }

        const result: Record<string, unknown> = {};
        const tagRegex = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>|<(\w+)([^>]*)\s*\/>/g;
        let match: RegExpExecArray | null;

        while ((match = tagRegex.exec(content)) !== null) {
            const tagName = match[1] || match[4];
            SecurityGuard.assertSafeKey(tagName);
            const attrs = match[2] || match[5] || '';
            const innerContent = match[3] ?? '';

            // Parse attribute key="value" or key='value' pairs; validate names for safety
            const parsedAttrs: Record<string, string> = {};
            const attrValueRegex = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
            let attrMatch: RegExpExecArray | null;
            let hasAttributes = false;
            while ((attrMatch = attrValueRegex.exec(attrs)) !== null) {
                SecurityGuard.assertSafeKey(attrMatch[1]);
                parsedAttrs[attrMatch[1]] = attrMatch[2] ?? attrMatch[3] ?? '';
                hasAttributes = true;
            }

            // Check if inner content has child elements
            const hasChildElements = /<\w+[^>]*>/.test(innerContent);
            const trimmedText = innerContent.trim();

            let value: unknown;
            if (hasAttributes || hasChildElements) {
                // Produce a structured node: @attributes + children or #text
                const node: Record<string, unknown> = {};
                if (hasAttributes) {
                    node['@attributes'] = parsedAttrs;
                }
                if (hasChildElements) {
                    const children = XmlAccessor.parseChildren(innerContent, depth + 1, maxDepth);
                    Object.assign(node, children);
                } else if (trimmedText !== '') {
                    // Mixed content: element has both attributes and text
                    node['#text'] = trimmedText;
                }
                value = node;
            } else {
                value = trimmedText;
            }

            // Handle repeated tags as arrays
            if (tagName in result) {
                const existing = result[tagName];
                if (Array.isArray(existing)) {
                    existing.push(value);
                } else {
                    result[tagName] = [existing, value];
                }
            } else {
                result[tagName] = value;
            }
        }

        return result;
    }
}
