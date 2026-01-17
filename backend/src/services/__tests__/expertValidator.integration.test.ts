/**
 * Integration Tests for Expert Validator Service
 * Wave 4 - Tests against realistic article scenarios
 *
 * These tests simulate real-world articles to verify the expert
 * validation system works correctly in practice.
 *
 * Test scenarios from EXPERT_EVALUATION_SPEC.md:
 * - Death penalty article (Slate/Newsom)
 * - Vaccine safety article
 * - Tariffs/economics article
 * - Climate change article
 * - Tech company claims article
 */

import {
  validateExpert,
  validateExperts,
  shouldExcludeFromExpertPool,
} from '../expertValidator';
import { PersonMention, ExpertValidationInput } from '../../types/expert';
import { Domain } from '../../types/claims';

// ═══════════════════════════════════════════════════════════════
// TEST FIXTURES - REALISTIC ARTICLE SCENARIOS
// ═══════════════════════════════════════════════════════════════

/**
 * Fixture: Slate article about Newsom's death penalty moratorium
 * Based on real article structure
 */
const DEATH_PENALTY_ARTICLE = {
  title: 'Gavin Newsom Says the Death Penalty Doesn\'t Deter Crime. Is He Right?',
  source: 'Slate',
  articleSubjects: ['Gavin Newsom'],
  personsQuoted: [
    {
      name: 'Gavin Newsom',
      title: 'Governor of California',
      credentials: 'JD from Santa Clara University',
      affiliation: 'State of California',
      quote: 'The death penalty does not deter crime.',
    },
    {
      name: 'Daniel Nagin',
      title: 'Teresa and H. John Heinz III Professor of Public Policy',
      credentials: 'PhD in Economics',
      affiliation: 'Carnegie Mellon University',
      quote: 'The studies claiming deterrent effect are fundamentally flawed.',
    },
    {
      name: 'John Donohue',
      title: 'C. Wendell and Edith M. Carlsmith Professor of Law',
      credentials: 'JD from Harvard Law School, PhD in Economics',
      affiliation: 'Stanford Law School',
      quote: 'The NRC report concluded the evidence is not informative.',
    },
    {
      name: 'Kent Scheidegger',
      title: 'Legal Director',
      credentials: 'JD',
      affiliation: 'Criminal Justice Legal Foundation',
      quote: 'There is evidence that the death penalty deters.',
    },
  ],
  claimDomain: 'criminology' as Domain,
};

/**
 * Fixture: NYTimes article about vaccine safety claims
 */
const VACCINE_ARTICLE = {
  title: 'RFK Jr. Claims Vaccines Cause Autism. Here\'s What Science Says.',
  source: 'New York Times',
  articleSubjects: ['Robert F. Kennedy Jr.', 'RFK Jr.'],
  personsQuoted: [
    {
      name: 'Robert F. Kennedy Jr.',
      title: 'Chairman',
      credentials: 'JD from University of Virginia',
      affiliation: 'Children\'s Health Defense',
      role: 'advocate',
      quote: 'Vaccines have been linked to the autism epidemic.',
    },
    {
      name: 'Paul Offit',
      title: 'Director, Vaccine Education Center',
      credentials: 'MD',
      affiliation: 'Children\'s Hospital of Philadelphia, University of Pennsylvania',
      quote: 'There is no scientific evidence linking vaccines to autism.',
    },
    {
      name: 'Peter Hotez',
      title: 'Dean, National School of Tropical Medicine',
      credentials: 'MD, PhD',
      affiliation: 'Baylor College of Medicine University',
      quote: 'Multiple large-scale studies have found no connection.',
    },
    {
      name: 'Jenny McCarthy',
      title: 'Actress and Activist',
      role: 'activist',
      affiliation: 'Generation Rescue',
      quote: 'I know what I saw happen to my son.',
    },
  ],
  claimDomain: 'medicine' as Domain,
};

/**
 * Fixture: WSJ article about tariff effects
 */
