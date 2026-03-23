<?php

declare(strict_types=1);

namespace SafeAccessInline\Core;

/**
 * Opaque container for a pre-compiled dot-notation path.
 *
 * Segments are parsed once via {@see \SafeAccessInline\SafeAccess::compilePath()} and reused
 * across multiple {@see AbstractAccessor::getCompiled()} calls, avoiding repeated tokenization
 * of the same path string.
 *
 * @remarks
 * `CompiledPath` is intentionally opaque — the `segments()` accessor is `@internal` and
 * consumers should treat this object as an opaque handle.
 */
final class CompiledPath
{
    /** @var list<array<mixed>> Pre-parsed segments from SegmentParser. */
    private readonly array $segments;

    /**
     * Constructs a `CompiledPath` from a pre-parsed segment array.
     *
     * @internal Use {@see \SafeAccessInline\SafeAccess::compilePath()} instead.
     * @param list<array<mixed>> $segments Pre-parsed path segments.
     */
    public function __construct(array $segments)
    {
        $this->segments = $segments;
    }

    /**
     * Returns the parsed segments.
     *
     * @internal Only {@see AbstractAccessor::getCompiled()} and
     *           {@see \SafeAccessInline\Core\Parsers\DotNotationParser::resolve()} should call this.
     * @return list<array<mixed>>
     */
    public function segments(): array
    {
        return $this->segments;
    }
}
