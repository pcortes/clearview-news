/**
 * TDD Tests for ClaimExtractor Service
 * Wave 1, Agent 1 - Tests for claim extraction pipeline
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Part 3
 */

import { extractClaims } from '../claimExtractor';
import {
  Article,
  ExtractedClaims,
  ClassifiedClaim,
  ClaimType,
} from '../../types/claims';
import { openaiService } from '../openai';

// Mock the OpenAI service to avoid actual API calls in tests
jest.mock('../openai', () => ({
  openaiService: {
    complete: jest.fn(),
  },
}));

const mockComplete = openaiService.complete as jest.MockedFunction<typeof openaiService.complete>;

describe('ClaimExtractor Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractClaims', () => {
    it('should return an ExtractedClaims object with articleSubjects and claims arrays', async () => {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        articleSubjects: [],
        claims: [],
      }));

      const article: Article = {
        title: 'Test Article',
        source: 'Test Source',
        content: 'This is a test article with some claims.',
      };

      const result = await extractClaims(article);

      expect(result).toHaveProperty('articleSubjects');
      expect(result).toHaveProperty('claims');
      expect(Array.isArray(result.articleSubjects)).toBe(true);
      expect(Array.isArray(result.claims)).toBe(true);
    });

    it('should extract discrete claims from article content', async () => {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        articleSubjects: ['Gavin Newsom'],
        claims: [
          {
            id: 'claim_1',
            text: "Studies show the death penalty doesn't deter crime",
            type: 'causal',
            isVerifiable: true,
            source: { name: 'Gavin Newsom', role: 'article_subject', isExcludedFromExpertPool: true },
            domain: 'criminology',
          },
          {
            id: 'claim_2',
            text: 'The death penalty is applied unequally based on race',
            type: 'statistical',
            isVerifiable: true,
            source: { name: 'Gavin Newsom', role: 'article_subject', isExcludedFromExpertPool: true },
            domain: 'criminology',
          },
        ],
      }));

      const article: Article = {
        title: 'Death Penalty Article',
        source: 'Slate',
        content: `
          Governor Gavin Newsom announced a moratorium on the death penalty.
          "Studies show the death penalty doesn't deter crime," Newsom said.
          The governor also claimed that the death penalty is applied unequally based on race.
        `,
      };

      const result = await extractClaims(article);

      // Should extract at least 2 claims
      expect(result.claims.length).toBeGreaterThanOrEqual(2);
    });

    it('should identify article subjects correctly', async () => {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        articleSubjects: ['Gavin Newsom'],
        claims: [
          {
            id: 'claim_1',
            text: 'The death penalty is expensive and ineffective',
            type: 'empirical',
            isVerifiable: true,
            source: { name: 'Gavin Newsom', role: 'article_subject', isExcludedFromExpertPool: true },
            domain: 'criminology',
          },
        ],
      }));

      const article: Article = {
        title: 'Gavin Newsom Announces Death Penalty Moratorium',
        source: 'Slate',
        content: `
          Governor Gavin Newsom announced a moratorium on the death penalty in California.
          "The death penalty is expensive and ineffective," Newsom stated.
        `,
      };

      const result = await extractClaims(article);

      // Newsom should be identified as article subject
      expect(result.articleSubjects).toContain('Gavin Newsom');
    });

    it('should classify claim types correctly', async () => {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        articleSubjects: [],
        claims: [
          {
            id: 'claim_1',
            text: '50% of violent crimes are committed by repeat offenders',
            type: 'statistical',
            isVerifiable: true,
            source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false },
            domain: 'criminology',
          },
          {
            id: 'claim_2',
            text: 'The death penalty causes deterrence',
            type: 'causal',
            isVerifiable: true,
            source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false },
            domain: 'criminology',
          },
          {
            id: 'claim_3',
            text: 'We should abolish the death penalty for moral reasons',
            type: 'values',
            isVerifiable: false,
            source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false },
            domain: 'criminology',
          },
        ],
      }));

      const article: Article = {
        title: 'Crime Statistics Report',
        source: 'News Source',
        content: `
          Studies show that 50% of violent crimes are committed by repeat offenders.
          The death penalty causes deterrence according to some researchers.
          We should abolish the death penalty for moral reasons.
        `,
      };

      const result = await extractClaims(article);

      // Should have a statistical claim
      const statisticalClaim = result.claims.find((c: ClassifiedClaim) => c.type === 'statistical');
      expect(statisticalClaim).toBeDefined();

      // Should have a causal claim
      const causalClaim = result.claims.find((c: ClassifiedClaim) => c.type === 'causal');
      expect(causalClaim).toBeDefined();

      // Should have a values claim
      const valuesClaim = result.claims.find((c: ClassifiedClaim) => c.type === 'values');
      expect(valuesClaim).toBeDefined();
    });

    it('should mark article subjects as excluded from expert pool', async () => {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        articleSubjects: ['John Smith'],
        claims: [
          {
            id: 'claim_1',
            text: 'The company grew 50% this year',
            type: 'statistical',
            isVerifiable: true,
            source: { name: 'John Smith', role: 'article_subject', isExcludedFromExpertPool: true },
            domain: 'economics',
          },
          {
            id: 'claim_2',
            text: 'Our products are the best in the market',
            type: 'aesthetic',
            isVerifiable: false,
            source: { name: 'John Smith', role: 'article_subject', isExcludedFromExpertPool: true },
            domain: 'general',
          },
        ],
      }));

      const article: Article = {
        title: 'CEO Announces Company Growth',
        source: 'Business News',
        content: `
          CEO John Smith announced that the company grew 50% this year.
          "Our products are the best in the market," Smith said.
        `,
      };

      const result = await extractClaims(article);

      // Claims from the article subject should be marked as excluded
      const claimsFromSubject = result.claims.filter(
        (c: ClassifiedClaim) => c.source.role === 'article_subject'
      );

      expect(claimsFromSubject.length).toBeGreaterThan(0);
      claimsFromSubject.forEach((claim: ClassifiedClaim) => {
        expect(claim.source.isExcludedFromExpertPool).toBe(true);
      });
    });

    it('should detect the domain for each claim', async () => {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        articleSubjects: [],
        claims: [
          {
            id: 'claim_1',
            text: 'Vaccines are safe and effective according to clinical trials',
            type: 'empirical',
            isVerifiable: true,
            source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false },
            domain: 'medicine',
          },
          {
            id: 'claim_2',
            text: 'The death penalty does not deter crime',
            type: 'causal',
            isVerifiable: true,
            source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false },
            domain: 'criminology',
          },
          {
            id: 'claim_3',
            text: 'Tax cuts stimulate economic growth',
            type: 'causal',
            isVerifiable: true,
            source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false },
            domain: 'economics',
          },
        ],
      }));

      const article: Article = {
        title: 'Health and Crime Report',
        source: 'News',
        content: `
          Vaccines are safe and effective according to clinical trials.
          The death penalty does not deter crime based on criminology research.
          Tax cuts stimulate economic growth.
        `,
      };

      const result = await extractClaims(article);

      // Should have claims from different domains
      const domains = result.claims.map((c: ClassifiedClaim) => c.domain);

      expect(domains).toContain('medicine');
      expect(domains).toContain('criminology');
      expect(domains).toContain('economics');
    });

    it('should handle claims with verifiable and non-verifiable components', async () => {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        articleSubjects: [],
        claims: [
          {
            id: 'claim_1',
            text: 'The minimum wage increase to $15 will reduce employment by 2% but should be implemented for fairness',
            type: 'predictive',
            isVerifiable: true,
            source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false },
            domain: 'economics',
            verifiableComponents: ['Employment reduction prediction can be tested'],
            unverifiableComponents: ['Fairness is a values judgment'],
          },
        ],
      }));

      const article: Article = {
        title: 'Policy Analysis',
        source: 'Think Tank',
        content: `
          The minimum wage increase to $15 will reduce employment by 2% but should be implemented for fairness.
        `,
      };

      const result = await extractClaims(article);

      // Should identify the partially verifiable claim
      const effectivenessClaim = result.claims.find(
        (c: ClassifiedClaim) => c.type === 'effectiveness' || c.type === 'predictive'
      );

      expect(effectivenessClaim).toBeDefined();
      if (effectivenessClaim) {
        expect(effectivenessClaim.verifiableComponents).toBeDefined();
        expect(effectivenessClaim.unverifiableComponents).toBeDefined();
      }
    });

    it('should assign unique IDs to each claim', async () => {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        articleSubjects: [],
        claims: [
          { id: 'claim_1', text: 'The earth is warming', type: 'empirical', isVerifiable: true, domain: 'climate', source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false } },
          { id: 'claim_2', text: 'Vaccines prevent disease', type: 'causal', isVerifiable: true, domain: 'medicine', source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false } },
          { id: 'claim_3', text: 'Exercise is good for health', type: 'empirical', isVerifiable: true, domain: 'medicine', source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false } },
        ],
      }));

      const article: Article = {
        title: 'Multiple Claims Article',
        source: 'Source',
        content: `
          Claim one: The earth is warming.
          Claim two: Vaccines prevent disease.
          Claim three: Exercise is good for health.
        `,
      };

      const result = await extractClaims(article);

      const ids = result.claims.map((c: ClassifiedClaim) => c.id);
      const uniqueIds = new Set(ids);

      // All IDs should be unique
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should include verifiability reason for each claim', async () => {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        articleSubjects: [],
        claims: [
          { id: 'claim_1', text: 'X causes Y', type: 'causal', isVerifiable: true, verifiabilityReason: 'This causal claim can be evaluated with research', domain: 'general', source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false } },
          { id: 'claim_2', text: 'We should do X', type: 'values', isVerifiable: false, verifiabilityReason: 'This is a values claim', domain: 'general', source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false } },
        ],
      }));

      const article: Article = {
        title: 'Test Article',
        source: 'Source',
        content: `
          Studies show X causes Y.
          We should do X because it is right.
        `,
      };

      const result = await extractClaims(article);

      result.claims.forEach((claim: ClassifiedClaim) => {
        expect(claim.verifiabilityReason).toBeDefined();
        expect(claim.verifiabilityReason.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Article Subject Detection', () => {
    it('should identify politicians as article subjects when they are the focus', async () => {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        articleSubjects: ['Elizabeth Warren'],
        claims: [
          {
            id: 'claim_1',
            text: 'The tax will raise $2 trillion over 10 years',
            type: 'predictive',
            isVerifiable: true,
            source: { name: 'Elizabeth Warren', role: 'article_subject', isExcludedFromExpertPool: true },
            domain: 'economics',
          },
        ],
      }));

      const article: Article = {
        title: 'Senator Warren Proposes New Tax Plan',
        source: 'Political News',
        content: `
          Senator Elizabeth Warren proposed a new wealth tax today.
          Warren claims the tax will raise $2 trillion over 10 years.
          "The wealthy must pay their fair share," Warren said.
        `,
      };

      const result = await extractClaims(article);

      expect(result.articleSubjects).toContain('Elizabeth Warren');
    });

    it('should identify multiple article subjects', async () => {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        articleSubjects: ['Joe Biden', 'Donald Trump'],
        claims: [
          {
            id: 'claim_1',
            text: 'Climate change is an existential threat',
            type: 'empirical',
            isVerifiable: true,
            source: { name: 'Joe Biden', role: 'article_subject', isExcludedFromExpertPool: true },
            domain: 'climate',
          },
          {
            id: 'claim_2',
            text: 'Climate regulations hurt jobs',
            type: 'causal',
            isVerifiable: true,
            source: { name: 'Donald Trump', role: 'article_subject', isExcludedFromExpertPool: true },
            domain: 'economics',
          },
        ],
      }));

      const article: Article = {
        title: 'Biden and Trump Debate Climate Policy',
        source: 'News',
        content: `
          President Biden and former President Trump debated climate policy.
          Biden claimed climate change is an existential threat.
          Trump argued that climate regulations hurt jobs.
        `,
      };

      const result = await extractClaims(article);

      expect(result.articleSubjects.length).toBeGreaterThanOrEqual(2);
    });

    it('should not include cited experts as article subjects', async () => {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        articleSubjects: [],
        claims: [
          {
            id: 'claim_1',
            text: 'The data clearly shows warming trends',
            type: 'empirical',
            isVerifiable: true,
            source: { name: 'Dr. Jane Smith', role: 'cited_expert', credentials: 'Climate scientist at MIT', isExcludedFromExpertPool: false },
            domain: 'climate',
          },
        ],
      }));

      const article: Article = {
        title: 'Climate Science Report',
        source: 'Science News',
        content: `
          Dr. Jane Smith from MIT commented on climate research.
          "The data clearly shows warming trends," said Dr. Smith,
          a climate scientist with 100 publications in the field.
        `,
      };

      const result = await extractClaims(article);

      // Dr. Smith is cited as an expert, not the subject of the article
      const drSmithClaims = result.claims.filter(
        (c: ClassifiedClaim) => c.source.name === 'Jane Smith' || c.source.name === 'Dr. Jane Smith'
      );

      if (drSmithClaims.length > 0) {
        expect(drSmithClaims[0].source.role).toBe('cited_expert');
        expect(drSmithClaims[0].source.isExcludedFromExpertPool).toBe(false);
      }
    });
  });

  describe('Claim Type Classification', () => {
    it('should classify empirical claims correctly', async () => {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        articleSubjects: [],
        claims: [
          {
            id: 'claim_1',
            text: 'Patients taking drug X showed a 30% improvement in symptoms',
            type: 'empirical',
            isVerifiable: true,
            verifiabilityReason: 'This empirical claim can be tested with direct observations',
            source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false },
            domain: 'medicine',
          },
        ],
      }));

      const article: Article = {
        title: 'Research Findings',
        source: 'Science Journal',
        content: 'The study found that patients taking drug X showed a 30% improvement in symptoms.',
      };

      const result = await extractClaims(article);
      const claim = result.claims[0];

      expect(claim.type).toBe('empirical');
      expect(claim.isVerifiable).toBe(true);
    });

    it('should classify causal claims correctly', async () => {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        articleSubjects: [],
        claims: [
          {
            id: 'claim_1',
            text: 'Smoking causes lung cancer',
            type: 'causal',
            isVerifiable: true,
            verifiabilityReason: 'This causal claim can be evaluated with research',
            source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false },
            domain: 'medicine',
          },
        ],
      }));

      const article: Article = {
        title: 'Health Research',
        source: 'Medical Journal',
        content: 'Smoking causes lung cancer according to decades of research.',
      };

      const result = await extractClaims(article);
      const claim = result.claims[0];

      expect(claim.type).toBe('causal');
      expect(claim.isVerifiable).toBe(true);
    });

    it('should classify statistical claims correctly', async () => {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        articleSubjects: [],
        claims: [
          {
            id: 'claim_1',
            text: '75% of Americans support universal healthcare',
            type: 'statistical',
            isVerifiable: true,
            verifiabilityReason: 'This statistical claim can be verified against data',
            source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false },
            domain: 'politicalScience',
          },
        ],
      }));

      const article: Article = {
        title: 'Survey Results',
        source: 'Polling Organization',
        content: '75% of Americans support universal healthcare.',
      };

      const result = await extractClaims(article);
      const claim = result.claims[0];

      expect(claim.type).toBe('statistical');
      expect(claim.isVerifiable).toBe(true);
    });

    it('should classify values claims correctly', async () => {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        articleSubjects: [],
        claims: [
          {
            id: 'claim_1',
            text: 'The government should provide free healthcare to all citizens',
            type: 'values',
            isVerifiable: false,
            verifiabilityReason: 'This is a values claim that cannot be empirically verified',
            source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false },
            domain: 'politicalScience',
          },
        ],
      }));

      const article: Article = {
        title: 'Opinion Piece',
        source: 'Editorial',
        content: 'The government should provide free healthcare to all citizens.',
      };

      const result = await extractClaims(article);
      const claim = result.claims[0];

      expect(claim.type).toBe('values');
      expect(claim.isVerifiable).toBe(false);
    });

    it('should classify predictive claims correctly', async () => {
      mockComplete.mockResolvedValueOnce(JSON.stringify({
        articleSubjects: [],
        claims: [
          {
            id: 'claim_1',
            text: 'The new tariffs will increase prices by 10% next year',
            type: 'predictive',
            isVerifiable: true,
            verifiabilityReason: 'This predictive claim can be partially verified by examining mechanisms',
            source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false },
            domain: 'economics',
          },
        ],
      }));

      const article: Article = {
        title: 'Economic Forecast',
        source: 'Financial News',
        content: 'The new tariffs will increase prices by 10% next year.',
      };

      const result = await extractClaims(article);
      const claim = result.claims[0];

      expect(claim.type).toBe('predictive');
      // Predictive claims are partially verifiable
      expect(claim.isVerifiable).toBe(true); // mechanisms can be checked
    });
  });
});
