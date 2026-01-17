# ClearView News: Universal Evidence-Based Evaluation System

---
## Implementation Progress (2026-01-16)

**Worktree:** `worktrees/expert-assembly` (branch: `feature/expert-assembly`)

| Wave | Status | Tests | Components |
|------|--------|-------|------------|
| Wave 1 | DONE | 66 | Claim extraction, classification, article subject detection |
| Wave 2 | DONE | 64 | Domain routing, think tank lean database |
| Wave 3 | DONE | 73 | Evidence tier classifier, source credibility |
| Wave 4 | DONE | 119 | Expert validation system (politician/advocate/lobbyist exclusion, credential validation, research institution patterns) |
| Wave 5 | DONE | 108 | Consensus detection (values questions, strong/moderate consensus, active debate, emerging research, insufficient research) |
| Wave 6 | DONE | 88 | Honest output generation (multi-format rendering, honesty checks, debate sections, values content) |
| Wave 7 | TODO | - | Full pipeline integration |

**Total: 518 passing tests**

### Continuation Notes for Next Team

**Wave 6 (Honest Output Generation) - COMPLETED:**
Created multi-format output generation with honesty enforcement:
- `src/types/output.ts` - Output types (RenderedClaimOutput, GeneratedOutput, HonestyRequirements)
- `src/services/outputGenerator.ts` - Main output generation service
- 88 tests covering honest framing, debate sections, values content, format generation

Key features implemented:
- Multi-format output: Markdown, HTML, JSON, plain text
- Honesty checks that prevent: overclaiming certainty, hiding debate, missing caveats
- Level-specific badges: HIGH CONFIDENCE, CONTESTED, PRELIMINARY, UNKNOWN, NOT EMPIRICAL
- Debate sections for active_debate (presents both positions fairly)
- Values content for values_question (explains what research can/cannot inform)

**Wave 7 (Full Pipeline Integration) - Next Up:**
Wire together: Article → Claims → Domain → Evidence → Experts → Consensus → Output

Wave 7 should create:
1. `src/services/pipeline.ts` - Main orchestration service
2. `src/controllers/evaluateController.ts` - API endpoint for full evaluation
3. Integration tests for complete article analysis flow

**Key Service Locations:**
- `src/services/claimExtractor.ts` - Wave 1
- `src/services/domainRouter.ts` - Wave 2
- `src/services/evidenceTier.ts` - Wave 3
- `src/services/expertValidator.ts` - Wave 4
- `src/services/consensusDetector.ts` - Wave 5
- `src/services/outputGenerator.ts` - Wave 6

**Run tests:** `cd worktrees/expert-assembly/backend && npm test`

---

## Vision

A system that can evaluate claims on **any topic** by:
1. Classifying whether claims are empirically verifiable
2. Routing to domain-appropriate academic sources
3. Finding actual experts (not claimants)
4. Honestly reporting when ground truth exists, is contested, or is unknowable

---

## Part 1: Problem Statement

### Current System Flaws

1. **Circular Expert Citation**: Cites article subjects (politicians, CEOs) as "experts" when fact-checking their own claims
2. **Shallow Source Quality**: Finds news articles and government reports rather than peer-reviewed research
3. **No Claim Decomposition**: Analyzes articles holistically rather than extracting and verifying individual claims
4. **No Source Hierarchy**: Treats a politician's statement equally to a peer-reviewed meta-analysis
5. **No Expert Verification**: Doesn't validate that cited "experts" have relevant credentials
6. **No Domain Awareness**: Uses same search strategy for medicine, economics, climate, etc.
7. **No Epistemic Honesty**: Doesn't distinguish "we know X" from "experts disagree" from "we can't know"

---

## Part 2: Universal Architecture

### System Flow Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        ARTICLE INPUT                             │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CLAIM EXTRACTOR                               │
│  Extract discrete claims with metadata:                          │
│  - Claim text                                                    │
│  - Who made this claim (source)                                  │
│  - Is source the article subject?                                │
│  - Claim type (see below)                                        │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                   CLAIM CLASSIFIER                               │
│                                                                  │
│  VERIFIABLE (can have ground truth):                            │
│  ├── empirical: "X exposed to Y shows effect Z"                 │
│  ├── causal: "X causes Y"                                       │
│  ├── statistical: "X% of Y are Z"                               │
│  ├── historical: "X happened in Y"                              │
│  └── scientific_consensus: "Scientists agree X"                 │
│                                                                  │
│  PARTIALLY VERIFIABLE:                                          │
│  ├── predictive: "X will cause Y" (mechanisms verifiable)       │
│  ├── comparative: "X is better than Y" (criteria-dependent)     │
│  └── effectiveness: "Policy X works" (depends on metrics)       │
│                                                                  │
│  NOT EMPIRICALLY VERIFIABLE:                                    │
│  ├── values: "We should do X" "X is wrong"                      │
│  ├── aesthetic: "X is beautiful/better"                         │
│  ├── definitional: "X is/isn't Y" (semantic debate)             │
│  └── unfalsifiable: Claims that can't be tested                 │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                    DOMAIN ROUTER                                 │
│                                                                  │
│  Detect domain and route to appropriate sources:                 │
│                                                                  │
│  Medicine/Health ──→ Cochrane, PubMed, FDA, WHO                 │
│  Climate/Environment ──→ IPCC, Nature, Science, AGU             │
│  Economics ──→ NBER, AER, Fed Research, IMF, World Bank         │
│  Criminology ──→ NRC, Criminology journals, DOJ stats           │
│  Psychology ──→ APA, replication databases, Psych Science       │
│  Nutrition ──→ Cochrane, USDA, nutrition journals               │
│  Technology ──→ ACM, IEEE, arXiv (with preprint caveats)        │
│  Political Science ──→ APSR, poli-sci journals                  │
│  History ──→ Primary sources, major historiography              │
│  Physics/Chemistry ──→ Nature, Science, Physical Review         │
│  Biology ──→ Nature, Cell, PNAS                                 │
│  Education ──→ What Works Clearinghouse, IES                    │
│  Business/Finance ──→ Journal of Finance, NBER, Fed             │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                  EVIDENCE GATHERER                               │
│                                                                  │
│  For each claim, search domain-appropriate sources:              │
│  1. Systematic reviews / meta-analyses (highest priority)        │
│  2. Peer-reviewed research                                       │
│  3. Working papers / preprints                                   │
│  4. Expert commentary (verified experts only)                    │
│                                                                  │
│  Apply filters:                                                  │
│  - Exclude article subjects as sources                           │
│  - Exclude politicians (unless citing their data)                │
│  - Flag industry-funded research                                 │
│  - Note replication status where available                       │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                 CONSENSUS DETECTOR                               │
│                                                                  │
│  Assess state of scientific knowledge:                           │
│                                                                  │
│  GROUND_TRUTH_EXISTS                                            │
│  ├── strong_consensus: >90% of quality research agrees          │
│  │   Examples: climate change, vaccine safety, evolution        │
│  │                                                               │
│  └── moderate_consensus: 70-90% agree, minor debates            │
│      Examples: minimum wage (small increases), exercise benefits │
│                                                                  │
│  GROUND_TRUTH_CONTESTED                                         │
│  ├── active_debate: Legitimate expert disagreement              │
│  │   Examples: optimal diet composition, social media harms     │
│  │                                                               │
│  └── emerging_research: Too new, consensus forming              │
│      Examples: long COVID mechanisms, AI safety                  │
│                                                                  │
│  GROUND_TRUTH_UNAVAILABLE                                       │
│  ├── insufficient_research: Not enough quality studies          │
│  │   Examples: very specific claims, new phenomena              │
│  │                                                               │
│  ├── methodologically_intractable: Can't be ethically studied   │
│  │   Examples: some causal claims requiring impossible RCTs     │
│  │                                                               │
│  └── values_question: Not empirically resolvable                │
│      Examples: abortion ethics, immigration policy goals         │
└─────────────────────────────────────────────────────────────────┘
                               ↓
