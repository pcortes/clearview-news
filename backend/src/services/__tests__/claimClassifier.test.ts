/**
 * TDD Tests for ClaimClassifier Service
 * Wave 1, Agent 3 - Tests for claim type classification
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Section 3.1
 */

import {
  classifyClaim,
  isVerifiable,
  isPartiallyVerifiable,
  isNonVerifiable,
  detectDomain,
  getVerifiabilityExplanation,
} from '../claimClassifier';
import {
  ClaimType,
  Domain,
  ClaimClassification,
  VERIFIABLE_CLAIM_TYPES,
  PARTIALLY_VERIFIABLE_CLAIM_TYPES,
  NON_VERIFIABLE_CLAIM_TYPES,
} from '../../types/claims';

describe('ClaimClassifier Service', () => {
  describe('Verifiable Claim Detection', () => {
    describe('empirical claims', () => {
      it('should classify direct observations as empirical', () => {
        const result = classifyClaim('The study found that patients showed a 30% improvement');
        expect(result.type).toBe('empirical');
        expect(result.isVerifiable).toBe(true);
      });

      it('should classify measurement-based claims as empirical', () => {
        const result = classifyClaim('The temperature rose by 1.5 degrees Celsius');
        expect(result.type).toBe('empirical');
        expect(result.isVerifiable).toBe(true);
      });
    });

    describe('causal claims', () => {
      it('should classify cause-effect statements as causal', () => {
        const result = classifyClaim('Smoking causes lung cancer');
        expect(result.type).toBe('causal');
        expect(result.isVerifiable).toBe(true);
      });

      it('should recognize "leads to" as causal', () => {
        const result = classifyClaim('Lack of sleep leads to reduced productivity');
        expect(result.type).toBe('causal');
        expect(result.isVerifiable).toBe(true);
      });

      it('should recognize "results in" as causal', () => {
        const result = classifyClaim('The policy results in higher unemployment');
        expect(result.type).toBe('causal');
        expect(result.isVerifiable).toBe(true);
      });
    });

    describe('statistical claims', () => {
      it('should classify percentage claims as statistical', () => {
        const result = classifyClaim('75% of Americans support this policy');
        expect(result.type).toBe('statistical');
        expect(result.isVerifiable).toBe(true);
      });

      it('should classify rate claims as statistical', () => {
        const result = classifyClaim('The crime rate dropped by 20%');
        expect(result.type).toBe('statistical');
        expect(result.isVerifiable).toBe(true);
      });

      it('should classify survey result claims as statistical', () => {
        const result = classifyClaim('3 out of 4 doctors recommend this');
        expect(result.type).toBe('statistical');
        expect(result.isVerifiable).toBe(true);
      });
    });

    describe('historical claims', () => {
      it('should classify past event claims as historical', () => {
        const result = classifyClaim('The Civil Rights Act was passed in 1964');
        expect(result.type).toBe('historical');
        expect(result.isVerifiable).toBe(true);
      });

      it('should classify date-based claims as historical', () => {
        const result = classifyClaim('World War II ended in 1945');
        expect(result.type).toBe('historical');
        expect(result.isVerifiable).toBe(true);
      });
    });

    describe('scientific_consensus claims', () => {
      it('should classify claims about expert agreement', () => {
        const result = classifyClaim('Scientists agree that climate change is real');
        expect(result.type).toBe('scientific_consensus');
        expect(result.isVerifiable).toBe(true);
      });

      it('should recognize "researchers agree" patterns', () => {
        const result = classifyClaim('Researchers agree that vaccines are safe');
        expect(result.type).toBe('scientific_consensus');
        expect(result.isVerifiable).toBe(true);
      });
    });
  });

  describe('Partially Verifiable Claim Detection', () => {
    describe('predictive claims', () => {
      it('should classify future predictions as predictive', () => {
        const result = classifyClaim('The tariffs will increase prices by 10% next year');
        expect(result.type).toBe('predictive');
        expect(result.isVerifiable).toBe(true);
      });

      it('should recognize "will cause" as predictive', () => {
        const result = classifyClaim('This policy will cause inflation');
        expect(result.type).toBe('predictive');
        expect(result.isVerifiable).toBe(true);
      });
    });

    describe('comparative claims', () => {
      it('should classify comparison claims as comparative', () => {
        const result = classifyClaim('Drug A is more effective than Drug B');
        expect(result.type).toBe('comparative');
        expect(result.isVerifiable).toBe(true);
      });

      it('should recognize "better than" as comparative', () => {
        const result = classifyClaim('This approach is better than the alternative');
        expect(result.type).toBe('comparative');
        expect(result.isVerifiable).toBe(true);
      });
    });

    describe('effectiveness claims', () => {
      it('should classify policy effectiveness claims', () => {
        const result = classifyClaim('The program effectively reduces poverty');
        expect(result.type).toBe('effectiveness');
        expect(result.isVerifiable).toBe(true);
      });

      it('should recognize "works" claims as effectiveness', () => {
        const result = classifyClaim('This treatment works for most patients');
        expect(result.type).toBe('effectiveness');
        expect(result.isVerifiable).toBe(true);
      });
    });
  });

  describe('Non-Verifiable Claim Detection', () => {
    describe('values claims', () => {
      it('should classify "should" statements as values', () => {
        const result = classifyClaim('The government should provide free healthcare');
        expect(result.type).toBe('values');
        expect(result.isVerifiable).toBe(false);
      });

      it('should classify "must" moral statements as values', () => {
        const result = classifyClaim('We must protect the environment for future generations');
        expect(result.type).toBe('values');
        expect(result.isVerifiable).toBe(false);
      });

      it('should classify "wrong" moral claims as values', () => {
        const result = classifyClaim('It is wrong to discriminate based on race');
        expect(result.type).toBe('values');
        expect(result.isVerifiable).toBe(false);
      });

      it('should classify "right" moral claims as values', () => {
        const result = classifyClaim('It is the right thing to help those in need');
        expect(result.type).toBe('values');
        expect(result.isVerifiable).toBe(false);
      });
    });

    describe('aesthetic claims', () => {
      it('should classify beauty claims as aesthetic', () => {
        const result = classifyClaim('This is the most beautiful painting in the museum');
        expect(result.type).toBe('aesthetic');
        expect(result.isVerifiable).toBe(false);
      });

      it('should classify taste claims as aesthetic', () => {
        const result = classifyClaim('This restaurant serves the best food in town');
        expect(result.type).toBe('aesthetic');
        expect(result.isVerifiable).toBe(false);
      });
    });

    describe('definitional claims', () => {
      it('should classify semantic debates as definitional', () => {
        const result = classifyClaim('This is not really socialism');
        expect(result.type).toBe('definitional');
        expect(result.isVerifiable).toBe(false);
      });

      it('should recognize "true meaning" claims as definitional', () => {
        const result = classifyClaim('The true meaning of freedom is self-determination');
        expect(result.type).toBe('definitional');
        expect(result.isVerifiable).toBe(false);
      });
    });
  });

  describe('Domain Detection', () => {
    it('should detect medicine domain for health claims', () => {
      const domain = detectDomain('Vaccines are safe and effective');
      expect(domain).toBe('medicine');
    });

    it('should detect criminology domain for crime claims', () => {
      const domain = detectDomain('The death penalty does not deter crime');
      expect(domain).toBe('criminology');
    });

    it('should detect economics domain for economic claims', () => {
      const domain = detectDomain('Tax cuts stimulate economic growth');
      expect(domain).toBe('economics');
    });

    it('should detect climate domain for environmental claims', () => {
      const domain = detectDomain('Carbon emissions are causing global warming');
      expect(domain).toBe('climate');
    });

    it('should detect psychology domain for mental health claims', () => {
      const domain = detectDomain('Cognitive behavioral therapy reduces anxiety');
      expect(domain).toBe('psychology');
    });

    it('should detect nutrition domain for diet claims', () => {
      const domain = detectDomain('A high-protein diet helps with weight loss');
      expect(domain).toBe('nutrition');
    });

    it('should detect technology domain for tech claims', () => {
      const domain = detectDomain('AI algorithms can detect cancer earlier');
      expect(domain).toBe('technology');
    });

    it('should detect education domain for school claims', () => {
      const domain = detectDomain('Students learn better with smaller class sizes');
      expect(domain).toBe('education');
    });

    it('should detect politicalScience domain for voting claims', () => {
      const domain = detectDomain('Voter ID laws suppress minority turnout');
      expect(domain).toBe('politicalScience');
    });

    it('should return general for ambiguous claims', () => {
      const domain = detectDomain('This is a general statement about nothing specific');
      expect(domain).toBe('general');
    });
  });

  describe('isVerifiable helper', () => {
    it('should return true for verifiable claim types', () => {
      VERIFIABLE_CLAIM_TYPES.forEach(type => {
        expect(isVerifiable(type)).toBe(true);
      });
    });

    it('should return true for partially verifiable claim types', () => {
      PARTIALLY_VERIFIABLE_CLAIM_TYPES.forEach(type => {
        expect(isVerifiable(type)).toBe(true);
      });
    });

    it('should return false for non-verifiable claim types', () => {
      NON_VERIFIABLE_CLAIM_TYPES.forEach(type => {
        expect(isVerifiable(type)).toBe(false);
      });
    });
  });

  describe('isPartiallyVerifiable helper', () => {
    it('should return true only for partially verifiable types', () => {
      PARTIALLY_VERIFIABLE_CLAIM_TYPES.forEach(type => {
        expect(isPartiallyVerifiable(type)).toBe(true);
      });
    });

    it('should return false for fully verifiable types', () => {
      VERIFIABLE_CLAIM_TYPES.forEach(type => {
        expect(isPartiallyVerifiable(type)).toBe(false);
      });
    });

    it('should return false for non-verifiable types', () => {
      NON_VERIFIABLE_CLAIM_TYPES.forEach(type => {
        expect(isPartiallyVerifiable(type)).toBe(false);
      });
    });
  });

  describe('isNonVerifiable helper', () => {
    it('should return true for non-verifiable types', () => {
      NON_VERIFIABLE_CLAIM_TYPES.forEach(type => {
        expect(isNonVerifiable(type)).toBe(true);
      });
    });

    it('should return false for verifiable types', () => {
      VERIFIABLE_CLAIM_TYPES.forEach(type => {
        expect(isNonVerifiable(type)).toBe(false);
      });
    });
  });

  describe('getVerifiabilityExplanation', () => {
    it('should return explanation for each claim type', () => {
      const allTypes: ClaimType[] = [
        ...VERIFIABLE_CLAIM_TYPES,
        ...PARTIALLY_VERIFIABLE_CLAIM_TYPES,
        ...NON_VERIFIABLE_CLAIM_TYPES,
      ];

      allTypes.forEach(type => {
        const explanation = getVerifiabilityExplanation(type);
        expect(explanation).toBeDefined();
        expect(explanation.length).toBeGreaterThan(0);
      });
    });

    it('should explain why values claims are not verifiable', () => {
      const explanation = getVerifiabilityExplanation('values');
      expect(explanation.toLowerCase()).toContain('values');
    });

    it('should explain why causal claims are verifiable', () => {
      const explanation = getVerifiabilityExplanation('causal');
      const lowerExplanation = explanation.toLowerCase();
      expect(lowerExplanation.includes('cause') || lowerExplanation.includes('causal')).toBe(true);
    });
  });

  describe('classifyClaim full output', () => {
    it('should return complete ClaimClassification object', () => {
      const result = classifyClaim('Smoking causes lung cancer');

      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('isVerifiable');
      expect(result).toHaveProperty('verifiabilityReason');
      expect(result).toHaveProperty('domain');
    });

    it('should include subDomain when applicable', () => {
      const result = classifyClaim('The death penalty does not deter murder');

      expect(result.domain).toBe('criminology');
      // subDomain is optional but may be present for specific claims
    });
  });
});
