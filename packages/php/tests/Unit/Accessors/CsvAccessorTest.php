<?php

declare(strict_types=1);

use SafeAccessInline\Accessors\CsvAccessor;
use SafeAccessInline\Enums\AuditEventType;
use SafeAccessInline\Exceptions\InvalidFormatException;
use SafeAccessInline\Security\Audit\AuditLogger;

describe(CsvAccessor::class, function () {

    beforeEach(function () {
        AuditLogger::clearListeners();
    });

    it('from — valid CSV', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30\nBob,25");
        expect($accessor)->toBeInstanceOf(CsvAccessor::class);
    });

    it('from — invalid type throws', function () {
        CsvAccessor::from(123);
    })->throws(InvalidFormatException::class);

    it('get — row by index', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30\nBob,25");
        expect($accessor->get('0.name'))->toBe('Ana');
        expect($accessor->get('0.age'))->toBe('30');
        expect($accessor->get('1.name'))->toBe('Bob');
    });

    it('get — wildcard', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30\nBob,25");
        expect($accessor->get('*.name'))->toBe(['Ana', 'Bob']);
    });

    it('get — nonexistent returns default', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30");
        expect($accessor->get('5.name', 'default'))->toBe('default');
    });

    it('has — existing', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30");
        expect($accessor->has('0.name'))->toBeTrue();
    });

    it('has — nonexistent', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30");
        expect($accessor->has('5.name'))->toBeFalse();
    });

    it('count — rows', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30\nBob,25\nCarlos,35");
        expect($accessor->count())->toBe(3);
    });

    it('toArray', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30");
        expect($accessor->toArray())->toBe([['name' => 'Ana', 'age' => '30']]);
    });

    it('toJson', function () {
        $accessor = CsvAccessor::from("name,age\nAna,30");
        $decoded = json_decode($accessor->toJson(), true);
        expect($decoded[0]['name'])->toBe('Ana');
    });

    it('empty CSV', function () {
        $accessor = CsvAccessor::from("");
        expect($accessor->all())->toBe([]);
    });

    it('toCsv serializes back to CSV', function () {
        $csv = "name,age\nAna,30\nBob,25";
        $accessor = CsvAccessor::from($csv);
        $output = $accessor->toCsv();
        expect($output)->toBe("name,age\nAna,30\nBob,25");
    });

    it('toCsv handles empty data', function () {
        $accessor = CsvAccessor::from("");
        expect($accessor->toCsv())->toBe('');
    });

    it('toCsv escapes commas and quotes', function () {
        $csv = "name,city\n\"Ana, Maria\",\"Porto \"\"Alegre\"\"\"";
        $accessor = CsvAccessor::from($csv);
        $output = $accessor->toCsv();
        expect($output)->toContain('"Ana, Maria"');
        expect($output)->toContain('"Porto ""Alegre"""');
    });

    it('toCsv respects csvMode parameter', function () {
        $csv = "name,formula\nAna,=SUM(A1)";
        $accessor = CsvAccessor::from($csv);
        $output = $accessor->toCsv('strip');
        expect($output)->not->toContain('=SUM');
    });

    it('emits audit event when a CSV row has a column-count mismatch', function () {
        $events = [];
        AuditLogger::onAudit(function (array $event) use (&$events): void {
            $events[] = $event;
        });

        $accessor = CsvAccessor::from("name,age\nAna,30\nBob");

        expect($accessor->toArray())->toBe([['name' => 'Ana', 'age' => '30']]);
        expect($events)->toHaveCount(1);
        expect($events[0]['type'])->toBe(AuditEventType::DATA_FORMAT_WARNING->value);
        expect($events[0]['detail'])->toBe([
            'reason' => 'csv_column_mismatch',
            'expected' => 2,
            'actual' => 1,
            'line' => 3,
        ]);
    });

    // ── S7: Header sanitization ──────────────────────

    it('strips injection payload from header names when global policy csvMode is strip (S7)', function () {
        \SafeAccessInline\Security\Guards\SecurityPolicy::setGlobal(
            new \SafeAccessInline\Security\Guards\SecurityPolicy(csvMode: 'strip'),
        );

        try {
            $accessor = CsvAccessor::from("=CMD,age\nAna,30");
            // The header "=CMD" should be stripped to "CMD"
            expect($accessor->get('0.CMD'))->toBe('Ana');
        } finally {
            \SafeAccessInline\Security\Guards\SecurityPolicy::clearGlobal();
        }
    });

    it('prefixes injection payload in header names when global policy csvMode is prefix (S7)', function () {
        \SafeAccessInline\Security\Guards\SecurityPolicy::setGlobal(
            new \SafeAccessInline\Security\Guards\SecurityPolicy(csvMode: 'prefix'),
        );

        try {
            $accessor = CsvAccessor::from("=CMD,age\nAna,30");
            // The header "=CMD" should be prefixed to "'=CMD"
            expect($accessor->get("0.'=CMD"))->toBe('Ana');
        } finally {
            \SafeAccessInline\Security\Guards\SecurityPolicy::clearGlobal();
        }
    });

    it('keeps headers intact when global policy csvMode is none (S7)', function () {
        // With mode 'none' (default) normal headers pass through unchanged
        $accessor = CsvAccessor::from("name,age\nAna,30");
        expect($accessor->get('0.name'))->toBe('Ana');
    });

});