┌─────────────────────────────────────────────────────────────────┐
│                   HONEST OUTPUT                                  │
│                                                                  │
│  Based on consensus level, output appropriate framing:           │
│                                                                  │
│  strong_consensus → "Research clearly shows X"                  │
│  moderate_consensus → "Most research supports X, with caveats"  │
│  active_debate → "Experts disagree: Position A vs Position B"   │
│  emerging_research → "Early research suggests X, but limited"   │
│  insufficient_research → "Insufficient research to determine"   │
│  values_question → "This is a values question, not empirical"   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 3: Claim Classification System

### 3.1 Claim Types & Verifiability

```typescript
type ClaimType =
  // Fully verifiable - can reach ground truth
  | 'empirical'           // "Drug X reduces symptom Y by Z%"
  | 'causal'              // "Smoking causes cancer"
  | 'statistical'         // "50% of Americans support X"
  | 'historical'          // "Event X happened in year Y"
  | 'scientific_consensus'// "Scientists agree that X"

  // Partially verifiable - components can be checked
  | 'predictive'          // "Policy X will cause Y"
  | 'comparative'         // "X is more effective than Y"
  | 'effectiveness'       // "Program X works"

  // Not empirically verifiable
  | 'values'              // "We should do X"
  | 'aesthetic'           // "X is better/worse"
  | 'definitional'        // "X is/isn't really Y"
  | 'unfalsifiable';      // Claims that can't be tested

interface ClassifiedClaim {
  id: string;
  text: string;
  type: ClaimType;
  isVerifiable: boolean;
  verifiabilityReason: string;

  // Source tracking
  source: {
    name: string;
    role: 'article_subject' | 'cited_expert' | 'article_author' | 'unknown';
    credentials?: string;
    isExcludedFromExpertPool: boolean;
  };

  // Domain routing
  domain: Domain;
  subDomain?: string;

  // For partially verifiable claims
  verifiableComponents?: string[];
  unverifiableComponents?: string[];
}
```

### 3.2 Claim Classification Prompt

```typescript
const CLAIM_CLASSIFICATION_PROMPT = `
You are a claim classifier. For each claim in the article, determine:

1. EXTRACT the discrete factual claims (not opinions, not rhetoric)

2. CLASSIFY each claim:

   VERIFIABLE CLAIMS (can reach ground truth):
   - empirical: Direct observations or measurements
   - causal: X causes/leads to/results in Y
   - statistical: Numbers, percentages, rates
   - historical: Past events, dates, sequences
   - scientific_consensus: Claims about what scientists/experts believe

   PARTIALLY VERIFIABLE (some components checkable):
   - predictive: Future outcomes (can check mechanisms, past predictions)
   - comparative: X vs Y (can check if criteria are specified)
   - effectiveness: Does X work (can check with defined metrics)

   NOT VERIFIABLE (cannot reach empirical ground truth):
   - values: Moral/ethical claims, "should" statements
   - aesthetic: Taste, preference, subjective quality
   - definitional: Semantic arguments about meaning
   - unfalsifiable: Claims structured to avoid testing

3. IDENTIFY the source of each claim:
   - Who said it?
   - Are they the SUBJECT of the article? (If yes, flag as excluded from expert pool)
   - What are their credentials?

4. DETECT the academic domain for routing

OUTPUT FORMAT:
{
  "claims": [
    {
      "text": "exact claim text",
      "type": "causal",
      "isVerifiable": true,
      "domain": "criminology",
      "source": {
        "name": "Person Name",
        "role": "article_subject",
        "isExcludedFromExpertPool": true
      }
    }
  ]
}

CRITICAL RULES:
- Article subjects are NEVER experts for their own claims
- Politicians making policy claims are CLAIMANTS, not EXPERTS
- CEOs making claims about their companies are CLAIMANTS, not EXPERTS
- "Should" statements are ALWAYS values claims, not empirical
`;
```

---

## Part 4: Domain-Specific Source Databases

### 4.1 Domain Configuration

```typescript
interface DomainConfig {
  name: string;
  aliases: string[];

  // Primary academic sources (Tier 1-2)
  academicSources: {
    databases: string[];           // PubMed, Semantic Scholar, etc.
    journals: string[];            // Top journals in field
    systematicReviewSources: string[]; // Cochrane, Campbell, etc.
    majorReports: string[];        // NRC, IPCC, etc.
  };

  // Institutional sources (Tier 3)
  institutionalSources: {
    government: string[];          // CDC, FDA, BLS, etc.
    international: string[];       // WHO, IMF, World Bank, etc.
    researchOrgs: string[];        // RAND, Brookings, etc.
  };

  // Expert identification
  expertIdentification: {
    typicalCredentials: string[];  // PhD, MD, etc.
    relevantDepartments: string[];
    professionalOrgs: string[];
  };

  // Known issues in this domain
  caveats: {
    replicationConcerns: boolean;
    industryInfluence: string[];
    politicization: 'high' | 'medium' | 'low';
    rapidlyEvolving: boolean;
  };

  // Search query templates
  queryTemplates: string[];
}
```

### 4.2 Domain Configurations

