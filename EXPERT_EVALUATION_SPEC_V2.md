# ClearView News: Dynamic Expert Assembly System (v2)

## Vision

A system that can evaluate claims on **any topic** by:
1. Dynamically identifying what types of experts are needed for THIS specific topic
2. Spinning up parallel expert research agents
3. Each expert deeply researches from their disciplinary lens
4. Synthesizing findings to determine consensus or disagreement
5. Honestly reporting ground truth, contested areas, or unknowns

**Key Insight**: Instead of pre-defining domains, we **ask the LLM to assemble the right research team** for each article. This makes the system infinitely flexible.

---

## Part 1: Problem Statement

### Current System Flaws

1. **Circular Expert Citation**: Cites article subjects (politicians, CEOs) as "experts" when fact-checking their own claims
2. **Shallow Source Quality**: Finds news articles and government reports rather than peer-reviewed research
3. **No Claim Decomposition**: Analyzes articles holistically rather than extracting and verifying individual claims
4. **No Source Hierarchy**: Treats a politician's statement equally to a peer-reviewed meta-analysis
5. **No Expert Verification**: Doesn't validate that cited "experts" have relevant credentials
6. **Static Domain Routing**: Pre-defined domains can't handle cross-disciplinary or novel topics
7. **No Epistemic Honesty**: Doesn't distinguish "we know X" from "experts disagree" from "we can't know"

---

## Part 2: Dynamic Expert Assembly Architecture

### Core Innovation

Instead of routing to pre-defined domains, we:
1. **Ask**: "What types of experts would study this?"
2. **Spin up**: Parallel research agents for each expert type
3. **Search**: Each agent does deep domain-specific research
4. **Synthesize**: Aggregate findings into consensus assessment

### System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        ARTICLE INPUT                             │
│  "Slate: Gavin Newsom and California's Death Penalty"           │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                 STEP 1: CLAIM EXTRACTION                         │
│                                                                  │
│  Extract discrete, verifiable claims:                            │
│  • "Death penalty doesn't deter crime"                          │
│  • "California has spent $4B+ on death penalty"                 │
│  • "Homicide rates are at historic lows"                        │
│                                                                  │
│  Flag: Gavin Newsom = ARTICLE SUBJECT (exclude from experts)    │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│             STEP 2: DYNAMIC EXPERT IDENTIFICATION                │
│                                                                  │
│  Prompt: "What 3-5 types of domain experts would rigorously     │
│  evaluate these claims? Return JSON with search guidance."       │
│                                                                  │
│  Output:                                                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. Criminologist (deterrence research)                      ││
│  │ 2. Economist (criminal justice costs)                       ││
│  │ 3. Legal scholar (wrongful convictions)                     ││
│  │ 4. Statistician (study methodology critique)                ││
│  │ 5. Public policy researcher (comparative state analysis)    ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│           STEP 3: PARALLEL EXPERT RESEARCH AGENTS                │
│                                                                  │
│  Spin up agents IN PARALLEL (Promise.all):                       │
│                                                                  │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│  │Criminolog.│ │ Economist │ │Legal Schol│ │Statisticn │  ...  │
│  │  Agent    │ │   Agent   │ │   Agent   │ │   Agent   │       │
│  └─────┬─────┘ └─────┬─────┘ └─────┬─────┘ └─────┬─────┘       │
│        │             │             │             │               │
│        ↓             ↓             ↓             ↓               │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐        │
│   │Exa/S2   │   │Exa/NBER │   │Exa/Law  │   │Exa/Stats│        │
│   │Search   │   │Search   │   │Review   │   │Methods  │        │
│   └─────────┘   └─────────┘   └─────────┘   └─────────┘        │
│        │             │             │             │               │
│        ↓             ↓             ↓             ↓               │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐        │
│   │Findings │   │Findings │   │Findings │   │Findings │        │
│   │+Sources │   │+Sources │   │+Sources │   │+Sources │        │
│   │+Verdict │   │+Verdict │   │+Verdict │   │+Verdict │        │
│   └─────────┘   └─────────┘   └─────────┘   └─────────┘        │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│              STEP 4: SYNTHESIS + CONSENSUS                       │
│                                                                  │
│  Aggregate expert findings:                                      │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ CLAIM: "Death penalty doesn't deter crime"                  ││
│  │                                                              ││
│  │ Criminologist: "NRC 2012 says studies uninformative"  [?]   ││
│  │ Economist: "No economic model shows deterrence"       [?]   ││
│  │ Statistician: "Pro-deterrence studies have fatal flaws" [?] ││
│  │                                                              ││
│  │ CONSENSUS: research_inconclusive (per NRC)                  ││
│  │ All experts agree existing research can't answer this       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ CLAIM: "California spent $4B+ more on death penalty"        ││
│  │                                                              ││
│  │ Economist: "Alarcon & Mitchell study confirms"        [✓]   ││
│  │ Policy researcher: "Every state study agrees"         [✓]   ││
│  │                                                              ││
│  │ CONSENSUS: strong_consensus (supported)                     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                    STEP 5: HONEST OUTPUT                         │
│                                                                  │
│  What Research Shows:                                            │
│                                                                  │
│  📊 Deterrence Effect: INCONCLUSIVE                             │
│  The National Research Council (2012) concluded existing         │
│  studies cannot determine whether the death penalty affects      │
│  homicide rates. The research is fundamentally flawed.          │
│                                                                  │
│  ✓ Cost Comparison: SUPPORTED (High Confidence)                 │
│  Every fiscal study since 1976 finds capital punishment          │
│  costs significantly more than life without parole.              │
│                                                                  │
│  Expert Panel:                                                   │
│  • Daniel Nagin, Criminologist, Carnegie Mellon                 │
│  • Jeffrey Fagan, Legal Scholar, Columbia Law                   │
│  • John Donohue, Economist, Stanford Law                        │
│                                                                  │
│  ⚠️ Note: Governor Newsom's claims are the SUBJECT of this     │
│  evaluation and are not used as evidence.                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Implementation Details

