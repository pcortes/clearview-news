/**
 * DomainRouter Service
 * Wave 2, Agent 6 - Routes claims to domain-appropriate sources
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Part 4
 */

import { Domain, ClassifiedClaim } from '../types/claims';
import { DOMAIN_CONFIGS, DomainConfig } from '../config/domainConfigs';

/**
 * Get domain configuration for a given domain
 */
export function getDomainConfig(domain: Domain): DomainConfig {
  return DOMAIN_CONFIGS[domain] || DOMAIN_CONFIGS.general;
}

/**
 * Get all aliases for a domain
 */
export function getDomainAliases(domain: Domain): string[] {
  const config = getDomainConfig(domain);
  return config.aliases || [];
}

/**
 * Get relevant academic sources for a domain
 */
export function getRelevantSources(domain: Domain): {
  databases: string[];
  journals: string[];
  systematicReviewSources: string[];
  majorReports: string[];
} {
  const config = getDomainConfig(domain);
  return config.academicSources;
}

/**
 * Get institutional sources for a domain
 */
export function getInstitutionalSources(domain: Domain): {
  government: string[];
  international: string[];
  researchOrgs: string[];
} {
  const config = getDomainConfig(domain);
  return config.institutionalSources;
}

/**
 * Extract key topic from claim text
 */
function extractTopic(claimText: string): string {
  // Remove common filler words and extract key phrases
  const fillerWords = [
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'that', 'this',
    'these', 'those', 'and', 'or', 'but', 'if', 'then', 'because',
    'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about',
    'against', 'between', 'into', 'through', 'during', 'before', 'after',
    'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off',
    'over', 'under', 'again', 'further', 'then', 'once', 'according',
  ];

  const words = claimText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !fillerWords.includes(word));

  // Return first few key words as topic
  return words.slice(0, 5).join(' ');
}

/**
 * Build search queries based on claim and domain templates
 */
export function buildSearchQueries(claim: ClassifiedClaim): string[] {
  const config = getDomainConfig(claim.domain);
  const topic = extractTopic(claim.text);

  // Generate queries from templates
  const queries = config.queryTemplates.map(template =>
    template.replace('{topic}', topic)
  );

  // Add claim-specific query
  queries.push(`${topic} ${claim.type} evidence`);

  // Add systematic review query for verifiable claims
  if (claim.isVerifiable) {
    queries.push(`${topic} systematic review meta-analysis`);
  }

  return queries;
}

/**
 * Get expert identification criteria for a domain
 */
export function getExpertCriteria(domain: Domain): {
  typicalCredentials: string[];
  relevantDepartments: string[];
  professionalOrgs: string[];
} {
  const config = getDomainConfig(domain);
  return config.expertIdentification;
}

/**
 * Get caveats for a domain
 */
export function getDomainCaveats(domain: Domain): {
  replicationConcerns: boolean;
  industryInfluence: string[];
  politicization: 'high' | 'medium' | 'low';
  rapidlyEvolving: boolean;
} {
  const config = getDomainConfig(domain);
  return config.caveats;
}

/**
 * Check if a domain has replication concerns
 */
export function hasReplicationConcerns(domain: Domain): boolean {
  const config = getDomainConfig(domain);
  return config.caveats.replicationConcerns;
}

/**
 * Check if a domain is highly politicized
 */
export function isHighlyPoliticized(domain: Domain): boolean {
  const config = getDomainConfig(domain);
  return config.caveats.politicization === 'high';
}

/**
 * Check if a domain is rapidly evolving
 */
export function isRapidlyEvolving(domain: Domain): boolean {
  const config = getDomainConfig(domain);
  return config.caveats.rapidlyEvolving;
}

/**
 * Get all configured domains
 */
export function getAllDomains(): Domain[] {
  return Object.keys(DOMAIN_CONFIGS) as Domain[];
}

/**
 * Find domain by alias
 */
export function findDomainByAlias(alias: string): Domain | null {
  const lowercaseAlias = alias.toLowerCase();

  for (const [domain, config] of Object.entries(DOMAIN_CONFIGS)) {
    if (config.aliases.some(a => a.toLowerCase() === lowercaseAlias)) {
      return domain as Domain;
    }
  }

  return null;
}
