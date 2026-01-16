/**
 * TDD Tests for EvidenceTier Service
 * Wave 3, Agent 9 - Tests for evidence tier classification
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Section 5.3
 */

import {
  classifyEvidenceTier,
  isHighQualityEvidence,
  getTierDescription,
  getTierWeighting,
  EvidenceTier,
} from '../evidenceTier';

describe('EvidenceTier Service', () => {
  describe('classifyEvidenceTier', () => {
    describe('Tier 1: Highest Quality - Synthesized Evidence', () => {
      it('should classify Cochrane reviews as Tier 1', () => {
        const result = classifyEvidenceTier({
          url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/review',
          title: 'Interventions for preventing falls in older people',
          sourceType: 'systematic_review',
        });

        expect(result.tier).toBe(1);
        expect(result.category).toBe('systematic_review');
      });

      it('should classify meta-analyses as Tier 1', () => {
        const result = classifyEvidenceTier({
          url: 'https://pubmed.gov/123456',
          title: 'Meta-analysis of vaccine efficacy studies',
          sourceType: 'meta_analysis',
        });

        expect(result.tier).toBe(1);
        expect(result.category).toBe('meta_analysis');
      });

      it('should classify NRC reports as Tier 1', () => {
        const result = classifyEvidenceTier({
          url: 'https://nap.nationalacademies.org/report/12345',
          title: 'National Research Council Report on Climate',
          sourceType: 'major_report',
        });

        expect(result.tier).toBe(1);
        expect(result.category).toBe('major_report');
      });

      it('should classify IPCC reports as Tier 1', () => {
        const result = classifyEvidenceTier({
          url: 'https://ipcc.ch/report/ar6/wg1/',
          title: 'IPCC Assessment Report 6',
          sourceType: 'major_report',
        });

        expect(result.tier).toBe(1);
      });

      it('should classify Campbell Collaboration reviews as Tier 1', () => {
        const result = classifyEvidenceTier({
          url: 'https://campbellcollaboration.org/library/review',
          title: 'Effects of interventions on crime',
          sourceType: 'systematic_review',
        });

        expect(result.tier).toBe(1);
      });
    });

    describe('Tier 2: High Quality - Primary Research', () => {
      it('should classify peer-reviewed journal articles as Tier 2', () => {
        const result = classifyEvidenceTier({
          url: 'https://www.nejm.org/doi/full/10.1056/article',
          title: 'Randomized Trial of Treatment X',
          sourceType: 'peer_reviewed',
        });

        expect(result.tier).toBe(2);
        expect(result.category).toBe('peer_reviewed');
      });

      it('should classify RCTs as Tier 2', () => {
        const result = classifyEvidenceTier({
          url: 'https://jamanetwork.com/journals/jama/article',
          title: 'Double-blind randomized controlled trial',
          sourceType: 'rct',
        });

        expect(result.tier).toBe(2);
        expect(result.category).toBe('rct');
      });

      it('should classify Nature articles as Tier 2', () => {
        const result = classifyEvidenceTier({
          url: 'https://nature.com/articles/12345',
          title: 'Climate sensitivity study',
          sourceType: 'peer_reviewed',
        });

        expect(result.tier).toBe(2);
      });

      it('should classify Science articles as Tier 2', () => {
        const result = classifyEvidenceTier({
          url: 'https://science.org/doi/10.1126/science.abc123',
          title: 'Novel findings in neuroscience',
          sourceType: 'peer_reviewed',
        });

        expect(result.tier).toBe(2);
      });

      it('should classify Lancet articles as Tier 2', () => {
        const result = classifyEvidenceTier({
          url: 'https://thelancet.com/journals/lancet/article/12345',
          title: 'Clinical study of drug efficacy',
          sourceType: 'peer_reviewed',
        });

        expect(result.tier).toBe(2);
      });
    });

    describe('Tier 3: Moderate Quality - Preliminary/Institutional', () => {
      it('should classify NBER working papers as Tier 3', () => {
        const result = classifyEvidenceTier({
          url: 'https://www.nber.org/papers/w12345',
          title: 'Economic effects of minimum wage',
          sourceType: 'working_paper',
        });

        expect(result.tier).toBe(3);
        expect(result.category).toBe('working_paper');
      });

      it('should classify SSRN papers as Tier 3', () => {
        const result = classifyEvidenceTier({
          url: 'https://ssrn.com/abstract=12345',
          title: 'Finance working paper',
          sourceType: 'working_paper',
        });

        expect(result.tier).toBe(3);
      });

      it('should classify preprints as Tier 3', () => {
        const result = classifyEvidenceTier({
          url: 'https://arxiv.org/abs/2301.12345',
          title: 'AI research preprint',
          sourceType: 'preprint',
        });

        expect(result.tier).toBe(3);
        expect(result.category).toBe('preprint');
      });

      it('should classify government statistics as Tier 3', () => {
        const result = classifyEvidenceTier({
          url: 'https://bls.gov/news.release/empsit.nr0.htm',
          title: 'Employment Situation Summary',
          sourceType: 'government_stats',
        });

        expect(result.tier).toBe(3);
        expect(result.category).toBe('government_stats');
      });

      it('should classify medRxiv preprints as Tier 3', () => {
        const result = classifyEvidenceTier({
          url: 'https://medrxiv.org/content/10.1101/2021.01.12345',
          title: 'Medical research preprint',
          sourceType: 'preprint',
        });

        expect(result.tier).toBe(3);
      });
    });

    describe('Tier 4: Expert Opinion', () => {
      it('should classify verified expert quotes as Tier 4', () => {
        const result = classifyEvidenceTier({
          url: 'https://news.site.com/interview',
          title: 'Expert interview',
          sourceType: 'expert_opinion',
          isVerifiedExpert: true,
        });

        expect(result.tier).toBe(4);
        expect(result.category).toBe('expert_opinion');
      });

      it('should classify expert testimony as Tier 4', () => {
        const result = classifyEvidenceTier({
          url: 'https://congress.gov/testimony',
          title: 'Congressional testimony by researcher',
          sourceType: 'expert_testimony',
          isVerifiedExpert: true,
        });

        expect(result.tier).toBe(4);
      });
    });

    describe('Tier 5: Not Evidence', () => {
      it('should classify politician statements as Tier 5', () => {
        const result = classifyEvidenceTier({
          url: 'https://news.com/politician-statement',
          title: 'Senator claims policy works',
          sourceType: 'politician_statement',
        });

        expect(result.tier).toBe(5);
        expect(result.category).toBe('not_evidence');
      });

      it('should classify advocacy group claims as Tier 5', () => {
        const result = classifyEvidenceTier({
          url: 'https://advocacy-group.org/claims',
          title: 'Advocacy group report',
          sourceType: 'advocacy',
        });

        expect(result.tier).toBe(5);
      });

      it('should classify article subject claims as Tier 5', () => {
        const result = classifyEvidenceTier({
          url: 'https://article.com',
          title: 'CEO claims company is successful',
          sourceType: 'article_subject',
          isArticleSubject: true,
        });

        expect(result.tier).toBe(5);
      });

      it('should classify unverified expert opinions as Tier 5', () => {
        const result = classifyEvidenceTier({
          url: 'https://blog.com/opinion',
          title: 'Expert opinion',
          sourceType: 'expert_opinion',
          isVerifiedExpert: false,
        });

        expect(result.tier).toBe(5);
      });
    });
  });

  describe('URL-based classification', () => {
    it('should detect Cochrane from URL', () => {
      const result = classifyEvidenceTier({
        url: 'https://cochranelibrary.com/cdsr/doi/article',
        title: 'Some review',
      });

      expect(result.tier).toBe(1);
    });

    it('should detect NBER from URL', () => {
      const result = classifyEvidenceTier({
        url: 'https://nber.org/papers/w12345',
        title: 'Working paper',
      });

      expect(result.tier).toBe(3);
    });

    it('should detect arXiv from URL', () => {
      const result = classifyEvidenceTier({
        url: 'https://arxiv.org/abs/2301.12345',
        title: 'Preprint',
      });

      expect(result.tier).toBe(3);
    });

    it('should detect Nature from URL', () => {
      const result = classifyEvidenceTier({
        url: 'https://nature.com/articles/12345',
        title: 'Article',
      });

      expect(result.tier).toBe(2);
    });

    it('should detect BLS from URL', () => {
      const result = classifyEvidenceTier({
        url: 'https://bls.gov/data/employment',
        title: 'Statistics',
      });

      expect(result.tier).toBe(3);
    });
  });

  describe('isHighQualityEvidence', () => {
    it('should return true for Tier 1 evidence', () => {
      expect(isHighQualityEvidence(1)).toBe(true);
    });

    it('should return true for Tier 2 evidence', () => {
      expect(isHighQualityEvidence(2)).toBe(true);
    });

    it('should return false for Tier 3 evidence', () => {
      expect(isHighQualityEvidence(3)).toBe(false);
    });

    it('should return false for Tier 4 evidence', () => {
      expect(isHighQualityEvidence(4)).toBe(false);
    });

    it('should return false for Tier 5', () => {
      expect(isHighQualityEvidence(5)).toBe(false);
    });
  });

  describe('getTierDescription', () => {
    it('should return description for Tier 1', () => {
      const desc = getTierDescription(1);
      expect(desc).toContain('systematic');
    });

    it('should return description for Tier 2', () => {
      const desc = getTierDescription(2);
      expect(desc).toContain('peer');
    });

    it('should return description for Tier 3', () => {
      const desc = getTierDescription(3);
      expect(desc).toContain('preliminary');
    });

    it('should return description for Tier 4', () => {
      const desc = getTierDescription(4);
      expect(desc).toContain('expert');
    });

    it('should return description for Tier 5', () => {
      const desc = getTierDescription(5);
      expect(desc.toLowerCase()).toContain('not evidence');
    });
  });

  describe('getTierWeighting', () => {
    it('should give highest weight to Tier 1', () => {
      const weight1 = getTierWeighting(1);
      const weight2 = getTierWeighting(2);
      const weight3 = getTierWeighting(3);

      expect(weight1).toBeGreaterThan(weight2);
      expect(weight2).toBeGreaterThan(weight3);
    });

    it('should give zero weight to Tier 5', () => {
      expect(getTierWeighting(5)).toBe(0);
    });

    it('should give low weight to Tier 4', () => {
      const weight3 = getTierWeighting(3);
      const weight4 = getTierWeighting(4);

      expect(weight4).toBeLessThan(weight3);
    });
  });

  describe('Title-based detection', () => {
    it('should detect meta-analysis from title', () => {
      const result = classifyEvidenceTier({
        url: 'https://journal.com/article',
        title: 'A meta-analysis of 50 studies on drug efficacy',
      });

      expect(result.tier).toBe(1);
      expect(result.category).toBe('meta_analysis');
    });

    it('should detect systematic review from title', () => {
      const result = classifyEvidenceTier({
        url: 'https://journal.com/article',
        title: 'Systematic review of interventions for obesity',
      });

      expect(result.tier).toBe(1);
      expect(result.category).toBe('systematic_review');
    });

    it('should detect RCT from title', () => {
      const result = classifyEvidenceTier({
        url: 'https://journal.com/article',
        title: 'Randomized controlled trial of new treatment',
      });

      expect(result.tier).toBe(2);
      expect(result.category).toBe('rct');
    });
  });
});
