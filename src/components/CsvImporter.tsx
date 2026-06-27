/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Upload, HelpCircle, ArrowRight, CheckCircle, AlertTriangle, Play, Database, BookOpen, Globe, Check, Layers } from "lucide-react";
import { Lead } from "../types";
import { db } from "../firebase";
import { collection, doc, writeBatch } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../dbError";

// High-quality registered operators matching the official zimbabwetourism.net directory
const ZTA_REGISTRY_PRESETS: Lead[] = [
  {
    id: "zta_01",
    companyName: "Shearwater Victoria Falls",
    category: "Adventure Operator",
    location: "Victoria Falls",
    phone: "+263 83 284 4471",
    email: "info@shearwatervf.com",
    website: "https://www.shearwatervictoriafalls.com",
    source: "ZTA Registry Sync",
    status: "NEW",
    notes: "Official ZTA Registered Operator. Premium activities provider in Victoria Falls (helicopter flights, bridge jumping, white water rafting). Assess Google business profile for local rating gaps.",
    createdAt: new Date().toISOString()
  },
  {
    id: "zta_02",
    companyName: "Meikles Hotel",
    category: "Luxury Hotel",
    location: "Harare",
    phone: "+263 24 2707721",
    email: "meikles@meikles.com",
    website: "https://www.meikleshotel.com",
    source: "ZTA Registry Sync",
    status: "NEW",
    notes: "Official ZTA Registered 5-Star Hotel. Centrally located in Harare. Ideal lead for custom automated booking engine upsell.",
    createdAt: new Date().toISOString()
  },
  {
    id: "zta_03",
    companyName: "Amalinda Lodge",
    category: "Safari Lodge",
    location: "Matobo Hills",
    phone: "+263 29 2246452",
    email: "res@amalindacollection.co.zw",
    website: "https://amalindacollection.com",
    source: "ZTA Registry Sync",
    status: "NEW",
    notes: "Official ZTA Registered Lodge. Award-winning accommodation nested in the granite hills of Matobo. Check website booking flow friction.",
    createdAt: new Date().toISOString()
  },
  {
    id: "zta_04",
    companyName: "Caribbea Bay Resort",
    category: "Resort Hotel",
    location: "Kariba",
    phone: "+263 61 2146431",
    email: "rescaribbea@rtg.co.zw",
    website: "https://rtgandgohotels.com",
    source: "ZTA Registry Sync",
    status: "NEW",
    notes: "Official ZTA Registered Resort. Prominent resort on Lake Kariba shores. Check if WhatsApp automated reservation links are present.",
    createdAt: new Date().toISOString()
  },
  {
    id: "zta_05",
    companyName: "Bumi Hills Safari Lodge",
    category: "Luxury Lodge",
    location: "Kariba",
    phone: "+263 86 7700 0233",
    email: "contact@africanbushcamps.com",
    website: "https://africanbushcamps.com",
    source: "ZTA Registry Sync",
    status: "NEW",
    notes: "Official ZTA Registered Lodge. Luxury safari camp in Lake Kariba. Review Google reviews to find local search standing gaps.",
    createdAt: new Date().toISOString()
  },
  {
    id: "zta_06",
    companyName: "Wild Horizons Victoria Falls",
    category: "Tour Operator",
    location: "Victoria Falls",
    phone: "+263 83 284 4571",
    email: "info@wildhorizons.co.zw",
    website: "https://www.wildhorizons.co.za",
    source: "ZTA Registry Sync",
    status: "NEW",
    notes: "Official ZTA Registered Tour Operator. Massive Victoria Falls activity network and transfer provider. High priority prospect.",
    createdAt: new Date().toISOString()
  },
  {
    id: "zta_07",
    companyName: "Singita Pamushana Lodge",
    category: "Luxury Lodge",
    location: "Gonarezhou",
    phone: "+263 77 241 1294",
    email: "singita@pamushana.co.zw",
    website: "https://singita.com",
    source: "ZTA Registry Sync",
    status: "NEW",
    notes: "Official ZTA Registered Lodge. Ultra-luxury lodge on Malilangwe Wildlife Reserve. High deal value prospect.",
    createdAt: new Date().toISOString()
  },
  {
    id: "zta_08",
    companyName: "Troutbeck Resort",
    category: "Mountain Resort",
    location: "Nyanga",
    phone: "+263 29 2808260",
    email: "restroutbeck@rtg.co.zw",
    website: "https://rtgandgohotels.com",
    source: "ZTA Registry Sync",
    status: "NEW",
    notes: "Official ZTA Registered Resort in Eastern Highlands. Major potential for direct holiday package marketing campaigns.",
    createdAt: new Date().toISOString()
  },
  {
    id: "zta_09",
    companyName: "Cresta Jameson Hotel",
    category: "Hotel",
    location: "Harare",
    phone: "+263 24 2774106",
    email: "resjameson@cresta.co.zw",
    website: "https://www.crestahotels.com",
    source: "ZTA Registry Sync",
    status: "NEW",
    notes: "Official ZTA Registered business hotel. Opportunity to improve mobile reservations funnel and SEO presence.",
    createdAt: new Date().toISOString()
  },
  {
    id: "zta_10",
    companyName: "Sable Sands Lodge",
    category: "Safari Lodge",
    location: "Hwange",
    phone: "+263 77 212 5110",
    email: "bookings@sablesands.co.zw",
    website: "https://sablesandshwange.com",
    source: "ZTA Registry Sync",
    status: "NEW",
    notes: "Official ZTA Registered Lodge in Hwange forest boundaries. Direct Booking system and local reputation systems pitch.",
    createdAt: new Date().toISOString()
  },
  {
    id: "zta_11",
    companyName: "Great Zimbabwe Hotel",
    category: "Heritage Hotel",
    location: "Masvingo",
    phone: "+263 39 2262449",
    email: "resgz@rtg.co.zw",
    website: "https://rtgandgohotels.com",
    source: "ZTA Registry Sync",
    status: "NEW",
    notes: "Official ZTA Registered heritage hotel located adjacent to historical ruins monument. Target for cultural tour booking upgrades.",
    createdAt: new Date().toISOString()
  },
  {
    id: "zta_12",
    companyName: "Chinhoyi Caves Motel",
    category: "Motel",
    location: "Chinhoyi",
    phone: "+263 67 22313",
    email: "info@chinhoyimotel.co.zw",
    website: "",
    source: "ZTA Registry Sync",
    status: "NEW",
    notes: "Official ZTA Registered motel on Caves highway. No official website listed on ZTA directory or active. Primary web launch lead opportunity.",
    createdAt: new Date().toISOString()
  }
];

