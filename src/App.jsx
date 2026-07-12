import React, { useState, useEffect, useRef } from "react";
import {
  Coins,
  Plus,
  LogOut,
  Users,
  Receipt,
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Scale,
  Trash2,
  Camera,
  Bell,
  BellOff,
  Dices,
  Award,
  Calendar as CalendarIcon,
} from "lucide-react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { db } from "./firebase";
import { ref, onValue, set, push, remove } from "firebase/database";

const ME_KEY = "cinsteMe";
const GROUP_REF = ref(db, "cinste/group/members");
const ENTRIES_REF = ref(db, "cinsteEntries");

const AVATAR_GRADIENTS = [
  "from-amber-400 to-orange-500",
  "from-pink-400 to-rose-500",
  "from-violet-400 to-purple-500",
  "from-sky-400 to-blue-500",
  "from-emerald-400 to-teal-500",
  "from-fuchsia-400 to-pink-500",
  "from-lime-400 to-green-500",
  "from-red-400 to-orange-500",
];

const WHEEL_COLORS = ["#f59e0b", "#ec4899", "#8b5cf6", "#10b981", "#3b82f6", "#f43f5e", "#14b8a6", "#eab308"];

function colorFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function Avatar({ name, size = 10 }) {
  const initial = name?.[0]?.toUpperCase() || "?";
  return (
    <div
      className={`shrink-0 rounded-full bg-gradient-to-br ${colorFor(
        name
      )} flex items-center justify-center text-white font-bold shadow-sm`}
      style={{ width: size * 4, height: size * 4, fontSize: size * 1.4 }}
    >
      {initial}
    </div>
  );
}

function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="blob-1 absolute -top-16 -left-16 w-72 h-72 rounded-full bg-amber-300/30 blur-3xl" />
      <div className="blob-2 absolute top-1/3 -right-20 w-80 h-80 rounded-full bg-rose-300/25 blur-3xl" />
      <div className="blob-1 absolute bottom-0 left-1/4 w-64 h-64 rounded-full bg-violet-300/20 blur-3xl" />
    </div>
  );
}

function Confetti({ trigger }) {
  const colors = ["#f59e0b", "#ec4899", "#8b5cf6", "#10b981", "#3b82f6", "#f43f5e"];
  const pieces = Array.from({ length: 18 });
  if (!trigger) return null;
  return (
    <div className="fixed inset-x-0 top-24 flex justify-center pointer-events-none z-50">
      {pieces.map((_, i) => {
        const dx = (Math.random() - 0.5) * 160;
        const rot = (Math.random() - 0.5) * 360;
        return (
          <span
            key={i}
            className="confetti-piece absolute w-2 h-2 rounded-sm"
            style={{
              backgroundColor: colors[i % colors.length],
              left: `${Math.random() * 100}px`,
              "--dx": `${dx}px`,
              "--rot": `${rot}deg`,
              animationDelay: `${Math.random() * 0.15}s`,
            }}
          />
        );
      })}
    </div>
  );
}

function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });
}

function formatAmount(n) {
  if (n === null || n === undefined || isNaN(n)) return "0";
  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function fileToCompressedBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 480;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function photosOf(e) {
  if (e.photos && e.photos.length) return e.photos;
  if (e.photo) return [e.photo];
  return [];
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [660, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + i * 0.09 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.09 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.09);
      osc.stop(ctx.currentTime + i * 0.09 + 0.26);
    });
  } catch (e) {}
  if (navigator.vibrate) navigator.vibrate([25, 30, 25]);
}

function exportCSV(entries, members) {
  const rows = [["De la", "Către", "Sumă", "Tip", "Notă", "Dată"]];
  entries
    .slice()
    .sort((a, b) => (a.date || 0) - (b.date || 0))
    .forEach((e) => {
      rows.push([e.from, e.to, e.amount, e.type, e.note || "", formatDate(e.date)]);
    });
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "caietul-de-cinste.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function computeStats(members, entries) {
  const stats = {};
  members.forEach((m) => {
    stats[m] = {
      name: m,
      given: 0,
      received: 0,
      repaid: 0,
      repaidReceived: 0,
      count: 0,
      photos: 0,
      net: 0,
      foodCount: 0,
      firstCinsteToAll: false,
    };
  });
  const FOOD_WORDS = ["pizza", "shaorma", "restaurant", "terasa", "terasă", "mancare", "mâncare", "bere", "cafea", "burger", "suc"];
  entries.forEach((e) => {
    if (!stats[e.from] || !stats[e.to]) return;
    if (e.type === "cinste") {
      stats[e.from].given += e.amount;
      stats[e.to].received += e.amount;
      stats[e.from].net += e.amount;
      stats[e.to].net -= e.amount;
      if (e.splitAll) stats[e.from].firstCinsteToAll = true;
      const noteLower = (e.note || "").toLowerCase();
      if (FOOD_WORDS.some((w) => noteLower.includes(w))) stats[e.from].foodCount += 1;
    } else {
      stats[e.from].repaid += e.amount;
      stats[e.to].repaidReceived += e.amount;
      stats[e.from].net += e.amount;
      stats[e.to].net -= e.amount;
    }
    stats[e.from].count += 1;
    stats[e.from].photos += photosOf(e).length;
  });
  return Object.values(stats).map((s) => ({ ...s, net: Math.round(s.net * 100) / 100 }));
}

