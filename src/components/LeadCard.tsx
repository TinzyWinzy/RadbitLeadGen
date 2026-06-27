/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Link as LinkIcon, Phone, Mail, Globe, Calendar, CheckSquare, Edit3, DollarSign, Trash2, Compass, MapPin } from "lucide-react";
import { Lead, LeadStatus } from "../types";
import { db } from "../firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../dbError";
import AuditReport from "./AuditReport";
import OutreachGenerator from "./OutreachGenerator";
import GoogleMapsAssessor from "./GoogleMapsAssessor";

interface LeadCardProps {
  key?: string;
  lead: Lead;
  onUpdate: () => void;
  userRole?: "admin" | "sales_agent";
}

export default function LeadCard({ lead, onUpdate, userRole }: LeadCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [notesText, setNotesText] = useState(lead.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSuccess, setNotesSuccess] = useState(false);
  const [rightTab, setRightTab] = useState<"outreach" | "google_maps">("outreach");

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as LeadStatus;
    const docRef = doc(db, "leads", lead.id);
    try {
      await updateDoc(docRef, {
        status: newStatus,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `leads/${lead.id}`);
    }
    onUpdate();
  };

  const handleToggleContacted = async () => {
    const isContacted = !lead.sales?.contacted;
    const docRef = doc(db, "leads", lead.id);
    try {
      await updateDoc(docRef, {
        "sales.contacted": isContacted,
        "sales.lastContactDate": isContacted ? new Date().toISOString() : "",
        status: isContacted && lead.status === "AUDITED" ? "CONTACTED" : lead.status,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `leads/${lead.id}`);
    }
    onUpdate();
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    setNotesSuccess(false);
    try {
      const docRef = doc(db, "leads", lead.id);
      await updateDoc(docRef, {
        notes: notesText,
      });
      setNotesSuccess(true);
      setTimeout(() => setNotesSuccess(false), 2000);
      onUpdate();
    } catch (e) {
      console.error(e);
      handleFirestoreError(e, OperationType.UPDATE, `leads/${lead.id}`);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDeleteLead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete lead: "${lead.companyName}"?`)) {
      return;
    }
    try {
      const docRef = doc(db, "leads", lead.id);
      await deleteDoc(docRef);
      onUpdate();
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `leads/${lead.id}`);
    }
  };

  const getPriorityBadgeColor = (score?: number) => {
    if (score === undefined) return "bg-slate-950 text-slate-500 border-slate-800";
    if (score >= 80) return "bg-red-950/40 border-red-900 text-red-400";
    if (score >= 50) return "bg-amber-950/40 border-amber-900 text-amber-400";
    return "bg-slate-900 border-slate-800 text-slate-400";
  };

  const getPriorityLabel = (score?: number) => {
    if (score === undefined) return "UNAUDITED";
    if (score >= 80) return `HOT (${score})`;
    if (score >= 50) return `WARM (${score})`;
    return `COLD (${score})`;
  };

  const getStatusColorClass = (status: LeadStatus) => {
    switch (status) {
      case "NEW": return "text-slate-400 bg-slate-950 border-slate-800";
      case "AUDITED": return "text-sky-400 bg-sky-950/20 border-sky-900/60";
      case "CONTACTED": return "text-indigo-400 bg-indigo-950/20 border-indigo-900/60";
      case "REPLIED": return "text-pink-400 bg-pink-950/20 border-pink-900/60";
      case "CALL BOOKED": return "text-purple-400 bg-purple-950/20 border-purple-900/60";
      case "PROPOSAL SENT": return "text-yellow-400 bg-yellow-950/20 border-yellow-900/60";
      case "WON": return "text-emerald-400 bg-emerald-950/20 border-emerald-900/60";
      case "LOST": return "text-red-400 bg-red-950/20 border-red-900/60";
      default: return "text-slate-400 bg-slate-950 border-slate-800";
    }
  };

  const formattedDate = new Date(lead.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });

  const estimatedVal = lead.sales?.estimatedValue || lead.analysis?.estimatedProjectValue || 0;

  return (
    <div
      className={`bg-slate-900 border ${
        expanded ? "border-slate-700 shadow-xl" : "border-slate-800/80 hover:border-slate-700"
      } rounded-lg overflow-hidden transition-all duration-200 cursor-pointer`}
      id={`lead-card-${lead.id}`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* CARD FRONT / COMPACT VIEW */}
      <div className="p-4" id={`lead-card-front-${lead.id}`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          {/* Company Details */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold font-mono text-slate-100 truncate max-w-[200px] sm:max-w-[300px]">
                {lead.companyName}
              </h4>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getPriorityBadgeColor(lead.sales?.priorityScore)}`}>
                {getPriorityLabel(lead.sales?.priorityScore)}
              </span>
              {estimatedVal > 0 && (
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/20 border border-emerald-900 px-2 py-0.5 rounded flex items-center">
                  <DollarSign className="w-3 h-3" /> {estimatedVal}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-400">
              <span className="bg-slate-950/80 px-2 py-0.5 rounded border border-slate-850 text-slate-300">
                {lead.category}
              </span>
              <span>&bull;</span>
              <span className="text-slate-400">{lead.location}</span>
            </div>

            {/* Quick Contact Icons */}
            <div className="flex items-center gap-3 text-slate-500 text-[11px] font-mono pt-1">
              {lead.phone && (
                <span className="flex items-center gap-1 hover:text-slate-300" title={lead.phone}>
                  <Phone className="w-3 h-3" /> <span className="hidden sm:inline">{lead.phone}</span>
                </span>
              )}
              {lead.email && (
                <span className="flex items-center gap-1 hover:text-slate-300" title={lead.email}>
                  <Mail className="w-3 h-3" /> <span className="hidden sm:inline truncate max-w-[120px]">{lead.email}</span>
                </span>
              )}
              {lead.website ? (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 text-sky-400 hover:text-sky-300 hover:underline"
                >
                  <Globe className="w-3 h-3 text-sky-500" /> <span className="hidden sm:inline truncate max-w-[120px]">Visit Site</span>
                </a>
              ) : (
                <span className="text-red-500/80 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-red-500" /> No website
                </span>
              )}
            </div>
          </div>

          {/* Action Row / Dropdowns */}
          <div className="flex items-center gap-2 self-start sm:self-center" onClick={(e) => e.stopPropagation()}>
            {/* Status Dropdown */}
            <select
              className={`text-xs font-bold font-mono py-1 px-2.5 rounded border focus:outline-none cursor-pointer transition ${getStatusColorClass(
                lead.status
              )}`}
              value={lead.status}
              onChange={handleStatusChange}
            >
              <option value="NEW">NEW</option>
              <option value="AUDITED">AUDITED</option>
              <option value="CONTACTED">CONTACTED</option>
              <option value="REPLIED">REPLIED</option>
              <option value="CALL BOOKED">CALL BOOKED</option>
              <option value="PROPOSAL SENT">PROPOSAL SENT</option>
              <option value="WON">WON</option>
              <option value="LOST">LOST</option>
            </select>

            {/* Mark Contacted checkbox */}
            {lead.status !== "NEW" && (
              <button
                onClick={handleToggleContacted}
                className={`p-1.5 rounded border transition flex items-center justify-center ${
                  lead.sales?.contacted
                    ? "bg-indigo-950 border-indigo-700 text-indigo-400"
                    : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300"
                }`}
                title={lead.sales?.contacted ? "Mark as NOT contacted" : "Mark as Contacted"}
              >
                <CheckSquare className="w-3.5 h-3.5" />
              </button>
            )}

            {userRole === "admin" && (
              <button
                onClick={handleDeleteLead}
                className="p-1.5 rounded border border-slate-800 bg-slate-950 text-slate-500 hover:text-red-400 hover:border-red-900 transition"
                title="Delete Prospect"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Expander Arrow */}
            <div className="text-slate-500 hover:text-slate-300 p-1">
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>
      </div>

      {/* EXPANDED VIEW */}
      {expanded && (
        <div
          className="px-4 pb-4 pt-1 border-t border-slate-850/80 bg-slate-900/40 space-y-4"
          onClick={(e) => e.stopPropagation()}
          id={`lead-card-back-${lead.id}`}
        >
          {/* Metadata details line */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-mono text-slate-500 pt-2 border-b border-slate-850 pb-2">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Added {formattedDate}</span>
            <span>&bull;</span>
            <span>Source: {lead.source}</span>
            {lead.sales?.lastContactDate && (
              <>
                <span>&bull;</span>
                <span className="text-indigo-400">Last Contact: {new Date(lead.sales.lastContactDate).toLocaleDateString()}</span>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left side: AI PRESENCE AUDIT */}
            <div className="space-y-4">
              <AuditReport lead={lead} onUpdate={onUpdate} />
              
              {/* Internal Notes / Logs */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-3">
                <span className="text-xs font-mono font-bold uppercase text-slate-400 flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5 text-sky-400" /> Sales Log & Internal Notes
                </span>
                <textarea
                  className="w-full h-24 bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 p-2 rounded focus:border-slate-600 focus:outline-none"
                  placeholder="Record call responses, follow-up times, direct booking gaps discussed, or stakeholder roles..."
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                />
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-slate-500">
                    {notesSuccess ? (
                      <span className="text-emerald-400 font-bold">✓ Notes auto-saved</span>
                    ) : savingNotes ? (
                      <span className="animate-pulse">Saving...</span>
                    ) : (
                      "Unsaved logs"
                    )}
                  </span>
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-[11px] px-3 py-1 rounded"
                  >
                    Save Notes
                  </button>
                </div>
              </div>
            </div>

            {/* Right side: OUTREACH GENERATOR or GOOGLE MAPS AUDIT */}
            <div className="space-y-4">
              <div className="flex border-b border-slate-800 text-[11px] font-mono select-none bg-slate-950/40 p-1 rounded-t-lg">
                <button
                  onClick={() => setRightTab("outreach")}
                  className={`flex-1 py-2 font-bold uppercase rounded transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    rightTab === "outreach"
                      ? "bg-slate-800 text-sky-400 border border-slate-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-300 border border-transparent"
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" /> Outreach Materials
                </button>
                <button
                  onClick={() => setRightTab("google_maps")}
                  className={`flex-1 py-2 font-bold uppercase rounded transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    rightTab === "google_maps"
                      ? "bg-slate-800 text-sky-400 border border-slate-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-300 border border-transparent"
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 animate-spin-slow" /> Google Maps &amp; GBP
                </button>
              </div>

              {rightTab === "outreach" ? (
                <OutreachGenerator lead={lead} onUpdate={onUpdate} />
              ) : (
                <GoogleMapsAssessor lead={lead} onUpdate={onUpdate} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
