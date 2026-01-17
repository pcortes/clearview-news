/**
 * Output Generator Service
 * Wave 6 - Honest output generation
 *
 * Reference: EXPERT_EVALUATION_SPEC.md Part 8
 *
 * This service transforms ConsensusAssessment into display-ready output that:
 * 1. Never overstates certainty
 * 2. Never hides legitimate scientific debate
 * 3. Always includes appropriate caveats
 * 4. Clearly identifies values questions as non-empirical
 * 5. Supports multiple output formats (HTML, Markdown, JSON, text)
 */

import {
  ConsensusAssessment,
  ConsensusLevel,
  ConfidenceLevel,
  Citation,
  DebatePosition,
  EvidenceDirection,
} from '../types/consensus';
import { ValidatedExpert } from '../types/expert';
import { Domain, ClaimType } from '../types/claims';
import { FRAMING_TEMPLATES, getFramingTemplate } from './consensusDetector';
import { EvidenceTier } from './evidenceTier';
import {
  OutputFormat,
  RenderedClaimOutput,
  GeneratedOutput,
  OutputGeneratorOptions,
  DEFAULT_OUTPUT_OPTIONS,
  OutputHeader,
  OutputCitation,
  OutputEvidenceSummary,
  OutputExpertVoice,
  OutputDebateSection,
  OutputDebatePosition,
  OutputEmergingTrends,
  OutputWarning,
  OutputSourcesList,
  OutputValuesContent,
  ConfidenceBadge,
  CONFIDENCE_BADGE_MAP,
  CONSENSUS_COLOR_MAP,
  DEFAULT_WARNING_SEVERITY,
  HonestyCheckResult,
  HONESTY_REQUIREMENTS,
  needsDebateSection,
  needsEmergingTrendsSection,
  needsValuesContentSection,
  allowsCertaintyLanguage,
  requiresUncertaintyLanguage,
} from '../types/output';

// ═══════════════════════════════════════════════════════════════
// TIER LABELS
// ═══════════════════════════════════════════════════════════════

/**
 * Human-readable tier labels
 */
const TIER_LABELS: Record<EvidenceTier, string> = {
  1: 'Systematic Review/Meta-Analysis',
  2: 'Peer-Reviewed Study',
  3: 'Working Paper/Preprint',
  4: 'Expert Opinion',
  5: 'Not Evidence',
};

/**
 * Get tier label for display
 */
export function getTierLabel(tier: EvidenceTier): string {
  return TIER_LABELS[tier] || 'Unknown';
}

// ═══════════════════════════════════════════════════════════════
// CITATION FORMATTING
// ═══════════════════════════════════════════════════════════════

/**
 * Format authors for display
 */
export function formatAuthors(authors: string[]): string {
  if (authors.length === 0) return 'Unknown authors';
  if (authors.length === 1) return authors[0];
  if (authors.length === 2) return authors.join(' and ');
  return `${authors[0]} et al.`;
}

/**
 * Convert Citation to OutputCitation
 */
export function convertCitation(
  citation: Citation,
  tier: EvidenceTier = 2
): OutputCitation {
  return {
    title: citation.title,
    authors: formatAuthors(citation.authors),
    publication: citation.publication,
    year: citation.year,
    url: citation.url,
    doi: citation.doi,
    finding: citation.finding,
    tierLabel: getTierLabel(tier),
    tierLevel: tier,
  };
}

// ═══════════════════════════════════════════════════════════════
// HEADER GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate confidence badge for display
 */
export function generateConfidenceBadge(
  consensusLevel: ConsensusLevel,
  confidenceLevel: ConfidenceLevel
): ConfidenceBadge {
  const template = getFramingTemplate(consensusLevel);

  // For certain consensus levels, override with level-specific badge
  const levelSpecificBadges: Partial<Record<ConsensusLevel, ConfidenceBadge>> = {
    values_question: {
      text: 'NOT EMPIRICAL',
      level: 'high', // High confidence it's a values question
      colorClass: 'purple',
    },
    active_debate: {
      text: 'CONTESTED',
      level: 'medium',
      colorClass: 'yellow',
    },
    emerging_research: {
      text: 'PRELIMINARY',
      level: 'low',
      colorClass: 'orange',
    },
    insufficient_research: {
      text: 'UNKNOWN',
      level: 'low',
      colorClass: 'gray',
    },
    methodologically_blocked: {
      text: 'METHODOLOGICALLY LIMITED',
      level: 'medium',
      colorClass: 'gray',
    },
  };

  if (levelSpecificBadges[consensusLevel]) {
    return levelSpecificBadges[consensusLevel]!;
  }

  // Use confidence-based badge
  return {
    ...CONFIDENCE_BADGE_MAP[confidenceLevel],
    colorClass: CONSENSUS_COLOR_MAP[consensusLevel],
  };
}

