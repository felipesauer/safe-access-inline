<?php

declare(strict_types=1);

/**
 * PhpStorm IDE meta-data for safe-access-inline.
 *
 * This file is automatically picked up by PhpStorm to enhance autocompletion
 * and return-type inference. It has no effect at runtime.
 *
 * @see https://www.jetbrains.com/help/phpstorm/ide-advanced-metadata.html
 */

namespace PHPSTORM_META {

    use SafeAccessInline\Core\AbstractAccessor;

    // Narrow the return type of get() to match the $default argument type.
    // Example: $accessor->get('key', 0) → inferred as int|null (not mixed).
    override(AbstractAccessor::get(0), type(1));

    // The cast methods below carry full return-type declarations in source,
    // so PhpStorm resolves them natively. The override entries here serve as
    // explicit documentation and ensure compatibility with older IDE versions.
    override(AbstractAccessor::getInt(0), type(0));
    override(AbstractAccessor::getBool(0), type(0));
    override(AbstractAccessor::getString(0), type(0));
    override(AbstractAccessor::getFloat(0), type(0));
    override(AbstractAccessor::getArray(0), type(1));
}
