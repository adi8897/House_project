import { useEffect, useRef, useState } from "react";
import { StoreProvider, useStore } from "./lib/store";
import { Icon } from "./components/ui";
import Overview from "./pages/Overview";
import Budget from "./pages/Budget";
import Expenses from "./pages/Expenses";
import Planned from "./pages/Planned";
import Capital from "./pages/Capital";
import Mortgage from "./pages/Mortgage";
import Goals from "./pages/Goals";
import Receipts from "./pages/Receipts";

const PAGES = [
  { id: "overview", label: "סקירה", component: Overview },
  { id: "budget", label: "תקציב", component: Budget },
  { id: "expenses", label: "הוצאות", component: Expenses },
  { id: "planned", label: "צפי", component: Planned },
  { id: "capital", label: "הון וחסכונות", component: Capital },
  { id: "mortgage", label: "משכנתא", component: Mortgage },
  { id: "goals", label: "יעדים והמלצות", component: Goals },
  { id: "receipts", label: "קבלות", component: Receipts },
] as const;

type PageId = (typeof PAGES)[number]["id"];

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark" | null>(
    () => (localStorage.getItem("bayit.theme") as "light" | "dark" | null) ?? null
  );

  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("bayit.theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [theme]);

  const prefersDark =
    typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = theme ? theme === "dark" : prefersDark;

  return { isDark, toggle: () => setTheme(isDark ? "light" : "dark") };
}

function Shell() {
  const { state, exportJson, importJson, reset } = useStore();
  const [page, setPage] = useState<PageId>(() => {
    const hash = location.hash.replace("#", "");
    return PAGES.some((p) => p.id === hash) ? (hash as PageId) : "overview";
  });
  const { isDark, toggle } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    location.hash = page;
    window.scrollTo({ top: 0 });
  }, [page]);

  useEffect(() => {
    const onHash = () => {
      const hash = location.hash.replace("#", "");
      if (PAGES.some((p) => p.id === hash)) setPage(hash as PageId);
    };
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  const Current = PAGES.find((p) => p.id === page)?.component ?? Overview;

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <span className="brand-mark">
              <Icon name="home" size={19} />
            </span>
            <span>
              הבית שלנו
              <div className="brand-sub">{state.settings.projectName}</div>
            </span>
          </div>
          <div className="topbar-spacer" />
          <button className="btn btn-ghost btn-sm" onClick={exportJson} title="גיבוי לקובץ">
            <Icon name="download" size={16} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => fileRef.current?.click()}
            title="שחזור מגיבוי"
          >
            <Icon name="upload" size={16} />
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={toggle}
            title={isDark ? "מצב בהיר" : "מצב כהה"}
            aria-label={isDark ? "מעבר למצב בהיר" : "מעבר למצב כהה"}
          >
            <Icon name={isDark ? "sun" : "moon"} size={16} />
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                await importJson(file);
              } catch {
                alert("הקובץ אינו גיבוי תקין");
              }
              e.target.value = "";
            }}
          />
        </div>
        <nav className="nav" aria-label="ניווט ראשי">
          {PAGES.map((p) => (
            <button
              key={p.id}
              className="nav-item"
              aria-current={p.id === page ? "page" : undefined}
              onClick={() => setPage(p.id)}
            >
              {p.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="main">
        <Current />
      </main>

      <footer
        style={{
          borderBlockStart: "1px solid var(--line)",
          padding: "20px",
          textAlign: "center",
        }}
      >
        <p className="hint">
          כל הנתונים נשמרים בדפדפן הזה בלבד ·{" "}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (confirm("לאפס את כל הנתונים חזרה למה שהיה בקבצים המקוריים?")) reset();
            }}
          >
            איפוס לנתוני המקור
          </button>
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
