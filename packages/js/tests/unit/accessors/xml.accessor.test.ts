import { describe, it, expect } from 'vitest';
import { XmlAccessor } from '../../../src/accessors/xml.accessor';
import { InvalidFormatError } from '../../../src/exceptions/invalid-format.error';
import { SecurityError } from '../../../src/exceptions/security.error';

describe(XmlAccessor.name, () => {
    const xml = `<root><user><name>Ana</name><age>30</age></user><title>Test</title></root>`;

    it('from — valid XML string', () => {
        const accessor = XmlAccessor.from(xml);
        expect(accessor).toBeInstanceOf(XmlAccessor);
    });

    it('from — invalid type throws', () => {
        expect(() => XmlAccessor.from(123)).toThrow(InvalidFormatError);
    });

    it('from — invalid XML throws', () => {
        expect(() => XmlAccessor.from('not xml at all <>')).toThrow(InvalidFormatError);
    });

    it('get — simple key', () => {
        const accessor = XmlAccessor.from(xml);
        expect(accessor.get('title')).toBe('Test');
    });

    it('get — nested', () => {
        const accessor = XmlAccessor.from(xml);
        expect(accessor.get('user.name')).toBe('Ana');
        expect(accessor.get('user.age')).toBe('30');
    });

    it('get — nonexistent returns default', () => {
        const accessor = XmlAccessor.from(xml);
        expect(accessor.get('missing.path', 'fallback')).toBe('fallback');
    });

    it('has — existing', () => {
        const accessor = XmlAccessor.from(xml);
        expect(accessor.has('user.name')).toBe(true);
    });

    it('has — nonexistent', () => {
        const accessor = XmlAccessor.from(xml);
        expect(accessor.has('nope')).toBe(false);
    });

    it('set — immutable', () => {
        const accessor = XmlAccessor.from(xml);
        const newAccessor = accessor.set('title', 'New');
        expect(newAccessor.get('title')).toBe('New');
        expect(accessor.get('title')).toBe('Test');
    });

    it('remove — existing', () => {
        const accessor = XmlAccessor.from(xml);
        const newAccessor = accessor.remove('title');
        expect(newAccessor.has('title')).toBe(false);
    });

    it('toArray', () => {
        const accessor = XmlAccessor.from(xml);
        const arr = accessor.toArray();
        expect(arr).toHaveProperty('user');
        expect(arr).toHaveProperty('title');
    });

    it('toJson', () => {
        const accessor = XmlAccessor.from(xml);
        const json = accessor.toJson();
        expect(() => JSON.parse(json)).not.toThrow();
    });

    it('getOriginalXml returns original', () => {
        const accessor = XmlAccessor.from(xml);
        expect(accessor.getOriginalXml()).toBe(xml);
    });

    it('type', () => {
        const accessor = XmlAccessor.from(xml);
        expect(accessor.type('user')).toBe('object');
        expect(accessor.type('title')).toBe('string');
    });

    it('count and keys', () => {
        const accessor = XmlAccessor.from(xml);
        expect(accessor.count()).toBe(2); // user, title
        expect(accessor.keys()).toContain('user');
        expect(accessor.keys()).toContain('title');
    });

    it('handles repeated tags as arrays', () => {
        const xmlItems = `<root><item>A</item><item>B</item><item>C</item></root>`;
        const accessor = XmlAccessor.from(xmlItems);
        const items = accessor.get('item');
        expect(items).toEqual(['A', 'B', 'C']);
    });

    it('throws on deeply nested XML (DoS protection)', () => {
        let xml = '<root>';
        for (let i = 0; i < 110; i++) xml += `<n${i}>`;
        xml += 'deep';
        for (let i = 109; i >= 0; i--) xml += `</n${i}>`;
        xml += '</root>';
        expect(() => XmlAccessor.from(xml)).toThrow(InvalidFormatError);
    });

    it('handles self-closing tags', () => {
        const xmlSelfClose = `<root><item/><other>val</other></root>`;
        const accessor = XmlAccessor.from(xmlSelfClose);
        expect(accessor.has('item')).toBe(true);
        expect(accessor.get('other')).toBe('val');
    });

    it('handles XML with attributes', () => {
        const xmlAttrs = `<root><item id="1" type="main">text</item></root>`;
        const accessor = XmlAccessor.from(xmlAttrs);
        expect(accessor.get('item.#text')).toBe('text');
        expect(accessor.get('item.@attributes.id')).toBe('1');
        expect(accessor.get('item.@attributes.type')).toBe('main');
    });

    it('handles XML declaration', () => {
        const xmlDecl = `<?xml version="1.0" encoding="UTF-8"?><root><name>Ana</name></root>`;
        const accessor = XmlAccessor.from(xmlDecl);
        expect(accessor.get('name')).toBe('Ana');
    });

    // ── XML Hardening (XXE Prevention) ──────────────

    it('rejects XML with DOCTYPE declaration', () => {
        const xxeXml = `<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><root><name>&xxe;</name></root>`;
        expect(() => XmlAccessor.from(xxeXml)).toThrow(SecurityError);
    });

    it('rejects XML with ENTITY declaration', () => {
        const entityXml = `<?xml version="1.0"?><!DOCTYPE test [<!ENTITY test "value">]><root><a>1</a></root>`;
        expect(() => XmlAccessor.from(entityXml)).toThrow(SecurityError);
    });

    it('rejects XML with DOCTYPE even without entities', () => {
        const doctypeXml = `<!DOCTYPE root SYSTEM "test.dtd"><root><a>1</a></root>`;
        expect(() => XmlAccessor.from(doctypeXml)).toThrow(SecurityError);
    });
    it('rejects XML with prototype pollution tag name', () => {
        const protoXml = `<root><__proto__>bad</__proto__></root>`;
        expect(() => XmlAccessor.from(protoXml)).toThrow(SecurityError);
    });

    // ── Depth boundary (kills EqualityOperator: depth > 100 vs depth >= 100) ──

    it('parses XML with nesting depth of exactly 100 levels without throwing', () => {
        // Uses unique tag names (n0, n1, ...) so the non-greedy tagRegex nests properly.
        // depth > 100: depth=100 passes; depth >= 100: depth=100 would throw → must not throw here.
        // 101 unique nested tags: the deepest parseChildren call gets depth=100 → 100 > 100 = false → OK.
        // With mutant (>=): 100 >= 100 = true → would throw → this test fails → kills mutant ✅
        let open = '';
        let close = '';
        for (let i = 0; i < 101; i++) {
            open += `<n${i}>`;
            close = `</n${i}>` + close;
        }
        const xml = `<root>${open}deep${close}</root>`;
        expect(() => XmlAccessor.from(xml)).not.toThrow();
    });

    it('throws when nesting depth exceeds 100 levels (depth > 100)', () => {
        // 102 unique nested tags: depth reaches 101 → 101 > 100 = true → throws.
        // With mutant (>=): already caught by the previous test (101 tags would throw at depth=100).
        let open = '';
        let close = '';
        for (let i = 0; i < 102; i++) {
            open += `<n${i}>`;
            close = `</n${i}>` + close;
        }
        const xml = `<root>${open}deep${close}</root>`;
        expect(() => XmlAccessor.from(xml)).toThrow();
    });

    // ── Root regex anchor (kills Regex mutant: ^<(\w+) anchor removed) ───

    it('rejects XML string with non-whitespace text before root element', () => {
        // The root-match regex must be anchored to the start: ^<(\w+)...
        // Killing regex mutant where ^ anchor is removed would accept "junk<root>"
        expect(() => XmlAccessor.from('junk<root><a>1</a></root>')).toThrow();
    });

    // ── Multiline content (kills Regex mutant: [\s\S] vs [\S\S]) ─────────

    it('parses element with multiline text content (\\n inside element)', () => {
        const xmlMultiline = '<root><desc>line1\nline2</desc></root>';
        const acc = XmlAccessor.from(xmlMultiline);
        const val = acc.get('desc') as string;
        expect(val).toContain('\n');
        expect(val).toContain('line1');
        expect(val).toContain('line2');
    });

    // ── Attribute logic (kills LogicalOperator mutant: match[2] || match[5]) ─

    it('parses element with numeric attribute value', () => {
        const xmlAttrs = '<root><item count="42">text</item></root>';
        const acc = XmlAccessor.from(xmlAttrs);
        // Element with attribute produces { '@attributes': { count: '42' }, '#text': 'text' }
        expect(acc.get('item.#text')).toBe('text');
        expect(acc.get('item.@attributes.count')).toBe('42');
    });

    it('parses self-closing tag with multiple attributes', () => {
        const xml = '<root><br class="x" id="y"/></root>';
        const acc = XmlAccessor.from(xml);
        expect(acc.has('br')).toBe(true);
    });

    it('parses element with single-quoted attribute value', () => {
        // Exercises the attrMatch[2] ?? attrMatch[3]! branch where attrMatch[2] is undefined
        const xml = "<root><item lang='en'>hello</item></root>";
        const acc = XmlAccessor.from(xml);
        expect(acc.get('item.@attributes.lang')).toBe('en');
        expect(acc.get('item.#text')).toBe('hello');
    });

    it('parses element with no attributes and no self-closing (plain element)', () => {
        // Exercises the match[2] empty-string fallback (attrs = '' or match[5])
        const xml = '<root><plain>val</plain></root>';
        const acc = XmlAccessor.from(xml);
        expect(acc.get('plain')).toBe('val');
    });
});