```typescript
const DOMAIN_CONFIGS: Record<string, DomainConfig> = {

  // ═══════════════════════════════════════════════════════════════
  // MEDICINE & HEALTH
  // ═══════════════════════════════════════════════════════════════
  medicine: {
    name: "Medicine & Health",
    aliases: ["health", "medical", "healthcare", "disease", "treatment", "drug"],

    academicSources: {
      databases: [
        "pubmed.gov",
        "cochranelibrary.com",
        "semanticscholar.org"
      ],
      journals: [
        "NEJM (New England Journal of Medicine)",
        "JAMA (Journal of the American Medical Association)",
        "The Lancet",
        "BMJ (British Medical Journal)",
        "Annals of Internal Medicine"
      ],
      systematicReviewSources: [
        "Cochrane Database of Systematic Reviews",
        "AHRQ Evidence Reports",
        "JBI Evidence Synthesis"
      ],
      majorReports: [
        "WHO guidelines",
        "CDC recommendations",
        "FDA drug reviews",
        "USPSTF recommendations"
      ]
    },

    institutionalSources: {
      government: ["cdc.gov", "fda.gov", "nih.gov", "ahrq.gov"],
      international: ["who.int"],
      researchOrgs: ["healthaffairs.org", "kff.org"]
    },

    expertIdentification: {
      typicalCredentials: ["MD", "PhD", "MPH", "DO"],
      relevantDepartments: [
        "Medicine", "Public Health", "Epidemiology",
        "Pharmacology", "Clinical Research"
      ],
      professionalOrgs: ["AMA", "specialty medical associations"]
    },

    caveats: {
      replicationConcerns: false,
      industryInfluence: ["pharmaceutical companies", "device manufacturers"],
      politicization: 'medium',
      rapidlyEvolving: true
    },

    queryTemplates: [
      "{topic} systematic review Cochrane",
      "{topic} randomized controlled trial",
      "{topic} meta-analysis JAMA OR NEJM OR Lancet",
      "{topic} clinical evidence efficacy",
      "{topic} FDA approval clinical trials"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // CLIMATE & ENVIRONMENT
  // ═══════════════════════════════════════════════════════════════
  climate: {
    name: "Climate & Environment",
    aliases: ["climate change", "global warming", "environment", "emissions", "carbon"],

    academicSources: {
      databases: [
        "semanticscholar.org",
        "webofscience.com",
        "scopus.com"
      ],
      journals: [
        "Nature Climate Change",
        "Nature",
        "Science",
        "Geophysical Research Letters",
        "Environmental Research Letters",
        "Climatic Change"
      ],
      systematicReviewSources: [
        "IPCC Assessment Reports",
        "National Climate Assessment",
        "Royal Society reports"
      ],
      majorReports: [
        "IPCC reports",
        "NOAA climate reports",
        "NASA climate research",
        "National Academies reports"
      ]
    },

    institutionalSources: {
      government: ["climate.gov", "nasa.gov/climate", "epa.gov"],
      international: ["ipcc.ch", "unep.org", "wmo.int"],
      researchOrgs: ["climatecentral.org", "carbonbrief.org"]
    },

    expertIdentification: {
      typicalCredentials: ["PhD"],
      relevantDepartments: [
        "Climate Science", "Atmospheric Science", "Earth Science",
        "Environmental Science", "Oceanography", "Ecology"
      ],
      professionalOrgs: ["AGU", "AMS", "ESA"]
    },

    caveats: {
      replicationConcerns: false,
      industryInfluence: ["fossil fuel industry (historical denial funding)"],
      politicization: 'high',
      rapidlyEvolving: true
    },

    queryTemplates: [
      "{topic} IPCC assessment",
      "{topic} climate science peer-reviewed",
      "{topic} Nature Climate Change",
      "{topic} empirical evidence climate",
      "{topic} National Academy Sciences climate"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // ECONOMICS
  // ═══════════════════════════════════════════════════════════════
  economics: {
    name: "Economics",
    aliases: ["economy", "economic", "fiscal", "monetary", "trade", "tariff", "inflation"],

    academicSources: {
      databases: [
        "nber.org",
        "ssrn.com",
        "econpapers.repec.org",
        "semanticscholar.org"
      ],
      journals: [
        "American Economic Review",
        "Quarterly Journal of Economics",
        "Econometrica",
        "Journal of Political Economy",
        "Review of Economic Studies",
        "Journal of Finance"
      ],
      systematicReviewSources: [
        "Journal of Economic Literature reviews",
        "NBER working paper series",
        "IMF working papers"
      ],
      majorReports: [
        "Federal Reserve research",
        "CBO analyses",
        "IMF World Economic Outlook",
        "World Bank reports"
      ]
    },

    institutionalSources: {
      government: ["bls.gov", "census.gov", "bea.gov", "federalreserve.gov", "cbo.gov"],
      international: ["imf.org", "worldbank.org", "oecd.org"],
      researchOrgs: ["brookings.edu", "nber.org", "piie.com"]
    },

    expertIdentification: {
      typicalCredentials: ["PhD"],
      relevantDepartments: [
        "Economics", "Finance", "Public Policy",
        "Business School (economics faculty)"
      ],
      professionalOrgs: ["AEA", "Econometric Society"]
    },

    caveats: {
      replicationConcerns: true, // Some econ studies don't replicate
      industryInfluence: ["financial industry", "think tanks with agendas"],
      politicization: 'high',
      rapidlyEvolving: false
    },

    queryTemplates: [
      "{topic} NBER working paper",
      "{topic} empirical economics study",
      "{topic} American Economic Review",
      "{topic} causal effect economic",
      "{topic} Federal Reserve research"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // CRIMINOLOGY & CRIMINAL JUSTICE
  // ═══════════════════════════════════════════════════════════════
  criminology: {
    name: "Criminology & Criminal Justice",
    aliases: ["crime", "criminal", "prison", "police", "justice", "incarceration", "death penalty"],

    academicSources: {
      databases: [
        "semanticscholar.org",
        "jstor.org",
        "ncjrs.gov"
      ],
      journals: [
        "Criminology",
        "Journal of Quantitative Criminology",
        "Journal of Research in Crime and Delinquency",
        "Justice Quarterly",
        "Journal of Criminal Law and Criminology"
      ],
      systematicReviewSources: [
        "Campbell Collaboration crime & justice reviews",
        "National Research Council reports",
        "RAND criminal justice research"
      ],
      majorReports: [
        "National Research Council reports",
        "Bureau of Justice Statistics",
        "NIJ research reports"
      ]
    },

    institutionalSources: {
      government: ["bjs.gov", "nij.gov", "fbi.gov/ucr"],
      international: ["unodc.org"],
      researchOrgs: ["rand.org", "vera.org", "sentencingproject.org"]
    },

    expertIdentification: {
      typicalCredentials: ["PhD", "JD (for legal aspects)"],
      relevantDepartments: [
        "Criminology", "Criminal Justice", "Sociology (crime)",
        "Law School (empirical legal studies)"
      ],
      professionalOrgs: ["ASC (American Society of Criminology)"]
    },

    caveats: {
      replicationConcerns: true,
      industryInfluence: ["prison industry", "police unions"],
      politicization: 'high',
      rapidlyEvolving: false
    },

    queryTemplates: [
      "{topic} criminology meta-analysis",
      "{topic} National Research Council crime",
      "{topic} empirical criminal justice",
      "{topic} Campbell Collaboration crime",
      "{topic} Journal of Quantitative Criminology"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // PSYCHOLOGY
  // ═══════════════════════════════════════════════════════════════
  psychology: {
    name: "Psychology",
    aliases: ["mental health", "psychological", "behavior", "cognitive", "therapy"],

    academicSources: {
      databases: [
        "psycnet.apa.org",
        "pubmed.gov",
        "semanticscholar.org"
      ],
      journals: [
        "Psychological Science",
        "Journal of Personality and Social Psychology",
        "Psychological Bulletin",
        "American Psychologist",
        "Clinical Psychological Science"
      ],
      systematicReviewSources: [
        "Psychological Bulletin meta-analyses",
        "Cochrane mental health reviews",
        "APA clinical practice guidelines"
      ],
      majorReports: [
        "APA task force reports",
        "NIMH research",
        "Surgeon General mental health reports"
      ]
    },

    institutionalSources: {
      government: ["nimh.nih.gov"],
      international: ["who.int/mental_health"],
      researchOrgs: ["apa.org"]
    },

    expertIdentification: {
      typicalCredentials: ["PhD", "PsyD", "MD (psychiatry)"],
      relevantDepartments: [
        "Psychology", "Psychiatry", "Cognitive Science",
        "Neuroscience", "Behavioral Science"
      ],
      professionalOrgs: ["APA", "APS"]
    },

    caveats: {
      replicationConcerns: true, // Significant replication crisis
      industryInfluence: ["pharmaceutical (for psychiatric drugs)"],
      politicization: 'medium',
      rapidlyEvolving: true
    },

    queryTemplates: [
      "{topic} meta-analysis psychology",
      "{topic} replication psychological",
      "{topic} Psychological Bulletin",
      "{topic} randomized controlled trial therapy",
      "{topic} effect size psychology"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // NUTRITION
  // ═══════════════════════════════════════════════════════════════
  nutrition: {
    name: "Nutrition",
    aliases: ["diet", "food", "eating", "vitamins", "supplements", "obesity"],

    academicSources: {
      databases: [
        "pubmed.gov",
        "cochranelibrary.com"
      ],
      journals: [
        "American Journal of Clinical Nutrition",
        "Journal of Nutrition",
        "Nutrition Reviews",
        "British Journal of Nutrition",
        "Obesity"
      ],
      systematicReviewSources: [
        "Cochrane nutrition reviews",
        "Dietary Guidelines Advisory Committee reports",
        "AHRQ nutrition evidence reviews"
      ],
      majorReports: [
        "Dietary Guidelines for Americans",
        "WHO nutrition guidelines",
        "USDA nutrition research"
      ]
    },

    institutionalSources: {
      government: ["ods.nih.gov", "usda.gov"],
      international: ["who.int/nutrition"],
      researchOrgs: ["nutrition.org"]
    },

    expertIdentification: {
      typicalCredentials: ["PhD", "RD", "MD"],
      relevantDepartments: [
        "Nutrition", "Dietetics", "Public Health",
        "Epidemiology (nutritional)"
      ],
      professionalOrgs: ["AND (Academy of Nutrition and Dietetics)", "ASN"]
    },

    caveats: {
      replicationConcerns: true, // Many nutrition studies don't replicate
      industryInfluence: ["food industry", "supplement industry"],
      politicization: 'medium',
      rapidlyEvolving: true
    },

    queryTemplates: [
      "{topic} systematic review nutrition",
      "{topic} randomized controlled trial diet",
      "{topic} Cochrane nutrition",
      "{topic} meta-analysis dietary",
      "{topic} clinical trial food"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // POLITICAL SCIENCE
  // ═══════════════════════════════════════════════════════════════
  politicalScience: {
    name: "Political Science",
    aliases: ["politics", "voting", "elections", "democracy", "governance", "policy"],

    academicSources: {
      databases: [
        "jstor.org",
        "semanticscholar.org",
        "ssrn.com"
      ],
      journals: [
        "American Political Science Review",
        "American Journal of Political Science",
        "Journal of Politics",
        "Quarterly Journal of Political Science",
        "Political Analysis"
      ],
      systematicReviewSources: [
        "Annual Review of Political Science",
        "EGAP (Evidence in Governance and Politics)"
      ],
      majorReports: [
        "Congressional Research Service reports",
        "GAO reports"
      ]
    },

    institutionalSources: {
      government: ["gao.gov", "crs.gov"],
      international: ["idea.int", "v-dem.net"],
      researchOrgs: ["brookings.edu", "aei.org", "cato.org"]
    },

    expertIdentification: {
      typicalCredentials: ["PhD"],
      relevantDepartments: [
        "Political Science", "Government", "Public Policy",
        "International Relations"
      ],
      professionalOrgs: ["APSA"]
    },

    caveats: {
      replicationConcerns: true,
      industryInfluence: ["partisan think tanks"],
      politicization: 'high',
      rapidlyEvolving: false
    },

    queryTemplates: [
      "{topic} empirical political science",
      "{topic} American Political Science Review",
      "{topic} causal inference politics",
      "{topic} quasi-experimental policy",
      "{topic} regression discontinuity election"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // TECHNOLOGY
  // ═══════════════════════════════════════════════════════════════
  technology: {
    name: "Technology",
    aliases: ["tech", "AI", "artificial intelligence", "software", "computer", "algorithm", "data"],

    academicSources: {
      databases: [
        "arxiv.org",
        "semanticscholar.org",
        "dl.acm.org",
        "ieeexplore.ieee.org"
      ],
      journals: [
        "Nature",
        "Science",
        "Communications of the ACM",
        "IEEE Transactions (various)",
        "Journal of Machine Learning Research"
      ],
      systematicReviewSources: [
        "ACM Computing Surveys",
        "IEEE Surveys & Tutorials"
      ],
      majorReports: [
        "NIST reports",
        "National Academies tech reports",
        "AI Index Report (Stanford HAI)"
      ]
    },

    institutionalSources: {
      government: ["nist.gov", "nsf.gov"],
      international: ["itu.int"],
      researchOrgs: ["hai.stanford.edu", "aiindex.stanford.edu"]
    },

    expertIdentification: {
      typicalCredentials: ["PhD"],
      relevantDepartments: [
        "Computer Science", "Electrical Engineering",
        "Information Science", "AI/ML labs"
      ],
      professionalOrgs: ["ACM", "IEEE"]
    },

    caveats: {
      replicationConcerns: true, // ML reproducibility issues
      industryInfluence: ["big tech companies fund much research"],
      politicization: 'medium',
      rapidlyEvolving: true // Very fast-moving field
    },

    queryTemplates: [
      "{topic} peer-reviewed computer science",
      "{topic} empirical study software",
      "{topic} benchmark evaluation AI",
      "{topic} ACM OR IEEE research",
      "{topic} reproducibility study"
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // EDUCATION
  // ═══════════════════════════════════════════════════════════════
  education: {
    name: "Education",
    aliases: ["school", "teaching", "learning", "students", "curriculum", "pedagogy"],

    academicSources: {
      databases: [
        "eric.ed.gov",
        "semanticscholar.org"
      ],
      journals: [
        "Educational Researcher",
        "American Educational Research Journal",
        "Review of Educational Research",
        "Journal of Educational Psychology"
      ],
      systematicReviewSources: [
        "What Works Clearinghouse",
        "Campbell Collaboration education reviews",
        "Education Endowment Foundation"
      ],
      majorReports: [
        "IES research reports",
        "NCES statistics",
        "National Academies education reports"
      ]
    },

    institutionalSources: {
      government: ["ies.ed.gov", "nces.ed.gov"],
      international: ["oecd.org/education"],
      researchOrgs: ["eef.org.uk", "rand.org/education"]
    },

    expertIdentification: {
      typicalCredentials: ["PhD", "EdD"],
      relevantDepartments: [
        "Education", "Educational Psychology",
        "Curriculum & Instruction", "Education Policy"
      ],
      professionalOrgs: ["AERA"]
    },

    caveats: {
      replicationConcerns: true,
      industryInfluence: ["edtech companies", "testing companies"],
      politicization: 'high',
      rapidlyEvolving: false
    },

    queryTemplates: [
      "{topic} What Works Clearinghouse",
      "{topic} randomized controlled trial education",
      "{topic} meta-analysis educational",
      "{topic} IES research education",
      "{topic} effect size learning"
    ]
  }
};
```

