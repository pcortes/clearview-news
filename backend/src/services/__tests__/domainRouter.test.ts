/**
 * TDD Tests for DomainRouter Service
 * Wave 2, Agent 5 - Tests for domain-specific source routing
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Part 4
 */

import {
  getDomainConfig,
  buildSearchQueries,
  getRelevantSources,
  getDomainAliases,
} from '../domainRouter';
import { DOMAIN_CONFIGS } from '../../config/domainConfigs';
import { Domain, ClassifiedClaim } from '../../types/claims';

describe('DomainRouter Service', () => {
  describe('getDomainConfig', () => {
    it('should return config for medicine domain', () => {
      const config = getDomainConfig('medicine');

      expect(config).toBeDefined();
      expect(config.name).toBe('Medicine & Health');
      expect(config.academicSources.databases).toContain('pubmed.gov');
      expect(config.academicSources.databases).toContain('cochranelibrary.com');
    });

    it('should return config for economics domain', () => {
      const config = getDomainConfig('economics');

      expect(config).toBeDefined();
      expect(config.name).toBe('Economics');
      expect(config.academicSources.databases).toContain('nber.org');
      expect(config.academicSources.databases).toContain('ssrn.com');
    });

    it('should return config for criminology domain', () => {
      const config = getDomainConfig('criminology');

      expect(config).toBeDefined();
      expect(config.name).toBe('Criminology & Criminal Justice');
      expect(config.academicSources.journals).toContain('Criminology');
    });

    it('should return config for climate domain', () => {
      const config = getDomainConfig('climate');

      expect(config).toBeDefined();
      expect(config.name).toBe('Climate & Environment');
      expect(config.academicSources.systematicReviewSources).toContain('IPCC Assessment Reports');
    });

    it('should return config for psychology domain', () => {
      const config = getDomainConfig('psychology');

      expect(config).toBeDefined();
      expect(config.academicSources.journals).toContain('Psychological Science');
    });

    it('should return config for nutrition domain', () => {
      const config = getDomainConfig('nutrition');

      expect(config).toBeDefined();
      expect(config.academicSources.databases).toContain('pubmed.gov');
    });

    it('should return config for politicalScience domain', () => {
      const config = getDomainConfig('politicalScience');

      expect(config).toBeDefined();
      expect(config.academicSources.journals).toContain('American Political Science Review');
    });

    it('should return config for technology domain', () => {
      const config = getDomainConfig('technology');

      expect(config).toBeDefined();
      expect(config.academicSources.databases).toContain('arxiv.org');
    });

    it('should return config for education domain', () => {
      const config = getDomainConfig('education');

      expect(config).toBeDefined();
      expect(config.academicSources.systematicReviewSources).toContain('What Works Clearinghouse');
    });

    it('should return general config for general domain', () => {
      const config = getDomainConfig('general');

      expect(config).toBeDefined();
      expect(config.name).toBe('General');
    });
  });

  describe('Domain routing for specific claims', () => {
    it('should route medicine claims to Cochrane and PubMed', () => {
      const config = getDomainConfig('medicine');
      const sources = getRelevantSources('medicine');

      expect(sources.databases).toContain('cochranelibrary.com');
      expect(sources.databases).toContain('pubmed.gov');
    });

    it('should route economics claims to NBER and SSRN', () => {
      const config = getDomainConfig('economics');
      const sources = getRelevantSources('economics');

      expect(sources.databases).toContain('nber.org');
      expect(sources.databases).toContain('ssrn.com');
    });

    it('should route climate claims to IPCC sources', () => {
      const config = getDomainConfig('climate');

      expect(config.academicSources.systematicReviewSources).toContain('IPCC Assessment Reports');
      expect(config.institutionalSources.international).toContain('ipcc.ch');
    });

    it('should route criminology claims to NRC and DOJ', () => {
      const config = getDomainConfig('criminology');

      expect(config.academicSources.majorReports).toContain('National Research Council reports');
      expect(config.institutionalSources.government).toContain('bjs.gov');
    });
  });

  describe('buildSearchQueries', () => {
    it('should generate queries based on domain templates', () => {
      const claim: ClassifiedClaim = {
        id: 'test',
        text: 'Vaccines are safe and effective',
        type: 'empirical',
        isVerifiable: true,
        verifiabilityReason: 'Empirical claim',
        source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false },
        domain: 'medicine',
      };

      const queries = buildSearchQueries(claim);

      expect(queries).toBeDefined();
      expect(queries.length).toBeGreaterThan(0);
      expect(queries.some(q => q.includes('systematic review') || q.includes('Cochrane'))).toBe(true);
    });

    it('should include topic in generated queries', () => {
      const claim: ClassifiedClaim = {
        id: 'test',
        text: 'The death penalty does not deter crime',
        type: 'causal',
        isVerifiable: true,
        verifiabilityReason: 'Causal claim',
        source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false },
        domain: 'criminology',
      };

      const queries = buildSearchQueries(claim);

      // At least one query should reference death penalty or deterrence
      expect(queries.some(q =>
        q.toLowerCase().includes('death penalty') ||
        q.toLowerCase().includes('deter')
      )).toBe(true);
    });

    it('should generate domain-appropriate queries for economics', () => {
      const claim: ClassifiedClaim = {
        id: 'test',
        text: 'Tax cuts stimulate economic growth',
        type: 'causal',
        isVerifiable: true,
        verifiabilityReason: 'Causal claim',
        source: { name: 'Unknown', role: 'unknown', isExcludedFromExpertPool: false },
        domain: 'economics',
      };

      const queries = buildSearchQueries(claim);

      // Should include NBER or economic research related terms
      expect(queries.some(q =>
        q.includes('NBER') ||
        q.includes('economic') ||
        q.includes('empirical')
      )).toBe(true);
    });
  });

  describe('Domain aliases', () => {
    it('should recognize health as medicine alias', () => {
      const aliases = getDomainAliases('medicine');
      expect(aliases).toContain('health');
      expect(aliases).toContain('medical');
    });

    it('should recognize economy as economics alias', () => {
      const aliases = getDomainAliases('economics');
      expect(aliases).toContain('economy');
      expect(aliases).toContain('fiscal');
    });

    it('should recognize crime as criminology alias', () => {
      const aliases = getDomainAliases('criminology');
      expect(aliases).toContain('crime');
      expect(aliases).toContain('criminal');
    });
  });

  describe('Domain caveats', () => {
    it('should flag replication concerns for psychology', () => {
      const config = getDomainConfig('psychology');
      expect(config.caveats.replicationConcerns).toBe(true);
    });

    it('should flag high politicization for climate', () => {
      const config = getDomainConfig('climate');
      expect(config.caveats.politicization).toBe('high');
    });

    it('should flag industry influence for medicine', () => {
      const config = getDomainConfig('medicine');
      expect(config.caveats.industryInfluence).toContain('pharmaceutical companies');
    });

    it('should flag rapidly evolving for technology', () => {
      const config = getDomainConfig('technology');
      expect(config.caveats.rapidlyEvolving).toBe(true);
    });
  });

  describe('Expert identification', () => {
    it('should include typical credentials for medicine', () => {
      const config = getDomainConfig('medicine');
      expect(config.expertIdentification.typicalCredentials).toContain('MD');
      expect(config.expertIdentification.typicalCredentials).toContain('PhD');
    });

    it('should include relevant departments for criminology', () => {
      const config = getDomainConfig('criminology');
      expect(config.expertIdentification.relevantDepartments).toContain('Criminology');
      expect(config.expertIdentification.relevantDepartments).toContain('Criminal Justice');
    });

    it('should include professional organizations for economics', () => {
      const config = getDomainConfig('economics');
      expect(config.expertIdentification.professionalOrgs).toContain('AEA');
    });
  });

  describe('DOMAIN_CONFIGS completeness', () => {
    const requiredDomains: Domain[] = [
      'medicine',
      'climate',
      'economics',
      'criminology',
      'psychology',
      'nutrition',
      'politicalScience',
      'technology',
      'education',
      'general',
    ];

    requiredDomains.forEach(domain => {
      it(`should have configuration for ${domain}`, () => {
        const config = DOMAIN_CONFIGS[domain];
        expect(config).toBeDefined();
        expect(config.name).toBeDefined();
        expect(config.aliases).toBeDefined();
        expect(config.academicSources).toBeDefined();
      });
    });
  });
});