### 3.1 Step 1: Claim Extraction

```typescript
interface ExtractedClaim {
  id: string;
  text: string;
  type: ClaimType;
  isVerifiable: boolean;
  source: {
    name: string;
    role: 'article_subject' | 'cited_expert' | 'author' | 'unknown';
    isExcludedFromExperts: boolean;
    exclusionReason?: string;
  };
}

type ClaimType =
  // Verifiable
  | 'empirical'      // "Studies show X"
  | 'causal'         // "X causes Y"
  | 'statistical'    // "X% of Y"
  | 'historical'     // "X happened"
  // Partially verifiable
  | 'predictive'     // "X will cause Y"
  | 'effectiveness'  // "Policy X works"
  // Not verifiable
  | 'values'         // "We should X"
  | 'aesthetic';     // "X is better"

const CLAIM_EXTRACTION_PROMPT = `
Extract discrete factual claims from this article.

ARTICLE:
Title: {title}
Source: {source}
Content: {content}

INSTRUCTIONS:

1. Identify the ARTICLE SUBJECT(S) - the person(s) whose claims are being
   examined or who the article is about. These people are EXCLUDED from
   being cited as experts.

2. Extract each discrete CLAIM (not opinions or rhetoric):
   - What exactly is being claimed?
   - Who made this claim?
   - Is it verifiable through research?
   - What type of claim is it?

3. For each claim, determine if it's:
   - VERIFIABLE: Can be checked against research/data
   - PARTIALLY VERIFIABLE: Some components can be checked
   - VALUES QUESTION: Cannot be empirically resolved

OUTPUT:
{
  "articleSubjects": [
    {
      "name": "Gavin Newsom",
      "role": "Governor whose claims are being examined",
      "isExcludedFromExperts": true,
      "exclusionReason": "Article subject - claims are the object of evaluation"
    }
  ],
  "claims": [
    {
      "id": "claim_1",
      "text": "The death penalty does not deter crime",
      "type": "causal",
      "isVerifiable": true,
      "source": {
        "name": "Gavin Newsom",
        "role": "article_subject"
      }
    },
    {
      "id": "claim_2",
      "text": "California has spent more than $4 billion on the death penalty since 1978",
      "type": "statistical",
      "isVerifiable": true,
      "source": {
        "name": "article author (citing research)",
        "role": "author"
      }
    }
  ]
}

CRITICAL RULES:
- Politicians are CLAIMANTS, not experts
- Article subjects are NEVER experts for their own claims
- "Should" statements are VALUES claims (not verifiable)
- Be specific - extract the exact claim, not paraphrases
`;
```

### 3.2 Step 2: Dynamic Expert Identification

