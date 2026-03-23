<?php

declare(strict_types=1);

use SafeAccessInline\Accessors\JsonAccessor;
use SafeAccessInline\Core\AbstractAccessor;

describe(AbstractAccessor::class, function (): void {
    describe('remember / forget — PSR-16 cache integration', function (): void {

        /**
         * Returns a minimal in-memory PSR-16 CacheInterface anonymous implementation.
         *
         * @return \Psr\SimpleCache\CacheInterface
         */
        $makeCache = static function (): \Psr\SimpleCache\CacheInterface {
            return new class () implements \Psr\SimpleCache\CacheInterface {
                /** @var array<string, mixed> */
                private array $store = [];

                public function get(string $key, mixed $default = null): mixed
                {
                    return $this->store[$key] ?? $default;
                }

                public function set(string $key, mixed $value, \DateInterval|int|null $ttl = null): bool
                {
                    $this->store[$key] = $value;
                    return true;
                }

                public function delete(string $key): bool
                {
                    unset($this->store[$key]);
                    return true;
                }

                public function clear(): bool
                {
                    $this->store = [];
                    return true;
                }

                /** @param iterable<string> $keys */
                public function getMultiple(iterable $keys, mixed $default = null): iterable
                {
                    $result = [];
                    foreach ($keys as $key) {
                        $result[$key] = $this->store[$key] ?? $default;
                    }
                    return $result;
                }

                /**
                 * @param iterable<string, mixed> $values
                 */
                public function setMultiple(iterable $values, \DateInterval|int|null $ttl = null): bool
                {
                    foreach ($values as $key => $value) {
                        $this->store[$key] = $value;
                    }
                    return true;
                }

                /** @param iterable<string> $keys */
                public function deleteMultiple(iterable $keys): bool
                {
                    foreach ($keys as $key) {
                        unset($this->store[$key]);
                    }
                    return true;
                }

                public function has(string $key): bool
                {
                    return array_key_exists($key, $this->store);
                }
            };
        };

        it('remember — returns $this on cache miss and stores the data', function () use ($makeCache): void {
            $cache    = $makeCache();
            $accessor = JsonAccessor::from('{"name":"Ana"}');
            $returned = $accessor->remember($cache, 60, 'key1');
            expect($returned)->toBe($accessor);
            expect($cache->has('key1'))->toBeTrue();
        });

        it('remember — returns cached instance on cache hit', function () use ($makeCache): void {
            $cache = $makeCache();

            // First call: populate cache
            $original = JsonAccessor::from('{"name":"Ana"}');
            $original->remember($cache, 60, 'key2');

            // Second call: should retrieve cached Ana, not Bob
            $other  = JsonAccessor::from('{"name":"Bob"}');
            $cached = $other->remember($cache, 60, 'key2');

            expect($cached->get('name'))->toBe('Ana');
        });

        it('remember — cached instance has the same data structure', function () use ($makeCache): void {
            $cache    = $makeCache();
            $accessor = JsonAccessor::from('{"city":"Berlin","count":3}');
            $accessor->remember($cache, 60, 'cfg');
            $restored = $accessor->remember($cache, 60, 'cfg');
            expect($restored->get('city'))->toBe('Berlin');
            expect($restored->get('count'))->toBe(3);
        });

        it('forget — removes the cached item', function () use ($makeCache): void {
            $cache    = $makeCache();
            $accessor = JsonAccessor::from('{"x":1}');
            $accessor->remember($cache, 60, 'item');
            expect($cache->has('item'))->toBeTrue();
            $accessor->forget($cache, 'item');
            expect($cache->has('item'))->toBeFalse();
        });

        it('forget — is a no-op when key does not exist', function () use ($makeCache): void {
            $cache    = $makeCache();
            $accessor = JsonAccessor::from('{"x":1}');
            // Should not throw
            $accessor->forget($cache, 'nonexistent');
            expect(true)->toBeTrue();
        });

    });
});
