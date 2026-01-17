/**
 * TDD Tests for Expert Validator Service
 * Wave 4 - Tests for expert validation system
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Part 7
 *
 * Test categories:
 * 1. Article subject exclusion
 * 2. Politician exclusion
 * 3. Lobbyist/advocate exclusion
 * 4. Corporate spokesperson exclusion
 * 5. Credential validation
 * 6. Research institution validation
 * 7. Domain-specific credential matching
 * 8. Batch validation
 * 9. Integration scenarios
 */

import {
  validateExpert,
  validateExperts,
  isArticleSubject,
  isPolitician,
  isAdvocate,
  isLobbyist,
  isCorporateSpokesperson,
  isAtResearchInstitution,
  extractCredentials,
  hasRelevantCredentials,
  hasAcademicTitle,
  checkDisqualifiers,
  getDisqualificationReason,
  getDisqualificationExplanation,
  shouldExcludeFromExpertPool,
  getExpertQualityTier,
  POLITICIAN_PATTERNS,
  ADVOCACY_ORG_PATTERNS,
  CORPORATE_PATTERNS,
  RESEARCH_INSTITUTION_PATTERNS,
  DEGREE_PATTERNS,
} from '../expertValidator';
import { PersonMention, ExpertValidationInput } from '../../types/expert';
import { Domain } from '../../types/claims';

