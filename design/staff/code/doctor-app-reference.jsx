/* ═══════ PART 2A: paste below the existing code ═══════ */
const CSS2 = `
@media(min-width:1024px){.abc .bnav,.abc .topbar{display:none}}
@media(max-width:480px){.abc .cl{grid-template-columns:52px minmax(0,1fr) auto;gap:4px 10px;padding:12px}.abc .stp{font-size:.75rem;gap:4px}}
.abc .row.items-start{align-items:flex-start}
.abc .tk-stub b{font-size:1.85rem}
.abc .chg-i .btn-sm{min-height:36px}
.abc .lockscr .lbl{color:#fff}
`;
const NAV = [["today", CalendarDays], ["patients", Users], ["review", Inbox], ["account", User]];
const STEPS = ["Note", "Medicines", "Care plan", "Sign"];
const seedAll = () => {
  const s = seed();
  s.thankamma.chg.push({ id: "c2", k: "reading", d: "13 Oct", m: "weight" });
  s.vinod.chg.splice(1, 0, { id: "c3", k: "reading", d: "11 Oct", m: "bp" });
  return s;
};
const careIds = (db) => Object.keys(db).filter((k) => db[k].care);
const waitingReports = (db) => careIds(db).flatMap((pid) => db[pid].reports.filter((r) => r.st === "wait").map((r) => ({ pid, r }))).sort((a, b) => b.r.wait - a.r.wait);
const waitingSymptoms = (db) => careIds(db).flatMap((pid) => db[pid].symptoms.filter((s) => s.st === "wait").map((s) => ({ pid, s }))).sort((a, b) => b.s.wait - a.s.wait);
const targetText = (k, tg = {}) => (k === "bp" ? (tg.sys && tg.dia ? `below ${tg.sys}/${tg.dia}` : "") : k === "sugar" ? (tg.fmin && tg.fmax ? `${tg.fmin} to ${tg.fmax} mg/dL` : "") : k === "a1c" ? (tg.a1c ? `below ${tg.a1c}%` : "") : "");
const metName = (m) => (m === "bp" ? "BP" : MET[m][2].toLowerCase());
const days = (n) => `${n} day${n === 1 ? "" : "s"}`;
const srcText = (r, lower) => (r.src === "Uploaded by patient" ? (lower ? "uploaded by the patient" : "Uploaded by the patient") : r.src);
const hiPhrase = (m, tg) => (m === "sugar" ? "outside the target range" : m === "bp" ? `above the ${tg.sys}/${tg.dia} target` : m === "a1c" ? `above the ${tg.a1c}% target` : "above target");
const readLine = (p, m) => {
  const all = p.readings[m] || [], nw = all.filter((r) => r.nw), base = all.filter((r) => !r.nw).slice(-1)[0], last = nw[nw.length - 1];
  if (!last) return { title: `No new home ${metName(m)} readings`, sub: "", hot: false };
  const n = nw.length, hi = highNew(p, m).length, parts = [];
  if (base && m === "weight") { const dl = Math.round((last.v - base.v) * 10) / 10; parts.push(`${dl >= 0 ? "Up" : "Down"} ${Math.abs(dl)} kg since ${base.d} in clinic`); }
  else if (base) parts.push(`From ${fmtV(m, base.v)} in clinic on ${base.d}`);
  if (hi) parts.push(`${hi === n ? (n > 1 ? `All ${n}` : "It's") : `${hi} of ${n}`} ${hiPhrase(m, p.tg)}`);
  return { title: `Home ${metName(m)}: ${n} reading${n > 1 ? "s" : ""}, latest ${fmtV(m, last.v)} ${MET[m][1]}`, sub: parts.join(". "), hot: hi > 0 || (m === "weight" && !!base && last.v - base.v >= 1.5) };
};
const homeLine = (p) => ["bp", "sugar", "weight"].map((m) => {
  const nw = (p.readings[m] || []).filter((r) => r.nw);
  if (!nw.length) return null;
  const a = fmtV(m, nw[0].v), b = fmtV(m, nw[nw.length - 1].v);
  return `Home ${metName(m)} ${nw.length > 1 ? a + " to " + b : b} ${MET[m][1]} (${nw.length} reading${nw.length > 1 ? "s" : ""})`;
}).filter(Boolean).join(". ");
const PEN = ["penicillin", "amoxicillin", "ampicillin", "cloxacillin", "piperacillin", "augmentin"];
const allergyHit = (p, name) => { const n = name.toLowerCase(); return p.allergies.find((a) => { const al = a.n.toLowerCase(); return n.includes(al) || (al === "penicillin" && PEN.some((x) => n.includes(x))); }); };
const dupHit = (d, name) => d.meds.find((m) => m.act !== "stop" && m.name.toLowerCase() === name.trim().toLowerCase());

/* ───────── Sign-in, two-factor, lock ───────── */
function AuthFrame({ back, title, sub, children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="zari-band" />
      <div className="flex items-center justify-between gap-3 px-5 lg:px-10 pt-4">
        {back ? <button className="back press" onClick={back}><ChevronLeft size={20} />Back</button> : <Logo />}
        <span className="text-sm ink3">For hospital staff</span>
      </div>
      <main className="flex-1 w-full max-w-md mx-auto px-5 pt-8 pb-24 lg:pt-14">
        <h1 className="disp h1">{title}</h1>
        {sub && <p className="ink2 mt-3 text-lg">{sub}</p>}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
function SignIn() {
  const { go } = useA();
  const [em, setEm] = useState(DOC.email);
  const [pw, setPw] = useState("ward-round-26");
  const [show, setShow] = useState(false);
  const [chk, setChk] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => { const a = setTimeout(() => setChk(1), 300), b = setTimeout(() => setChk(2), 1400); return () => { clearTimeout(a); clearTimeout(b); }; }, []);
  const ok = /^\S+@\S+\.\S+$/.test(em) && pw.length >= 6 && chk === 2;
  const submit = (e) => { e.preventDefault(); if (!ok || busy) return; setBusy(true); setTimeout(() => go("twofa"), 700); };
  return (
    <AuthFrame title="Staff sign-in" sub="Use your hospital email and password. Patients sign in on the patient app.">
      <form onSubmit={submit} noValidate>
        <label className="lbl" htmlFor="em">Email</label>
        <div className="field"><input id="em" type="email" autoComplete="username" value={em} onChange={(e) => setEm(e.target.value)} /></div>
        <label className="lbl mt-5" htmlFor="pw">Password</label>
        <div className="field">
          <input id="pw" type={show ? "text" : "password"} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <button type="button" className="icon-btn" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>{show ? <EyeOff size={20} /> : <Eye size={20} />}</button>
        </div>
        <div className="secchk mt-5" aria-live="polite">
          <ShieldCheck size={20} className={chk === 2 ? "leaf" : "ink3"} />
          <span className="flex-1">Security check</span>
          {chk < 2 ? <span className="flex items-center gap-2 text-sm ink3"><span className="spin" />Checking</span> : <Tag tone="leaf" icon={Check}>Done</Tag>}
        </div>
        <Btn type="submit" className="w-full mt-6" disabled={!ok || busy}>{busy ? <><span className="spin" />Signing in</> : "Sign in"}</Btn>
      </form>
      <p className="text-sm ink3 mt-5">Forgot your password? The hospital admin can reset it.</p>
    </AuthFrame>
  );
}
function TwoFA() {
  const { go } = useA();
  return (
    <AuthFrame back={() => go("signin")} title="Enter your 6-digit code" sub="Open your authenticator app and type the code it shows for ABC Hospital.">
      <CodeBoxes label="Authenticator code" onOk={() => go("app")} />
      <p className="lock-note mt-6"><ShieldCheck size={18} className="flex-none mt-0.5" /><span>Patient records stay hidden until this step is done.</span></p>
      <p className="text-sm ink3 mt-5">Lost your phone? The hospital admin can reset two-factor sign-in.</p>
      <button className="link mt-3" onClick={() => go("enroll")}>Setting up two-factor for the first time?</button>
    </AuthFrame>
  );
}
function Enroll() {
  const { go, toast } = useA();
  const key = "JBSW Y3DP EHPK 3PXP";
  const copy = () => { try { navigator.clipboard.writeText(key.replace(/ /g, "")).catch(() => {}); } catch (e) { /* clipboard blocked */ } toast("Setup key copied"); };
  return (
    <AuthFrame back={() => go("twofa")} title="Set up two-factor sign-in" sub="Every staff account needs this once. It protects patient records if your password leaks.">
      <ol className="flex flex-col gap-8">
        <li className="flex gap-4"><span className="enum">1</span><div className="min-w-0 flex-1"><h2 className="h3">Install an authenticator app</h2><p className="ink2 mt-1">Google Authenticator, Microsoft Authenticator or any similar app.</p></div></li>
        <li className="flex gap-4"><span className="enum">2</span><div className="min-w-0 flex-1"><h2 className="h3">Scan this code with the app</h2><div className="mt-3"><QR /></div><p className="text-sm ink3 mt-3">Can't scan it? Type this key instead.</p><div className="keybox"><b className="num">{key}</b><button className="icon-btn" onClick={copy} aria-label="Copy the setup key"><Copy size={18} /></button></div></div></li>
        <li className="flex gap-4"><span className="enum">3</span><div className="min-w-0 flex-1"><h2 className="h3">Type the code the app shows</h2><div className="mt-3"><CodeBoxes label="Code from your app" auto={false} onOk={() => { toast("Two-factor sign-in is on"); go("app"); }} /></div></div></li>
      </ol>
    </AuthFrame>
  );
}
function LockScreen() {
  const { unlock, signOut } = useA();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.focus(); }, []);
  const submit = (e) => { e.preventDefault(); if (pw.length < 6) { setErr(true); return; } unlock(); };
  return (
    <div className="lockscr">
      <div className="zari-band" />
      <main className="flex-1 w-full max-w-sm mx-auto px-5 py-16 flex flex-col justify-center">
        <span className="lock-ico"><Lock size={32} /></span>
        <h1 className="disp h1 mt-6 text-center">Screen locked</h1>
        <p className="op70 mt-3 text-center">Patient details stay hidden until you unlock. The screen locks after 10 idle minutes.</p>
        <form onSubmit={submit} className="mt-8" noValidate>
          <div className="flex items-center gap-3 mb-4"><Av name={DOC.name} s={40} dark /><b>{DOC.name}</b></div>
          <label className="lbl" htmlFor="ulpw">Password</label>
          <div className="field"><input ref={ref} id="ulpw" type="password" autoComplete="current-password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(false); }} /></div>
          {err && <p className="mt-2 font-semibold" style={{ color: "#F5B9AB" }} role="alert">Enter your password to unlock.</p>}
          <Btn type="submit" className="w-full mt-5">Unlock</Btn>
        </form>
        <button className="mt-6 font-semibold self-center" style={{ color: "rgba(255,255,255,.85)" }} onClick={() => signOut("Signed out")}>Not you? Sign out</button>
      </main>
    </div>
  );
}
function IdleWarn({ s }) {
  return <div className="idle" role="alert"><Timer size={20} className="flex-none" /><span>Locking in {s} seconds because the screen has been idle. Tap anywhere to stay signed in.</span></div>;
}

/* ───────── Shell ───────── */
function Side() {
  const { tab, setTab, counts, lock, open } = useA();
  return (
    <aside className="dside hidden lg:flex">
      <div className="zari-band" />
      <Logo dark />
      <nav className="flex flex-col gap-1" aria-label="Main">
        {NAV.map(([v, I]) => (
          <button key={v} className={cls("dn press", tab === v && "on")} onClick={() => setTab(v)} aria-current={tab === v ? "page" : undefined}>
            <I size={20} />{LBL[v]}{v === "review" && counts.review > 0 && <span className="dn-n">{counts.review}</span>}
          </button>
        ))}
      </nav>
      <div className="acct mt-auto">
        <div className="flex items-center gap-3"><Av name={DOC.name} s={40} dark /><span className="min-w-0 leading-tight"><b className="block truncate">{DOC.name}</b><span className="block text-sm op70">{DOC.dept}</span></span></div>
        <div className="flex gap-2 mt-3"><button className="acct-btn press" onClick={lock}><Lock size={16} />Lock</button><button className="acct-btn press" onClick={() => open({ type: "signout" })}><LogOut size={16} />Sign out</button></div>
      </div>
    </aside>
  );
}
function Top() {
  const { tab, chart, lock } = useA();
  return (
    <header className="topbar">
      <div className="flex items-center gap-3"><span className="logo logo-sm" aria-hidden="true">ABC</span><b>{chart ? "Patient chart" : LBL[tab]}</b></div>
      <button className="icon-btn press" onClick={lock} aria-label="Lock screen"><Lock size={20} /></button>
    </header>
  );
}
function BNav() {
  const { tab, setTab, counts } = useA();
  return (
    <nav className="bnav" aria-label="Main">
      {NAV.map(([v, I]) => (
        <button key={v} className={cls("bn", tab === v && "on")} onClick={() => setTab(v)} aria-current={tab === v ? "page" : undefined}>
          <span className="bi"><I size={22} />{v === "review" && counts.review > 0 && <span className="badge">{counts.review}</span>}</span>{LBL[v]}
        </button>
      ))}
    </nav>
  );
}
function Outage() {
  return <div className="outage" role="alert"><WifiOff size={20} className="flex-none" /><p className="flex-1">We can't reach the hospital system, so notes and reviews can't be saved. Use the paper process until this clears.</p><a href="tel:2200" className="btn btn-sm btn-light press">Call IT</a></div>;
}

