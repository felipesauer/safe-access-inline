<?php

namespace SafeAccessInline\Traits;

/**
 * Provides a static factory method `make()` for fluent instantiation.
 */
trait HasFactory
{
    /**
     * Creates a new instance by forwarding arguments to the constructor.
     *
     * @param mixed ...$parameters Constructor parameters
     * @return static
     */
    public static function make(mixed ...$parameters): static
    {
        return new static(...$parameters); // @phpstan-ignore new.static, new.staticInAbstractClassStaticMethod
    }
}
