# ClearView News: Expert Assembly System - Wave Implementation Guide

## Overview

This document provides a sequential wave-based implementation plan for the Expert Assembly System described in `EXPERT_EVALUATION_SPEC.md`. Each wave builds on the previous, with manual verification checkpoints between agents.

**Working Directory**: `/Users/philipjcortes/Desktop/_catchall/Basic_News/clearview-news/worktrees/expert-assembly`

**Branch**: `feature/expert-assembly`

---

## Subagent Strategy

```xml
<subagent_strategy>
  <description>
    Sequential wave execution with MANUAL VERIFICATION between each step.
    - Each agent runs tests via npm test
    - Human verifies output before proceeding
    - curl commands validate integration
    - Commit after each wave passes
  </description>

  <execution_mode>SEQUENTIAL_WITH_MANUAL_CHECKPOINTS</execution_mode>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!--                        WAVE 1: CLAIM EXTRACTION                          -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->

  <wave number="1" title="Claim Extraction Pipeline">

    <agent id="1" name="test-claim-extractor">
      <task>Write TDD tests for claim extraction service</task>
      <instructions>
        1. Create backend/src/services/__tests__/claimExtractor.test.ts
        2. Test extractClaims() returns array of ClassifiedClaim objects
        3. Test identifies article subjects correctly
        4. Test classifies claim types (empirical, causal, statistical, values, etc.)
        5. Test excludes article subjects from expert pool

        File: backend/src/services/__tests__/claimExtractor.test.ts
        Reference: EXPERT_EVALUATION_SPEC.md Part 3
      </instructions>
      <verification>cd backend && npm test -- claimExtractor.test.ts</verification>
      <expected_result>Tests collected, FAILURES expected (TDD Red phase)</expected_result>
    </agent>

    <manual_checkpoint id="mc-1" after="agent-1">
      <verify>
        ls -la backend/src/services/__tests__/claimExtractor.test.ts
        cd backend && npm test -- claimExtractor.test.ts --collect-only 2>&1 | head -20
      </verify>
      <expect>Test file exists, tests collected</expect>
      <proceed_when>Human confirms tests exist and structure looks correct</proceed_when>
    </manual_checkpoint>

    <agent id="2" name="implement-claim-extractor">
      <task>Implement ClaimExtractor service</task>
      <depends_on>manual-checkpoint-mc-1</depends_on>
      <instructions>
        1. Create backend/src/services/claimExtractor.ts
        2. Define ClassifiedClaim interface matching spec
        3. Define ClaimType enum (empirical, causal, statistical, etc.)
        4. Implement extractClaims(article: Article): Promise&lt;ExtractedClaims&gt;
        5. Use OpenAI to extract and classify claims
        6. Implement article subject detection

        File: backend/src/services/claimExtractor.ts
        Types: backend/src/types/claims.ts
        Prompt: Use CLAIM_CLASSIFICATION_PROMPT from spec
      </instructions>
      <verification>cd backend && npm test -- claimExtractor.test.ts</verification>
      <expected_result>ALL tests PASS (TDD Green phase)</expected_result>
    </agent>

    <manual_checkpoint id="mc-2" after="agent-2">
      <verify>
        # Verify tests pass
        cd backend && npm test -- claimExtractor.test.ts 2>&1 | tail -15

        # Verify imports work
        cd backend && npx ts-node -e "import { extractClaims } from './src/services/claimExtractor'; console.log('Import OK')"
      </verify>
      <expect>All tests pass, imports work</expect>
      <proceed_when>Human confirms all tests GREEN</proceed_when>
    </manual_checkpoint>

    <agent id="3" name="test-claim-classifier">
      <task>Write TDD tests for claim type classification</task>
      <depends_on>manual-checkpoint-mc-2</depends_on>
      <instructions>
        1. Create backend/src/services/__tests__/claimClassifier.test.ts
        2. Test verifiable claim detection (empirical, causal, statistical)
        3. Test partially verifiable claims (predictive, comparative)
        4. Test non-verifiable claims (values, aesthetic, definitional)
        5. Test returns correct domain for each claim

        File: backend/src/services/__tests__/claimClassifier.test.ts
        Reference: EXPERT_EVALUATION_SPEC.md Section 3.1
      </instructions>
      <verification>cd backend && npm test -- claimClassifier.test.ts</verification>
    </agent>

    <agent id="4" name="implement-claim-classifier">
      <task>Implement claim type classifier</task>
      <depends_on>agent-3 tests written</depends_on>
      <instructions>
        1. Create backend/src/services/claimClassifier.ts
        2. Implement classifyClaim(text: string): ClaimClassification
        3. Implement isVerifiable(claimType: ClaimType): boolean
        4. Implement detectDomain(claimText: string): Domain
        5. Add verifiability reasons for each type

        File: backend/src/services/claimClassifier.ts
      </instructions>
      <verification>cd backend && npm test -- claimClassifier.test.ts</verification>
    </agent>

    <manual_checkpoint id="mc-3" after="agent-4">
      <verify>
        # Run BOTH test files
        cd backend && npm test -- claimExtractor.test.ts claimClassifier.test.ts 2>&1 | tail -20
      </verify>
      <expect>All tests pass for both features</expect>
      <proceed_when>Human confirms cumulative tests pass</proceed_when>
    </manual_checkpoint>

    <wave_checkpoint id="wc-1" after="wave-1">
      <description>WAVE 1 COMPLETE - Claim extraction pipeline</description>
      <verify>
        # 1. Run ALL claim tests
        cd backend && npm test -- --testPathPattern="claim" 2>&1 | tail -30

        # 2. Verify all modules import
        cd backend && npx ts-node -e "
          import { extractClaims } from './src/services/claimExtractor';
          import { classifyClaim, detectDomain } from './src/services/claimClassifier';
          console.log('All claim modules import OK');
        "

        # 3. Start server and health check
        cd backend && npm start &
        sleep 5
        curl -s http://localhost:3000/health | jq .

        # 4. Test claim extraction endpoint (if implemented)
        curl -X POST http://localhost:3000/api/v1/test/extract-claims \
          -H "Content-Type: application/json" \
          -d '{"title":"Test","source":"Test","content":"The governor claims taxes should be higher. Studies show tax increases reduce growth."}' \
          2>&1 | head -30
      </verify>
      <expect>
        - All claim tests pass
        - All imports succeed
        - Server health OK
      </expect>
      <commit>
        git add -A
        git commit -m "feat(claims): Wave 1 complete - claim extraction and classification

- Add ClaimExtractor service with OpenAI integration
- Add ClaimClassifier with type detection
- Support all claim types: empirical, causal, statistical, values, etc.
- Article subject detection and exclusion

Co-Authored-By: Claude <noreply@anthropic.com>"
      </commit>
    </wave_checkpoint>

  </wave>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!--                        WAVE 2: DOMAIN ROUTING                            -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->

  <wave number="2" title="Domain-Specific Source Routing">

    <agent id="5" name="test-domain-router">
      <task>Write TDD tests for domain router</task>
      <depends_on>wave-checkpoint-wc-1</depends_on>
      <instructions>
        1. Create backend/src/services/__tests__/domainRouter.test.ts
        2. Test routes medicine claims to Cochrane, PubMed
        3. Test routes economics claims to NBER, SSRN
        4. Test routes climate claims to IPCC sources
        5. Test routes criminology claims to NRC, DOJ
        6. Test returns correct query templates per domain

        File: backend/src/services/__tests__/domainRouter.test.ts
        Reference: EXPERT_EVALUATION_SPEC.md Part 4
      </instructions>
      <verification>cd backend && npm test -- domainRouter.test.ts</verification>
    </agent>

    <agent id="6" name="implement-domain-router">
      <task>Implement domain router with source configurations</task>
      <depends_on>agent-5 tests written</depends_on>
      <instructions>
        1. Create backend/src/services/domainRouter.ts
        2. Create backend/src/config/domainConfigs.ts with all domain configs
        3. Implement getDomainConfig(domain: Domain): DomainConfig
        4. Implement buildSearchQueries(claim: ClassifiedClaim): string[]
        5. Include all domains: medicine, climate, economics, criminology, psychology, nutrition, politicalScience, technology, education

        Files:
        - backend/src/services/domainRouter.ts
        - backend/src/config/domainConfigs.ts
        Reference: EXPERT_EVALUATION_SPEC.md Section 4.2
      </instructions>
      <verification>cd backend && npm test -- domainRouter.test.ts</verification>
    </agent>

    <manual_checkpoint id="mc-4" after="agent-6">
      <verify>
        cd backend && npm test -- domainRouter.test.ts 2>&1 | tail -15

        # Verify domain config loaded
        cd backend && npx ts-node -e "
          import { DOMAIN_CONFIGS } from './src/config/domainConfigs';
          console.log('Domains:', Object.keys(DOMAIN_CONFIGS).join(', '));
        "
      </verify>
      <expect>Tests pass, all domains configured</expect>
    </manual_checkpoint>

    <agent id="7" name="test-think-tank-database">
      <task>Write TDD tests for think tank lean database</task>
      <depends_on>manual-checkpoint-mc-4</depends_on>
      <instructions>
        1. Create backend/src/services/__tests__/thinkTankLean.test.ts
        2. Test brookings.edu returns center-left
        3. Test heritage.org returns right
        4. Test cato.org returns libertarian
        5. Test nber.org returns academic
        6. Test unknown domains return null

        File: backend/src/services/__tests__/thinkTankLean.test.ts
        Reference: EXPERT_EVALUATION_SPEC.md Section 5.2
      </instructions>
      <verification>cd backend && npm test -- thinkTankLean.test.ts</verification>
    </agent>

    <agent id="8" name="implement-think-tank-database">
      <task>Implement think tank political lean database</task>
      <depends_on>agent-7 tests written</depends_on>
      <instructions>
        1. Create backend/src/config/thinkTankLeans.ts
        2. Implement getThinkTankLean(url: string): ThinkTankLean | null
        3. Include all think tanks from spec
        4. Return lean label and description

        File: backend/src/config/thinkTankLeans.ts
      </instructions>
      <verification>cd backend && npm test -- thinkTankLean.test.ts</verification>
    </agent>

    <wave_checkpoint id="wc-2" after="wave-2">
      <description>WAVE 2 COMPLETE - Domain routing and think tank database</description>
      <verify>
        # Run all Wave 2 tests
        cd backend && npm test -- --testPathPattern="domain|thinkTank" 2>&1 | tail -25

        # Verify all configs load
        cd backend && npx ts-node -e "
          import { DOMAIN_CONFIGS } from './src/config/domainConfigs';
          import { getThinkTankLean } from './src/config/thinkTankLeans';
          console.log('Medicine sources:', DOMAIN_CONFIGS.medicine.academicSources.databases);
          console.log('Brookings lean:', getThinkTankLean('brookings.edu'));
        "
      </verify>
      <commit>
        git add -A
        git commit -m "feat(routing): Wave 2 complete - domain router and think tank database

- Add domain router with 9 academic domains
- Add domain-specific source configurations
- Add think tank political lean database
- Query template system per domain

Co-Authored-By: Claude <noreply@anthropic.com>"
      </commit>
    </wave_checkpoint>

  </wave>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!--                        WAVE 3: EVIDENCE GATHERING                        -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->

  <wave number="3" title="Evidence Gathering with Tier Classification">

    <agent id="9" name="test-evidence-tier">
      <task>Write TDD tests for evidence tier classification</task>
      <depends_on>wave-checkpoint-wc-2</depends_on>
      <instructions>
        1. Create backend/src/services/__tests__/evidenceTier.test.ts
        2. Test Cochrane reviews = Tier 1
        3. Test NEJM articles = Tier 2
        4. Test NBER working papers = Tier 3
        5. Test think tank reports = Tier 4 with lean disclosure
        6. Test politician statements = Tier 5 (excluded)

        File: backend/src/services/__tests__/evidenceTier.test.ts
        Reference: EXPERT_EVALUATION_SPEC.md Part 5
      </instructions>
      <verification>cd backend && npm test -- evidenceTier.test.ts</verification>
    </agent>

    <agent id="10" name="implement-evidence-tier">
      <task>Implement evidence tier classification</task>
      <depends_on>agent-9 tests written</depends_on>
      <instructions>
        1. Create backend/src/services/evidenceTier.ts
        2. Define EvidenceTier enum (TIER_1 through TIER_5)
        3. Implement classifySource(source: Source): EvidenceTier
        4. Implement getTierLabel(tier: EvidenceTier): string
        5. Implement isValidEvidence(tier: EvidenceTier): boolean

        File: backend/src/services/evidenceTier.ts
      </instructions>
      <verification>cd backend && npm test -- evidenceTier.test.ts</verification>
    </agent>

    <manual_checkpoint id="mc-5" after="agent-10">
      <verify>
        cd backend && npm test -- evidenceTier.test.ts 2>&1 | tail -15
      </verify>
      <expect>All tier classification tests pass</expect>
    </manual_checkpoint>

    <agent id="11" name="test-semantic-scholar-client">
      <task>Write TDD tests for Semantic Scholar API client</task>
      <depends_on>manual-checkpoint-mc-5</depends_on>
      <instructions>
        1. Create backend/src/services/__tests__/semanticScholar.test.ts
        2. Test searchPapers returns Paper[] with correct fields
        3. Test getAuthor returns author with hIndex, citations
        4. Test validateResearcher checks publication count
        5. Mock API responses for unit tests

        File: backend/src/services/__tests__/semanticScholar.test.ts
        Reference: EXPERT_EVALUATION_SPEC.md Section 9.1
      </instructions>
      <verification>cd backend && npm test -- semanticScholar.test.ts</verification>
    </agent>

    <agent id="12" name="implement-semantic-scholar-client">
      <task>Implement Semantic Scholar API client</task>
      <depends_on>agent-11 tests written</depends_on>
      <instructions>
        1. Create backend/src/services/semanticScholar.ts
        2. Implement searchPapers(query, options): Promise&lt;Paper[]&gt;
        3. Implement getAuthor(authorId): Promise&lt;AuthorDetails&gt;
        4. Implement validateResearcher(name): Promise&lt;AuthorInfo | null&gt;
        5. Add retry logic and error handling

        File: backend/src/services/semanticScholar.ts
        API: https://api.semanticscholar.org/
      </instructions>
      <verification>cd backend && npm test -- semanticScholar.test.ts</verification>
    </agent>

    <agent id="13" name="test-evidence-gatherer">
      <task>Write TDD tests for evidence gatherer service</task>
      <depends_on>agent-12 passes</depends_on>
      <instructions>
        1. Create backend/src/services/__tests__/evidenceGatherer.test.ts
        2. Test gathers evidence from domain-appropriate sources
        3. Test prioritizes systematic reviews over individual studies
        4. Test excludes article subjects from evidence
        5. Test assigns correct tiers to gathered evidence
        6. Test deduplicates sources

        File: backend/src/services/__tests__/evidenceGatherer.test.ts
      </instructions>
      <verification>cd backend && npm test -- evidenceGatherer.test.ts</verification>
    </agent>

    <agent id="14" name="implement-evidence-gatherer">
      <task>Implement evidence gatherer service</task>
      <depends_on>agent-13 tests written</depends_on>
      <instructions>
        1. Create backend/src/services/evidenceGatherer.ts
        2. Implement gatherEvidence(claim: ClassifiedClaim): Promise&lt;EvidenceSource[]&gt;
        3. Use domain router for source selection
        4. Search Exa + Semantic Scholar in parallel
        5. Classify each source by tier
        6. Exclude article subjects

        File: backend/src/services/evidenceGatherer.ts
      </instructions>
      <verification>cd backend && npm test -- evidenceGatherer.test.ts</verification>
    </agent>

    <wave_checkpoint id="wc-3" after="wave-3">
      <description>WAVE 3 COMPLETE - Evidence gathering with tier classification</description>
      <verify>
        # Run all Wave 3 tests
        cd backend && npm test -- --testPathPattern="evidence|semantic" 2>&1 | tail -30

        # Integration test with real API (optional)
        cd backend && npx ts-node -e "
          import { searchPapers } from './src/services/semanticScholar';
          searchPapers('death penalty deterrence', { limit: 3 })
            .then(papers => console.log('Found papers:', papers.map(p => p.title)))
            .catch(err => console.log('API Error (OK in test):', err.message));
        "
      </verify>
      <commit>
        git add -A
        git commit -m "feat(evidence): Wave 3 complete - evidence gathering with tier classification

- Add evidence tier system (Tier 1-5)
- Add Semantic Scholar API client
- Add evidence gatherer with domain routing
- Automatic tier classification
- Article subject exclusion

Co-Authored-By: Claude <noreply@anthropic.com>"
      </commit>
    </wave_checkpoint>

  </wave>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!--                        WAVE 4: EXPERT VALIDATION                         -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->

  <wave number="4" title="Expert Validation System">

    <agent id="15" name="test-expert-validator">
      <task>Write TDD tests for expert validation</task>
      <depends_on>wave-checkpoint-wc-3</depends_on>
      <instructions>
        1. Create backend/src/services/__tests__/expertValidator.test.ts
        2. Test excludes article subjects
        3. Test excludes politicians (senator, governor, etc.)
        4. Test excludes lobbyists and advocates
        5. Test validates PhD credentials
        6. Test validates research institution affiliation
        7. Test validates relevant publications via Semantic Scholar

        File: backend/src/services/__tests__/expertValidator.test.ts
        Reference: EXPERT_EVALUATION_SPEC.md Part 7
      </instructions>
      <verification>cd backend && npm test -- expertValidator.test.ts</verification>
    </agent>

    <agent id="16" name="implement-expert-validator">
      <task>Implement expert validation service</task>
      <depends_on>agent-15 tests written</depends_on>
      <instructions>
        1. Create backend/src/services/expertValidator.ts
        2. Implement validateExpert(person, articleSubject, domain): ExpertValidation
        3. Add POLITICIAN_PATTERNS regex array
        4. Add ADVOCACY_ORG_PATTERNS regex array
        5. Add RESEARCH_INSTITUTION_PATTERNS regex array
        6. Add DEGREE_PATTERNS regex array
        7. Check publications via Semantic Scholar

        File: backend/src/services/expertValidator.ts
        Reference: EXPERT_EVALUATION_SPEC.md Section 7.2
      </instructions>
      <verification>cd backend && npm test -- expertValidator.test.ts</verification>
    </agent>

    <manual_checkpoint id="mc-6" after="agent-16">
      <verify>
        cd backend && npm test -- expertValidator.test.ts 2>&1 | tail -20

        # Test with real examples
        cd backend && npx ts-node -e "
          import { validateExpert } from './src/services/expertValidator';

          // Should be excluded (politician)
          const gov = validateExpert(
            { name: 'Gavin Newsom', title: 'Governor of California' },
            'Gavin Newsom',
            'criminology'
          );
          console.log('Governor valid?', gov.isValidExpert, '-', gov.validationReason);

          // Should be valid (researcher)
          const prof = validateExpert(
            { name: 'Daniel Nagin', title: 'Professor', affiliation: 'Carnegie Mellon University' },
            'Gavin Newsom',
            'criminology'
          );
          console.log('Professor valid?', prof.isValidExpert);
        "
      </verify>
      <expect>Tests pass, validation logic works correctly</expect>
    </manual_checkpoint>

    <wave_checkpoint id="wc-4" after="wave-4">
      <description>WAVE 4 COMPLETE - Expert validation system</description>
      <verify>
        cd backend && npm test -- --testPathPattern="expert" 2>&1 | tail -25
      </verify>
      <commit>
        git add -A
        git commit -m "feat(experts): Wave 4 complete - expert validation system

- Add expert validator with disqualifier patterns
- Exclude politicians, lobbyists, advocates, article subjects
- Validate credentials (PhD, MD, etc.)
- Validate research institution affiliation
- Semantic Scholar publication verification

Co-Authored-By: Claude <noreply@anthropic.com>"
      </commit>
    </wave_checkpoint>

  </wave>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!--                        WAVE 5: CONSENSUS DETECTION                       -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->

  <wave number="5" title="Consensus Detection and Assessment">

    <agent id="17" name="test-consensus-detector">
      <task>Write TDD tests for consensus detection</task>
      <depends_on>wave-checkpoint-wc-4</depends_on>
      <instructions>
        1. Create backend/src/services/__tests__/consensusDetector.test.ts
        2. Test strong_consensus when >90% evidence agrees
        3. Test moderate_consensus when 70-90% agrees
        4. Test active_debate when experts disagree
        5. Test insufficient_research when <3 quality studies
        6. Test values_question for non-empirical claims
        7. Test returns correct framing sentence for each level

        File: backend/src/services/__tests__/consensusDetector.test.ts
        Reference: EXPERT_EVALUATION_SPEC.md Part 6
      </instructions>
      <verification>cd backend && npm test -- consensusDetector.test.ts</verification>
    </agent>

    <agent id="18" name="implement-consensus-detector">
      <task>Implement consensus detection service</task>
      <depends_on>agent-17 tests written</depends_on>
      <instructions>
        1. Create backend/src/services/consensusDetector.ts
        2. Define ConsensusLevel type
        3. Implement assessConsensus(claim, evidence): ConsensusAssessment
        4. Calculate support ratio from evidence directions
        5. Generate appropriate framing sentences
        6. Handle contested topics with both positions

        File: backend/src/services/consensusDetector.ts
        Reference: EXPERT_EVALUATION_SPEC.md Section 6.2
      </instructions>
      <verification>cd backend && npm test -- consensusDetector.test.ts</verification>
    </agent>

    <manual_checkpoint id="mc-7" after="agent-18">
      <verify>
        cd backend && npm test -- consensusDetector.test.ts 2>&1 | tail -20
      </verify>
      <expect>All consensus detection tests pass</expect>
    </manual_checkpoint>

    <wave_checkpoint id="wc-5" after="wave-5">
      <description>WAVE 5 COMPLETE - Consensus detection</description>
      <verify>
        cd backend && npm test -- --testPathPattern="consensus" 2>&1 | tail -25
      </verify>
      <commit>
        git add -A
        git commit -m "feat(consensus): Wave 5 complete - consensus detection system

- Add consensus level detection
- Support all levels: strong, moderate, active_debate, insufficient, values
- Evidence direction analysis
- Automatic framing sentence generation
- Both-sides presentation for contested topics

Co-Authored-By: Claude <noreply@anthropic.com>"
      </commit>
    </wave_checkpoint>

  </wave>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!--                        WAVE 6: OUTPUT GENERATION                         -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->

  <wave number="6" title="Honest Output Generation">

    <agent id="19" name="test-output-generator">
      <task>Write TDD tests for output generation</task>
      <depends_on>wave-checkpoint-wc-5</depends_on>
      <instructions>
        1. Create backend/src/services/__tests__/outputGenerator.test.ts
        2. Test strong_consensus uses "Research Clearly Shows" header
        3. Test active_debate presents both positions
        4. Test values_question explains non-empirical nature
        5. Test includes proper caveats per consensus level
        6. Test never cites article subject as expert

        File: backend/src/services/__tests__/outputGenerator.test.ts
        Reference: EXPERT_EVALUATION_SPEC.md Part 8
      </instructions>
      <verification>cd backend && npm test -- outputGenerator.test.ts</verification>
    </agent>

    <agent id="20" name="implement-output-generator">
      <task>Implement output generation with templates</task>
      <depends_on>agent-19 tests written</depends_on>
      <instructions>
        1. Create backend/src/services/outputGenerator.ts
        2. Create backend/src/config/outputTemplates.ts
        3. Implement generateOutput(consensus, evidence, experts): EvidenceOutput
        4. Use templates from OUTPUT_TEMPLATES in spec
        5. Include tier badges, confidence levels
        6. Add article subject warning when applicable

        Files:
        - backend/src/services/outputGenerator.ts
        - backend/src/config/outputTemplates.ts
        Reference: EXPERT_EVALUATION_SPEC.md Section 8.1
      </instructions>
      <verification>cd backend && npm test -- outputGenerator.test.ts</verification>
    </agent>

    <wave_checkpoint id="wc-6" after="wave-6">
      <description>WAVE 6 COMPLETE - Output generation</description>
      <verify>
        cd backend && npm test -- --testPathPattern="output" 2>&1 | tail -25
      </verify>
      <commit>
        git add -A
        git commit -m "feat(output): Wave 6 complete - honest output generation

- Add output templates per consensus level
- Proper framing for strong/moderate/contested/unknown
- Values question handling
- Article subject exclusion warnings
- Tier badges and confidence levels

Co-Authored-By: Claude <noreply@anthropic.com>"
      </commit>
    </wave_checkpoint>

  </wave>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!--                        WAVE 7: FULL INTEGRATION                          -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->

  <wave number="7" title="Full Pipeline Integration">

    <agent id="21" name="test-full-pipeline">
      <task>Write integration tests for full evaluation pipeline</task>
      <depends_on>wave-checkpoint-wc-6</depends_on>
      <instructions>
        1. Create backend/src/services/__tests__/evaluationPipeline.integration.test.ts
        2. Test full flow: article -> claims -> evidence -> consensus -> output
        3. Test death penalty article (Newsom excluded, NRC cited)
        4. Test vaccine safety article (strong consensus)
        5. Test social media article (active debate)
        6. Test values question article (ethics)

        File: backend/src/services/__tests__/evaluationPipeline.integration.test.ts
        Reference: EXPERT_EVALUATION_SPEC.md Part 12
      </instructions>
      <verification>cd backend && npm test -- evaluationPipeline.integration.test.ts</verification>
    </agent>

    <agent id="22" name="implement-evaluation-pipeline">
      <task>Implement full evaluation pipeline orchestrator</task>
      <depends_on>agent-21 tests written</depends_on>
      <instructions>
        1. Create backend/src/services/evaluationPipeline.ts
        2. Implement evaluateArticle(article): Promise&lt;EvaluationResult&gt;
        3. Orchestrate: extractClaims -> gatherEvidence -> validateExperts -> assessConsensus -> generateOutput
        4. Run evidence gathering in parallel for all claims
        5. Add logging for each step

        File: backend/src/services/evaluationPipeline.ts
      </instructions>
      <verification>cd backend && npm test -- evaluationPipeline.integration.test.ts</verification>
    </agent>

    <agent id="23" name="implement-evidence-endpoint">
      <task>Update /api/v1/evidence endpoint to use new pipeline</task>
      <depends_on>agent-22 passes</depends_on>
      <instructions>
        1. Update backend/src/controllers/evidenceController.ts
        2. Replace old getEvidence with new evaluationPipeline
        3. Return structured response with claims, consensus, evidence, experts
        4. Add streaming support for long evaluations (SSE)

        File: backend/src/controllers/evidenceController.ts
      </instructions>
      <verification>
        cd backend && npm start &
        sleep 5
        curl -X POST http://localhost:3000/api/v1/evidence \
          -H "Content-Type: application/json" \
          -d '{"topic":"death penalty deterrence","coreArgument":"Death penalty does not deter crime"}' \
          --max-time 120
      </verification>
    </agent>

    <final_checkpoint id="fc-1">
      <description>FINAL VALIDATION - Full pipeline E2E testing</description>
      <verify>
        # 1. Run full test suite
        cd backend && npm test 2>&1 | tail -30

        # 2. Start server
        cd backend && npm start &
        sleep 5

        # 3. Health check
        curl -s http://localhost:3000/health | jq .

        # 4. Test death penalty article (main test case)
        curl -X POST http://localhost:3000/api/v1/evidence \
          -H "Content-Type: application/json" \
          -d '{
            "topic": "death penalty deterrence",
            "coreArgument": "The death penalty does not deter crime",
            "articleSubject": "Gavin Newsom"
          }' \
          --max-time 120 | jq '.consensusLevel, .expertVoices[0].name'

        # 5. Verify Newsom NOT in experts
        # Expected: consensusLevel = "research_inconclusive" or similar
        # Expected: Newsom not in expertVoices

        # 6. Test values question
        curl -X POST http://localhost:3000/api/v1/evidence \
          -H "Content-Type: application/json" \
          -d '{
            "topic": "abortion ethics",
            "coreArgument": "Abortion should be legal"
          }' \
          --max-time 60 | jq '.consensusLevel'
        # Expected: "values_question"
      </verify>
      <expect>
        - All tests pass
        - Death penalty returns research_inconclusive, excludes Newsom
        - Abortion returns values_question
        - No errors in server logs
      </expect>
      <commit>
        git add -A
        git commit -m "feat: Expert Assembly System complete - all waves validated

Summary:
- Wave 1: Claim extraction and classification
- Wave 2: Domain routing with 9 academic domains
- Wave 3: Evidence gathering with tier system
- Wave 4: Expert validation (excludes politicians, advocates)
- Wave 5: Consensus detection
- Wave 6: Honest output generation
- Wave 7: Full pipeline integration

Key improvements:
- Never cites article subjects as experts
- Evidence hierarchy (Tier 1-5)
- Honest uncertainty reporting
- Values question detection
- Think tank lean disclosure

Tests: All passing

Co-Authored-By: Claude <noreply@anthropic.com>"
      </commit>
    </final_checkpoint>

  </wave>

</subagent_strategy>
```