/**
 * Generate output header
 */
export function generateHeader(
  assessment: ConsensusAssessment,
  claimText: string
): OutputHeader {
  const template = getFramingTemplate(assessment.level);
  const badge = generateConfidenceBadge(assessment.level, assessment.confidence);

  return {
    emoji: template.headerEmoji,
    headline: template.headerText,
    confidenceBadge: badge,
    claimText,
  };
}

// ═══════════════════════════════════════════════════════════════
// EVIDENCE SUMMARY GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate evidence summary
 */
export function generateEvidenceSummary(
  assessment: ConsensusAssessment
): OutputEvidenceSummary {
  const { basis, evidenceSummary } = assessment;

  let summaryText: string;

  if (assessment.level === 'values_question') {
    summaryText =
      'This is a values question - empirical evidence cannot resolve it.';
  } else if (assessment.level === 'insufficient_research') {
    summaryText = `Only ${basis.totalQualityStudies} high-quality studies found. More research is needed.`;
  } else if (assessment.level === 'strong_consensus') {
    const direction = evidenceSummary.supportRatio >= 0.5 ? 'supporting' : 'opposing';
    summaryText = `${basis.totalQualityStudies} high-quality studies examined, with overwhelming evidence ${direction} this claim.`;
  } else if (assessment.level === 'moderate_consensus') {
    const direction = evidenceSummary.supportRatio >= 0.5 ? 'supporting' : 'opposing';
    summaryText = `${basis.totalQualityStudies} high-quality studies examined, with most evidence ${direction} this claim.`;
  } else if (assessment.level === 'active_debate') {
    summaryText = `${basis.totalQualityStudies} high-quality studies examined, with evidence on both sides of this debate.`;
  } else if (assessment.level === 'emerging_research') {
    summaryText = `${basis.totalQualityStudies} studies found, mostly recent. This is an emerging area of research.`;
  } else {
    summaryText = `${basis.totalQualityStudies} high-quality studies examined.`;
  }

  return {
    totalStudies: basis.totalStudiesExamined,
    qualityStudies: basis.totalQualityStudies,
    metaAnalysisCount: basis.metaAnalyses.length,
    systematicReviewCount: basis.systematicReviews.length,
    supportingCount: evidenceSummary.supporting,
    opposingCount: evidenceSummary.opposing,
    supportRatio: evidenceSummary.supportRatio,
    summaryText,
  };
}

// ═══════════════════════════════════════════════════════════════
// DEBATE SECTION GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Convert validated expert to output expert voice
 */
export function convertExpertVoice(
  expert: ValidatedExpert,
  position: 'supports' | 'opposes' | 'neutral'
): OutputExpertVoice {
  return {
    name: expert.name,
    credentials: expert.credentials,
    affiliation: expert.affiliation,
    position,
    qualityTier: expert.qualityTier,
  };
}

/**
 * Get strength label for evidence strength
 */
export function getStrengthLabel(strength: 'strong' | 'moderate' | 'weak'): string {
  const labels: Record<string, string> = {
    strong: 'Strong Evidence',
    moderate: 'Moderate Evidence',
    weak: 'Limited Evidence',
  };
  return labels[strength] || 'Evidence';
}

/**
 * Convert debate position to output format
 */
export function convertDebatePosition(
  position: DebatePosition,
  label: string
): OutputDebatePosition {
  return {
    label,
    summary: position.summary,
    experts: position.supportingExperts.map((e) =>
      convertExpertVoice(e, label.toLowerCase().includes('supporting') ? 'supports' : 'opposes')
    ),
    keyEvidence: position.keyEvidence.map((c) => convertCitation(c)),
    mainArguments: position.mainArguments,
    strengthLabel: getStrengthLabel(position.strengthOfEvidence),
  };
}

/**
 * Generate debate section for active_debate consensus
 */