```typescript
interface ExpertType {
  type: string;           // "criminologist specializing in deterrence"
  searchFocus: string;    // "death penalty deterrence studies, NRC reports"
  keyDatabases: string[]; // ["Google Scholar", "NCJRS"]
  lookFor: string;        // "meta-analyses, systematic reviews"
  whyNeeded: string;      // "To evaluate causal claims about deterrence"
}

interface ExpertTeam {
  experts: ExpertType[];
  articleSubjectsToExclude: string[];
}

const EXPERT_IDENTIFICATION_PROMPT = `
You are assembling a research team to fact-check claims in a news article.

ARTICLE TITLE: {title}
ARTICLE SUBJECT(S) TO EXCLUDE: {articleSubjects}

CLAIMS TO EVALUATE:
{claims}

TASK: Identify 3-5 types of domain experts who would be needed to
rigorously evaluate these claims from different disciplinary angles.

For each expert type, specify:
1. What kind of expert (be specific about sub-specialty)
2. What they should search for
3. Which databases/sources are most relevant to their field
4. What types of evidence they should prioritize
5. Why this expert perspective is needed

THINK ABOUT:
- Who studies this topic EMPIRICALLY?
- Who would critique the METHODOLOGY of existing studies?
- Who understands the POLICY/LEGAL context?
- Who might have a DIFFERENT DISCIPLINARY LENS?
- Is there a STATISTICIAN needed to evaluate study quality?

OUTPUT FORMAT:
{
  "experts": [
    {
      "type": "criminologist specializing in deterrence research",
      "searchFocus": "death penalty deterrence effect, capital punishment homicide rates, NRC deterrence report",
      "keyDatabases": ["Google Scholar", "Semantic Scholar", "NCJRS", "Criminology journals"],
      "lookFor": "NRC/National Academy reports, meta-analyses, Donohue & Wolfers, Nagin papers, systematic reviews",
      "whyNeeded": "To evaluate the causal claim that death penalty does/doesn't deter crime"
    },
    {
      "type": "economist studying criminal justice fiscal policy",
      "searchFocus": "death penalty cost analysis, capital punishment vs LWOP costs, state fiscal studies",
      "keyDatabases": ["NBER", "SSRN", "Google Scholar", "State government reports"],
      "lookFor": "Cost-benefit analyses, Alarcon & Mitchell California study, comparative state analyses",
      "whyNeeded": "To verify the $4B+ cost claim and compare to alternatives"
    },
    {
      "type": "legal scholar on wrongful convictions and innocence",
      "searchFocus": "death row exonerations, false conviction rates, innocence project data",
      "keyDatabases": ["Google Scholar", "Law reviews", "SSRN", "National Registry of Exonerations"],
      "lookFor": "Gross et al PNAS study, exoneration statistics, causes of wrongful conviction",
      "whyNeeded": "To evaluate claims about executing innocent people"
    },
    {
      "type": "statistician/methodologist for study quality",
      "searchFocus": "death penalty study methodology critique, econometric issues deterrence",
      "keyDatabases": ["Google Scholar", "Statistics journals", "NRC methodology reports"],
      "lookFor": "NRC 2012 methodology critique, critiques of Ehrlich studies, panel data issues",
      "whyNeeded": "To assess whether existing studies are methodologically sound"
    }
  ],
  "articleSubjectsToExclude": ["Gavin Newsom"]
}

RULES:
- Choose experts who would have EMPIRICAL RESEARCH on this topic
- NOT politicians, advocates, or the article subjects
- Each expert should bring a DIFFERENT disciplinary lens
- Include at least one methodologist if claims cite studies
- Be specific about sub-specialty (not just "economist" but "trade economist" or "labor economist")
`;
```

### 3.3 Step 3: Expert Research Agent

```typescript
interface ExpertFindings {
  expertType: string;
  sources: ResearchSource[];
  assessment: ExpertAssessment;
}

interface ResearchSource {
  title: string;
  authors: string;
  publication: string;
  year: number;
  type: 'meta-analysis' | 'systematic-review' | 'RCT' | 'peer-reviewed' |
        'working-paper' | 'government-report' | 'expert-opinion';
  tier: 1 | 2 | 3 | 4;
  keyFinding: string;
  relevantQuote?: string;
  doi?: string;
  url: string;
  citationCount?: number;
  direction: 'supports' | 'refutes' | 'mixed' | 'neutral';
}

interface ExpertAssessment {
  claimAssessments: {
    claimId: string;
    verdict: 'supported' | 'refuted' | 'mixed' | 'insufficient_evidence' | 'inconclusive';
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    keyEvidence: string[];
  }[];
  overallAssessment: string;
  methodologicalConcerns: string[];
  limitations: string[];
}

const EXPERT_AGENT_PROMPT = `
You are a {expertType} conducting a rigorous literature review.

