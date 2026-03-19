/** Configuration for recursive path-resolution depth limits. */
export interface ParserConfig {
    /** Maximum recursion depth when resolving nested / recursive-descent paths. */
    readonly maxResolveDepth: number;
}

export const DEFAULT_PARSER_CONFIG: ParserConfig = {
    maxResolveDepth: 512,
};
