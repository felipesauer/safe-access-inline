<?php

declare(strict_types=1);

use SafeAccessInline\Contracts\JsonPatchOperation;
use SafeAccessInline\Core\AbstractAccessor;
use SafeAccessInline\Enums\PatchOperationType;
use SafeAccessInline\SafeAccess;

describe(AbstractAccessor::class . ' - validatePatch', function () {
    it('throws when missing from on move', function () {
        $a = SafeAccess::fromArray([]);

        $thrown = false;
        try {
            $a->validatePatch([
                new JsonPatchOperation(PatchOperationType::MOVE->value, '/foo', null, null),
            ]);
        } catch (\InvalidArgumentException $e) {
            $thrown = true;
        }

        expect($thrown)->toBeTrue();
    });
});
