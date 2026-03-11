import { AbstractAccessor } from '../core/abstract-accessor';
import { InvalidFormatError } from '../exceptions/invalid-format.error';

/**
 * Accessor for XML strings.
 * Parses XML into a nested object structure using a simple recursive parser.
 * No external dependencies — uses a lightweight built-in parser.
 */
export class XmlAccessor extends AbstractAccessor {
  private originalXml: string;

  constructor(raw: unknown) {
    super(raw);
    this.originalXml = raw as string;
  }

  static from(data: unknown): XmlAccessor {
    if (typeof data !== 'string') {
      throw new InvalidFormatError('XmlAccessor expects an XML string.');
    }
    return new XmlAccessor(data);
  }

  protected parse(raw: unknown): Record<string, unknown> {
    const xml = raw as string;
    try {
      return XmlAccessor.parseXmlToObject(xml);
    } catch {
      throw new InvalidFormatError('XmlAccessor failed to parse XML string.');
    }
  }

  clone(data: Record<string, unknown>): XmlAccessor {
    // Rebuild a minimal XML from data for roundtrip (stores as JSON internally)
    const inst = Object.create(XmlAccessor.prototype) as XmlAccessor;
    inst.raw = this.originalXml;
    inst.data = data;
    inst.originalXml = this.originalXml;
    return inst;
  }

  getOriginalXml(): string {
    return this.originalXml;
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

  private static parseChildren(content: string): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    const tagRegex = /<(\w+)([^>]*)>([\s\S]*?)<\/\1>|<(\w+)([^>]*)\s*\/>/g;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(content)) !== null) {
      const tagName = match[1] || match[4];
      const innerContent = match[3] ?? '';

      // Check if inner content has child elements
      const hasChildElements = /<\w+[^>]*>/.test(innerContent);

      let value: unknown;
      if (hasChildElements) {
        value = XmlAccessor.parseChildren(innerContent);
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