---

## Part 5: Evidence Hierarchy

### 5.1 Universal Evidence Tiers

```typescript
enum EvidenceTier {
  // Tier 1: Highest quality - synthesized evidence
  TIER_1_SYSTEMATIC_REVIEW = 1,    // Cochrane, Campbell, NRC reports
  TIER_1_META_ANALYSIS = 1,        // Quantitative synthesis of multiple studies

  // Tier 2: High quality - primary research
  TIER_2_RCT = 2,                  // Randomized controlled trials
  TIER_2_PEER_REVIEWED = 2,        // Peer-reviewed journal articles
  TIER_2_REPLICATED = 2,           // Studies that have been replicated

  // Tier 3: Moderate quality - preliminary/institutional
  TIER_3_WORKING_PAPER = 3,        // NBER, SSRN (not yet peer-reviewed)
  TIER_3_GOVERNMENT_STATS = 3,     // BLS, Census, official statistics
  TIER_3_PREPRINT = 3,             // arXiv, medRxiv, etc.

  // Tier 4: Lower quality - use with caveats
  TIER_4_THINK_TANK = 4,           // Must disclose political lean
  TIER_4_EXPERT_OPINION = 4,       // Interviews with verified experts
  TIER_4_OBSERVATIONAL = 4,        // Non-randomized observational studies

  // Tier 5: Not evidence - exclude from expert pool
  TIER_5_POLITICIAN = 5,           // Politicians' statements
  TIER_5_ADVOCATE = 5,             // Advocacy organizations
  TIER_5_ARTICLE_SUBJECT = 5,      // The person being written about
  TIER_5_OPINION = 5,              // Op-eds, editorials
  TIER_5_ANECDOTE = 5,             // Individual stories
}

interface EvidenceSource {
  tier: EvidenceTier;
  citation: {
    title: string;
    authors: string[];
    publication: string;
    year: number;
    doi?: string;
    url: string;
  };

  // Quality indicators
  qualityMarkers: {
    isPeerReviewed: boolean;
    isReplicated?: boolean;
    citationCount?: number;
    journalImpactFactor?: number;
    sampleSize?: number;
    studyDesign?: 'RCT' | 'quasi-experimental' | 'observational' | 'meta-analysis';
  };

  // Potential issues
  caveats: {
    fundingSource?: string;
    conflictOfInterest?: string;
    limitationsNoted?: string[];
    replicationStatus?: 'replicated' | 'failed_replication' | 'not_tested' | 'mixed';
  };

  // For display
  tierLabel: string;  // "Meta-Analysis", "Peer-Reviewed", etc.
  tierExplanation: string;
}
```

