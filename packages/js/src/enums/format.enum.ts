/**
 * Supported data-source formats.
 *
 * Each member corresponds to an accessor class that knows how to
 * parse and serialize that format.
 */
export enum Format {
    Array = 'array',
    Object = 'object',
    Json = 'json',
    Xml = 'xml',
    Yaml = 'yaml',
    Toml = 'toml',
    Ini = 'ini',
    Csv = 'csv',
    Env = 'env',
    Ndjson = 'ndjson',
}