export function generateDebateSection(
  assessment: ConsensusAssessment
): OutputDebateSection | undefined {
  if (!needsDebateSection(assessment.level) || !assessment.positions) {
    return undefined;
  }

  const { positions } = assessment;

  return {
    positionA: convertDebatePosition(positions.positionA, 'Position A: Supporting'),
    positionB: convertDebatePosition(positions.positionB, 'Position B: Opposing'),
    reasonsForDisagreement: positions.reasonsForDisagreement,
    isGenuineDebate: true,
  };
}

// ═══════════════════════════════════════════════════════════════
// EMERGING TRENDS GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Get direction display text
 */
export function getDirectionDisplayText(direction: EvidenceDirection): string {
  const texts: Record<EvidenceDirection, string> = {
    supports: 'supports the claim',
    opposes: 'does not support the claim',
    neutral: 'is inconclusive',
    mixed: 'shows mixed results',
  };
  return texts[direction] || 'is uncertain';
}

/**
 * Generate emerging trends section
 */
export function generateEmergingTrends(
  assessment: ConsensusAssessment
): OutputEmergingTrends | undefined {
  if (!needsEmergingTrendsSection(assessment.level) || !assessment.emergingTrends) {
    return undefined;
  }

  const { emergingTrends } = assessment;

  return {
    direction: getDirectionDisplayText(emergingTrends.direction),
    recentStudies: emergingTrends.recentStudies.map((c) => convertCitation(c)),
    caveats: emergingTrends.caveats,
    summaryText: `Early research ${getDirectionDisplayText(emergingTrends.direction)}, but findings are preliminary.`,
  };
}

// ═══════════════════════════════════════════════════════════════
// VALUES CONTENT GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate values-specific content for values questions
 */
export function generateValuesContent(
  assessment: ConsensusAssessment,
  claimText: string
): OutputValuesContent | undefined {
  if (!needsValuesContentSection(assessment.level)) {
    return undefined;
  }

  // These would ideally be populated from analysis, but we provide defaults
  return {
    whatResearchCanInform: [
      'Empirical consequences of different policy approaches',
      'Factual claims embedded within the broader question',
      'Historical outcomes of similar decisions',
    ],
    valuesInvolved: [
      'Different conceptions of fairness and justice',
      'Competing priorities and tradeoffs',
      'Fundamental disagreements about goals',
    ],
    relatedEmpiricalQuestions: [
      'Specific factual claims can be evaluated separately',
      'Data on outcomes can inform but not determine the value judgment',
    ],
  };
}

// ═══════════════════════════════════════════════════════════════
// WARNINGS/CAVEATS GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate warnings from caveats
 */
