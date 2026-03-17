<?php

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
*/

// uses(Tests\TestCase::class)->in('Feature');

/*
|--------------------------------------------------------------------------
| Global Teardown
|--------------------------------------------------------------------------
| Ensures all singletons and static state are reset between tests.
*/

uses()
    ->afterEach(fn () => \SafeAccessInline\SafeAccess::resetAll())
    ->in('Unit', 'Integration');