CLAIMS TO EVALUATE:
{claims}

ARTICLE SUBJECTS TO EXCLUDE AS SOURCES: {excludedSubjects}

YOUR RESEARCH TASK:

1. SEARCH for peer-reviewed research using these queries:
   Focus: {searchFocus}
   Databases: {keyDatabases}
   Prioritize: {lookFor}

2. For each RELEVANT SOURCE you find, extract:
   - Full citation (title, authors, publication, year)
   - Study type (meta-analysis, RCT, observational, etc.)
   - Key finding relevant to the claims
   - Direct quote if available
   - DOI and URL
   - Whether it supports or refutes each claim

3. ASSESS each claim from your expert perspective:
   - What does the evidence show?
   - How confident are you? (based on evidence quality)
   - What are the methodological concerns?
   - What limitations exist?

EVIDENCE TIER SYSTEM:
- Tier 1: Systematic reviews, meta-analyses, major reports (NRC, Cochrane)
- Tier 2: Peer-reviewed journal articles, RCTs
- Tier 3: Working papers (NBER, SSRN), government statistics
- Tier 4: Expert opinion, observational studies

OUTPUT FORMAT:
{
  "expertType": "{expertType}",

  "sources": [
    {
      "title": "Deterrence and the Death Penalty",
      "authors": "National Research Council",
      "publication": "National Academies Press",
      "year": 2012,
      "type": "systematic-review",
      "tier": 1,
      "keyFinding": "Existing studies are fundamentally flawed and cannot determine whether capital punishment affects homicide rates",
      "relevantQuote": "Research to date on the effect of capital punishment on homicide is not informative about whether capital punishment decreases, increases, or has no effect on homicide rates",
      "doi": "10.17226/13363",
      "url": "https://nap.nationalacademies.org/catalog/13363",
      "citationCount": 500,
      "direction": "neutral"  // Can't determine effect = neutral on the claim
    }
  ],

  "assessment": {
    "claimAssessments": [
      {
        "claimId": "claim_1",
        "claim": "Death penalty doesn't deter crime",
        "verdict": "inconclusive",
        "confidence": "high",
        "reasoning": "The NRC 2012 systematic review concluded that existing research cannot determine whether the death penalty affects homicide rates due to fundamental methodological flaws in all existing studies.",
        "keyEvidence": ["NRC 2012 report", "Donohue & Wolfers 2005"]
      }
    ],

    "overallAssessment": "From a criminological perspective, the deterrence question remains scientifically unresolved. The most authoritative review (NRC 2012) found that no existing study can reliably answer whether capital punishment deters crime.",

    "methodologicalConcerns": [
      "Studies don't account for non-capital punishments",
      "Implausible models of criminal decision-making",
      "Unverifiable statistical assumptions"
    ],

    "limitations": [
      "My search focused on deterrence; I did not deeply examine cost or innocence claims",
      "Most research is US-focused"
    ]
  }
}

CRITICAL RULES:
1. NEVER cite {excludedSubjects} as an expert source
2. ONLY cite sources you actually find in your search - never hallucinate
3. If you find little/no quality research, say so honestly
4. Prioritize meta-analyses and systematic reviews over individual studies
5. Note conflicts of interest or funding sources when relevant
6. Be honest about what the evidence DOES and DOESN'T show
`;
```

### 3.4 Step 4: Synthesis

```typescript
interface SynthesizedResult {
  claimResults: ClaimResult[];
  topSources: ResearchSource[];
  expertAgreement: {
    agreedOn: string[];
    disagreedOn: string[];
    uncertainAbout: string[];
  };
  bottomLine: string;
}

interface ClaimResult {
  claim: string;
  consensusLevel: ConsensusLevel;
  confidence: 'high' | 'medium' | 'low';
  summary: string;
  expertVerdicts: {
    expertType: string;
    verdict: string;
    keyEvidence: string[];
  }[];
  topEvidence: ResearchSource[];
  dissent?: string;
  caveats: string[];
}

type ConsensusLevel =
  | 'strong_consensus'        // >90% of quality research agrees
  | 'moderate_consensus'      // 70-90% agree, some debate
  | 'active_debate'           // Experts genuinely disagree
  | 'research_inconclusive'   // Studies exist but can't resolve question
  | 'insufficient_research'   // Not enough quality studies
  | 'values_question';        // Not empirically resolvable

const SYNTHESIS_PROMPT = `
You are synthesizing findings from a panel of expert researchers.