### 5.2 Think Tank Political Lean Database

```typescript
const THINK_TANK_LEANS: Record<string, {lean: string; description: string}> = {
  // Left-leaning
  "brookings.edu": { lean: "center-left", description: "Brookings Institution - center-left policy research" },
  "cbpp.org": { lean: "left", description: "Center on Budget and Policy Priorities - progressive economic policy" },
  "epi.org": { lean: "left", description: "Economic Policy Institute - labor-aligned" },
  "americanprogress.org": { lean: "left", description: "Center for American Progress - progressive" },

  // Right-leaning
  "heritage.org": { lean: "right", description: "Heritage Foundation - conservative" },
  "aei.org": { lean: "center-right", description: "American Enterprise Institute - center-right" },
  "cato.org": { lean: "libertarian", description: "Cato Institute - libertarian" },
  "manhattan-institute.org": { lean: "right", description: "Manhattan Institute - conservative" },

  // Nonpartisan (relatively)
  "rand.org": { lean: "nonpartisan", description: "RAND Corporation - nonpartisan research" },
  "urban.org": { lean: "center", description: "Urban Institute - center/nonpartisan" },
  "nber.org": { lean: "academic", description: "National Bureau of Economic Research - academic economists" },
};
```

---

## Part 6: Consensus Detection

### 6.1 Consensus Levels

```typescript
type ConsensusLevel =
  // Ground truth available
  | 'strong_consensus'        // >90% agreement, robust evidence (climate, vaccines)
  | 'moderate_consensus'      // 70-90% agreement, some debate on details

  // Ground truth contested
  | 'active_debate'           // Legitimate expert disagreement
  | 'emerging_research'       // Too new, consensus forming

  // Ground truth unavailable
  | 'insufficient_research'   // Not enough quality studies
  | 'methodologically_blocked'// Can't be ethically/practically studied
  | 'values_question';        // Not an empirical question

interface ConsensusAssessment {
  level: ConsensusLevel;
  confidence: 'high' | 'medium' | 'low';

  // Evidence basis
  basis: {
    systematicReviews: Citation[];
    metaAnalyses: Citation[];
    majorReports: Citation[];
    totalQualityStudies: number;
  };

  // For contested/debated topics
  positions?: {
    positionA: {
      summary: string;
      supportingExperts: Expert[];
      keyEvidence: Citation[];
    };
    positionB: {
      summary: string;
      supportingExperts: Expert[];
      keyEvidence: Citation[];
    };
  };

  // Honest framing for output
  framingSentence: string;
  caveats: string[];
}
```

### 6.2 Consensus Detection Logic

```typescript
function assessConsensus(
  claim: ClassifiedClaim,
  evidence: EvidenceSource[]
): ConsensusAssessment {

  // Check if this is a values question
  if (claim.type === 'values' || claim.type === 'aesthetic') {
    return {
      level: 'values_question',
      confidence: 'high',
      basis: { systematicReviews: [], metaAnalyses: [], majorReports: [], totalQualityStudies: 0 },
      framingSentence: "This is a values question that cannot be resolved by empirical research.",
      caveats: ["Empirical research can inform but not determine value judgments"]
    };
  }

  // Count high-quality evidence
  const tier1Evidence = evidence.filter(e => e.tier === 1);
  const tier2Evidence = evidence.filter(e => e.tier === 2);
  const qualityStudies = [...tier1Evidence, ...tier2Evidence];

  // Check for insufficient research
  if (qualityStudies.length < 3) {
    return {
      level: 'insufficient_research',
      confidence: 'medium',
      basis: { /* ... */ },
      framingSentence: "Insufficient peer-reviewed research exists to determine this claim.",
      caveats: ["Only " + qualityStudies.length + " quality studies found"]
    };
  }

  // Analyze direction of findings
  const supportingStudies = qualityStudies.filter(e => e.direction === 'supports');
  const opposingStudies = qualityStudies.filter(e => e.direction === 'opposes');
  const neutralStudies = qualityStudies.filter(e => e.direction === 'neutral');

  const supportRatio = supportingStudies.length / qualityStudies.length;

  // Determine consensus level
  if (supportRatio > 0.9 || (1 - supportRatio) > 0.9) {
    return {
      level: 'strong_consensus',
      confidence: 'high',
      framingSentence: "Research clearly shows that " + (supportRatio > 0.9 ? "this claim is supported" : "this claim is not supported"),
      // ...
    };
  }

  if (supportRatio > 0.7 || supportRatio < 0.3) {
    return {
      level: 'moderate_consensus',
      confidence: 'medium',
      framingSentence: "Most research " + (supportRatio > 0.7 ? "supports" : "does not support") + " this claim, with some debate.",
      // ...
    };
  }

  // Active debate
  return {
    level: 'active_debate',
    confidence: 'medium',
    framingSentence: "Experts genuinely disagree on this question.",
    positions: {
      positionA: { /* summarize supporting view */ },
      positionB: { /* summarize opposing view */ }
    },
    // ...
  };
}
```

---

## Part 7: Expert Validation

### 7.1 Expert Criteria

```typescript
interface ExpertValidation {
  // REQUIRED for "expert" status
  hasRelevantDegree: boolean;      // PhD, MD, JD in relevant field
  hasRelevantPublications: boolean; // Published peer-reviewed work on topic
  isAtResearchInstitution: boolean; // University, research org, hospital

  // DISQUALIFYING factors (any one excludes from expert pool)
  disqualifiers: {
    isArticleSubject: boolean;       // Person the article is about
    isPolitician: boolean;           // Elected officials, political appointees
    isLobbyist: boolean;             // Registered lobbyists
    isAdvocate: boolean;             // Works for advocacy organization
    isCorporateSpokesperson: boolean;// Speaking for company interests
    hasUndisclosedConflict: boolean; // Known COI not disclosed
  };

  // QUALITY indicators (for ranking experts)
  qualityIndicators: {
    hIndex?: number;
    totalCitations?: number;
    relevantPublicationCount?: number;
    institutionRanking?: number;
    yearsInField?: number;
  };

  // Final determination
  isValidExpert: boolean;
  validationReason: string;
}

function validateExpert(
  person: PersonMention,
  articleSubject: string,
  claimDomain: string
): ExpertValidation {

  const disqualifiers = {
    isArticleSubject: person.name.toLowerCase().includes(articleSubject.toLowerCase()),
    isPolitician: POLITICIAN_PATTERNS.some(p => p.test(person.title || '')),
    isLobbyist: LOBBYIST_PATTERNS.some(p => p.test(person.affiliation || '')),
    isAdvocate: ADVOCACY_ORG_PATTERNS.some(p => p.test(person.affiliation || '')),
    isCorporateSpokesperson: person.role === 'spokesperson' || person.role === 'communications',
    hasUndisclosedConflict: false // Would need separate check
  };

  const isDisqualified = Object.values(disqualifiers).some(v => v);

  if (isDisqualified) {
    const reason = Object.entries(disqualifiers)
      .filter(([_, v]) => v)
      .map(([k, _]) => k)
      .join(', ');

    return {
      // ...
      isValidExpert: false,
      validationReason: `Excluded: ${reason}`
    };
  }

  // Check positive qualifications
  const hasRelevantDegree = DEGREE_PATTERNS.some(p => p.test(person.credentials || ''));
  const isAtResearchInstitution = RESEARCH_INSTITUTION_PATTERNS.some(p =>
    p.test(person.affiliation || '')
  );

  // For hasRelevantPublications, would need to query Semantic Scholar
  // This is a placeholder
  const hasRelevantPublications = true; // TODO: Implement actual check

  const isValidExpert = hasRelevantDegree && isAtResearchInstitution && hasRelevantPublications;

  return {
    hasRelevantDegree,
    hasRelevantPublications,
    isAtResearchInstitution,
    disqualifiers,
    qualityIndicators: {}, // Would populate from Semantic Scholar
    isValidExpert,
    validationReason: isValidExpert
      ? "Valid expert: Has relevant credentials and publications"
      : "Not validated: Missing required credentials or publications"
  };
}
```

