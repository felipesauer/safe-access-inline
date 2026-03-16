export interface TransformableInterface {
    toArray(): Record<string, unknown>;
    toJson(pretty?: boolean): string;
    toObject(): Record<string, unknown>;
    toToml(): string;
    toYaml(): string;
    toXml(rootElement?: string): string;
    toCsv(csvMode?: 'none' | 'prefix' | 'strip' | 'error'): string;
    toNdjson(): string;
    transform(format: string): string;
}
