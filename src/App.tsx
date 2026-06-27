/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Terminal, ShieldCheck, User, LogOut, Search, Plus, 
  Database, RefreshCw, Layers, LayoutList, Upload, 
  Briefcase, CheckSquare, PlusCircle, Sparkles, Check, Globe, HelpCircle, Download
} from "lucide-react";
import { auth, db } from "./firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, orderBy, doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "./dbError";
import { Lead, LeadStatus, UserProfile } from "./types";
import { demoLeads } from "./demoData";
import DashboardStats from "./components/DashboardStats";
import CsvImporter from "./components/CsvImporter";
import LeadCard from "./components/LeadCard";
import KanbanBoard from "./components/KanbanBoard";
import AuthScreen from "./components/AuthScreen";

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Layout & UI controls
  const [viewMode, setViewMode] = useState<"kanban" | "list">("list");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | "HOT" | "WARM" | "COLD">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | LeadStatus>("ALL");
  const [showImporter, setShowImporter] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Manual Lead Form State
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCategory, setNewCategory] = useState("Lodge");
  const [newLocation, setNewLocation] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [addError, setAddError] = useState("");

  // Track active lead expanded in directory
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Monitor PWA Installation availability
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // If application is already launched in standalone mode, suppress install button
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    ) {
      setShowInstallBtn(false);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`PWA Installation outcome: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBtn(false);
  };

  // 1. Monitor Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Retrieve custom user profile
        const docRef = doc(db, "users", firebaseUser.uid);
        try {
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setUser(snap.data() as UserProfile);
          } else {
            // Fallback if document not synced yet
            const tempProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              role: (firebaseUser.email || "").includes("admin") ? "admin" : "sales_agent",
              name: (firebaseUser.email || "").split("@")[0] || "User",
              createdAt: new Date().toISOString(),
            };
            setUser(tempProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setUser(null);
      }
      setLoadingUser(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Load Leads Realtime subscription
  useEffect(() => {
    if (!user) {
      setLeads([]);
      setLoadingLeads(false);
      return;
    }

    setLoadingLeads(true);
    const q = query(collection(db, "leads"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const leadList: Lead[] = [];
        snapshot.forEach((docSnap) => {
          leadList.push({ id: docSnap.id, ...docSnap.data() } as Lead);
        });
        setLeads(leadList);
        setLoadingLeads(false);
      },
      (error) => {
        console.error("Leads subscription failed:", error);
        setLoadingLeads(false);
        handleFirestoreError(error, OperationType.LIST, "leads");
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSeedDemoData = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      const batch = writeBatch(db);
      for (const item of demoLeads) {
        const id = "lead_" + doc(collection(db, "leads")).id;
        const newLead: Lead = {
          ...item,
          id,
          createdAt: new Date().toISOString(),
        };
        const docRef = doc(db, "leads", id);
        batch.set(docRef, newLead);
      }
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, "leads");
      }
    } catch (e) {
      console.error("Seeding error:", e);
    } finally {
      setSeeding(false);
    }
  };

  const handleCreateManualLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompanyName.trim()) {
      setAddError("Business name is required.");
      return;
    }

    try {
      setAddError("");
      const id = "lead_" + doc(collection(db, "leads")).id;
      let finalWebsite = newWebsite.trim();
      if (finalWebsite && !/^https?:\/\//i.test(finalWebsite)) {
        finalWebsite = "https://" + finalWebsite;
      }

      const newLead: Lead = {
        id,
        companyName: newCompanyName.trim(),
        category: newCategory.trim(),
        location: newLocation.trim() || "Zimbabwe",
        phone: newPhone.trim(),
        email: newEmail.trim(),
        website: finalWebsite,
        source: "Manual Entry",
        status: "NEW",
        notes: newNotes.trim() || "Manual lead profile created.",
        createdAt: new Date().toISOString(),
      };

      try {
        await setDoc(doc(db, "leads", id), newLead);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `leads/${id}`);
      }
      
      // Clear form & hide
      setNewCompanyName("");
      setNewCategory("Lodge");
      setNewLocation("");
      setNewPhone("");
      setNewEmail("");
      setNewWebsite("");
      setNewNotes("");
      setShowAddForm(false);
    } catch (err: any) {
      setAddError(err.message || "Failed to add lead.");
    }
  };

  // 3. Filtering & Searching Lead Collections
  const filteredLeads = leads.filter((lead) => {
    // Search match
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      lead.companyName.toLowerCase().includes(searchLower) ||
      lead.category.toLowerCase().includes(searchLower) ||
      lead.location.toLowerCase().includes(searchLower) ||
      (lead.notes || "").toLowerCase().includes(searchLower);

    // Status filter
    const matchesStatus = statusFilter === "ALL" || lead.status === statusFilter;

    // Priority filter
    let matchesPriority = true;
    if (priorityFilter !== "ALL") {
      const score = lead.sales?.priorityScore || 0;
      if (priorityFilter === "HOT") matchesPriority = score >= 80;
      else if (priorityFilter === "WARM") matchesPriority = score >= 50 && score < 80;
      else if (priorityFilter === "COLD") matchesPriority = score < 50;
    }

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleSelectLeadFromKanban = (lead: Lead) => {
    // Switch to list view and expand the lead card
    setViewMode("list");
    setSelectedLeadId(lead.id);
    
    // Auto scroll lead card into focus after state changes
    setTimeout(() => {
      const element = document.getElementById(`lead-card-${lead.id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // Force element click to open if not already open
        const cardFront = document.getElementById(`lead-card-front-${lead.id}`);
        cardFront?.click();
      }
    }, 200);
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-slate-400 font-mono text-xs">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <span>INITIALIZING OS COMPILATION...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-6">
        <AuthScreen onAuthSuccess={(profile) => setUser(profile)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950" id="app-root">
      {/* 1. Header (Dense Bloomberg style terminal bar) */}
      <header className="bg-slate-900 border-b border-slate-800 p-3 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-950 border border-slate-800 rounded flex items-center justify-center">
              <Terminal className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black font-mono tracking-widest text-slate-200">
                  TOURISM INTELLIGENCE OS
                </span>
                <span className="text-[9px] font-mono font-bold bg-slate-950 border border-slate-800 text-slate-500 px-1 py-0.2 rounded uppercase">
                  v2.4-PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono leading-none">
                Acquisition &amp; Sales Acceleration &bull; Radbit Studios
              </p>
            </div>
          </div>

          {/* User Profile Info & Sign Out */}
          <div className="flex items-center gap-3 text-xs font-mono">
            {showInstallBtn && (
              <button
                onClick={handleInstallPWA}
                className="bg-emerald-950/40 hover:bg-emerald-950/80 border border-emerald-500/30 hover:border-emerald-500/80 text-emerald-400 font-bold px-2.5 py-1 rounded flex items-center gap-1.5 transition active:scale-95 animate-pulse cursor-pointer"
                title="Install Tourism Intelligence OS to your home screen or desktop"
              >
                <Download className="w-3.5 h-3.5" />
                <span>INSTALL APP</span>
              </button>
            )}

            <div className="bg-slate-950 px-2.5 py-1 rounded border border-slate-800 flex items-center gap-1.5 text-slate-300">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>{user.name}</span>
              <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase ${
                user.role === "admin" 
                  ? "bg-sky-950/40 border-sky-900 text-sky-400" 
                  : "bg-emerald-950/40 border-emerald-900 text-emerald-400"
              }`}>
                {user.role}
              </span>
            </div>

            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-slate-200 border border-slate-800 hover:border-slate-700 bg-slate-950 rounded transition"
              title="Terminate Session"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Console Workspace with Sidebar on Desktop */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 w-full" id="workspace-layout">
        {/* Sidebar Navigation */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900 hidden lg:flex flex-col select-none flex-shrink-0" id="sidebar">
          <div className="p-5 border-b border-slate-800">
            <h1 className="text-sky-400 font-extrabold tracking-tighter text-sm flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-sky-400" />
              RADBIT <span className="text-slate-100 opacity-90 font-bold">TOURISM OS</span>
            </h1>
            <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500 mt-1">Intelligence &amp; Sales v2.4</p>
          </div>
          
          <nav className="flex-1 p-4 space-y-2 text-xs font-mono">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block px-2.5 pb-1 font-bold">Views</span>
            
            {/* Active Pipeline (Kanban) */}
            <button
              onClick={() => setViewMode("kanban")}
              className={`w-full flex items-center justify-between p-2.5 rounded border transition text-left cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-slate-800 text-white border-slate-700 shadow-sm"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${viewMode === "kanban" ? "bg-sky-400 animate-pulse" : "bg-slate-600"}`}></div>
                <span className="uppercase tracking-wider">Pipeline Kanban</span>
              </div>
            </button>

            {/* Lead Directory */}
            <button
              onClick={() => setViewMode("list")}
              className={`w-full flex items-center justify-between p-2.5 rounded border transition text-left cursor-pointer ${
                viewMode === "list"
                  ? "bg-slate-800 text-white border-slate-700 shadow-sm"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${viewMode === "list" ? "bg-sky-400 animate-pulse" : "bg-slate-600"}`}></div>
                <span className="uppercase tracking-wider">Lead Directory</span>
              </div>
              <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 font-bold border border-slate-800">
                {leads.length}
              </span>
            </button>

            <span className="text-[10px] text-slate-500 uppercase tracking-wider block px-2.5 pt-3 pb-1 font-bold">Actions</span>

            {/* CSV Import Tool */}
            <button
              onClick={() => {
                setShowImporter(!showImporter);
                setShowAddForm(false);
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded border transition text-left cursor-pointer ${
                showImporter
                  ? "bg-sky-950/40 text-sky-400 border-sky-900/60"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850"
              }`}
            >
              <span className="uppercase tracking-wider">CSV Import Tool</span>
            </button>

            {/* New Prospect */}
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setShowImporter(false);
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded border transition text-left cursor-pointer ${
                showAddForm
                  ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/60"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850"
              }`}
            >
              <span className="uppercase tracking-wider">New Prospect</span>
            </button>
          </nav>

          {/* User profile footer inside sidebar */}
          <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center font-bold text-white text-xs font-mono uppercase border border-slate-750">
                {user.name ? user.name.slice(0, 2) : "US"}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-200 font-mono truncate max-w-[140px]">{user.name}</p>
                <p className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider">SYSTEM ONLINE</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Workspace Panel */}
        <main className="flex-1 p-4 lg:p-6 space-y-6 overflow-y-auto">
          {/* Real-time Business Analytics Cards */}
          <DashboardStats leads={leads} />

        {/* 2. Controls Toolbar (Filter, search, view mode toggle, add buttons) */}
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-lg space-y-3" id="toolbar">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
            
            {/* Left controls: search & filter */}
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              {/* Search */}
              <div className="relative flex-1 max-w-sm min-w-[180px]">
                <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter name, location, keyword..."
                  className="w-full bg-slate-950 border border-slate-850 p-1.5 pl-8 text-xs font-mono text-slate-100 rounded focus:border-slate-700 focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Status Filter */}
              <select
                className="bg-slate-950 border border-slate-850 text-slate-300 text-xs font-mono py-1.5 px-2.5 rounded focus:outline-none cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="ALL">All Stages</option>
                <option value="NEW">NEW</option>
                <option value="AUDITED">AUDITED</option>
                <option value="CONTACTED">CONTACTED</option>
                <option value="REPLIED">REPLIED</option>
                <option value="CALL BOOKED">CALL BOOKED</option>
                <option value="PROPOSAL SENT">PROPOSAL SENT</option>
                <option value="WON">WON</option>
                <option value="LOST">LOST</option>
              </select>

              {/* Priority Filter */}
              <select
                className="bg-slate-950 border border-slate-850 text-slate-300 text-xs font-mono py-1.5 px-2.5 rounded focus:outline-none cursor-pointer"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as any)}
              >
                <option value="ALL">All Priorities</option>
                <option value="HOT">Hot Only (&ge;80)</option>
                <option value="WARM">Warm Only (50-79)</option>
                <option value="COLD">Cold Only (&lt;50)</option>
              </select>
            </div>

            {/* Right controls: toggles, add leads, importer, seeding */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              {/* View toggle */}
              <div className="border border-slate-800 rounded bg-slate-950 p-0.5 flex">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded transition ${
                    viewMode === "list" ? "bg-slate-850 text-sky-400 font-bold" : "text-slate-500 hover:text-slate-300"
                  }`}
                  title="List View Directory"
                >
                  <LayoutList className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("kanban")}
                  className={`p-1.5 rounded transition ${
                    viewMode === "kanban" ? "bg-slate-850 text-sky-400 font-bold" : "text-slate-500 hover:text-slate-300"
                  }`}
                  title="Kanban Pipeline Board"
                >
                  <Layers className="w-4 h-4" />
                </button>
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => {
                  setShowImporter(!showImporter);
                  setShowAddForm(false);
                }}
                className={`px-3 py-1.5 rounded border font-bold flex items-center gap-1.5 transition ${
                  showImporter
                    ? "border-sky-500 bg-sky-950/10 text-sky-400"
                    : "border-slate-800 bg-slate-950 hover:bg-slate-850 text-slate-300"
                }`}
              >
                <Upload className="w-3.5 h-3.5" /> CSV Import
              </button>

              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setShowImporter(false);
                }}
                className={`px-3 py-1.5 rounded border font-bold flex items-center gap-1.5 transition ${
                  showAddForm
                    ? "border-emerald-600 bg-emerald-950/10 text-emerald-400"
                    : "border-slate-800 bg-slate-950 hover:bg-slate-850 text-slate-300"
                }`}
              >
                <Plus className="w-3.5 h-3.5" /> New Prospect
              </button>

              {leads.length === 0 && (
                <button
                  onClick={handleSeedDemoData}
                  disabled={seeding}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold px-3 py-1.5 rounded flex items-center gap-1 shadow-md shadow-amber-950/25 transition cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  {seeding ? "Seeding..." : "Seed Demo Leads"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. CSV Importer Slide-out/Toggle Panel */}
        {showImporter && (
          <CsvImporter onImportComplete={() => setShowImporter(false)} />
        )}

        {/* 4. Manual Lead Creator Form */}
        {showAddForm && (
          <div className="bg-slate-900 border border-emerald-900 p-5 rounded-lg space-y-4 shadow-xl" id="add-lead-form">
            <h3 className="text-sm font-semibold font-mono uppercase text-emerald-400 flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4" /> Register New Tourism Prospect
            </h3>

            {addError && (
              <p className="p-2.5 bg-red-950/30 border border-red-900 rounded font-mono text-xs text-red-400">
                {addError}
              </p>
            )}

            <form onSubmit={handleCreateManualLead} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <label className="block font-mono text-slate-400 uppercase">Business Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Nyanga Highlands Chalets"
                  className="w-full bg-slate-950 border border-slate-850 p-2 text-slate-100 rounded focus:border-slate-700 focus:outline-none"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="block font-mono text-slate-400 uppercase">Category / Operator Type</label>
                <select
                  className="w-full bg-slate-950 border border-slate-850 p-2 text-slate-200 rounded focus:border-slate-700 focus:outline-none cursor-pointer"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                >
                  <option value="Lodge">Lodge &amp; Accommodation</option>
                  <option value="Luxury Safari">Luxury Safari Camp</option>
                  <option value="Hotel">Hotel &amp; Conference</option>
                  <option value="Adventure Activity">Adventure Activities / Boat Charters</option>
                  <option value="Tour Operator">Tour Guide / Transportation</option>
                  <option value="Other">Other Category</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-mono text-slate-400 uppercase">City / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Mutare, Zimbabwe"
                  className="w-full bg-slate-950 border border-slate-850 p-2 text-slate-100 rounded focus:border-slate-700 focus:outline-none"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block font-mono text-slate-400 uppercase">Website URL</label>
                <input
                  type="text"
                  placeholder="e.g. nyangachalets.co.zw"
                  className="w-full bg-slate-950 border border-slate-850 p-2 text-slate-100 rounded focus:border-slate-700 focus:outline-none"
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block font-mono text-slate-400 uppercase">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +263 77 123 456"
                  className="w-full bg-slate-950 border border-slate-850 p-2 text-slate-100 rounded focus:border-slate-700 focus:outline-none"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="block font-mono text-slate-400 uppercase">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. info@nyangachalets.co.zw"
                  className="w-full bg-slate-950 border border-slate-850 p-2 text-slate-100 rounded focus:border-slate-700 focus:outline-none"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="block font-mono text-slate-400 uppercase">Initial Prospect Notes</label>
                <textarea
                  className="w-full h-16 bg-slate-950 border border-slate-850 p-2 text-slate-100 rounded focus:border-slate-700 focus:outline-none"
                  placeholder="Summarize key contact names, initial findings or specific digital issues observed..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850 px-4 py-2 rounded font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded font-bold font-mono transition shadow-lg shadow-emerald-950/20"
                >
                  Add Lead Record
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 5. Main Content Panel: View Renderers */}
        {loadingLeads ? (
          <div className="py-20 text-center text-slate-500 font-mono text-xs">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <span>QUERYING FIRESTORE LEADS COLLECTIONS...</span>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="bg-slate-900 border border-slate-850 rounded-lg p-12 text-center space-y-4">
            <Database className="w-12 h-12 text-slate-600 mx-auto" />
            <div>
              <p className="text-slate-300 font-mono text-sm font-bold">No Leads Found</p>
              <p className="text-slate-500 font-mono text-xs mt-1">
                {leads.length === 0 
                  ? "The database is empty. Import an operator CSV list or seed sample records below:" 
                  : "No records match active search query or filter values."}
              </p>
            </div>
            {leads.length === 0 && (
              <button
                onClick={handleSeedDemoData}
                disabled={seeding}
                className="bg-amber-600 hover:bg-amber-500 disabled:opacity-45 text-white font-mono font-bold text-xs px-4 py-2 rounded shadow-md transition mx-auto cursor-pointer"
              >
                Seed 5 Zimbabwe Demo Leads
              </button>
            )}
          </div>
        ) : viewMode === "kanban" ? (
          <KanbanBoard 
            leads={filteredLeads} 
            onUpdate={() => {}} 
            userRole={user.role} 
            onSelectLead={handleSelectLeadFromKanban}
          />
        ) : (
          <div className="space-y-3" id="leads-directory-view">
            <div className="flex items-center justify-between text-slate-500 text-[10px] font-mono">
              <span>SHOWING {filteredLeads.length} OF {leads.length} LEADS IN WORKSPACE</span>
              <span>CLICK CARD TO EXPAND AND RUN AUDIT OR OUTREACH</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {filteredLeads.map((lead) => (
                <LeadCard 
                  key={lead.id} 
                  lead={lead} 
                  onUpdate={() => {}} 
                  userRole={user.role} 
                />
              ))}
            </div>
          </div>
        )}
      </main>
      </div>

      {/* Geometric Balance Diagnostic Telemetry Footer */}
      <footer className="h-10 bg-slate-900 border-t border-slate-800 flex items-center px-4 space-x-2 overflow-hidden select-none" id="app-footer">
        <div className="text-[9px] font-bold uppercase text-slate-500 w-24 px-2 font-mono">System Load</div>
        <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-sky-400" style={{ width: "24%" }}></div>
        </div>
        <div className="text-[9px] font-mono text-sky-400 px-2 flex items-center gap-4">
          <span className="hidden sm:inline">RADBIT SECURE PIPELINE</span>
          <span>CPU 24% | RAM 4.2GB | API_OK</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
            SYS_ONLINE
          </span>
        </div>
      </footer>
    </div>
  );
}