const BADGES = [
  {
    key: "biggestDebtor",
    title: "👑 Datorul Suprem",
    desc: "cel mai mare restanțier al grupului",
    pick: (stats) => stats.slice().sort((a, b) => a.net - b.net)[0],
    show: (s) => s.net < 0,
    metric: (s) => `datorează ${Math.abs(s.net)} lei net`,
    color: "from-red-400 to-rose-500",
  },
  {
    key: "biggestSponsor",
    title: "💸 Sponsorul Grupului",
    desc: "cel mai generos, i se datorează cel mai mult",
    pick: (stats) => stats.slice().sort((a, b) => b.net - a.net)[0],
    show: (s) => s.net > 0,
    metric: (s) => `i se cuvin ${formatAmount(s.net)} lei net`,
    color: "from-emerald-400 to-teal-500",
  },
  {
    key: "ghost",
    title: "👻 Fantoma Grupului",
    desc: "nu prea dă, dar nici nu prea primește",
    pick: (stats) =>
      stats
        .filter((s) => s.count > 0)
        .slice()
        .sort((a, b) => a.given + a.received - (b.given + b.received))[0],
    show: (s) => s.count > 0,
    metric: (s) => `doar ${formatAmount(s.given + s.received)} lei mișcați în total`,
    color: "from-gray-400 to-slate-500",
  },
  {
    key: "mostActive",
    title: "⚡ Cel Mai Activ",
    desc: "cele mai multe cinste înregistrate",
    pick: (stats) => stats.slice().sort((a, b) => b.count - a.count)[0],
    show: (s) => s.count > 0,
    metric: (s) => `${s.count} tranzacții`,
    color: "from-violet-400 to-purple-500",
  },
  {
    key: "biggestGiver",
    title: "🎩 Domnul Cinste",
    desc: "a plătit cel mai mult în total pentru alții",
    pick: (stats) => stats.slice().sort((a, b) => b.given - a.given)[0],
    show: (s) => s.given > 0,
    metric: (s) => `${formatAmount(s.given)} lei cinste date`,
    color: "from-amber-400 to-orange-500",
  },
  {
    key: "repaymentKing",
    title: "🤝 Regele Rambursărilor",
    desc: "cel mai responsabil, își achită mereu datoriile",
    pick: (stats) => stats.slice().sort((a, b) => b.repaid - a.repaid)[0],
    show: (s) => s.repaid > 0,
    metric: (s) => `${formatAmount(s.repaid)} lei rambursați`,
    color: "from-blue-400 to-indigo-500",
  },
  {
    key: "stingy",
    title: "🪙 Zgârcitul Simpatic",
    desc: "primește cinste dar încă n-a dat niciuna",
    pick: (stats) =>
      stats
        .filter((s) => s.given === 0 && s.received > 0)
        .sort((a, b) => b.received - a.received)[0],
    show: () => true,
    metric: (s) => `a primit ${formatAmount(s.received)} lei, a dat 0`,
    color: "from-yellow-400 to-amber-500",
  },
  {
    key: "photographer",
    title: "📸 Fotograful Oficial",
    desc: "cele mai multe poze atașate",
    pick: (stats) => stats.slice().sort((a, b) => b.photos - a.photos)[0],
    show: (s) => s.photos > 0,
    metric: (s) => `${s.photos} poze`,
    color: "from-sky-400 to-blue-500",
  },
];

