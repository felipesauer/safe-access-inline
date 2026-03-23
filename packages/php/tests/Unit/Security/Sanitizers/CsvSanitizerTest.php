<?php

declare(strict_types=1);

use SafeAccessInline\Exceptions\SecurityException;
use SafeAccessInline\Security\Sanitizers\CsvSanitizer;

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

        it('handles newline prefix in prefix mode', function () {
            expect(CsvSanitizer::sanitizeCell("\ncmd", 'prefix'))->toBe("'\ncmd");
        });

        it('strips newline prefix in strip mode', function () {
            expect(CsvSanitizer::sanitizeCell("\ncmd", 'strip'))->toBe('cmd');
        });

        it('throws on newline prefix in error mode', function () {
            expect(fn () => CsvSanitizer::sanitizeCell("\ncmd", 'error'))
                ->toThrow(SecurityException::class);
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

    describe('sanitizeHeaders', function () {
        it('sanitizes all headers in strip mode', function () {
            $headers = ['Name', '=SUM(A1)', '+cmd'];
            expect(CsvSanitizer::sanitizeHeaders($headers, 'strip'))->toBe(['Name', 'SUM(A1)', 'cmd']);
        });

        it('sanitizes all headers in prefix mode', function () {
            $headers = ['Name', '=Formula'];
            expect(CsvSanitizer::sanitizeHeaders($headers, 'prefix'))->toBe(['Name', "'=Formula"]);
        });

        it('returns headers unchanged in none mode', function () {
            $headers = ['=SUM(A1)', 'safe', '+cmd'];
            expect(CsvSanitizer::sanitizeHeaders($headers, 'none'))->toBe(['=SUM(A1)', 'safe', '+cmd']);
        });

        it('defaults to none mode', function () {
            $headers = ['=SUM(A1)'];
            expect(CsvSanitizer::sanitizeHeaders($headers))->toBe(['=SUM(A1)']);
        });

        it('returns empty array for empty input', function () {
            expect(CsvSanitizer::sanitizeHeaders([]))->toBe([]);
        });

        it('is functionally equivalent to JS sanitizeCsvHeaders (strip mode)', function () {
            $headers = ['Name', '=INJECT()', '@scope', '+plus'];
            $result = CsvSanitizer::sanitizeHeaders($headers, 'strip');
            expect($result)->toBe(['Name', 'INJECT()', 'scope', 'plus']);
        });
    });
});
