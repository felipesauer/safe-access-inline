<?php

declare(strict_types=1);

if (!function_exists('safe_access')) {
    /**
     * Get the safe-access accessor instance from the Laravel container.
     *
     * @codeCoverageIgnore
     *
     * @return \SafeAccessInline\Core\AbstractAccessor<array<mixed>>
     */
    function safe_access(): \SafeAccessInline\Core\AbstractAccessor
    {
        /** @var \SafeAccessInline\Core\AbstractAccessor<array<mixed>> */
        return app('safe-access'); // @phpstan-ignore function.notFound
    }
}