function monthEntries(entries) {
  const now = new Date();
  return entries.filter((e) => {
    if (!e.date) return false;
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
}

const MONTHLY_AWARDS = [
  {
    key: "regeleCinstei",
    title: "🏆 Regele Cinstei",
    desc: "a plătit cel mai mult luna asta",
    pick: (stats) => stats.slice().sort((a, b) => b.given - a.given)[0],
    show: (s) => s.given > 0,
    metric: (s) => `${formatAmount(s.given)} lei cheltuiți`,
    color: "from-amber-400 to-yellow-500",
  },
  {
    key: "economul",
    title: "💰 Economul",
    desc: "a cheltuit cel mai puțin luna asta",
    pick: (stats) =>
      stats
        .filter((s) => s.count > 0)
        .slice()
        .sort((a, b) => a.given - b.given)[0],
    show: (s) => s.count > 0,
    metric: (s) => `doar ${formatAmount(s.given)} lei cheltuiți`,
    color: "from-emerald-400 to-green-500",
  },
  {
    key: "chefMaster",
    title: "🍕 Chef Master",
    desc: "cele mai multe cheltuieli la mâncare",
    pick: (stats) => stats.slice().sort((a, b) => b.foodCount - a.foodCount)[0],
    show: (s) => s.foodCount > 0,
    metric: (s) => `${s.foodCount} cheltuieli cu mâncare`,
    color: "from-orange-400 to-red-500",
  },
  {
    key: "speedPayer",
    title: "⚡ Speed Payer",
    desc: "și-a achitat cele mai multe datorii luna asta",
    pick: (stats) => stats.slice().sort((a, b) => b.repaid - a.repaid)[0],
    show: (s) => s.repaid > 0,
    metric: (s) => `${formatAmount(s.repaid)} lei rambursați`,
    color: "from-blue-400 to-cyan-500",
  },
  {
    key: "restantierul",
    title: "😅 Restanțierul",
    desc: "are cele mai multe datorii neachitate luna asta",
    pick: (stats) => stats.slice().sort((a, b) => a.net - b.net)[0],
    show: (s) => s.net < 0,
    metric: (s) => `${Math.abs(s.net)} lei neachitați`,
    color: "from-red-400 to-pink-500",
  },
];

const ACHIEVEMENTS = [
  { key: "first", label: "Prima Cinste", icon: "🎉", check: (s) => s.count > 0 },
  { key: "hundred", label: "100+ lei cheltuiți", icon: "💯", check: (s) => s.given >= 100 },
  { key: "fivehundred", label: "500+ lei cheltuiți", icon: "🤑", check: (s) => s.given >= 500 },
  { key: "generous", label: "Cinste la toată gașca", icon: "🎊", check: (s) => s.firstCinsteToAll },
  { key: "photo", label: "Prima poză atașată", icon: "📷", check: (s) => s.photos > 0 },
  { key: "settled", label: "Cont la zi", icon: "✅", check: (s) => s.net === 0 && s.count > 0 },
  { key: "responsible", label: "Prima rambursare", icon: "🤝", check: (s) => s.repaid > 0 },
  { key: "chef", label: "Gurmandul", icon: "🍕", check: (s) => s.foodCount >= 3 },
];

export default function App() {
  const [members, setMembers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [connected, setConnected] = useState(false);
  const [me, setMeState] = useState(() => loadLS(ME_KEY, null));
  const [newMemberName, setNewMemberName] = useState("");
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeleteEntry, setConfirmDeleteEntry] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [err, setErr] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [confetti, setConfetti] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showWheel, setShowWheel] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [statsPeriod, setStatsPeriod] = useState("month");
  const [editingEntry, setEditingEntry] = useState(null);
  const [notifOn, setNotifOn] = useState(false);

  const [form, setForm] = useState({ amount: "", targets: [], note: "", type: "cinste", photos: [], includeMe: false });

  const prevEntryIdsRef = useRef(null);

  useEffect(() => {
    if (!err) return;
    const t = setTimeout(() => setErr(""), 4500);
    return () => clearTimeout(t);
  }, [err]);

  useEffect(() => {
    const unsub = onValue(
      GROUP_REF,
      (snap) => {
        setConnected(true);
        const val = snap.val();
        setMembers(val && val.length ? val : []);
      },
      (e) => {
        setConnected(false);
        setErr("Eroare conexiune: " + e.message);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(
      ENTRIES_REF,
      (snap) => {
        const val = snap.val() || {};
        const list = Object.entries(val).map(([id, e]) => ({ id, ...e }));
        list.sort((a, b) => (b.date || 0) - (a.date || 0));
        setEntries(list);
      },
      (e) => {
        setErr("Eroare la citirea cinstelor: " + e.message);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!me) return;
    setNotifOn(loadLS(`cinsteNotif:${me}`, false));
  }, [me]);

  useEffect(() => {
    if (!me) return;
    const currentIds = new Set(entries.map((e) => e.id));
    if (prevEntryIdsRef.current) {
      entries.forEach((e) => {
        if (
          e.to === me &&
          e.from !== me &&
          !prevEntryIdsRef.current.has(e.id) &&
          notifOn &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification("Cinste nouă! 🎉", {
              body: `${e.from} ți-a făcut cinste de ${e.amount} lei`,
            });
          } catch (err) {}
        }
      });
    }
    prevEntryIdsRef.current = currentIds;
  }, [entries, me, notifOn]);

  function setMe(name) {
    setMeState(name);
    try {
      localStorage.setItem(ME_KEY, JSON.stringify(name));
    } catch (e) {}
  }

  function toggleNotif() {
    if (!me) return;
    const next = !notifOn;
    if (next && typeof Notification !== "undefined" && Notification.permission !== "granted") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          setNotifOn(true);
          try {
            localStorage.setItem(`cinsteNotif:${me}`, JSON.stringify(true));
          } catch (e) {}
        }
      });
    } else {
      setNotifOn(next);
      try {
        localStorage.setItem(`cinsteNotif:${me}`, JSON.stringify(next));
      } catch (e) {}
    }
  }

  async function persistMembers(next) {
    setMembers(next);
    try {
      await set(GROUP_REF, next);
    } catch (e) {
      setErr("Nu am putut salva grupul: " + e.message);
    }
  }

  function addMember() {
    const n = newMemberName.trim();
    if (!n) return;
    if (members.includes(n)) {
      setErr("Numele există deja.");
      return;
    }
    persistMembers([...members, n]);
    setNewMemberName("");
    setErr("");
  }

  function deleteMember(name) {
    persistMembers(members.filter((m) => m !== name));
    if (me === name) setMe(null);
    setConfirmDelete(null);
  }

  async function submitEntry() {
    const amt = parseFloat(form.amount);
    if (!amt || amt <= 0) {
      setErr("Introdu o sumă validă.");
      return;
    }
    const others = members.filter((m) => m !== me);
    const chosen = form.targets.length > 0 ? form.targets : others;
    if (chosen.length === 0) {
      setErr("Alege cel puțin o persoană.");
      return;
    }
    const isSplit = chosen.length > 1 && form.type === "cinste";
    const divisor = form.type === "cinste" && form.includeMe ? chosen.length + 1 : chosen.length;
    const share = isSplit || form.includeMe ? Math.round((amt / divisor) * 100) / 100 : amt;

    setSaveStatus("saving");
    try {
      await Promise.all(
        chosen.map((target) => {
          const payload = {
            from: me,
            to: target,
            amount: share,
            totalAmount: amt,
            splitAll: isSplit || form.includeMe,
            splitCount: divisor,
            note: form.note.trim(),
            type: form.type,
            date: Date.now(),
          };
          if (form.photos.length) payload.photos = form.photos;
          return push(ENTRIES_REF, payload);
        })
      );
      setSaveStatus("saved");
      setConfetti(true);
      playChime();
      setTimeout(() => setSaveStatus(""), 1200);
      setTimeout(() => setConfetti(false), 1000);
      setForm({ amount: "", targets: [], note: "", type: "cinste", photos: [], includeMe: false });
      setShowAddEntry(false);
      setErr("");
    } catch (e) {
      setSaveStatus("error");
      setErr("Nu am putut salva: " + e.message);
    }
  }

  async function deleteEntry(id) {
    try {
      await remove(ref(db, "cinsteEntries/" + id));
      setConfirmDeleteEntry(null);
    } catch (e) {
      setErr("Nu am putut șterge: " + e.message);
    }
  }

  async function editEntryAmount(id, newAmount) {
    try {
      await set(ref(db, "cinsteEntries/" + id + "/amount"), newAmount);
      setEditingEntry(null);
    } catch (e) {
      setErr("Nu am putut edita: " + e.message);
    }
  }

  async function settleWithMember(otherName, netFromMyPerspective) {
    if (netFromMyPerspective === 0) return;
    const amount = Math.abs(netFromMyPerspective);
    const from = netFromMyPerspective < 0 ? me : otherName;
    const to = netFromMyPerspective < 0 ? otherName : me;
    try {
      await push(ENTRIES_REF, {
        from,
        to,
        amount,
        totalAmount: amount,
        splitAll: false,
        splitCount: 1,
        note: "achitat definitiv",
        type: "rambursare",
        date: Date.now(),
      });
    } catch (e) {
      setErr("Nu am putut marca achitat: " + e.message);
    }
  }

  async function recordWheelResult(loser, participants) {
    // Roata e doar pentru distracție — nu scriem nimic în istoricul financiar.
  }

  if (!me) {
    return (
      <>
        <BackgroundBlobs />
        <SpeedInsights />
        <LoginScreen
          members={members}
          onPick={setMe}
          newMemberName={newMemberName}
          setNewMemberName={setNewMemberName}
          addMember={addMember}
          err={err}
          clearErr={() => setErr("")}
          connected={connected}
          confirmDelete={confirmDelete}
          setConfirmDelete={setConfirmDelete}
          deleteMember={deleteMember}
        />
      </>
    );
  }

  const others = members.filter((m) => m !== me);
  const balances = others.map((other) => {
    const theyOweMe = entries
      .filter((e) => e.from === me && e.to === other)
      .reduce((s, e) => s + e.amount, 0);
    const iOweThem = entries
      .filter((e) => e.from === other && e.to === me)
      .reduce((s, e) => s + e.amount, 0);
    return { name: other, net: Math.round((theyOweMe - iOweThem) * 100) / 100 };
  });

  if (viewingMember) {
    const withThem = entries.filter(
      (e) => (e.from === me && e.to === viewingMember) || (e.from === viewingMember && e.to === me)
    );
    const bal = balances.find((b) => b.name === viewingMember)?.net ?? 0;
    return (
      <>
        <BackgroundBlobs />
        <SpeedInsights />
        <div className="min-h-screen text-gray-900 font-sans pb-24 animate-slideinright">
          <div className="border-b border-gray-200/70 px-5 pt-6 pb-5 sticky top-0 bg-white/80 backdrop-blur-md z-10">
            <button
              onClick={() => setViewingMember(null)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-3 transition-colors"
            >
              <ArrowLeft size={16} /> Înapoi
            </button>
            <div className="flex items-center gap-3">
              <Avatar name={viewingMember} size={12} />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{viewingMember}</h1>
                <p
                  className={`text-sm font-semibold ${
                    bal === 0 ? "text-gray-400" : bal > 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {bal === 0 ? "achitat ✓" : bal > 0 ? `îți datorează ${formatAmount(bal)} lei` : `îi datorezi ${formatAmount(Math.abs(bal))} lei`}
                </p>
              </div>
            </div>
            {bal !== 0 && (
              <button
                onClick={() => settleWithMember(viewingMember, bal)}
                className="mt-3 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-300 rounded-full px-3 py-1.5 hover:bg-amber-100 transition-colors active:scale-95"
              >
                ✓ Marchează ca achitat definitiv
              </button>
            )}
          </div>
          <div className="px-5 mt-5 space-y-2">
            {withThem.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nicio tranzacție încă.</p>
            ) : (
              withThem.map((e, i) => (
                <EntryCard
                  key={e.id}
                  e={e}
                  me={me}
                  onPhoto={setLightbox}
                  deleteEntry={e.from === me ? deleteEntry : null}
                  onEdit={e.from === me ? () => setEditingEntry(e) : null}
                  confirmDeleteEntry={confirmDeleteEntry}
                  setConfirmDeleteEntry={setConfirmDeleteEntry}
                  delay={i * 40}
                />
              ))
            )}
          </div>
        </div>
        {lightbox && <Lightbox photos={lightbox} onClose={() => setLightbox(null)} />}
        {editingEntry && (
          <EditAmountModal
            entry={editingEntry}
            onSave={(amt) => editEntryAmount(editingEntry.id, amt)}
            onClose={() => setEditingEntry(null)}
          />
        )}
      </>
    );
  }

  const received = entries.filter((e) => e.to === me);
  const given = entries.filter((e) => e.from === me);
  const receivedThisMonth = monthEntries(received);
  const givenThisMonth = monthEntries(given);
  const totalReceivedMonth = receivedThisMonth.reduce((s, e) => s + e.amount, 0);
  const totalGivenMonth = givenThisMonth.reduce((s, e) => s + e.amount, 0);
  const totalReceivedAllTime = received.reduce((s, e) => s + e.amount, 0);
  const totalGivenAllTime = given.reduce((s, e) => s + e.amount, 0);
  const totalReceived = statsPeriod === "month" ? totalReceivedMonth : totalReceivedAllTime;
  const totalGiven = statsPeriod === "month" ? totalGivenMonth : totalGivenAllTime;
  const monthLabel = RO_MONTHS[new Date().getMonth()];
  const myStats = computeStats(members, entries).find((s) => s.name === me);

  return (
    <>
      <BackgroundBlobs />
      <Confetti trigger={confetti} />
      <SpeedInsights />
      <div className="min-h-screen text-gray-900 font-sans pb-24 animate-fadein">
        <div className="border-b border-gray-200/70 px-5 pt-6 pb-5 sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={me} size={12} />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500 flex items-center gap-1.5">
                  Caietul de cinste
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      connected ? "bg-green-500" : "bg-red-500"
                    } transition-colors`}
                  />
                </p>
                <h1 className="text-2xl font-bold text-gray-900 mt-0.5">Salut, {me}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saveStatus === "saving" && <span className="text-[11px] text-gray-500">se salvează…</span>}
              {saveStatus === "saved" && (
                <span className="text-[11px] text-green-600 flex items-center gap-1 animate-popin">
                  <Check size={12} /> salvat
                </span>
              )}
              {saveStatus === "error" && <span className="text-[11px] text-red-600">eroare</span>}
              <button
                onClick={toggleNotif}
                title="Notificări doar pe acest device, cât timp ai aplicația deschisă sau în fundal (nu și cu telefonul complet închis/oprit)"
                className={`p-2 rounded-full border transition-colors active:scale-90 ${
                  notifOn ? "border-amber-400 text-amber-600 bg-amber-50" : "border-gray-300 text-gray-400"
                }`}
              >
                {notifOn ? <Bell size={15} /> : <BellOff size={15} />}
              </button>
              <button
                onClick={() => setMe(null)}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-full border border-gray-300 active:scale-95"
              >
                <LogOut size={14} /> Ieși
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-2xl border border-gray-200/70 bg-white/70 backdrop-blur-sm shadow-sm px-4 py-3 hover:shadow-md transition-shadow">
              <p className="text-[11px] uppercase tracking-wider text-gray-500">
                Ai primit {statsPeriod === "month" ? `· ${monthLabel}` : "· mereu"}
              </p>
              <p className="text-2xl font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent mt-1">
                {formatAmount(totalReceived)} lei
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200/70 bg-white/70 backdrop-blur-sm shadow-sm px-4 py-3 hover:shadow-md transition-shadow">
              <p className="text-[11px] uppercase tracking-wider text-gray-500">
                Ai dat {statsPeriod === "month" ? `· ${monthLabel}` : "· mereu"}
              </p>
              <p className="text-2xl font-extrabold text-gray-700 mt-1">{formatAmount(totalGiven)} lei</p>
            </div>
          </div>
          <button
            onClick={() => setStatsPeriod((p) => (p === "month" ? "allTime" : "month"))}
            className="text-[11px] text-amber-600 mt-2 underline decoration-dotted active:scale-95 transition-transform"
          >
            {statsPeriod === "month" ? "vezi totalul din tot timpul" : `înapoi la luna ${monthLabel.toLowerCase()}`}
          </button>

          {myStats && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {ACHIEVEMENTS.filter((a) => a.check(myStats)).map((a) => (
                <span
                  key={a.key}
                  title={a.label}
                  className="text-xs bg-white/70 border border-gray-200 rounded-full px-2 py-1 flex items-center gap-1"
                >
                  {a.icon} {a.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {err && (
          <div className="fixed top-4 inset-x-4 z-50 text-sm text-red-700 bg-white shadow-lg border border-red-200 rounded-xl px-4 py-3 animate-slideup">
            {err}
          </div>
        )}

        {others.length === 0 ? (
          <div className="mx-5 mt-6 text-sm text-gray-500 bg-amber-50/80 border border-amber-200 rounded-2xl px-4 py-3">
            Adaugă și restul persoanelor din grup mai jos, ca să poți începe să adaugi cinste.
          </div>
        ) : (
          <div className="px-5 mt-7">
            <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider mb-3">
              <Scale size={14} /> Cine cui datorează
            </div>
            <div className="space-y-2">
              {balances.map((b, i) => (
                <button
                  key={b.name}
                  onClick={() => setViewingMember(b.name)}
                  style={{ animationDelay: `${i * 50}ms` }}
                  className="w-full animate-fadein text-left rounded-2xl border border-gray-200/70 bg-white/70 backdrop-blur-sm shadow-sm px-4 py-3 flex items-center justify-between hover:border-amber-400 hover:shadow-md active:scale-[0.99] transition-all"
                >
                  <span className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Avatar name={b.name} size={7} />
                    {b.name}
                  </span>
                  {b.net === 0 ? (
                    <span className="text-sm text-gray-400">achitat ✓</span>
                  ) : b.net > 0 ? (
                    <span className="text-sm font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                      îți datorează {formatAmount(b.net)} lei
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                      îi datorezi {formatAmount(Math.abs(b.net))} lei
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <Section
          title="Cinste primită"
          icon={<Coins size={16} />}
          empty="Nimeni nu ți-a făcut cinste încă."
          items={received}
          deleteEntry={null}
          onPhoto={setLightbox}
        />

        <Section
          title="Cinste dată"
          icon={<Receipt size={16} />}
          empty="Nu ai făcut cinste nimănui încă."
          items={given}
          deleteEntry={deleteEntry}
          onEdit={setEditingEntry}
          onPhoto={setLightbox}
          confirmDeleteEntry={confirmDeleteEntry}
          setConfirmDeleteEntry={setConfirmDeleteEntry}
          givenView
        />

        <div className="px-5 mt-8">
          <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider mb-3">
            <Users size={14} /> Grup ({members.length})
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {members.map((m) => (
              <span
                key={m}
                className={`text-sm pl-1.5 pr-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-colors ${
                  m === me ? "border-amber-500 text-amber-700 bg-amber-50" : "border-gray-300 text-gray-600 bg-white/60"
                }`}
              >
                <Avatar name={m} size={5} />
                {m}
              </span>
            ))}
          </div>
          <AddMemberInline value={newMemberName} setValue={setNewMemberName} onAdd={addMember} />
        </div>

        <div className="px-5 mt-6 grid grid-cols-4 gap-2">
          <button
            onClick={() => setShowStats(true)}
            className="flex flex-col items-center justify-center gap-1 text-xs font-medium text-violet-700 bg-violet-50 border border-violet-200 rounded-xl py-3 hover:bg-violet-100 transition-colors active:scale-95"
          >
            <Award size={16} /> Clasament
          </button>
          <button
            onClick={() => setShowWheel(true)}
            className="flex flex-col items-center justify-center gap-1 text-xs font-medium text-pink-700 bg-pink-50 border border-pink-200 rounded-xl py-3 hover:bg-pink-100 transition-colors active:scale-95"
          >
            <Dices size={16} /> Roata
          </button>
          <button
            onClick={() => setShowCalendar(true)}
            className="flex flex-col items-center justify-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-xl py-3 hover:bg-blue-100 transition-colors active:scale-95"
          >
            <CalendarIcon size={16} /> Calendar
          </button>
          <button
            onClick={() => exportCSV(entries, members)}
            className="flex flex-col items-center justify-center gap-1 text-xs font-medium text-gray-600 bg-white/70 border border-gray-200 rounded-xl py-3 hover:bg-gray-50 transition-colors active:scale-95"
          >
            ⬇️ Export
          </button>
        </div>

        <button
          onClick={() => setShowAddEntry(true)}
          className="pulse-ring fixed bottom-6 right-6 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg shadow-amber-500/40 active:scale-90 transition-transform"
          aria-label="Adaugă cinste"
        >
          <Plus size={26} />
        </button>

        {showAddEntry && (
          <AddEntryModal
            me={me}
            members={members}
            form={form}
            setForm={setForm}
            onSubmit={submitEntry}
            onClose={() => {
              setShowAddEntry(false);
              setErr("");
            }}
          />
        )}

        {lightbox && <Lightbox photos={lightbox} onClose={() => setLightbox(null)} />}
        {editingEntry && (
          <EditAmountModal
            entry={editingEntry}
            onSave={(amt) => editEntryAmount(editingEntry.id, amt)}
            onClose={() => setEditingEntry(null)}
          />
        )}
        {showStats && <StatsScreen members={members} entries={entries} onClose={() => setShowStats(false)} />}
        {showWheel && (
          <WheelModal
            members={members}
            onClose={() => setShowWheel(false)}
            onResult={recordWheelResult}
            playChime={playChime}
          />
        )}
        {showCalendar && (
          <CalendarModal entries={entries} onClose={() => setShowCalendar(false)} onPhoto={setLightbox} />
        )}
      </div>
    </>
  );
}

function AddMemberInline({ value, setValue, onAdd }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-gray-500 hover:text-amber-600 transition-colors flex items-center gap-1.5"
      >
        <Plus size={14} /> Adaugă o persoană
      </button>
    );
  }
  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white/80 backdrop-blur-sm shadow-sm p-3 flex gap-2 animate-slideup">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onAdd()}
        placeholder="Nume"
        className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
      />
      <button
        onClick={onAdd}
        className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-sm font-medium rounded-xl px-4 active:scale-95 transition-transform"
      >
        Adaugă
      </button>
      <button onClick={() => setOpen(false)} className="text-sm text-gray-400 px-2">
        <X size={18} />
      </button>
    </div>
  );
}

function EntryCard({ e, me, deleteEntry, onPhoto, onEdit, confirmDeleteEntry, setConfirmDeleteEntry, delay = 0 }) {
  const isReceived = e.to === me;
  const other = isReceived ? e.from : e.to;
  const photos = photosOf(e);
  const pendingDelete = confirmDeleteEntry === e.id;

  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="animate-fadein rounded-2xl border border-gray-200/70 bg-white/70 backdrop-blur-sm shadow-sm px-4 py-3 flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3 min-w-0">
        {photos.length > 0 ? (
          <div className="relative shrink-0">
            <img
              src={photos[0]}
              onClick={() => onPhoto(photos)}
              className="w-12 h-12 rounded-xl object-cover cursor-pointer active:scale-95 transition-transform"
              alt=""
            />
            {photos.length > 1 && (
              <span className="absolute -bottom-1 -right-1 bg-gray-900 text-white text-[10px] rounded-full w-5 h-5 flex items-center justify-center">
                +{photos.length - 1}
              </span>
            )}
          </div>
        ) : (
          <Avatar name={other} size={10} />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5 flex-wrap">
            {e.type === "rambursare" && (
              <span className="text-[10px] uppercase tracking-wide bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                rambursare
              </span>
            )}
            {isReceived ? (
              <>
                <span>{e.from}</span>
                <ArrowRight size={12} className="text-gray-400" />
                <span>ție</span>
              </>
            ) : (
              <>
                <span>lui {e.to}</span>
                <ArrowRight size={12} className="text-gray-400" />
              </>
            )}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatDate(e.date)}
            {e.splitAll ? ` · din ${formatAmount(e.totalAmount)} lei împărțit la ${e.splitCount}` : ""}
            {e.note ? ` · ${e.note}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {pendingDelete ? (
          <div className="flex items-center gap-1.5 animate-popin">
            <span className="text-xs text-gray-500">Sigur?</span>
            <button
              onClick={() => deleteEntry(e.id)}
              className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg font-medium"
            >
              Da
            </button>
            <button
              onClick={() => setConfirmDeleteEntry(null)}
              className="text-xs text-gray-400 px-2 py-1"
            >
              Nu
            </button>
          </div>
        ) : (
          <>
            <span
              onClick={onEdit ? onEdit : undefined}
              className={`text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent ${
                onEdit ? "cursor-pointer" : ""
              }`}
            >
              {formatAmount(e.amount)} lei
            </span>
            {deleteEntry && (
              <button
                onClick={() => setConfirmDeleteEntry(e.id)}
                className="text-gray-400 hover:text-red-600 transition-colors"
                aria-label="Șterge"
              >
                <X size={16} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, empty, items, deleteEntry, givenView, onPhoto, onEdit, confirmDeleteEntry, setConfirmDeleteEntry }) {
  return (
    <div className="px-5 mt-7">
      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase tracking-wider mb-3">
        {icon} {title}
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400 italic">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((e, i) => (
            <EntryCard
              key={e.id}
              e={e}
              me={givenView ? e.from : e.to}
              deleteEntry={deleteEntry}
              onEdit={onEdit ? () => onEdit(e) : null}
              onPhoto={onPhoto}
              confirmDeleteEntry={confirmDeleteEntry}
              setConfirmDeleteEntry={setConfirmDeleteEntry}
              delay={i * 40}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Lightbox({ photos, onClose }) {
  const [idx, setIdx] = useState(0);
  const list = Array.isArray(photos) ? photos : [photos];
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-30 p-6 animate-fadein">
      <img src={list[idx]} className="max-w-full max-h-full rounded-2xl animate-popin" alt="" />
      {list.length > 1 && (
        <>
          <button
            onClick={(ev) => {
              ev.stopPropagation();
              setIdx((idx - 1 + list.length) % list.length);
            }}
            className="absolute left-4 text-white bg-white/10 rounded-full p-2"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={(ev) => {
              ev.stopPropagation();
              setIdx((idx + 1) % list.length);
            }}
            className="absolute right-16 text-white bg-white/10 rounded-full p-2"
          >
            <ArrowRight size={20} />
          </button>
          <div className="absolute bottom-6 text-white text-xs">
            {idx + 1} / {list.length}
          </div>
        </>
      )}
      <button onClick={onClose} className="absolute top-6 right-6 text-white">
        <X size={28} />
      </button>
    </div>
  );
}

function LoginScreen({
  members,
  onPick,
  newMemberName,
  setNewMemberName,
  addMember,
  err,
  clearErr,
  connected,
  confirmDelete,
  setConfirmDelete,
  deleteMember,
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen text-gray-900 font-sans flex flex-col items-center justify-center px-6 animate-fadein">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/40 mb-4 animate-popin">
        <Coins size={30} className="text-white" />
      </div>
      <h1 className="text-3xl font-extrabold text-gray-900">Caietul de cinste</h1>
      <p className="text-gray-500 text-sm mt-2 text-center max-w-xs">
        {members.length === 0 ? "Grupul e gol — adaugă primul nume ca să începeți." : "Cine ești tu din grup?"}
      </p>
      <p className="text-[11px] mt-1 flex items-center gap-1">
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
        <span className="text-gray-400">{connected ? "sincronizat live" : "se conectează…"}</span>
      </p>

      {members.length > 0 && (
        <div className="mt-8 w-full max-w-xs space-y-2">
          {members.map((m, i) => (
            <div key={m} style={{ animationDelay: `${i * 60}ms` }} className="flex items-center gap-2 animate-fadein">
              <button
                onClick={() => onPick(m)}
                className="flex-1 text-left px-4 py-3 rounded-2xl border border-gray-300 bg-white/70 backdrop-blur-sm hover:border-amber-500 hover:bg-amber-50 hover:shadow-md transition-all flex items-center gap-3 active:scale-[0.99]"
              >
                <Avatar name={m} size={8} />
                <span className="font-medium flex-1">{m}</span>
                <ArrowRight size={16} className="text-gray-400" />
              </button>
              {confirmDelete === m ? (
                <div className="flex gap-1 animate-popin">
                  <button onClick={() => deleteMember(m)} className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg">
                    Șterge
                  </button>
                  <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-400 px-2 py-1">
                    Nu
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(m)}
                  className="text-gray-300 hover:text-red-500 transition-colors p-2"
                  aria-label={`Șterge ${m}`}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 w-full max-w-xs">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="w-full text-sm text-gray-500 hover:text-amber-600 transition-colors flex items-center justify-center gap-1.5 py-2"
          >
            <Plus size={14} /> Adaugă o persoană
          </button>
        ) : (
          <div className="rounded-2xl border border-gray-200/70 bg-white/80 backdrop-blur-sm shadow-sm p-4 animate-slideup">
            <input
              autoFocus
              value={newMemberName}
              onChange={(ev) => setNewMemberName(ev.target.value)}
              onKeyDown={(ev) => ev.key === "Enter" && addMember()}
              placeholder="Numele tău"
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500"
            />
            {err && <p className="text-xs text-red-600 mt-2">{err}</p>}
            <div className="flex gap-2 mt-3">
              <button
                onClick={addMember}
                className="flex-1 bg-gradient-to-br from-amber-400 to-orange-500 text-white text-sm font-medium rounded-xl py-2 active:scale-95 transition-transform"
              >
                Adaugă
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  clearErr();
                }}
                className="px-4 text-sm text-gray-500 rounded-xl border border-gray-300"
              >
                Renunță
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AddEntryModal({ me, members, form, setForm, onSubmit, onClose }) {
  const others = members.filter((m) => m !== me);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  function toggleTarget(name) {
    setForm((f) => {
      const has = f.targets.includes(name);
      return { ...f, targets: has ? f.targets.filter((t) => t !== name) : [...f.targets, name] };
    });
  }

  async function handlePhotos(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const compressed = await Promise.all(files.map(fileToCompressedBase64));
      setForm((f) => ({ ...f, photos: [...f.photos, ...compressed] }));
    } catch (err) {}
    setUploading(false);
    e.target.value = "";
  }

  function removePhoto(idx) {
    setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));
  }

  const chosenCount = form.targets.length > 0 ? form.targets.length : others.length;
  const divisorPreview = form.type === "cinste" && form.includeMe ? chosenCount + 1 : chosenCount;
  const share = form.amount ? formatAmount(parseFloat(form.amount) / divisorPreview) : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-20 px-0 sm:px-4 animate-fadein">
      <div className="bg-white border border-gray-200 rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-5 pb-7 max-h-[90vh] overflow-y-auto animate-slideup shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Adaugă</h2>
          <button onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setForm({ ...form, type: "cinste" })}
            className={`flex-1 py-2 rounded-xl text-sm border transition-all ${
              form.type === "cinste" ? "border-amber-500 text-amber-700 bg-amber-50 shadow-sm" : "border-gray-300 text-gray-600"
            }`}
          >
            Fac cinste
          </button>
          <button
            onClick={() => setForm({ ...form, type: "rambursare", targets: form.targets.slice(0, 1) })}
            className={`flex-1 py-2 rounded-xl text-sm border transition-all ${
              form.type === "rambursare" ? "border-blue-500 text-blue-700 bg-blue-50 shadow-sm" : "border-gray-300 text-gray-600"
            }`}
          >
            Dau banii înapoi
          </button>
        </div>

        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Sumă (lei)</p>
        <input
          type="number"
          inputMode="decimal"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          placeholder="ex: 80"
          className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-gray-900 text-lg font-semibold focus:outline-none focus:border-amber-500 mb-4"
        />

        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
          {form.type === "rambursare"
            ? "Cui îi dai banii înapoi"
            : "Cui — alege pe cine vrei (dacă nu alegi pe nimeni, se împarte la toți)"}
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {others.map((m) => {
            const active = form.targets.includes(m);
            return (
              <button
                key={m}
                onClick={() => {
                  if (form.type === "rambursare") {
                    setForm({ ...form, targets: [m] });
                  } else {
                    toggleTarget(m);
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-sm border flex items-center gap-1 transition-all ${
                  active ? "border-amber-500 text-amber-700 bg-amber-50 shadow-sm" : "border-gray-300 text-gray-600"
                }`}
              >
                {active && <Check size={12} />}
                {m}
              </button>
            );
          })}
        </div>
        {form.type === "cinste" && form.targets.length > 0 && (
          <button onClick={() => setForm({ ...form, targets: [] })} className="text-xs text-gray-500 underline mb-3">
            Resetează selecția (= toată gașca)
          </button>
        )}

        {form.type === "cinste" && (
          <label className="flex items-center gap-2 mb-3 cursor-pointer select-none">
            <button
              type="button"
              onClick={() => setForm({ ...form, includeMe: !form.includeMe })}
              className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${
                form.includeMe ? "bg-amber-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.includeMe ? "translate-x-4" : ""
                }`}
              />
            </button>
            <span className="text-xs text-gray-600">Include-mă în preț — suma e pentru toată gașca, inclusiv eu</span>
          </label>
        )}

        {form.type === "cinste" && form.amount && chosenCount > 0 && (
          <p className="text-xs text-gray-500 mb-4">
            {form.includeMe
              ? `Se împarte la ${divisorPreview} (tu + ${chosenCount}): ${share} lei de fiecare, tu nu plătești`
              : chosenCount > 1
              ? `Se împarte egal: ${share} lei × ${chosenCount} persoane`
              : `${form.amount} lei către o singură persoană`}
          </p>
        )}

        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Notă (opțional)</p>
        <input
          value={form.note}
          onChange={(e) => setForm({ ...form, note: e.target.value })}
          placeholder="ex: bere la terasă"
          className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500 mb-4"
        />

        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Poze (opțional, poți adăuga mai multe)</p>
        {form.photos.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {form.photos.map((p, idx) => (
              <div key={idx} className="relative w-20 h-20 animate-popin">
                <img src={p} className="w-20 h-20 rounded-xl object-cover shadow-sm" alt="" />
                <button
                  onClick={() => removePhoto(idx)}
                  className="absolute -top-2 -right-2 bg-white rounded-full shadow p-1 border border-gray-200"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl py-3 mb-4 hover:border-amber-400 hover:text-amber-600 transition-colors"
        >
          {uploading ? (
            "se încarcă…"
          ) : (
            <>
              <Camera size={16} /> {form.photos.length > 0 ? "Adaugă încă o poză" : "Atașează o poză"}
            </>
          )}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" />

        <button
          onClick={onSubmit}
          className="w-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-semibold rounded-xl py-3 active:scale-[0.98] transition-transform shadow-lg shadow-amber-500/30"
        >
          Salvează
        </button>
      </div>
    </div>
  );
}

function EditAmountModal({ entry, onSave, onClose }) {
  const [val, setVal] = useState(String(entry.amount));
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40 px-4 animate-fadein">
      <div className="bg-white rounded-3xl w-full max-w-xs p-5 shadow-2xl animate-popin">
        <h3 className="text-lg font-bold mb-3">Corectează suma</h3>
        <p className="text-xs text-gray-500 mb-2">
          {entry.from} → {entry.to}
        </p>
        <input
          type="number"
          inputMode="decimal"
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-lg font-semibold focus:outline-none focus:border-amber-500 mb-4"
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              const n = parseFloat(val);
              if (n > 0) onSave(n);
            }}
            className="flex-1 bg-gradient-to-br from-amber-400 to-orange-500 text-white font-semibold rounded-xl py-2.5 active:scale-95 transition-transform"
          >
            Salvează
          </button>
          <button onClick={onClose} className="px-4 text-sm text-gray-500 rounded-xl border border-gray-300">
            Anulează
          </button>
        </div>
      </div>
    </div>
  );
}

function StatsScreen({ members, entries, onClose }) {
  const stats = computeStats(members, entries);
  const monthStats = computeStats(members, monthEntries(entries));
  const now = new Date();
  const monthName = now.toLocaleDateString("ro-RO", { month: "long" });

  const winners = BADGES.map((b) => {
    const w = b.pick(stats);
    return w && b.show(w) ? { ...b, winner: w } : null;
  }).filter(Boolean);

  const monthlyWinners = MONTHLY_AWARDS.map((b) => {
    const w = b.pick(monthStats);
    return w && b.show(w) ? { ...b, winner: w } : null;
  }).filter(Boolean);

  const sortedByNet = stats.slice().sort((a, b) => b.net - a.net);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-end sm:items-center justify-center animate-fadein">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 pb-8 max-h-[88vh] overflow-y-auto animate-slideup shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold">🏆 Clasamentul grupului</h2>
          <button onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4">se actualizează live, pe baza istoricului vostru</p>

        {monthlyWinners.length > 0 && (
          <>
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              Premiile lunii {monthName}
            </p>
            <div className="space-y-2 mb-6">
              {monthlyWinners.map((w, i) => (
                <div
                  key={w.key}
                  style={{ animationDelay: `${i * 70}ms` }}
                  className={`animate-popin rounded-2xl p-4 text-white bg-gradient-to-br ${w.color} shadow-lg flex items-center gap-3`}
                >
                  <Avatar name={w.winner.name} size={11} />
                  <div className="min-w-0">
                    <p className="font-bold text-sm">{w.title}</p>
                    <p className="text-xs opacity-90">
                      {w.winner.name} · {w.metric(w.winner)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Porecle generale</p>
        {winners.length === 0 ? (
          <p className="text-sm text-gray-400 italic mb-6">Nu sunt încă destule date pentru porecle.</p>
        ) : (
          <div className="space-y-2 mb-6">
            {winners.map((w, i) => (
              <div
                key={w.key}
                style={{ animationDelay: `${i * 70}ms` }}
                className={`animate-popin rounded-2xl p-4 text-white bg-gradient-to-br ${w.color} shadow-lg flex items-center gap-3`}
              >
                <Avatar name={w.winner.name} size={11} />
                <div className="min-w-0">
                  <p className="font-bold text-sm">{w.title}</p>
                  <p className="text-xs opacity-90">
                    {w.winner.name} · {w.metric(w.winner)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Clasament general (balanță netă)</p>
        <div className="space-y-1.5">
          {sortedByNet.map((s, i) => (
            <div key={s.name} className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
                <Avatar name={s.name} size={6} />
                {s.name}
              </span>
              <span
                className={`text-sm font-semibold ${
                  s.net === 0 ? "text-gray-400" : s.net > 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {s.net > 0 ? "+" : ""}
                {formatAmount(s.net)} lei
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function polarPoint(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function sliceCenterAngle(i, total) {
  const sliceAngle = 360 / total;
  return (i + 0.5) * sliceAngle;
}

function WheelModal({ members, onClose, onResult }) {
  const [selected, setSelected] = useState([]);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinCount, setSpinCount] = useState(0);
  const [winner, setWinner] = useState(null);

  function toggle(name) {
    setSelected((s) => (s.includes(name) ? s.filter((n) => n !== name) : [...s, name]));
  }

  function spin() {
    if (selected.length < 2 || spinning) return;
    setWinner(null);
    const idx = Math.floor(Math.random() * selected.length);
    const angle = sliceCenterAngle(idx, selected.length);
    const nextSpinCount = spinCount + 1;
    const targetRotation = nextSpinCount * 360 * 5 - angle;
    setSpinCount(nextSpinCount);
    setSpinning(true);
    setRotation(targetRotation);
    setTimeout(() => {
      setSpinning(false);
      setWinner(selected[idx]);
      if (onResult) onResult(selected[idx], selected);
      playChime();
      if (navigator.vibrate) navigator.vibrate([30, 40, 30, 40, 60]);
    }, 4000);
  }

  const size = 260;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 6;
  const sliceAngle = selected.length > 0 ? 360 / selected.length : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-end sm:items-center justify-center animate-fadein">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm p-5 pb-8 max-h-[92vh] overflow-y-auto animate-slideup shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Dices size={20} className="text-pink-500" /> Roata norocului
          </h2>
          <button onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>

        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Cine intră la roată</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {members.map((m) => {
            const active = selected.includes(m);
            return (
              <button
                key={m}
                onClick={() => toggle(m)}
                className={`px-3 py-1.5 rounded-full text-sm border flex items-center gap-1 transition-all ${
                  active ? "border-pink-500 text-pink-700 bg-pink-50 shadow-sm" : "border-gray-300 text-gray-600"
                }`}
              >
                {active && <Check size={12} />}
                {m}
              </button>
            );
          })}
        </div>

        {selected.length < 2 ? (
          <p className="text-xs text-gray-400 mb-4">Alege cel puțin 2 persoane ca să poți învârti roata.</p>
        ) : (
          <div className="flex flex-col items-center mb-5">
            <div className="relative" style={{ width: size, height: size }}>
              <div
                className="absolute left-1/2 -top-2 -translate-x-1/2 z-10"
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: "10px solid transparent",
                  borderRight: "10px solid transparent",
                  borderTop: "18px solid #1f2937",
                }}
              />
              <svg
                width={size}
                height={size}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)" : "none",
                }}
              >
                {selected.map((name, i) => {
                  const startAngle = i * sliceAngle;
                  const endAngle = (i + 1) * sliceAngle;
                  const p1 = polarPoint(cx, cy, r, startAngle);
                  const p2 = polarPoint(cx, cy, r, endAngle);
                  const largeArc = sliceAngle > 180 ? 1 : 0;
                  const path = `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;
                  const labelPos = polarPoint(cx, cy, r * 0.62, startAngle + sliceAngle / 2);
                  return (
                    <g key={name}>
                      <path d={path} fill={WHEEL_COLORS[i % WHEEL_COLORS.length]} stroke="white" strokeWidth="2" />
                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        fill="white"
                        fontSize="13"
                        fontWeight="700"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        transform={`rotate(${startAngle + sliceAngle / 2}, ${labelPos.x}, ${labelPos.y})`}
                      >
                        {name.length > 10 ? name.slice(0, 9) + "…" : name}
                      </text>
                    </g>
                  );
                })}
                <circle cx={cx} cy={cy} r="14" fill="white" stroke="#e5e7eb" strokeWidth="2" />
              </svg>
            </div>

            <button
              onClick={spin}
              disabled={spinning}
              className="mt-5 w-full bg-gradient-to-br from-pink-500 to-rose-500 text-white font-semibold rounded-xl py-3 active:scale-[0.98] transition-transform shadow-lg shadow-pink-500/30 disabled:opacity-60"
            >
              {spinning ? "Se învârte…" : "🎡 Învârte roata"}
            </button>

            {winner && !spinning && (
              <div className="mt-4 w-full text-center animate-popin bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-2xl p-4">
                <p className="text-sm opacity-90">A picat pe...</p>
                <p className="text-2xl font-extrabold flex items-center justify-center gap-2 mt-1">
                  <Avatar name={winner} size={9} /> {winner}
                </p>
                <p className="text-sm mt-1 opacity-90">plătește! 🎉</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const RO_DAYS = ["Lu", "Ma", "Mi", "Jo", "Vi", "Sb", "Du"];
const RO_MONTHS = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

function sameDay(ts, y, m, d) {
  const dt = new Date(ts);
  return dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d;
}

function CalendarModal({ entries, onClose, onPhoto }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysCount = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysCount; d++) cells.push(d);

  function entriesForDay(d) {
    if (!d) return [];
    return entries.filter((e) => e.date && sameDay(e.date, viewYear, viewMonth, d));
  }

  function changeMonth(delta) {
    setSelectedDay(null);
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  const dayEntries = selectedDay ? entriesForDay(selectedDay) : [];
  const isToday = (d) => d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-end sm:items-center justify-center animate-fadein">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md p-5 pb-8 max-h-[90vh] overflow-y-auto animate-slideup shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon size={20} className="text-blue-500" /> Calendar
          </h2>
          <button onClick={onClose} className="text-gray-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 active:scale-90 transition-transform"
          >
            <ArrowLeft size={16} />
          </button>
          <p className="font-semibold text-gray-900">
            {RO_MONTHS[viewMonth]} {viewYear}
          </p>
          <button
            onClick={() => changeMonth(1)}
            className="p-2 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 active:scale-90 transition-transform"
          >
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {RO_DAYS.map((d) => (
            <div key={d} className="text-center text-[10px] uppercase tracking-wide text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 mb-5">
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const dayEs = entriesForDay(d);
            const total = dayEs.reduce((s, e) => s + (e.amount || 0), 0);
            const active = selectedDay === d;
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(active ? null : d)}
                className={`aspect-square rounded-xl flex flex-col items-center justify-center text-xs relative transition-all ${
                  active
                    ? "bg-amber-500 text-white shadow-md scale-105"
                    : isToday(d)
                    ? "border border-amber-400 text-gray-900"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="font-medium">{d}</span>
                {dayEs.length > 0 && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                      active ? "bg-white" : "bg-amber-500"
                    }`}
                  />
                )}
                {total > 0 && !active && (
                  <span className="absolute -bottom-1 text-[8px] text-amber-600 font-semibold">
                    {formatAmount(total)}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {selectedDay && (
          <div className="animate-fadein">
            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">
              {selectedDay} {RO_MONTHS[viewMonth]} — {dayEntries.length} tranzacții
            </p>
            {dayEntries.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Nimic în ziua asta.</p>
            ) : (
              <div className="space-y-2">
                {dayEntries.map((e) => {
                  const photos = photosOf(e);
                  return (
                    <div
                      key={e.id}
                      className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {photos.length > 0 ? (
                          <img
                            src={photos[0]}
                            onClick={() => onPhoto(photos)}
                            className="w-10 h-10 rounded-lg object-cover cursor-pointer shrink-0"
                            alt=""
                          />
                        ) : (
                          <Avatar name={e.from} size={8} />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                            {e.from} <ArrowRight size={11} className="text-gray-400" /> {e.to}
                          </p>
                          {e.note && <p className="text-xs text-gray-500 truncate">{e.note}</p>}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-amber-600 shrink-0">{formatAmount(e.amount)} lei</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