const TARIFF_ARTICLE = {
  title: 'Trump Says Tariffs Will Bring Back American Manufacturing Jobs',
  source: 'Wall Street Journal',
  articleSubjects: ['Donald Trump'],
  personsQuoted: [
    {
      name: 'Donald Trump',
      title: 'Former President of the United States',
      affiliation: 'Trump Organization',
      quote: 'Tariffs will bring millions of manufacturing jobs back to America.',
    },
    {
      name: 'Peter Navarro',
      title: 'Former Director, Office of Trade and Manufacturing Policy',
      credentials: 'PhD in Economics',
      affiliation: 'White House',
      quote: 'Tariffs are necessary to rebalance trade.',
    },
    {
      name: 'David Autor',
      title: 'Ford Professor of Economics',
      credentials: 'PhD in Economics',
      affiliation: 'Massachusetts Institute of Technology',
      quote: 'Research shows tariffs have mixed effects on employment.',
    },
    {
      name: 'Chad Bown',
      title: 'Reginald Jones Senior Fellow',
      credentials: 'PhD in Economics',
      affiliation: 'Peterson Institute for International Economics',
      quote: 'Tariffs typically raise consumer prices without creating jobs.',
    },
    {
      name: 'Larry Kudlow',
      title: 'Former Director, National Economic Council',
      affiliation: 'White House',
      quote: 'Free and fair trade requires strong negotiating tools.',
    },
  ],
  claimDomain: 'economics' as Domain,
};

/**
 * Fixture: Climate change article
 */
const CLIMATE_ARTICLE = {
  title: 'Senator Inhofe Brings Snowball to Senate Floor to Disprove Climate Change',
  source: 'Washington Post',
  articleSubjects: ['Jim Inhofe', 'James Inhofe'],
  personsQuoted: [
    {
      name: 'James Inhofe',
      title: 'Senator from Oklahoma',
      affiliation: 'US Senate',
      quote: 'Global warming is the greatest hoax ever perpetrated.',
    },
    {
      name: 'Michael Mann',
      title: 'Distinguished Professor of Atmospheric Science',
      credentials: 'PhD in Geology and Geophysics',
      affiliation: 'Penn State University',
      quote: 'Weather is not climate. The long-term warming trend is unambiguous.',
    },
    {
      name: 'Katharine Hayhoe',
      title: 'Professor and Director, Climate Science Center',
      credentials: 'PhD in Atmospheric Science',
      affiliation: 'Texas Tech University',
      quote: 'Human activities are unequivocally warming the planet.',
    },
    {
      name: 'Marc Morano',
      title: 'Executive Director',
      affiliation: 'Climate Depot',
      role: 'Communications Director',
      quote: 'The climate has always changed.',
    },
  ],
  claimDomain: 'climate' as Domain,
};

/**
 * Fixture: Tech company AI claims
 */
const AI_ARTICLE = {
  title: 'OpenAI CEO Claims GPT-5 Will Achieve Human-Level Intelligence',
  source: 'The Verge',
  articleSubjects: ['Sam Altman'],
  personsQuoted: [
    {
      name: 'Sam Altman',
      title: 'CEO of OpenAI',
      role: 'Chief Executive Officer',
      affiliation: 'OpenAI',
      quote: 'AGI is coming sooner than people think.',
    },
    {
      name: 'Yann LeCun',
      title: 'VP and Chief AI Scientist',
      credentials: 'PhD in Computer Science',
      affiliation: 'Meta, New York University',
      quote: 'Current LLMs are not a path to AGI.',
    },
    {
      name: 'Stuart Russell',
      title: 'Professor of Computer Science',
      credentials: 'PhD in Computer Science',
      affiliation: 'University of California, Berkeley',
      quote: 'We need to be careful about AGI timeline predictions.',
    },
    {
      name: 'Greg Brockman',
      title: 'President of OpenAI',
      role: 'President',
      affiliation: 'OpenAI',
      quote: 'Our research shows rapid capability improvements.',
    },
  ],
  claimDomain: 'technology' as Domain,
};

// ═══════════════════════════════════════════════════════════════
// INTEGRATION TESTS
// ═══════════════════════════════════════════════════════════════

