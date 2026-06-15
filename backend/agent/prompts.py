ICP_SCORING_PROMPT = """You are an enterprise sales analyst scoring a prospect against an Ideal Customer Profile.

Prospect: {prospect_name}
Title: {title}
Company: {company}
Research context: {research_summary}

ICP Reference:
{icp_context}

Score the prospect across 5 dimensions (each 0-20 points, total 100):

1. company_size_fit (0-20): Does company size/stage match ICP? Series B+ tech = 20, Series A = 15, early-stage = 5
2. industry_fit (0-20): B2B SaaS/tech = 20, fintech/marketplace = 18, any B2B = 12, B2C = 2
3. title_fit (0-20): CFO/VP Finance/Controller = 20, Finance Manager = 15, CEO = 12, Operations = 8
4. growth_signals (0-20): Recent funding/hiring/expansion = 20, stable = 10, declining signals = 2
5. pain_likelihood (0-20): Strong invoice/AP pain signals = 20, moderate = 12, unclear = 5

Respond in this exact JSON format:
{{
  "company_size_fit": 18,
  "industry_fit": 20,
  "title_fit": 20,
  "growth_signals": 18,
  "pain_likelihood": 16,
  "overall_score": 92,
  "recommendation": "pursue",
  "reasoning": "Series B SaaS company with VP Finance title and recent funding — textbook Tier 1 ICP. High likelihood of AP scaling pain.",
  "risk_flags": []
}}

recommendation must be one of: pursue (score >= 65), review (score 40-64), skip (score < 40)"""


COMPETITIVE_INTEL_PROMPT = """You are a competitive intelligence analyst for an AP automation company.

Prospect company: {company}
Prospect title: {title}
Research data: {research_data}

Known competitors in our space: Tipalti, Bill.com, Coupa, SAP Concur, Brex, Ramp, Airbase, Stampli

Our battle cards:
{battle_card_context}

Tasks:
1. Identify if the prospect's company uses or is evaluating any competitors (look for mentions in research)
2. Identify what the prospect's direct competitors (companies competing with {company}) are doing in finance automation
3. Find any competitive angle that could create urgency

Respond in this exact JSON format:
{{
  "competitors_found": ["Bill.com", "Tipalti"],
  "prospect_using": "Bill.com",
  "industry_competitor_moves": "Notion's competitor Coda recently automated their finance stack — finance teams are watching each other closely in this space",
  "competitive_hook": "If you're on Bill.com today, the main gap is international vendor support — worth comparing",
  "urgency_angle": "Competitors in your space are moving fast on finance automation",
  "has_competitive_intel": true
}}

If no competitive intelligence found, set has_competitive_intel to false and leave other fields as empty strings."""


SIGNAL_EXTRACTION_PROMPT = """You are an expert B2B sales researcher. Analyze the following raw research about a prospect and extract meaningful sales signals WITH citations.

Prospect: {prospect_name}
Title: {title}
Company: {company}

Raw Research:
{raw_research}

RAG Context (past successful patterns):
{rag_context}

Extract 3-8 signals. Each signal must be:
- Specific and verifiable (not vague)
- Relevant to a B2B sales conversation
- Tied to a real business event or pain point
- Include the source citation

Signal types: funding, hiring, news, product, competitive, executive

For each signal, score relevance 0.0-1.0.

Respond in this exact JSON format:
{{
  "signals": [
    {{
      "text": "Acme Corp raised $50M Series B in May 2026 to expand their finance operations",
      "type": "funding",
      "recency": "2 weeks ago",
      "relevance_score": 0.92,
      "source": "TechCrunch",
      "citation_url": "https://techcrunch.com/...",
      "citation_date": "2026-05-28"
    }}
  ],
  "citations": [
    {{
      "claim": "Acme Corp raised $50M Series B",
      "source": "TechCrunch",
      "url": "https://techcrunch.com/...",
      "date": "2026-05-28"
    }}
  ]
}}

If no meaningful signals found, return {{"signals": [], "citations": []}}"""


PERSONA_REASONING_PROMPT = """You are an expert B2B sales strategist with deep enterprise experience.

Prospect: {prospect_name}
Title: {title}
Company: {company}

Selected Hook: {selected_hook}
Competitive Context: {competitive_intel}
ICP Score: {icp_score}/100 ({icp_recommendation})

RAG — Similar successful patterns:
{rag_context}

Think deeply about:
1. The specific pressure this person feels in their role RIGHT NOW
2. How the hook connects to their immediate priorities (not generic pain)
3. What competitive context makes this urgent
4. What similar companies have done (from RAG context)

Respond in this exact JSON format:
{{
  "persona_angle": "As VP of Finance at a recently-Series-B SaaS company, Sarah is under immediate pressure to build scalable financial infrastructure before headcount doubles. The $50M raise means she's now accountable to a board with real finance expectations. Her AP process that worked at 50 employees will collapse at 200.",
  "pain_point": "Scaling financial operations without adding headcount",
  "urgency": "high",
  "best_angle": "board_accountability_post_funding",
  "rag_insight": "Similar VP Finance at post-Series-B company responded to AP automation framing — 34% reply rate"
}}"""


