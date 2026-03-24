<?php

declare(strict_types=1);

namespace SafeAccessInline\Traits;

/**
 * Default cross-format conversion implementations.
 * Depends on $this->data (normalized array) existing in the class that uses this trait.
 */
trait HasTransformations
{
    /**
     * Serialises the accessor's data to a JSON string.
     *
     * `$flagsOrOptions` accepts three forms for flexibility and JS parity:
     *  - **int** bitmask — passed directly to `json_encode` (backward compat).
     *  - **bool** — `true` enables `JSON_PRETTY_PRINT` (short-hand compat).
     *  - **array** named options (mirrors TypeScript `ToJsonOptions`):
     *    - `pretty` (bool)          — enable `JSON_PRETTY_PRINT`
     *    - `unescapeUnicode` (bool) — enable `JSON_UNESCAPED_UNICODE`
     *    - `unescapeSlashes` (bool) — enable `JSON_UNESCAPED_SLASHES`
     *    - `space` (int|string)     — implies `JSON_PRETTY_PRINT` (PHP does not support custom indent)
     *
     * @param  int|bool|array<string, mixed> $flagsOrOptions
     * @return string JSON-encoded data.
     *
     * @throws \JsonException On encoding failure.
     */
    public function toJson(int|bool|array $flagsOrOptions = 0): string
    {
        $flags = 0;

        if (is_bool($flagsOrOptions)) {
            if ($flagsOrOptions) {
                $flags |= JSON_PRETTY_PRINT;
            }
        } elseif (is_array($flagsOrOptions)) {
            if (!empty($flagsOrOptions['pretty'])) {
                $flags |= JSON_PRETTY_PRINT;
            }
            if (!empty($flagsOrOptions['unescapeUnicode'])) {
                $flags |= JSON_UNESCAPED_UNICODE;
            }
            if (!empty($flagsOrOptions['unescapeSlashes'])) {
                $flags |= JSON_UNESCAPED_SLASHES;
            }
            // 'space' implies pretty-print; PHP does not support custom indent strings.
            if (isset($flagsOrOptions['space'])) {
                $flags |= JSON_PRETTY_PRINT;
            }
        } else {
            $flags = $flagsOrOptions;
        }

        return json_encode($this->data, $flags | JSON_THROW_ON_ERROR);
    }
}
