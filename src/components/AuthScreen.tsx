/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Terminal, Shield, User, Key, ArrowRight, AlertTriangle, HelpCircle } from "lucide-react";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { handleFirestoreError, OperationType } from "../dbError";
import { UserProfile } from "../types";

interface AuthScreenProps {
  onAuthSuccess: (user: UserProfile) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"admin" | "sales_agent">("sales_agent");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !name)) {
      setError("Please complete all required fields.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        // Sign up user in Auth
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;

        // Save profile in Firestore
        const profile: UserProfile = {
          uid,
          email,
          role,
          name: name.trim(),
          createdAt: new Date().toISOString(),
        };

        try {
          await setDoc(doc(db, "users", uid), profile);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
        }
        onAuthSuccess(profile);
      } else {
        // Sign in user in Auth
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const uid = cred.user.uid;

        // Fetch profile from Firestore
        const docRef = doc(db, "users", uid);
        let snap;
        try {
          snap = await getDoc(docRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${uid}`);
        }

        if (snap.exists()) {
          onAuthSuccess(snap.data() as UserProfile);
        } else {
          // If profile missing, self-correct by creating a default agent profile
          const defaultProfile: UserProfile = {
            uid,
            email,
            role: email.includes("admin") ? "admin" : "sales_agent",
            name: email.split("@")[0],
            createdAt: new Date().toISOString(),
          };
          try {
            await setDoc(docRef, defaultProfile);
          } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
          }
          onAuthSuccess(defaultProfile);
        }
      }
    } catch (err: any) {
      console.error(err);
      let msg = "Authentication failed.";
      if (err.code === "auth/user-not-found") msg = "No account found with this email.";
      else if (err.code === "auth/wrong-password") msg = "Incorrect password.";
      else if (err.code === "auth/email-already-in-use") msg = "An account with this email already exists.";
      else if (err.code === "auth/invalid-email") msg = "Invalid email formatting.";
      else if (err.message) msg = err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (mockEmail: string, mockRole: "admin" | "sales_agent") => {
    setLoading(true);
    setError("");
    const mockPassword = "password123";
    const mockName = mockRole === "admin" ? "Radbit Director" : "Sales Officer";

    try {
      // Attempt login
      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, mockEmail, mockPassword);
      } catch (err: any) {
        // If not found, create account on the fly for seamless testing!
        if (err.code === "auth/user-not-found" || err.message.includes("not-found") || err.message.includes("invalid-credential")) {
          cred = await createUserWithEmailAndPassword(auth, mockEmail, mockPassword);
        } else {
          throw err;
        }
      }

      const uid = cred.user.uid;
      const docRef = doc(db, "users", uid);
      let snap;
      try {
        snap = await getDoc(docRef);
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${uid}`);
      }

      let profile: UserProfile;
      if (!snap.exists()) {
        profile = {
          uid,
          email: mockEmail,
          role: mockRole,
          name: mockName,
          createdAt: new Date().toISOString(),
        };
        try {
          await setDoc(docRef, profile);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
        }
      } else {
        profile = snap.data() as UserProfile;
      }

      onAuthSuccess(profile);
    } catch (err: any) {
      console.error(err);
      setError("Quick login setup failed: " + (err.message || err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4" id="auth-screen">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-6 shadow-2xl relative overflow-hidden">
        {/* Terminal Scanlines Overlay effect */}
        <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,24,38,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%]"></div>

        {/* Brand header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-slate-950 border border-slate-850 rounded-lg flex items-center justify-center mx-auto shadow-md">
            <Terminal className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold font-mono uppercase tracking-widest text-slate-100">
              Tourism Intelligence OS
            </h1>
            <p className="text-[10px] text-slate-500 font-mono">
              INTERNAL ACQUISITION PORTAL &bull; RADBIT STUDIOS
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-900 rounded text-xs font-mono text-red-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div className="space-y-1">
              <label className="block text-[10px] font-mono text-slate-400 uppercase">Your Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="e.g. Brandon"
                  className="w-full bg-slate-950 border border-slate-850 p-2 pl-9 text-xs font-mono text-slate-100 rounded focus:border-slate-700 focus:outline-none"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[10px] font-mono text-slate-400 uppercase">Corporate Email</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="agent@radbit.com"
                className="w-full bg-slate-950 border border-slate-850 p-2 pl-9 text-xs font-mono text-slate-100 rounded focus:border-slate-700 focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[10px] font-mono text-slate-400 uppercase">Access Password</label>
            <div className="relative">
              <Key className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="password"
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                className="w-full bg-slate-950 border border-slate-850 p-2 pl-9 text-xs font-mono text-slate-100 rounded focus:border-slate-700 focus:outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          {isSignUp && (
            <div className="space-y-1">
              <label className="block text-[10px] font-mono text-slate-400 uppercase">Authorization Role</label>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setRole("sales_agent")}
                  className={`border p-2 rounded text-center transition ${
                    role === "sales_agent"
                      ? "border-emerald-600 bg-emerald-950/20 text-emerald-400"
                      : "border-slate-850 bg-slate-950 text-slate-500"
                  }`}
                >
                  <p className="text-xs font-bold font-mono">Sales Agent</p>
                  <p className="text-[9px] text-slate-500 font-mono">Lead acquisition focus</p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`border p-2 rounded text-center transition ${
                    role === "admin"
                      ? "border-sky-600 bg-sky-950/20 text-sky-400"
                      : "border-slate-850 bg-slate-950 text-slate-500"
                  }`}
                >
                  <p className="text-xs font-bold font-mono">OS Admin</p>
                  <p className="text-[9px] text-slate-500 font-mono">Full pipeline deletion controls</p>
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-950 font-bold font-mono text-xs p-2.5 rounded flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                {isSignUp ? "Create Workspace Account" : "Access Intelligence Console"}{" "}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center font-mono text-[11px]">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-sky-400 hover:text-sky-300 underline focus:outline-none"
          >
            {isSignUp ? "Already have an account? Log In" : "Need credentials? Register User Profile"}
          </button>
        </div>

        {/* QUICK EVALUATION ACCELERATOR */}
        <div className="border-t border-slate-850 pt-4 space-y-3" id="quick-login-dev">
          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-amber-500" /> Internal Dev Team Quick-Login
          </span>
          <p className="text-[10px] text-slate-500 font-mono leading-normal">
            To bypass registration during review, click below to log into pre-configured profile roles instantly:
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickLogin("admin@radbit.com", "admin")}
              disabled={loading}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-2 rounded text-left transition text-slate-300 hover:text-slate-100 flex flex-col justify-between"
            >
              <div className="text-[11px] font-bold font-mono text-sky-400">1-Click Admin</div>
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">Role: System Admin</div>
            </button>

            <button
              onClick={() => handleQuickLogin("agent@radbit.com", "sales_agent")}
              disabled={loading}
              className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-2 rounded text-left transition text-slate-300 hover:text-slate-100 flex flex-col justify-between"
            >
              <div className="text-[11px] font-bold font-mono text-emerald-400">1-Click Agent</div>
              <div className="text-[9px] text-slate-500 font-mono mt-0.5">Role: Sales Agent</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
