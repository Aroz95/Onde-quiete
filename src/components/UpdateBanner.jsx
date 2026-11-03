import { useEffect, useState } from "react";

// Le app aggiunte alla Home su iPhone non hanno il tasto "ricarica" e tengono a lungo
// la versione in cache. Qui scarichiamo index.html senza cache e confrontiamo
// il file JavaScript che punta con quello in uso: se è cambiato, c'è un aggiornamento.

const SCRIPT_RE = /assets\/index-[\w-]+\.js/;

function currentBundle() {
  const el = document.querySelector('script[type="module"][src*="assets/"]');
  const m = el?.getAttribute("src")?.match(SCRIPT_RE);
  return m ? m[0] : null;
}

export default function UpdateBanner() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const mine = currentBundle();
    if (!mine) return; // in sviluppo non ci sono bundle con hash

    let lastCheck = 0;
    const check = async () => {
      if (document.visibilityState !== "visible" || Date.now() - lastCheck < 60000) return;
      lastCheck = Date.now();
      try {
        const res = await fetch(`./index.html?v=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const latest = (await res.text()).match(SCRIPT_RE)?.[0];
        if (latest && latest !== mine) setAvailable(true);
      } catch {
        /* offline: riproverà più tardi */
      }
    };

    check();
    document.addEventListener("visibilitychange", check);
    const id = setInterval(check, 10 * 60000);
    return () => {
      document.removeEventListener("visibilitychange", check);
      clearInterval(id);
    };
  }, []);

  if (!available) return null;

  return (
    <div className="update" role="status">
      <span>È disponibile una nuova versione.</span>
      <button type="button" onClick={() => window.location.reload()}>Aggiorna</button>
    </div>
  );
}
