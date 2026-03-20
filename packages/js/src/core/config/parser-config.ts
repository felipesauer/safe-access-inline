/** Configuration for recursive path-resolution and parsing depth limits. */
export interface ParserConfig {
    /** Maximum recursion depth when resolving nested / recursive-descent paths. */
    readonly maxResolveDepth: number;
    /** Maximum nesting depth allowed when parsing XML documents (DoS protection). */
    readonly maxXmlDepth: number;
}

export const DEFAULT_PARSER_CONFIG: ParserConfig = {
    maxResolveDepth: 512,
    maxXmlDepth: 100,
};
