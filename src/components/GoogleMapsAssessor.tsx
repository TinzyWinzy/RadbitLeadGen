/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Google Maps Platform & Google Business Profile Assessor for Radbit Tourism OS.
 * Integrates vis.gl maps provider with Google Places API (New) to audit profile standing.
 */

import React, { useEffect, useState, useRef } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { MapPin, Star, Clock, Phone, Globe, AlertTriangle, CheckCircle, ExternalLink, RefreshCw, Key, ShieldCheck, Compass } from "lucide-react";
import { Lead } from "../types";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../dbError";

// Setup API Key extraction as dictated by the GMP Skill Constitution
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

interface GoogleMapsAssessorProps {
  lead: Lead;
  onUpdate: () => void;
}

export default function GoogleMapsAssessor({ lead, onUpdate }: GoogleMapsAssessorProps) {
  if (!hasValidKey) {
    return (
      <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-5 font-mono text-xs text-slate-400 space-y-4" id="gmp-unconfigured-container">
        <div className="flex items-center gap-2 text-amber-400 font-bold border-b border-slate-800 pb-2">
          <Key className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>GOOGLE MAPS KEY REQUIRED</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          To assess live Google Business Profiles, integrate real-time reviews, and display interactive maps, please provision a Google Maps API Key.
        </p>
        
        <div className="bg-slate-900 border border-slate-850 p-3.5 rounded space-y-2.5">
          <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">API Key Provisioning Protocol:</p>
          <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px]">
            <li>
              <a 
                href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sky-400 hover:underline inline-flex items-center gap-0.5"
              >
                Get Google Maps API Key <ExternalLink className="w-3 h-3" />
              </a>
            </li>
            <li>Press the <strong className="text-slate-100">Gear Icon (Settings)</strong> in AI Studio (top right corner).</li>
            <li>Select <strong className="text-slate-100">Secrets</strong> from the left list.</li>
            <li>Create a new secret named <code className="text-emerald-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-850">GOOGLE_MAPS_PLATFORM_KEY</code>.</li>
            <li>Paste your Google Maps API key into the value field and hit Enter.</li>
          </ol>
        </div>
        
        <p className="text-[10px] text-slate-500">
          * Application pipeline automatically detects and applies environment parameters upon successful hot rebuild. No page refresh is required.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY} version="weekly">
      <GbpProfileAuditEngine lead={lead} onUpdate={onUpdate} />
    </APIProvider>
  );
}

