/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Lead, LeadStatus } from "../types";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../dbError";
import { ArrowRight, Move, Sparkles, DollarSign } from "lucide-react";

interface KanbanBoardProps {
  leads: Lead[];
  onUpdate: () => void;
  userRole?: "admin" | "sales_agent";
  onSelectLead?: (lead: Lead) => void;
}

const COLUMNS: { status: LeadStatus; label: string; bgHeader: string; textCol: string }[] = [
  { status: "NEW", label: "New Leads", bgHeader: "bg-slate-950 border-slate-800", textCol: "text-slate-400" },
  { status: "AUDITED", label: "Audited", bgHeader: "bg-sky-950/40 border-sky-900/40", textCol: "text-sky-400" },
  { status: "CONTACTED", label: "Contacted", bgHeader: "bg-indigo-950/40 border-indigo-900/40", textCol: "text-indigo-400" },
  { status: "REPLIED", label: "Replied", bgHeader: "bg-pink-950/40 border-pink-900/40", textCol: "text-pink-400" },
  { status: "CALL BOOKED", label: "Call Booked", bgHeader: "bg-purple-950/40 border-purple-900/40", textCol: "text-purple-400" },
  { status: "PROPOSAL SENT", label: "Proposal Sent", bgHeader: "bg-yellow-950/40 border-yellow-900/40", textCol: "text-yellow-400" },
  { status: "WON", label: "WON", bgHeader: "bg-emerald-950/40 border-emerald-900/40", textCol: "text-emerald-400" },
  { status: "LOST", label: "LOST", bgHeader: "bg-red-950/40 border-red-900/40", textCol: "text-red-400" },
];

export default function KanbanBoard({ leads, onUpdate, userRole, onSelectLead }: KanbanBoardProps) {
  const [draggingLeadId, setDraggingLeadId] = useState<string | null>(null);

  const handleDragStart = (leadId: string) => {
    setDraggingLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: LeadStatus) => {
    if (!draggingLeadId) return;
    try {
      const docRef = doc(db, "leads", draggingLeadId);
      try {
        await updateDoc(docRef, {
          status: status,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `leads/${draggingLeadId}`);
      }
      onUpdate();
    } catch (error) {
      console.error("Failed to update lead status on drop:", error);
    } finally {
      setDraggingLeadId(null);
    }
  };

  const getPriorityBorder = (score?: number) => {
    if (score === undefined) return "border-slate-800";
    if (score >= 80) return "border-l-2 border-l-red-500 border-slate-800";
    if (score >= 50) return "border-l-2 border-l-amber-500 border-slate-800";
    return "border-slate-800";
  };

  const getPriorityDot = (score?: number) => {
    if (score === undefined) return "bg-slate-700";
    if (score >= 80) return "bg-red-500 animate-pulse";
    if (score >= 50) return "bg-amber-500";
    return "bg-slate-500";
  };

  return (
    <div className="space-y-3" id="kanban-pipeline">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Move className="w-4 h-4 text-sky-400" /> Interactive Sales Pipeline (Drag &amp; Drop)
        </h3>
        <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
          * Drag lead cards across columns to advance pipeline stages.
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 pt-1 select-none scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.status);
          const colTotalValue = colLeads.reduce(
            (sum, l) => sum + (l.sales?.estimatedValue || l.analysis?.estimatedProjectValue || 0),
            0
          );

          return (
            <div
              key={col.status}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(col.status)}
              className="flex-shrink-0 w-72 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col max-h-[500px]"
              id={`kanban-col-${col.status}`}
            >
              {/* Column Header */}
              <div className={`p-2.5 rounded-t-lg border-b border-slate-800 flex justify-between items-center ${col.bgHeader}`}>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold font-mono uppercase tracking-wider ${col.textCol}`}>
                    {col.label}
                  </span>
                  <span className="text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-400 px-1.5 py-0.2 rounded-full">
                    {colLeads.length}
                  </span>
                </div>
                {colTotalValue > 0 && (
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/10 px-1.5 py-0.2 rounded">
                    ${colTotalValue.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Scrollable leads area */}
              <div className="p-2 space-y-2 overflow-y-auto flex-1 min-h-[300px] scrollbar-none bg-slate-950/20">
                {colLeads.map((lead) => {
                  const val = lead.sales?.estimatedValue || lead.analysis?.estimatedProjectValue || 0;
                  return (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={() => handleDragStart(lead.id)}
                      onClick={() => onSelectLead?.(lead)}
                      className={`bg-slate-900 p-2.5 rounded border ${getPriorityBorder(
                        lead.sales?.priorityScore
                      )} hover:border-slate-600 transition duration-150 cursor-grab active:cursor-grabbing`}
                      id={`kanban-item-${lead.id}`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-xs font-bold font-mono text-slate-100 line-clamp-1">
                          {lead.companyName}
                        </span>
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${getPriorityDot(lead.sales?.priorityScore)}`} />
                      </div>

                      <div className="text-[10px] font-mono text-slate-400 flex justify-between items-center mt-1.5">
                        <span className="truncate max-w-[150px]">{lead.category}</span>
                        {val > 0 && (
                          <span className="text-emerald-400 font-bold flex items-center">
                            <DollarSign className="w-3 h-3" />
                            {val}
                          </span>
                        )}
                      </div>

                      {/* Small checklist gaps status indicator */}
                      {lead.analysis && (
                        <div className="flex gap-1 mt-2">
                          <span
                            className={`w-1 h-1 rounded-full ${
                              lead.analysis.hasWebsite ? "bg-emerald-500" : "bg-red-500"
                            }`}
                            title={lead.analysis.hasWebsite ? "Has Website" : "No Website"}
                          />
                          <span
                            className={`w-1 h-1 rounded-full ${
                              lead.analysis.hasBookingSystem ? "bg-emerald-500" : "bg-red-500"
                            }`}
                            title={lead.analysis.hasBookingSystem ? "Has Booking System" : "No Booking System"}
                          />
                          <span
                            className={`w-1 h-1 rounded-full ${
                              lead.analysis.hasWhatsapp ? "bg-emerald-500" : "bg-red-500"
                            }`}
                            title={lead.analysis.hasWhatsapp ? "Has WhatsApp" : "No WhatsApp"}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {colLeads.length === 0 && (
                  <div className="h-40 border border-dashed border-slate-800/60 rounded-md flex flex-col items-center justify-center text-slate-600 text-[11px] font-mono">
                    <span>Empty Stage</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