### 7.2 Exclusion Patterns

```typescript
// Politicians - NEVER experts for empirical claims
const POLITICIAN_PATTERNS = [
  /\b(president|vice president|senator|representative|congressman|congresswoman)\b/i,
  /\b(governor|lieutenant governor|mayor|city council|state legislator)\b/i,
  /\b(secretary of|cabinet|minister|prime minister|ambassador)\b/i,
  /\b(party chair|campaign|political director)\b/i,
];

// Advocates - May cite their claims, but not as expert evidence
const ADVOCACY_ORG_PATTERNS = [
  /\b(advocacy|activist|campaign|action fund|political action)\b/i,
  /\b(citizens for|americans for|alliance for|coalition for)\b/i,
  /\bPAC\b/,
  /\b(rights organization|justice organization)\b/i, // Context-dependent
];

// Corporate - Exclude for claims about their own products/industry
const CORPORATE_PATTERNS = [
  /\b(CEO|CFO|COO|CTO|chief .* officer)\b/i,
  /\b(spokesperson|communications|public relations|PR)\b/i,
  /\b(vice president of|director of|head of) .* (marketing|communications|sales)\b/i,
];

// Research institutions - INCLUDE these
const RESEARCH_INSTITUTION_PATTERNS = [
  /\buniversity\b/i,
  /\bcollege\b/i,
  /\binstitute of technology\b/i,
  /\bresearch (institute|center|laboratory)\b/i,
  /\bmedical (school|center)\b/i,
  /\bhospital .* research\b/i,
  /\bnational (academy|institute|laboratory)\b/i,
];

// Degrees that qualify for expert status (domain-dependent)
const DEGREE_PATTERNS = [
  /\bPh\.?D\.?\b/i,
  /\bM\.?D\.?\b/i,
  /\bJ\.?D\.?\b/i,  // For legal topics
  /\bDr\.\b/,       // When followed by academic affiliation
  /\bProfessor\b/i,
];
```

---

## Part 8: Honest Output Generation

### 8.1 Output Templates by Consensus Level

```typescript
const OUTPUT_TEMPLATES: Record<ConsensusLevel, OutputTemplate> = {

  strong_consensus: {
    headerEmoji: "✓",
    headerText: "Research Clearly Shows",
    confidenceBadge: "HIGH CONFIDENCE",
    bodyTemplate: `
The scientific evidence strongly supports/refutes this claim.

{systematicReviewSummary}

Key Evidence:
{topTier1Evidence}

What Experts Say:
{expertQuotes}

Sources: {citationCount} peer-reviewed studies, including {metaAnalysisCount} meta-analyses
    `,
    caveatsTemplate: null, // No major caveats for strong consensus
  },

  moderate_consensus: {
    headerEmoji: "◐",
    headerText: "Most Research Suggests",
    confidenceBadge: "MODERATE CONFIDENCE",
    bodyTemplate: `
The majority of research supports/does not support this claim, though some debate exists.

{mainFindingSummary}

Key Evidence:
{topEvidence}

Points of Debate:
{minorDisagreements}

What Experts Say:
{expertQuotes}
    `,
    caveatsTemplate: "Note: {caveats}",
  },

  active_debate: {
    headerEmoji: "⟷",
    headerText: "Experts Disagree",
    confidenceBadge: "CONTESTED",
    bodyTemplate: `
This is an area of legitimate scientific debate. Qualified experts hold different views.

Position A: {positionASummary}
Key proponents: {positionAExperts}
Key evidence: {positionAEvidence}

Position B: {positionBSummary}
Key proponents: {positionBExperts}
Key evidence: {positionBEvidence}

Why They Disagree:
{reasonsForDisagreement}
    `,
    caveatsTemplate: "Important: This is a genuinely contested scientific question.",
  },

  emerging_research: {
    headerEmoji: "◔",
    headerText: "Early Research Suggests",
    confidenceBadge: "PRELIMINARY",
    bodyTemplate: `
This is an emerging area of research. Early findings suggest:

{preliminaryFindings}

Important Limitations:
- Research is still early-stage
- Findings may change as more studies are conducted
- {specificLimitations}

Current Evidence:
{availableEvidence}
    `,
    caveatsTemplate: "Caution: This research is preliminary and conclusions may change.",
  },

  insufficient_research: {
    headerEmoji: "?",
    headerText: "Insufficient Research",
    confidenceBadge: "UNKNOWN",
    bodyTemplate: `
There is not enough peer-reviewed research to evaluate this claim.

What We Found:
- {studyCount} relevant studies (minimum needed: ~5 quality studies)
- No systematic reviews or meta-analyses on this specific question

What's Available:
{limitedEvidence}

Why Research May Be Limited:
{possibleReasons}
    `,
    caveatsTemplate: "Note: Absence of research does not mean the claim is false or true.",
  },

  methodologically_blocked: {
    headerEmoji: "⊘",
    headerText: "Cannot Be Directly Studied",
    confidenceBadge: "METHODOLOGICALLY LIMITED",
    bodyTemplate: `
This claim cannot be directly tested through randomized experiments due to ethical or practical constraints.

Why Direct Study Is Difficult:
{methodologicalBarriers}

Indirect Evidence:
{indirectEvidence}

What We Can Say:
{limitedConclusions}
    `,
    caveatsTemplate: "Note: Some important questions cannot be answered through controlled experiments.",
  },

  values_question: {
    headerEmoji: "⚖",
    headerText: "Values Question",
    confidenceBadge: "NOT EMPIRICAL",
    bodyTemplate: `
This is a values question that cannot be resolved through scientific research.

Empirical research can inform but not determine:
{whatResearchCanInform}

The underlying question involves values like:
{valuesInvolved}

Different positions on this question reflect different value priorities, not different interpretations of evidence.
    `,
    caveatsTemplate: "Note: Science can inform values debates but cannot resolve them.",
  },
};
```

### 8.2 Example Outputs

**Example 1: Strong Consensus (Climate Change)**
```
✓ Research Clearly Shows
[HIGH CONFIDENCE]

Human activities are causing global warming. This is supported by
overwhelming scientific evidence and consensus among climate scientists.

Key Evidence:
• IPCC Sixth Assessment Report (2021-2023) - Systematic review
  "It is unequivocal that human influence has warmed the atmosphere,
  ocean and land."

• NASA/NOAA Global Temperature Data - Government statistics
  Global average temperature has risen ~1.1°C since pre-industrial times.

What Experts Say:
"The scientific evidence is unequivocal: climate change is a threat to
human wellbeing and the health of the planet."
— IPCC Working Group II (2022)

Sources: 14,000+ peer-reviewed studies synthesized in IPCC reports
```

**Example 2: Active Debate (Social Media & Teen Mental Health)**
```
⟷ Experts Disagree
[CONTESTED]

This is an area of legitimate scientific debate. Qualified experts
hold different views based on the same underlying data.

Position A: Social media significantly harms teen mental health
Key proponents: Jean Twenge (San Diego State), Jonathan Haidt (NYU)
Key evidence: Correlational studies showing rises in depression
coinciding with smartphone adoption

Position B: Evidence for harm is weak or overstated
Key proponents: Amy Orben (Cambridge), Andrew Przybylski (Oxford)
Key evidence: Effect sizes in studies are very small; correlation
doesn't establish causation; teens also report benefits

Why They Disagree:
- Different interpretations of effect size significance
- Debate over appropriate study methodologies
- Difficulty establishing causation vs. correlation
- Rapid changes in technology outpace research

Note: This is a genuinely contested scientific question where
reasonable experts disagree based on methodology and interpretation.
```

