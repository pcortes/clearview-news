/**
 * Domain Configurations
 * Wave 2 - Domain-specific source configurations
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Part 4
 */

import { Domain } from '../types/claims';

/**
 * Domain configuration interface
 */
export interface DomainConfig {
  name: string;
  aliases: string[];

  // Primary academic sources (Tier 1-2)
  academicSources: {
    databases: string[];
    journals: string[];
    systematicReviewSources: string[];
    majorReports: string[];
  };

  // Institutional sources (Tier 3)
  institutionalSources: {
    government: string[];
    international: string[];
    researchOrgs: string[];
  };

  // Expert identification
  expertIdentification: {
    typicalCredentials: string[];
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

/**
 * All domain configurations
 */
export const DOMAIN_CONFIGS: Record<Domain, DomainConfig> = {
  // ═══════════════════════════════════════════════════════════════
  // MEDICINE & HEALTH
  // ═══════════════════════════════════════════════════════════════
  medicine: {
    name: 'Medicine & Health',
    aliases: ['health', 'medical', 'healthcare', 'disease', 'treatment', 'drug'],

    academicSources: {
      databases: [
        'pubmed.gov',
        'cochranelibrary.com',
        'semanticscholar.org',
      ],
      journals: [
        'NEJM (New England Journal of Medicine)',
        'JAMA (Journal of the American Medical Association)',
        'The Lancet',
        'BMJ (British Medical Journal)',
        'Annals of Internal Medicine',
      ],
      systematicReviewSources: [
        'Cochrane Database of Systematic Reviews',
        'AHRQ Evidence Reports',
        'JBI Evidence Synthesis',
      ],
      majorReports: [
        'WHO guidelines',
        'CDC recommendations',
        'FDA drug reviews',
        'USPSTF recommendations',
      ],
    },

    institutionalSources: {
      government: ['cdc.gov', 'fda.gov', 'nih.gov', 'ahrq.gov'],
      international: ['who.int'],
      researchOrgs: ['healthaffairs.org', 'kff.org'],
    },

    expertIdentification: {
      typicalCredentials: ['MD', 'PhD', 'MPH', 'DO'],
      relevantDepartments: [
        'Medicine',
        'Public Health',
        'Epidemiology',
        'Pharmacology',
        'Clinical Research',
      ],
      professionalOrgs: ['AMA', 'specialty medical associations'],
    },

    caveats: {
      replicationConcerns: false,
      industryInfluence: ['pharmaceutical companies', 'device manufacturers'],
      politicization: 'medium',
      rapidlyEvolving: true,
    },

    queryTemplates: [
      '{topic} systematic review Cochrane',
      '{topic} randomized controlled trial',
      '{topic} meta-analysis JAMA OR NEJM OR Lancet',
      '{topic} clinical evidence efficacy',
      '{topic} FDA approval clinical trials',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CLIMATE & ENVIRONMENT
  // ═══════════════════════════════════════════════════════════════
  climate: {
    name: 'Climate & Environment',
    aliases: ['climate change', 'global warming', 'environment', 'emissions', 'carbon'],

    academicSources: {
      databases: [
        'semanticscholar.org',
        'webofscience.com',
        'scopus.com',
      ],
      journals: [
        'Nature Climate Change',
        'Nature',
        'Science',
        'Geophysical Research Letters',
        'Environmental Research Letters',
        'Climatic Change',
      ],
      systematicReviewSources: [
        'IPCC Assessment Reports',
        'National Climate Assessment',
        'Royal Society reports',
      ],
      majorReports: [
        'IPCC reports',
        'NOAA climate reports',
        'NASA climate research',
        'National Academies reports',
      ],
    },

    institutionalSources: {
      government: ['climate.gov', 'nasa.gov/climate', 'epa.gov'],
      international: ['ipcc.ch', 'unep.org', 'wmo.int'],
      researchOrgs: ['climatecentral.org', 'carbonbrief.org'],
    },

    expertIdentification: {
      typicalCredentials: ['PhD'],
      relevantDepartments: [
        'Climate Science',
        'Atmospheric Science',
        'Earth Science',
        'Environmental Science',
        'Oceanography',
        'Ecology',
      ],
      professionalOrgs: ['AGU', 'AMS', 'ESA'],
    },

    caveats: {
      replicationConcerns: false,
      industryInfluence: ['fossil fuel industry (historical denial funding)'],
      politicization: 'high',
      rapidlyEvolving: true,
    },

    queryTemplates: [
      '{topic} IPCC assessment',
      '{topic} climate science peer-reviewed',
      '{topic} Nature Climate Change',
      '{topic} empirical evidence climate',
      '{topic} National Academy Sciences climate',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ECONOMICS
  // ═══════════════════════════════════════════════════════════════
  economics: {
    name: 'Economics',
    aliases: ['economy', 'economic', 'fiscal', 'monetary', 'trade', 'tariff', 'inflation'],

    academicSources: {
      databases: [
        'nber.org',
        'ssrn.com',
        'econpapers.repec.org',
        'semanticscholar.org',
      ],
      journals: [
        'American Economic Review',
        'Quarterly Journal of Economics',
        'Econometrica',
        'Journal of Political Economy',
        'Review of Economic Studies',
        'Journal of Finance',
      ],
      systematicReviewSources: [
        'Journal of Economic Literature reviews',
        'NBER working paper series',
        'IMF working papers',
      ],
      majorReports: [
        'Federal Reserve research',
        'CBO analyses',
        'IMF World Economic Outlook',
        'World Bank reports',
      ],
    },

    institutionalSources: {
      government: ['bls.gov', 'census.gov', 'bea.gov', 'federalreserve.gov', 'cbo.gov'],
      international: ['imf.org', 'worldbank.org', 'oecd.org'],
      researchOrgs: ['brookings.edu', 'nber.org', 'piie.com'],
    },

    expertIdentification: {
      typicalCredentials: ['PhD'],
      relevantDepartments: [
        'Economics',
        'Finance',
        'Public Policy',
        'Business School (economics faculty)',
      ],
      professionalOrgs: ['AEA', 'Econometric Society'],
    },

    caveats: {
      replicationConcerns: true,
      industryInfluence: ['financial industry', 'think tanks with agendas'],
      politicization: 'high',
      rapidlyEvolving: false,
    },

    queryTemplates: [
      '{topic} NBER working paper',
      '{topic} empirical economics study',
      '{topic} American Economic Review',
      '{topic} causal effect economic',
      '{topic} Federal Reserve research',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // CRIMINOLOGY & CRIMINAL JUSTICE
  // ═══════════════════════════════════════════════════════════════
  criminology: {
    name: 'Criminology & Criminal Justice',
    aliases: ['crime', 'criminal', 'prison', 'police', 'justice', 'incarceration', 'death penalty'],

    academicSources: {
      databases: [
        'semanticscholar.org',
        'jstor.org',
        'ncjrs.gov',
      ],
      journals: [
        'Criminology',
        'Journal of Quantitative Criminology',
        'Journal of Research in Crime and Delinquency',
        'Justice Quarterly',
        'Journal of Criminal Law and Criminology',
      ],
      systematicReviewSources: [
        'Campbell Collaboration crime & justice reviews',
        'National Research Council reports',
        'RAND criminal justice research',
      ],
      majorReports: [
        'National Research Council reports',
        'Bureau of Justice Statistics',
        'NIJ research reports',
      ],
    },

    institutionalSources: {
      government: ['bjs.gov', 'nij.gov', 'fbi.gov/ucr'],
      international: ['unodc.org'],
      researchOrgs: ['rand.org', 'vera.org', 'sentencingproject.org'],
    },

    expertIdentification: {
      typicalCredentials: ['PhD', 'JD (for legal aspects)'],
      relevantDepartments: [
        'Criminology',
        'Criminal Justice',
        'Sociology (crime)',
        'Law School (empirical legal studies)',
      ],
      professionalOrgs: ['ASC (American Society of Criminology)'],
    },

    caveats: {
      replicationConcerns: true,
      industryInfluence: ['prison industry', 'police unions'],
      politicization: 'high',
      rapidlyEvolving: false,
    },

    queryTemplates: [
      '{topic} criminology meta-analysis',
      '{topic} National Research Council crime',
      '{topic} empirical criminal justice',
      '{topic} Campbell Collaboration crime',
      '{topic} Journal of Quantitative Criminology',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // PSYCHOLOGY
  // ═══════════════════════════════════════════════════════════════
  psychology: {
    name: 'Psychology',
    aliases: ['mental health', 'psychological', 'behavior', 'cognitive', 'therapy'],

    academicSources: {
      databases: [
        'psycnet.apa.org',
        'pubmed.gov',
        'semanticscholar.org',
      ],
      journals: [
        'Psychological Science',
        'Journal of Personality and Social Psychology',
        'Psychological Bulletin',
        'American Psychologist',
        'Clinical Psychological Science',
      ],
      systematicReviewSources: [
        'Psychological Bulletin meta-analyses',
        'Cochrane mental health reviews',
        'APA clinical practice guidelines',
      ],
      majorReports: [
        'APA task force reports',
        'NIMH research',
        'Surgeon General mental health reports',
      ],
    },

    institutionalSources: {
      government: ['nimh.nih.gov'],
      international: ['who.int/mental_health'],
      researchOrgs: ['apa.org'],
    },

    expertIdentification: {
      typicalCredentials: ['PhD', 'PsyD', 'MD (psychiatry)'],
      relevantDepartments: [
        'Psychology',
        'Psychiatry',
        'Cognitive Science',
        'Neuroscience',
        'Behavioral Science',
      ],
      professionalOrgs: ['APA', 'APS'],
    },

    caveats: {
      replicationConcerns: true,
      industryInfluence: ['pharmaceutical (for psychiatric drugs)'],
      politicization: 'medium',
      rapidlyEvolving: true,
    },

    queryTemplates: [
      '{topic} meta-analysis psychology',
      '{topic} replication psychological',
      '{topic} Psychological Bulletin',
      '{topic} randomized controlled trial therapy',
      '{topic} effect size psychology',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // NUTRITION
  // ═══════════════════════════════════════════════════════════════
  nutrition: {
    name: 'Nutrition',
    aliases: ['diet', 'food', 'eating', 'vitamins', 'supplements', 'obesity'],

    academicSources: {
      databases: [
        'pubmed.gov',
        'cochranelibrary.com',
      ],
      journals: [
        'American Journal of Clinical Nutrition',
        'Journal of Nutrition',
        'Nutrition Reviews',
        'British Journal of Nutrition',
        'Obesity',
      ],
      systematicReviewSources: [
        'Cochrane nutrition reviews',
        'Dietary Guidelines Advisory Committee reports',
        'AHRQ nutrition evidence reviews',
      ],
      majorReports: [
        'Dietary Guidelines for Americans',
        'WHO nutrition guidelines',
        'USDA nutrition research',
      ],
    },

    institutionalSources: {
      government: ['ods.nih.gov', 'usda.gov'],
      international: ['who.int/nutrition'],
      researchOrgs: ['nutrition.org'],
    },

    expertIdentification: {
      typicalCredentials: ['PhD', 'RD', 'MD'],
      relevantDepartments: [
        'Nutrition',
        'Dietetics',
        'Public Health',
        'Epidemiology (nutritional)',
      ],
      professionalOrgs: ['AND (Academy of Nutrition and Dietetics)', 'ASN'],
    },

    caveats: {
      replicationConcerns: true,
      industryInfluence: ['food industry', 'supplement industry'],
      politicization: 'medium',
      rapidlyEvolving: true,
    },

    queryTemplates: [
      '{topic} systematic review nutrition',
      '{topic} randomized controlled trial diet',
      '{topic} Cochrane nutrition',
      '{topic} meta-analysis dietary',
      '{topic} clinical trial food',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // POLITICAL SCIENCE
  // ═══════════════════════════════════════════════════════════════
  politicalScience: {
    name: 'Political Science',
    aliases: ['politics', 'voting', 'elections', 'democracy', 'governance', 'policy'],

    academicSources: {
      databases: [
        'jstor.org',
        'semanticscholar.org',
        'ssrn.com',
      ],
      journals: [
        'American Political Science Review',
        'American Journal of Political Science',
        'Journal of Politics',
        'Quarterly Journal of Political Science',
        'Political Analysis',
      ],
      systematicReviewSources: [
        'Annual Review of Political Science',
        'EGAP (Evidence in Governance and Politics)',
      ],
      majorReports: [
        'Congressional Research Service reports',
        'GAO reports',
      ],
    },

    institutionalSources: {
      government: ['gao.gov', 'crs.gov'],
      international: ['idea.int', 'v-dem.net'],
      researchOrgs: ['brookings.edu', 'aei.org', 'cato.org'],
    },

    expertIdentification: {
      typicalCredentials: ['PhD'],
      relevantDepartments: [
        'Political Science',
        'Government',
        'Public Policy',
        'International Relations',
      ],
      professionalOrgs: ['APSA'],
    },

    caveats: {
      replicationConcerns: true,
      industryInfluence: ['partisan think tanks'],
      politicization: 'high',
      rapidlyEvolving: false,
    },

    queryTemplates: [
      '{topic} empirical political science',
      '{topic} American Political Science Review',
      '{topic} causal inference politics',
      '{topic} quasi-experimental policy',
      '{topic} regression discontinuity election',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // TECHNOLOGY
  // ═══════════════════════════════════════════════════════════════
  technology: {
    name: 'Technology',
    aliases: ['tech', 'AI', 'artificial intelligence', 'software', 'computer', 'algorithm', 'data'],

    academicSources: {
      databases: [
        'arxiv.org',
        'semanticscholar.org',
        'dl.acm.org',
        'ieeexplore.ieee.org',
      ],
      journals: [
        'Nature',
        'Science',
        'Communications of the ACM',
        'IEEE Transactions (various)',
        'Journal of Machine Learning Research',
      ],
      systematicReviewSources: [
        'ACM Computing Surveys',
        'IEEE Surveys & Tutorials',
      ],
      majorReports: [
        'NIST reports',
        'National Academies tech reports',
        'AI Index Report (Stanford HAI)',
      ],
    },

    institutionalSources: {
      government: ['nist.gov', 'nsf.gov'],
      international: ['itu.int'],
      researchOrgs: ['hai.stanford.edu', 'aiindex.stanford.edu'],
    },

    expertIdentification: {
      typicalCredentials: ['PhD'],
      relevantDepartments: [
        'Computer Science',
        'Electrical Engineering',
        'Information Science',
        'AI/ML labs',
      ],
      professionalOrgs: ['ACM', 'IEEE'],
    },

    caveats: {
      replicationConcerns: true,
      industryInfluence: ['big tech companies fund much research'],
      politicization: 'medium',
      rapidlyEvolving: true,
    },

    queryTemplates: [
      '{topic} peer-reviewed computer science',
      '{topic} empirical study software',
      '{topic} benchmark evaluation AI',
      '{topic} ACM OR IEEE research',
      '{topic} reproducibility study',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // EDUCATION
  // ═══════════════════════════════════════════════════════════════
  education: {
    name: 'Education',
    aliases: ['school', 'teaching', 'learning', 'students', 'curriculum', 'pedagogy'],

    academicSources: {
      databases: [
        'eric.ed.gov',
        'semanticscholar.org',
      ],
      journals: [
        'Educational Researcher',
        'American Educational Research Journal',
        'Review of Educational Research',
        'Journal of Educational Psychology',
      ],
      systematicReviewSources: [
        'What Works Clearinghouse',
        'Campbell Collaboration education reviews',
        'Education Endowment Foundation',
      ],
      majorReports: [
        'IES research reports',
        'NCES statistics',
        'National Academies education reports',
      ],
    },

    institutionalSources: {
      government: ['ies.ed.gov', 'nces.ed.gov'],
      international: ['oecd.org/education'],
      researchOrgs: ['eef.org.uk', 'rand.org/education'],
    },

    expertIdentification: {
      typicalCredentials: ['PhD', 'EdD'],
      relevantDepartments: [
        'Education',
        'Educational Psychology',
        'Curriculum & Instruction',
        'Education Policy',
      ],
      professionalOrgs: ['AERA'],
    },

    caveats: {
      replicationConcerns: true,
      industryInfluence: ['edtech companies', 'testing companies'],
      politicization: 'high',
      rapidlyEvolving: false,
    },

    queryTemplates: [
      '{topic} What Works Clearinghouse',
      '{topic} randomized controlled trial education',
      '{topic} meta-analysis educational',
      '{topic} IES research education',
      '{topic} effect size learning',
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // GENERAL (fallback)
  // ═══════════════════════════════════════════════════════════════
  general: {
    name: 'General',
    aliases: [],

    academicSources: {
      databases: [
        'semanticscholar.org',
        'scholar.google.com',
      ],
      journals: [
        'Nature',
        'Science',
        'PNAS',
      ],
      systematicReviewSources: [
        'Cochrane Library',
        'Campbell Collaboration',
      ],
      majorReports: [
        'National Academies reports',
      ],
    },

    institutionalSources: {
      government: [],
      international: [],
      researchOrgs: [],
    },

    expertIdentification: {
      typicalCredentials: ['PhD'],
      relevantDepartments: [],
      professionalOrgs: [],
    },

    caveats: {
      replicationConcerns: false,
      industryInfluence: [],
      politicization: 'low',
      rapidlyEvolving: false,
    },

    queryTemplates: [
      '{topic} systematic review',
      '{topic} meta-analysis',
      '{topic} peer-reviewed research',
      '{topic} empirical study',
    ],
  },
};
