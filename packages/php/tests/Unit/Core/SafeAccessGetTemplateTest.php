<?php

declare(strict_types=1);

use SafeAccessInline\SafeAccess;

describe(SafeAccess::class . ' - getTemplate', function () {
    it('renders template string', function () {
        $rendered = SafeAccess::getTemplate('Hello {user.name}', ['user.name' => 'John']);
        expect($rendered)->toBe('Hello John');
    });
});
