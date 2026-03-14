<?php

use SafeAccessInline\Core\DotNotationParser;
use SafeAccessInline\Core\PathCache;

beforeEach(function () {
    PathCache::clear();
});

dataset('store_data', [
    fn () => [
        'store' => [
            'books' => [
                ['title' => 'A', 'author' => 'Ana', 'price' => 10, 'tags' => ['fiction']],
                ['title' => 'B', 'author' => 'Bob', 'price' => 20, 'tags' => ['science', 'tech']],
                ['title' => 'C', 'author' => 'Carol', 'price' => 30, 'tags' => ['fiction', 'drama']],
                ['title' => 'D', 'author' => 'Dave', 'price' => 40, 'tags' => ['history']],
                ['title' => 'E', 'author' => 'Eve', 'price' => 50, 'tags' => ['science']],
            ],
            'name' => 'MyStore',
            'meta' => ['open' => true, 'rating' => 4.5],
        ],
        'users' => [
            ['name' => 'Alice', 'age' => 25, 'profile' => ['bio' => 'Hi']],
            ['name' => 'Bob', 'age' => 17, 'profile' => ['bio' => 'Hello world']],
            ['name' => 'Carol', 'age' => 30, 'profile' => ['bio' => 'Hey']],
        ],
    ],
]);

// Root anchor ($)
test('root anchor $ strips prefix and resolves path', function (array $data) {
    expect(DotNotationParser::get($data, '$.store.name'))->toBe('MyStore');
})->with('store_data');

test('root anchor $ with bracket notation', function (array $data) {
    expect(DotNotationParser::get($data, "\$['store'].name"))->toBe('MyStore');
})->with('store_data');

test('root anchor $ with nested path', function (array $data) {
    expect(DotNotationParser::get($data, '$.store.meta.open'))->toBe(true);
})->with('store_data');

// Bracket notation
test("single-quoted bracket ['key'] resolves key", function (array $data) {
    expect(DotNotationParser::get($data, "store['name']"))->toBe('MyStore');
})->with('store_data');

test('double-quoted bracket ["key"] resolves key', function (array $data) {
    expect(DotNotationParser::get($data, 'store["name"]'))->toBe('MyStore');
})->with('store_data');

test('bracket notation with special characters', function () {
    $data = ['key-with-dash' => 42, 'key.with.dot' => 99];
    expect(DotNotationParser::get($data, "['key-with-dash']"))->toBe(42);
    expect(DotNotationParser::get($data, "['key.with.dot']"))->toBe(99);
});

// Multi-index [0,1,2]
test('multi-index returns elements at specified indices', function (array $data) {
    $result = DotNotationParser::get($data, 'store.books[0,2,4]');
    expect($result)->toBe([
        $data['store']['books'][0],
        $data['store']['books'][2],
        $data['store']['books'][4],
    ]);
})->with('store_data');

test('multi-index with chained path', function (array $data) {
    $result = DotNotationParser::get($data, 'store.books[0,1].title');
    expect($result)->toBe(['A', 'B']);
})->with('store_data');

test('multi-index handles out-of-bounds', function (array $data) {
    $result = DotNotationParser::get($data, 'store.books[0,99]');
    expect($result)->toBe([$data['store']['books'][0], null]);
})->with('store_data');

// Multi-key ["name","age"]
test("multi-key picks named keys from object", function (array $data) {
    $result = DotNotationParser::get($data, "store.meta['open','rating']");
    expect($result)->toBe([true, 4.5]);
})->with('store_data');

// Slice [start:end:step]
test('[0:3] returns first 3 elements', function (array $data) {
    $result = DotNotationParser::get($data, 'store.books[0:3]');
    expect($result)->toBe(array_slice($data['store']['books'], 0, 3));
})->with('store_data');

test('[::2] returns every other element', function (array $data) {
    $books = $data['store']['books'];
    $result = DotNotationParser::get($data, 'store.books[::2]');
    expect($result)->toBe([$books[0], $books[2], $books[4]]);
})->with('store_data');

test('[1:4] returns elements 1-3', function (array $data) {
    $result = DotNotationParser::get($data, 'store.books[1:4]');
    expect($result)->toBe(array_slice($data['store']['books'], 1, 3));
})->with('store_data');

test('[1:10:2] returns every other starting at index 1', function (array $data) {
    $books = $data['store']['books'];
    $result = DotNotationParser::get($data, 'store.books[1:10:2]');
    expect($result)->toBe([$books[1], $books[3]]);
})->with('store_data');

test('[-2:] returns last 2 elements', function (array $data) {
    $books = $data['store']['books'];
    $result = DotNotationParser::get($data, 'store.books[-2:]');
    expect($result)->toBe([$books[3], $books[4]]);
})->with('store_data');

test('slice with chained path', function (array $data) {
    $result = DotNotationParser::get($data, 'store.books[0:2].title');
    expect($result)->toBe(['A', 'B']);
})->with('store_data');

// Filter functions
test('length(@.name) > N filters by string length', function (array $data) {
    $result = DotNotationParser::get($data, 'users[?length(@.name)>3].name');
    expect($result)->toBe(['Alice', 'Carol']);
})->with('store_data');

test('length(@.tags) > N filters by array length', function (array $data) {
    $result = DotNotationParser::get($data, 'store.books[?length(@.tags)>1].title');
    expect($result)->toBe(['B', 'C']);
})->with('store_data');

test("match(@.author, 'pattern') filters by regex", function (array $data) {
    $result = DotNotationParser::get($data, "store.books[?match(@.author,'A.*')].title");
    expect($result)->toBe(['A']);
})->with('store_data');

test('keys(@) > N filters by key count', function () {
    $items = [
        'a' => ['x' => 1, 'y' => 2, 'z' => 3],
        'b' => ['x' => 1],
        'c' => ['x' => 1, 'y' => 2, 'z' => 3, 'w' => 4],
    ];
    $result = DotNotationParser::get($items, '[?keys(@)>2]');
    expect($result)->toBe([
        ['x' => 1, 'y' => 2, 'z' => 3],
        ['x' => 1, 'y' => 2, 'z' => 3, 'w' => 4],
    ]);
});

test('filter functions with && logical', function (array $data) {
    $result = DotNotationParser::get($data, 'store.books[?length(@.title)==1 && price>15].title');
    expect($result)->toBe(['B', 'C', 'D', 'E']);
})->with('store_data');

// Combined features
test('$ + bracket + filter', function (array $data) {
    $result = DotNotationParser::get($data, '$.store.books[?price>25].title');
    expect($result)->toBe(['C', 'D', 'E']);
})->with('store_data');

test('$ + slice + chained path', function (array $data) {
    $result = DotNotationParser::get($data, '$.store.books[0:2].author');
    expect($result)->toBe(['Ana', 'Bob']);
})->with('store_data');

test('descent still works with new features', function (array $data) {
    $result = DotNotationParser::get($data, '..title');
    expect($result)->toBe(['A', 'B', 'C', 'D', 'E']);
})->with('store_data');

test('existing filter syntax still works', function (array $data) {
    $result = DotNotationParser::get($data, 'store.books[?price>=30].title');
    expect($result)->toBe(['C', 'D', 'E']);
})->with('store_data');
