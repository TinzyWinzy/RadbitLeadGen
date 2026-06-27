/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { MessageSquare, Mail, Copy, Check, Sparkles, RefreshCw } from "lucide-react";
import { Lead } from "../types";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../dbError";

interface OutreachGeneratorProps {
  lead: Lead;
  onUpdate: () => void;
}

interface OutreachData {
  whatsapp: string;
  emailSubject: string;
  emailBody: string;
  followUp: string;
}

export default function OutreachGenerator({ lead, onUpdate }: OutreachGeneratorProps) {
  const [activeTab, setActiveTab] = useState<"whatsapp" | "email" | "followup">("whatsapp");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // Retrieve existing outreach materials if stored in notes or a custom subfield
  // Let's store generated outreach in a custom 'outreach' property of the Lead object
  const existingOutreach = (lead as any).outreach as OutreachData | undefined;

  const handleGenerate = async () => {
    if (!lead.analysis) {
      setError("Please perform an AI Digital Audit on this business first before generating outreach.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead,
          analysis: lead.analysis,
        }),
      });

      if (!res.ok) {
        throw new Error("Outreach API responded with status " + res.status);
      }

      const data = await res.json();

      // Save to Firestore
      const docRef = doc(db, "leads", lead.id);
      try {
        await updateDoc(docRef, {
          outreach: data,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `leads/${lead.id}`);
      }

      onUpdate();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Outreach generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentTextToCopy = () => {
    if (!existingOutreach) return "";
    if (activeTab === "whatsapp") return existingOutreach.whatsapp;
    if (activeTab === "followup") return existingOutreach.followUp;
    return `Subject: ${existingOutreach.emailSubject}\n\n${existingOutreach.emailBody}`;
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-4" id={`outreach-gen-${lead.id}`}>
      <div className="flex justify-between items-center pb-2 border-b border-slate-900">
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI Sales Angle Outreach Generator
        </h4>
        
        {existingOutreach && !loading && (
          <button
            onClick={handleGenerate}
            className="text-[10px] font-mono text-slate-500 hover:text-slate-300 flex items-center gap-1"
            title="Re-generate outreach with AI"
          >
            <RefreshCw className="w-3 h-3" /> Re-generate
          </button>
        )}
      </div>

      {error && (
        <p className="text-[11px] font-mono text-red-400 bg-red-950/20 border border-red-900 p-2 rounded">
          {error}
        </p>
      )}

      {!existingOutreach && !loading ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create high-converting outreach personalized to {lead.companyName}'s digital gaps.
          </p>
          <button
            onClick={handleGenerate}
            disabled={!lead.analysis}
            className={`font-mono text-xs px-4 py-2 rounded-md transition duration-200 flex items-center gap-2 mx-auto ${
              lead.analysis
                ? "bg-amber-600 hover:bg-amber-500 text-white cursor-pointer shadow-lg shadow-amber-900/20"
                : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-750"
            }`}
          >
            <Sparkles className="w-4 h-4 fill-current" /> Generate Smart Pitch Material
          </button>
          {!lead.analysis && (
            <p className="text-[10px] text-slate-500">
              * Requires a completed digital presence audit first.
            </p>
          )}
        </div>
      ) : loading ? (
        <div className="text-center py-8 space-y-2">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs font-mono text-slate-400">Gemini Sales Strategist is compiling personalized templates...</p>
        </div>
      ) : existingOutreach ? (
        <div className="space-y-3">
          {/* Channel Tabs */}
          <div className="flex border-b border-slate-900 text-xs font-mono">
            <button
              onClick={() => setActiveTab("whatsapp")}
              className={`pb-1.5 px-3 flex items-center gap-1.5 border-b-2 transition ${
                activeTab === "whatsapp"
                  ? "border-emerald-500 text-emerald-400 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> WhatsApp Direct
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={`pb-1.5 px-3 flex items-center gap-1.5 border-b-2 transition ${
                activeTab === "email"
                  ? "border-sky-500 text-sky-400 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Mail className="w-3.5 h-3.5" /> Business Email
            </button>
            <button
              onClick={() => setActiveTab("followup")}
              className={`pb-1.5 px-3 flex items-center gap-1.5 border-b-2 transition ${
                activeTab === "followup"
                  ? "border-purple-500 text-purple-400 font-bold"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" /> Follow-Up ping
            </button>
          </div>

          {/* Copy Button and Content box */}
          <div className="relative">
            <button
              onClick={() => handleCopy(currentTextToCopy())}
              className="absolute top-2 right-2 p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850 transition"
              title="Copy to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {activeTab === "whatsapp" && (
              <div className="bg-slate-900/60 p-3 rounded-md text-xs font-mono text-slate-300 border border-slate-850 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {existingOutreach.whatsapp}
              </div>
            )}

            {activeTab === "email" && (
              <div className="space-y-2 bg-slate-900/60 p-3 rounded-md border border-slate-850">
                <div className="border-b border-slate-850 pb-2 text-xs font-mono">
                  <span className="text-slate-500 uppercase tracking-wider text-[9px] block">Subject:</span>
                  <span className="text-slate-200 font-semibold">{existingOutreach.emailSubject}</span>
                </div>
                <div className="text-xs font-mono text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                  {existingOutreach.emailBody}
                </div>
              </div>
            )}

            {activeTab === "followup" && (
              <div className="bg-slate-900/60 p-3 rounded-md text-xs font-mono text-slate-300 border border-slate-850 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                {existingOutreach.followUp}
              </div>
            )}
          </div>

          <div className="bg-slate-950 p-2 border border-slate-900 rounded text-[10px] font-mono text-slate-500 flex items-start gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
            <span>
              Radbit pitch constraint met: Zero occurrences of "We build websites." Pitch emphasizes increasing direct bookings and direct enquiries for tourism operators.
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