/* ───────── Today ───────── */
let introPlayed = false;
function TodayS() {
  const { clinic, drafts } = useA();
  const [kin] = useState(() => !introPlayed);
  useEffect(() => { introPlayed = true; }, []);
  const nx = nextAppt(clinic, drafts);
  const live = clinic.filter((a) => a.st !== "cancel");
  const left = live.filter((a) => ["booked", "draft"].includes(apptStatus(a, drafts))).length;
  return (
    <>
      <div className="pt-3 pb-7 lg:pt-0">
        <p className="ink3 font-medium">Thursday, 15 October</p>
        <h1 className={cls("disp greet mt-1", kin && "kin")}>Good morning,<br />Dr. Rahul</h1>
        <p className="ink2 mt-3">Morning OP in {DOC.room}. {left ? `${left} of ${live.length} patients still to see.` : "Everyone booked has been seen."}</p>
      </div>
      <div className="lg:grid lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7 flex flex-col gap-8">{nx ? <NextCard a={nx} /> : <DoneCard />}<ClinicList /></div>
        <div className="lg:col-span-5 mt-8 lg:mt-0"><Waiting /></div>
      </div>
    </>
  );
}
function NextCard({ a }) {
  const { db, openChart } = useA();
  const p = db[a.id];
  return (
    <section aria-label="Next patient">
      <div className="ticket">
        <div className="tk-main">
          <p className="text-sm" style={{ opacity: 0.8 }}>Next patient, {a.type.toLowerCase()}</p>
          <p className="tk-name">{p.name}</p>
          <p style={{ opacity: 0.85 }}>{p.age}, {p.sex}, {p.mrn}</p>
          <p className="mt-3 font-medium">{p.reason}</p>
          <div className="flex flex-wrap gap-2 mt-3"><Counters s={sig(p)} /></div>
          {p.allergies.length > 0 && <p className="flex items-center gap-2 mt-3 text-sm font-semibold"><AlertTriangle size={16} className="flex-none" style={{ color: "#F3D27A" }} />Allergic to {p.allergies.map((x) => x.n.toLowerCase()).join(" and ")}</p>}
          <Btn k="light" sm className="mt-5" onClick={() => openChart(a.id)}>Open chart</Btn>
        </div>
        <div className="tk-stub"><b className="num">{a.t.slice(0, -3)}</b><span>{a.t.slice(-2)}</span></div>
      </div>
    </section>
  );
}
function DoneCard() {
  return <section className="note-card"><span className="ico ico-leaf"><Check size={20} /></span><div><h2 className="h3">No more patients waiting this morning</h2><p className="text-sm ink2 mt-1">Use the time for the reports and symptoms in Review.</p></div></section>;
}
function ClinicList() {
  const { db, clinic, drafts, openChart } = useA();
  const nx = nextAppt(clinic, drafts);
  return (
    <section aria-labelledby="cl-h">
      <H id="cl-h" right={<span className="text-sm ink3">{clinic.filter((a) => a.st !== "cancel").length} booked</span>}>Today's clinic</H>
      <div className="grp">
        {clinic.map((a) => {
          const p = db[a.id], st = apptStatus(a, drafts), isNx = !!nx && nx.id === a.id, s = sig(p);
          const any = st !== "done" && st !== "cancel" && s.rep + s.rd + s.sx + s.miss + s.med > 0;
          return (
            <button key={a.id} className={cls("cl press", isNx && "next", st === "cancel" && "muted")} onClick={() => openChart(a.id)}>
              <span className="cl-t">{a.t.slice(0, -3)}<span className="block text-xs ink3 font-medium">{a.t.slice(-2)}</span></span>
              <span className="min-w-0">
                <b className="block truncate">{p.name}</b>
                <span className="block text-sm ink2 truncate">{a.type === "New visit" && <span className="leaf font-semibold">New patient. </span>}{p.reason}</span>
                {any && <span className="flex flex-wrap gap-1.5 mt-1.5"><Counters s={s} /></span>}
              </span>
              <span>{st === "done" ? <Tag tone="leaf" icon={BadgeCheck}>Signed</Tag> : st === "draft" ? <Tag tone="zari" icon={Pencil}>Draft</Tag> : st === "cancel" ? <Tag tone="mist">Cancelled</Tag> : isNx ? <Tag tone="leafs">Next</Tag> : <ChevronRight size={20} className="ink3" />}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
function Waiting() {
  const { db, drafts, startNote, setTab, setRtab, toast } = useA();
  const unsigned = Object.keys(drafts).filter((k) => drafts[k].saved && !drafts[k].done);
  const reps = waitingReports(db), sxs = waitingSymptoms(db), overdue = careIds(db).filter((k) => db[k].overdue);
  const goR = (t) => { setRtab(t); setTab("review"); };
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="w-h">
        <H id="w-h">Waiting for you</H>
        <div className="grp">
          {unsigned.map((k) => (
            <div key={k} className="row"><span className="ico ico-zari"><Pencil size={18} /></span><span className="flex-1 min-w-0"><b className="block truncate">Unsigned note, {db[k].name}</b><span className="block text-sm ink3">Draft saved at {drafts[k].saved}</span></span><Btn k="tint" sm onClick={() => startNote(k)}>Continue</Btn></div>
          ))}
          <div className="row"><span className="ico ico-leaf"><FileText size={18} /></span><span className="flex-1 min-w-0"><b className="block">{reps.length ? `${reps.length} report${reps.length > 1 ? "s" : ""} to review` : "No reports waiting"}</b>{reps[0] && <span className="block text-sm ink3 truncate">Oldest: {reps[0].r.title}, {db[reps[0].pid].name}, {days(reps[0].r.wait)}</span>}</span>{reps.length > 0 && <Btn k="tint" sm onClick={() => goR("reports")}>Review</Btn>}</div>
          <div className="row"><span className="ico ico-zari"><MessageSquare size={18} /></span><span className="flex-1 min-w-0"><b className="block">{sxs.length ? `${sxs.length} symptom${sxs.length > 1 ? "s" : ""} reported` : "No symptoms waiting"}</b>{sxs[0] && <span className="block text-sm ink3 truncate">Oldest: {db[sxs[0].pid].name}, {days(sxs[0].s.wait)}</span>}</span>{sxs.length > 0 && <Btn k="tint" sm onClick={() => goR("symptoms")}>Review</Btn>}</div>
        </div>
      </section>
      {overdue.map((k) => (
        <section key={k} className="note-card"><span className="ico ico-lat"><Clock size={20} /></span><div className="flex-1 min-w-0"><h2 className="h3">{db[k].name}'s follow-up is overdue</h2><p className="text-sm ink2 mt-1">Due on {db[k].overdue}. Today's visit was cancelled and nothing is booked.</p><Btn k="sec" sm className="mt-3" onClick={() => toast(`The front desk will call ${first(db[k].name)} to book`)}><Phone size={16} />Ask the desk to call</Btn></div></section>
      ))}
    </div>
  );
}

/* ───────── Patients ───────── */
function PatientsS() {
  const { db } = useA();
  const [q, setQ] = useState("");
  const [f, setF] = useState("all");
  const qq = q.trim().toLowerCase(), qd = q.replace(/\D/g, "");
  const match = (p) => !qq || p.name.toLowerCase().includes(qq) || p.mrn.toLowerCase().includes(qq) || (qd.length >= 4 && p.phone.replace(/\D/g, "").includes(qd));
  const needs = (p) => p.reports.some((r) => r.st === "wait") || p.symptoms.some((s) => s.st === "wait");
  const base = careIds(db).filter((k) => match(db[k])).sort((a, b) => db[a].name.localeCompare(db[b].name));
  const F = { all: base, review: base.filter((k) => needs(db[k])), overdue: base.filter((k) => db[k].overdue) };
  const list = F[f];
  const others = qq.length >= 3 ? Object.keys(db).filter((k) => !db[k].care && match(db[k])) : [];
  return (
    <>
      <PageHead title="Patients" sub="Patients in your care team. Booking a visit adds a patient to it for a year." />
      <div className="field">
        <Search size={20} className="ink3 flex-none" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, phone or hospital number" aria-label="Search patients" />
        {q && <button className="icon-btn" onClick={() => setQ("")} aria-label="Clear search"><X size={18} /></button>}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {[["all", "All"], ["review", "Needs review"], ["overdue", "Overdue follow-up"]].map(([v, l]) => (
          <button key={v} className={cls("chip press", f === v && "on")} aria-pressed={f === v} onClick={() => setF(v)}>{l}<span className="text-sm" style={{ opacity: 0.7 }}>{F[v].length}</span></button>
        ))}
      </div>
      {list.length > 0 ? (
        <div className="mt-6">
          <div className="tbl-h"><span>Patient</span><span>Conditions</span><span>Last visit</span><span>Next visit</span><span>Since last visit</span><span /></div>
          <div className="grp">{list.map((k) => <PRow key={k} pid={k} />)}</div>
        </div>
      ) : others.length === 0 ? (
        <div className="mt-6"><Empty I={Search} title="No patients match" body="Check the spelling, or search by phone or hospital number." /></div>
      ) : <p className="ink2 mt-6">None of your patients match.</p>}
      {others.length > 0 && (
        <section className="mt-8">
          <H>Other patients at ABC Hospital</H>
          <p className="lock-note mb-3"><Lock size={18} className="flex-none mt-0.5" /><span>Not in your care team, so you see contact details only. Opening a chart needs a reason, lasts 4 hours and alerts the admin.</span></p>
          <div className="grp">{others.map((k) => <OtherRow key={k} pid={k} />)}</div>
        </section>
      )}
    </>
  );
}
function PRow({ pid }) {
  const { db, drafts, openChart } = useA();
  const p = db[pid], s = sig(p), dr = drafts[pid] && drafts[pid].saved && !drafts[pid].done;
  const sigs = (
    <>
      {p.overdue && <Tag tone="lat" icon={Clock}>Overdue since {p.overdue}</Tag>}
      {dr && <Tag tone="zari" icon={Pencil}>Draft note</Tag>}
      <Counters s={s} />
    </>
  );
  return (
    <button className="row prow press text-left" onClick={() => openChart(pid)}>
      <span className="flex items-center gap-3 flex-1 min-w-0">
        <Av name={p.name} s={40} />
        <span className="min-w-0">
          <b className="block truncate">{p.name}</b>
          <span className="block text-sm ink3 truncate">{p.age}, {p.sex}, {p.mrn}</span>
          <span className="flex flex-wrap items-center gap-1.5 mt-1.5 lg:hidden"><span className="text-sm ink2 mr-1">Next: {p.next}</span>{sigs}</span>
        </span>
      </span>
      <span className="hidden lg:block"><span className="clamp2 text-sm ink2">{p.conds.filter((c) => c.on).map((c) => c.n).join(", ") || "None recorded"}</span></span>
      <span className="hidden lg:block text-sm">{p.lastShort ? cap(p.lastShort) : "New patient"}</span>
      <span className="hidden lg:block text-sm">{p.next}</span>
      <span className="hidden lg:flex flex-wrap gap-1.5">{sigs}</span>
      <ChevronRight size={20} className="ink3 flex-none" />
    </button>
  );
}
function OtherRow({ pid }) {
  const { db, glassOn, openChart, open } = useA();
  const p = db[pid], g = glassOn(pid);
  return (
    <div className="row flex-wrap">
      <span className="flex items-center gap-3 flex-1 min-w-0">
        <Av name={p.name} s={40} />
        <span className="min-w-0"><b className="block truncate">{p.name}</b><span className="block text-sm ink3">{p.mrn}, {p.phone}</span></span>
      </span>
      {g ? <Btn k="tint" sm onClick={() => openChart(pid)}>Open chart</Btn> : <Btn k="dline" sm onClick={() => open({ type: "glass", pid })}><ShieldAlert size={16} />Emergency access</Btn>}
    </div>
  );
}


/* ═══════ PART 2B: paste below part 1 ═══════ */
const SEV = { severe: "lat", moderate: "zari", mild: "mist" };
const repIcon = (r) => (r.tpl === "other" ? FileText : FlaskConical);
const isNumVal = (v) => /^[\d.]+$/.test(String(v));
const SX_DONE = ["Called the patient", "Asked the desk to book an earlier visit", "Told the patient to come to casualty", "Will discuss at the next visit"];
const GLASS_WHY = ["Patient is in casualty", "Covering for the treating doctor", "Patient called with an urgent problem"];
const CTABS = [["changes", "What changed"], ["visits", "Visits"], ["readings", "Readings"], ["reports", "Reports"], ["meds", "Medicines"], ["plan", "Care plan"]];

/* ───────── Review queue ───────── */
function ReviewS() {
  const { db, rtab, setRtab } = useA();
  const reps = waitingReports(db), sxs = waitingSymptoms(db);
  return (
    <>
      <PageHead title="Review" sub="Reports and symptoms your patients sent between visits, oldest first." />
      <div className="max-w-md">
        <Seg val={rtab} set={setRtab} label="Review queue" opts={[["reports", <>Reports <span className="pill-n">{reps.length}</span></>], ["symptoms", <>Symptoms <span className="pill-n">{sxs.length}</span></>]]} />
      </div>
      <div key={rtab} className="fadein mt-6">{rtab === "reports" ? <RepQueue items={reps} /> : <SxQueue items={sxs} />}</div>
    </>
  );
}
function RepQueue({ items }) {
  const { db, open } = useA();
  const done = careIds(db).flatMap((pid) => db[pid].reports.filter((r) => r.st === "rev" && r.on === TODAY).map((r) => ({ pid, r })));
  return (
    <div className="lg:grid lg:grid-cols-5 lg:gap-10">
      <section className="lg:col-span-3">
        {items.length ? (
          <div className="grp">
            {items.map(({ pid, r }, i) => {
              const I = repIcon(r);
              return (
                <div key={pid + r.id} className="row spring" style={{ "--i": i }}>
                  <span className={cls("ico", r.tpl === "other" ? "ico-mist" : "ico-leaf")}><I size={20} /></span>
                  <span className="flex-1 min-w-0">
                    <b className="block truncate">{r.title}</b>
                    <span className="block text-sm ink2 truncate">{db[pid].name}, {db[pid].mrn}</span>
                    <span className="flex flex-wrap items-center gap-2 mt-1.5"><Tag tone={r.wait >= 7 ? "lat" : "zari"} icon={Clock}>Waiting {days(r.wait)}</Tag><span className="text-sm ink3">{srcText(r)}, {r.up}</span></span>
                  </span>
                  <Btn k="tint" sm onClick={() => open({ type: "review", pid, rid: r.id })}>Review</Btn>
                </div>
              );
            })}
          </div>
        ) : <Empty I={Check} title="All reports reviewed" body="New uploads from your patients appear here." />}
      </section>
      <aside className="lg:col-span-2 mt-8 lg:mt-0">
        <H>Reviewed today</H>
        {done.length ? (
          <div className="grp">
            {done.map(({ pid, r }) => (
              <button key={pid + r.id} className="row press text-left" onClick={() => open({ type: "report", pid, rid: r.id })}>
                <span className="ico ico-leaf"><BadgeCheck size={18} /></span>
                <span className="flex-1 min-w-0"><b className="block truncate">{r.title}</b><span className="block text-sm ink3 truncate">{db[pid].name}</span></span>
                <ChevronRight size={20} className="ink3 flex-none" />
              </button>
            ))}
          </div>
        ) : <p className="text-sm ink3">Reports you mark reviewed show here. The patient sees "Reviewed by {DOC.name}" and the trend for that test.</p>}
      </aside>
    </div>
  );
}
function SxQueue({ items }) {
  const { db, openChart } = useA();
  const done = careIds(db).flatMap((pid) => db[pid].symptoms.filter((s) => s.st === "rev" && s.on === TODAY).map((s) => ({ pid, s })));
  return (
    <div className="lg:grid lg:grid-cols-5 lg:gap-10">
      <section className="lg:col-span-3 flex flex-col gap-4">
        <p className="lock-note"><Info size={18} className="flex-none mt-0.5" /><span>Patients are told this isn't watched around the clock, and to call 112 or casualty in an emergency.</span></p>
        {items.length ? items.map(({ pid, s }, i) => <SxCard key={pid + s.id} pid={pid} s={s} i={i} />) : <Empty I={Check} title="No symptoms waiting" body="When a patient reports a symptom, it shows here and in their chart." />}
      </section>
      <aside className="lg:col-span-2 mt-8 lg:mt-0">
        <H>Seen today</H>
        {done.length ? (
          <div className="grp">
            {done.map(({ pid, s }) => (
              <button key={pid + s.id} className="row press text-left" onClick={() => openChart(pid)}>
                <span className="ico ico-leaf"><Check size={18} /></span>
                <span className="flex-1 min-w-0"><b className="block truncate">{db[pid].name}</b><span className="block text-sm ink3 truncate">{s.outcome || s.text}</span></span>
                <ChevronRight size={20} className="ink3 flex-none" />
              </button>
            ))}
          </div>
        ) : <p className="text-sm ink3">Symptoms you mark seen show here. The patient sees "Seen by {DOC.name}" and nothing else.</p>}
      </aside>
    </div>
  );
}
function SxCard({ pid, s, i }) {
  const { db, open, openChart } = useA();
  const p = db[pid];
  return (
    <article className="note spring" style={{ "--i": i }}>
      <div className="flex items-center gap-3">
        <Av name={p.name} s={40} />
        <span className="flex-1 min-w-0"><b className="block truncate">{p.name}</b><span className="block text-sm ink3">{p.age}, {p.sex}, {p.mrn}</span></span>
        <Tag tone={s.wait >= 3 ? "lat" : "zari"} icon={Clock}>Waiting {days(s.wait)}</Tag>
      </div>
      <p className="quote mt-4">{s.text}</p>
      <div className="flex flex-wrap gap-2 mt-3"><Tag tone={SEV[s.sev]}>{cap(s.sev)}</Tag><Tag>Since {s.since}</Tag><Tag>Sent {s.d}</Tag></div>
      <div className="flex flex-wrap gap-2 mt-4">
        <Btn sm onClick={() => open({ type: "symptom", pid, sid: s.id })}><Check size={16} />Mark seen</Btn>
        <Btn k="sec" sm onClick={() => openChart(pid)}>Open chart</Btn>
      </div>
    </article>
  );
}

/* ───────── Report, symptom, emergency and correction sheets ───────── */
function Paper({ r, p }) {
  const pp = r.paper;
  return (
    <div className="paperwrap">
      <div className={cls("paper", r.photo && "photo")}>
        <div className="flex items-start justify-between gap-3"><b style={{ fontSize: ".95rem" }}>{pp ? pp.lab : r.src}</b><span className="flex-none">{r.up}</span></div>
        <div className="paper-meta"><span>{p.name}</span><span>{p.age} / {p.sex === "female" ? "F" : "M"}</span></div>
        <p className="font-semibold mt-3" style={{ fontSize: ".9rem" }}>{r.title}</p>
        {pp && pp.rows && (
          <table>
            <thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference</th></tr></thead>
            <tbody>{pp.rows.map((x, i) => <tr key={i}><td>{x[0]}</td><td><b>{x[1]}</b></td><td>{x[2]}</td><td>{x[3]}</td></tr>)}</tbody>
          </table>
        )}
        {pp && pp.text && <div className="mt-3 flex flex-col gap-1.5">{pp.text.map((x, i) => <p key={i}>{x}</p>)}</div>}
        {!pp && <div className="mt-4 flex flex-col gap-2">{[92, 78, 85, 60, 88, 70].map((w, i) => <span key={i} className="pline" style={{ width: w + "%" }} />)}</div>}
      </div>
      <p className="text-sm ink3 mt-4 text-center">{r.photo ? "Photo taken by the patient. " : ""}Files open through links that work for 60 seconds.</p>
    </div>
  );
}
function RevSheet({ pid, rid, close }) {
  const { db, chart, reviewReport, openChart, toast } = useA();
  const p = db[pid], r = p && p.reports.find((x) => x.id === rid);
  const tpl = TPL[(r && r.tpl) || "other"] || TPL.other;
  const [vals, setVals] = useState(() => tpl.map(() => ""));
  const [busy, setBusy] = useState(false);
  if (!r) return null;
  if (r.st !== "wait") return <ReportView pid={pid} rid={rid} close={close} />;
  const num = r.tpl !== "other";
  const setV = (i) => (v) => setVals(vals.map((x, j) => (j === i ? v : x)));
  const save = () => {
    setBusy(true);
    setTimeout(() => { reviewReport(pid, rid, tpl.map(([k, u], i) => [k, vals[i].trim(), u]).filter((x) => x[1])); close(); }, 450);
  };
  return (
    <Sheet title={`Review: ${r.title}`} onClose={close} size="x">
      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        <Paper r={r} p={p} />
        <div className="mt-6 lg:mt-0">
          <div className="flex items-center gap-3"><Av name={p.name} s={44} /><span className="min-w-0"><b className="block truncate">{p.name}</b><span className="block text-sm ink3">{p.age}, {p.sex}, {p.mrn}</span></span></div>
          <p className="text-sm ink2 mt-3">{srcText(r)} on {r.up}, waiting {days(r.wait)}.</p>
          <h3 className="h3 mt-6">Key values</h3>
          <p className="text-sm ink3 mt-1">Optional. What you type here builds the patient's trend.</p>
          <div className={cls("mt-3", num && "grid grid-cols-2 gap-3")}>
            {tpl.map(([k, u], i) => (num
              ? <MiniNum key={k} id={"kv" + i} label={k} unit={u} v={vals[i]} set={setV(i)} step="0.1" />
              : <TextF key={k} id={"kv" + i} label={k} value={vals[i]} set={setV(i)} ph="Main finding, in a few words" />))}
          </div>
          <p className="lock-note mt-5"><Eye size={18} className="flex-none mt-0.5" /><span>The patient will see "Reviewed by {DOC.name}". There's no messaging in this version, so talk through results at the visit.</span></p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Btn className="flex-1" disabled={busy} onClick={save}>{busy ? <><span className="spin" />Saving</> : <><Check size={18} />Mark reviewed</>}</Btn>
            {chart !== pid && <Btn k="sec" onClick={() => { close(); openChart(pid); }}>Open chart</Btn>}
          </div>
          <button className="link text-sm mt-5 text-left" onClick={() => toast("Flagged. The front desk will check it with the patient.")}>Not this patient's report? Flag it for the desk</button>
        </div>
      </div>
    </Sheet>
  );
}
function ReportView({ pid, rid, close }) {
  const { db, open, toast } = useA();
  const p = db[pid], r = p && p.reports.find((x) => x.id === rid);
  if (!r) return null;
  return (
    <Sheet title={r.title} onClose={close} size="x">
      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        <Paper r={r} p={p} />
        <div className="mt-6 lg:mt-0">
          <p className="ink2">{p.name}. {srcText(r)} on {r.up}.</p>
          {r.st === "rev" ? <div className="revby mt-4"><BadgeCheck size={20} className="flex-none" /><span>Reviewed by {r.by} on {r.on}</span></div> : <div className="mt-4"><Tag tone="zari" icon={Clock}>Waiting for review</Tag></div>}
          {r.vals && r.vals.length > 0 && (
            <>
              <h3 className="h3 mt-6 mb-2">Key values</h3>
              <div className="grp">
                {r.vals.map(([k, v, u], i) => (
                  <div key={i} className="row">
                    <span className="flex-1 min-w-0 font-semibold">{k}</span>
                    <span className="text-right">{isNumVal(v) ? <><span className="num text-xl">{v}</span>{u ? <span className="text-sm ink3"> {u}</span> : null}</> : <span>{v}</span>}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {r.st === "rev" && !(r.vals && r.vals.length) && <p className="text-sm ink3 mt-4">No key values were typed for this report.</p>}
          <Btn k="sec" className="w-full mt-6" onClick={() => toast("Opening a secure link that works for 60 seconds")}><Eye size={18} />Open file</Btn>
          {r.st === "wait" && p.care && <Btn className="w-full mt-3" onClick={() => open({ type: "review", pid, rid })}>Review now</Btn>}
        </div>
      </div>
    </Sheet>
  );
}
function SymptomSheet({ pid, sid, close }) {
  const { db, seeSymptom } = useA();
  const p = db[pid], s = p && p.symptoms.find((x) => x.id === sid);
  const [acts, setActs] = useState([]);
  const [note, setNote] = useState("");
  if (!s) return null;
  const tog = (o) => setActs(acts.includes(o) ? acts.filter((x) => x !== o) : [...acts, o]);
  return (
    <Sheet title="Mark symptom as seen" onClose={close} size="w">
      <div className="flex items-center gap-3">
        <Av name={p.name} s={44} />
        <span className="flex-1 min-w-0"><b className="block truncate">{p.name}</b><span className="block text-sm ink3">{p.age}, {p.sex}, {p.mrn}</span></span>
        <a className="btn btn-sec btn-sm press" href={"tel:" + p.phone.replace(/\s/g, "")}><Phone size={16} />Call</a>
      </div>
      <p className="quote mt-4">{s.text}</p>
      <div className="flex flex-wrap gap-2 mt-3"><Tag tone={SEV[s.sev]}>{cap(s.sev)}</Tag><Tag>Since {s.since}</Tag><Tag>Sent {s.d}</Tag></div>
      {s.sev === "severe" && <div className="warn mt-4"><AlertTriangle size={20} className="flex-none" /><p>The patient marked this as severe.</p></div>}
      <p className="lbl mt-6">What did you do?</p>
      <div className="flex flex-wrap gap-2">{SX_DONE.map((o) => <button key={o} type="button" className={cls("chip press", acts.includes(o) && "on")} aria-pressed={acts.includes(o)} onClick={() => tog(o)}>{acts.includes(o) && <Check size={16} />}{o}</button>)}</div>
      <div className="mt-5"><TextF id="sxn" label="Note for the chart (optional)" value={note} set={setNote} area rows={2} ph="Only staff can see this" /></div>
      <p className="text-sm ink3 mt-3">The patient sees "Seen by {DOC.name}". Nothing else is sent to them.</p>
      <Btn className="w-full mt-6" onClick={() => { seeSymptom(pid, sid, [...acts, note.trim()].filter(Boolean).join(". ")); close(); }}><Check size={18} />Mark seen</Btn>
    </Sheet>
  );
}
function GlassSheet({ pid, close }) {
  const { db, grantGlass } = useA();
  const p = db[pid];
  const [why, setWhy] = useState("");
  const [ok, setOk] = useState(false);
  const until = clockAt(Date.now() + 4 * 3600 * 1000);
  const valid = why.trim().length >= 10 && ok;
  return (
    <Sheet title="Emergency access" onClose={close}>
      <div className="flex items-center gap-3">
        <Av name={p.name} s={44} />
        <span className="min-w-0"><b className="block truncate">{p.name}</b><span className="block text-sm ink3">{p.mrn}. Under {p.owner}, {p.dept}.</span></span>
      </div>
      <div className="warn mt-5"><ShieldAlert size={20} className="flex-none" /><p>Use this only when you need the record to treat this patient now. Your reason and every record you open are logged, and the hospital admin is alerted straight away.</p></div>
      <div className="mt-6"><TextF id="gw" label="Reason" value={why} set={setWhy} area rows={2} ph="For example: in casualty with chest pain, need his medicine list" hint="At least 10 characters. The admin reads this." /></div>
      <div className="flex flex-wrap gap-2 mt-3">{GLASS_WHY.map((w) => <button key={w} type="button" className={cls("chip press", why === w && "on")} aria-pressed={why === w} onClick={() => setWhy(w)}>{w}</button>)}</div>
      <p className="flex items-center gap-2 text-sm ink2 mt-5"><Timer size={16} className="flex-none" />Access ends at {until}, 4 hours from now.</p>
      <label className="check mt-5"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /><span>I understand this access is logged and reviewed.</span></label>
      <Btn k="danger" className="w-full mt-6" disabled={!valid} onClick={() => { grantGlass(pid, why.trim()); close(); }}><ShieldAlert size={18} />Open chart for 4 hours</Btn>
    </Sheet>
  );
}
function AddendumSheet({ pid, vid, close }) {
  const { db, addAddendum } = useA();
  const p = db[pid], v = p && p.visits.find((x) => x.id === vid);
  const [why, setWhy] = useState("Wrong detail");
  const [txt, setTxt] = useState("");
  if (!v) return null;
  return (
    <Sheet title="Add a correction" onClose={close} size="w">
      <p className="lock-note"><Lock size={18} className="flex-none mt-0.5" /><span>The note from {v.date} stays exactly as signed. Your correction appears below it with your name and the time. Other doctors and the patient see both.</span></p>
      <div className="note mt-4"><dl><dt style={{ marginTop: 0 }}>Findings</dt><dd>{v.found}</dd><dt>Plan</dt><dd>{v.plan}</dd></dl></div>
      <p className="lbl mt-6">What kind of correction?</p>
      <Seg sm val={why} set={setWhy} label="Kind of correction" opts={[["Wrong detail", "Wrong detail"], ["Missing detail", "Missing detail"], ["Other", "Other"]]} />
      <div className="mt-5"><TextF id="adt" label="Correction" value={txt} set={setTxt} area rows={3} ph="For example: atorvastatin is to be taken at night, not in the morning." /></div>
      <Btn className="w-full mt-6" disabled={txt.trim().length < 5} onClick={() => { addAddendum(pid, vid, why, txt.trim()); close(); }}><BadgeCheck size={18} />Sign correction</Btn>
    </Sheet>
  );
}

/* ───────── Patient chart ───────── */
function ChartS() {
  const { db, chart, glassOn, ctab, setCtab } = useA();
  const p = db[chart];
  if (!p) return null;
  if (!p.care && !glassOn(chart)) return <NoAccess pid={chart} />;
  const n = p.chg.length;
  const T = { changes: Changes, visits: ChartVisits, readings: ChartReadings, reports: ChartReports, meds: ChartMeds, plan: ChartPlan }[ctab] || Changes;
  return (
    <>
      <ChartHead pid={chart} />
      <div className="hscroll flex gap-2 mt-7 -mx-5 px-5 lg:mx-0 lg:px-0" role="tablist" aria-label="Chart sections">
        {CTABS.map(([v, l]) => (
          <button key={v} role="tab" aria-selected={ctab === v} className={cls("pill press", ctab === v && "on")} onClick={() => setCtab(v)}>{l}{v === "changes" && n > 0 && <span className="pill-n">{n}</span>}</button>
        ))}
      </div>
      <div key={ctab} className="fadein mt-6"><T pid={chart} /></div>
    </>
  );
}
function NoteBtn({ pid, sm, className }) {
  const { db, drafts, clinic, startNote, noteFor } = useA();
  const p = db[pid];
  if (p.signedToday) return <Tag tone="leaf" icon={BadgeCheck}>Note signed today at {p.signedToday}</Tag>;
  const dr = (drafts[pid] && drafts[pid].saved && !drafts[pid].done) || noteFor === pid;
  const today = clinic.some((a) => a.id === pid && a.st !== "cancel");
  return <Btn sm={sm} className={className} onClick={() => startNote(pid)}><Pencil size={sm ? 16 : 18} />{dr ? "Continue today's note" : today ? "Start today's note" : "Start a note"}</Btn>;
}
function ChartHead({ pid }) {
  const { db, tab, closeChart, glassOn, endGlass } = useA();
  const p = db[pid], g = glassOn(pid);
  const act = p.conds.filter((c) => c.on), past = p.conds.filter((c) => !c.on);
  return (
    <div className="pt-3 lg:pt-0">
      <button className="back press" onClick={closeChart}><ChevronLeft size={20} />{LBL[tab]}</button>
      {g && (
        <div className="ebanner mt-2 mb-6" role="alert">
          <ShieldAlert size={22} className="flex-none" />
          <div className="flex-1 min-w-0"><b className="block">Emergency access until {g.until}</b><span className="block text-sm">Reason: {g.reason}. The admin was alerted at {g.at}. View only.</span></div>
          <Btn k="light" sm onClick={() => endGlass(pid)}>End access now</Btn>
        </div>
      )}
      <div className="flex flex-wrap items-start gap-4 mt-2">
        <Av name={p.name} s={56} />
        <div className="flex-1 min-w-0">
          <h1 className="disp h1">{p.name}</h1>
          <p className="ink2 mt-1">{p.age}, {p.sex}, {p.mrn}, {p.phone}</p>
          <p className="text-sm ink3 mt-1">{p.last ? `Last visit ${p.last}.` : "New patient."} Next visit: {p.next}.</p>
        </div>
        {!g && <div className="w-full sm:w-auto"><NoteBtn pid={pid} className="w-full sm:w-auto" /></div>}
      </div>
      <div className="mt-5"><Allergy p={p} /></div>
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {act.length ? act.map((c) => <span key={c.n} className="cond">{c.n}</span>) : <span className="text-sm ink3">No conditions recorded yet.</span>}
        {past.length > 0 && <span className="text-sm ink3 ml-1">Past: {past.map((c) => c.n.toLowerCase()).join(", ")}</span>}
      </div>
      <p className="flex items-center gap-2 text-sm ink3 mt-4"><Eye size={14} className="flex-none" />{g ? "Every record you open is logged against your emergency access." : `In your care team until ${p.until}. Every chart opening is logged.`}</p>
    </div>
  );
}
function NoAccess({ pid }) {
  const { db, tab, open, closeChart } = useA();
  const p = db[pid];
  return (
    <div className="pt-3 lg:pt-0 max-w-lg">
      <button className="back press" onClick={closeChart}><ChevronLeft size={20} />{LBL[tab]}</button>
      <h1 className="disp h1 mt-2">{p.name}</h1>
      <p className="ink2 mt-1">{p.mrn}, {p.phone}</p>
      <div className="note-card mt-6">
        <span className="ico ico-mist"><Lock size={20} /></span>
        <div>
          <h2 className="h3">Not in your care team</h2>
          <p className="text-sm ink2 mt-1">You can see contact details only. If you need this record to treat the patient now, use emergency access.</p>
          <Btn k="dline" sm className="mt-4" onClick={() => open({ type: "glass", pid })}><ShieldAlert size={16} />Emergency access</Btn>
        </div>
      </div>
    </div>
  );
}
function Changes({ pid }) {
  const { db, open, setCtab, setMetric } = useA();
  const p = db[pid], care = p.care;
  if (!p.last) return <Empty I={User} title="First visit" body="There's no earlier visit to compare with. Today's note becomes the first entry in this chart." act={care ? <div className="mt-4"><NoteBtn pid={pid} sm /></div> : null} />;
  const items = p.chg.map((c) => {
    if (c.k === "report") {
      const r = p.reports.find((x) => x.id === c.ref);
      return { c, I: FileText, tone: "new", title: `New report: ${r.title}`, sub: `${srcText(r)}. ${r.st === "wait" ? `Waiting ${days(r.wait)} for review.` : `Reviewed by ${r.by === DOC.name ? "you" : r.by} on ${r.on}.`}`, act: r.st === "wait" && care ? ["Review", () => open({ type: "review", pid, rid: r.id })] : ["View", () => open({ type: "report", pid, rid: r.id })] };
    }
    if (c.k === "reading") {
      const L = readLine(p, c.m);
      return { c, I: MET[c.m][0], tone: L.hot ? "hot" : "ok", title: L.title, sub: L.sub ? L.sub + "." : "", act: ["See trend", () => { setMetric(c.m); setCtab("readings"); }] };
    }
    if (c.k === "symptom") {
      const s = p.symptoms.find((x) => x.id === c.ref);
      return { c, I: MessageSquare, tone: s.sev === "severe" ? "hot" : "new", title: `Patient reported: ${s.text}`, sub: `${cap(s.sev)}, since ${s.since}. ${s.st === "rev" ? `Seen by ${s.by === DOC.name ? "you" : s.by} on ${s.on}.` : `Not seen yet, sent ${s.d}.`}`, act: s.st === "wait" && care ? ["Mark seen", () => open({ type: "symptom", pid, sid: s.id })] : null };
    }
    return { c, I: c.k === "missed" ? Clock : Pill, tone: c.k === "missed" ? "hot" : "", title: c.text, sub: c.sub ? c.sub + "." : "" };
  });
  return (
    <div className="lg:grid lg:grid-cols-5 lg:gap-10">
      <section className="lg:col-span-3" aria-label="What changed since the last visit">
        {!items.length && <p className="ink2 mb-6">{p.signedToday ? "Nothing new since today's signed note." : `Nothing new since the visit on ${p.lastShort}.`}</p>}
        <ol>
          {items.map((x, i) => (
            <li key={x.c.id} className="chg-i spring" style={{ "--i": i }}>
              <span className="chg-d">{x.c.d}</span>
              <span className={cls("chg-n", x.tone)}><x.I size={13} /></span>
              <div className="min-w-0">
                <b className="block">{x.title}</b>
                {x.sub && <span className="block text-sm ink2 mt-0.5">{x.sub}</span>}
                {x.act && <Btn k="tint" sm className="mt-2" onClick={x.act[1]}>{x.act[0]}</Btn>}
              </div>
            </li>
          ))}
          <li className="chg-end">
            <span className="chg-d">{cap(p.lastShort)}</span>
            <span className="chg-n"><BadgeCheck size={13} /></span>
            <span className="text-sm ink2 font-semibold">{p.signedToday ? "Today's note" : "Last visit"}, signed by {p.visits[0] ? p.visits[0].doc : DOC.name}</span>
          </li>
        </ol>
      </section>
      <aside className="lg:col-span-2 mt-8 lg:mt-0 flex flex-col gap-6">
        <MiniTiles pid={pid} />
        {p.plan && <PlanBars plan={p.plan} title={`Keeping to the plan since ${p.plan.from}`} />}
      </aside>
    </div>
  );
}
function MiniTiles({ pid }) {
  const { db, setMetric, setCtab } = useA();
  const p = db[pid];
  const ks = ["bp", "sugar", "weight", "a1c"].filter((k) => p.readings[k] && p.readings[k].length);
  if (!ks.length) return null;
  return (
    <section>
      <H>Latest readings</H>
      <div className="grid grid-cols-2 gap-3">
        {ks.map((k) => {
          const arr = p.readings[k], last = arr[arr.length - 1], [I, u, nm] = MET[k], hot = isHigh(k, last.v, p.tg);
          return (
            <button key={k} className="tile press" onClick={() => { setMetric(k); setCtab("readings"); }}>
              <span className="flex items-center gap-2 text-sm ink2 font-medium"><I size={16} className={hot ? "lat" : "leaf"} />{nm}</span>
              <span className="mt-2"><span className="num text-2xl">{fmtV(k, last.v)}</span> <span className="text-sm ink3">{u}</span></span>
              <Spark data={arr.map((r) => (k === "bp" ? r.v[0] : r.v))} hot={hot} />
              <span className="text-sm ink3 mt-1">{last.d}, {last.s === "y" ? "patient" : "hospital"}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
function PlanBars({ plan, title }) {
  const logs = plan.logs.filter((l) => l.of > 0);
  return (
    <section className="grp p-5">
      <h2 className="h3">{title}</h2>
      {plan.doses[1] > 0 ? <Bar l="Medicine doses marked taken" a={plan.doses[0]} b={plan.doses[1]} /> : <p className="text-sm ink3 mt-2">Nothing due yet.</p>}
      {logs.map((l) => <Bar key={l.k} l={`${l.n} checks done`} a={l.done} b={l.of} />)}
      <p className="text-sm ink3 mt-4">Counted from what the patient marks in the app.</p>
    </section>
  );
}
function ChartReadings({ pid }) {
  const { db, metric, setMetric } = useA();
  const p = db[pid];
  const ks = ["bp", "sugar", "weight", "a1c"].filter((k) => p.readings[k] && p.readings[k].length);
  const k = ks.includes(metric) ? metric : ks[0];
  if (!k) return <Empty I={HeartPulse} title="No readings yet" body="Readings show here when the patient logs them at home or a report is reviewed." />;
  const arr = p.readings[k], last = arr[arr.length - 1], u = MET[k][1], tt = targetText(k, p.tg), hi = isHigh(k, last.v, p.tg);
  return (
    <>
      <div className="flex flex-wrap gap-2">{ks.map((x) => <button key={x} className={cls("chip press", k === x && "on")} aria-pressed={k === x} onClick={() => setMetric(x)}>{MET[x][2]}</button>)}</div>
      <div className="lg:grid lg:grid-cols-5 lg:gap-8 mt-5">
        <section className="lg:col-span-3 grp p-5 self-start">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="ink2 text-sm font-medium">Latest, {last.d}, {last.s === "y" ? "patient-reported" : "at the hospital"}</p>
              <p className="mt-1"><span key={k} className="num big-num kin2">{fmtV(k, last.v)}</span> <span className="ink3">{u}</span></p>
            </div>
            {tt && <Tag tone={hi ? "lat" : "leaf"}>{hi ? "Outside target" : "In target"}</Tag>}
          </div>
          {tt ? <p className="text-sm ink3 mt-2">Target {tt}.</p> : k !== "weight" && <p className="text-sm ink3 mt-2">No target set.</p>}
          <div className="mt-4"><Chart k={k} arr={arr} tg={p.tg} /></div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm ink2">
            <span className="flex items-center gap-2"><span className="lg-dot fill" />Hospital</span>
            <span className="flex items-center gap-2"><span className="lg-dot" />Patient-reported</span>
            {k === "bp" && <span>Dark line: upper. Light line: lower.</span>}
          </div>
        </section>
        <section className="lg:col-span-2 mt-8 lg:mt-0">
          <H>History</H>
          <div className="grp">
            {[...arr].reverse().map((r, i) => (
              <div key={i} className="row">
                <div className="flex-1"><b>{fmtV(k, r.v)} <span className="text-sm ink3 font-normal">{u}</span></b><span className="block text-sm ink3">{r.d}</span></div>
                {r.nw && <Tag tone="zari">New</Tag>}
                <Tag tone={r.s === "y" ? "mist" : "leaf"}>{r.s === "y" ? "Patient" : "Hospital"}</Tag>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
function ChartReports({ pid }) {
  const { db, open } = useA();
  const p = db[pid];
  if (!p.reports.length) return <Empty I={FileText} title="No reports yet" body="Lab results from the hospital and uploads from the patient appear here." />;
  const wait = p.reports.filter((r) => r.st === "wait"), rev = p.reports.filter((r) => r.st === "rev");
  const row = (r) => {
    const I = repIcon(r);
    return (
      <button key={r.id} className="row press text-left" onClick={() => open({ type: r.st === "wait" && p.care ? "review" : "report", pid, rid: r.id })}>
        <span className={cls("ico", r.st === "wait" ? "ico-zari" : "ico-leaf")}><I size={20} /></span>
        <span className="flex-1 min-w-0">
          <b className="block truncate">{r.title}</b>
          <span className="block text-sm ink3 truncate">{srcText(r)}, {r.up}</span>
          <span className="block mt-1.5">{r.st === "wait" ? <Tag tone="zari" icon={Clock}>Waiting {days(r.wait)}</Tag> : <Tag tone="leaf" icon={BadgeCheck}>Reviewed by {r.by === DOC.name ? "you" : r.by}</Tag>}</span>
        </span>
        <ChevronRight size={20} className="ink3 flex-none" />
      </button>
    );
  };
  return (
    <div className="lg:grid lg:grid-cols-2 lg:gap-8">
      <section><H>Waiting for review</H>{wait.length ? <div className="grp">{wait.map(row)}</div> : <p className="text-sm ink3">Nothing waiting.</p>}</section>
      <section className="mt-8 lg:mt-0"><H>Reviewed</H>{rev.length ? <div className="grp">{rev.map(row)}</div> : <p className="text-sm ink3">None yet.</p>}</section>
    </div>
  );
}
function ChartVisits({ pid }) {
  const { db, open } = useA();
  const p = db[pid];
  const [o, setO] = useState(p.visits[0] && p.visits[0].id);
  if (!p.visits.length) return <Empty I={Stethoscope} title="No visits yet" body="Signed notes appear here." />;
  return (
    <>
      <p className="lock-note"><Lock size={18} className="flex-none mt-0.5" /><span>Signed notes can't be edited. A correction appears below the original with the doctor's name and the time. The patient sees both.</span></p>
      <div className="flex flex-col gap-4 mt-5 max-w-3xl">
        {p.visits.map((v) => (
          <article key={v.id} className="note">
            <button className="w-full text-left flex items-start gap-3" onClick={() => setO(o === v.id ? null : v.id)} aria-expanded={o === v.id}>
              <span className="ico ico-leaf"><Stethoscope size={20} /></span>
              <span className="flex-1 min-w-0">
                <b className="block">{v.date}</b>
                <span className="block text-sm ink2">{v.doc}, {v.dept}</span>
                <span className="block text-sm ink3">{v.reason}</span>
                {v.restricted && <span className="block mt-1.5"><Tag tone="zari" icon={Lock}>Restricted</Tag></span>}
              </span>
              <ChevronDown size={20} className={cls("ink3 flex-none transition-transform", o === v.id && "rotate-180")} />
            </button>
            {o === v.id && (
              <div className="fadein mt-2">
                <dl>
                  {v.vitals && <><dt>Vitals</dt><dd>{v.vitals}</dd></>}
                  <dt>Reason for visit</dt><dd>{v.reason}</dd>
                  <dt>Findings</dt><dd>{v.found}</dd>
                  {v.dx && <><dt>Diagnoses</dt><dd>{v.dx}</dd></>}
                  {v.meds && <><dt>Medicines</dt><dd>{v.meds}</dd></>}
                  <dt>Plan</dt><dd>{v.plan}</dd>
                </dl>
                <p className="signed"><BadgeCheck size={16} />Signed {v.signed}</p>
                {v.add.map((a, i) => (
                  <div key={i} className="addm">
                    <b className="block text-sm">Correction, {a.on}</b>
                    {a.why && <span className="block text-sm ink2">{a.why}</span>}
                    <p className="mt-1">{a.text}</p>
                    <span className="block text-sm ink3 mt-1">{a.by}</span>
                  </div>
                ))}
                {v.doc === DOC.name && p.care && <Btn k="ghost" sm className="mt-3" onClick={() => open({ type: "addendum", pid, vid: v.id })}><Plus size={16} />Add a correction</Btn>}
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
function ChartMeds({ pid }) {
  const { db } = useA();
  const p = db[pid];
  if (!p.meds.length) return <Empty I={Pill} title="No medicines recorded" body={p.care ? "Prescribe in today's note." : "Nothing prescribed at ABC Hospital."} />;
  const act = p.meds.filter((m) => m.on), past = p.meds.filter((m) => !m.on);
  const row = (m) => (
    <div key={m.id} className="row items-start">
      <span className={cls("ico", m.on ? "ico-leaf" : "ico-mist")}><Pill size={20} /></span>
      <div className="flex-1 min-w-0">
        <b className="block">{m.name} <span className="font-medium ink2">{m.dose}</span></b>
        {m.on ? <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1"><Dots p={m.p} /><span className="text-sm ink2">{cap(m.food || "")}</span></span> : <span className="block text-sm ink2 mt-1">Stopped {m.stop}</span>}
        <span className="block text-sm ink3 mt-1">Since {m.since}</span>
      </div>
    </div>
  );
  return (
    <div className="lg:grid lg:grid-cols-2 lg:gap-8">
      <section>
        <H>Active</H>
        {act.length ? <div className="grp">{act.map(row)}</div> : <p className="text-sm ink3">None active.</p>}
        {p.care && <p className="lock-note mt-4"><Pencil size={18} className="flex-none mt-0.5" /><span>Change, stop or add medicines in today's note.</span></p>}
      </section>
      {past.length > 0 && <section className="mt-8 lg:mt-0"><H>Stopped</H><div className="grp">{past.map(row)}</div></section>}
    </div>
  );
}
function ChartPlan({ pid }) {
  const { db } = useA();
  const p = db[pid], pl = p.plan;
  if (!pl) return <Empty I={ClipboardList} title="No care plan yet" body={p.care ? "Build one in today's note: medicine times, tests, home readings and the follow-up date." : "This patient has no care plan at ABC Hospital."} act={p.care && !p.signedToday ? <div className="mt-4"><NoteBtn pid={pid} sm /></div> : null} />;
  return (
    <>
      <p className="ink2">From the visit on {pl.from}. Review due {pl.review}.</p>
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 mt-5">
        <div className="flex flex-col gap-6">
          <PlanBars plan={pl} title="Keeping to the plan" />
          {pl.tests.length > 0 && (
            <section>
              <H>Tests</H>
              <div className="grp">{pl.tests.map((t, i) => <div key={i} className="row"><span className="ico ico-leaf"><FlaskConical size={18} /></span><span className="flex-1 min-w-0"><b className="block">{t.n}</b><span className="block text-sm ink3">Due {t.due}. {t.st}.</span></span></div>)}</div>
            </section>
          )}
        </div>
        <div className="flex flex-col gap-6 mt-6 lg:mt-0">
          {pl.logs.length > 0 && (
            <section>
              <H>Home readings</H>
              <div className="grp">{pl.logs.map((l) => <div key={l.k} className="row"><span className="ico ico-leaf"><HeartPulse size={18} /></span><span className="flex-1 min-w-0"><b className="block">{l.n}</b><span className="block text-sm ink3">{l.when}</span></span></div>)}</div>
            </section>
          )}
          {pl.instr.length > 0 && (
            <section>
              <H>Instructions</H>
              <div className="grp">{pl.instr.map((x, i) => <div key={i} className="row items-start"><span className="flex-none mt-2 rounded-full" style={{ width: 8, height: 8, background: "var(--leaf)" }} /><p>{x}</p></div>)}</div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}



/* ═══════ PART 2C: paste below part 2 ═══════ */
const CSS3 = `
@media(min-width:1280px){.narrow .lg\\:grid{display:block}.narrow .lg\\:mt-0{margin-top:1.75rem}}
.abc .warn.flex-col{gap:6px}
.cmp-overlay{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;background:#fff;animation:up .45s cubic-bezier(.22,1.15,.36,1) both}
.cmp-overlay .cmp-foot{padding-bottom:calc(12px + env(safe-area-inset-bottom))}
`;
const FUS = [["2w", "2 weeks"], ["4w", "4 weeks"], ["6w", "6 weeks"], ["3m", "3 months"], ["pick", "Pick a date"]];
const shortD = (x) => fmtD(x).replace(/ \d{4}$/, "");
const fuOf = (d) => (d.fu === "pick" && d.fuDate ? fromIso(d.fuDate) : addDays(FU[d.fu] || 28));
const testDue = (d) => { const f = fuOf(d); return new Date(f.getFullYear(), f.getMonth(), f.getDate() - 3); };
const vitText = (d) => { const v = d.vit, o = []; if (v.sys && v.dia) o.push(`BP ${v.sys}/${v.dia} mmHg`); if (v.pulse) o.push(`pulse ${v.pulse}/min`); if (v.wt) o.push(`weight ${v.wt} kg`); return o.join(", "); };
const dxText = (d) => d.dx.map((x) => (x.on ? x.n : `${x.n} (resolved)`)).join(", ");
const autoPlan = (d) => [`Medicines: ${medSummary(d)}.`, d.tests.length ? `Tests before the next visit: ${d.tests.join(", ")}.` : "", `Follow-up ${fmtD(fuOf(d))}.`].filter(Boolean).join(" ");
const noteIssues = (d) => {
  const o = [];
  if (!d.reason.trim()) o.push([0, "Add the reason for the visit"]);
  if (!d.findings.trim()) o.push([0, "Add your findings"]);
  d.meds.forEach((m) => { if (m.act === "change" && !String(m.ndose || "").trim()) o.push([1, `Add the new dose of ${m.name}`]); });
  d.add.forEach((m) => { if (!m.dose.trim()) o.push([1, `Add a dose for ${m.name}`]); if (!m.p.some(Boolean)) o.push([1, `Choose when ${m.name} is taken`]); });
  return o;
};
const stepDone = (d, i) => (d.vis || 0) > i && !noteIssues(d).some(([s]) => s === i);

/* ───────── Today's note ───────── */
function Composer({ pid, overlay }) {
  const { db, drafts, updDraft, closeNote, open, outage } = useA();
  const p = db[pid], d = drafts[pid];
  const body = useRef(null);
  const stepNow = d ? d.step : 0;
  useEffect(() => { if (body.current) body.current.scrollTop = 0; }, [stepNow]);
  if (!p || !d) return null;
  const set = (patch) => updDraft(pid, patch);
  const go = (n) => updDraft(pid, { step: n }, true);
  const blocked = noteIssues(d).length > 0 || outage;
  const Step = [NoteStep, MedStep, PlanStep, SignStep][d.step] || NoteStep;
  const inner = (
    <>
      <div className="zari-band" />
      <div className="cmp-head">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm ink3">Today's note</p>
            <h2 className="h2 truncate">{p.name}</h2>
            <p className="text-sm ink3">{d.saved ? `Draft saved at ${d.saved}` : "Nothing typed yet"}</p>
          </div>
          <button className="icon-btn press" onClick={closeNote} aria-label="Close. The draft is kept."><X size={22} /></button>
        </div>
        <div className="steps mt-3" role="tablist" aria-label="Note steps">
          {STEPS.map((s, i) => {
            const ok = d.step !== i && stepDone(d, i);
            return <button key={s} role="tab" aria-selected={d.step === i} className={cls("stp", d.step === i && "on", ok && "ok")} onClick={() => go(i)}><i>{ok ? <Check size={12} strokeWidth={3} /> : i + 1}</i>{s}</button>;
          })}
        </div>
      </div>
      <div className="cmp-body" ref={body}>
        {outage && <div className="warn mb-5"><WifiOff size={18} className="flex-none" /><p>Can't reach the hospital system. Keep this screen open; you can sign once the connection is back.</p></div>}
        <Step p={p} d={d} set={set} go={go} />
      </div>
      <div className="cmp-foot">
        {d.step > 0 ? <Btn k="sec" onClick={() => go(d.step - 1)}><ChevronLeft size={18} />Back</Btn> : <Btn k="ghost" onClick={() => open({ type: "discard", pid })}><Trash2 size={18} />Discard</Btn>}
        <div className="flex-1" />
        {d.step < 3 ? <Btn onClick={() => go(d.step + 1)}>Next: {STEPS[d.step + 1]}<ChevronRight size={18} /></Btn> : <Btn disabled={blocked} onClick={() => open({ type: "sign", pid })}><BadgeCheck size={18} />Sign note</Btn>}
      </div>
    </>
  );
  return overlay
    ? <div className="cmp-overlay" role="dialog" aria-modal="true" aria-label={`Today's note for ${p.name}`}>{inner}</div>
    : <aside className="composer" aria-label={`Today's note for ${p.name}`}>{inner}</aside>;
}
function NoteStep({ p, d, set }) {
  const hl = homeLine(p);
  const vit = (k) => (v) => set({ vit: { ...d.vit, [k]: v } });
  const addHome = () => set({ findings: (d.findings.trim() ? d.findings.trim() + " " : "") + hl + "." });
  return (
    <div className="flex flex-col gap-6">
      <Allergy p={p} />
      <section>
        <h3 className="h3 mb-2">Vitals</h3>
        <div className="grid grid-cols-2 gap-3">
          <MiniNum id="vs" label="BP upper" unit="mmHg" v={d.vit.sys} set={vit("sys")} />
          <MiniNum id="vd" label="BP lower" unit="mmHg" v={d.vit.dia} set={vit("dia")} />
          <MiniNum id="vp" label="Pulse" unit="/min" v={d.vit.pulse} set={vit("pulse")} />
          <MiniNum id="vw" label="Weight" unit="kg" v={d.vit.wt} set={vit("wt")} step="0.1" />
        </div>
      </section>
      <TextF id="nr" label="Reason for visit" value={d.reason} set={(v) => set({ reason: v })} />
      <TextF id="nf" label="Findings" area rows={4} value={d.findings} set={(v) => set({ findings: v })} ph="History, examination and results"
        right={hl ? <button type="button" className="link text-sm mb-2 inline-flex items-center gap-1" onClick={addHome}><Plus size={14} />Add home readings</button> : null} />
      <section>
        <h3 className="h3">Diagnoses</h3>
        <p className="text-sm ink3 mt-1">Tap one to mark it resolved.</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {d.dx.map((x, i) => <button key={x.n} type="button" className={cls("chip press", x.on && "on")} aria-pressed={x.on} onClick={() => set({ dx: d.dx.map((y, j) => (j === i ? { ...y, on: !y.on } : y)) })}>{x.on && <Check size={16} />}{x.n}{!x.on && <span className="ink3 font-medium">, resolved</span>}</button>)}
        </div>
        <AddLine ph="Add a diagnosis" onAdd={(n) => { if (!d.dx.some((x) => x.n.toLowerCase() === n.toLowerCase())) set({ dx: [...d.dx, { n, on: true }] }); }} />
      </section>
      <TextF id="np" label="Plan, in your words" area rows={3} value={d.plan} set={(v) => set({ plan: v })} ph="Optional. Medicines, tests and the follow-up come from the next steps." />
    </div>
  );
}
function MedStep({ p, d, set }) {
  const upd = (i, x) => set({ meds: d.meds.map((m, j) => (j === i ? { ...m, ...x } : m)) });
  const updN = (i, x) => set({ add: d.add.map((m, j) => (j === i ? { ...m, ...x } : m)) });
  const act = (m, i, v) => upd(i, v === "change" ? { act: v, ndose: m.ndose || m.dose, np: m.np || m.p, nfood: m.nfood || m.food } : { act: v });
  const when = (v, s) => <div><p className="text-sm font-semibold ink2 mb-1.5">When to take</p><DoseToggle p={v} set={s} /></div>;
  const food = (v, s) => <div><p className="text-sm font-semibold ink2 mb-1.5">With food</p><FoodChips v={v} set={s} /></div>;
  return (
    <div className="flex flex-col gap-6">
      <Allergy p={p} />
      <section>
        <h3 className="h3 mb-3">Current medicines</h3>
        {d.meds.length ? (
          <div className="flex flex-col gap-3">
            {d.meds.map((m, i) => (
              <div key={m.id} className={cls("medc", m.act === "stop" && "stopped")}>
                <b className="nm block">{m.name} <span className="font-medium ink2">{m.dose}</span></b>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1"><Dots p={m.p} /><span className="text-sm ink2">{cap(m.food || "")}</span></span>
                <div className="mt-3"><Seg sm val={m.act} set={(v) => act(m, i, v)} label={`${m.name}: continue, change or stop`} opts={[["continue", "Continue"], ["change", "Change"], ["stop", "Stop"]]} /></div>
                {m.act === "change" && (
                  <div className="flex flex-col gap-4 mt-4">
                    <TextF id={"cd" + m.id} label="New dose" value={m.ndose} set={(v) => upd(i, { ndose: v })} />
                    {when(m.np, (v) => upd(i, { np: v }))}
                    {food(m.nfood, (v) => upd(i, { nfood: v }))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : <p className="text-sm ink3">No current medicines.</p>}
      </section>
      <section>
        <h3 className="h3">Add a medicine</h3>
        <datalist id="drug-list">{DRUGS.map((x) => <option key={x} value={x} />)}</datalist>
        <AddLine ph="Medicine name" list="drug-list" onAdd={(n) => set({ add: [...d.add, { id: "n" + Date.now(), name: cap(n), dose: "", p: [1, 0, 0], food: "after food", since: TODAY }] })} />
        {d.add.map((m, i) => {
          const al = allergyHit(p, m.name), dup = dupHit(d, m.name);
          return (
            <div key={m.id} className="medc mt-3">
              <div className="flex items-center gap-2"><b className="flex-1 min-w-0">{m.name}</b><Tag tone="leaf">New</Tag><button type="button" className="icon-btn" onClick={() => set({ add: d.add.filter((_, j) => j !== i) })} aria-label={`Remove ${m.name}`}><Trash2 size={18} /></button></div>
              {al && <div className="warn mt-3"><AlertTriangle size={18} className="flex-none" /><p>{first(p.name)} is allergic to {al.n.toLowerCase()} ({al.r}). Remove this unless you've checked it's safe.</p></div>}
              {dup && <div className="warn mt-3"><AlertTriangle size={18} className="flex-none" /><p>Already taking {dup.name} {dup.dose}. Change that one instead of adding it twice.</p></div>}
              <div className="flex flex-col gap-4 mt-3">
                <TextF id={"ad" + m.id} label="Dose" value={m.dose} set={(v) => updN(i, { dose: v })} ph="For example: 500 mg" />
                {when(m.p, (v) => updN(i, { p: v }))}
                {food(m.food, (v) => updN(i, { food: v }))}
              </div>
            </div>
          );
        })}
      </section>
      <p className="lock-note"><Info size={18} className="flex-none mt-0.5" /><span>Medicine times become the patient's daily reminders once you sign.</span></p>
    </div>
  );
}
function PlanStep({ d, set }) {
  const tg = (k) => (v) => set({ tg: { ...d.tg, [k]: v } });
  return (
    <div className="flex flex-col gap-7">
      <section>
        <h3 className="h3">Targets</h3>
        <p className="text-sm ink3 mt-1">Home readings outside these are flagged for you and shown to the patient.</p>
        <div className="grid grid-cols-2 gap-3 mt-3">
          <MiniNum id="ts" label="BP upper below" unit="mmHg" v={d.tg.sys} set={tg("sys")} />
          <MiniNum id="td" label="BP lower below" unit="mmHg" v={d.tg.dia} set={tg("dia")} />
          <MiniNum id="tf1" label="Fasting sugar from" unit="mg/dL" v={d.tg.fmin} set={tg("fmin")} />
          <MiniNum id="tf2" label="Fasting sugar to" unit="mg/dL" v={d.tg.fmax} set={tg("fmax")} />
          <MiniNum id="ta" label="HbA1c below" unit="%" v={d.tg.a1c} set={tg("a1c")} step="0.1" />
        </div>
      </section>
      <section>
        <h3 className="h3">Home readings</h3>
        <div className="flex flex-col gap-4 mt-3">
          {["bp", "sugar", "weight"].map((k) => <div key={k}><p className="text-sm font-semibold ink2 mb-1.5">{MET[k][2]}</p><Seg sm val={d.logs[k]} set={(v) => set({ logs: { ...d.logs, [k]: v } })} label={MET[k][2]} opts={FREQ} /></div>)}
        </div>
      </section>
      <section>
        <h3 className="h3">Tests before the next visit</h3>
        <p className="text-sm ink3 mt-1">Due by {shortD(testDue(d))}, three days before the follow-up.</p>
        <div className="flex flex-wrap gap-2 mt-3">
          {TESTS.map((x) => { const on = d.tests.includes(x); return <button key={x} type="button" className={cls("chip press", on && "on")} aria-pressed={on} onClick={() => set({ tests: on ? d.tests.filter((y) => y !== x) : [...d.tests, x] })}>{on && <Check size={16} />}{x}</button>; })}
        </div>
      </section>
      <section>
        <h3 className="h3">Instructions</h3>
        {d.instr.length > 0 && <div className="grp mt-3">{d.instr.map((x, i) => <div key={i} className="row items-start"><p className="flex-1">{x}</p><button type="button" className="icon-btn" onClick={() => set({ instr: d.instr.filter((_, j) => j !== i) })} aria-label="Remove this instruction"><Trash2 size={18} /></button></div>)}</div>}
        <AddLine ph="Add an instruction in plain words" onAdd={(x) => set({ instr: [...d.instr, x] })} />
      </section>
      <section>
        <h3 className="h3">Follow-up</h3>
        <div className="flex flex-wrap gap-2 mt-3">
          {FUS.map(([v, l]) => <button key={v} type="button" className={cls("chip press", d.fu === v && "on")} aria-pressed={d.fu === v} onClick={() => set(v === "pick" ? { fu: v, fuDate: d.fuDate || iso(fuOf(d)) } : { fu: v })}>{l}</button>)}
        </div>
        {d.fu === "pick" && <div className="field mt-3"><input type="date" value={d.fuDate || ""} min={iso(addDays(1))} onChange={(e) => e.target.value && set({ fuDate: e.target.value })} aria-label="Follow-up date" /></div>}
        <p className="text-sm ink2 mt-3">{fmtD(fuOf(d))}. The front desk books the slot, and the patient gets a reminder the day before.</p>
      </section>
    </div>
  );
}
function SignStep({ p, d, set, go }) {
  const issues = noteIssues(d), fm = finalMeds(d), vt = vitText(d), lt = logsText(d);
  return (
    <div className="flex flex-col gap-6">
      {issues.length > 0 && (
        <div className="warn flex-col" role="alert">
          <b>Before you sign</b>
          {issues.map(([s, msg], i) => <div key={i} className="flex items-center justify-between gap-3"><span>{msg}</span><button type="button" className="link text-sm flex-none" onClick={() => go(s)}>Go to {STEPS[s].toLowerCase()}</button></div>)}
        </div>
      )}
      <section>
        <h3 className="h3 mb-2">The note</h3>
        <div className="note">
          <dl>
            {vt && <><dt style={{ marginTop: 0 }}>Vitals</dt><dd>{vt}</dd></>}
            <dt style={vt ? undefined : { marginTop: 0 }}>Reason for visit</dt><dd>{d.reason || "Not added"}</dd>
            <dt>Findings</dt><dd>{d.findings || "Not added"}</dd>
            <dt>Diagnoses</dt><dd>{dxText(d) || "None"}</dd>
            <dt>Medicines</dt><dd>{cap(medSummary(d))}</dd>
            <dt>Plan</dt><dd>{d.plan.trim() || autoPlan(d)}</dd>
          </dl>
        </div>
      </section>
      <section>
        <h3 className="h3 mb-2">What {first(p.name)} will see</h3>
        <div className="ptv">
          <p className="text-sm font-semibold ink2">Medicines</p>
          <div className="flex flex-col gap-2 mt-2">
            {fm.length ? fm.map((m) => <div key={m.id} className="ptv-med"><Pill size={16} className="leaf flex-none" /><span className="flex-1 min-w-0"><b className="block truncate">{m.name} <span className="font-medium ink2">{m.dose}</span></b><span className="text-sm ink2">{cap(m.food || "")}</span></span><Dots p={m.p} /></div>) : <p className="text-sm ink3">None</p>}
          </div>
          {d.tests.length > 0 && <><p className="text-sm font-semibold ink2 mt-4">Tests</p><p className="mt-1">{d.tests.join(", ")}, by {shortD(testDue(d))}</p></>}
          {lt && <><p className="text-sm font-semibold ink2 mt-4">Readings to take</p><p className="mt-1">{cap(lt)}</p></>}
          {d.instr.length > 0 && <><p className="text-sm font-semibold ink2 mt-4">Instructions</p>{d.instr.map((x, i) => <p key={i} className="mt-1">{x}</p>)}</>}
          <p className="text-sm font-semibold ink2 mt-4">Next visit</p><p className="mt-1">{fmtD(fuOf(d))}</p>
        </div>
        <p className="text-sm ink3 mt-2">The patient sees this the next time they open the app. Medicine reminders start tomorrow.</p>
      </section>
      <div className="grp"><div className="row"><span className="flex-1"><b className="block">Restricted note</b><span className="block text-sm ink3">Only doctors in your department and the patient can read it. Linked caregivers can't.</span></span><Sw on={d.restricted} set={(v) => set({ restricted: v })} label="Restricted note" /></div></div>
      <p className="lock-note"><Lock size={18} className="flex-none mt-0.5" /><span>Once signed, the note can't be edited. You can add corrections below it.</span></p>
    </div>
  );
}
function SignSheet({ pid, close }) {
  const { db, signNote } = useA();
  const p = db[pid];
  return (
    <Sheet title="Sign this note?" onClose={close}>
      <p className="ink2">The note locks when you sign. {first(p.name)}'s medicines, care plan and reminders update straight away.</p>
      <div className="flex items-center gap-3 mt-5 p-4 rounded-2xl" style={{ background: "var(--mist)" }}>
        <Av name={DOC.name} s={40} />
        <span className="min-w-0"><b className="block">{DOC.name}</b><span className="block text-sm ink3">Council registration {DOC.reg}, signing at {clock()}</span></span>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-6"><Btn k="sec" onClick={close}>Keep editing</Btn><Btn onClick={() => { close(); signNote(pid); }}><BadgeCheck size={18} />Sign note</Btn></div>
    </Sheet>
  );
}
function DiscardSheet({ pid, close }) {
  const { db, discardDraft } = useA();
  return (
    <Sheet title="Discard this draft?" onClose={close}>
      <p className="ink2">Everything typed in today's note for {db[pid].name} is deleted. Nothing has been sent to the patient.</p>
      <div className="grid grid-cols-2 gap-3 mt-6"><Btn k="sec" onClick={close}>Keep draft</Btn><Btn k="danger" onClick={() => { close(); discardDraft(pid); }}><Trash2 size={18} />Discard</Btn></div>
    </Sheet>
  );
}
function SignOutSheet({ close }) {
  const { signOut, drafts } = useA();
  const n = Object.values(drafts).filter((x) => x.saved).length;
  return (
    <Sheet title="Sign out?" onClose={close}>
      <p className="ink2">Patient details are cleared from this computer.{n ? ` Your ${n} unsigned draft${n > 1 ? "s stay" : " stays"} saved to your account.` : ""}</p>
      <div className="grid grid-cols-2 gap-3 mt-6"><Btn k="sec" onClick={close}>Cancel</Btn><Btn onClick={() => { close(); signOut("Signed out. Patient details were cleared from this computer."); }}><LogOut size={18} />Sign out</Btn></div>
    </Sheet>
  );
}

/* ───────── Account ───────── */
function AccountS() {
  const { db, lock, open, glassLog, prefs, setPrefs } = useA();
  return (
    <>
      <PageHead title="Account" />
      <div className="lg:grid lg:grid-cols-2 lg:gap-10">
        <div className="flex flex-col gap-8">
          <section className="grp p-5">
            <div className="flex items-center gap-4"><Av name={DOC.name} s={60} /><div className="min-w-0"><h2 className="text-xl font-bold">{DOC.name}</h2><p className="ink2">{DOC.dept}</p></div></div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 text-sm">
              <div><dt className="ink3">Council registration</dt><dd className="font-semibold">{DOC.reg}</dd></div>
              <div><dt className="ink3">Email</dt><dd className="font-semibold break-all">{DOC.email}</dd></div>
              <div><dt className="ink3">OP room</dt><dd className="font-semibold">{DOC.room}</dd></div>
              <div><dt className="ink3">Patients in your care team</dt><dd className="font-semibold">{careIds(db).length}</dd></div>
            </dl>
            <p className="text-sm ink3 mt-4">To change these details, contact the hospital admin.</p>
          </section>
          <section>
            <H>Sign-in and security</H>
            <div className="grp">
              <div className="row"><span className="ico ico-leaf"><ShieldCheck size={18} /></span><span className="flex-1 min-w-0"><b className="block">Two-factor sign-in</b><span className="block text-sm ink3">With an authenticator app</span></span><Tag tone="leaf" icon={Check}>On</Tag></div>
              <div className="row"><span className="ico ico-mist"><Timer size={18} /></span><span className="flex-1 min-w-0"><b className="block">Screen lock</b><span className="block text-sm ink3">After 10 idle minutes, set by the hospital</span></span></div>
              <div className="row"><span className="ico ico-mist"><Lock size={18} /></span><span className="flex-1 min-w-0"><b className="block">Lock now</b><span className="block text-sm ink3">Before you step away from a shared computer</span></span><Btn k="tint" sm onClick={lock}>Lock</Btn></div>
            </div>
            <p className="text-sm ink3 mt-2">Lost your phone? The hospital admin can reset two-factor sign-in.</p>
          </section>
        </div>
        <div className="flex flex-col gap-8 mt-8 lg:mt-0">
          <section>
            <H>Email alerts</H>
            <div className="grp">
              <div className="row"><span className="flex-1"><b className="block">New symptoms</b><span className="block text-sm ink3">When one of your patients reports a symptom</span></span><Sw on={prefs.sx} set={(v) => setPrefs({ ...prefs, sx: v })} label="Email me about new symptoms" /></div>
              <div className="row"><span className="flex-1"><b className="block">Morning summary</b><span className="block text-sm ink3">Clinic list and review queue at 8 AM</span></span><Sw on={prefs.am} set={(v) => setPrefs({ ...prefs, am: v })} label="Morning summary email" /></div>
            </div>
            <p className="text-sm ink3 mt-2">Emails never include patient names or health details. Open the app to see them.</p>
          </section>
          <section>
            <H>Your emergency access</H>
            {glassLog.length ? (
              <div className="grp">{glassLog.map((g, i) => <div key={i} className="row items-start"><span className="ico ico-lat"><ShieldAlert size={18} /></span><span className="flex-1 min-w-0"><b className="block">{db[g.pid].name}</b><span className="block text-sm ink2">{g.reason}</span><span className="block text-sm ink3">Today, {g.at} to {g.until}. Admin alerted.</span></span></div>)}</div>
            ) : <p className="text-sm ink3">You haven't used emergency access. Each use is listed here and sent to the admin.</p>}
          </section>
          <div>
            <Btn k="sec" className="w-full" onClick={() => open({ type: "signout" })}><LogOut size={18} />Sign out</Btn>
            <p className="text-sm ink3 text-center mt-4">ABC Hospital staff app, version 1.0</p>
          </div>
        </div>
      </div>
    </>
  );
}

/* ───────── Prototype navigator (not part of the product) ───────── */
function Proto() {
  const A = useA();
  const [o, setO] = useState(false);
  const low = A.step !== "app" || A.locked;
  const inApp = () => { if (A.step !== "app") A.go("app"); if (A.locked) A.unlock(); };
  const G = [
    ["Sign-in and security", [["Staff sign-in", () => A.go("signin")], ["Two-factor code", () => A.go("twofa")], ["Two-factor setup", () => A.go("enroll")], ["Lock screen", () => { inApp(); A.lock(); }], ["Idle warning", () => { inApp(); A.idleSoon(); }]]],
    ["Doctor app", [["Today", () => { inApp(); A.setTab("today"); }], ["Patients", () => { inApp(); A.setTab("patients"); }], ["Review reports", () => { inApp(); A.setRtab("reports"); A.setTab("review"); }], ["Review symptoms", () => { inApp(); A.setRtab("symptoms"); A.setTab("review"); }], ["Account", () => { inApp(); A.setTab("account"); }]]],
    ["Charts", [["Anjali, what changed", () => { inApp(); A.openChart("anjali"); }], ["Anjali, readings", () => { inApp(); A.setMetric("bp"); A.openChart("anjali", "readings"); }], ["Thankamma, weight rising", () => { inApp(); A.openChart("thankamma"); }], ["Vinod, dizzy on new tablet", () => { inApp(); A.openChart("vinod"); }], ["Suresh, first visit", () => { inApp(); A.openChart("suresh"); }], ["Biju, not your patient", () => { inApp(); A.openChart("biju"); }]]],
    ["Today's note", [["Anjali's note", () => { inApp(); A.startNote("anjali"); }], ["Suresh's draft", () => { inApp(); A.startNote("suresh"); }], ["Sign step", () => { inApp(); A.startNote("anjali"); A.updDraft("anjali", { step: 3 }, true); }]]],
    ["Sheets", [["Review a report", () => { inApp(); A.open({ type: "review", pid: "anjali", rid: "r1" }); }], ["Mark a symptom seen", () => { inApp(); A.open({ type: "symptom", pid: "vinod", sid: "s1" }); }], ["Emergency access", () => { inApp(); A.open({ type: "glass", pid: "biju" }); }], ["Add a correction", () => { inApp(); A.open({ type: "addendum", pid: "anjali", vid: "v1" }); }]]],
  ];
  return (
    <>
      <button className={cls("proto-btn press", low && "low")} onClick={() => setO(!o)} aria-expanded={o}><Layers size={16} />Screens</button>
      {o && (
        <div className={cls("proto-panel", low && "low")} role="dialog" aria-label="Prototype screens">
          <div className="flex items-center justify-between"><b>Prototype</b><button className="icon-btn" onClick={() => setO(false)} aria-label="Close"><X size={18} /></button></div>
          <p className="text-xs ink3">Jump to any screen or state. Any 6-digit code signs in; 000000 shows the error.</p>
          {G.map(([h, items]) => (
            <div key={h} className="mt-3">
              <p className="text-xs font-semibold ink3 mb-1">{h}</p>
              <div className="flex flex-wrap gap-1">{items.map(([l, f]) => <button key={l} className="pchip" onClick={() => { f(); setO(false); }}>{l}</button>)}</div>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 mt-4"><span className="text-sm">Hospital system down</span><Sw on={A.outage} set={A.setOutage} label="Outage banner" /></div>
          <button className="pchip mt-3" onClick={() => { A.reset(); setO(false); }}>Reset demo data</button>
        </div>
      )}
    </>
  );
}

/* ───────── App ───────── */
export default function App() {
  const [step, setStep] = useState("signin");
  const [locked, setLocked] = useState(false);
  const [tab, setTabS] = useState("today");
  const [chart, setChart] = useState(null);
  const [ctab, setCtab] = useState("changes");
  const [metric, setMetric] = useState("bp");
  const [rtab, setRtab] = useState("reports");
  const [sheet, setSheet] = useState(null);
  const [msg, setMsg] = useState(null);
  const [outage, setOutage] = useState(false);
  const [db, setDb] = useState(seedAll);
  const [clinic, setClinic] = useState(() => CLINIC0.map((a) => ({ ...a })));
  const [drafts, setDrafts] = useState(DRAFT0);
  const [noteFor, setNoteFor] = useState(null);
  const [glass, setGlass] = useState({});
  const [glassLog, setGlassLog] = useState([]);
  const [prefs, setPrefs] = useState({ sx: true, am: false });
  const [idle, setIdle] = useState(null);
  const last = useRef(Date.now());
  const wide = useMedia("(min-width: 1280px)");

  useEffect(() => { if (!msg) return; const id = setTimeout(() => setMsg(null), 3600); return () => clearTimeout(id); }, [msg]);
  useEffect(() => {
    const bump = () => { last.current = Date.now(); };
    const ev = ["pointerdown", "keydown", "wheel", "touchstart"];
    ev.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => ev.forEach((e) => window.removeEventListener(e, bump));
  }, []);
  useEffect(() => {
    if (step !== "app" || locked) { setIdle(null); return; }
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - last.current) / 1000);
      if (s >= 600) { setIdle(null); setSheet(null); setLocked(true); } else setIdle(s >= 540 ? 600 - s : null);
    }, 1000);
    return () => clearInterval(id);
  }, [step, locked]);

  const toast = (m) => setMsg({ m, k: Date.now() });
  const top = () => window.scrollTo(0, 0);
  const upd = (pid, fn) => setDb((prev) => { const x = { ...prev[pid] }; fn(x); return { ...prev, [pid]: x }; });
  const updDraft = (pid, patch, quiet) => setDrafts((prev) => {
    const cur = prev[pid];
    if (!cur) return prev;
    const n = { ...cur, ...patch };
    if (patch.step != null) n.vis = Math.max(cur.vis || 0, patch.step);
    if (!quiet) n.saved = clock();
    return { ...prev, [pid]: n };
  });
  const dropDraft = (pid) => setDrafts((prev) => { const n = { ...prev }; delete n[pid]; return n; });
  const closeNote = () => {
    const pid = noteFor;
    if (!pid) return;
    setNoteFor(null);
    if (drafts[pid] && drafts[pid].saved) toast("Draft saved. Continue it from the chart or from Today.");
    else dropDraft(pid);
  };
  const go = (s) => { setSheet(null); setStep(s); if (s === "app") { last.current = Date.now(); setLocked(false); } top(); };
  const setTab = (v) => { closeNote(); setChart(null); setSheet(null); setTabS(v); top(); };
  const openChart = (pid, ct) => { if (noteFor && noteFor !== pid) closeNote(); setChart(pid); setCtab(ct || "changes"); setSheet(null); top(); };
  const closeChart = () => { closeNote(); setChart(null); top(); };
  const startNote = (pid) => {
    setDrafts((prev) => (prev[pid] ? prev : { ...prev, [pid]: newDraft(db[pid]) }));
    if (chart !== pid) { setChart(pid); setCtab("changes"); top(); }
    setNoteFor(pid); setSheet(null);
  };
  const signNote = (pid) => {
    const d = drafts[pid], p = db[pid];
    if (!d || !p) return;
    const t = clock(), fu = fuOf(d), fm = finalMeds(d);
    const num = (v) => { const n = parseFloat(v); return isNaN(n) ? undefined : n; };
    const strip = ({ act, ndose, np, nfood, ...rest }) => rest;
    upd(pid, (x) => {
      x.visits = [{ id: "v" + Date.now(), date: TODAY, doc: DOC.name, dept: DOC.dept, reason: d.reason.trim(), found: d.findings.trim(), plan: d.plan.trim() || autoPlan(d), signed: `${TODAY}, ${t}`, add: [], vitals: vitText(d), dx: dxText(d), meds: fm.map((m) => `${m.name} ${m.dose}, ${m.p.join("-")}`).join("; "), restricted: d.restricted }, ...x.visits];
      x.meds = [...fm.map((m) => ({ ...strip(m), on: true })), ...d.meds.filter((m) => m.act === "stop").map((m) => ({ ...strip(m), on: false, stop: TODAY })), ...x.meds.filter((m) => !m.on)];
      x.conds = [...d.dx.map((c) => { const o = x.conds.find((y) => y.n === c.n); return { n: c.n, since: o ? o.since : "Oct 2026", on: c.on }; }), ...x.conds.filter((y) => !y.on && !d.dx.some((c) => c.n === y.n))];
      x.tg = { sys: num(d.tg.sys), dia: num(d.tg.dia), fmin: num(d.tg.fmin), fmax: num(d.tg.fmax), a1c: num(d.tg.a1c) };
      x.plan = { from: TODAY, review: shortD(fu), doses: [0, 0], instr: [...d.instr], tests: d.tests.map((n) => ({ n, due: shortD(testDue(d)), st: "Not done yet" })), logs: Object.entries(d.logs).filter(([, f]) => f !== "off").map(([k, f]) => ({ k, f, n: MET[k][2], when: cap(FREQL[f]), done: 0, of: 0 })) };
      const rd = {};
      Object.entries(x.readings).forEach(([k, arr]) => { rd[k] = arr.map((r) => ({ ...r, nw: 0 })); });
      const s1 = num(d.vit.sys), s2 = num(d.vit.dia), w = num(d.vit.wt);
      if (s1 && s2) rd.bp = [...(rd.bp || []), { d: "15 Oct", v: [s1, s2], s: "h" }];
      if (w) rd.weight = [...(rd.weight || []), { d: "15 Oct", v: w, s: "h" }];
      x.readings = rd;
      Object.assign(x, { chg: [], last: `${TODAY}, ${t}`, lastShort: "today", signedToday: t, next: shortD(fu), overdue: null });
    });
    setClinic((c) => c.map((a) => (a.id === pid ? { ...a, st: "done", at: t } : a)));
    dropDraft(pid); setNoteFor(null); setCtab("changes");
    toast(`Note signed at ${t}. ${first(p.name)}'s plan and reminders are updated.`);
  };
  const discardDraft = (pid) => { dropDraft(pid); setClinic((c) => c.map((a) => (a.id === pid && a.st === "draft" ? { ...a, st: "booked" } : a))); setNoteFor(null); toast("Draft discarded"); };
  const reviewReport = (pid, rid, vals) => {
    const r0 = db[pid].reports.find((r) => r.id === rid), a = vals.find((v) => v[0] === "HbA1c"), n = a ? parseFloat(a[1]) : NaN;
    upd(pid, (x) => {
      x.reports = x.reports.map((r) => (r.id === rid ? { ...r, st: "rev", by: DOC.name, on: TODAY, vals } : r));
      if (!isNaN(n)) x.readings = { ...x.readings, a1c: [...(x.readings.a1c || []), { d: r0.up.split(" ").slice(0, 2).join(" "), v: n, s: "h", nw: 1 }] };
    });
    toast(`Marked reviewed. ${first(db[pid].name)} can see it now.`);
  };
  const seeSymptom = (pid, sid, outcome) => {
    upd(pid, (x) => { x.symptoms = x.symptoms.map((s) => (s.id === sid ? { ...s, st: "rev", by: DOC.name, on: TODAY, outcome } : s)); });
    toast(`Marked seen. ${first(db[pid].name)} sees "Seen by ${DOC.name}".`);
  };
  const addAddendum = (pid, vid, why, text) => {
    upd(pid, (x) => { x.visits = x.visits.map((v) => (v.id === vid ? { ...v, add: [...v.add, { on: `${TODAY}, ${clock()}`, by: DOC.name, why, text }] } : v)); });
    toast("Correction signed. It shows below the original note.");
  };
  const glassOn = (pid) => glass[pid] || null;
  const grantGlass = (pid, reason) => {
    const g = { reason, at: clock(), until: clockAt(Date.now() + 4 * 3600 * 1000) };
    setGlass((x) => ({ ...x, [pid]: g }));
    setGlassLog((l) => [{ pid, ...g }, ...l]);
    openChart(pid);
    toast(`Emergency access until ${g.until}. The admin has been alerted.`);
  };
  const endGlass = (pid) => { setGlass((x) => { const n = { ...x }; delete n[pid]; return n; }); if (chart === pid) closeChart(); toast("Emergency access ended"); };
  const lock = () => { setSheet(null); setLocked(true); };
  const unlock = () => { last.current = Date.now(); setLocked(false); };
  const signOut = (m) => { setNoteFor(null); setChart(null); setSheet(null); setTabS("today"); setLocked(false); setStep("signin"); toast(m || "Signed out"); top(); };
  const idleSoon = () => { last.current = Date.now() - 545000; };
  const reset = () => { setDb(seedAll()); setClinic(CLINIC0.map((a) => ({ ...a }))); setDrafts(DRAFT0()); setGlass({}); setGlassLog([]); setNoteFor(null); setChart(null); setSheet(null); setTabS("today"); setStep("app"); setLocked(false); toast("Demo data reset"); };

  const counts = { review: waitingReports(db).length + waitingSymptoms(db).length };
  const ctx = { step, locked, go, toast, lock, unlock, signOut, idleSoon, reset, tab, setTab, counts, open: setSheet, db, clinic, drafts, chart, openChart, closeChart, ctab, setCtab, metric, setMetric, rtab, setRtab, noteFor, startNote, closeNote, updDraft, signNote, discardDraft, reviewReport, seeSymptom, addAddendum, glassOn, grantGlass, endGlass, glassLog, outage, setOutage, prefs, setPrefs };

  const Pre = { signin: SignIn, twofa: TwoFA, enroll: Enroll }[step];
  const inApp = !Pre && !locked;
  const overlay = inApp && !!noteFor && !wide;
  const Screen = { today: TodayS, patients: PatientsS, review: ReviewS, account: AccountS }[tab] || TodayS;
  let sh = null;
  if (inApp && sheet) {
    const S = { review: RevSheet, report: ReportView, symptom: SymptomSheet, glass: GlassSheet, addendum: AddendumSheet, sign: SignSheet, discard: DiscardSheet, signout: SignOutSheet }[sheet.type];
    if (S) sh = <S key={[sheet.type, sheet.pid, sheet.rid, sheet.sid, sheet.vid].join("-")} {...sheet} close={() => setSheet(null)} />;
  }

  return (
    <Ctx.Provider value={ctx}>
      <div className="abc">
        <style>{CSS + CSS2 + CSS3}</style>
        {Pre ? <Pre key={step} /> : locked ? <LockScreen /> : (
          <div className="lg:flex min-h-screen">
            <Side />
            <div className="flex-1 min-w-0">
              <Top />
              {outage && <Outage />}
              <main key={chart ? "c-" + chart : tab} className={cls("fadein w-full max-w-6xl mx-auto px-5 lg:px-10 pb-32 lg:pb-16 lg:pt-10", noteFor && wide && "narrow")}>
                {chart ? <ChartS /> : <Screen />}
              </main>
            </div>
            {noteFor && wide && <Composer pid={noteFor} />}
            <BNav />
          </div>
        )}
        {overlay && <Composer pid={noteFor} overlay />}
        {sh}
        {inApp && idle != null && <IdleWarn s={idle} />}
        {msg && <div key={msg.k} className={cls("toast", (!inApp || overlay) && "low")} role="status"><Check size={18} className="flex-none" />{msg.m}</div>}
        <Proto />
      </div>
    </Ctx.Provider>
  );
}