CLAIMS EVALUATED:
{claims}

ARTICLE SUBJECTS (excluded from expert citations):
{excludedSubjects}

EXPERT PANEL FINDINGS:

---
EXPERT 1: {expert1Type}
{expert1Findings}

---
EXPERT 2: {expert2Type}
{expert2Findings}

---
EXPERT 3: {expert3Type}
{expert3Findings}

---
[Additional experts...]

YOUR TASK: Synthesize these findings into a coherent assessment.

FOR EACH CLAIM, DETERMINE:

1. CONSENSUS LEVEL:
   - strong_consensus: All/nearly all experts agree, robust evidence
   - moderate_consensus: Most agree, some minor debate
   - active_debate: Experts genuinely disagree (present both sides)
   - research_inconclusive: Studies exist but can't answer the question
   - insufficient_research: Not enough quality studies
   - values_question: Not an empirical question

2. WHERE EXPERTS AGREE:
   - What findings are consistent across experts?
   - What sources do multiple experts cite?

3. WHERE EXPERTS DISAGREE:
   - What are the points of contention?
   - Is it methodological? Interpretive? Different data?

4. BEST EVIDENCE:
   - Rank sources by tier (systematic review > RCT > peer-reviewed > working paper)
   - Deduplicate sources cited by multiple experts
   - Note the strongest evidence for and against each claim

OUTPUT FORMAT:
{
  "claimResults": [
    {
      "claimId": "claim_1",
      "claim": "Death penalty doesn't deter crime",
      "consensusLevel": "research_inconclusive",
      "confidence": "high",
      "summary": "All experts agree that the NRC 2012 systematic review found existing research cannot determine whether the death penalty affects homicide rates. The question is scientifically unresolved due to methodological limitations.",
      "expertVerdicts": [
        {
          "expertType": "Criminologist",
          "verdict": "inconclusive",
          "reasoning": "NRC 2012 is definitive that existing studies are uninformative"
        },
        {
          "expertType": "Statistician",
          "verdict": "inconclusive",
          "reasoning": "Methodological flaws in all deterrence studies make conclusions impossible"
        }
      ],
      "topEvidence": [
        {
          "title": "Deterrence and the Death Penalty",
          "authors": "National Research Council",
          "year": 2012,
          "tier": 1,
          "keyFinding": "Studies are not informative about deterrence effect"
        }
      ],
      "dissent": null,
      "caveats": [
        "NRC found studies can't prove OR disprove deterrence",
        "Absence of evidence is not evidence of absence"
      ]
    }
  ],

  "topSources": [
    // Best sources across all experts, deduplicated, ranked by tier
  ],

  "expertAgreement": {
    "agreedOn": [
      "NRC 2012 is the authoritative source on deterrence",
      "Existing deterrence studies have fundamental methodological flaws",
      "Cost studies consistently show capital punishment is more expensive"
    ],
    "disagreedOn": [],
    "uncertainAbout": [
      "Whether future studies could resolve the deterrence question"
    ]
  },

  "bottomLine": "The claim that the death penalty doesn't deter crime cannot be confirmed or denied by existing research. The National Research Council's 2012 systematic review found that all existing studies are methodologically incapable of answering this question. However, cost claims are well-supported by multiple fiscal analyses."
}

CRITICAL RULES:
1. Be honest about uncertainty - if experts say "we can't know," report that
2. Don't manufacture consensus where it doesn't exist
3. If experts genuinely disagree, present both positions fairly
4. Never cite {excludedSubjects} as an expert
5. Prefer higher-tier evidence (systematic reviews > individual studies)
6. Note when a claim is a VALUES question vs. empirical question
`;
```

### 3.5 Step 5: Output Generation

```typescript
const OUTPUT_TEMPLATES: Record<ConsensusLevel, OutputTemplate> = {

  strong_consensus: {
    icon: "✓",
    header: "Research Clearly Shows",
    badge: "HIGH CONFIDENCE",
    template: `
{summary}

Key Evidence:
{topEvidence}

Expert Panel Agreement:
{expertSummary}

