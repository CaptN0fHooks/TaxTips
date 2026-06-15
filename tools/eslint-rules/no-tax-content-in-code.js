/**
 * no-tax-content-in-code
 * SPEC.md §2 Principle 1: tax law is data, not code.
 * Flags "tax-shaped" numeric literals in .ts/.js so brackets, thresholds,
 * caps, and rates cannot be hardcoded. Tax values live ONLY in rule-pack YAML.
 */
'use strict';

// Small set of structurally-allowed numbers (indices, flags, common non-tax constants).
const ALLOWED = new Set([0, 1, 2, -1, 100, 200, 400, 404, 500]);

module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow tax-content numeric literals in code (SPEC.md §2 P1).' },
    schema: [],
    messages: {
      taxLiteral:
        "Numeric literal {{value}} in code. Tax values must live in rule-pack YAML with a CTR citation (SPEC.md §2 Principle 1), not in code.",
    },
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value !== 'number') return;
        if (Number.isInteger(node.value) && ALLOWED.has(node.value)) return;
        // Allow tiny integers used as array/loop indices (0–9) only if integer & small.
        if (Number.isInteger(node.value) && node.value >= 0 && node.value <= 9) return;
        context.report({ node, messageId: 'taxLiteral', data: { value: node.value } });
      },
    };
  },
};
