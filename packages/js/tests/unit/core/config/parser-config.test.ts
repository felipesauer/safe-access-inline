import { describe, it, expect } from 'vitest';
import { DEFAULT_PARSER_CONFIG } from '../../../../src/core/config/parser-config';

describe('DEFAULT_PARSER_CONFIG', () => {
    it('has the expected default maxResolveDepth', () => {
        expect(DEFAULT_PARSER_CONFIG.maxResolveDepth).toBe(512);
    });
});