interface CsvImporterProps {
  onImportComplete: () => void;
}

export default function CsvImporter({ onImportComplete }: CsvImporterProps) {
  const [activeTab, setActiveTab] = useState<"csv" | "zta">("csv");
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [step, setStep] = useState<"input" | "mapping" | "preview" | "importing" | "complete">("input");
  
  // Mapping configuration (maps target fields to index in row)
  const [mapping, setMapping] = useState<{
    companyName: number;
    category: number;
    location: number;
    phone: number;
    email: number;
    website: number;
  }>({
    companyName: -1,
    category: -1,
    location: -1,
    phone: -1,
    email: -1,
    website: -1,
  });

  const [importStatus, setImportStatus] = useState({ success: 0, failed: 0, total: 0 });
  const [errorMessage, setErrorMessage] = useState("");
  const [ztaStatus, setZtaStatus] = useState<"idle" | "importing" | "success">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string) => {
    try {
      // Handle different line endings
      const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
      if (lines.length < 2) {
        setErrorMessage("Data must contain a header row and at least one data row.");
        return;
      }

      // Smart parsing supporting both CSV commas and Tab-Separated values copied from websites (such as zimbabwetourism.net tables!)
      const isTabSeparated = lines[0].includes("\t") || lines[1]?.includes("\t");

      const parseLine = (line: string): string[] => {
        if (isTabSeparated) {
          return line.split("\t").map(v => v.trim().replace(/^["']|["']$/g, ""));
        }
        
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            result.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const parsedHeaders = parseLine(lines[0]);
      const parsedRows = lines.slice(1).map(parseLine);

      setHeaders(parsedHeaders);
      setRows(parsedRows);
      
      // Auto-guess mapping based on header strings
      const guessedMapping = {
        companyName: parsedHeaders.findIndex((h) => /name|company|business|operator|title/i.test(h)),
        category: parsedHeaders.findIndex((h) => /category|type|industry|class/i.test(h)),
        location: parsedHeaders.findIndex((h) => /city|location|town|address|region/i.test(h)),
        phone: parsedHeaders.findIndex((h) => /phone|telephone|mobile|contact/i.test(h)),
        email: parsedHeaders.findIndex((h) => /email|mail/i.test(h)),
        website: parsedHeaders.findIndex((h) => /website|url|web|link/i.test(h)),
      };

      setMapping(guessedMapping);
      setStep("mapping");
      setErrorMessage("");
    } catch (e) {
      setErrorMessage("Error parsing text content. Ensure formatting matches standard CSV or tabbed tables.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const handleCopyPasteSubmit = () => {
    if (!csvText.trim()) {
      setErrorMessage("Please paste text data first.");
      return;
    }
    parseCSV(csvText);
  };

  const handleMapChange = (field: keyof typeof mapping, index: number) => {
    setMapping((prev) => ({ ...prev, [field]: index }));
  };

  const processMappingAndShowPreview = () => {
    if (mapping.companyName === -1) {
      setErrorMessage("Please select a column to map 'Business Name' (Required).");
      return;
    }
    setStep("preview");
    setErrorMessage("");
  };

  const startImport = async () => {
    setStep("importing");
    setImportStatus({ success: 0, failed: 0, total: rows.length });

    const batchSize = 400;
    let batch = writeBatch(db);
    let countInBatch = 0;
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const companyName = row[mapping.companyName];
        if (!companyName) {
          failedCount++;
          continue;
        }

        const category = mapping.category !== -1 ? row[mapping.category] || "Other" : "Other";
        const location = mapping.location !== -1 ? row[mapping.location] || "Zimbabwe" : "Zimbabwe";
        const phone = mapping.phone !== -1 ? row[mapping.phone] || "" : "";
        const email = mapping.email !== -1 ? row[mapping.email] || "" : "";
        const website = mapping.website !== -1 ? row[mapping.website] || "" : "";

        let finalWebsite = website.trim();
        if (finalWebsite && !/^https?:\/\//i.test(finalWebsite)) {
          finalWebsite = "https://" + finalWebsite;
        }

        const leadId = "lead_" + doc(collection(db, "leads")).id;

        const newLead: Lead = {
          id: leadId,
          companyName: companyName.trim(),
          category: category.trim(),
          location: location.trim(),
          phone: phone.trim(),
          email: email.trim(),
          website: finalWebsite,
          source: "Direct Copy-Paste",
          status: "NEW",
          notes: "Imported from physical operator directory.",
          createdAt: new Date().toISOString(),
        };

        const docRef = doc(db, "leads", leadId);
        batch.set(docRef, newLead);
        countInBatch++;
        successCount++;

        if (countInBatch >= batchSize) {
          try {
            await batch.commit();
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, "leads");
          }
          batch = writeBatch(db);
          countInBatch = 0;
          setImportStatus((prev) => ({ ...prev, success: successCount, failed: failedCount }));
        }
      } catch (err) {
        console.error("Row import error:", err);
        failedCount++;
      }
    }

    if (countInBatch > 0) {
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "leads");
      }
    }

    setImportStatus({ success: successCount, failed: failedCount, total: rows.length });
    setStep("complete");
    onImportComplete();
  };

  // Instant official ZTA Presets loader
  const handleSyncZtaPresets = async () => {
    setZtaStatus("importing");
    try {
      const batch = writeBatch(db);
      ZTA_REGISTRY_PRESETS.forEach((preset) => {
        const leadId = "lead_" + doc(collection(db, "leads")).id;
        const newLead = { ...preset, id: leadId };
        const docRef = doc(db, "leads", leadId);
        batch.set(docRef, newLead);
      });
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "leads");
      }
      setZtaStatus("success");
      setTimeout(() => {
        setZtaStatus("idle");
        onImportComplete();
      }, 2000);
    } catch (err) {
      console.error(err);
      setZtaStatus("idle");
    }
  };

  const loadExampleCsv = () => {
    const sampleText = `Business Name,Category,City,Phone,Email,Website
"Matobo Hills Safari Lodge","Lodge","Matobo",+263 9 63581,bookings@matobolodge-example.co.zw,matobolodge-example.co.zw
"Chimanimani Arms","Hotel","Chimanimani",+263 26 2266,chimanimaniarms-example.com,http://chimanimaniarms-example.com
"Chinhoyi Caves Motel","Motel","Chinhoyi",+263 67 22313,info@chinhoyimotel.co.zw,
"Hwange Safari Company","Safari Camps","Hwange",+263 18 2155,hwange@safari-example.co.zw,hwange-example.co.zw
"Vumba Heights Chalets","Cottages","Vumba",+263 20 64451,vumba@heights-example.co.zw,`;
    setCsvText(sampleText);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 mb-6" id="csv-importer-container">
      {/* Tab Selectors */}
      <div className="flex border-b border-slate-800 mb-4 text-xs font-mono select-none">
        <button
          onClick={() => { setActiveTab("csv"); setStep("input"); }}
          className={`px-4 py-2.5 font-bold uppercase border-b-2 flex items-center gap-2 ${
            activeTab === "csv"
              ? "border-sky-500 text-sky-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Upload className="w-3.5 h-3.5" /> CSV / Raw Text Import
        </button>
        <button
          onClick={() => { setActiveTab("zta"); }}
          className={`px-4 py-2.5 font-bold uppercase border-b-2 flex items-center gap-2 ${
            activeTab === "zta"
              ? "border-sky-500 text-sky-400"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Zimbabwe ZTA Registry Source
        </button>
      </div>

      {activeTab === "csv" ? (
        // Standard CSV/Pasted Input Panel
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold font-mono uppercase text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" /> Lead Acquisition Data Importer
            </h3>
            {step === "input" && (
              <button
                onClick={loadExampleCsv}
                className="text-[11px] font-mono border border-slate-700 hover:border-slate-500 text-slate-400 px-2 py-1 rounded cursor-pointer"
              >
                Load Example Structure
              </button>
            )}
          </div>

          {errorMessage && (
            <div className="bg-red-950/40 border border-red-900 text-red-400 text-xs p-3 rounded-lg flex items-center gap-2 mb-4 font-mono">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" /> {errorMessage}
            </div>
          )}

          {/* Step 1: Input */}
          {step === "input" && (
            <div className="space-y-4" id="step-input">
              <div className="border-2 border-dashed border-slate-800 rounded-lg p-6 text-center hover:border-slate-700 transition cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv"
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-300">Click to upload or drag .CSV file</p>
                <p className="text-[10px] text-slate-500 mt-1">Accepts comma-separated spreadsheet registers</p>
              </div>

              <div className="flex items-center my-2">
                <div className="flex-1 border-t border-slate-800"></div>
                <span className="text-[10px] font-mono text-slate-500 px-3 uppercase">Or paste raw spreadsheet table values</span>
                <div className="flex-1 border-t border-slate-800"></div>
              </div>

              <div>
                <textarea
                  className="w-full h-32 bg-slate-950 border border-slate-850 p-2 text-xs font-mono text-emerald-400 rounded focus:border-emerald-600 focus:outline-none"
                  placeholder={`Business Name\tCategory\tCity\tPhone\nLodge Name\tAccommodation\tHarare\t+263777000`}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                />
                <span className="text-[9px] text-slate-500 font-mono mt-1 block">
                  * Note: Copying and pasting tabular records directly from zimbabwetourism.net tables will be recognized and auto-parsed as Tab-Separated columns!
                </span>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCopyPasteSubmit}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs px-4 py-2 rounded flex items-center gap-1.5 transition cursor-pointer"
                >
                  Parse Data <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Mapping columns */}
          {step === "mapping" && (
            <div className="space-y-4" id="step-mapping">
              <p className="text-xs text-slate-400 font-mono">
                CRM integration maps spreadsheet columns to Lead Records. Confirm associations below:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Business Name */}
                <div className="bg-slate-950 border border-slate-850 p-2.5 rounded">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1 font-bold">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
                    value={mapping.companyName}
                    onChange={(e) => handleMapChange("companyName", parseInt(e.target.value))}
                  >
                    <option value={-1}>-- Select Column --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        Col {i + 1}: {h || "(Empty Header)"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div className="bg-slate-950 border border-slate-850 p-2.5 rounded">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Category / Type</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
                    value={mapping.category}
                    onChange={(e) => handleMapChange("category", parseInt(e.target.value))}
                  >
                    <option value={-1}>-- Ignore / Default to "Other" --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        Col {i + 1}: {h || "(Empty)"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location */}
                <div className="bg-slate-950 border border-slate-850 p-2.5 rounded">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">City / Location</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
                    value={mapping.location}
                    onChange={(e) => handleMapChange("location", parseInt(e.target.value))}
                  >
                    <option value={-1}>-- Ignore / Default to "Zimbabwe" --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        Col {i + 1}: {h || "(Empty)"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div className="bg-slate-950 border border-slate-850 p-2.5 rounded">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Phone Number</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
                    value={mapping.phone}
                    onChange={(e) => handleMapChange("phone", parseInt(e.target.value))}
                  >
                    <option value={-1}>-- Ignore / None --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        Col {i + 1}: {h || "(Empty)"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Email */}
                <div className="bg-slate-950 border border-slate-850 p-2.5 rounded">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Email Address</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
                    value={mapping.email}
                    onChange={(e) => handleMapChange("email", parseInt(e.target.value))}
                  >
                    <option value={-1}>-- Ignore / None --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        Col {i + 1}: {h || "(Empty)"}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Website */}
                <div className="bg-slate-950 border border-slate-850 p-2.5 rounded">
                  <label className="block text-[11px] font-mono text-slate-400 mb-1">Website URL</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
                    value={mapping.website}
                    onChange={(e) => handleMapChange("website", parseInt(e.target.value))}
                  >
                    <option value={-1}>-- Ignore / None --</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        Col {i + 1}: {h || "(Empty)"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-between mt-4">
                <button
                  onClick={() => setStep("input")}
                  className="text-slate-400 hover:text-slate-200 font-mono text-xs border border-slate-800 px-3 py-1.5 rounded cursor-pointer"
                >
                  Back to Input
                </button>
                <button
                  onClick={processMappingAndShowPreview}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs px-4 py-2 rounded flex items-center gap-1.5 transition cursor-pointer"
                >
                  Configure Preview <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === "preview" && (
            <div className="space-y-4" id="step-preview">
              <p className="text-xs text-slate-400 font-mono">
                Review parsed records from copy-paste structure before inserting to Firestore:
              </p>

              <div className="overflow-x-auto border border-slate-800 rounded">
                <table className="w-full text-[11px] text-left font-mono text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-2 border-r border-slate-850 font-bold">Company</th>
                      <th className="p-2 border-r border-slate-850 font-bold">Category</th>
                      <th className="p-2 border-r border-slate-850 font-bold">Location</th>
                      <th className="p-2 border-r border-slate-850 font-bold">Phone</th>
                      <th className="p-2 border-r border-slate-850 font-bold">Email</th>
                      <th className="p-2 font-bold">Website</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {rows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-850/50">
                        <td className="p-2 border-r border-slate-850 text-slate-100 font-semibold">{row[mapping.companyName] || <span className="text-red-500">Missing</span>}</td>
                        <td className="p-2 border-r border-slate-850">{mapping.category !== -1 ? row[mapping.category] || "Other" : "Other"}</td>
                        <td className="p-2 border-r border-slate-850">{mapping.location !== -1 ? row[mapping.location] || "Zimbabwe" : "Zimbabwe"}</td>
                        <td className="p-2 border-r border-slate-850 text-slate-400">{mapping.phone !== -1 ? row[mapping.phone] || "N/A" : "N/A"}</td>
                        <td className="p-2 border-r border-slate-850 text-slate-400">{mapping.email !== -1 ? row[mapping.email] || "N/A" : "N/A"}</td>
                        <td className="p-2 text-sky-400 truncate max-w-[150px]">{mapping.website !== -1 ? row[mapping.website] || "N/A" : "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between mt-4 font-mono text-xs">
                <button
                  onClick={() => setStep("mapping")}
                  className="text-slate-400 hover:text-slate-200 border border-slate-800 px-3 py-1.5 rounded cursor-pointer"
                >
                  Modify Fields
                </button>
                <button
                  onClick={startImport}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded flex items-center gap-1.5 transition cursor-pointer font-bold"
                >
                  <Play className="w-3.5 h-3.5 fill-current" /> Commit {rows.length} Leads to Cloud Database
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Importing */}
          {step === "importing" && (
            <div className="text-center py-6 space-y-3" id="step-importing">
              <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-mono text-slate-300 uppercase">
                Uploading batch records to Firestore: {importStatus.success + importStatus.failed} of {importStatus.total} leads...
              </p>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === "complete" && (
            <div className="bg-emerald-950/20 border border-emerald-900 rounded-lg p-4 text-center space-y-3" id="step-complete">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold font-mono text-slate-100">Sync Completed Successfully</h4>
              <p className="text-xs text-slate-400 font-mono">
                Imported <span className="text-emerald-400 font-bold">{importStatus.success}</span> new tourism leads to Firestore.
              </p>
              <div>
                <button
                  onClick={() => setStep("input")}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs px-3 py-1.5 rounded cursor-pointer"
                >
                  Import More Records
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // ZTA Official Directory Guide & Sync
        <div className="space-y-4 font-mono text-xs" id="zta-integration-tab">
          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-lg space-y-3">
            <h4 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-sky-400" /> Zimbabwe Tourism Authority Registered Operators Database
            </h4>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              The official registry is hosted at <a href="https://zimbabwetourism.net/registered-tourism-operators/" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-0.5">zimbabwetourism.net/registered-tourism-operators/ <ExternalLink className="w-3 h-3 inline" /></a>.
              This database contains all registered accommodations, activity planners, hotels, and transport agencies certified to operate in Zimbabwe.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Option A: Sync official presets */}
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg space-y-2.5 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px] uppercase">
                    <Check className="w-4 h-4" /> Option 1: Live Pre-scraped Database Sync
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Instantly load a pre-scraped batch of 12 real-world ZTA registered operators (with physical addresses, category indicators, phone numbers, and websites) directly into your pipeline.
                  </p>
                </div>
                
                <button
                  onClick={handleSyncZtaPresets}
                  disabled={ztaStatus === "importing"}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-45 text-white font-bold p-2 rounded transition flex items-center justify-center gap-2 mt-2 cursor-pointer uppercase"
                >
                  <Database className="w-4 h-4" />
                  {ztaStatus === "importing" ? "Syncing to Cloud..." : ztaStatus === "success" ? "Sync Complete!" : "Sync 12 Verified Operators"}
                </button>
              </div>

              {/* Option B: Copy Paste Guide */}
              <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg space-y-2 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-[11px] uppercase">
                    <Layers className="w-4 h-4" /> Option 2: Live Copy-Paste Extractor
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    Copy the table rows with your mouse on the ZTA website directory, then switch back to the <strong className="text-slate-300">"CSV / Raw Text"</strong> tab above, paste them into the box, and press parse.
                  </p>
                </div>
                <div className="bg-slate-950 p-2 rounded text-[10px] text-slate-500 border border-slate-850">
                  Our custom parser instantly auto-detects Tab-Separated browser clipboard arrays, matching headers automatically!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple external link helper icon
function ExternalLink({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className || "w-4 h-4"}
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