Sources: {sourceCount} peer-reviewed studies
    `
  },

  moderate_consensus: {
    icon: "◐",
    header: "Most Research Suggests",
    badge: "MODERATE CONFIDENCE",
    template: `
{summary}

Key Evidence:
{topEvidence}

Points of Debate:
{minorDisagreements}
    `
  },

  active_debate: {
    icon: "⟷",
    header: "Experts Disagree",
    badge: "CONTESTED",
    template: `
This is an area of legitimate scientific debate.

Position A: {positionA}
Supporting experts: {positionAExperts}
Key evidence: {positionAEvidence}

Position B: {positionB}
Supporting experts: {positionBExperts}
Key evidence: {positionBEvidence}

Why They Disagree:
{disagreementReasons}
    `
  },

  research_inconclusive: {
    icon: "?",
    header: "Research Cannot Determine",
    badge: "INCONCLUSIVE",
    template: `
Existing research cannot answer this question.

{summary}

Why Research Is Inconclusive:
{methodologicalReasons}

What The Best Evidence Says:
{bestEvidenceSummary}

Note: This doesn't mean the claim is true or false - it means
current research methods cannot determine the answer.
    `
  },

  insufficient_research: {
    icon: "○",
    header: "Insufficient Research",
    badge: "UNKNOWN",
    template: `
Not enough peer-reviewed research exists to evaluate this claim.

What We Found:
- {studyCount} relevant studies
- No systematic reviews or meta-analyses

Available Evidence:
{limitedEvidence}
    `
  },

  values_question: {
    icon: "⚖",
    header: "Values Question",
    badge: "NOT EMPIRICAL",
    template: `
This is a values question that cannot be resolved through research.

What Research CAN Inform:
{empiricalComponents}

The Core Question Involves Values Like:
{valuesInvolved}

Note: Different positions reflect different value priorities,
not different interpretations of evidence.
    `
  }
};
```

---

## Part 4: Evidence Tiers (Unchanged)

```
TIER 1 (Strongest):
├── Systematic reviews
├── Meta-analyses
├── National Academy/NRC reports
└── Cochrane reviews

TIER 2 (Strong):
├── Peer-reviewed journal articles
├── Randomized controlled trials
└── Replicated studies

TIER 3 (Moderate):
├── Working papers (NBER, SSRN)
├── Government statistics (BLS, Census)
└── Preprints

TIER 4 (Weak - Use with caveats):
├── Think tank reports (disclose lean)
├── Expert interviews
└── Observational studies

TIER 5 (NOT EVIDENCE - Exclude):
├── Politicians ← CRITICAL
├── Advocates
├── Article subjects ← CRITICAL
├── Op-eds
└── Anecdotes
```

---

## Part 5: API Integration

### 5.1 Exa Search (Primary)

```typescript
interface ExaSearchConfig {
  query: string;
  category?: 'research paper' | 'news' | 'company' | 'pdf';
  numResults?: number;
  startPublishedDate?: string;  // "2015-01-01"
  useAutoprompt?: boolean;
  type?: 'neural' | 'keyword';
}

async function searchExa(config: ExaSearchConfig): Promise<ExaResult[]> {
  const response = await exa.search({
    query: config.query,
    category: config.category || 'research paper',
    numResults: config.numResults || 10,
    useAutoprompt: true,
    type: 'neural'
  });
  return response.results;
}
```

### 5.2 Semantic Scholar API

```typescript
// For academic paper search and author validation
// https://api.semanticscholar.org/

interface SemanticScholarSearch {
  query: string;
  fields?: string[];  // title, abstract, year, citationCount, authors
  limit?: number;
  yearFilter?: { min: number; max: number };
}

async function searchSemanticScholar(config: SemanticScholarSearch): Promise<Paper[]> {
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(config.query)}&limit=${config.limit || 10}&fields=title,abstract,year,citationCount,authors,journal,doi,url`;
  const response = await fetch(url);
  return response.json();
}

// Validate if someone is a real researcher
async function validateResearcher(name: string): Promise<AuthorInfo | null> {
  const url = `https://api.semanticscholar.org/graph/v1/author/search?query=${encodeURIComponent(name)}&fields=name,affiliations,paperCount,citationCount,hIndex`;
  const response = await fetch(url);
  const data = await response.json();
  return data.data?.[0] || null;
}
```

### 5.3 OpenAlex API

```typescript
// Free, comprehensive academic database
// https://openalex.org/

