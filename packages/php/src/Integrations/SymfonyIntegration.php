<?php

declare(strict_types=1);

namespace SafeAccessInline\Integrations;

use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\SafeAccess;

/**
 * Symfony integration for safe-access-inline.
 *
 * Usage with Symfony's ParameterBag:
 *   $accessor = SymfonyIntegration::fromParameterBag($container->getParameterBag());
 *   $accessor->get('database_host');
 *
 * Usage with Symfony config arrays:
 *   $accessor = SymfonyIntegration::fromConfig($config);
 *   $accessor->get('framework.secret');
 */
class SymfonyIntegration
{
    /**
     * Creates an accessor from a Symfony ParameterBag.
     *
     * @param object $parameterBag Symfony ParameterBagInterface instance
     */
    public static function fromParameterBag(object $parameterBag): AbstractAccessor
    {
        /** @phpstan-ignore method.notFound */
        return SafeAccess::from($parameterBag->all(), 'array');
    }

    /**
     * Creates an accessor from a Symfony config array (as produced by Extension::load()).
     *
     * @param array<string, mixed> $config Processed configuration array
     */
    public static function fromConfig(array $config): AbstractAccessor
    {
        return SafeAccess::from($config, 'array');
    }

    /**
     * Creates an accessor from a YAML config file (common in Symfony projects).
     *
     * @param string $yamlPath Path to a YAML config file
     * @param string[] $allowedDirs Optional directory whitelist
     */
    public static function fromYamlFile(string $yamlPath, array $allowedDirs = []): AbstractAccessor
    {
        return SafeAccess::fromFile($yamlPath, 'yaml', $allowedDirs);
    }
}
