import { describe, it, expect } from 'vitest';
import { RuleTester } from 'eslint';
import rule from '../tools/eslint-rules/no-tax-content-in-code.js';

const tester = new RuleTester({ parserOptions: { ecmaVersion: 2022, sourceType: 'module' } });

describe('no-tax-content-in-code', () => {
  it('catches a hardcoded tax threshold and allows index literals', () => {
    tester.run('no-tax-content-in-code', rule as any, {
      valid: [
        { code: 'const i = 0; const j = arr[1];' },
        { code: 'const cap = loadFromPack("section_224.cap");' },
      ],
      invalid: [
        {
          code: 'const STD_DEDUCTION_2025 = 15750;',
          errors: [{ messageId: 'taxLiteral' }],
        },
        {
          code: 'if (magi > 150000) doThing();',
          errors: [{ messageId: 'taxLiteral' }],
        },
      ],
    });
    expect(true).toBe(true);
  });
});