interface OpenAlexSearch {
  query: string;
  filters?: {
    publication_year?: string;  // "2020-2024"
    type?: string;              // "article", "review"
    is_oa?: boolean;
    cited_by_count?: string;    // ">100"
  };
}

async function searchOpenAlex(config: OpenAlexSearch): Promise<Work[]> {
  let url = `https://api.openalex.org/works?search=${encodeURIComponent(config.query)}`;
  if (config.filters?.publication_year) {
    url += `&filter=publication_year:${config.filters.publication_year}`;
  }
  if (config.filters?.cited_by_count) {
    url += `&filter=cited_by_count:${config.filters.cited_by_count}`;
  }
  const response = await fetch(url);
  return response.json();
}
```

---

## Part 6: Parallel Execution

```typescript
async function evaluateClaims(
  article: Article
): Promise<SynthesizedResult> {

  // Step 1: Extract claims
  const extractedClaims = await extractClaims(article);

  // Step 2: Identify needed experts
  const expertTeam = await identifyExperts(
    article.title,
    extractedClaims.claims,
    extractedClaims.articleSubjects
  );

  // Step 3: Run expert agents IN PARALLEL
  const expertPromises = expertTeam.experts.map(expert =>
    runExpertAgent(
      expert,
      extractedClaims.claims,
      extractedClaims.articleSubjects
    )
  );

  // Wait for all experts to complete
  const expertFindings = await Promise.all(expertPromises);

  // Step 4: Synthesize findings
  const synthesis = await synthesizeFindings(
    extractedClaims.claims,
    extractedClaims.articleSubjects,
    expertFindings
  );

  return synthesis;
}