**Example 3: Values Question (Should We Have Open Borders?)**
```
⚖ Values Question
[NOT EMPIRICAL]

This is a values question that cannot be resolved through scientific
research alone.

Empirical research CAN inform:
• Economic effects of immigration (studied extensively)
• Labor market impacts (debated, but empirical question)
• Fiscal costs/benefits (measurable)
• Crime rates among immigrants (data available)

The underlying question involves values like:
• National sovereignty vs. freedom of movement
• Economic efficiency vs. cultural preservation
• Obligations to citizens vs. obligations to all humans
• Security concerns vs. humanitarian concerns

Different positions on this question reflect different value
priorities, not simply different interpretations of evidence.

Note: Science can inform values debates but cannot resolve them.
We can fact-check specific empirical claims within this debate,
but not the "should" question itself.
```

---

## Part 9: API Integrations

### 9.1 Semantic Scholar API

```typescript
// Semantic Scholar API for academic paper search
// https://api.semanticscholar.org/

interface SemanticScholarClient {
  // Search for papers
  searchPapers(query: string, options?: {
    fields?: string[];
    limit?: number;
    yearFilter?: { min?: number; max?: number };
    fieldsOfStudy?: string[];
    openAccessOnly?: boolean;
  }): Promise<Paper[]>;

  // Get paper details
  getPaper(paperId: string): Promise<PaperDetails>;

  // Get author details (for expert validation)
  getAuthor(authorId: string): Promise<AuthorDetails>;

  // Search for authors by name
  searchAuthors(name: string): Promise<Author[]>;
}

interface Paper {
  paperId: string;
  title: string;
  abstract: string;
  year: number;
  citationCount: number;
  authors: Author[];
  journal?: { name: string };
  fieldsOfStudy: string[];
  isOpenAccess: boolean;
  openAccessPdf?: { url: string };
  doi?: string;
}

interface AuthorDetails {
  authorId: string;
  name: string;
  affiliations: string[];
  homepage?: string;
  paperCount: number;
  citationCount: number;
  hIndex: number;
}
```

### 9.2 OpenAlex API

```typescript
// OpenAlex API - free, comprehensive academic database
// https://openalex.org/

interface OpenAlexClient {
  // Search works (papers)
  searchWorks(query: string, filters?: {
    publication_year?: string;  // e.g., "2020-2024"
    type?: string;              // "article", "review", etc.
    is_oa?: boolean;
    cited_by_count?: string;    // e.g., ">100"
  }): Promise<Work[]>;

  // Get institution details
  getInstitution(id: string): Promise<Institution>;

  // Get author with their works
  getAuthor(id: string): Promise<OpenAlexAuthor>;
}
```

### 9.3 Cochrane Library API

```typescript
// For medical/health systematic reviews
// Would need to scrape or use indirect access

interface CochraneSearch {
  searchReviews(query: string): Promise<CochraneReview[]>;
}

interface CochraneReview {
  title: string;
  authors: string[];
  publicationDate: string;
  doi: string;
  abstract: string;
  plainLanguageSummary: string;
  mainResults: string;
  authorsConclusions: string;
}
```

---

## Part 10: Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)

1. **Claim Extraction Service**
   - LLM prompt for extracting discrete claims
   - Claim classification logic
   - Source role detection (article subject vs. cited expert)

2. **Domain Router**
   - Domain detection from claim text
   - Configuration loader for domain-specific sources
   - Query template system

### Phase 2: Evidence Gathering (Week 3-4)

3. **Academic Search Integration**
   - Semantic Scholar API client
   - OpenAlex API client
   - Result normalization across sources

4. **Evidence Tier Classification**
   - Automatic tier assignment based on source type
   - Publication type detection (meta-analysis, RCT, etc.)
   - Quality marker extraction

### Phase 3: Expert Validation (Week 5-6)

5. **Expert Validation Service**
   - Disqualifier pattern matching
   - Credential verification via Semantic Scholar
   - Publication relevance checking

6. **Think Tank Lean Database**
   - Curated database of think tank political leans
   - Automatic disclosure generation

### Phase 4: Consensus Detection (Week 7-8)

7. **Consensus Assessment Engine**
   - Evidence direction analysis
   - Consensus level determination
   - Disagreement summarization for contested topics

8. **Output Generation**
   - Template system for different consensus levels
   - Honest uncertainty reporting
   - Citation formatting

### Phase 5: UI Updates (Week 9-10)

9. **Frontend Components**
   - Evidence tier badges
   - Consensus level indicators
   - Expert credential display
   - Think tank lean disclosure
   - "Values question" handling

10. **Testing & Refinement**
    - Test across multiple domains
    - Edge case handling
    - User feedback integration

---

## Part 11: Testing Checklist

### Claim Extraction
- [ ] Extracts discrete claims (not whole paragraphs)
- [ ] Correctly classifies claim types
- [ ] Identifies article subjects and excludes from expert pool
- [ ] Handles multi-claim sentences
- [ ] Identifies values claims vs. empirical claims

### Domain Routing
- [ ] Correctly detects domain from claim text
- [ ] Falls back gracefully for ambiguous domains
- [ ] Uses appropriate sources for each domain
- [ ] Handles cross-domain claims (e.g., health economics)

### Evidence Gathering
- [ ] Prioritizes systematic reviews and meta-analyses
- [ ] Finds peer-reviewed sources
- [ ] Correctly assigns evidence tiers
- [ ] Includes DOI/citation links
- [ ] Handles domains with sparse research

### Expert Validation
- [ ] Never cites article subjects as experts
- [ ] Excludes politicians from expert pool
- [ ] Verifies academic credentials
- [ ] Discloses think tank political leans
- [ ] Flags potential conflicts of interest

### Consensus Detection
- [ ] Correctly identifies strong consensus topics
- [ ] Presents both sides for contested topics
- [ ] Admits uncertainty when research is insufficient
- [ ] Identifies values questions appropriately
- [ ] Provides honest confidence levels

### Output Quality
- [ ] Uses appropriate framing for consensus level
- [ ] Includes relevant caveats
- [ ] Citations are accurate and verifiable
- [ ] Language is clear and accessible
- [ ] Doesn't overclaim certainty

---

## Part 12: Example Test Cases

### Test Case 1: Death Penalty Article (Original Bug)
**Input**: Slate article about Newsom's death penalty claims
**Expected**:
- Claim: "Death penalty doesn't deter crime" → classified as `causal`, verifiable
- Newsom flagged as `article_subject` → excluded from expert pool
- Domain: `criminology`
- Search finds: NRC 2012 report, Donohue & Wolfers, Nagin papers
- Consensus: `research_inconclusive` (per NRC: "studies are not informative")
- Experts cited: Nagin, Fagan, Donohue (NOT Newsom)

### Test Case 2: Vaccine Safety Article
**Input**: Article claiming vaccines cause autism
**Expected**:
- Claim: "Vaccines cause autism" → classified as `causal`, verifiable
- Domain: `medicine`
- Search finds: Cochrane reviews, multiple large studies
- Consensus: `strong_consensus` (against the claim)
- Output: "Research clearly shows vaccines do not cause autism"

### Test Case 3: Tariffs Article
**Input**: Fox News article claiming tariffs help American workers
**Expected**:
- Claim: "Tariffs help American workers" → classified as `effectiveness`, partially verifiable
- Domain: `economics`
- Search finds: NBER papers, trade economics research
- Consensus: `moderate_consensus` or `active_debate` (economists largely skeptical, some debate on specific cases)
- Both perspectives presented with evidence quality noted

