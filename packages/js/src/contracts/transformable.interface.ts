export interface TransformableInterface {
    toArray(): Record<string, unknown>;
    toJson(pretty?: boolean): string;
    toObject(): Record<string, unknown>;
    toToml(): string;
    toYaml(): string;
    toXml(rootElement?: string): string;
    transform(format: string): string;
}
