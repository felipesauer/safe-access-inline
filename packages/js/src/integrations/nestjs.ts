import { SafeAccess } from '../safe-access';
import type { AbstractAccessor } from '../core/abstract-accessor';

/**
 * Configuration options for the NestJS SafeAccess module.
 */
export interface SafeAccessModuleOptions {
    /** Path to config file (auto-detected format by extension) */
    filePath?: string;
    /** Inline data (any supported format) */
    data?: unknown;
    /** Explicit format override */
    format?: string;
    /** List of config files to layer (merged in order, last wins) */
    layerPaths?: string[];
    /** Allowed directories for file access */
    allowedDirs?: string[];
    /** Set to true to bypass path restrictions when no allowedDirs are configured */
    allowAnyPath?: boolean;
}

/**
 * Injection token for the SafeAccess accessor in NestJS.
 *
 * Usage with \@Inject():
 * ```ts
 * constructor(@Inject(SAFE_ACCESS) private config: AbstractAccessor) {}
 * ```
 */
export const SAFE_ACCESS = Symbol('SAFE_ACCESS');

/**
 * Injectable service wrapping a SafeAccess accessor.
 * Provides typed config access with dot notation.
 *
 * Usage:
 * ```ts
 * constructor(private config: SafeAccessService) {}
 * getPort() { return this.config.get<number>('server.port', 3000); }
 * ```
 */
export class SafeAccessService {
    constructor(private readonly accessor: AbstractAccessor) {}

    get<T = unknown>(path: string, defaultValue?: T): T {
        return this.accessor.get(path, defaultValue) as T;
    }

    getMany(paths: Record<string, unknown>): Record<string, unknown> {
        return this.accessor.getMany(paths);
    }

    has(path: string): boolean {
        return this.accessor.has(path);
    }

    all(): Record<string, unknown> {
        return this.accessor.toObject();
    }
}

/**
 * Creates a NestJS-compatible provider definition for SafeAccess.
 */
export function createSafeAccessProvider(options: SafeAccessModuleOptions) {
    return {
        provide: SAFE_ACCESS,
        useFactory: async (): Promise<AbstractAccessor> => {
            if (options.layerPaths && options.layerPaths.length > 0) {
                return SafeAccess.layerFiles(options.layerPaths, {
                    allowedDirs: options.allowedDirs,
                    allowAnyPath: options.allowAnyPath,
                });
            }

            if (options.filePath) {
                return SafeAccess.fromFile(options.filePath, {
                    format: options.format,
                    allowedDirs: options.allowedDirs,
                    allowAnyPath: options.allowAnyPath,
                });
            }

            if (options.data !== undefined) {
                return options.format
                    ? SafeAccess.from(options.data, options.format)
                    : SafeAccess.detect(options.data);
            }

            return SafeAccess.from({}, 'object');
        },
    };
}

/**
 * Creates a NestJS-compatible provider for SafeAccessService.
 */
export function createSafeAccessServiceProvider(options: SafeAccessModuleOptions) {
    return {
        provide: SafeAccessService,
        useFactory: async (): Promise<SafeAccessService> => {
            const accessorProvider = createSafeAccessProvider(options);
            const accessor = await accessorProvider.useFactory();
            return new SafeAccessService(accessor);
        },
    };
}

/**
 * Creates a NestJS dynamic module definition.
 *
 * Usage:
 * ```ts
 * import { SafeAccessModule } from '@safe-access-inline/safe-access-inline/integrations/nestjs';
 *
 * @Module({
 *   imports: [SafeAccessModule.register({ filePath: './config.yaml' })],
 * })
 * export class AppModule {}
 * ```
 *
 * Note: add `@Module({})` from `@nestjs/common` once it is declared as a peerDependency
 * to ensure full NestJS module-graph compatibility with stricter runtime validation.
 */
export class SafeAccessModule {
    static register(options: SafeAccessModuleOptions) {
        const provider = createSafeAccessProvider(options);
        const serviceProvider = createSafeAccessServiceProvider(options);
        return {
            module: SafeAccessModule,
            providers: [provider, serviceProvider],
            exports: [SAFE_ACCESS, SafeAccessService],
        };
    }
}
