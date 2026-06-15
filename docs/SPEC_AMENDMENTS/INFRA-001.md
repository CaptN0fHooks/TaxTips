# SPEC.md Amendment INFRA-001
**Status:** Pending ratification  
**Filed:** 2026-06-15  
**Filed by:** Engineering Lead  
**Reviewers:** CTO + CISO + VP Engineering  

## Summary
Substitute AWS-native stack (SPEC.md §3.2) with Vercel + Supabase + Cloudflare.

## Changes to SPEC.md
- §3.2: Replace ECS Fargate → Vercel serverless/edge
- §3.2: Replace RDS → Supabase Postgres (native RLS)
- §3.2: Replace S3/CloudFront/WAF → Cloudflare R2/CDN/WAF
- §3.2: Replace Cognito → Supabase Auth

## Justification
Zero-cost operation requirement. Approved substitution covers ~85% of
SPEC.md infrastructure cleanly. Remaining gaps closed by INFRA-002.

## Most-Defensible Interpretation While Pending
Proceed with Vercel + Supabase + Cloudflare as specified above.
