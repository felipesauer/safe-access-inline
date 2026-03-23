/**
 * Strategies for preventing formula injection when serializing to CSV.
 */
export enum CsvMode {
    /** No protection. Values are serialised as-is. */
    NONE = 'none',
    /** Prefix unsafe values with a single quote (`'`). */
    PREFIX = 'prefix',
    /** Strip leading unsafe characters (+, -, =, @). */
    STRIP = 'strip',
    /** Throw an error if formula injection is detected. */
    ERROR = 'error',
}