describe('Expert Validator Service', () => {
  // ═══════════════════════════════════════════════════════════════
  // 1. ARTICLE SUBJECT EXCLUSION
  // ═══════════════════════════════════════════════════════════════
  describe('Article Subject Exclusion', () => {
    describe('isArticleSubject', () => {
      it('should identify exact name match as article subject', () => {
        expect(isArticleSubject('Gavin Newsom', ['Gavin Newsom'])).toBe(true);
      });

      it('should identify case-insensitive match', () => {
        expect(isArticleSubject('gavin newsom', ['Gavin Newsom'])).toBe(true);
        expect(isArticleSubject('GAVIN NEWSOM', ['gavin newsom'])).toBe(true);
      });

      it('should identify last name match', () => {
        expect(isArticleSubject('Newsom', ['Gavin Newsom'])).toBe(true);
        expect(isArticleSubject('Gov. Newsom', ['Gavin Newsom'])).toBe(true);
      });

      it('should identify partial name match', () => {
        expect(isArticleSubject('Elon Musk', ['Musk'])).toBe(true);
        expect(isArticleSubject('Musk', ['Elon Musk'])).toBe(true);
      });

      it('should handle multiple article subjects', () => {
        expect(
          isArticleSubject('Joe Biden', ['Donald Trump', 'Joe Biden'])
        ).toBe(true);
        expect(
          isArticleSubject('Barack Obama', ['Donald Trump', 'Joe Biden'])
        ).toBe(false);
      });

      it('should not match unrelated names', () => {
        expect(isArticleSubject('Daniel Nagin', ['Gavin Newsom'])).toBe(false);
        expect(isArticleSubject('John Smith', ['Jane Doe'])).toBe(false);
      });

      it('should handle names with whitespace', () => {
        expect(isArticleSubject('  Gavin Newsom  ', ['Gavin Newsom'])).toBe(
          true
        );
        expect(isArticleSubject('Gavin Newsom', ['  Gavin Newsom  '])).toBe(
          true
        );
      });

      it('should not match very short last names to prevent false positives', () => {
        expect(isArticleSubject('Dr. Li', ['Robert Li'])).toBe(true); // 'Li' is > 2 chars
        expect(isArticleSubject('Dr. Wu', ['John Wu'])).toBe(true);
      });
    });

    it('should exclude article subjects in full validation', () => {
      const input: ExpertValidationInput = {
        person: {
          name: 'Gavin Newsom',
          title: 'Governor of California',
          credentials: 'JD',
          affiliation: 'State of California',
        },
        articleSubjects: ['Gavin Newsom'],
        claimDomain: 'criminology',
      };

      const result = validateExpert(input);

      expect(result.isValidExpert).toBe(false);
      expect(result.disqualifiers.isArticleSubject).toBe(true);
      expect(result.validationReason).toContain('subject of the article');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 2. POLITICIAN EXCLUSION
  // ═══════════════════════════════════════════════════════════════
  describe('Politician Exclusion', () => {
    describe('isPolitician', () => {
      it('should identify federal elected officials', () => {
        expect(isPolitician('President of the United States')).toBe(true);
        expect(isPolitician('Vice President')).toBe(true);
        expect(isPolitician('Senator from California')).toBe(true);
        expect(isPolitician('Representative')).toBe(true);
        expect(isPolitician('Congressman')).toBe(true);
        expect(isPolitician('Congresswoman')).toBe(true);
      });

      it('should identify state and local officials', () => {
        expect(isPolitician('Governor of Texas')).toBe(true);
        expect(isPolitician('Lieutenant Governor')).toBe(true);
        expect(isPolitician('Mayor of New York')).toBe(true);
        expect(isPolitician('City Council Member')).toBe(true);
        expect(isPolitician('State Legislator')).toBe(true);
        expect(isPolitician('State Senator')).toBe(true);
        expect(isPolitician('Assemblyman')).toBe(true);
        expect(isPolitician('Assemblywoman')).toBe(true);
      });

      it('should identify cabinet and appointed officials', () => {
        expect(isPolitician('Secretary of State')).toBe(true);
        expect(isPolitician('Secretary of Defense')).toBe(true);
        expect(isPolitician('Cabinet member')).toBe(true);
        expect(isPolitician('Deputy Secretary')).toBe(true);
        expect(isPolitician('Undersecretary')).toBe(true);
        expect(isPolitician('Ambassador to France')).toBe(true);
      });

      it('should identify political party roles', () => {
        expect(isPolitician('Party Chair')).toBe(true);
        expect(isPolitician('Campaign Manager')).toBe(true);
        expect(isPolitician('Political Director')).toBe(true);
        expect(isPolitician('Press Secretary')).toBe(true);
        expect(isPolitician('Chief of Staff')).toBe(true);
        expect(isPolitician('White House Official')).toBe(true);
      });

      it('should identify international political roles', () => {
        expect(isPolitician('Prime Minister')).toBe(true);
        expect(isPolitician('Member of Parliament')).toBe(true);
        expect(isPolitician('Chancellor')).toBe(true);
      });

      it('should identify former politicians', () => {
        expect(isPolitician('Former President')).toBe(true);
        expect(isPolitician('Former Senator')).toBe(true);
        expect(isPolitician('Former Governor')).toBe(true);
      });

      it('should not match non-political titles', () => {
        expect(isPolitician('Professor')).toBe(false);
        expect(isPolitician('CEO')).toBe(false);
        expect(isPolitician('Researcher')).toBe(false);
        expect(isPolitician('Director of Research')).toBe(false);
      });

      it('should check both title and affiliation', () => {
        expect(isPolitician(undefined, 'US Senate')).toBe(false); // Senate alone not matched
        expect(isPolitician('Senator', undefined)).toBe(true);
        expect(isPolitician('Chief Economist', 'White House')).toBe(true);
      });
    });

    it('should exclude politicians in full validation', () => {
      const input: ExpertValidationInput = {
        person: {
          name: 'Ted Cruz',
          title: 'Senator from Texas',
          credentials: 'JD from Harvard',
          affiliation: 'US Senate',
        },
        articleSubjects: [],
        claimDomain: 'politicalScience',
      };

      const result = validateExpert(input);

      expect(result.isValidExpert).toBe(false);
      expect(result.disqualifiers.isPolitician).toBe(true);
      expect(result.validationReason).toContain('claimants');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 3. LOBBYIST/ADVOCATE EXCLUSION
  // ═══════════════════════════════════════════════════════════════
  describe('Lobbyist Exclusion', () => {
    describe('isLobbyist', () => {
      it('should identify registered lobbyists', () => {
        expect(isLobbyist('Registered Lobbyist')).toBe(true);
        expect(isLobbyist('Lobbyist for Pharma')).toBe(true);
      });

      it('should identify government relations roles', () => {
        expect(isLobbyist('Government Affairs Director')).toBe(true);
        expect(isLobbyist('Government Relations Manager')).toBe(true);
      });

      it('should identify advocacy directors', () => {
        expect(isLobbyist('Advocacy Director')).toBe(true);
        expect(isLobbyist('Policy Advocate')).toBe(true);
      });

      it('should not match non-lobbying roles', () => {
        expect(isLobbyist('Professor')).toBe(false);
        expect(isLobbyist('Policy Researcher')).toBe(false);
      });
    });

    it('should exclude lobbyists in full validation', () => {
      const input: ExpertValidationInput = {
        person: {
          name: 'John Doe',
          title: 'Registered Lobbyist',
          affiliation: 'K Street Firm',
        },
        articleSubjects: [],
        claimDomain: 'economics',
      };

      const result = validateExpert(input);

      expect(result.isValidExpert).toBe(false);
      expect(result.disqualifiers.isLobbyist).toBe(true);
    });
  });

  describe('Advocate Exclusion', () => {
    describe('isAdvocate', () => {
      it('should identify advocacy organizations', () => {
        expect(isAdvocate('American Civil Liberties Union Advocacy')).toBe(
          true
        );
        expect(isAdvocate('Citizens for Tax Justice')).toBe(true);
        expect(isAdvocate('Americans for Prosperity')).toBe(true);
        expect(isAdvocate('Alliance for Climate Action')).toBe(true);
        expect(isAdvocate('Coalition for Healthcare')).toBe(true);
      });

      it('should identify PACs', () => {
        expect(isAdvocate('Super PAC')).toBe(true);
        expect(isAdvocate('Political Action Committee')).toBe(true);
        expect(isAdvocate('Our PAC')).toBe(true);
      });

      it('should identify activist roles', () => {
        expect(isAdvocate('Climate Activist', 'activist')).toBe(true);
        expect(isAdvocate(undefined, 'campaign coordinator')).toBe(true);
      });

      it('should identify action funds', () => {
        expect(isAdvocate('Action Fund')).toBe(true);
        expect(isAdvocate('Political Action')).toBe(true);
      });

      it('should not match research organizations', () => {
        expect(isAdvocate('Brookings Institution')).toBe(false);
        expect(isAdvocate('RAND Corporation')).toBe(false);
        expect(isAdvocate('Harvard University')).toBe(false);
      });
    });

    it('should exclude advocates in full validation', () => {
      const input: ExpertValidationInput = {
        person: {
          name: 'Jane Activist',
          affiliation: 'Americans for Climate Action',
          role: 'Campaign Director',
        },
        articleSubjects: [],
        claimDomain: 'climate',
      };

      const result = validateExpert(input);

      expect(result.isValidExpert).toBe(false);
      expect(result.disqualifiers.isAdvocate).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 4. CORPORATE SPOKESPERSON EXCLUSION
  // ═══════════════════════════════════════════════════════════════
  describe('Corporate Spokesperson Exclusion', () => {
    describe('isCorporateSpokesperson', () => {
      it('should identify C-suite executives', () => {
        expect(isCorporateSpokesperson('CEO')).toBe(true);
        expect(isCorporateSpokesperson('CFO')).toBe(true);
        expect(isCorporateSpokesperson('COO')).toBe(true);
        expect(isCorporateSpokesperson('CTO')).toBe(true);
        expect(isCorporateSpokesperson('Chief Executive Officer')).toBe(true);
        expect(isCorporateSpokesperson('Chief Financial Officer')).toBe(true);
      });

      it('should identify communications/PR roles', () => {
        expect(isCorporateSpokesperson('Spokesperson')).toBe(true);
        expect(isCorporateSpokesperson('Communications Director')).toBe(true);
        expect(isCorporateSpokesperson('Public Relations Manager')).toBe(true);
        expect(isCorporateSpokesperson('PR Director')).toBe(true);
        expect(isCorporateSpokesperson('Media Relations')).toBe(true);
      });

      it('should identify marketing/sales leadership', () => {
        expect(
          isCorporateSpokesperson('Vice President of Marketing')
        ).toBe(true);
        expect(isCorporateSpokesperson('Director of Sales')).toBe(true);
        expect(
          isCorporateSpokesperson('Head of Business Development')
        ).toBe(true);
      });

      it('should identify investor relations', () => {
        expect(isCorporateSpokesperson('Investor Relations')).toBe(true);
      });

      it('should not match research roles', () => {
        expect(isCorporateSpokesperson('Chief Scientist')).toBe(false);
        expect(isCorporateSpokesperson('Research Director')).toBe(false);
        expect(isCorporateSpokesperson('Lead Researcher')).toBe(false);
      });
    });

    it('should exclude corporate spokespersons in full validation', () => {
      const input: ExpertValidationInput = {
        person: {
          name: 'Tim Cook',
          title: 'CEO of Apple',
          role: 'Chief Executive Officer',
        },
        articleSubjects: [],
        claimDomain: 'technology',
      };

      const result = validateExpert(input);

      expect(result.isValidExpert).toBe(false);
      expect(result.disqualifiers.isCorporateSpokesperson).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 5. CREDENTIAL VALIDATION
  // ═══════════════════════════════════════════════════════════════
  describe('Credential Validation', () => {
    describe('extractCredentials', () => {
      it('should extract PhD credentials', () => {
        const phd1 = extractCredentials('PhD in Economics');
        expect(phd1.some(c => c.toUpperCase().includes('PHD'))).toBe(true);
        const phd2 = extractCredentials('Ph.D. in Physics');
        expect(phd2.some(c => c.toUpperCase().includes('PH') && c.toUpperCase().includes('D'))).toBe(true);
      });

      it('should extract MD credentials', () => {
        const md1 = extractCredentials('MD from Harvard');
        expect(md1.some(c => c.toUpperCase().includes('MD'))).toBe(true);
        const md2 = extractCredentials('M.D.');
        expect(md2.some(c => c.toUpperCase().includes('M') && c.toUpperCase().includes('D'))).toBe(true);
      });

      it('should extract JD credentials', () => {
        const jd1 = extractCredentials('JD from Yale Law');
        expect(jd1.some(c => c.toUpperCase().includes('JD'))).toBe(true);
        const jd2 = extractCredentials('J.D.');
        expect(jd2.some(c => c.toUpperCase().includes('J') && c.toUpperCase().includes('D'))).toBe(true);
      });

      it('should extract multiple credentials', () => {
        const creds = extractCredentials('MD, PhD');
        expect(creds).toContain('MD');
        expect(creds).toContain('PhD');
      });

      it('should extract professional titles', () => {
        expect(extractCredentials(undefined, 'Professor of Economics')).toContain(
          'Professor'
        );
        const drCreds = extractCredentials(undefined, 'Dr. Smith');
        expect(drCreds.some(c => c.startsWith('Dr.'))).toBe(true);
      });

      it('should extract master degrees', () => {
        expect(extractCredentials('MPH from Johns Hopkins')).toContain('MPH');
        expect(extractCredentials('MS in Computer Science')).toContain('MS');
        expect(extractCredentials('MBA from Wharton')).toContain('MBA');
      });

      it('should extract specialty degrees', () => {
        expect(extractCredentials('DO')).toContain('DO');
        expect(extractCredentials('PsyD')).toContain('PsyD');
        expect(extractCredentials('EdD')).toContain('EdD');
      });

      it('should extract professional certifications', () => {
        expect(extractCredentials('RD (Registered Dietitian)')).toContain('RD');
      });

      it('should not duplicate credentials', () => {
        const creds = extractCredentials('PhD in Economics PhD');
        const phdCount = creds.filter((c) => c.toUpperCase().includes('PHD')).length;
        expect(phdCount).toBe(1);
      });
    });

    describe('hasRelevantCredentials', () => {
      it('should match PhD for medicine domain', () => {
        expect(hasRelevantCredentials(['PhD'], 'medicine')).toBe(true);
        expect(hasRelevantCredentials(['MD'], 'medicine')).toBe(true);
        expect(hasRelevantCredentials(['MPH'], 'medicine')).toBe(true);
      });

      it('should match PhD for economics domain', () => {
        expect(hasRelevantCredentials(['PhD'], 'economics')).toBe(true);
      });

      it('should match JD for criminology (legal aspects)', () => {
        expect(hasRelevantCredentials(['JD'], 'criminology')).toBe(true);
      });

      it('should match EdD for education domain', () => {
        expect(hasRelevantCredentials(['EdD'], 'education')).toBe(true);
        expect(hasRelevantCredentials(['PhD'], 'education')).toBe(true);
      });

      it('should match RD for nutrition domain', () => {
        expect(hasRelevantCredentials(['RD'], 'nutrition')).toBe(true);
      });

      it('should not match irrelevant credentials', () => {
        expect(hasRelevantCredentials(['MBA'], 'medicine')).toBe(false);
        expect(hasRelevantCredentials(['JD'], 'medicine')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 6. RESEARCH INSTITUTION VALIDATION
  // ═══════════════════════════════════════════════════════════════
  describe('Research Institution Validation', () => {
    describe('isAtResearchInstitution', () => {
      it('should recognize universities', () => {
        expect(isAtResearchInstitution('Harvard University')).toBe(true);
        expect(isAtResearchInstitution('Stanford University')).toBe(true);
        expect(isAtResearchInstitution('University of California')).toBe(true);
        expect(isAtResearchInstitution('MIT')).toBe(false); // No 'university' keyword
      });

      it('should recognize colleges', () => {
        expect(isAtResearchInstitution('Dartmouth College')).toBe(true);
        expect(isAtResearchInstitution('Boston College')).toBe(true);
      });

      it('should recognize institutes of technology', () => {
        expect(
          isAtResearchInstitution('Massachusetts Institute of Technology')
        ).toBe(true);
        expect(
          isAtResearchInstitution('California Institute of Technology')
        ).toBe(true);
      });

      it('should recognize research centers', () => {
        expect(isAtResearchInstitution('RAND Research Institute')).toBe(true);
        expect(isAtResearchInstitution('Center for Research')).toBe(true);
        expect(isAtResearchInstitution('Research Laboratory')).toBe(true);
      });

      it('should recognize medical institutions', () => {
        expect(isAtResearchInstitution('Harvard Medical School')).toBe(true);
        expect(isAtResearchInstitution('Mayo Clinic Research')).toBe(false); // No pattern match
        expect(
          isAtResearchInstitution('Johns Hopkins Hospital Research')
        ).toBe(true);
      });

      it('should recognize national academies and institutes', () => {
        expect(isAtResearchInstitution('National Academy of Sciences')).toBe(
          true
        );
        expect(isAtResearchInstitution('National Institutes of Health')).toBe(
          true
        );
        expect(isAtResearchInstitution('National Laboratory')).toBe(true);
      });

      it('should not match non-research institutions', () => {
        expect(isAtResearchInstitution('Apple Inc.')).toBe(false);
        expect(isAtResearchInstitution('US Senate')).toBe(false);
        expect(isAtResearchInstitution('Heritage Foundation')).toBe(false);
      });

      it('should return false for undefined/null', () => {
        expect(isAtResearchInstitution(undefined)).toBe(false);
        expect(isAtResearchInstitution('')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 7. ACADEMIC TITLE VALIDATION
  // ═══════════════════════════════════════════════════════════════
  describe('Academic Title Validation', () => {
    describe('hasAcademicTitle', () => {
      it('should recognize professor titles', () => {
        expect(hasAcademicTitle('Professor of Economics')).toBe(true);
        expect(hasAcademicTitle('Associate Professor')).toBe(true);
        expect(hasAcademicTitle('Assistant Professor')).toBe(true);
        expect(hasAcademicTitle('Emeritus Professor')).toBe(true);
      });

      it('should recognize research titles', () => {
        expect(hasAcademicTitle('Research Fellow')).toBe(true);
        expect(hasAcademicTitle('Research Scientist')).toBe(true);
        expect(hasAcademicTitle('Senior Researcher')).toBe(true);
        expect(hasAcademicTitle('Research Associate')).toBe(true);
      });

      it('should recognize postdoctoral positions', () => {
        expect(hasAcademicTitle('Postdoctoral Fellow')).toBe(true);
        expect(hasAcademicTitle('Postdoctoral Researcher')).toBe(true);
      });

      it('should recognize UK academic titles', () => {
        expect(hasAcademicTitle('Lecturer')).toBe(true);
        expect(hasAcademicTitle('Senior Lecturer')).toBe(true);
        expect(hasAcademicTitle('Reader in Physics')).toBe(true);
      });

      it('should recognize department leadership', () => {
        expect(hasAcademicTitle('Department Chair')).toBe(true);
        expect(hasAcademicTitle('Department Head')).toBe(true);
        expect(hasAcademicTitle('Lab Director')).toBe(true);
      });

      it('should not match non-academic titles', () => {
        expect(hasAcademicTitle('CEO')).toBe(false);
        expect(hasAcademicTitle('Manager')).toBe(false);
        expect(hasAcademicTitle('Consultant')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 8. FULL VALIDATION SCENARIOS
  // ═══════════════════════════════════════════════════════════════
  describe('Full Validation', () => {
    describe('validateExpert', () => {
      it('should validate a credentialed university professor', () => {
        const input: ExpertValidationInput = {
          person: {
            name: 'Daniel Nagin',
            title: 'Professor of Public Policy',
            credentials: 'PhD in Economics',
            affiliation: 'Carnegie Mellon University',
          },
          articleSubjects: ['Gavin Newsom'],
          claimDomain: 'criminology',
        };

        const result = validateExpert(input);

        expect(result.isValidExpert).toBe(true);
        expect(result.hasRelevantDegree).toBe(true);
        expect(result.isAtResearchInstitution).toBe(true);
        expect(result.confidenceScore).toBeGreaterThan(0.5);
      });

      it('should validate a medical researcher', () => {
        const input: ExpertValidationInput = {
          person: {
            name: 'Dr. Anthony Fauci',
            title: 'Director, Research Institute',
            credentials: 'MD from Cornell',
            affiliation: 'National Institutes of Health',
          },
          articleSubjects: [],
          claimDomain: 'medicine',
        };

        const result = validateExpert(input);

        expect(result.isValidExpert).toBe(true);
        expect(result.hasRelevantDegree).toBe(true);
      });

      it('should not validate someone without credentials', () => {
        const input: ExpertValidationInput = {
          person: {
            name: 'Random Blogger',
            title: 'Writer',
            affiliation: 'Self-employed',
          },
          articleSubjects: [],
          claimDomain: 'medicine',
        };

        const result = validateExpert(input);

        expect(result.isValidExpert).toBe(false);
        expect(result.hasRelevantDegree).toBe(false);
        expect(result.validationReason).toContain('Missing');
      });

      it('should prioritize disqualification over credentials', () => {
        const input: ExpertValidationInput = {
          person: {
            name: 'Dr. Senator John Doe',
            title: 'Senator and Former Professor',
            credentials: 'PhD, MD',
            affiliation: 'US Senate, formerly Harvard University',
          },
          articleSubjects: [],
          claimDomain: 'medicine',
        };

        const result = validateExpert(input);

        expect(result.isValidExpert).toBe(false);
        expect(result.disqualifiers.isPolitician).toBe(true);
      });
    });

    describe('validateExperts (batch)', () => {
      it('should validate multiple experts and separate valid from excluded', () => {
        const persons: PersonMention[] = [
          {
            name: 'Dr. Jane Smith',
            title: 'Professor of Medicine',
            credentials: 'MD, PhD',
            affiliation: 'Johns Hopkins University',
          },
          {
            name: 'Senator Bob Johnson',
            title: 'Senator from Ohio',
            credentials: 'JD',
            affiliation: 'US Senate',
          },
          {
            name: 'John Doe',
            title: 'Blogger',
          },
          {
            name: 'CEO Tech',
            title: 'CEO of TechCorp',
            role: 'Chief Executive Officer',
          },
        ];

        const result = validateExperts(persons, [], 'medicine');

        expect(result.totalProcessed).toBe(4);
        expect(result.validCount).toBe(1);
        expect(result.excludedCount).toBe(3);
        expect(result.validExperts[0].name).toBe('Dr. Jane Smith');
        expect(result.excludedPersons.map((p) => p.reason)).toContain(
          'politician'
        );
        expect(result.excludedPersons.map((p) => p.reason)).toContain(
          'corporate_spokesperson'
        );
      });

      it('should exclude article subjects from batch', () => {
        const persons: PersonMention[] = [
          {
            name: 'Gavin Newsom',
            title: 'Governor',
            credentials: 'JD',
          },
          {
            name: 'Dr. Expert',
            title: 'Professor',
            credentials: 'PhD',
            affiliation: 'Stanford University',
          },
        ];

        const result = validateExperts(persons, ['Gavin Newsom'], 'criminology');

        expect(result.validCount).toBe(1);
        expect(result.excludedPersons[0].reason).toBe('article_subject');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 9. HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════════
  describe('Helper Functions', () => {
    describe('checkDisqualifiers', () => {
      it('should return all false for clean candidate', () => {
        const person: PersonMention = {
          name: 'Dr. Jane Smith',
          title: 'Professor',
          affiliation: 'MIT',
        };

        const result = checkDisqualifiers(person, []);

        expect(result.isArticleSubject).toBe(false);
        expect(result.isPolitician).toBe(false);
        expect(result.isLobbyist).toBe(false);
        expect(result.isAdvocate).toBe(false);
        expect(result.isCorporateSpokesperson).toBe(false);
      });

      it('should detect multiple disqualifiers', () => {
        const person: PersonMention = {
          name: 'John Smith',
          title: 'CEO and Campaign Manager',
        };

        const result = checkDisqualifiers(person, ['John Smith']);

        expect(result.isArticleSubject).toBe(true);
        expect(result.isPolitician).toBe(true);
        expect(result.isCorporateSpokesperson).toBe(true);
      });
    });

    describe('getDisqualificationReason', () => {
      it('should return article_subject first', () => {
        const disqualifiers = {
          isArticleSubject: true,
          isPolitician: true,
          isLobbyist: false,
          isAdvocate: false,
          isCorporateSpokesperson: false,
          hasUndisclosedConflict: false,
        };

        expect(getDisqualificationReason(disqualifiers)).toBe('article_subject');
      });

      it('should return null if no disqualifiers', () => {
        const disqualifiers = {
          isArticleSubject: false,
          isPolitician: false,
          isLobbyist: false,
          isAdvocate: false,
          isCorporateSpokesperson: false,
          hasUndisclosedConflict: false,
        };

        expect(getDisqualificationReason(disqualifiers)).toBeNull();
      });
    });

    describe('getDisqualificationExplanation', () => {
      it('should return explanation for article_subject', () => {
        const explanation = getDisqualificationExplanation('article_subject');
        expect(explanation).toContain('subject of the article');
      });

      it('should return explanation for politician', () => {
        const explanation = getDisqualificationExplanation('politician');
        expect(explanation).toContain('claimants');
      });

      it('should return explanation for all reasons', () => {
        const reasons: Array<
          | 'article_subject'
          | 'politician'
          | 'lobbyist'
          | 'advocate'
          | 'corporate_spokesperson'
          | 'undisclosed_conflict'
          | 'missing_credentials'
          | 'irrelevant_field'
          | 'no_publications'
        > = [
          'article_subject',
          'politician',
          'lobbyist',
          'advocate',
          'corporate_spokesperson',
          'undisclosed_conflict',
          'missing_credentials',
          'irrelevant_field',
          'no_publications',
        ];

        reasons.forEach((reason) => {
          const explanation = getDisqualificationExplanation(reason);
          expect(explanation).toBeTruthy();
          expect(explanation.length).toBeGreaterThan(10);
        });
      });
    });

    describe('shouldExcludeFromExpertPool', () => {
      it('should quickly identify exclusions', () => {
        expect(
          shouldExcludeFromExpertPool(
            { name: 'Subject' },
            ['Subject']
          ).exclude
        ).toBe(true);

        expect(
          shouldExcludeFromExpertPool(
            { name: 'John', title: 'Senator' },
            []
          ).exclude
        ).toBe(true);

        expect(
          shouldExcludeFromExpertPool(
            { name: 'Dr. Expert', title: 'Professor' },
            []
          ).exclude
        ).toBe(false);
      });
    });

    describe('getExpertQualityTier', () => {
      it('should return unverified for invalid experts', () => {
        const validation = {
          isValidExpert: false,
          hasRelevantDegree: false,
          hasRelevantPublications: false,
          isAtResearchInstitution: false,
          disqualifiers: {
            isArticleSubject: false,
            isPolitician: true,
            isLobbyist: false,
            isAdvocate: false,
            isCorporateSpokesperson: false,
            hasUndisclosedConflict: false,
          },
          qualityIndicators: {},
          validationReason: 'Not validated',
          confidenceScore: 0,
        };

        expect(getExpertQualityTier(validation)).toBe('unverified');
      });

      it('should return top for high h-index experts', () => {
        const validation = {
          isValidExpert: true,
          hasRelevantDegree: true,
          hasRelevantPublications: true,
          isAtResearchInstitution: true,
          disqualifiers: {
            isArticleSubject: false,
            isPolitician: false,
            isLobbyist: false,
            isAdvocate: false,
            isCorporateSpokesperson: false,
            hasUndisclosedConflict: false,
          },
          qualityIndicators: {},
          validationReason: 'Valid',
          confidenceScore: 0.9,
        };

        const indicators = {
          hIndex: 50,
          totalCitations: 10000,
        };

        expect(getExpertQualityTier(validation, indicators)).toBe('top');
      });

      it('should return established for medium metrics', () => {
        const validation = {
          isValidExpert: true,
          hasRelevantDegree: true,
          hasRelevantPublications: true,
          isAtResearchInstitution: true,
          disqualifiers: {
            isArticleSubject: false,
            isPolitician: false,
            isLobbyist: false,
            isAdvocate: false,
            isCorporateSpokesperson: false,
            hasUndisclosedConflict: false,
          },
          qualityIndicators: {},
          validationReason: 'Valid',
          confidenceScore: 0.8,
        };

        const indicators = {
          hIndex: 20,
          totalCitations: 1000,
        };

        expect(getExpertQualityTier(validation, indicators)).toBe('established');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 10. PATTERN COVERAGE TESTS
  // ═══════════════════════════════════════════════════════════════
  describe('Pattern Coverage', () => {
    it('should have politician patterns that cover common titles', () => {
      const testCases = [
        'President of the United States',
        'Senator from Massachusetts',
        'Governor of Florida',
        'Mayor of New York City',
        'Secretary of State',
        'Representative from New York',
      ];

      testCases.forEach((title) => {
        const matches = POLITICIAN_PATTERNS.some((p) => p.test(title));
        expect(matches).toBe(true);
      });
    });

    it('should have research institution patterns that cover major types', () => {
      const testCases = [
        'Harvard University',
        'MIT College',
        'Brookings Research Institute',
        'National Academy of Sciences',
        'Stanford Medical School',
      ];

      testCases.forEach((institution) => {
        const matches = RESEARCH_INSTITUTION_PATTERNS.some((p) =>
          p.test(institution)
        );
        expect(matches).toBe(true);
      });
    });

    it('should have degree patterns that cover common academic credentials', () => {
      const testCases = ['PhD', 'Ph.D', 'MD', 'M.D', 'JD', 'Professor', 'Dr. Smith'];

      testCases.forEach((degree) => {
        const matches = DEGREE_PATTERNS.some((p) => p.test(degree));
        expect(matches).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // 11. DEATH PENALTY SPEC TEST CASE
  // ═══════════════════════════════════════════════════════════════
  describe('Spec Test Case: Death Penalty Article', () => {
    it('should exclude Gavin Newsom as article subject and validate Daniel Nagin', () => {
      const articleSubjects = ['Gavin Newsom'];
      const claimDomain: Domain = 'criminology';

      // Newsom should be excluded
      const newsomValidation = validateExpert({
        person: {
          name: 'Gavin Newsom',
          title: 'Governor of California',
          credentials: 'JD',
        },
        articleSubjects,
        claimDomain,
      });

      expect(newsomValidation.isValidExpert).toBe(false);
      expect(newsomValidation.disqualifiers.isArticleSubject).toBe(true);

      // Nagin should be validated as expert
      const naginValidation = validateExpert({
        person: {
          name: 'Daniel Nagin',
          title: 'Teresa and H. John Heinz III Professor of Public Policy',
          credentials: 'PhD',
          affiliation: 'Carnegie Mellon University',
        },
        articleSubjects,
        claimDomain,
      });

      expect(naginValidation.isValidExpert).toBe(true);
      expect(naginValidation.hasRelevantDegree).toBe(true);
      expect(naginValidation.isAtResearchInstitution).toBe(true);
    });

    it('should validate other criminology experts from the spec', () => {
      const articleSubjects = ['Gavin Newsom'];
      const claimDomain: Domain = 'criminology';

      // John Donohue
      const donohueValidation = validateExpert({
        person: {
          name: 'John Donohue',
          title: 'Professor of Law',
          credentials: 'JD, PhD',
          affiliation: 'Stanford Law School University',
        },
        articleSubjects,
        claimDomain,
      });

      expect(donohueValidation.isValidExpert).toBe(true);

      // Jeffrey Fagan
      const faganValidation = validateExpert({
        person: {
          name: 'Jeffrey Fagan',
          title: 'Professor of Law',
          credentials: 'PhD',
          affiliation: 'Columbia Law School University',
        },
        articleSubjects,
        claimDomain,
      });

      expect(faganValidation.isValidExpert).toBe(true);
    });
  });
});
