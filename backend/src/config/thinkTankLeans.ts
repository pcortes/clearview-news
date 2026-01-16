/**
 * Think Tank Political Lean Database
 * Wave 2, Agent 8 - Political lean disclosure for think tanks
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Section 5.2
 */

/**
 * Political lean categories
 */
export type PoliticalLean =
  | 'left'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'right'
  | 'libertarian'
  | 'nonpartisan'
  | 'academic';

/**
 * Think tank lean information
 */
export interface ThinkTankInfo {
  domain: string;
  lean: PoliticalLean;
  description: string;
  name: string;
}

/**
 * Database of think tank political leans
 */
const THINK_TANK_DATABASE: ThinkTankInfo[] = [
  // ═══════════════════════════════════════════════════════════════
  // LEFT-LEANING
  // ═══════════════════════════════════════════════════════════════
  {
    domain: 'cbpp.org',
    name: 'Center on Budget and Policy Priorities',
    lean: 'left',
    description: 'Center on Budget and Policy Priorities - progressive economic policy',
  },
  {
    domain: 'epi.org',
    name: 'Economic Policy Institute',
    lean: 'left',
    description: 'Economic Policy Institute - labor-aligned economic research',
  },
  {
    domain: 'americanprogress.org',
    name: 'Center for American Progress',
    lean: 'left',
    description: 'Center for American Progress - progressive policy research',
  },
  {
    domain: 'demos.org',
    name: 'Demos',
    lean: 'left',
    description: 'Demos - progressive policy organization',
  },
  {
    domain: 'rooseveltinstitute.org',
    name: 'Roosevelt Institute',
    lean: 'left',
    description: 'Roosevelt Institute - progressive economic research',
  },

  // ═══════════════════════════════════════════════════════════════
  // CENTER-LEFT
  // ═══════════════════════════════════════════════════════════════
  {
    domain: 'brookings.edu',
    name: 'Brookings Institution',
    lean: 'center-left',
    description: 'Brookings Institution - center-left policy research',
  },
  {
    domain: 'newamerica.org',
    name: 'New America',
    lean: 'center-left',
    description: 'New America - center-left policy research',
  },
  {
    domain: 'tcf.org',
    name: 'The Century Foundation',
    lean: 'center-left',
    description: 'The Century Foundation - center-left policy research',
  },

  // ═══════════════════════════════════════════════════════════════
  // CENTER / NONPARTISAN
  // ═══════════════════════════════════════════════════════════════
  {
    domain: 'urban.org',
    name: 'Urban Institute',
    lean: 'center',
    description: 'Urban Institute - center/nonpartisan economic and social policy research',
  },
  {
    domain: 'rand.org',
    name: 'RAND Corporation',
    lean: 'nonpartisan',
    description: 'RAND Corporation - nonpartisan research organization',
  },
  {
    domain: 'cfr.org',
    name: 'Council on Foreign Relations',
    lean: 'nonpartisan',
    description: 'Council on Foreign Relations - nonpartisan foreign policy think tank',
  },
  {
    domain: 'bipartisanpolicy.org',
    name: 'Bipartisan Policy Center',
    lean: 'nonpartisan',
    description: 'Bipartisan Policy Center - bipartisan policy research',
  },
  {
    domain: 'taxpolicycenter.org',
    name: 'Tax Policy Center',
    lean: 'nonpartisan',
    description: 'Tax Policy Center - nonpartisan tax policy research (joint Urban-Brookings)',
  },

  // ═══════════════════════════════════════════════════════════════
  // ACADEMIC
  // ═══════════════════════════════════════════════════════════════
  {
    domain: 'nber.org',
    name: 'National Bureau of Economic Research',
    lean: 'academic',
    description: 'National Bureau of Economic Research - academic economists research network',
  },
  {
    domain: 'piie.com',
    name: 'Peterson Institute for International Economics',
    lean: 'academic',
    description: 'Peterson Institute for International Economics - academic international economics',
  },

  // ═══════════════════════════════════════════════════════════════
  // CENTER-RIGHT
  // ═══════════════════════════════════════════════════════════════
  {
    domain: 'aei.org',
    name: 'American Enterprise Institute',
    lean: 'center-right',
    description: 'American Enterprise Institute - center-right policy research',
  },
  {
    domain: 'hoover.org',
    name: 'Hoover Institution',
    lean: 'center-right',
    description: 'Hoover Institution - center-right policy research at Stanford',
  },

  // ═══════════════════════════════════════════════════════════════
  // RIGHT-LEANING
  // ═══════════════════════════════════════════════════════════════
  {
    domain: 'heritage.org',
    name: 'Heritage Foundation',
    lean: 'right',
    description: 'Heritage Foundation - conservative policy research',
  },
  {
    domain: 'manhattan-institute.org',
    name: 'Manhattan Institute',
    lean: 'right',
    description: 'Manhattan Institute - conservative policy research',
  },
  {
    domain: 'hudson.org',
    name: 'Hudson Institute',
    lean: 'right',
    description: 'Hudson Institute - conservative policy research',
  },
  {
    domain: 'atr.org',
    name: 'Americans for Tax Reform',
    lean: 'right',
    description: 'Americans for Tax Reform - conservative anti-tax advocacy',
  },

  // ═══════════════════════════════════════════════════════════════
  // LIBERTARIAN
  // ═══════════════════════════════════════════════════════════════
  {
    domain: 'cato.org',
    name: 'Cato Institute',
    lean: 'libertarian',
    description: 'Cato Institute - libertarian policy research',
  },
  {
    domain: 'reason.org',
    name: 'Reason Foundation',
    lean: 'libertarian',
    description: 'Reason Foundation - libertarian policy research',
  },
  {
    domain: 'mercatus.org',
    name: 'Mercatus Center',
    lean: 'libertarian',
    description: 'Mercatus Center - libertarian-leaning economic research at George Mason',
  },
];

