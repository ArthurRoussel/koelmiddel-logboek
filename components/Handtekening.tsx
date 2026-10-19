"use client";

import { useEffect, useRef } from "react";

// Tekenvlak voor de handtekening van de klant; geeft een PNG (data-URL) terug, of null als er niets getekend is.
export default function Handtekening({ onWijzig }: { onWijzig: (png: string | null) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, ctx = c.getContext("2d")!;
    const r = c.getBoundingClientRect();
    c.width = r.width * devicePixelRatio; c.height = r.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = getComputedStyle(document.body).color;
    let tekent = false;
    const pos = (e: PointerEvent) => { const b = c.getBoundingClientRect(); return [e.clientX - b.left, e.clientY - b.top] as const; };
    c.onpointerdown = (e) => { tekent = true; c.setPointerCapture(e.pointerId); ctx.beginPath(); ctx.moveTo(...pos(e)); };
    c.onpointermove = (e) => { if (tekent) { ctx.lineTo(...pos(e)); ctx.stroke(); } };
    c.onpointerup = () => { tekent = false; onWijzig(c.toDataURL("image/png")); };
  }, [onWijzig]);
  const wis = () => { const c = ref.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); onWijzig(null); };
  return (
    <div className="stack">
      <label>Handtekening klant<canvas className="sig" ref={ref} /></label>
      <div className="row"><button className="btn" type="button" onClick={wis}>Handtekening wissen</button></div>
    </div>
  );
}
