/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Lead } from "../types";
import { Users, FileSearch, ShieldAlert, PhoneCall, TrendingUp, DollarSign, Briefcase } from "lucide-react";

interface DashboardStatsProps {
  leads: Lead[];
}

export default function DashboardStats({ leads }: DashboardStatsProps) {
  const totalLeads = leads.length;
  
  const auditedLeads = leads.filter(
    (lead) => lead.analysis && lead.status !== "NEW"
  ).length;

  const hotProspects = leads.filter(
    (lead) => lead.sales && lead.sales.priorityScore >= 80
  ).length;

  const contactedLeads = leads.filter(
    (lead) => lead.sales?.contacted || ["CONTACTED", "REPLIED", "CALL BOOKED", "PROPOSAL SENT", "WON"].includes(lead.status)
  ).length;

  // Conversion rate: WON / Closed Leads
  const closedLeads = leads.filter((lead) => ["WON", "LOST"].includes(lead.status)).length;
  const wonLeads = leads.filter((lead) => lead.status === "WON").length;
  const conversionRate = closedLeads > 0 ? Math.round((wonLeads / closedLeads) * 100) : 0;

  // Pipeline stage probability multipliers for Expected Revenue
  const getStageProbability = (status: string) => {
    switch (status) {
      case "NEW": return 0.05;
      case "AUDITED": return 0.15;
      case "CONTACTED": return 0.25;
      case "REPLIED": return 0.40;
      case "CALL BOOKED": return 0.60;
      case "PROPOSAL SENT": return 0.80;
      case "WON": return 1.00;
      case "LOST": return 0.00;
      default: return 0.00;
    }
  };

  const expectedRevenue = Math.round(
    leads.reduce((sum, lead) => {
      const val = lead.sales?.estimatedValue || lead.analysis?.estimatedProjectValue || 0;
      const prob = getStageProbability(lead.status);
      return sum + val * prob;
    }, 0)
  );

  const pipelineValue = Math.round(
    leads
      .filter((lead) => !["WON", "LOST"].includes(lead.status))
      .reduce((sum, lead) => {
        return sum + (lead.sales?.estimatedValue || lead.analysis?.estimatedProjectValue || 0);
      }, 0)
  );

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6" id="dashboard-stats-grid">
      {/* 1. Total Leads */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col justify-between" id="stat-total-leads">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs uppercase tracking-wider font-mono">Total Leads</span>
          <Users className="w-4 h-4 text-slate-500" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-slate-100">{totalLeads}</div>
          <p className="text-[10px] text-slate-500 mt-1">Database volume</p>
        </div>
      </div>

      {/* 2. Audited */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col justify-between" id="stat-audited">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs uppercase tracking-wider font-mono">Audited</span>
          <FileSearch className="w-4 h-4 text-sky-400" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-sky-400">
            {auditedLeads}
            <span className="text-xs text-slate-500 ml-1 font-normal">
              ({totalLeads > 0 ? Math.round((auditedLeads / totalLeads) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">AI-scanned operators</p>
        </div>
      </div>

      {/* 3. Hot Prospects */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col justify-between" id="stat-hot-prospects">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs uppercase tracking-wider font-mono">Hot Leads</span>
          <ShieldAlert className="w-4 h-4 text-amber-500 animate-pulse" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-amber-500">{hotProspects}</div>
          <p className="text-[10px] text-slate-500 mt-1">Priority score &ge; 80</p>
        </div>
      </div>

      {/* 4. Contacted */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col justify-between" id="stat-contacted">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs uppercase tracking-wider font-mono">Contacted</span>
          <PhoneCall className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-indigo-400">
            {contactedLeads}
            <span className="text-xs text-slate-500 ml-1 font-normal">
              ({totalLeads > 0 ? Math.round((contactedLeads / totalLeads) * 100) : 0}%)
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Sales outreach reach</p>
        </div>
      </div>

      {/* 5. Conversion Rate */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col justify-between" id="stat-conversion-rate">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs uppercase tracking-wider font-mono">Win Rate</span>
          <TrendingUp className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <div className="text-2xl font-bold font-mono text-emerald-500">
            {conversionRate}%
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Won / Closed leads</p>
        </div>
      </div>

      {/* 6. Expected Revenue */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col justify-between" id="stat-expected-revenue">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs uppercase tracking-wider font-mono">Exp. Revenue</span>
          <DollarSign className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <div className="text-lg font-bold font-mono text-emerald-400">{formatCurrency(expectedRevenue)}</div>
          <p className="text-[10px] text-slate-500 mt-1">Probability weighted</p>
        </div>
      </div>

      {/* 7. Pipeline Value */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col justify-between" id="stat-pipeline-value">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-xs uppercase tracking-wider font-mono">Active Pipeline</span>
          <Briefcase className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <div className="text-lg font-bold font-mono text-purple-400">{formatCurrency(pipelineValue)}</div>
          <p className="text-[10px] text-slate-500 mt-1">Total active deals</p>
        </div>
      </div>
    </div>
  );
}
