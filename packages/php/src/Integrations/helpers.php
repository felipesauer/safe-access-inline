<?php

declare(strict_types=1);

if (!function_exists('safe_access')) {
    /**
     * Get the safe-access accessor instance from the Laravel container.
     *
     * @codeCoverageIgnore
     *
     * @return \SafeAccessInline\Core\AbstractAccessor
     */
    function safe_access(): \SafeAccessInline\Core\AbstractAccessor
    {
        /** @var \SafeAccessInline\Core\AbstractAccessor */
        return app('safe-access'); // @phpstan-ignore function.notFound
    }
}
