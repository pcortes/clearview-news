/**
 * TDD Tests for SourceCredibility Service
 * Wave 3, Agent 11 - Tests for source credibility assessment
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Section 5
 */

import {
  assessSourceCredibility,
  buildSourceDisclosure,
  getSourceMetadata,
  isAcademicSource,
  isGovernmentSource,
  isThinkTankSource,
  SourceCredibility,
} from '../sourceCredibility';

describe('SourceCredibility Service', () => {
  describe('assessSourceCredibility', () => {
    describe('Academic journals', () => {
      it('should give high credibility to Nature', () => {
        const result = assessSourceCredibility({
          url: 'https://nature.com/articles/12345',
          title: 'Research article',
        });

        expect(result.credibilityScore).toBeGreaterThanOrEqual(0.9);
        expect(result.sourceType).toBe('academic');
      });

      it('should give high credibility to Science', () => {
        const result = assessSourceCredibility({
          url: 'https://science.org/doi/10.1126/article',
          title: 'Study findings',
        });

        expect(result.credibilityScore).toBeGreaterThanOrEqual(0.9);
      });

      it('should give high credibility to NEJM', () => {
        const result = assessSourceCredibility({
          url: 'https://nejm.org/doi/full/10.1056/study',
          title: 'Clinical trial results',
        });

        expect(result.credibilityScore).toBeGreaterThanOrEqual(0.9);
      });

      it('should give high credibility to Lancet', () => {
        const result = assessSourceCredibility({
          url: 'https://thelancet.com/journals/lancet/article',
          title: 'Medical research',
        });

        expect(result.credibilityScore).toBeGreaterThanOrEqual(0.9);
      });
    });

    describe('Government sources', () => {
      it('should give high credibility to CDC', () => {
        const result = assessSourceCredibility({
          url: 'https://cdc.gov/research/study',
          title: 'Health statistics',
        });

        expect(result.credibilityScore).toBeGreaterThanOrEqual(0.85);
        expect(result.sourceType).toBe('government');
      });

      it('should give high credibility to BLS', () => {
        const result = assessSourceCredibility({
          url: 'https://bls.gov/data/employment',
          title: 'Employment data',
        });

        expect(result.credibilityScore).toBeGreaterThanOrEqual(0.85);
      });

      it('should give high credibility to Census', () => {
        const result = assessSourceCredibility({
          url: 'https://census.gov/data/statistics',
          title: 'Population data',
        });

        expect(result.credibilityScore).toBeGreaterThanOrEqual(0.85);
      });
    });

    describe('Think tanks', () => {
      it('should give moderate credibility to Brookings', () => {
        const result = assessSourceCredibility({
          url: 'https://brookings.edu/research/article',
          title: 'Policy analysis',
        });

        expect(result.credibilityScore).toBeGreaterThanOrEqual(0.6);
        expect(result.credibilityScore).toBeLessThan(0.9);
        expect(result.sourceType).toBe('think_tank');
        expect(result.politicalLean).toBe('center-left');
      });

      it('should give moderate credibility to Heritage', () => {
        const result = assessSourceCredibility({
          url: 'https://heritage.org/research/report',
          title: 'Policy brief',
        });

        expect(result.credibilityScore).toBeGreaterThanOrEqual(0.5);
        expect(result.credibilityScore).toBeLessThan(0.8);
        expect(result.politicalLean).toBe('right');
      });

      it('should give moderate credibility to Cato', () => {
        const result = assessSourceCredibility({
          url: 'https://cato.org/policy-analysis',
          title: 'Libertarian analysis',
        });

        expect(result.credibilityScore).toBeGreaterThanOrEqual(0.5);
        expect(result.politicalLean).toBe('libertarian');
      });

      it('should give higher credibility to RAND', () => {
        const result = assessSourceCredibility({
          url: 'https://rand.org/research/study',
          title: 'Research report',
        });

        expect(result.credibilityScore).toBeGreaterThanOrEqual(0.75);
        expect(result.politicalLean).toBe('nonpartisan');
      });
    });

    describe('Preprint servers', () => {
      it('should give lower credibility to arXiv', () => {
        const result = assessSourceCredibility({
          url: 'https://arxiv.org/abs/2301.12345',
          title: 'Preprint paper',
        });

        expect(result.credibilityScore).toBeLessThan(0.7);
        expect(result.sourceType).toBe('preprint');
        expect(result.caveats).toContain('Not peer-reviewed');
      });

      it('should give lower credibility to medRxiv', () => {
        const result = assessSourceCredibility({
          url: 'https://medrxiv.org/content/paper',
          title: 'Medical preprint',
        });

        expect(result.credibilityScore).toBeLessThan(0.7);
        expect(result.caveats).toContain('Not peer-reviewed');
      });
    });

    describe('Working papers', () => {
      it('should give moderate credibility to NBER', () => {
        const result = assessSourceCredibility({
          url: 'https://nber.org/papers/w12345',
          title: 'Working paper',
        });

        expect(result.credibilityScore).toBeGreaterThanOrEqual(0.6);
        expect(result.credibilityScore).toBeLessThan(0.85);
        expect(result.sourceType).toBe('working_paper');
        expect(result.caveats).toContain('Not peer-reviewed');
      });
    });

    describe('Unknown sources', () => {
      it('should give low credibility to unknown sources', () => {
        const result = assessSourceCredibility({
          url: 'https://random-blog.com/article',
          title: 'Blog post',
        });

        expect(result.credibilityScore).toBeLessThan(0.5);
        expect(result.sourceType).toBe('unknown');
      });
    });
  });

  describe('buildSourceDisclosure', () => {
    it('should include source type in disclosure', () => {
      const disclosure = buildSourceDisclosure({
        url: 'https://brookings.edu/research',
        title: 'Policy research',
      });

      expect(disclosure).toContain('Think tank');
    });

    it('should include political lean for think tanks', () => {
      const disclosure = buildSourceDisclosure({
        url: 'https://heritage.org/report',
        title: 'Policy report',
      });

      expect(disclosure).toContain('right');
    });

    it('should include peer-review status', () => {
      const disclosurePreprint = buildSourceDisclosure({
        url: 'https://arxiv.org/abs/paper',
        title: 'Preprint',
      });

      const disclosureJournal = buildSourceDisclosure({
        url: 'https://nature.com/article',
        title: 'Journal article',
      });

      expect(disclosurePreprint).toContain('not peer-reviewed');
      expect(disclosureJournal.toLowerCase()).toContain('peer-reviewed');
    });
  });

  describe('getSourceMetadata', () => {
    it('should return name for known sources', () => {
      const metadata = getSourceMetadata('https://nature.com/article');

      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('Nature');
    });

    it('should return impact factor for academic sources', () => {
      const metadata = getSourceMetadata('https://nejm.org/article');

      expect(metadata?.impactFactor).toBeDefined();
    });

    it('should return null for unknown sources', () => {
      const metadata = getSourceMetadata('https://unknown-site.com/page');

      expect(metadata).toBeNull();
    });
  });

  describe('isAcademicSource', () => {
    it('should return true for journal articles', () => {
      expect(isAcademicSource('https://nature.com/article')).toBe(true);
      expect(isAcademicSource('https://science.org/doi')).toBe(true);
      expect(isAcademicSource('https://nejm.org/full')).toBe(true);
    });

    it('should return false for think tanks', () => {
      expect(isAcademicSource('https://brookings.edu/report')).toBe(false);
    });

    it('should return false for news sites', () => {
      expect(isAcademicSource('https://nytimes.com/article')).toBe(false);
    });
  });

  describe('isGovernmentSource', () => {
    it('should return true for .gov domains', () => {
      expect(isGovernmentSource('https://cdc.gov/data')).toBe(true);
      expect(isGovernmentSource('https://bls.gov/stats')).toBe(true);
      expect(isGovernmentSource('https://census.gov/data')).toBe(true);
    });

    it('should return false for non-government domains', () => {
      expect(isGovernmentSource('https://nature.com/article')).toBe(false);
      expect(isGovernmentSource('https://brookings.edu/report')).toBe(false);
    });
  });

  describe('isThinkTankSource', () => {
    it('should return true for known think tanks', () => {
      expect(isThinkTankSource('https://brookings.edu/report')).toBe(true);
      expect(isThinkTankSource('https://heritage.org/paper')).toBe(true);
      expect(isThinkTankSource('https://cato.org/analysis')).toBe(true);
    });

    it('should return false for academic sources', () => {
      expect(isThinkTankSource('https://nature.com/article')).toBe(false);
    });

    it('should return false for government sources', () => {
      expect(isThinkTankSource('https://cdc.gov/data')).toBe(false);
    });
  });

  describe('Credibility factors', () => {
    it('should consider peer-review status', () => {
      const peerReviewed = assessSourceCredibility({
        url: 'https://nature.com/article',
        title: 'Study',
      });

      const notPeerReviewed = assessSourceCredibility({
        url: 'https://arxiv.org/paper',
        title: 'Preprint',
      });

      expect(peerReviewed.credibilityScore).toBeGreaterThan(notPeerReviewed.credibilityScore);
    });

    it('should consider source reputation', () => {
      const highReputation = assessSourceCredibility({
        url: 'https://nejm.org/article',
        title: 'Medical study',
      });

      const mediumReputation = assessSourceCredibility({
        url: 'https://nber.org/paper',
        title: 'Economics paper',
      });

      expect(highReputation.credibilityScore).toBeGreaterThan(mediumReputation.credibilityScore);
    });
  });
});
