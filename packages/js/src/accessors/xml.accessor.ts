import { AbstractAccessor } from '../core/abstract-accessor';
import { InvalidFormatError } from '../exceptions/invalid-format.error';
import { SecurityError } from '../exceptions/security.error';
import { SecurityGuard } from '../security/guards/security-guard';

/**
 * Accessor for XML strings.
 * Parses XML into a nested object structure using a simple recursive parser.
 * No external dependencies — uses a lightweight built-in parser.
 */
export class XmlAccessor<
    T extends Record<string, unknown> = Record<string, unknown>,
> extends AbstractAccessor<T> {
    private originalXml: string;

    constructor(raw: unknown, options?: { readonly?: boolean }) {
        super(raw, options);
        this.originalXml = raw as string;
    }

    /** Creates an accessor from an XML string. */
    static from(data: unknown): XmlAccessor {
        if (typeof data !== 'string') {
            throw new InvalidFormatError('XmlAccessor expects an XML string.');
        }
        return new XmlAccessor(data);
    }

    protected parse(raw: unknown): Record<string, unknown> {
        const xml = raw as string;
        XmlAccessor.assertSafeXml(xml);
        try {
            return XmlAccessor.parseXmlToObject(xml);
        } catch (e) {
            if (e instanceof SecurityError) throw e;
            throw new InvalidFormatError('XmlAccessor failed to parse XML string.');
        }
    }

    clone(data: Record<string, unknown>): XmlAccessor<T> {
        // Rebuild a minimal XML from data for roundtrip (stores as JSON internally)
        const inst = Object.create(XmlAccessor.prototype) as XmlAccessor<T>;
        inst.raw = this.originalXml;
        inst.data = data;
        inst.originalXml = this.originalXml;
        return inst;
    }

    /** Returns the original unparsed XML string. */
    getOriginalXml(): string {
        return this.originalXml;
    }

    /**
     * Rejects XML with DOCTYPE or ENTITY declarations (XXE prevention).
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
     */
    private static parseXmlToObject(xml: string): Record<string, unknown> {
        // Remove XML declaration
        const cleaned = xml.replace(/<\?xml[^?]*\?>\s*/gi, '').trim();

        // Extract root element
        const rootMatch = cleaned.match(/^<(\w+)[^>]*>([\s\S]*)<\/\1>$/);
        if (!rootMatch) {
            throw new Error('Invalid XML structure');
        }

        return XmlAccessor.parseChildren(rootMatch[2].trim());
    }

    private static parseChildren(content: string, depth = 0): Record<string, unknown> {
        if (depth > 100) {
            throw new Error('XML nesting depth exceeds maximum of 100');
        }

        const result: Record<string, unknown> = {};
        const tagRegex = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>|<(\w+)([^>]*)\s*\/>/g;
        let match: RegExpExecArray | null;

        while ((match = tagRegex.exec(content)) !== null) {
            const tagName = match[1] || match[4];
            SecurityGuard.assertSafeKey(tagName);
            const attrs = match[2] || match[5] || '';
            const innerContent = match[3] ?? '';

            // Check attribute names for forbidden keys
            const attrRegex = /(\w+)\s*=/g;
            let attrMatch: RegExpExecArray | null;
            while ((attrMatch = attrRegex.exec(attrs)) !== null) {
                SecurityGuard.assertSafeKey(attrMatch[1]);
            }

            // Check if inner content has child elements
            const hasChildElements = /<\w+[^>]*>/.test(innerContent);

            let value: unknown;
            if (hasChildElements) {
                value = XmlAccessor.parseChildren(innerContent, depth + 1);
            } else {
                value = innerContent;
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
