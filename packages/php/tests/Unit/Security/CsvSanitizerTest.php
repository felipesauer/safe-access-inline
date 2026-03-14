<?php

use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\Security\CsvSanitizer;

describe(CsvSanitizer::class, function () {

    describe('sanitizeCell', function () {
        it('returns cell unchanged in none mode', function () {
            expect(CsvSanitizer::sanitizeCell('=SUM(A1)', 'none'))->toBe('=SUM(A1)');
        });

        it('returns safe cell unchanged in any mode', function () {
            expect(CsvSanitizer::sanitizeCell('hello', 'prefix'))->toBe('hello');
            expect(CsvSanitizer::sanitizeCell('hello', 'strip'))->toBe('hello');
            expect(CsvSanitizer::sanitizeCell('hello', 'error'))->toBe('hello');
        });

        it('prefixes dangerous cells in prefix mode', function () {
            expect(CsvSanitizer::sanitizeCell('=SUM(A1)', 'prefix'))->toBe("'=SUM(A1)");
            expect(CsvSanitizer::sanitizeCell('+cmd', 'prefix'))->toBe("'+cmd");
            expect(CsvSanitizer::sanitizeCell('-cmd', 'prefix'))->toBe("'-cmd");
            expect(CsvSanitizer::sanitizeCell('@import', 'prefix'))->toBe("'@import");
        });

        it('strips dangerous prefixes in strip mode', function () {
            expect(CsvSanitizer::sanitizeCell('=SUM(A1)', 'strip'))->toBe('SUM(A1)');
            expect(CsvSanitizer::sanitizeCell('++cmd', 'strip'))->toBe('cmd');
        });

        it('throws in error mode for dangerous cells', function () {
            expect(fn () => CsvSanitizer::sanitizeCell('=SUM(A1)', 'error'))
                ->toThrow(SecurityException::class, "dangerous character: '='");
        });

        it('handles tab and carriage return prefixes', function () {
            expect(CsvSanitizer::sanitizeCell("\tcmd", 'prefix'))->toBe("'\tcmd");
            expect(CsvSanitizer::sanitizeCell("\rcmd", 'prefix'))->toBe("'\rcmd");
        });

        it('defaults to none mode', function () {
            expect(CsvSanitizer::sanitizeCell('=SUM(A1)'))->toBe('=SUM(A1)');
        });
    });

    describe('sanitizeRow', function () {
        it('sanitizes all cells in a row', function () {
            $row = ['=SUM(A1)', 'safe', '+cmd'];
            expect(CsvSanitizer::sanitizeRow($row, 'prefix'))->toBe(["'=SUM(A1)", 'safe', "'+cmd"]);
        });

        it('returns row unchanged in none mode', function () {
            $row = ['=SUM(A1)', '+cmd'];
            expect(CsvSanitizer::sanitizeRow($row, 'none'))->toBe(['=SUM(A1)', '+cmd']);
        });

        it('defaults to none mode', function () {
            $row = ['=SUM(A1)'];
            expect(CsvSanitizer::sanitizeRow($row))->toBe(['=SUM(A1)']);
        });
    });
});