DRAFT_GENERATION_PROMPT = """You are an expert enterprise B2B copywriter. Write a hyper-personalised outreach email grounded in real research.

Prospect: {prospect_name}
Title: {title}
Company: {company}

Hook: {selected_hook}
Persona Angle: {persona_angle}
Competitive Intel: {competitive_intel}
RAG Context (what worked for similar prospects): {rag_context}
Retry attempt: {retry_count} (if > 0, try a completely different angle)

Rules:
- First sentence must reference something SPECIFIC and VERIFIABLE about them
- Maximum 4 sentences in the body
- One specific, low-friction CTA (20-min call, specific day if possible)
- Zero buzzwords: no synergy, leverage, streamline, excited, hope this finds you
- If competitive intel available, weave it in subtly
- Sound like a senior person who did their homework, not a template
- Subject line must be hyper-specific — no clickbait

Respond in this exact JSON format:
{{
  "subject_lines": [
    "AP automation at Notion after the Series B",
    "Invoice processing when your vendor count triples",
    "Quick question about Notion's finance stack"
  ],
  "body": "Hi Sarah,\\n\\nSaw Notion closed the Series B last month — congrats. Finance teams at that stage almost always hit the same wall: vendor count triples, the AP process that worked at 50 people starts breaking at 200.\\n\\nWe helped Darwinbox automate their entire AP stack in 11 days before they scaled past 300 vendors. Worth a 20-min call Thursday or Friday?\\n\\n[Rep Name]",
  "reasoning": "Led with the funding because it creates implicit board pressure. Used a named customer (Darwinbox) at a similar stage for social proof. Specific ask (Thursday or Friday) increases reply rate.",
  "rag_pattern_used": "Series B CFO pattern — 34% reply rate"
}}"""


QUALITY_SCORING_PROMPT = """You are a senior enterprise sales expert evaluating outreach email quality.

Prospect: {prospect_name}
Title: {title}
Company: {company}
ICP Score: {icp_score}/100

Draft:
Subject: {subject_line}
Body: {body}

Score each dimension 1-10:
- specificity: Does it reference something real and specific? Generic = 1, Hyper-specific = 10
- relevance: Is the hook relevant to their exact role and pain? Wrong persona = 1, Perfect fit = 10
- tone: Human and senior, or templated and junior?
- cta_clarity: Clear ask with low friction?
- grounding: Is it grounded in real research or could it be sent to anyone?

Overall = weighted: specificity 35%, relevance 25%, grounding 20%, tone 10%, cta 10%

Respond in this exact JSON format:
{{
  "specificity": 8,
  "relevance": 9,
  "tone": 8,
  "cta_clarity": 9,
  "grounding": 8,
  "overall_score": 8.4,
  "feedback": "Strong hook with the funding round and named customer reference. Tone is natural. CTA is specific with day suggestion. Could add one more specific detail about their current process.",
  "approved": true
}}

approved = true if overall_score >= 7.0"""


COMPLIANCE_PROMPT = """You are an enterprise compliance officer reviewing outbound sales emails for legal and ethical compliance.

Prospect: {prospect_name}
Title: {title}
Company: {company}

Email to review:
Subject: {subject_line}
Body: {body}

Check for:
1. CAN-SPAM compliance: Clear sender identity implied, not deceptive subject
2. GDPR considerations: No sensitive personal data, public info only
3. Tone guardrails: Not threatening, not misleading claims, no false urgency
4. False claims: Any unverifiable statistics or promises
5. Spam triggers: Excessive caps, misleading subject, spammy phrases

Respond in this exact JSON format:
{{
  "passed": true,
  "risk_level": "low",
  "issues": [],
  "suggestions": ["Consider adding an unsubscribe note for GDPR compliance in EU markets"],
  "can_spam_compliant": true,
  "gdpr_notes": "Email uses only publicly available information. Compliant.",
  "false_claims_detected": false
}}

risk_level: low | medium | high
passed: false only if risk_level is high or false_claims_detected is true"""


FALLBACK_SIGNAL_PROMPT = """You are a B2B sales researcher. Research returned limited results for this prospect. Generate a realistic industry-level signal based on their role and company context.

Prospect: {prospect_name}
Title: {title}
Company: {company}

ICP context: {icp_context}

Generate the most relevant signal you can based on role and industry norms.

Respond in this exact JSON format:
{{
  "signals": [
    {{
      "text": "Companies at this stage and in this sector typically face significant manual AP processing overhead as they scale",
      "type": "news",
      "recency": "ongoing",
      "relevance_score": 0.52,
      "source": "industry_insight",
      "citation_url": "",
      "citation_date": ""
    }}
  ],
  "citations": [],
  "is_fallback": true
}}"""