export function generateWarnings(
  assessment: ConsensusAssessment
): OutputWarning[] {
  const warnings: OutputWarning[] = [];
  const severity = DEFAULT_WARNING_SEVERITY[assessment.level];

  // Add all caveats as warnings
  for (const caveat of assessment.caveats) {
    let type: OutputWarning['type'] = 'caveat';

    // Categorize by content
    if (caveat.toLowerCase().includes('values') || caveat.toLowerCase().includes('empirical')) {
      type = 'values_note';
    } else if (caveat.toLowerCase().includes('replication') || caveat.toLowerCase().includes('methodology')) {
      type = 'methodological';
    } else if (caveat.toLowerCase().includes('domain') || caveat.toLowerCase().includes('field')) {
      type = 'domain_specific';
    } else if (caveat.toLowerCase().includes('limited') || caveat.toLowerCase().includes('insufficient')) {
      type = 'limitation';
    }

    warnings.push({
      type,
      text: caveat,
      severity,
    });
  }

  // Add level-specific critical warnings
  if (assessment.level === 'active_debate') {
    warnings.unshift({
      type: 'caveat',
      text: 'This is a genuinely contested scientific question where qualified experts disagree.',
      severity: 'warning',
    });
  }

  if (assessment.level === 'values_question') {
    warnings.unshift({
      type: 'values_note',
      text: 'This is a values question that science cannot resolve. Empirical evidence can inform but not determine the answer.',
      severity: 'info',
    });
  }

  if (assessment.level === 'insufficient_research') {
    warnings.unshift({
      type: 'limitation',
      text: 'Insufficient peer-reviewed research exists to evaluate this claim. Absence of evidence is not evidence of absence.',
      severity: 'critical',
    });
  }

  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// SOURCES LIST GENERATION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate sources list
 */
export function generateSourcesList(
  assessment: ConsensusAssessment,
  maxSources: number = 5
): OutputSourcesList {
  const { basis } = assessment;

  // Prioritize higher-quality sources
  const allSources: Array<{ citation: Citation; tier: EvidenceTier }> = [
    ...basis.metaAnalyses.map((c) => ({ citation: c, tier: 1 as EvidenceTier })),
    ...basis.systematicReviews.map((c) => ({ citation: c, tier: 1 as EvidenceTier })),
    ...basis.majorReports.map((c) => ({ citation: c, tier: 1 as EvidenceTier })),
    ...basis.peerReviewedStudies.map((c) => ({ citation: c, tier: 2 as EvidenceTier })),
  ];

  const topSources = allSources
    .slice(0, maxSources)
    .map(({ citation, tier }) => convertCitation(citation, tier));

  let sourcesNote: string | undefined;
  if (basis.totalStudiesExamined > maxSources) {
    sourcesNote = `Showing ${topSources.length} of ${basis.totalStudiesExamined} sources examined.`;
  }

  return {
    topSources,
    totalSourcesExamined: basis.totalStudiesExamined,
    sourcesNote,
  };
}

// ═══════════════════════════════════════════════════════════════
// HONESTY CHECKS
// ═══════════════════════════════════════════════════════════════

/**
 * Words/phrases that indicate overclaiming certainty
 */
const CERTAINTY_LANGUAGE = [
  'proves',
  'proven',
  'definitely',
  'certainly',
  'absolutely',
  'undoubtedly',
  'without doubt',
  'conclusively',
  'irrefutably',
];

/**
 * Check if text contains overclaiming language
 */
export function containsOverclaimingLanguage(text: string): boolean {
  const lowerText = text.toLowerCase();
  return CERTAINTY_LANGUAGE.some((phrase) => lowerText.includes(phrase));
}

/**
 * Perform honesty checks on generated output
 */
export function performHonestyCheck(
  assessment: ConsensusAssessment,
  output: RenderedClaimOutput
): HonestyCheckResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Check 1: Must show debate for active_debate
  if (
    HONESTY_REQUIREMENTS.mustShowDebateIfActiveDebate &&
    assessment.level === 'active_debate' &&
    !output.debateSection
  ) {
    violations.push('Output hides legitimate scientific debate (missing debate section for active_debate)');
  }

  // Check 2: Must not overstate certainty
  if (HONESTY_REQUIREMENTS.mustNotOverstateCertainty) {
    if (!allowsCertaintyLanguage(assessment.level)) {
      if (containsOverclaimingLanguage(output.framingSentence)) {
        violations.push('Framing sentence overstates certainty for non-strong-consensus claim');
      }
      if (containsOverclaimingLanguage(output.detailedExplanation)) {
        warnings.push('Detailed explanation may overstate certainty');
      }
    }
  }

  // Check 3: Must include caveats
  if (
    HONESTY_REQUIREMENTS.mustIncludeCaveats &&
    requiresUncertaintyLanguage(assessment.level) &&
    output.warnings.length === 0
  ) {
    violations.push('Output missing required caveats for uncertain consensus level');
  }

  // Check 4: Must identify values questions
  if (
    HONESTY_REQUIREMENTS.mustIdentifyValuesQuestions &&
    assessment.level === 'values_question' &&
    !output.valuesContent
  ) {
    violations.push('Values question not properly identified with values content section');
  }

  return {
    isHonest: violations.length === 0,
    violations,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN RENDER FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Render a consensus assessment into output format
 */
export function renderClaimOutput(
  assessment: ConsensusAssessment,
  claimText: string,
  options: Partial<OutputGeneratorOptions> = {}
): RenderedClaimOutput {
  const opts = { ...DEFAULT_OUTPUT_OPTIONS, ...options };

  // Generate all sections
  const header = generateHeader(assessment, claimText);
  const evidenceSummary = generateEvidenceSummary(assessment);
  const debateSection = generateDebateSection(assessment);
  const emergingTrends = generateEmergingTrends(assessment);
  const valuesContent = generateValuesContent(assessment, claimText);
  const warnings = generateWarnings(assessment);
  const sources = generateSourcesList(assessment, opts.maxCitations);

  // Get top citations
  const topCitations = sources.topSources.slice(0, opts.maxCitations);

  const output: RenderedClaimOutput = {
    claimText,
    claimType: assessment.claimType,
    domain: assessment.domain,
    header,
    framingSentence: assessment.framingSentence,
    detailedExplanation: assessment.detailedExplanation,
    evidenceSummary,
    topCitations,
    debateSection,
    emergingTrends,
    valuesContent,
    warnings: warnings.slice(0, opts.maxCaveats),
    sources,
    consensusLevel: assessment.level,
    confidenceLevel: assessment.confidence,
    assessedAt: assessment.assessedAt,
  };

  return output;
}

// ═══════════════════════════════════════════════════════════════
// FORMAT-SPECIFIC GENERATORS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate Markdown output
 */
export function generateMarkdownOutput(output: RenderedClaimOutput): string {
  const lines: string[] = [];

  // Header
  lines.push(`## ${output.header.emoji} ${output.header.headline}`);
  lines.push(`**[${output.header.confidenceBadge.text}]**`);
  lines.push('');

  // Claim
  lines.push(`> ${output.claimText}`);
  lines.push('');

  // Framing sentence
  lines.push(output.framingSentence);
  lines.push('');

  // Detailed explanation
  if (output.detailedExplanation) {
    lines.push(output.detailedExplanation);
    lines.push('');
  }

  // Evidence summary
  lines.push('### Evidence Summary');
  lines.push(output.evidenceSummary.summaryText);
  if (output.evidenceSummary.metaAnalysisCount > 0) {
    lines.push(`- ${output.evidenceSummary.metaAnalysisCount} meta-analyses found`);
  }
  if (output.evidenceSummary.systematicReviewCount > 0) {
    lines.push(`- ${output.evidenceSummary.systematicReviewCount} systematic reviews found`);
  }
  lines.push('');

  // Debate section (for active_debate)
  if (output.debateSection) {
    lines.push('### Scientific Debate');
    lines.push('');
    lines.push(`**${output.debateSection.positionA.label}**`);
    lines.push(output.debateSection.positionA.summary);
    for (const arg of output.debateSection.positionA.mainArguments.slice(0, 3)) {
      lines.push(`- ${arg}`);
    }
    lines.push('');
    lines.push(`**${output.debateSection.positionB.label}**`);
    lines.push(output.debateSection.positionB.summary);
    for (const arg of output.debateSection.positionB.mainArguments.slice(0, 3)) {
      lines.push(`- ${arg}`);
    }
    lines.push('');
    lines.push('**Why Experts Disagree:**');
    for (const reason of output.debateSection.reasonsForDisagreement) {
      lines.push(`- ${reason}`);
    }
    lines.push('');
  }

  // Emerging trends (for emerging_research)
  if (output.emergingTrends) {
    lines.push('### Emerging Research');
    lines.push(output.emergingTrends.summaryText);
    lines.push('');
    for (const caveat of output.emergingTrends.caveats) {
      lines.push(`- ${caveat}`);
    }
    lines.push('');
  }

  // Values content (for values_question)
  if (output.valuesContent) {
    lines.push('### This is a Values Question');
    lines.push('');
    lines.push('**What research CAN inform:**');
    for (const item of output.valuesContent.whatResearchCanInform) {
      lines.push(`- ${item}`);
    }
    lines.push('');
    lines.push('**Values involved:**');
    for (const item of output.valuesContent.valuesInvolved) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  // Warnings/Caveats
  if (output.warnings.length > 0) {
    lines.push('### Important Notes');
    for (const warning of output.warnings) {
      const icon = warning.severity === 'critical' ? '⚠️' : warning.severity === 'warning' ? '⚡' : 'ℹ️';
      lines.push(`${icon} ${warning.text}`);
    }
    lines.push('');
  }

  // Sources
  if (output.topCitations.length > 0) {
    lines.push('### Key Sources');
    for (const citation of output.topCitations) {
      lines.push(`- **${citation.title}** (${citation.year})`);
      lines.push(`  ${citation.authors}, *${citation.publication}*`);
      if (citation.finding) {
        lines.push(`  Finding: ${citation.finding}`);
      }
      lines.push(`  [${citation.tierLabel}]`);
    }
    if (output.sources.sourcesNote) {
      lines.push('');
      lines.push(`*${output.sources.sourcesNote}*`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate plain text output
 */
export function generateTextOutput(output: RenderedClaimOutput): string {
  const lines: string[] = [];

  // Header
  lines.push(`${output.header.emoji} ${output.header.headline}`);
  lines.push(`[${output.header.confidenceBadge.text}]`);
  lines.push('');
  lines.push(`Claim: ${output.claimText}`);
  lines.push('');
  lines.push(output.framingSentence);
  lines.push('');

  if (output.detailedExplanation) {
    lines.push(output.detailedExplanation);
    lines.push('');
  }

  // Evidence
  lines.push('EVIDENCE SUMMARY:');
  lines.push(output.evidenceSummary.summaryText);
  lines.push('');

  // Debate
  if (output.debateSection) {
    lines.push('SCIENTIFIC DEBATE:');
    lines.push(`Position A: ${output.debateSection.positionA.summary}`);
    lines.push(`Position B: ${output.debateSection.positionB.summary}`);
    lines.push('');
  }

  // Values
  if (output.valuesContent) {
    lines.push('VALUES QUESTION:');
    lines.push('This is a values question that science cannot resolve.');
    lines.push('');
  }

  // Warnings
  if (output.warnings.length > 0) {
    lines.push('IMPORTANT NOTES:');
    for (const warning of output.warnings) {
      lines.push(`- ${warning.text}`);
    }
    lines.push('');
  }

  // Sources
  if (output.topCitations.length > 0) {
    lines.push('KEY SOURCES:');
    for (const citation of output.topCitations) {
      lines.push(`- ${citation.title} (${citation.year}) - ${citation.tierLabel}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate HTML output
 */
export function generateHtmlOutput(output: RenderedClaimOutput): string {
  const badgeColorClasses: Record<string, string> = {
    green: 'badge-success',
    blue: 'badge-info',
    yellow: 'badge-warning',
    orange: 'badge-caution',
    gray: 'badge-neutral',
    purple: 'badge-values',
  };

  const badgeClass = badgeColorClasses[output.header.confidenceBadge.colorClass] || 'badge-neutral';

  const parts: string[] = [];

  // Header
  parts.push(`<div class="consensus-output consensus-${output.consensusLevel}">`);
  parts.push(`  <header class="output-header">`);
  parts.push(`    <span class="header-emoji">${output.header.emoji}</span>`);
  parts.push(`    <h2 class="header-headline">${output.header.headline}</h2>`);
  parts.push(`    <span class="confidence-badge ${badgeClass}">${output.header.confidenceBadge.text}</span>`);
  parts.push(`  </header>`);
  parts.push('');

  // Claim
  parts.push(`  <blockquote class="claim-text">${escapeHtml(output.claimText)}</blockquote>`);
  parts.push('');

  // Framing
  parts.push(`  <p class="framing-sentence">${escapeHtml(output.framingSentence)}</p>`);
  parts.push('');

  // Detailed explanation
  if (output.detailedExplanation) {
    parts.push(`  <p class="detailed-explanation">${escapeHtml(output.detailedExplanation)}</p>`);
  }

  // Evidence summary
  parts.push(`  <section class="evidence-summary">`);
  parts.push(`    <h3>Evidence Summary</h3>`);
  parts.push(`    <p>${escapeHtml(output.evidenceSummary.summaryText)}</p>`);
  parts.push(`    <ul class="evidence-stats">`);
  parts.push(`      <li>Quality studies: ${output.evidenceSummary.qualityStudies}</li>`);
  if (output.evidenceSummary.metaAnalysisCount > 0) {
    parts.push(`      <li>Meta-analyses: ${output.evidenceSummary.metaAnalysisCount}</li>`);
  }
  if (output.evidenceSummary.systematicReviewCount > 0) {
    parts.push(`      <li>Systematic reviews: ${output.evidenceSummary.systematicReviewCount}</li>`);
  }
  parts.push(`    </ul>`);
  parts.push(`  </section>`);
  parts.push('');

  // Debate section
  if (output.debateSection) {
    parts.push(`  <section class="debate-section">`);
    parts.push(`    <h3>Scientific Debate</h3>`);
    parts.push(`    <div class="debate-positions">`);
    parts.push(`      <div class="position position-a">`);
    parts.push(`        <h4>${escapeHtml(output.debateSection.positionA.label)}</h4>`);
    parts.push(`        <p>${escapeHtml(output.debateSection.positionA.summary)}</p>`);
    parts.push(`      </div>`);
    parts.push(`      <div class="position position-b">`);
    parts.push(`        <h4>${escapeHtml(output.debateSection.positionB.label)}</h4>`);
    parts.push(`        <p>${escapeHtml(output.debateSection.positionB.summary)}</p>`);
    parts.push(`      </div>`);
    parts.push(`    </div>`);
    parts.push(`    <h4>Why Experts Disagree</h4>`);
    parts.push(`    <ul>`);
    for (const reason of output.debateSection.reasonsForDisagreement) {
      parts.push(`      <li>${escapeHtml(reason)}</li>`);
    }
    parts.push(`    </ul>`);
    parts.push(`  </section>`);
  }

  // Emerging trends
  if (output.emergingTrends) {
    parts.push(`  <section class="emerging-trends">`);
    parts.push(`    <h3>Emerging Research</h3>`);
    parts.push(`    <p>${escapeHtml(output.emergingTrends.summaryText)}</p>`);
    parts.push(`  </section>`);
  }

  // Values content
  if (output.valuesContent) {
    parts.push(`  <section class="values-content">`);
    parts.push(`    <h3>This is a Values Question</h3>`);
    parts.push(`    <p>This question cannot be resolved through scientific research alone.</p>`);
    parts.push(`    <h4>What Research Can Inform</h4>`);
    parts.push(`    <ul>`);
    for (const item of output.valuesContent.whatResearchCanInform) {
      parts.push(`      <li>${escapeHtml(item)}</li>`);
    }
    parts.push(`    </ul>`);
    parts.push(`  </section>`);
  }

  // Warnings
  if (output.warnings.length > 0) {
    parts.push(`  <section class="warnings">`);
    parts.push(`    <h3>Important Notes</h3>`);
    for (const warning of output.warnings) {
      parts.push(`    <div class="warning warning-${warning.severity}">`);
      parts.push(`      <p>${escapeHtml(warning.text)}</p>`);
      parts.push(`    </div>`);
    }
    parts.push(`  </section>`);
  }

  // Sources
  if (output.topCitations.length > 0) {
    parts.push(`  <section class="sources">`);
    parts.push(`    <h3>Key Sources</h3>`);
    parts.push(`    <ul class="citations-list">`);
    for (const citation of output.topCitations) {
      parts.push(`      <li class="citation">`);
      parts.push(`        <strong class="citation-title">${escapeHtml(citation.title)}</strong>`);
      parts.push(`        <span class="citation-meta">(${citation.year}) - ${escapeHtml(citation.authors)}</span>`);
      parts.push(`        <span class="citation-tier">[${escapeHtml(citation.tierLabel)}]</span>`);
      parts.push(`      </li>`);
    }
    parts.push(`    </ul>`);
    parts.push(`  </section>`);
  }

  parts.push(`</div>`);

  return parts.join('\n');
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate JSON output
 */
export function generateJsonOutput(output: RenderedClaimOutput): string {
  return JSON.stringify(output, null, 2);
}

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATION FUNCTION
// ═══════════════════════════════════════════════════════════════

/**
 * Generate output in specified format
 */
export function generateOutput(
  assessment: ConsensusAssessment,
  claimText: string,
  options: Partial<OutputGeneratorOptions> = {}
): GeneratedOutput {
  const opts = { ...DEFAULT_OUTPUT_OPTIONS, ...options };

  // Render the claim output
  const rendered = renderClaimOutput(assessment, claimText, opts);

  // Perform honesty check
  const honestyCheck = performHonestyCheck(assessment, rendered);
  if (!honestyCheck.isHonest) {
    console.warn('[OutputGenerator] Honesty violations:', honestyCheck.violations);
  }

  // Generate format-specific content
  let content: string;
  switch (opts.format) {
    case 'html':
      content = generateHtmlOutput(rendered);
      break;
    case 'markdown':
      content = generateMarkdownOutput(rendered);
      break;
    case 'json':
      content = generateJsonOutput(rendered);
      break;
    case 'text':
    default:
      content = generateTextOutput(rendered);
      break;
  }

  return {
    format: opts.format,
    content,
    rendered,
    metadata: {
      generatedAt: new Date(),
      assessmentDate: assessment.assessedAt,
      consensusLevel: assessment.level,
      confidenceLevel: assessment.confidence,
      domain: assessment.domain,
    },
  };
}
