/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sparkles, ShieldAlert, CheckCircle, ChevronDown, ChevronUp, AlertCircle, TrendingUp, DollarSign, Briefcase } from "lucide-react";
import { Lead, LeadAnalysis } from "../types";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../dbError";
import { calculatePriorityScore } from "../utils/scoring";

interface AuditReportProps {
  lead: Lead;
  onUpdate: () => void;
}

export default function AuditReport({ lead, onUpdate }: AuditReportProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showBreakdown, setShowBreakdown] = useState(false);

  const handleRunAudit = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: lead.companyName,
          website: lead.website,
          category: lead.category,
          location: lead.location,
        }),
      });

      if (!response.ok) {
        throw new Error("API responded with error code " + response.status);
      }

      const auditData: LeadAnalysis = await response.json();

      // Run our scoring engine
      const { score, classification } = calculatePriorityScore(auditData);

      // Update lead doc in Firestore
      const docRef = doc(db, "leads", lead.id);
      try {
        await updateDoc(docRef, {
          status: "AUDITED",
          analysis: auditData,
          sales: {
            priorityScore: score,
            contacted: false,
            estimatedValue: auditData.estimatedProjectValue || 2500,
            lastContactDate: "",
            nextFollowUp: "",
          },
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `leads/${lead.id}`);
      }

      onUpdate();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "AI Audit failed. Check API key configurations.");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400 border-emerald-800 bg-emerald-950/20";
    if (score >= 50) return "text-yellow-400 border-yellow-800 bg-yellow-950/20";
    return "text-red-400 border-red-900 bg-red-950/20";
  };

  const getPriorityBadge = (score: number) => {
    if (score >= 80) return { label: "HOT", color: "bg-red-950/40 border-red-900 text-red-400" };
    if (score >= 50) return { label: "WARM", color: "bg-amber-950/40 border-amber-900 text-amber-400" };
    return { label: "COLD", color: "bg-slate-900 border-slate-800 text-slate-400" };
  };

  const isAudited = lead.status !== "NEW" && lead.analysis;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4" id={`audit-report-${lead.id}`}>
      <div className="flex justify-between items-center pb-2 border-b border-slate-850">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" /> AI Business Audit Agent
        </h4>
        
        {isAudited && (
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded border bg-slate-950 border-slate-850 text-sky-400">
            AUDITED
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-900 rounded text-[11px] font-mono text-red-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!isAudited && !loading ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Analyze {lead.companyName}'s digital presence, identify revenue opportunities, and generate a customized package pitch using Gemini.
          </p>
          <button
            onClick={handleRunAudit}
            className="bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs px-4 py-2 rounded-md transition duration-200 flex items-center gap-2 mx-auto cursor-pointer shadow-lg shadow-sky-900/20"
          >
            <Sparkles className="w-4 h-4 fill-current" /> Scan Business with AI
          </button>
        </div>
      ) : loading ? (
        <div className="text-center py-8 space-y-2">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-mono text-slate-400">Scrutinizing digital footprint, booking systems, and revenue leaks...</p>
        </div>
      ) : isAudited && lead.analysis ? (
        <div className="space-y-4">
          {/* Dual Scores Banner */}
          <div className="grid grid-cols-2 gap-3">
            {/* Digital score */}
            <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-md flex flex-col justify-between">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500">Digital Score</span>
                <div className="text-2xl font-bold font-mono text-slate-100">{lead.analysis.digitalScore}/100</div>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-1 mt-1 overflow-hidden">
                <div
                  className="bg-sky-500 h-1 rounded-full"
                  style={{ width: `${lead.analysis.digitalScore}%` }}
                ></div>
              </div>
            </div>

            {/* Sales Priority Score */}
            {lead.sales && (
              <div className="bg-slate-950 border border-slate-850 p-2.5 rounded-md flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] uppercase tracking-wider font-mono text-slate-500">Priority Score</span>
                    <div className="text-2xl font-bold font-mono text-slate-100">{lead.sales.priorityScore}/100</div>
                  </div>
                  <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded border ${getPriorityBadge(lead.sales.priorityScore).color}`}>
                    {getPriorityBadge(lead.sales.priorityScore).label}
                  </span>
                </div>
                
                {/* Score breakdown expander */}
                <button
                  onClick={() => setShowBreakdown(!showBreakdown)}
                  className="text-[9px] font-mono text-slate-500 hover:text-slate-300 flex items-center gap-0.5 self-end mt-1"
                >
                  {showBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />} Points breakdown
                </button>
              </div>
            )}
          </div>

          {/* Dynamic Score breakdown */}
          {showBreakdown && lead.analysis && (
            <div className="bg-slate-950 border border-slate-850 p-3 rounded text-[11px] font-mono space-y-2">
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">Priority Weight Analysis:</div>
              <div className="space-y-1.5">
                {calculatePriorityScore(lead.analysis).breakdown.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-slate-300">
                    <span>&bull; {item.reason}</span>
                    <span className="text-emerald-400 font-bold">+{item.points}</span>
                  </div>
                ))}
                {calculatePriorityScore(lead.analysis).breakdown.length === 0 && (
                  <div className="text-slate-500 italic">No significant digital revenue leakages identified.</div>
                )}
              </div>
            </div>
          )}

          {/* Key Checklist Gaps */}
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
            <div className={`p-1.5 rounded border ${lead.analysis.hasWebsite ? "bg-emerald-950/20 border-emerald-900 text-emerald-400" : "bg-red-950/20 border-red-900 text-red-400"}`}>
              {lead.analysis.hasWebsite ? "Website: YES" : "Website: MISSING"}
            </div>
            <div className={`p-1.5 rounded border ${lead.analysis.hasBookingSystem ? "bg-emerald-950/20 border-emerald-900 text-emerald-400" : "bg-red-950/20 border-red-900 text-red-400"}`}>
              {lead.analysis.hasBookingSystem ? "Booking: YES" : "Booking: MISSING"}
            </div>
            <div className={`p-1.5 rounded border ${lead.analysis.hasWhatsapp ? "bg-emerald-950/20 border-emerald-900 text-emerald-400" : "bg-red-950/20 border-red-900 text-red-400"}`}>
              {lead.analysis.hasWhatsapp ? "WhatsApp CTA: YES" : "WhatsApp CTA: MISSING"}
            </div>
          </div>

          {/* Mobile, SEO & Trust Signals */}
          <div className="bg-slate-950/50 border border-slate-850 p-3 rounded-md grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div>
              <div className="text-[9px] text-slate-500 uppercase">Mobile Experience</div>
              <div className="text-slate-200 font-semibold mt-0.5">{lead.analysis.mobileQuality}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase">SEO Quality</div>
              <div className="text-slate-200 font-semibold mt-0.5">{lead.analysis.seoQuality}</div>
            </div>
            <div>
              <div className="text-[9px] text-slate-500 uppercase">Trust Signals</div>
              <div className="text-slate-200 font-semibold mt-0.5">{lead.analysis.trustSignals}</div>
            </div>
          </div>

          {/* Problems and Opportunities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Problems */}
            <div className="bg-red-950/10 border border-red-900/40 p-2.5 rounded-md">
              <span className="text-[10px] font-mono uppercase tracking-wider text-red-400 block mb-1">Leakages / Problems</span>
              <ul className="space-y-1 text-slate-300">
                {lead.analysis.problems?.map((p, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-red-500 font-bold">&times;</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Opportunities */}
            <div className="bg-emerald-950/10 border border-emerald-900/40 p-2.5 rounded-md">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block mb-1">Growth Opportunities</span>
              <ul className="space-y-1 text-slate-300">
                {lead.analysis.opportunities?.map((o, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-emerald-500 font-bold">&bull;</span>
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Pitch, Package and Estimated Value */}
          <div className="bg-slate-950 border border-slate-850 p-3 rounded-md space-y-3 text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Proposed Pitch Angle</span>
              <p className="text-slate-300 font-mono mt-1 italic leading-relaxed">
                "{lead.analysis.recommendedPitch}"
              </p>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-850 text-xs">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Offer Package</span>
                <span className="font-bold text-slate-200 font-mono">{lead.analysis.recommendedPackage}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-slate-500 block">Est. Deal Value</span>
                <span className="font-bold text-emerald-400 font-mono flex items-center justify-end gap-0.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  {lead.sales?.estimatedValue || lead.analysis.estimatedProjectValue || 2500}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