// ── XmlAccessor — clone and getOriginalXml ──────────────────────
describe('XmlAccessor — clone and getOriginalXml', () => {
    it('clone creates new instance with modified data', () => {
        const xml = '<root><name>Ana</name></root>';
        const acc = XmlAccessor.from(xml);
        const modified = acc.set('name', 'Bob');
        expect(modified.get('name')).toBe('Bob');
        expect(acc.get('name')).toBe('Ana');
    });

    it('getOriginalXml returns the original XML string', () => {
        const xml = '<root><name>Ana</name></root>';
        const acc = XmlAccessor.from(xml) as XmlAccessor;
        expect(acc.getOriginalXml()).toBe(xml);
    });

    it('getOriginalXml persists after set operations', () => {
        const xml = '<root><val>1</val></root>';
        const acc = XmlAccessor.from(xml) as XmlAccessor;
        const modified = acc.set('val', '2') as XmlAccessor;
        expect(modified.getOriginalXml()).toBe(xml);
    });
});

// ── XmlAccessor — non-SecurityError parse failure ───────────────
describe('XmlAccessor — parse errors', () => {
    it('wraps non-SecurityError parse failure as InvalidFormatError', () => {
        expect(() => new XmlAccessor('just plain text without tags')).toThrow(
            'XmlAccessor failed to parse XML string.',
        );
    });

    it('rejects XML with ENTITY declaration', () => {
        const xmlWithEntity = '<!ENTITY foo "bar"><root><a>1</a></root>';
        expect(() => new XmlAccessor(xmlWithEntity)).toThrow('XML ENTITY declarations are blocked');
    });
});
