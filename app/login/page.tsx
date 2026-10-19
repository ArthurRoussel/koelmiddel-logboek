"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Login() {
  const router = useRouter();
  const [fout, setFout] = useState("");
  const [bezig, setBezig] = useState(false);

  async function aanmelden(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBezig(true); setFout("");
    const { error } = await supabase.auth.signInWithPassword({ email: String(f.get("email")), password: String(f.get("wachtwoord")) });
    setBezig(false);
    if (error) setFout(error.message === "Invalid login credentials" ? "E-mail of wachtwoord klopt niet." : error.message);
    else router.replace("/");
  }

  return (
    <main><div className="wrap login">
      <div className="brand" style={{ marginBottom: 24 }}>Koelmiddellogboek<small>AR Airco</small></div>
      <form className="stack" onSubmit={aanmelden}>
        <label>E-mail<input id="email" name="email" type="email" autoComplete="username" required /></label>
        <label>Wachtwoord<input id="wachtwoord" name="wachtwoord" type="password" autoComplete="current-password" required /></label>
        {fout && <div className="foutmelding">{fout}</div>}
        <button className="btn primary block" type="submit" disabled={bezig}>{bezig ? "Bezig…" : "Aanmelden"}</button>
      </form>
      <p className="sub" style={{ marginTop: 16 }}>Nog geen account? Vraag het aan Arthur.</p>
    </div></main>
  );
}