describe('Expert Validator Integration Tests', () => {
  // ───────────────────────────────────────────────────────────────
  // TEST CASE 1: Death Penalty Article (from spec)
  // ───────────────────────────────────────────────────────────────
  describe('Death Penalty Article (Slate/Newsom)', () => {
    const { articleSubjects, personsQuoted, claimDomain } = DEATH_PENALTY_ARTICLE;

    it('should EXCLUDE Gavin Newsom as article subject', () => {
      const newsom = personsQuoted.find((p) => p.name === 'Gavin Newsom')!;
      const result = validateExpert({
        person: newsom,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(false);
      expect(result.disqualifiers.isArticleSubject).toBe(true);
      expect(result.validationReason).toContain('subject of the article');
    });

    it('should VALIDATE Daniel Nagin as criminology expert', () => {
      const nagin = personsQuoted.find((p) => p.name === 'Daniel Nagin')!;
      const result = validateExpert({
        person: nagin,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(true);
      expect(result.hasRelevantDegree).toBe(true);
      expect(result.isAtResearchInstitution).toBe(true);
      expect(result.credentialsFound).toContain('PhD');
    });

    it('should VALIDATE John Donohue as criminology expert', () => {
      const donohue = personsQuoted.find((p) => p.name === 'John Donohue')!;
      const result = validateExpert({
        person: donohue,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(true);
      expect(result.hasRelevantDegree).toBe(true);
    });

    it('should NOT VALIDATE Kent Scheidegger (advocacy org)', () => {
      const scheidegger = personsQuoted.find((p) => p.name === 'Kent Scheidegger')!;
      const result = validateExpert({
        person: scheidegger,
        articleSubjects,
        claimDomain,
      });

      // Criminal Justice Legal Foundation is an advocacy org
      // This should not validate as expert despite JD
      expect(result.isValidExpert).toBe(false);
    });

    it('should correctly batch validate all persons in article', () => {
      const result = validateExperts(personsQuoted, articleSubjects, claimDomain);

      expect(result.totalProcessed).toBe(4);
      // Newsom excluded (article subject), Scheidegger excluded (advocacy)
      expect(result.validCount).toBe(2); // Nagin and Donohue
      expect(result.excludedCount).toBe(2);

      const validNames = result.validExperts.map((e) => e.name);
      expect(validNames).toContain('Daniel Nagin');
      expect(validNames).toContain('John Donohue');
      expect(validNames).not.toContain('Gavin Newsom');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // TEST CASE 2: Vaccine Safety Article
  // ───────────────────────────────────────────────────────────────
  describe('Vaccine Safety Article (NYTimes)', () => {
    const { articleSubjects, personsQuoted, claimDomain } = VACCINE_ARTICLE;

    it('should EXCLUDE RFK Jr. as article subject and advocacy leader', () => {
      const rfk = personsQuoted.find((p) => p.name === 'Robert F. Kennedy Jr.')!;
      const result = validateExpert({
        person: rfk,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(false);
      expect(result.disqualifiers.isArticleSubject).toBe(true);
    });

    it('should VALIDATE Paul Offit as medical expert', () => {
      const offit = personsQuoted.find((p) => p.name === 'Paul Offit')!;
      const result = validateExpert({
        person: offit,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(true);
      expect(result.hasRelevantDegree).toBe(true);
      expect(result.isAtResearchInstitution).toBe(true);
    });

    it('should VALIDATE Peter Hotez as medical expert', () => {
      const hotez = personsQuoted.find((p) => p.name === 'Peter Hotez')!;
      const result = validateExpert({
        person: hotez,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(true);
      expect(result.credentialsFound).toContain('MD');
      expect(result.credentialsFound).toContain('PhD');
    });

    it('should NOT VALIDATE Jenny McCarthy (no credentials, activist)', () => {
      const mccarthy = personsQuoted.find((p) => p.name === 'Jenny McCarthy')!;
      const result = validateExpert({
        person: mccarthy,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(false);
      expect(result.hasRelevantDegree).toBe(false);
    });

    it('should correctly identify valid medical experts in batch', () => {
      const result = validateExperts(personsQuoted, articleSubjects, claimDomain);

      expect(result.validCount).toBe(2); // Offit and Hotez
      expect(result.excludedCount).toBe(2); // RFK Jr. and McCarthy
    });
  });

  // ───────────────────────────────────────────────────────────────
  // TEST CASE 3: Tariff/Economics Article
  // ───────────────────────────────────────────────────────────────
  describe('Tariff Article (WSJ)', () => {
    const { articleSubjects, personsQuoted, claimDomain } = TARIFF_ARTICLE;

    it('should EXCLUDE Trump as article subject', () => {
      const trump = personsQuoted.find((p) => p.name === 'Donald Trump')!;
      const result = validateExpert({
        person: trump,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(false);
      expect(result.disqualifiers.isArticleSubject).toBe(true);
    });

    it('should EXCLUDE Peter Navarro (White House official/politician)', () => {
      const navarro = personsQuoted.find((p) => p.name === 'Peter Navarro')!;
      const result = validateExpert({
        person: navarro,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(false);
      expect(result.disqualifiers.isPolitician).toBe(true);
    });

    it('should VALIDATE David Autor as economics expert', () => {
      const autor = personsQuoted.find((p) => p.name === 'David Autor')!;
      const result = validateExpert({
        person: autor,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(true);
      expect(result.isAtResearchInstitution).toBe(true);
    });

    it('should recognize Chad Bown credentials but note think tank affiliation', () => {
      const bown = personsQuoted.find((p) => p.name === 'Chad Bown')!;
      const result = validateExpert({
        person: bown,
        articleSubjects,
        claimDomain,
      });

      // Peterson Institute is a think tank, not a university
      // Bown has PhD credentials but think tank affiliation
      expect(result.hasRelevantDegree).toBe(true);
      // Think tanks aren't research institutions by our strict definition
      // but the person has valid credentials
    });

    it('should EXCLUDE Larry Kudlow (White House official)', () => {
      const kudlow = personsQuoted.find((p) => p.name === 'Larry Kudlow')!;
      const result = validateExpert({
        person: kudlow,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(false);
      expect(result.disqualifiers.isPolitician).toBe(true);
    });

    it('should correctly identify academic economists vs politicians', () => {
      const result = validateExperts(personsQuoted, articleSubjects, claimDomain);

      // Autor is validated (MIT), Bown has credentials but at think tank
      expect(result.validCount).toBeGreaterThanOrEqual(1);
      // Trump, Navarro, Kudlow should be excluded
      expect(result.excludedCount).toBeGreaterThanOrEqual(3);

      const excludedReasons = result.excludedPersons.map((p) => p.reason);
      expect(excludedReasons).toContain('article_subject');
      expect(excludedReasons).toContain('politician');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // TEST CASE 4: Climate Change Article
  // ───────────────────────────────────────────────────────────────
  describe('Climate Article (Washington Post)', () => {
    const { articleSubjects, personsQuoted, claimDomain } = CLIMATE_ARTICLE;

    it('should EXCLUDE Senator Inhofe as article subject and politician', () => {
      const inhofe = personsQuoted.find((p) => p.name === 'James Inhofe')!;
      const result = validateExpert({
        person: inhofe,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(false);
      // Should be excluded for being article subject AND politician
      expect(
        result.disqualifiers.isArticleSubject ||
          result.disqualifiers.isPolitician
      ).toBe(true);
    });

    it('should VALIDATE Michael Mann as climate expert', () => {
      const mann = personsQuoted.find((p) => p.name === 'Michael Mann')!;
      const result = validateExpert({
        person: mann,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(true);
      expect(result.isAtResearchInstitution).toBe(true);
    });

    it('should VALIDATE Katharine Hayhoe as climate expert', () => {
      const hayhoe = personsQuoted.find((p) => p.name === 'Katharine Hayhoe')!;
      const result = validateExpert({
        person: hayhoe,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(true);
      expect(result.hasRelevantDegree).toBe(true);
    });

    it('should NOT VALIDATE Marc Morano (communications, no academic credentials)', () => {
      const morano = personsQuoted.find((p) => p.name === 'Marc Morano')!;
      const result = validateExpert({
        person: morano,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(false);
      // Morano is a communications director, not a scientist
    });

    it('should identify only climate scientists as valid experts', () => {
      const result = validateExperts(personsQuoted, articleSubjects, claimDomain);

      expect(result.validCount).toBe(2); // Mann and Hayhoe
      expect(result.excludedCount).toBe(2); // Inhofe and Morano

      const validNames = result.validExperts.map((e) => e.name);
      expect(validNames).toContain('Michael Mann');
      expect(validNames).toContain('Katharine Hayhoe');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // TEST CASE 5: AI/Tech Company Claims Article
  // ───────────────────────────────────────────────────────────────
  describe('AI Article (The Verge)', () => {
    const { articleSubjects, personsQuoted, claimDomain } = AI_ARTICLE;

    it('should EXCLUDE Sam Altman as article subject and CEO', () => {
      const altman = personsQuoted.find((p) => p.name === 'Sam Altman')!;
      const result = validateExpert({
        person: altman,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(false);
      expect(result.disqualifiers.isArticleSubject).toBe(true);
    });

    it('should VALIDATE Yann LeCun as AI researcher', () => {
      const lecun = personsQuoted.find((p) => p.name === 'Yann LeCun')!;
      const result = validateExpert({
        person: lecun,
        articleSubjects,
        claimDomain,
      });

      // LeCun has PhD and university affiliation
      expect(result.isValidExpert).toBe(true);
    });

    it('should VALIDATE Stuart Russell as AI researcher', () => {
      const russell = personsQuoted.find((p) => p.name === 'Stuart Russell')!;
      const result = validateExpert({
        person: russell,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(true);
      expect(result.isAtResearchInstitution).toBe(true);
    });

    it('should EXCLUDE Greg Brockman as corporate executive', () => {
      const brockman = personsQuoted.find((p) => p.name === 'Greg Brockman')!;
      const result = validateExpert({
        person: brockman,
        articleSubjects,
        claimDomain,
      });

      expect(result.isValidExpert).toBe(false);
      // Brockman is a president/executive, not an independent researcher
    });

    it('should distinguish academic AI researchers from company executives', () => {
      const result = validateExperts(personsQuoted, articleSubjects, claimDomain);

      expect(result.validCount).toBe(2); // LeCun and Russell
      expect(result.excludedCount).toBe(2); // Altman and Brockman

      const validNames = result.validExperts.map((e) => e.name);
      expect(validNames).toContain('Yann LeCun');
      expect(validNames).toContain('Stuart Russell');
      expect(validNames).not.toContain('Sam Altman');
      expect(validNames).not.toContain('Greg Brockman');
    });
  });

  // ───────────────────────────────────────────────────────────────
  // QUICK EXCLUSION CHECKS
  // ───────────────────────────────────────────────────────────────
  describe('Quick Exclusion Checks', () => {
    it('should quickly identify article subjects for exclusion', () => {
      const result = shouldExcludeFromExpertPool(
        { name: 'Gavin Newsom', title: 'Governor' },
        ['Gavin Newsom']
      );

      expect(result.exclude).toBe(true);
      expect(result.reason).toBe('article_subject');
    });

    it('should quickly identify politicians for exclusion', () => {
      const result = shouldExcludeFromExpertPool(
        { name: 'Chuck Schumer', title: 'Senate Majority Leader' },
        []
      );

      expect(result.exclude).toBe(true);
      expect(result.reason).toBe('politician');
    });

    it('should not exclude researchers', () => {
      const result = shouldExcludeFromExpertPool(
        {
          name: 'Dr. Jane Smith',
          title: 'Professor of Economics',
          credentials: 'PhD',
          affiliation: 'Harvard University',
        },
        []
      );

      expect(result.exclude).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────
  // EDGE CASES
  // ───────────────────────────────────────────────────────────────
  describe('Edge Cases', () => {
    it('should handle persons with multiple roles (academic who became politician)', () => {
      const result = validateExpert({
        person: {
          name: 'Elizabeth Warren',
          title: 'Senator from Massachusetts, Former Professor',
          credentials: 'JD',
          affiliation: 'US Senate, formerly Harvard Law School',
        },
        articleSubjects: [],
        claimDomain: 'economics',
      });

      // Should be excluded because current role is politician
      expect(result.isValidExpert).toBe(false);
      expect(result.disqualifiers.isPolitician).toBe(true);
    });

    it('should handle industry researchers with academic credentials', () => {
      const result = validateExpert({
        person: {
          name: 'Dr. Researcher',
          title: 'Chief Scientist',
          credentials: 'PhD in Computer Science',
          affiliation: 'Google Research',
        },
        articleSubjects: [],
        claimDomain: 'technology',
      });

      // Has PhD but affiliation is corporate, not university
      // Should not validate without research institution
      expect(result.hasRelevantDegree).toBe(true);
      expect(result.isAtResearchInstitution).toBe(false);
    });

    it('should handle think tank researchers', () => {
      const result = validateExpert({
        person: {
          name: 'Policy Expert',
          title: 'Senior Fellow',
          credentials: 'PhD in Economics',
          affiliation: 'Brookings Institution',
        },
        articleSubjects: [],
        claimDomain: 'economics',
      });

      // Think tanks are not research institutions in our patterns
      // but person has PhD - should check carefully
      expect(result.hasRelevantDegree).toBe(true);
    });

    it('should handle foreign titles and institutions', () => {
      const result = validateExpert({
        person: {
          name: 'Dr. Hans Mueller',
          title: 'Professor of Economics',
          credentials: 'PhD',
          affiliation: 'University of Munich',
        },
        articleSubjects: [],
        claimDomain: 'economics',
      });

      expect(result.isValidExpert).toBe(true);
      expect(result.isAtResearchInstitution).toBe(true);
    });
  });
});
