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
} from "lucide-react";
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

function colorFor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function Avatar({ name, size = 10 }) {
  const initial = name?.[0]?.toUpperCase() || "?";
  return (
    <div
      className={`w-${size} h-${size} shrink-0 rounded-full bg-gradient-to-br ${colorFor(
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

export default function App() {
  const [members, setMembers] = useState([]);
  const [entries, setEntries] = useState([]);
  const [connected, setConnected] = useState(false);
  const [me, setMeState] = useState(() => loadLS(ME_KEY, null));
  const [newMemberName, setNewMemberName] = useState("");
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [viewingMember, setViewingMember] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const [err, setErr] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [confetti, setConfetti] = useState(false);

  const [form, setForm] = useState({ amount: "", targets: [], note: "", type: "cinste", photo: null, excludeMe: false });

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

  function setMe(name) {
    setMeState(name);
    try {
      localStorage.setItem(ME_KEY, JSON.stringify(name));
    } catch (e) {}
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
    const divisor = form.type === "cinste" && form.excludeMe ? chosen.length + 1 : chosen.length;
    const share = isSplit || form.excludeMe ? Math.round((amt / divisor) * 100) / 100 : amt;

    setSaveStatus("saving");
    try {
      await Promise.all(
        chosen.map((target) => {
          const payload = {
            from: me,
            to: target,
            amount: share,
            totalAmount: amt,
            splitAll: isSplit || form.excludeMe,
            splitCount: divisor,
            note: form.note.trim(),
            type: form.type,
            date: Date.now(),
          };
          if (form.photo) payload.photo = form.photo;
          return push(ENTRIES_REF, payload);
        })
      );
      setSaveStatus("saved");
      setConfetti(true);
      setTimeout(() => setSaveStatus(""), 1200);
      setTimeout(() => setConfetti(false), 1000);
      setForm({ amount: "", targets: [], note: "", type: "cinste", photo: null, excludeMe: false });
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
    } catch (e) {
      setErr("Nu am putut șterge: " + e.message);
    }
  }

  if (!me) {
    return (
      <>
        <BackgroundBlobs />
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
                  {bal === 0 ? "achitat ✓" : bal > 0 ? `îți datorează ${bal} lei` : `îi datorezi ${Math.abs(bal)} lei`}
                </p>
              </div>
            </div>
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
                  delay={i * 40}
                />
              ))
            )}
          </div>
        </div>
        {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      </>
    );
  }

  const received = entries.filter((e) => e.to === me);
  const given = entries.filter((e) => e.from === me);
  const totalReceived = received.reduce((s, e) => s + e.amount, 0);
  const totalGiven = given.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <BackgroundBlobs />
      <Confetti trigger={confetti} />
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
                onClick={() => setMe(null)}
                className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-full border border-gray-300 active:scale-95"
              >
                <LogOut size={14} /> Ieși
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="rounded-2xl border border-gray-200/70 bg-white/70 backdrop-blur-sm shadow-sm px-4 py-3 hover:shadow-md transition-shadow">
              <p className="text-[11px] uppercase tracking-wider text-gray-500">Ai primit</p>
              <p className="text-2xl font-extrabold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent mt-1">
                {totalReceived.toFixed(0)} lei
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200/70 bg-white/70 backdrop-blur-sm shadow-sm px-4 py-3 hover:shadow-md transition-shadow">
              <p className="text-[11px] uppercase tracking-wider text-gray-500">Ai dat</p>
              <p className="text-2xl font-extrabold text-gray-700 mt-1">{totalGiven.toFixed(0)} lei</p>
            </div>
          </div>
        </div>

        {err && (
          <div className="mx-5 mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 animate-fadein">
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
                      îți datorează {b.net} lei
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                      îi datorezi {Math.abs(b.net)} lei
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
          onPhoto={setLightbox}
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

        {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
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
      <button onClick={onAdd} className="bg-gradient-to-br from-amber-400 to-orange-500 text-white text-sm font-medium rounded-xl px-4 active:scale-95 transition-transform">
        Adaugă
      </button>
      <button onClick={() => setOpen(false)} className="text-sm text-gray-400 px-2">
        <X size={18} />
      </button>
    </div>
  );
}

function EntryCard({ e, me, deleteEntry, onPhoto, delay = 0 }) {
  const isReceived = e.to === me;
  const other = isReceived ? e.from : e.to;
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className="animate-fadein rounded-2xl border border-gray-200/70 bg-white/70 backdrop-blur-sm shadow-sm px-4 py-3 flex items-center justify-between gap-3 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3 min-w-0">
        {e.photo ? (
          <img
            src={e.photo}
            onClick={() => onPhoto(e.photo)}
            className="w-12 h-12 rounded-xl object-cover shrink-0 cursor-pointer active:scale-95 transition-transform"
            alt=""
          />
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
            {e.splitAll ? ` · din ${e.totalAmount.toFixed(0)} lei împărțit la ${e.splitCount}` : ""}
            {e.note ? ` · ${e.note}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
          {e.amount.toFixed(0)} lei
        </span>
        {deleteEntry && (
          <button
            onClick={() => deleteEntry(e.id)}
            className="text-gray-400 hover:text-red-600 transition-colors"
            aria-label="Șterge"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, empty, items, deleteEntry, givenView, onPhoto }) {
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
              onPhoto={onPhoto}
              delay={i * 40}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Lightbox({ src, onClose }) {
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-30 p-6 animate-fadein"
      onClick={onClose}
    >
      <img src={src} className="max-w-full max-h-full rounded-2xl animate-popin" alt="" />
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
        {members.length === 0
          ? "Grupul e gol — adaugă primul nume ca să începeți."
          : "Cine ești tu din grup?"}
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
                  <button
                    onClick={() => deleteMember(m)}
                    className="text-xs bg-red-600 text-white px-2 py-1 rounded-lg"
                  >
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

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await fileToCompressedBase64(file);
      setForm((f) => ({ ...f, photo: base64 }));
    } catch (err) {}
    setUploading(false);
  }

  const chosenCount = form.targets.length > 0 ? form.targets.length : others.length;
  const divisorPreview = form.type === "cinste" && form.excludeMe ? chosenCount + 1 : chosenCount;
  const share = form.amount ? (parseFloat(form.amount) / divisorPreview).toFixed(1) : null;

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
              form.type === "cinste"
                ? "border-amber-500 text-amber-700 bg-amber-50 shadow-sm"
                : "border-gray-300 text-gray-600"
            }`}
          >
            Fac cinste
          </button>
          <button
            onClick={() => setForm({ ...form, type: "rambursare", targets: form.targets.slice(0, 1) })}
            className={`flex-1 py-2 rounded-xl text-sm border transition-all ${
              form.type === "rambursare"
                ? "border-blue-500 text-blue-700 bg-blue-50 shadow-sm"
                : "border-gray-300 text-gray-600"
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
              onClick={() => setForm({ ...form, excludeMe: !form.excludeMe })}
              className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${
                form.excludeMe ? "bg-amber-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.excludeMe ? "translate-x-4" : ""
                }`}
              />
            </button>
            <span className="text-xs text-gray-600">
              Exclude-mă — suma include și partea mea, împarte la toată gașca
            </span>
          </label>
        )}

        {form.type === "cinste" && form.amount && chosenCount > 0 && (
          <p className="text-xs text-gray-500 mb-4">
            {form.excludeMe
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

        <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">Poză (opțional)</p>
        {form.photo ? (
          <div className="relative w-24 h-24 mb-4 animate-popin">
            <img src={form.photo} className="w-24 h-24 rounded-xl object-cover shadow-sm" alt="" />
            <button
              onClick={() => setForm({ ...form, photo: null })}
              className="absolute -top-2 -right-2 bg-white rounded-full shadow p-1 border border-gray-200"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded-xl py-3 mb-4 hover:border-amber-400 hover:text-amber-600 transition-colors"
          >
            {uploading ? (
              "se încarcă…"
            ) : (
              <>
                <Camera size={16} /> Atașează o poză
              </>
            )}
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />

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