function GbpProfileAuditEngine({ lead, onUpdate }: { lead: Lead; onUpdate: () => void }) {
  const map = useMap();
  const placesLib = useMapsLibrary("places");
  
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [gmpError, setGmpError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [infoWindowOpen, setInfoWindowOpen] = useState(true);

  // Search for the business using Places API (New) Text Search
  const searchBusinessProfile = async () => {
    if (!placesLib) return;
    setSearching(true);
    setGmpError("");
    setProfile(null);

    try {
      const queryText = `${lead.companyName}, ${lead.location}, Zimbabwe`;
      
      // Perform Text Search first to get place ID and base information
      const { places } = await placesLib.Place.searchByText({
        textQuery: queryText,
        fields: ["id", "displayName", "location", "formattedAddress"],
        maxResultCount: 1,
      });

      if (!places || places.length === 0) {
        setGmpError(`No Google Maps profile found matching "${lead.companyName}" in ${lead.location}.`);
        setSearching(false);
        return;
      }

      const foundPlace = places[0];
      
      // Fetch full details of the business profile (Photos, reviews info, contact, hours)
      // Selecting optimal fields for cost control:rating, userRatingCount, websiteUri, phone, hours, photos
      await foundPlace.fetchFields({
        fields: [
          "displayName",
          "rating",
          "userRatingCount",
          "formattedAddress",
          "nationalPhoneNumber",
          "websiteUri",
          "regularOpeningHours",
          "editorialSummary",
          "photos",
        ],
      });

      setProfile(foundPlace);
    } catch (err: any) {
      console.error("Places API Search Error:", err);
      setGmpError(err.message || "Failed to communicate with Google Places API.");
    } finally {
      setSearching(false);
    }
  };

  // Run auto-search on mount or when lead details change
  useEffect(() => {
    if (placesLib) {
      searchBusinessProfile();
    }
  }, [placesLib, lead.companyName, lead.location]);

  // Push verified Google Maps contact details back into our CRM Firestore database
  const handleSyncToCrm = async () => {
    if (!profile) return;
    setSyncing(true);
    setSyncSuccess(false);

    try {
      const docRef = doc(db, "leads", lead.id);
      const updates: any = {};
      
      if (profile.nationalPhoneNumber && !lead.phone) {
        updates.phone = profile.nationalPhoneNumber;
      }
      if (profile.websiteUri && !lead.website) {
        updates.website = profile.websiteUri;
      }
      
      // Store Google Maps details inside a dedicated meta block
      updates["gmapsData"] = {
        placeId: profile.id,
        rating: profile.rating || null,
        reviewsCount: profile.userRatingCount || 0,
        address: profile.formattedAddress || "",
        syncedAt: new Date().toISOString(),
      };

      // Append standard note about maps audit
      const originalNotes = lead.notes || "";
      const mapsVerificationLog = `\n[Google Maps Audit ${new Date().toLocaleDateString()}] Verified profile. Rating: ${profile.rating || "N/A"} (${profile.userRatingCount || 0} reviews).`;
      if (!originalNotes.includes("Google Maps Audit")) {
        updates.notes = originalNotes + mapsVerificationLog;
      }

      try {
        await updateDoc(docRef, updates);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `leads/${lead.id}`);
      }
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
      onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  // Compute profile gaps to identify high-converting sales packages
  const auditGaps = () => {
    if (!profile) return [];
    const gaps = [];

    // Mismatched or missing website
    if (!profile.websiteUri) {
      gaps.push({
        severity: "CRITICAL",
        title: "No website listed on Google Maps profile",
        desc: "Losing 70% of potential direct traffic who click away when no booking or info link exists.",
        opportunity: "Radbit Tourism Launch Package (Custom high-converting marketing site + fast server infrastructure)"
      });
    } else if (lead.website && profile.websiteUri) {
      // Compare domains
      const crmDomain = lead.website.replace(/https?:\/\/(www\.)?/i, "").split("/")[0].toLowerCase();
      const gmpDomain = profile.websiteUri.replace(/https?:\/\/(www\.)?/i, "").split("/")[0].toLowerCase();
      if (crmDomain !== gmpDomain) {
        gaps.push({
          severity: "WARNING",
          title: "Mismatched website link",
          desc: `Google has "${profile.websiteUri}" while CRM lists "${lead.website}". Could cause brand confusion.`,
          opportunity: "Digital Presence Correction & Local SEO audit."
        });
      }
    }

    // Rating opportunities
    if (!profile.rating) {
      gaps.push({
        severity: "WARNING",
        title: "Unrated / New Business Profile",
        desc: "Zero Google review history makes building trust difficult for high-paying international travellers.",
        opportunity: "Radbit Review Automation system (WhatsApp-powered review builder to gain five-star ratings easily)."
      });
    } else if (profile.rating < 4.4) {
      gaps.push({
        severity: "WARNING",
        title: `Low Search standing (${profile.rating}★ Rating)`,
        desc: "Competitors with higher scores are prioritized in regional search algorithms.",
        opportunity: "Reputation Turnaround Campaign (Automated client checkout feedback & satisfaction filters)."
      });
    }

    // Business Hours gap
    if (!profile.regularOpeningHours) {
      gaps.push({
        severity: "INFO",
        title: "Operating hours not registered",
        desc: "Customers might assume the business is closed or unavailable during holidays or weekends.",
        opportunity: "Google Profile optimization & custom auto-responder bot."
      });
    }

    // Photo count opportunities (Google Places New has photos array)
    if (!profile.photos || profile.photos.length < 5) {
      gaps.push({
        severity: "INFO",
        title: "Sparse visual content",
        desc: "Profiles with rich imagery attract up to 350% more map-direction clicks.",
        opportunity: "Visual Storytelling upgrade & professional content integration."
      });
    }

    return gaps;
  };

  const gaps = auditGaps();
  const photoUri = profile?.photos?.[0]?.getURI({ maxWidth: 400 });

  return (
    <div className="bg-slate-950 border border-slate-850 rounded-lg p-4 font-mono text-xs space-y-4" id={`gmp-audit-engine-${lead.id}`}>
      {/* Header Controls */}
      <div className="flex justify-between items-center border-b border-slate-850 pb-2.5">
        <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1.5 uppercase">
          <Compass className="w-4 h-4 text-sky-400 animate-spin-slow" />
          Google Business Profile Assessor
        </span>
        <button
          onClick={searchBusinessProfile}
          disabled={searching}
          className="text-slate-500 hover:text-slate-300 transition p-1"
          title="Force refresh Google profile"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${searching ? "animate-spin text-sky-400" : ""}`} />
        </button>
      </div>

      {searching && (
        <div className="py-8 text-center text-slate-500 space-y-2">
          <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <span className="text-[10px] uppercase">Retrieving Google Business Records...</span>
        </div>
      )}

      {gmpError && !searching && (
        <div className="bg-slate-900 border border-slate-850 rounded p-3 text-slate-400 space-y-3">
          <div className="flex items-start gap-2 text-amber-500">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <span className="font-bold uppercase text-[10px]">Zero Matches Returned</span>
              <p className="text-[11px] leading-relaxed text-slate-400">{gmpError}</p>
            </div>
          </div>
          <div className="border-t border-slate-850 pt-2 text-[10px] text-slate-500">
            Ensure the registered business name in CRM exactly matches their actual listing on Google Maps.
          </div>
        </div>
      )}

      {profile && !searching && (
        <div className="space-y-4" id="gmp-profile-details">
          {/* Main profile card */}
          <div className="bg-slate-900/60 border border-slate-850 rounded p-3 flex flex-col sm:flex-row gap-3.5">
            {/* Business Photo */}
            {photoUri ? (
              <div className="w-full sm:w-24 h-24 rounded overflow-hidden border border-slate-800 flex-shrink-0 relative bg-slate-950">
                <img 
                  src={photoUri} 
                  alt={profile.displayName} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-full sm:w-24 h-24 rounded border border-slate-800 bg-slate-950 flex flex-col items-center justify-center text-slate-600 flex-shrink-0">
                <MapPin className="w-6 h-6 mb-1" />
                <span className="text-[8px] uppercase">No photo</span>
              </div>
            )}

            {/* Profile Info fields */}
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-slate-100 font-bold text-xs truncate uppercase tracking-tight">
                  {profile.displayName}
                </h4>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.displayName + ", Zimbabwe")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:text-sky-300 flex items-center gap-0.5 text-[10px]"
                >
                  MAPS <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>

              {/* Rating and Reviews */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center text-amber-400 gap-0.5">
                  <Star className="w-3.5 h-3.5 fill-current text-amber-500" />
                  <span className="font-bold text-slate-200">{profile.rating ? profile.rating.toFixed(1) : "N/A"}</span>
                </div>
                <span className="text-slate-500 text-[10px] font-bold uppercase">
                  ({profile.userRatingCount || 0} reviews)
                </span>
                {profile.rating >= 4.5 ? (
                  <span className="text-[8px] font-bold bg-emerald-950/40 text-emerald-400 px-1 py-0.5 rounded border border-emerald-900/60 uppercase">Strong Standing</span>
                ) : profile.rating ? (
                  <span className="text-[8px] font-bold bg-amber-950/40 text-amber-400 px-1 py-0.5 rounded border border-amber-900/60 uppercase">Needs Attention</span>
                ) : (
                  <span className="text-[8px] font-bold bg-slate-950 text-slate-500 px-1 py-0.5 rounded border border-slate-850 uppercase">No Standing</span>
                )}
              </div>

              {/* Physical details */}
              <div className="space-y-1 text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  <span className="truncate" title={profile.formattedAddress}>{profile.formattedAddress}</span>
                </div>

                {profile.nationalPhoneNumber && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <span>{profile.nationalPhoneNumber}</span>
                  </div>
                )}

                {profile.websiteUri && (
                  <div className="flex items-center gap-1.5 truncate">
                    <Globe className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                    <a 
                      href={profile.websiteUri} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-sky-400 hover:underline truncate"
                    >
                      {profile.websiteUri}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sync Trigger for Missing Data */}
          {((profile.nationalPhoneNumber && !lead.phone) || (profile.websiteUri && !lead.website)) && (
            <div className="bg-sky-950/20 border border-sky-900/60 p-2.5 rounded flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <p className="text-[10px] text-sky-400 font-bold uppercase">Google Data Available</p>
                <p className="text-[11px] text-slate-300">Found phone/website on Google Maps absent in CRM.</p>
              </div>
              <button
                onClick={handleSyncToCrm}
                disabled={syncing}
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] uppercase px-2.5 py-1 rounded transition flex items-center gap-1.5 flex-shrink-0"
              >
                <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
                {syncSuccess ? "Synced!" : "Sync to CRM"}
              </button>
            </div>
          )}

          {/* Business GAP Analysis Checklist */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Google Profile Audit Gap Analysis
            </span>
            {gaps.length === 0 ? (
              <div className="bg-emerald-950/20 border border-emerald-900/50 p-2.5 rounded text-emerald-400 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold uppercase text-[10px]">Optimized Standing</span>
                  <p className="text-slate-400 text-[11px]">No immediate digital profile gaps found on Google Maps. Standard monitoring is recommended.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {gaps.map((gap, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-850 p-2.5 rounded space-y-1">
                    <div className="flex items-center gap-1.5">
                      {gap.severity === "CRITICAL" ? (
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      )}
                      <span className={`font-bold text-[10px] uppercase ${gap.severity === "CRITICAL" ? "text-red-400" : "text-amber-400"}`}>
                        [{gap.severity}] {gap.title}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      {gap.desc}
                    </p>
                    <div className="bg-slate-950 border border-slate-850/60 p-1.5 rounded mt-1">
                      <span className="text-[9px] text-sky-400 font-bold uppercase block">Recommended Radbit Upgrade:</span>
                      <p className="text-slate-300 text-[10px]">{gap.opportunity}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Collapsible Interactive Map */}
          <div>
            <button
              onClick={() => setMapOpen(!mapOpen)}
              className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 p-2 rounded text-center text-[10px] uppercase font-bold text-slate-300 transition"
            >
              {mapOpen ? "Hide Interactive Google Map" : "Display Interactive Google Map"}
            </button>

            {mapOpen && profile.location && (
              <div className="border border-slate-800 rounded overflow-hidden h-48 mt-2" id="gmp-interactive-map-frame">
                <Map
                  defaultCenter={{ lat: profile.location.lat(), lng: profile.location.lng() }}
                  defaultZoom={13}
                  mapId="DEMO_MAP_ID"
                  internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                  style={{ width: "100%", height: "100%" }}
                  gestureHandling={"cooperative"}
                >
                  <AdvancedMarker 
                    position={{ lat: profile.location.lat(), lng: profile.location.lng() }}
                    onClick={() => setInfoWindowOpen(true)}
                  >
                    <Pin background="#0ea5e9" glyphColor="#fff" borderColor="#0284c7" />
                  </AdvancedMarker>

                  {infoWindowOpen && (
                    <InfoWindow 
                      position={{ lat: profile.location.lat(), lng: profile.location.lng() }} 
                      onCloseClick={() => setInfoWindowOpen(false)}
                    >
                      <div className="p-1 font-sans text-xs text-slate-900 max-w-[180px]">
                        <p className="font-bold uppercase text-[10px] tracking-tight">{profile.displayName}</p>
                        {profile.rating && (
                          <div className="flex items-center gap-0.5 mt-0.5 font-bold text-amber-600">
                            <span>{profile.rating}★</span>
                            <span className="text-slate-500 font-normal">({profile.userRatingCount || 0})</span>
                          </div>
                        )}
                        <p className="text-[9px] text-slate-500 mt-1 leading-tight">{profile.formattedAddress}</p>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Simple CSS spin-slow animation added
const style = document.createElement("style");
style.innerHTML = `
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-spin-slow {
    animation: spin-slow 12s linear infinite;
  }
`;
document.head.appendChild(style);