### Test Case 4: Abortion Article
**Input**: Article about whether abortion should be legal
**Expected**:
- Claim: "Abortion should be legal/illegal" → classified as `values`
- Output: "This is a values question that cannot be resolved by empirical research"
- Related empirical questions identified (safety, access effects, etc.)
- No attempt to "fact-check" the moral claim

### Test Case 5: New Supplement Claim
**Input**: Article about a new supplement claiming to improve memory
**Expected**:
- Claim: "Supplement X improves memory" → classified as `causal`, verifiable
- Domain: `medicine` / `nutrition`
- Search finds: Limited or no peer-reviewed research
- Consensus: `insufficient_research`
- Output: "Insufficient peer-reviewed research to evaluate this claim"
- Industry funding noted if applicable

### Test Case 6: Social Media Mental Health
**Input**: Article claiming social media destroys teen mental health
**Expected**:
- Claim: "Social media harms teen mental health" → classified as `causal`, verifiable
- Domain: `psychology`
- Search finds: Studies by Twenge, Haidt (supporting) and Orben, Przybylski (skeptical)
- Consensus: `active_debate`
- Both positions presented fairly with key experts from each side
- Methodology debates explained

---

## Appendix A: Prompt Templates

### A.1 Claim Extraction Prompt

```
You are extracting factual claims from a news article for fact-checking.

ARTICLE:
Title: {title}
Source: {source}
Content: {content}

INSTRUCTIONS:

1. Extract each discrete factual claim (not opinions, rhetoric, or values statements)

2. For each claim, determine:
   - The exact claim text
   - Claim type: empirical, causal, statistical, historical, scientific_consensus,
     predictive, comparative, effectiveness, values, aesthetic, definitional, unfalsifiable
   - Who made this claim (name and role)
   - Whether they are the SUBJECT of this article
   - The academic domain this claim falls under
   - Whether this claim is empirically verifiable

3. CRITICAL: Identify the main subject(s) of this article. Anyone who is the SUBJECT
   of the article (the person being written about, interviewed, profiled, or whose
   claims are being examined) must be marked as article_subject and EXCLUDED from
   being cited as an expert.

OUTPUT FORMAT:
{
  "articleSubjects": ["Name 1", "Name 2"],
  "claims": [
    {
      "id": "claim_1",
      "text": "exact claim text",
      "type": "causal",
      "isVerifiable": true,
      "verifiabilityReason": "This causal claim can be tested with empirical research",
      "source": {
        "name": "Person Name",
        "role": "article_subject",
        "credentials": "Governor of California",
        "isExcludedFromExpertPool": true,
        "exclusionReason": "Article subject - claims are being fact-checked, not used as evidence"
      },
      "domain": "criminology",
      "subDomain": "deterrence"
    }
  ]
}

Remember:
- Politicians are NEVER experts for empirical claims (they are claimants)
- CEOs are NEVER experts for claims about their own companies
- Article subjects are NEVER experts for the claims being examined
- "Should" statements are ALWAYS values claims
- Be specific about claim types - don't default to "empirical" for everything
```

### A.2 Evidence Synthesis Prompt

```
You are synthesizing research evidence for a fact-check.

CLAIM TO EVALUATE:
"{claimText}"

CLAIM TYPE: {claimType}
DOMAIN: {domain}
ARTICLE SUBJECT (exclude as expert): {articleSubject}

SEARCH RESULTS:
{searchResults}

INSTRUCTIONS:

1. NEVER cite {articleSubject} as an expert - they are the subject of fact-checking

2. Evaluate the evidence by tier:
   - Tier 1: Systematic reviews, meta-analyses, major reports (NRC, Cochrane, IPCC)
   - Tier 2: Peer-reviewed journal articles, RCTs
   - Tier 3: Working papers, government statistics
   - Tier 4: Expert opinions (verified experts only)
   - Tier 5: NOT EVIDENCE - politicians, advocates, article subjects

3. Determine consensus level:
   - strong_consensus: >90% of quality research agrees
   - moderate_consensus: 70-90% agree
   - active_debate: Legitimate expert disagreement
   - emerging_research: Too new, consensus forming
   - insufficient_research: Not enough quality studies
   - values_question: Not an empirical question

4. For active_debate, present BOTH positions fairly with their evidence

5. Be honest about limitations and uncertainty

OUTPUT FORMAT:
{
  "consensusLevel": "moderate_consensus",
  "confidence": "medium",

  "bottomLine": {
    "summary": "One sentence summary of what research shows",
    "framingSentence": "Most research suggests X, though some debate exists"
  },

  "evidenceFor": [
    {
      "finding": "What the study found",
      "source": "Full citation",
      "tier": 2,
      "tierLabel": "Peer-Reviewed",
      "year": 2023,
      "url": "https://..."
    }
  ],

  "evidenceAgainst": [...],

  "expertVoices": [
    {
      "name": "Expert Name",
      "credentials": "Professor of X at Y University",
      "statement": "Direct quote or paraphrase",
      "position": "supports",
      "isValidExpert": true,
      "validationReason": "Has PhD in relevant field, published on topic"
    }
  ],

  "keyStudies": [
    {
      "title": "Study title",
      "authors": "Author et al.",
      "publication": "Journal Name",
      "year": 2023,
      "studyType": "meta-analysis",
      "finding": "Key finding",
      "doi": "...",
      "url": "..."
    }
  ],

  "caveats": [
    "Any important limitations or context"
  ],

  "notCitedAndWhy": [
    {
      "name": "{articleSubject}",
      "reason": "Article subject - claims are being evaluated, not used as evidence"
    }
  ]
}

CRITICAL RULES:
- Only cite actual researchers with relevant credentials as experts
- Prefer meta-analyses and systematic reviews over individual studies
- If research is insufficient, say so honestly
- If experts genuinely disagree, present both sides
- Never manufacture consensus where it doesn't exist
- Never cite politicians as scientific experts
```

---

## Appendix B: UI Component Specifications

### B.1 Evidence Tier Badge

```tsx
interface EvidenceTierBadgeProps {
  tier: 1 | 2 | 3 | 4;
  label: string;
}

const tierStyles = {
  1: { bg: 'green', icon: '◆◆◆', label: 'Systematic Review' },
  2: { bg: 'blue', icon: '◆◆○', label: 'Peer-Reviewed' },
  3: { bg: 'yellow', icon: '◆○○', label: 'Working Paper' },
  4: { bg: 'gray', icon: '○○○', label: 'Expert Opinion' },
};
```

### B.2 Consensus Level Indicator

```tsx
interface ConsensusIndicatorProps {
  level: ConsensusLevel;
  confidence: 'high' | 'medium' | 'low';
}

const consensusStyles = {
  strong_consensus: { color: 'green', icon: '✓', text: 'Clear Evidence' },
  moderate_consensus: { color: 'blue', icon: '◐', text: 'Mostly Supported' },
  active_debate: { color: 'yellow', icon: '⟷', text: 'Experts Disagree' },
  emerging_research: { color: 'orange', icon: '◔', text: 'Early Research' },
  insufficient_research: { color: 'gray', icon: '?', text: 'Insufficient Data' },
  values_question: { color: 'purple', icon: '⚖', text: 'Values Question' },
};
```

### B.3 Think Tank Disclosure

```tsx
interface ThinkTankDisclosureProps {
  name: string;
  lean: 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'libertarian';
}

// Display: "Source: Brookings Institution (center-left think tank)"
```

### B.4 Article Subject Warning

```tsx
// When article subject is mentioned but excluded from experts
<Warning>
  Note: {name}'s claims are the subject of this fact-check and are
  evaluated against independent research, not used as evidence.
</Warning>
```

---

This spec provides a comprehensive framework for building a universal evidence-based evaluation system that can handle any topic while being honest about the limits of knowledge.
