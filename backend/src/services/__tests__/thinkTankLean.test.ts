/**
 * TDD Tests for ThinkTankLean Service
 * Wave 2, Agent 7 - Tests for think tank political lean database
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Section 5.2
 */

import {
  getThinkTankLean,
  isThinkTank,
  getAllThinkTanks,
  getThinkTanksByLean,
} from '../../config/thinkTankLeans';

describe('ThinkTankLean Service', () => {
  describe('getThinkTankLean', () => {
    describe('Left-leaning think tanks', () => {
      it('should return center-left for brookings.edu', () => {
        const result = getThinkTankLean('brookings.edu');

        expect(result).toBeDefined();
        expect(result?.lean).toBe('center-left');
        expect(result?.description).toContain('Brookings');
      });

      it('should return left for cbpp.org', () => {
        const result = getThinkTankLean('cbpp.org');

        expect(result).toBeDefined();
        expect(result?.lean).toBe('left');
      });

      it('should return left for epi.org', () => {
        const result = getThinkTankLean('epi.org');

        expect(result).toBeDefined();
        expect(result?.lean).toBe('left');
      });

      it('should return left for americanprogress.org', () => {
        const result = getThinkTankLean('americanprogress.org');

        expect(result).toBeDefined();
        expect(result?.lean).toBe('left');
      });
    });

    describe('Right-leaning think tanks', () => {
      it('should return right for heritage.org', () => {
        const result = getThinkTankLean('heritage.org');

        expect(result).toBeDefined();
        expect(result?.lean).toBe('right');
        expect(result?.description).toContain('Heritage');
      });

      it('should return center-right for aei.org', () => {
        const result = getThinkTankLean('aei.org');

        expect(result).toBeDefined();
        expect(result?.lean).toBe('center-right');
      });

      it('should return libertarian for cato.org', () => {
        const result = getThinkTankLean('cato.org');

        expect(result).toBeDefined();
        expect(result?.lean).toBe('libertarian');
        expect(result?.description).toContain('Cato');
      });

      it('should return right for manhattan-institute.org', () => {
        const result = getThinkTankLean('manhattan-institute.org');

        expect(result).toBeDefined();
        expect(result?.lean).toBe('right');
      });
    });

    describe('Nonpartisan/Academic think tanks', () => {
      it('should return nonpartisan for rand.org', () => {
        const result = getThinkTankLean('rand.org');

        expect(result).toBeDefined();
        expect(result?.lean).toBe('nonpartisan');
        expect(result?.description).toContain('RAND');
      });

      it('should return center for urban.org', () => {
        const result = getThinkTankLean('urban.org');

        expect(result).toBeDefined();
        expect(result?.lean).toBe('center');
      });

      it('should return academic for nber.org', () => {
        const result = getThinkTankLean('nber.org');

        expect(result).toBeDefined();
        expect(result?.lean).toBe('academic');
        expect(result?.description).toContain('National Bureau of Economic Research');
      });
    });

    describe('Unknown domains', () => {
      it('should return null for unknown domains', () => {
        const result = getThinkTankLean('unknowndomain.com');

        expect(result).toBeNull();
      });

      it('should return null for non-think-tank academic domains', () => {
        const result = getThinkTankLean('harvard.edu');

        expect(result).toBeNull();
      });

      it('should return null for news sites', () => {
        const result = getThinkTankLean('nytimes.com');

        expect(result).toBeNull();
      });
    });

    describe('URL variations', () => {
      it('should handle full URLs', () => {
        const result = getThinkTankLean('https://www.brookings.edu/research/article');

        expect(result).toBeDefined();
        expect(result?.lean).toBe('center-left');
      });

      it('should handle www prefix', () => {
        const result = getThinkTankLean('www.heritage.org');

        expect(result).toBeDefined();
        expect(result?.lean).toBe('right');
      });

      it('should handle subdomains', () => {
        const result = getThinkTankLean('research.rand.org');

        expect(result).toBeDefined();
        expect(result?.lean).toBe('nonpartisan');
      });
    });
  });

  describe('isThinkTank', () => {
    it('should return true for known think tanks', () => {
      expect(isThinkTank('brookings.edu')).toBe(true);
      expect(isThinkTank('heritage.org')).toBe(true);
      expect(isThinkTank('cato.org')).toBe(true);
      expect(isThinkTank('rand.org')).toBe(true);
    });

    it('should return false for non-think-tank domains', () => {
      expect(isThinkTank('google.com')).toBe(false);
      expect(isThinkTank('nytimes.com')).toBe(false);
      expect(isThinkTank('stanford.edu')).toBe(false);
    });
  });

  describe('getAllThinkTanks', () => {
    it('should return all think tanks', () => {
      const allTanks = getAllThinkTanks();

      expect(allTanks).toBeDefined();
      expect(allTanks.length).toBeGreaterThan(5);
    });

    it('should include major think tanks', () => {
      const allTanks = getAllThinkTanks();
      const domains = allTanks.map(t => t.domain);

      expect(domains).toContain('brookings.edu');
      expect(domains).toContain('heritage.org');
      expect(domains).toContain('cato.org');
      expect(domains).toContain('rand.org');
    });
  });

  describe('getThinkTanksByLean', () => {
    it('should return left-leaning think tanks', () => {
      const leftTanks = getThinkTanksByLean('left');

      expect(leftTanks.length).toBeGreaterThan(0);
      expect(leftTanks.every(t => t.lean === 'left')).toBe(true);
    });

    it('should return right-leaning think tanks', () => {
      const rightTanks = getThinkTanksByLean('right');

      expect(rightTanks.length).toBeGreaterThan(0);
      expect(rightTanks.every(t => t.lean === 'right')).toBe(true);
    });

    it('should return nonpartisan think tanks', () => {
      const nonpartisanTanks = getThinkTanksByLean('nonpartisan');

      expect(nonpartisanTanks.length).toBeGreaterThan(0);
      expect(nonpartisanTanks.every(t => t.lean === 'nonpartisan')).toBe(true);
    });

    it('should return empty array for invalid lean', () => {
      const invalidTanks = getThinkTanksByLean('invalid' as any);

      expect(invalidTanks).toEqual([]);
    });
  });

  describe('Lean descriptions', () => {
    it('should provide meaningful descriptions', () => {
      const brookings = getThinkTankLean('brookings.edu');
      const heritage = getThinkTankLean('heritage.org');
      const cato = getThinkTankLean('cato.org');

      expect(brookings?.description.length).toBeGreaterThan(10);
      expect(heritage?.description.length).toBeGreaterThan(10);
      expect(cato?.description.length).toBeGreaterThan(10);
    });

    it('should include organization name in description', () => {
      const brookings = getThinkTankLean('brookings.edu');

      expect(brookings?.description.toLowerCase()).toContain('brookings');
    });
  });
});