/**
 * Extract domain from URL or domain string
 */
function extractDomain(urlOrDomain: string): string {
  // Remove protocol if present
  let domain = urlOrDomain.replace(/^https?:\/\//, '');

  // Remove www. prefix
  domain = domain.replace(/^www\./, '');

  // Extract domain from URL path
  domain = domain.split('/')[0];

  // Handle subdomains - try to match the base domain
  const parts = domain.split('.');
  if (parts.length > 2) {
    // Return last two parts (e.g., research.rand.org -> rand.org)
    domain = parts.slice(-2).join('.');
  }

  return domain.toLowerCase();
}

/**
 * Get think tank political lean for a URL or domain
 */
export function getThinkTankLean(urlOrDomain: string): { lean: PoliticalLean; description: string } | null {
  const domain = extractDomain(urlOrDomain);

  const thinkTank = THINK_TANK_DATABASE.find(t => t.domain === domain);

  if (!thinkTank) {
    return null;
  }

  return {
    lean: thinkTank.lean,
    description: thinkTank.description,
  };
}

/**
 * Check if a URL or domain is from a known think tank
 */
export function isThinkTank(urlOrDomain: string): boolean {
  const domain = extractDomain(urlOrDomain);
  return THINK_TANK_DATABASE.some(t => t.domain === domain);
}

/**
 * Get all think tanks in the database
 */
export function getAllThinkTanks(): ThinkTankInfo[] {
  return [...THINK_TANK_DATABASE];
}

/**
 * Get think tanks filtered by political lean
 */
export function getThinkTanksByLean(lean: PoliticalLean): ThinkTankInfo[] {
  return THINK_TANK_DATABASE.filter(t => t.lean === lean);
}

/**
 * Get think tank info by domain
 */
export function getThinkTankInfo(urlOrDomain: string): ThinkTankInfo | null {
  const domain = extractDomain(urlOrDomain);
  return THINK_TANK_DATABASE.find(t => t.domain === domain) || null;
}

/**
 * Format disclosure string for a think tank
 */
export function formatThinkTankDisclosure(urlOrDomain: string): string | null {
  const info = getThinkTankInfo(urlOrDomain);

  if (!info) {
    return null;
  }

  return `Source: ${info.name} (${info.lean} think tank)`;
}

/**
 * Export the database for testing
 */
export { THINK_TANK_DATABASE };
