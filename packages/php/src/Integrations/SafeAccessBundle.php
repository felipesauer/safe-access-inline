<?php

declare(strict_types=1);

namespace SafeAccessInline\Integrations;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\SafeAccess;

/**
 * Symfony Bundle for safe-access-inline.
 *
 * Register in config/bundles.php:
 *   SafeAccessInline\Integrations\SafeAccessBundle::class => ['all' => true],
 *
 * Then inject or fetch the 'safe_access' service:
 *   $accessor = $container->get('safe_access');
 *   $accessor->get('framework.router.utf8');
 */
class SafeAccessBundle
{
    /**
     * Returns the bundle name.
     */
    public function getName(): string
    {
        return 'SafeAccessBundle';
    }

    /**
     * Registers the bundle's services into the Symfony DI container.
     *
     * Compatible with the Symfony 6.1+ AbstractBundle::loadExtension() pattern.
     * For older Symfony versions, use SymfonyIntegration helpers directly.
     *
     * @param array<string, mixed> $config Resolved bundle configuration
     * @param object $container Symfony ContainerBuilder instance
     */
    public function loadExtension(array $config, object $container): void
    {
        $filePath = $config['config_file'] ?? null;

        if (is_string($filePath)) {
            /** @phpstan-ignore method.notFound */
            $container->register('safe_access', AbstractAccessor::class)
                ->setFactory([SafeAccess::class, 'fromFile'])
                ->setArguments([$filePath])
                ->setPublic(true);
        } else {
            /** @var array<string, mixed> $data */
            $data = $config['data'] ?? [];
            /** @phpstan-ignore method.notFound */
            $container->register('safe_access', AbstractAccessor::class)
                ->setFactory([SafeAccess::class, 'from'])
                ->setArguments([$data, 'array'])
                ->setPublic(true);
        }
    }
}
