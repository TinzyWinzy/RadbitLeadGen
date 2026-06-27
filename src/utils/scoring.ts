/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LeadAnalysis } from "../types";

export interface ScoreBreakdown {
  score: number;
  breakdown: { reason: string; points: number }[];
  classification: "Hot" | "Warm" | "Cold";
}

export function calculatePriorityScore(analysis: LeadAnalysis): ScoreBreakdown {
  const breakdown: { reason: string; points: number }[] = [];
  let score = 0;

  // 1. No website (+30)
  if (!analysis.hasWebsite) {
    score += 30;
    breakdown.push({ reason: "No active business website", points: 30 });
  }

  // 2. No booking system (+25)
  if (!analysis.hasBookingSystem) {
    score += 25;
    breakdown.push({ reason: "No direct reservation/booking system", points: 25 });
  }

  // 3. No WhatsApp CTA (+15)
  if (!analysis.hasWhatsapp) {
    score += 15;
    breakdown.push({ reason: "No WhatsApp direct contact CTA", points: 15 });
  }

  // 4. Weak mobile experience (+15)
  if (analysis.mobileQuality === "Poor" || analysis.mobileQuality === "Fair") {
    score += 15;
    breakdown.push({ reason: "Sub-optimal mobile rendering", points: 15 });
  }

  // 5. Poor conversion path (+15)
  // Check if they have specific problems or low seo/credibility
  const hasConversionIssue = 
    analysis.seoQuality === "Weak" || 
    analysis.trustSignals === "Weak" || 
    (analysis.problems && analysis.problems.some(p => /conversion|friction|complicated|slow|hard/i.test(p)));
    
  if (hasConversionIssue) {
    score += 15;
    breakdown.push({ reason: "Friction in customer conversion funnel", points: 15 });
  }

  // Cap score at 100 and floor at 0
  score = Math.max(0, Math.min(100, score));

  let classification: "Hot" | "Warm" | "Cold" = "Cold";
  if (score >= 80) {
    classification = "Hot";
  } else if (score >= 50) {
    classification = "Warm";
  }

  return { score, breakdown, classification };
}