---

## Quick Reference

### Wave Summary

| Wave | Title | Key Deliverables |
|------|-------|------------------|
| 1 | Claim Extraction | extractClaims, classifyClaim, detectDomain |
| 2 | Domain Routing | domainRouter, thinkTankLeans |
| 3 | Evidence Gathering | evidenceTier, semanticScholar, evidenceGatherer |
| 4 | Expert Validation | expertValidator with disqualifier patterns |
| 5 | Consensus Detection | assessConsensus, ConsensusLevel types |
| 6 | Output Generation | outputGenerator, outputTemplates |
| 7 | Full Integration | evaluationPipeline, updated /evidence endpoint |

### Test Commands

```bash
# Run specific wave tests
cd backend && npm test -- --testPathPattern="claim"        # Wave 1
cd backend && npm test -- --testPathPattern="domain"       # Wave 2
cd backend && npm test -- --testPathPattern="evidence"     # Wave 3
cd backend && npm test -- --testPathPattern="expert"       # Wave 4
cd backend && npm test -- --testPathPattern="consensus"    # Wave 5
cd backend && npm test -- --testPathPattern="output"       # Wave 6
cd backend && npm test -- --testPathPattern="pipeline"     # Wave 7

# Run all tests
cd backend && npm test
```

### Key Files to Create

```
backend/src/
├── types/
│   └── claims.ts              # ClassifiedClaim, ClaimType, etc.
├── config/
│   ├── domainConfigs.ts       # All domain configurations
│   ├── thinkTankLeans.ts      # Political lean database
│   └── outputTemplates.ts     # Output templates per consensus
├── services/
│   ├── claimExtractor.ts      # Extract claims from articles
│   ├── claimClassifier.ts     # Classify claim types
│   ├── domainRouter.ts        # Route to domain sources
│   ├── evidenceTier.ts        # Classify evidence tiers
│   ├── semanticScholar.ts     # Semantic Scholar API client
│   ├── evidenceGatherer.ts    # Gather and classify evidence
│   ├── expertValidator.ts     # Validate expert credentials
│   ├── consensusDetector.ts   # Detect consensus level
│   ├── outputGenerator.ts     # Generate honest output
│   └── evaluationPipeline.ts  # Orchestrate full flow
└── services/__tests__/
    └── *.test.ts              # Tests for each service
```