async function runExpertAgent(
  expert: ExpertType,
  claims: ExtractedClaim[],
  excludedSubjects: string[]
): Promise<ExpertFindings> {

  // Build search queries based on expert's focus
  const queries = buildSearchQueries(expert, claims);

  // Run searches in parallel across different sources
  const searchPromises = [
    searchExa({ query: queries.primary, category: 'research paper' }),
    searchSemanticScholar({ query: queries.academic }),
    // Add more sources as needed
  ];

  const searchResults = await Promise.all(searchPromises);
  const allResults = searchResults.flat();

  // Have LLM analyze results through expert lens
  const findings = await analyzeAsExpert(
    expert,
    allResults,
    claims,
    excludedSubjects
  );

  return findings;
}
```

---

## Part 7: Example Walkthroughs

### Example 1: Death Penalty Article

**Input**: Slate article on Newsom's death penalty claims

**Step 1 Output (Claims)**:
```json
{
  "articleSubjects": ["Gavin Newsom"],
  "claims": [
    {"id": "1", "text": "Death penalty doesn't deter crime", "type": "causal"},
    {"id": "2", "text": "System has cost $4B+ since 1978", "type": "statistical"},
    {"id": "3", "text": "Risk of executing innocent people", "type": "empirical"}
  ]
}
```

**Step 2 Output (Experts)**:
```json
{
  "experts": [
    {"type": "Criminologist (deterrence)", "lookFor": "NRC reports, meta-analyses"},
    {"type": "Economist (fiscal policy)", "lookFor": "Cost studies, Alarcon & Mitchell"},
    {"type": "Legal scholar (wrongful conviction)", "lookFor": "Gross et al, exoneration data"},
    {"type": "Statistician (methodology)", "lookFor": "Study critiques, NRC methodology"}
  ]
}
```

**Step 4 Output (Synthesis)**:
```json
{
  "claimResults": [
    {
      "claim": "Death penalty doesn't deter crime",
      "consensusLevel": "research_inconclusive",
      "summary": "NRC 2012 found studies cannot determine effect"
    },
    {
      "claim": "System has cost $4B+ since 1978",
      "consensusLevel": "strong_consensus",
      "summary": "Alarcon & Mitchell study confirms, all fiscal studies agree"
    },
    {
      "claim": "Risk of executing innocent people",
      "consensusLevel": "strong_consensus",
      "summary": "Gross et al PNAS found 4.1% false conviction rate"
    }
  ]
}
```

### Example 2: Health Supplement Article

**Input**: CNBC article claiming "zinc lozenges improve erections"

**Step 2 Output (Experts)**:
```json
{
  "experts": [
    {"type": "Urologist/andrologist", "lookFor": "RCTs on zinc and erectile function"},
    {"type": "Nutritionist (mineral supplementation)", "lookFor": "Cochrane reviews on zinc"},
    {"type": "Pharmacologist", "lookFor": "Mechanism of action studies"},
    {"type": "Clinical trialist", "lookFor": "Study quality assessment"}
  ]
}
```

### Example 3: Economics Article (Tariffs)

**Input**: Fox News article claiming "tariffs protect American workers"

**Step 2 Output (Experts)**:
```json
{
  "experts": [
    {"type": "Trade economist", "lookFor": "NBER papers on tariff effects"},
    {"type": "Labor economist", "lookFor": "Studies on manufacturing employment"},
    {"type": "Consumer economist", "lookFor": "Price effect studies"},
    {"type": "Political economist", "lookFor": "Distributional effects research"}
  ]
}
```

---

## Part 8: Testing Checklist

### Claim Extraction
- [ ] Correctly identifies article subjects
- [ ] Extracts discrete claims (not whole paragraphs)
- [ ] Classifies claim types accurately
- [ ] Identifies values claims vs. empirical claims

### Expert Identification
- [ ] Identifies relevant expert types for the topic
- [ ] Includes methodologist when claims cite studies
- [ ] Provides useful search guidance for each expert
- [ ] Covers different disciplinary angles

### Expert Research
- [ ] Each expert finds relevant peer-reviewed sources
- [ ] Sources are real (not hallucinated)
- [ ] Evidence is properly tiered
- [ ] Expert never cites article subject as source

### Synthesis
- [ ] Correctly identifies consensus level
- [ ] Presents disagreements fairly when they exist
- [ ] Deduplicates sources across experts
- [ ] Produces honest, calibrated conclusions

### Output
- [ ] Never cites article subject as expert
- [ ] Uses appropriate framing for consensus level
- [ ] Includes relevant caveats
- [ ] Citations are verifiable

---

## Part 9: Error Handling

### When Expert Search Finds Nothing

```typescript
if (expertFindings.sources.length === 0) {
  return {
    assessment: {
      verdict: 'insufficient_evidence',
      confidence: 'low',
      reasoning: `As a ${expertType}, I found no peer-reviewed research on this specific claim. This may indicate the topic is too new, too specific, or under-studied.`
    }
  };
}
```

### When Experts Disagree

```typescript
if (hasSignificantDisagreement(expertFindings)) {
  return {
    consensusLevel: 'active_debate',
    positions: extractPositions(expertFindings),
    reasoning: summarizeDisagreement(expertFindings)
  };
}
```

### When Claim is Values-Based

```typescript
if (claim.type === 'values') {
  return {
    consensusLevel: 'values_question',
    summary: "This is a values question that cannot be resolved through empirical research.",
    whatResearchCanInform: extractEmpiricalComponents(claim),
    valuesInvolved: identifyValues(claim)
  };
}
```

---

## Part 10: Implementation Roadmap

### Week 1-2: Core Pipeline
- [ ] Claim extraction prompt and parsing
- [ ] Expert identification prompt and parsing
- [ ] Basic Exa integration

### Week 3-4: Expert Agents
- [ ] Expert agent prompt template
- [ ] Parallel execution with Promise.all
- [ ] Semantic Scholar integration
- [ ] Source deduplication

### Week 5-6: Synthesis
- [ ] Synthesis prompt and parsing
- [ ] Consensus level detection
- [ ] Disagreement handling
- [ ] Output template system

### Week 7-8: Validation
- [ ] Article subject exclusion verification
- [ ] Source verification (DOI checking)
- [ ] Tier classification accuracy
- [ ] Edge case handling

### Week 9-10: UI and Testing
- [ ] Frontend components for new output format
- [ ] Test across multiple domains
- [ ] User feedback integration
- [ ] Performance optimization

---

## Summary: Why This Approach Works

1. **Infinitely Flexible**: Works for any topic - death penalty, supplements, tariffs, AI safety
2. **Self-Assembling**: LLM identifies what expertise is needed for THIS specific article
3. **Parallel**: 3-5 expert agents run simultaneously
4. **Multi-Perspective**: Different disciplinary lenses catch different aspects
5. **Honest**: Reports uncertainty, disagreement, and "we don't know" appropriately
6. **Grounded**: Every expert must cite real sources from actual searches
7. **Safe**: Article subjects are excluded from expert pool by design

The key insight: **Don't try to pre-define all domains. Let the system figure out what expertise it needs.**
