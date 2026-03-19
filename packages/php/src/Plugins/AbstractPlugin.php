<?php

declare(strict_types=1);

namespace SafeAccessInline\Plugins;

use SafeAccessInline\Exceptions\InvalidFormatException;

/**
 * Base class for plugins that depend on optional external packages.
 *
 * Provides a standardised availability guard: subclasses declare
 * {@see isAvailable()} and {@see installHint()}, then call
 * {@see assertAvailable()} at the start of their `parse()` or
 * `serialize()` method.
 */
abstract class AbstractPlugin
{
    /**
     * Whether the underlying library or extension is loaded.
     *
     * @return bool `true` when the dependency is present.
     */
    abstract protected function isAvailable(): bool;

    /**
     * Human-readable installation instruction shown when the dependency is missing.
     *
     * @return string e.g. `"composer require devium/toml"` or `"pecl install yaml"`.
     */
    abstract protected function installHint(): string;

    /**
     * Guards the plugin entry-point — throws when the dependency is absent.
     *
     * @throws InvalidFormatException When {@see isAvailable()} returns `false`.
     */
    protected function assertAvailable(): void
    {
        if (!$this->isAvailable()) {
            throw new InvalidFormatException($this->installHint());
        }
    }
}
