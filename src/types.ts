/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type LeadStatus =
  | "NEW"
  | "AUDITED"
  | "CONTACTED"
  | "REPLIED"
  | "CALL BOOKED"
  | "PROPOSAL SENT"
  | "WON"
  | "LOST";

export interface LeadAnalysis {
  digitalScore: number;
  hasWebsite: boolean;
  hasBookingSystem: boolean;
  hasWhatsapp: boolean;
  mobileQuality: string;
  seoQuality: string;
  trustSignals: string;
  revenueOpportunities: string[];
  recommendedOffer: string;
  problems?: string[];
  opportunities?: string[];
  recommendedPitch?: string;
  recommendedPackage?: string;
  estimatedProjectValue?: number;
}

export interface LeadSales {
  priorityScore: number; // 0-100
  contacted: boolean;
  lastContactDate?: string;
  nextFollowUp?: string;
  estimatedValue: number;
}

export interface Lead {
  id: string;
  companyName: string;
  category: string;
  location: string;
  phone: string;
  email: string;
  website: string;
  source: string;
  status: LeadStatus;
  notes: string;
  createdAt: string;
  analysis?: LeadAnalysis;
  sales?: LeadSales;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: "admin" | "sales_agent";
  name: string;
  createdAt: string;
}
