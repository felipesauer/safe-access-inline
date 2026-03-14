<?php

namespace SafeAccessInline\Security;

use SafeAccessInline\Exceptions\SecurityException;

final class SecurityOptions
{
    public const MAX_DEPTH = 512;
    public const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10MB
    public const MAX_KEYS = 10_000;

    public static function assertPayloadSize(string $input, ?int $maxBytes = null): void
    {
        $limit = $maxBytes ?? self::MAX_PAYLOAD_BYTES;
        $size = strlen($input);
        if ($size > $limit) {
            throw new SecurityException(
                "Payload size {$size} bytes exceeds maximum of {$limit} bytes."
            );
        }
    }

    /**
     * @param array<mixed> $data
     */
    public static function assertMaxKeys(array $data, ?int $maxKeys = null): void
    {
        $limit = $maxKeys ?? self::MAX_KEYS;
        $count = self::countKeys($data);
        if ($count > $limit) {
            throw new SecurityException(
                "Data contains {$count} keys, exceeding maximum of {$limit}."
            );
        }
    }

    public static function assertMaxDepth(int $currentDepth, ?int $maxDepth = null): void
    {
        $limit = $maxDepth ?? self::MAX_DEPTH;
        if ($currentDepth > $limit) {
            throw new SecurityException(
                "Recursion depth {$currentDepth} exceeds maximum of {$limit}."
            );
        }
    }

    private static function countKeys(mixed $obj, int $depth = 0): int
    {
        if ($depth > 100) {
            return 0;
        }
        if (!is_array($obj)) {
            return 0;
        }
        $count = count($obj);
        foreach ($obj as $value) {
            $count += self::countKeys($value, $depth + 1);
        }
        return $count;
    }
}
