import { useState, useEffect, useRef, createContext, useContext } from "react";
import { Home, ClipboardList, Plus, FileText, User, Bell, ChevronDown, ChevronRight, ChevronLeft, X, Check, Phone, CalendarPlus, CalendarDays, Upload, Camera, HeartPulse, MessageSquare, Lock, ShieldCheck, LogOut, Download, Search, AlertTriangle, Info, Pill, Droplet, Scale, FlaskConical, Smartphone, Layers, WifiOff, Activity, Users, FileUp, Eye, MapPin, Moon, Sun, Footprints, BadgeCheck, Clock, Mail, Stethoscope } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine, CartesianGrid } from "recharts";

/* ───────── Design tokens + custom CSS ───────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Anek+Malayalam:wdth,wght@75..125,100..800&display=swap');
.abc{--paper:#F2F4EF;--ink:#173327;--ink2:#4A5F56;--ink3:#5E7168;--leaf:#1F6B4F;--leafd:#154D39;--leaft:#E2EEE7;--zari:#C9A43B;--zarit:#F7EED6;--zarii:#76570F;--lat:#B23F2C;--latt:#F9E5E0;--line:#DCE3DD;--mist:#EBEFEB;
font-family:"Anek Malayalam","Noto Sans Malayalam",system-ui,-apple-system,"Segoe UI",sans-serif;color:var(--ink);background:var(--paper);min-height:100vh;font-size:1.0625rem;line-height:1.45;-webkit-font-smoothing:antialiased;-webkit-tap-highlight-color:transparent}
.abc.ml{line-height:1.62}
.abc *{box-sizing:border-box}
.abc button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;text-align:inherit}
.abc input,.abc textarea{font:inherit;color:inherit}
.abc a{color:inherit;text-decoration:none}
.abc :focus-visible{outline:3px solid var(--leaf);outline-offset:3px;border-radius:12px}
.abc .field :focus-visible{outline:none}
.ink2{color:var(--ink2)}.ink3{color:var(--ink3)}.leaf{color:var(--leaf)}.lat{color:var(--lat)}
.disp{font-weight:700;font-variation-settings:"wdth" 116;letter-spacing:-.012em;line-height:1.04}
.ml .disp{font-variation-settings:"wdth" 100;letter-spacing:0;line-height:1.3}
.hero-t{font-size:clamp(2.3rem,8.4vw,4.6rem)}.ml .hero-t{font-size:clamp(1.7rem,6.2vw,3.4rem)}
.greet{font-size:clamp(2.4rem,9vw,4.2rem)}.ml .greet{font-size:clamp(1.9rem,7vw,3.3rem)}
.h1{font-size:clamp(2rem,7vw,2.7rem)}.ml .h1{font-size:clamp(1.6rem,5.4vw,2.2rem)}
.h-sheet{font-size:1.6rem}.ml .h-sheet{font-size:1.3rem}
.h2{font-size:1.25rem;font-weight:650;font-variation-settings:"wdth" 106}
.h3{font-size:1.0625rem;font-weight:650}
.num{font-variant-numeric:tabular-nums;font-variation-settings:"wdth" 112;font-weight:700;letter-spacing:-.01em}
.big-num{font-size:3rem;line-height:1}
@keyframes kin{0%{opacity:0;filter:blur(8px);transform:translateY(14px);font-variation-settings:"wdth" 75}60%{opacity:1;filter:blur(0)}100%{opacity:1;transform:none;font-variation-settings:"wdth" 116}}
@keyframes kinml{0%{opacity:0;filter:blur(8px);transform:translateY(14px)}100%{opacity:1;filter:none;transform:none}}
.kin{animation:kin 1.1s cubic-bezier(.16,1,.3,1) both}.ml .kin{animation-name:kinml}
@keyframes kin2{from{font-variation-settings:"wdth" 80;opacity:.2}to{font-variation-settings:"wdth" 112;opacity:1}}
.kin2{animation:kin2 .6s cubic-bezier(.2,1,.3,1) both;display:inline-block}
@keyframes springIn{0%{opacity:0;transform:translateY(26px) scale(.96)}55%{opacity:1;transform:translateY(-4px) scale(1.01)}80%{transform:translateY(1px)}100%{opacity:1;transform:none}}
.spring{animation:springIn .75s cubic-bezier(.2,.9,.3,1) both;animation-delay:calc(var(--i,0) * 80ms)}
@keyframes popIn{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.18);opacity:1}100%{transform:scale(1)}}
.pop{animation:popIn .45s cubic-bezier(.2,1.4,.4,1) both}
@keyframes up{from{transform:translateY(100%)}to{transform:none}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes zoom{from{opacity:0;transform:scale(.94) translateY(10px)}to{opacity:1;transform:none}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes shake{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
.fadein{animation:fade .25s ease both}
.zari-band{height:12px;background:linear-gradient(var(--zari),var(--zari)) 0 0/100% 6px no-repeat,linear-gradient(var(--zari),var(--zari)) 0 9px/100% 2px no-repeat}
.logo{width:44px;height:44px;border-radius:14px;background:var(--leaf);color:#fff;display:grid;place-items:center;font-weight:800;font-size:.78rem;font-variation-settings:"wdth" 125;position:relative;overflow:hidden;flex:none;padding-bottom:6px}
.logo::after{content:"";position:absolute;left:0;right:0;bottom:0;height:5px;background:var(--zari)}
.logo::before{content:"";position:absolute;left:0;right:0;bottom:8px;height:1.5px;background:var(--zari)}
.logo-sm{width:34px;height:34px;border-radius:10px;font-size:.6rem}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:52px;padding:0 1.25rem;border-radius:16px;font-weight:650;font-size:1.0625rem;line-height:1.2;text-align:center;transition:background .2s,transform .18s cubic-bezier(.2,1,.3,1)}
.btn-pri{background:var(--leaf);color:#fff}.btn-pri:hover{background:var(--leafd)}
.btn:disabled{background:#B6C6BE;color:#fff;cursor:not-allowed;box-shadow:none}
.btn-sec{background:#fff;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--line)}.btn-sec:hover{background:#FAFBF9}
.btn-tint{background:var(--leaft);color:var(--leafd)}.btn-tint:hover{background:#D3E6DA}
.btn-ghost{color:var(--leaf)}
.btn-danger{background:var(--lat);color:#fff}
.btn-dline{color:var(--lat);box-shadow:inset 0 0 0 1.5px #E6B5AA;background:#fff}
.btn-light{background:#fff;color:var(--ink)}
.btn-sm{min-height:42px;padding:0 .95rem;border-radius:12px;font-size:.9375rem}
.press:active{transform:scale(.97)}
.link{color:var(--leaf);font-weight:650}
.icon-btn{width:44px;height:44px;display:inline-grid;place-items:center;border-radius:14px;flex:none}.icon-btn:hover{background:var(--mist)}
.back{display:inline-flex;align-items:center;gap:4px;height:40px;padding:0 10px 0 4px;border-radius:12px;font-weight:600;color:var(--ink2);margin-bottom:6px}
.tag{display:inline-flex;align-items:center;gap:5px;min-height:26px;padding:2px 10px;border-radius:999px;font-size:.8125rem;font-weight:650;white-space:nowrap}
.tag-leaf{background:var(--leaft);color:var(--leafd)}.tag-zari{background:var(--zarit);color:var(--zarii)}.tag-lat{background:var(--latt);color:var(--lat)}.tag-mist{background:var(--mist);color:var(--ink2)}
.seg{display:flex;padding:4px;border-radius:14px;background:var(--mist);gap:4px}
.seg button{flex:1;min-height:44px;border-radius:10px;font-weight:650;font-size:.95rem;color:var(--ink2);padding:0 10px;text-align:center;transition:all .25s cubic-bezier(.2,1,.3,1)}
.seg button.on{background:#fff;color:var(--ink);box-shadow:0 1px 2px rgba(23,51,39,.12),0 2px 8px rgba(23,51,39,.06)}
.seg-sm button{min-height:36px;font-size:.875rem}
.pill{flex:none;display:inline-flex;align-items:center;gap:6px;height:44px;padding:0 18px;border-radius:999px;background:#fff;border:1px solid var(--line);font-weight:600;white-space:nowrap;transition:background .2s,color .2s}
.pill.on{background:var(--ink);border-color:var(--ink);color:#fff}
.pill-n{font-size:.8rem;opacity:.7}
.chip{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:0 14px;border-radius:999px;border:1.5px solid var(--line);font-size:.9375rem;font-weight:600;background:#fff}
.chip.on{border-color:var(--leaf);background:var(--leaft);color:var(--leafd)}
.hscroll{overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding-bottom:4px}.hscroll::-webkit-scrollbar{display:none}
.grp{background:#fff;border:1px solid var(--line);border-radius:22px;overflow:hidden}
.row{display:flex;align-items:center;gap:14px;padding:14px 16px;min-height:64px;width:100%}
.row+.row{border-top:1px solid var(--line)}
button.row:hover,a.row:hover{background:#FAFBF9}
.ico{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;flex:none}
.ico-lg{width:52px;height:52px;border-radius:16px}
.ico-leaf{background:var(--leaft);color:var(--leafd)}.ico-zari{background:var(--zarit);color:var(--zarii)}.ico-lat{background:var(--latt);color:var(--lat)}.ico-mist{background:var(--mist);color:var(--ink2)}
.lbl{display:block;font-weight:650;font-size:.95rem;margin-bottom:8px}
.field{display:flex;align-items:center;min-height:56px;border-radius:14px;background:#fff;border:1.5px solid var(--line);padding:0 16px;transition:border-color .2s,box-shadow .2s}
.field:focus-within{border-color:var(--leaf);box-shadow:0 0 0 4px rgba(31,107,79,.14)}
.field input,.field textarea{flex:1;min-width:0;border:0;outline:0;background:transparent;font-size:1.125rem;padding:14px 0}
.field textarea{resize:vertical;line-height:1.5}
.field input::-webkit-outer-spin-button,.field input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.num-big{font-size:1.75rem!important;font-weight:700;font-variation-settings:"wdth" 112}
.pfx{font-weight:650;color:var(--ink2);padding-right:12px;margin-right:12px;border-right:1.5px solid var(--line)}
.check{display:flex;gap:12px;align-items:flex-start;cursor:pointer}
.check input{appearance:none;-webkit-appearance:none;width:24px;height:24px;flex:none;border-radius:8px;border:2px solid #A9BAB1;margin-top:1px;display:grid;place-items:center;transition:all .2s;background:#fff}
.check input:checked{background:var(--leaf);border-color:var(--leaf)}
.check input:checked::after{content:"";width:6px;height:11px;border:solid #fff;border-width:0 2.5px 2.5px 0;transform:rotate(45deg) translate(-1px,-1px)}
.sw{width:52px;height:32px;border-radius:999px;background:#C5D1CA;position:relative;flex:none;transition:background .25s}
.sw i{position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .35s cubic-bezier(.2,1.4,.4,1)}
.sw.on{background:var(--leaf)}.sw.on i{transform:translateX(20px)}
.av{display:inline-grid;place-items:center;border-radius:50%;background:var(--leaft);color:var(--leafd);font-weight:750;font-variation-settings:"wdth" 112;flex:none}
.av.kid{background:var(--zarit);color:var(--zarii)}
.spin{width:16px;height:16px;border-radius:50%;border:2.5px solid var(--line);border-top-color:var(--leaf);animation:spin .8s linear infinite;display:inline-block}
.err{display:flex;gap:8px;align-items:flex-start;color:var(--lat);font-weight:600;font-size:.95rem}
.warn{display:flex;gap:12px;padding:14px;border-radius:16px;background:var(--latt);color:#6B2417;font-size:.95rem}
.lock-note{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:var(--mist);color:var(--ink2);font-size:.95rem}
.prog{height:8px;border-radius:999px;background:var(--mist);overflow:hidden}
.prog i{display:block;height:100%;background:var(--leaf);border-radius:inherit;transition:width .6s cubic-bezier(.2,1,.3,1)}
.tick{width:24px;height:24px;border-radius:50%;border:2px solid #B8C7BF;display:grid;place-items:center;flex:none;color:#fff;transition:all .25s}
.tick.on{background:var(--leaf);border-color:var(--leaf)}
/* ticket */
.ticket{position:relative;display:flex;background:var(--leaf);color:#fff;border-radius:24px;overflow:hidden;box-shadow:0 18px 40px -18px rgba(21,77,57,.6)}
.ticket::before{content:"";position:absolute;left:0;right:0;top:0;height:12px;background:linear-gradient(var(--zari),var(--zari)) 0 0/100% 6px no-repeat,linear-gradient(var(--zari),var(--zari)) 0 9px/100% 2px no-repeat}
.tk-main{flex:1;min-width:0;padding:30px 18px 20px 22px}
.tk-stub{width:96px;flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px 8px 18px;border-left:2px dashed rgba(255,255,255,.35);position:relative;text-align:center}
.tk-stub::before,.tk-stub::after{content:"";position:absolute;left:-12px;width:22px;height:22px;border-radius:50%;background:var(--paper)}
.tk-stub::before{top:-11px}.tk-stub::after{bottom:-11px}
.tk-stub b{font-size:2.9rem;line-height:1}.tk-stub span{font-size:.8125rem;opacity:.85;margin-top:6px;line-height:1.2}
.tk-lbl{font-size:.875rem;opacity:.8;font-weight:500}
.tk-doc{font-size:1.5rem;font-weight:700;font-variation-settings:"wdth" 110;line-height:1.15;margin-top:4px}
.tk-when{display:flex;flex-wrap:wrap;gap:6px 22px;margin-top:16px}
.tk-when span{display:block;font-size:.8125rem;opacity:.72}.tk-when b{font-size:1.125rem;font-weight:650}
.tk-place{display:flex;align-items:center;gap:6px;margin-top:12px;font-size:.95rem;opacity:.92}
/* id card */
.idcard{position:relative;background:#fff;border:1px solid var(--line);border-radius:24px;padding:30px 20px 20px;overflow:hidden}
.idcard::before{content:"";position:absolute;left:0;right:0;top:0;height:12px;background:linear-gradient(var(--zari),var(--zari)) 0 0/100% 6px no-repeat,linear-gradient(var(--zari),var(--zari)) 0 9px/100% 2px no-repeat}
.mrn{font-size:2rem;letter-spacing:.02em;line-height:1.1}
/* meds timeline */
.tl-i{position:relative;padding-left:36px;padding-bottom:20px}
.tl-i::before{content:"";position:absolute;left:11px;top:30px;bottom:0;width:2px;background:var(--line)}
.tl-i:last-child::before{display:none}
.tl-node{position:absolute;left:0;top:1px;width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#fff;border:2px solid var(--line);color:var(--ink3)}
.tl-i.done .tl-node{background:var(--leaf);border-color:var(--leaf);color:#fff}
.tl-i.now .tl-node{border-color:var(--leaf);color:var(--leaf);box-shadow:0 0 0 5px rgba(31,107,79,.14)}
.med{display:flex;align-items:center;gap:12px;padding:12px 12px 12px 14px;background:#fff;border:1px solid var(--line);border-radius:16px;margin-top:8px}
.tl-i.done .med{background:transparent}
.take{flex:none;min-width:88px;height:42px;border-radius:12px;padding:0 12px;font-weight:650;font-size:.9375rem;background:var(--leaft);color:var(--leafd);display:grid;place-items:center;text-align:center;transition:background .25s}
.take.on{background:var(--leaf);color:#fff}
.dots{display:inline-flex;align-items:center;gap:3px}
.dots i{width:9px;height:15px;border-radius:5px;box-shadow:inset 0 0 0 1.5px #9DB5A9}
.dots i.on{background:var(--leaf);box-shadow:none}
.dots b{margin-left:6px;font-size:.8125rem;font-weight:650;color:var(--ink2);font-variant-numeric:tabular-nums}
/* tiles */
.tiles{display:flex;gap:12px}
.tile{flex:none;width:172px;scroll-snap-align:start;display:flex;flex-direction:column;align-items:flex-start;text-align:left;background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px 14px 12px}
.tile-add{justify-content:center;align-items:center;gap:8px;color:var(--leaf);font-weight:650;border:1.5px dashed #B9CBC1;background:transparent;min-height:150px}
@media(min-width:1024px){.tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));overflow:visible}.tile{width:auto}}
/* shell */
.topbar{position:sticky;top:0;z-index:30;display:flex;align-items:center;justify-content:space-between;padding:10px 14px 10px 18px;background:rgba(242,244,239,.86);backdrop-filter:saturate(1.4) blur(14px);-webkit-backdrop-filter:saturate(1.4) blur(14px)}
.badge{position:absolute;top:5px;right:5px;min-width:19px;height:19px;padding:0 5px;border-radius:999px;background:var(--lat);color:#fff;font-size:.7rem;font-weight:750;display:grid;place-items:center;border:2px solid var(--paper)}
.bnav{position:fixed;left:0;right:0;bottom:0;z-index:40;display:grid;grid-template-columns:repeat(5,1fr);align-items:end;padding:8px 6px calc(10px + env(safe-area-inset-bottom));background:rgba(255,255,255,.95);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-top:1px solid var(--line)}
.bn{display:flex;flex-direction:column;align-items:center;gap:3px;min-height:56px;justify-content:center;color:var(--ink3);font-size:.8rem;font-weight:650;text-align:center}
.bn .bi{width:56px;height:32px;border-radius:999px;display:grid;place-items:center;transition:background .3s,transform .35s cubic-bezier(.2,1.5,.4,1)}
.bn.on{color:var(--leaf)}.bn.on .bi{background:var(--leaft);transform:scale(1.05)}
.fab{justify-self:center;width:60px;height:60px;border-radius:22px;background:var(--leaf);color:#fff;display:grid;place-items:center;margin-top:-28px;box-shadow:0 12px 24px -10px rgba(21,77,57,.75)}
.side{position:sticky;top:0;height:100vh;width:280px;flex:none;flex-direction:column;gap:22px;padding:24px 18px;background:#fff;border-right:1px solid var(--line);overflow-y:auto}
.sn{display:flex;align-items:center;gap:12px;height:48px;padding:0 14px;border-radius:14px;font-weight:600;color:var(--ink2);width:100%}
.sn:hover{background:var(--paper)}.sn.on{background:var(--leaft);color:var(--leafd)}
.sn-n{margin-left:auto;font-size:.8rem;background:var(--lat);color:#fff;border-radius:999px;padding:1px 8px}
.side-who{display:flex;align-items:center;gap:12px;padding:10px;border-radius:16px;border:1px solid var(--line);width:100%}
.side-sos{border-radius:16px;background:var(--latt);padding:14px;color:#6B2417}
.outage{display:flex;gap:12px;align-items:center;margin:4px 16px 12px;padding:12px 14px;border-radius:16px;background:var(--ink);color:#fff;font-size:.95rem}
@media(min-width:1024px){.outage{margin:24px 48px 0}}
.sos{border-radius:22px;padding:18px;background:var(--latt);color:#6B2417}
.sos h2{color:var(--lat)}
.note-card{display:flex;gap:14px;padding:16px;border-radius:22px;background:#fff;border:1px solid var(--line)}
/* sheets */
.scrim{background:rgba(16,32,25,.45);animation:fade .25s both}
.sheet{background:#fff;border-radius:28px 28px 0 0;max-height:92vh;display:flex;flex-direction:column;animation:up .5s cubic-bezier(.22,1.15,.36,1) both;box-shadow:0 -10px 40px rgba(23,51,39,.18)}
@media(min-width:1024px){.sheet{border-radius:28px;max-height:88vh;animation:zoom .35s cubic-bezier(.2,1.2,.3,1) both}}
.sheet-body{overflow-y:auto;overscroll-behavior:contain}
.grab{width:44px;height:5px;border-radius:999px;background:var(--line);margin:10px auto 2px}
.opt{display:flex;align-items:center;gap:14px;padding:14px;border-radius:20px;border:1px solid var(--line);background:#fff;width:100%;text-align:left}
.opt:hover{border-color:#B9CBC1}
.bigpick{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:128px;border-radius:20px;background:var(--leaft);color:var(--leafd);text-align:center;padding:12px}
.filechip{display:flex;align-items:center;gap:12px;padding:12px;border-radius:16px;background:var(--mist)}
.bigcheck{width:84px;height:84px;border-radius:28px;background:var(--leaf);color:#fff;display:grid;place-items:center;animation:popIn .6s cubic-bezier(.2,1.4,.4,1) both}
.docprev{display:flex;align-items:center;gap:16px;padding:16px;border-radius:18px;background:var(--mist)}
.docpage{width:80px;height:104px;flex:none;background:#fff;border-radius:8px;box-shadow:0 6px 14px -8px rgba(23,51,39,.45);padding:10px 9px;display:flex;flex-direction:column;gap:6px}
.docpage i{display:block;height:4px;border-radius:2px;background:var(--line)}
.revby{display:flex;gap:10px;align-items:center;padding:12px 14px;border-radius:14px;background:var(--leaft);color:var(--leafd);font-weight:650}
.note{background:#fff;border:1px solid var(--line);border-radius:20px;padding:16px}
.note dt{font-size:.85rem;color:var(--ink3);font-weight:650;margin-top:12px}.note dd{margin:2px 0 0}
.signed{display:flex;gap:6px;align-items:center;margin-top:14px;font-size:.875rem;color:var(--leafd);font-weight:600}
.addm{margin-top:12px;border-radius:14px;background:var(--zarit);padding:12px 14px 12px 16px;border-left:4px solid var(--zari)}
.otp{display:flex;gap:8px}
.otp input{flex:1;min-width:0;height:62px;text-align:center;font-size:1.6rem;font-weight:700;border-radius:14px;border:1.5px solid var(--line);background:#fff;outline:0;font-variant-numeric:tabular-nums;transition:border-color .2s,box-shadow .2s}
.otp input:focus{border-color:var(--leaf);box-shadow:0 0 0 4px rgba(31,107,79,.14)}
.otp input.filled{border-color:#9DB5A9}.otp input.bad{border-color:var(--lat)}
.shake{animation:shake .4s}
.webotp{display:flex;align-items:center;gap:10px;width:100%;padding:14px;border-radius:16px;background:#fff;border:1px solid var(--line)}
.secchk{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:#fff}
.who{display:flex;align-items:center;gap:14px;width:100%;padding:16px;border-radius:20px;background:#fff;border:1.5px solid var(--line);text-align:left;transition:border-color .2s,box-shadow .2s}
.who.on{border-color:var(--leaf);box-shadow:0 0 0 4px rgba(31,107,79,.12)}
.radio{width:24px;height:24px;border-radius:50%;border:2px solid var(--line);flex:none}
.who.on .radio{border-color:var(--leaf);background:var(--leaf);box-shadow:inset 0 0 0 4px #fff}
.pv{display:flex;align-items:center;gap:14px;padding:14px 16px;border-radius:20px;background:#fff;border:1px solid var(--line);box-shadow:0 14px 30px -22px rgba(23,51,39,.5);max-width:380px}
.pv:nth-child(2){margin-left:28px}.pv:nth-child(3){margin-left:56px}
.day{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 0;border-radius:14px}
.day.today{background:var(--leaft)}
.lockscreen{background:var(--ink);border-radius:24px;padding:18px}
.notif{display:flex;gap:12px;align-items:flex-start;background:rgba(255,255,255,.94);border-radius:16px;padding:12px 14px;margin-top:10px}
.rem{display:flex;align-items:center;gap:14px;padding:14px;border-radius:20px;background:#fff;border:1px solid var(--line)}
.rem.is-done{background:transparent}
.empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:36px 16px;border-radius:22px;border:1.5px dashed var(--line)}
.tip{background:#fff;border:1px solid var(--line);border-radius:12px;padding:8px 12px;box-shadow:0 8px 20px -10px rgba(0,0,0,.25);font-size:.875rem;display:flex;flex-direction:column}
.lg-dot{width:10px;height:10px;border-radius:50%;border:2px solid var(--leaf);display:inline-block}.lg-dot.fill{background:var(--leaf)}
.danger{border-radius:22px;padding:18px;border:1.5px solid #EBC3B9;background:#fff}
.toast{position:fixed;left:50%;bottom:calc(98px + env(safe-area-inset-bottom));z-index:70;transform:translateX(-50%);width:max-content;max-width:min(92vw,440px);background:var(--ink);color:#fff;padding:14px 18px;border-radius:16px;font-weight:550;font-size:.95rem;box-shadow:0 14px 30px -12px rgba(0,0,0,.4);animation:toastIn .5s cubic-bezier(.2,1.3,.4,1) both;display:flex;gap:10px;align-items:center}
.toast.pre{bottom:24px}
@media(min-width:1024px){.toast{bottom:32px}}
@keyframes toastIn{from{opacity:0;transform:translate(-50%,20px) scale(.95)}to{opacity:1;transform:translate(-50%,0)}}
.proto-btn{position:fixed;right:14px;bottom:calc(100px + env(safe-area-inset-bottom));z-index:60;display:flex;align-items:center;gap:6px;height:38px;padding:0 14px;border-radius:999px;background:rgba(23,51,39,.9);color:#fff;font-size:.8125rem;font-weight:650}
.proto-btn.pre{bottom:18px}
.proto-panel{position:fixed;right:14px;bottom:calc(146px + env(safe-area-inset-bottom));z-index:61;width:min(350px,calc(100vw - 28px));max-height:68vh;overflow:auto;background:#fff;border-radius:20px;box-shadow:0 24px 60px -20px rgba(0,0,0,.4);padding:16px;border:1px solid var(--line);animation:zoom .3s cubic-bezier(.2,1.2,.3,1) both}
.proto-panel.pre{bottom:64px}
@media(min-width:1024px){.proto-btn{bottom:24px;right:24px}.proto-panel{bottom:72px;right:24px}}
.pchip{font-size:.8125rem;font-weight:600;padding:6px 10px;border-radius:999px;background:var(--mist)}
.pchip:hover{background:var(--leaft)}
@media (prefers-reduced-motion:reduce){.abc *,.abc *::before,.abc *::after{animation-duration:1ms!important;animation-delay:0ms!important;transition-duration:1ms!important}}
`;

/* ───────── Copy: English + Malayalam (chrome). Clinical text stays as written by doctors. ───────── */
const L = {
  home: ["Home", "ഹോം"], planShort: ["Plan", "പദ്ധതി"], plan: ["Care plan", "പരിചരണ പദ്ധതി"], records: ["Records", "രേഖകൾ"], profile: ["Profile", "പ്രൊഫൈൽ"],
  reminders: ["Reminders", "ഓർമ്മപ്പെടുത്തലുകൾ"], appts: ["Appointments", "അപ്പോയിന്റ്മെന്റുകൾ"], addShort: ["Add to record", "രേഖയിൽ ചേർക്കുക"], careApp: ["Care app", "കെയർ ആപ്പ്"],
  evening: ["Good evening", "നമസ്കാരം"], dateLine: ["Tuesday, 6 October", "ചൊവ്വാഴ്ച, ഒക്ടോബർ 6"],
  tagline: ["Your care, between visits.", "സന്ദർശനങ്ങൾക്കിടയിലും നിങ്ങളുടെ പരിചരണം."],
  welcomeSub: ["See your reports, medicines and care plan from ABC Hospital, and get reminders on your phone.", "ABC ഹോസ്പിറ്റലിലെ നിങ്ങളുടെ റിപ്പോർട്ടുകളും മരുന്നുകളും പരിചരണ പദ്ധതിയും ഇവിടെ കാണാം. ഓർമ്മപ്പെടുത്തലുകൾ ഫോണിൽ ലഭിക്കും."],
  signIn: ["Sign in", "സൈൻ ഇൻ ചെയ്യുക"],
  newHere: ["New here? The front desk sets up your account after checking your ID.", "പുതിയ ആളാണോ? ഐഡി പരിശോധിച്ച ശേഷം ഫ്രണ്ട് ഡെസ്ക് അക്കൗണ്ട് തയ്യാറാക്കും."],
  emergency112: ["Emergency? Call 112", "അടിയന്തര സാഹചര്യമാണോ? 112-ൽ വിളിക്കുക"],
  pv1: "Night medicines", pv2: "Lipid profile reviewed", pv3: "Next visit, Thu 15 Oct",
  signInSub: ["Use the phone number or email the hospital has on file.", "ഹോസ്പിറ്റലിൽ നൽകിയ ഫോൺ നമ്പറോ ഇമെയിലോ ഉപയോഗിക്കുക."],
  phone: ["Phone", "ഫോൺ"], email: ["Email", "ഇമെയിൽ"], phoneLabel: ["Mobile number", "മൊബൈൽ നമ്പർ"], emailLabel: ["Email address", "ഇമെയിൽ വിലാസം"],
  secCheck: "Security check", checking: "Checking", secDone: "Done", sendCode: ["Send code", "കോഡ് അയയ്ക്കുക"],
  numberChanged: "Changed your number or email? Update it at the front desk.",
  otpTitle: ["Enter the 6-digit code", "6 അക്ക കോഡ് നൽകുക"], sentTo: [(x) => `We sent it to ${x}.`, (x) => `${x}-ലേക്ക് കോഡ് അയച്ചു.`],
  fromMsgs: "From Messages", tapFill: "Tap to fill", resendIn: [(s) => `Resend code in 0:${s}`], resend: "Resend code", verifying: "Checking code",
  wrongCode: ["That code didn't match. Check the latest message and try again.", "കോഡ് ശരിയല്ല. ഏറ്റവും പുതിയ മെസേജ് നോക്കി വീണ്ടും ശ്രമിക്കുക."], codeResent: "New code sent",
  consentTitle: ["How we use your information", "നിങ്ങളുടെ വിവരങ്ങൾ എങ്ങനെ ഉപയോഗിക്കുന്നു"], consentSub: ["Read this before you see your records.", "രേഖകൾ കാണുന്നതിന് മുമ്പ് ഇത് വായിക്കുക."],
  c1h: ["What we use", "ഉപയോഗിക്കുന്ന വിവരങ്ങൾ"], c1: ["Your name, contact details, hospital number, and the records your care team creates or you upload.", "നിങ്ങളുടെ പേര്, ഫോൺ/ഇമെയിൽ, ഹോസ്പിറ്റൽ നമ്പർ, ഡോക്ടർമാർ തയ്യാറാക്കുന്നതും നിങ്ങൾ അപ്‌ലോഡ് ചെയ്യുന്നതുമായ രേഖകൾ."],
  c2h: ["Why", "എന്തിന്"], c2: ["To show you your records, remind you about your care plan, and let your doctors see what you share between visits.", "രേഖകൾ കാണിക്കാനും പരിചരണ പദ്ധതി ഓർമ്മിപ്പിക്കാനും, നിങ്ങൾ പങ്കിടുന്നവ ഡോക്ടർമാർക്ക് കാണാനും."],
  c3h: ["Who can see it", "ആർക്കൊക്കെ കാണാം"], c3: ["You, family you link at the desk, and doctors caring for you. Every time someone opens your record, it is logged.", "നിങ്ങൾ, ഡെസ്കിൽ ബന്ധിപ്പിച്ച കുടുംബാംഗങ്ങൾ, നിങ്ങളെ ചികിത്സിക്കുന്ന ഡോക്ടർമാർ. ഓരോ തവണ രേഖ തുറക്കുന്നതും രേഖപ്പെടുത്തും."],
  c4h: ["Where it's kept", "എവിടെ സൂക്ഷിക്കുന്നു"], c4: ["On secure servers in India.", "ഇന്ത്യയിലെ സുരക്ഷിത സെർവറുകളിൽ."],
  c5h: ["Your choices", "നിങ്ങളുടെ അവകാശങ്ങൾ"], c5: ["See, correct or ask to erase your data, name a nominee, or withdraw consent anytime in Profile. Withdrawing doesn't affect your treatment. Some medical records must be kept by law.", "പ്രൊഫൈലിൽ നിന്ന് എപ്പോൾ വേണമെങ്കിലും വിവരങ്ങൾ കാണാം, തിരുത്താം, മായ്ക്കാൻ ആവശ്യപ്പെടാം, നോമിനിയെ ചേർക്കാം, സമ്മതം പിൻവലിക്കാം. ഇത് ചികിത്സയെ ബാധിക്കില്ല. ചില മെഡിക്കൽ രേഖകൾ നിയമപ്രകാരം സൂക്ഷിക്കണം."],
  noticeVersion: "Notice version 1.2, updated 1 Oct 2026", grievanceLine: "Questions or complaints: Grievance Officer, grievance@abchospital.example",
  agreeCheck: ["I've read this and agree to ABC Hospital using my information this way.", "ഞാൻ ഇത് വായിച്ചു. എന്റെ വിവരങ്ങൾ ഇങ്ങനെ ഉപയോഗിക്കാൻ സമ്മതിക്കുന്നു."],
  agree: ["Agree and continue", "സമ്മതിച്ച് തുടരുക"], notNow: ["Not now", "ഇപ്പോൾ വേണ്ട"], consentLater: "You can agree later. Your treatment at the hospital isn't affected.",
  whoTitle: ["Whose records?", "ആരുടെ രേഖകൾ?"], whoSub: ["Your login is linked to these people.", "ഈ ലോഗിനുമായി ബന്ധിപ്പിച്ചവർ."],
  you: ["You", "നിങ്ങൾ"], childGuardian: ["Your child, you're the guardian", "നിങ്ങളുടെ കുട്ടി, നിങ്ങൾ രക്ഷിതാവ്"], guardianOf: ["You're the guardian", "നിങ്ങൾ രക്ഷിതാവ്"],
  addFamily: ["To link another family member, bring their ID to the front desk.", "മറ്റൊരാളെ ചേർക്കാൻ അവരുടെ ഐഡിയുമായി ഫ്രണ്ട് ഡെസ്കിൽ വരിക."],
  hospitalNo: ["Hospital number", "ഹോസ്പിറ്റൽ നമ്പർ"], continue: ["Continue", "തുടരുക"], back: ["Back", "തിരികെ"],
  nextVisit: ["Next visit", "അടുത്ത സന്ദർശനം"], date: ["Date", "തീയതി"], time: ["Time", "സമയം"], daysToGo: ["days to go", "ദിവസം ബാക്കി"],
  addCal: ["Add to calendar", "കലണ്ടറിൽ ചേർക്കുക"], callDesk: ["Call the desk", "ഡെസ്കിൽ വിളിക്കുക"], calSaved: "Calendar file saved. It only says \"Visit at ABC Hospital\".",
  changeVisit: ["To change this visit, call the front desk.", "സന്ദർശനം മാറ്റാൻ ഫ്രണ്ട് ഡെസ്കിൽ വിളിക്കുക."],
  beforeVisit: ["Before your visit", "സന്ദർശനത്തിന് മുമ്പ്"], doneOf: [(a, b) => `${a} of ${b} done`, (a, b) => `${b}-ൽ ${a} പൂർത്തിയായി`],
  uploadedWaiting: [(d) => `Uploaded ${d}, waiting for review`], due: [(d) => `Due ${d}`, (d) => `${d}-നകം`], nextOn: [(d) => `Next on ${d}`, (d) => `അടുത്തത് ${d}`],
  todaysMeds: ["Today's medicines", "ഇന്നത്തെ മരുന്നുകൾ"], takenOf: [(a, b) => `${a} of ${b} taken`, (a, b) => `${b}-ൽ ${a} കഴിച്ചു`],
  morning: ["Morning", "രാവിലെ"], noon: ["Afternoon", "ഉച്ച"], night: ["Night", "രാത്രി"], allTaken: ["All taken", "എല്ലാം കഴിച്ചു"],
  inHM: [(h, m) => `in ${h} hr ${m} min`, (h, m) => `${h} മണി. ${m} മിനി. കഴിഞ്ഞ്`], markTaken: ["Mark taken", "കഴിച്ചു"],
  afterFood: ["after food", "ഭക്ഷണശേഷം"], beforeFood: ["before food", "ഭക്ഷണത്തിന് മുമ്പ്"], atBed: ["at bedtime", "ഉറങ്ങും മുമ്പ്"], whenNeeded: ["When needed", "ആവശ്യമെങ്കിൽ"],
  takenToast: "Marked as taken", untakenToast: "Unmarked", allDone: "All of today's medicines are taken.",
  yourReadings: ["Your readings", "നിങ്ങളുടെ റീഡിംഗുകൾ"], readings: ["Readings", "റീഡിംഗുകൾ"], seeAll: ["See all", "എല്ലാം"],
  recentReports: ["Recent reports", "പുതിയ റിപ്പോർട്ടുകൾ"], logReading: ["Log a reading", "റീഡിംഗ് ചേർക്കുക"], logShort: ["Log", "ചേർക്കുക"],
  notReviewed: ["Not yet reviewed", "പരിശോധിച്ചിട്ടില്ല"], waitingReview: ["Waiting for review", "പരിശോധന കാത്തിരിക്കുന്നു"], reviewed: ["Reviewed", "പരിശോധിച്ചു"],
  hospital: ["Hospital", "ഹോസ്പിറ്റൽ"], youLogged: ["You logged", "നിങ്ങൾ ചേർത്തത്"], uploadedByYou: ["Uploaded by you", "നിങ്ങൾ അപ്‌ലോഡ് ചെയ്തത്"],
  installTitle: ["Add to your home screen", "ഹോം സ്ക്രീനിൽ ചേർക്കുക"], installBody: "Reminders work best from the home screen. On iPhone, tap Share, then Add to Home Screen.",
  install: ["Install", "ഇൻസ്റ്റാൾ"], later: ["Later", "പിന്നീട്"], installed: "Added to your home screen",
  emergencyTitle: ["Feeling very unwell?", "ഗുരുതരമായ ബുദ്ധിമുട്ടുണ്ടോ?"], emergencyBody: ["Don't wait for the app. Call 112 or ABC casualty.", "ആപ്പിനായി കാത്തിരിക്കരുത്. 112-ലോ ABC കാഷ്വാലിറ്റിയിലോ വിളിക്കുക."],
  call112: ["Call 112", "112 വിളിക്കുക"], callCasualty: ["Call casualty", "കാഷ്വാലിറ്റി"],
  planFrom: [(d, doc) => `From your visit on ${d} with ${doc}.`, (d, doc) => `${d}-ലെ സന്ദർശനത്തിൽ ${doc} തയ്യാറാക്കിയത്.`], nextReview: [(d) => `Next review on ${d}.`, (d) => `അടുത്ത അവലോകനം ${d}.`],
  lockedNote: ["Written by your doctor. You can mark tasks done; only your doctor can change the plan.", "ഡോക്ടർ തയ്യാറാക്കിയത്. പൂർത്തിയായവ അടയാളപ്പെടുത്താം; പദ്ധതി മാറ്റാൻ ഡോക്ടർക്ക് മാത്രം കഴിയും."],
  last7: ["Last 7 days", "കഴിഞ്ഞ 7 ദിവസം"], dosesOf: [(a, b) => `${a} of ${b} doses taken`, (a, b) => `${b}-ൽ ${a} ഡോസ് കഴിച്ചു`],
  medicines: ["Medicines", "മരുന്നുകൾ"], tests: ["Tests", "പരിശോധനകൾ"], readingsToLog: ["Readings to take", "എടുക്കേണ്ട റീഡിംഗുകൾ"], instructions: ["Instructions", "നിർദ്ദേശങ്ങൾ"], followUp: ["Follow-up", "തുടർ സന്ദർശനം"],
  upload: ["Upload", "അപ്‌ലോഡ്"], uploadReport: ["Upload a report", "റിപ്പോർട്ട് അപ്‌ലോഡ് ചെയ്യുക"], logNow: ["Log now", "ഇപ്പോൾ ചേർക്കുക"],
  uploadedOn: [(d) => `Uploaded ${d}, waiting for review`], lastLogged: [(d) => `Last logged ${d}`], missedOn: [(d) => `Missed on ${d}`, (d) => `${d} വിട്ടുപോയി`], since: [(d) => `Since ${d}`, (d) => `${d} മുതൽ`],
  reports: ["Reports", "റിപ്പോർട്ടുകൾ"], visits: ["Visits", "സന്ദർശനങ്ങൾ"], summary: ["Health summary", "ആരോഗ്യ സംഗ്രഹം"], searchReports: ["Search reports", "റിപ്പോർട്ടുകൾ തിരയുക"],
  all: ["All", "എല്ലാം"], byMe: ["Uploaded by me", "ഞാൻ അപ്‌ലോഡ് ചെയ്തവ"], noReports: "No reports match", noReportsBody: "Try another word, or clear the filter.",
  latest: ["Latest", "ഏറ്റവും പുതിയത്"], inTarget: ["In target", "ലക്ഷ്യത്തിനുള്ളിൽ"], outsideTarget: ["Outside target", "ലക്ഷ്യത്തിന് പുറത്ത്"],
  targetIs: [(x, d) => `Target set by ${d}: ${x}`, (x, d) => `${d} നിശ്ചയിച്ച ലക്ഷ്യം: ${x}`], history: ["History", "മുൻ റീഡിംഗുകൾ"], upperLower: "Dark line: upper. Light line: lower.",
  noReadings: "No readings yet", noReadingsBody: "Log your first reading and your doctor will see it at your next visit.",
  bp: ["Blood pressure", "രക്തസമ്മർദ്ദം"], sugar: ["Blood sugar", "ബ്ലഡ് ഷുഗർ"], weight: ["Weight", "ഭാരം"], a1c: "HbA1c",
  fasting: ["Fasting", "വെറുംവയറ്റിൽ"], afterMeal: ["2 hrs after food", "ഭക്ഷണം കഴിഞ്ഞ് 2 മണിക്കൂർ"], random: ["Random", "റാൻഡം"],
  active: ["Active", "നിലവിലുള്ളവ"], past: ["Past", "മുമ്പത്തേവ"], stoppedOn: [(d) => `Stopped on ${d}`], prescribedBy: [(d) => `Prescribed by ${d}`],
  medsNote: "Only your doctor can change your medicines. Having side effects? Tell your care team.",
  signedNote: ["Signed notes can't be changed. If your doctor corrects something, it's added below the original.", "ഒപ്പിട്ട കുറിപ്പുകൾ മാറ്റാനാവില്ല. തിരുത്തലുകൾ താഴെ ചേർക്കും."],
  reason: "Reason for visit", found: "What the doctor found", planLbl: "Plan", signedOn: [(d) => `Signed ${d}`], addendum: [(d) => `Correction added ${d}`],
  conditions: ["Conditions", "രോഗാവസ്ഥകൾ"], allergies: ["Allergies", "അലർജികൾ"], resolved: ["Resolved", "ഭേദമായി"], activeC: ["Active", "നിലവിൽ"],
  symptomsReported: ["Symptoms you reported", "നിങ്ങൾ അറിയിച്ച ലക്ഷണങ്ങൾ"], seenBy: [(d) => `Seen by ${d}`], somethingWrong: "Something wrong here? Ask for a correction",
  mild: ["Mild", "നേരിയ"], moderate: ["Moderate", "മിതമായ"], severe: ["Severe", "കഠിനമായ"],
  reviewedByOn: [(a, b) => `Reviewed by ${a} on ${b}`], keyValues: ["Key values", "പ്രധാന മൂല്യങ്ങൾ"], trend: ["Trend", "ട്രെൻഡ്"],
  valuesAfterReview: ["Values and trends appear after your doctor reviews this report.", "ഡോക്ടർ പരിശോധിച്ച ശേഷം മൂല്യങ്ങളും ട്രെൻഡും കാണാം."],
  openFile: ["Open file", "ഫയൽ തുറക്കുക"], download: ["Download", "ഡൗൺലോഡ്"], linkNote: "For your privacy, file links work for 60 seconds.", secureLink: "Opening a secure link that works for 60 seconds",
  wrongFile: "Uploaded the wrong file? Tell the front desk. Files can't be deleted from the app.",
  dob: ["Born", "ജനനം"], showDesk: ["Show this at the desk", "ഡെസ്കിൽ ഇത് കാണിക്കുക"], guardian: "Guardian", family: ["Family on this login", "ഈ ലോഗിനിലെ കുടുംബം"],
  viewing: ["Viewing", "കാണുന്നു"], switchTo: ["Switch", "മാറുക"], nowViewing: [(n) => `Now viewing ${n}'s records`, (n) => `ഇപ്പോൾ ${n}-ന്റെ രേഖകൾ`],
  settings: ["Settings", "ക്രമീകരണങ്ങൾ"], language: ["Language", "ഭാഷ"], textSize: ["Text size", "അക്ഷര വലുപ്പം"],
  pushOn: ["Reminders on this phone", "ഈ ഫോണിൽ ഓർമ്മപ്പെടുത്തൽ"], pushSub: "Push notifications", emailOn: ["Email reminders", "ഇമെയിൽ ഓർമ്മപ്പെടുത്തൽ"], emailSub: "Used when push doesn't arrive",
  privacyData: ["Privacy and your data", "സ്വകാര്യതയും വിവരങ്ങളും"], privacySub: "Consent, downloads and requests",
  help: ["Help", "സഹായം"], frontDesk: ["Front desk", "ഫ്രണ്ട് ഡെസ്ക്"], casualty: ["Casualty", "കാഷ്വാലിറ്റി"], open247: "open 24 hours", grievance: "Grievance officer",
  signOut: ["Sign out", "സൈൻ ഔട്ട്"], version: "ABC Hospital care app, version 1.0",
  today: ["Today", "ഇന്ന്"], comingUp: ["Coming up", "വരാനിരിക്കുന്നവ"], earlier: ["Earlier today", "ഇന്ന് നേരത്തെ"], open: ["Open", "തുറക്കുക"], view: ["View", "കാണുക"],
  nightMeds: ["Night medicines", "രാത്രിയിലെ മരുന്നുകൾ"], morningMeds: ["Morning medicines", "രാവിലത്തെ മരുന്നുകൾ"], checkBp: ["Check blood pressure", "രക്തസമ്മർദ്ദം നോക്കുക"],
  fastingSugar: ["Fasting sugar", "വെറുംവയറ്റിലെ ഷുഗർ"], testsDue: ["Tests due", "ടെസ്റ്റുകൾ ചെയ്യാനുണ്ട്"], visitSoon: ["Visit tomorrow", "നാളെ സന്ദർശനം"], logWeight: ["Log weight", "ഭാരം ചേർക്കുക"],
  takenAt: [(x) => `Taken at ${x}`, (x) => `${x}-ന് കഴിച്ചു`],
  notifPreview: "What you'll see on your phone", now: "now", notifText: ["You have a new reminder from ABC Hospital", "ABC ഹോസ്പിറ്റലിൽ നിന്ന് പുതിയ ഓർമ്മപ്പെടുത്തൽ"],
  notifCaption: ["Notifications never show health details. Open the app to see what's due.", "അറിയിപ്പുകളിൽ ആരോഗ്യ വിവരങ്ങൾ ഉണ്ടാകില്ല. വിശദാംശങ്ങൾക്ക് ആപ്പ് തുറക്കുക."],
  iphoneNote: "On iPhone, reminders arrive only after you add the app to your Home Screen.",
  upcoming: ["Upcoming", "വരാനിരിക്കുന്നവ"], completed: ["Completed", "പൂർത്തിയായി"], missedAppt: ["Missed", "എത്തിയില്ല"],
  bookNote: ["To book or change an appointment, call the front desk on 0484 000 1234.", "അപ്പോയിന്റ്മെന്റ് എടുക്കാനോ മാറ്റാനോ 0484 000 1234-ൽ വിളിക്കുക."],
  consentH: "Your consent", consentGiven: "You agreed to notice version 1.2 on 3 Oct 2026 at 6:12 PM, in English.", readNotice: "Read the notice",
  yourRights: ["Your rights", "നിങ്ങളുടെ അവകാശങ്ങൾ"], downloadRecords: ["Download my records", "എന്റെ രേഖകൾ ഡൗൺലോഡ് ചെയ്യുക"], downloadSub: "A PDF of everything in this app",
  preparing: "Preparing your records. We'll tell you when the download is ready.",
  askCorrection: ["Ask for a correction", "തിരുത്തൽ ആവശ്യപ്പെടുക"], askErase: ["Ask to erase my data", "വിവരങ്ങൾ മായ്ക്കാൻ ആവശ്യപ്പെടുക"], nominee: ["Name a nominee", "നോമിനിയെ ചേർക്കുക"],
  raiseGrievance: ["Raise a grievance", "പരാതി നൽകുക"], grievanceSub: "About how your data was handled",
  yourRequests: ["Your requests", "നിങ്ങളുടെ അപേക്ഷകൾ"], noReqs: "No requests yet", noReqsBody: "Anything you ask for here is tracked with a reply date.",
  sentOn: [(d) => `Sent ${d}`], closedOn: [(d) => `closed ${d}`], replyBy: [(d) => `reply by ${d}`], closed: ["Closed", "പൂർത്തിയായി"], inProgress: ["In progress", "പുരോഗമിക്കുന്നു"],
  withdraw: ["Withdraw consent", "സമ്മതം പിൻവലിക്കുക"], withdrawQ: "Withdraw your consent?",
  withdrawBody: ["You'll be signed out and won't see records in the app. ABC Hospital keeps medical records the law requires, and your treatment isn't affected.", "നിങ്ങൾ സൈൻ ഔട്ട് ആകും, ആപ്പിൽ രേഖകൾ കാണാനാവില്ല. നിയമപ്രകാരമുള്ള മെഡിക്കൽ രേഖകൾ ഹോസ്പിറ്റൽ സൂക്ഷിക്കും. ചികിത്സയെ ഇത് ബാധിക്കില്ല."],
  withdrawn: "Consent withdrawn. You've been signed out.", signOutQ: "Sign out of this phone?", signOutBody: "This clears your records from this device. You'll need a new code to sign in again.",
  signedOut: "Signed out. Your records were cleared from this device.", cancel: ["Cancel", "റദ്ദാക്കുക"],
  details: ["Details", "വിശദാംശങ്ങൾ"], sendRequest: ["Send request", "അപേക്ഷ അയയ്ക്കുക"], requestSent: "Request sent. You can track it in Your requests.",
  replyWithin: "We reply within 90 days. You can track this in Your requests.",
  correctionBody: "Tell us what's wrong in your record. Your doctor or the records team will check it.", correctionPh: "For example: my allergy to sulfa drugs is missing.",
  eraseBody: "We'll erase what we're allowed to. Records the law requires us to keep stay with the hospital, and we'll tell you what was kept.", erasePh: "Anything you want us to know (optional)",
  grievanceBody: "Tell us what went wrong with how your data was handled. The grievance officer will reply.", grievancePh: "What happened, and when?",
  nomineeBody: "A nominee can use your data rights if you can't, for example because of illness.", nomineeName: "Nominee's full name", relationship: "Relationship to you", relPh: "For example: husband",
  addTitle: ["Add to your record", "രേഖയിൽ ചേർക്കുക"], addUploadSub: ["Lab results, scans, outside prescriptions", "ലാബ് ഫലങ്ങൾ, സ്കാനുകൾ, കുറിപ്പടികൾ"],
  addReadingSub: ["Blood pressure, sugar or weight", "രക്തസമ്മർദ്ദം, ഷുഗർ, ഭാരം"], addSymptom: ["Tell us a symptom", "ലക്ഷണം അറിയിക്കുക"], addSymptomSub: ["For your care team to review", "ഡോക്ടർമാർ പരിശോധിക്കും"],
  addSos: "Feeling very unwell? Call 112 or casualty instead of using the app.",
  takePhoto: ["Take a photo", "ഫോട്ടോ എടുക്കുക"], chooseFile: ["Choose a file", "ഫയൽ തിരഞ്ഞെടുക്കുക"], fileRules: "PDF, JPEG or PNG, up to 10 MB",
  photoPrivacy: ["Photos are made smaller and location data is removed before upload.", "അപ്‌ലോഡിന് മുമ്പ് ഫോട്ടോ ചെറുതാക്കി ലൊക്കേഷൻ വിവരങ്ങൾ നീക്കും."], useSample: "Use a sample report",
  fileTooBig: "This file is over 10 MB. Try a photo of each page instead.", fileWrongType: "Only PDF, JPEG or PNG files can be uploaded.", change: "Change",
  whatReport: ["What kind of report is this?", "ഇത് ഏത് തരം റിപ്പോർട്ടാണ്?"], labTest: ["Lab test", "ലാബ് ടെസ്റ്റ്"], scan: ["Scan or X-ray", "സ്കാൻ / എക്സ്-റേ"],
  prescription: ["Prescription", "കുറിപ്പടി"], discharge: "Discharge summary", other: ["Other", "മറ്റുള്ളവ"], reportName: ["Report name", "റിപ്പോർട്ടിന്റെ പേര്"], testDate: ["Date of test", "ടെസ്റ്റ് തീയതി"],
  forPlanItem: "This is for a test in my care plan", shrinking: ["Making photo smaller", "ഫോട്ടോ ചെറുതാക്കുന്നു"], stripping: ["Removing location data", "ലൊക്കേഷൻ വിവരം നീക്കുന്നു"], uploading: ["Uploading securely", "സുരക്ഷിതമായി അപ്‌ലോഡ് ചെയ്യുന്നു"],
  uploaded: ["Uploaded", "അപ്‌ലോഡ് ചെയ്തു"], uploadedBody: [(d) => `It shows as "Waiting for review" until ${d} checks it.`], viewReport: ["View report", "റിപ്പോർട്ട് കാണുക"], doneBtn: ["Done", "ശരി"],
  systolic: ["Upper (systolic)", "മുകളിലെ"], diastolic: ["Lower (diastolic)", "താഴത്തെ"], pulse: ["Pulse (optional)", "പൾസ്"], sugarLevel: ["Sugar level", "ഷുഗർ അളവ്"], whenTaken: ["When was it taken?", "എപ്പോൾ എടുത്തു?"],
  when: ["When", "എപ്പോൾ"], nowW: ["Now", "ഇപ്പോൾ"], earlierToday: ["Earlier today", "ഇന്ന് നേരത്തെ"], bpTip: "Sit and rest for 5 minutes before you measure.",
  implausible: "Check this number. It looks unusual for this reading.",
  outOfRange: [(x, d) => `This is outside the target ${d} set (${x}). It will be flagged for your doctor. If you feel unwell, call casualty or 112.`],
  saveReading: ["Save reading", "സേവ് ചെയ്യുക"], readingSaved: "Reading saved. It shows as not yet reviewed until your doctor sees it.",
  notWatched: ["This form isn't watched around the clock.", "ഈ ഫോം 24 മണിക്കൂറും നിരീക്ഷിക്കുന്നില്ല."], notWatchedBody: ["In an emergency, call 112 or ABC casualty on 0484 000 0112.", "അടിയന്തര സാഹചര്യത്തിൽ 112-ലോ ABC കാഷ്വാലിറ്റിയിലോ (0484 000 0112) വിളിക്കുക."],
  whatFeeling: ["What are you feeling?", "എന്താണ് അനുഭവപ്പെടുന്നത്?"], dizzy: ["Dizziness", "തലകറക്കം"], headache: ["Headache", "തലവേദന"], breath: ["Breathlessness", "ശ്വാസംമുട്ടൽ"],
  chest: ["Chest pain", "നെഞ്ചുവേദന"], swelling: ["Swollen feet", "കാലിൽ നീര്"], tired: ["Tiredness", "ക്ഷീണം"], fever: ["Fever", "പനി"], otherS: ["Something else", "മറ്റെന്തെങ്കിലും"],
  redFlag: ["Chest pain, trouble breathing or severe symptoms can be an emergency. Call 112 or casualty now. Don't wait for a reply here.", "നെഞ്ചുവേദന, ശ്വാസതടസ്സം, കഠിനമായ ലക്ഷണങ്ങൾ അടിയന്തര സാഹചര്യമാകാം. മറുപടിക്ക് കാത്തിരിക്കാതെ ഉടൻ 112-ലോ കാഷ്വാലിറ്റിയിലോ വിളിക്കുക."],
  describe: ["Describe it in your own words", "നിങ്ങളുടെ വാക്കുകളിൽ വിവരിക്കുക"], describePh: "For example: dizzy when I stand up, since Sunday",
  started: ["When did it start?", "എപ്പോൾ തുടങ്ങി?"], yesterday: ["Yesterday", "ഇന്നലെ"], days23: ["2 to 3 days ago", "2-3 ദിവസം മുമ്പ്"], week: ["Over a week", "ഒരാഴ്ചയിലേറെ"],
  howBad: ["How bad is it?", "എത്രത്തോളം ബുദ്ധിമുട്ടുണ്ട്?"], sendCareTeam: ["Send to my care team", "ഡോക്ടർമാർക്ക് അയയ്ക്കുക"],
  symptomSent: "Sent. Your care team will see it at their next review. It isn't watched 24/7.",
  outage: ["We can't reach ABC Hospital's system right now. For anything urgent, call the front desk.", "ഇപ്പോൾ ഹോസ്പിറ്റൽ സിസ്റ്റവുമായി ബന്ധപ്പെടാനാകുന്നില്ല. അടിയന്തര കാര്യങ്ങൾക്ക് ഫ്രണ്ട് ഡെസ്കിൽ വിളിക്കുക."],
  pushEnabled: "Reminders turned on for this phone", pushDisabled: "Reminders turned off for this phone",
};

/* ───────── Fake data only ───────── */
const PEOPLE = [
  { id: "anjali", name: "Anjali Menon", first: "Anjali", ini: "AM", rel: "self", mrn: "ABC-0012-7781", dob: "14 Mar 1984", phone: "+91 98••••••10", email: "an•••@example.com" },
  { id: "aarav", name: "Aarav Menon", first: "Aarav", ini: "AV", rel: "guardian", mrn: "ABC-0019-4402", dob: "2 Jun 2017", kid: true },
];
const MET = { bp: [HeartPulse, "mmHg"], sugar: [Droplet, "mg/dL"], weight: [Scale, "kg"], a1c: [FlaskConical, "%"] };
const KIND = { lab: [FlaskConical, "leaf"], scan: [Activity, "mist"], rx: [Pill, "zari"], disc: [FileText, "mist"], other: [FileText, "mist"] };
const fmtV = (k, v) => (k === "bp" ? v[0] + "/" + v[1] : String(v));
const isHigh = (k, v) => (k === "bp" ? v[0] >= 130 || v[1] >= 80 : k === "sugar" ? v > 130 || v < 80 : k === "a1c" ? v >= 7 : false);
const fmtSize = (b) => (b > 1e6 ? (b / 1e6).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1e3)) + " KB");
const metricsOf = (d) => ["bp", "sugar", "weight", "a1c"].filter((k) => d.readings[k] && d.readings[k].length);
const cls = (...a) => a.filter(Boolean).join(" ");
const DR = "Dr. Rahul Nair";

const seed = () => ({
  anjali: {
    doc: DR, planFrom: "22 Sep 2026", review: "15 Oct 2026",
    tg: { bp: "below 130/80", sugar: "80 to 130 mg/dL before breakfast", a1c: "below 7%" },
    next: { doc: DR, dept: "General Medicine", day: "Thu", date: "15 Oct", time: "10:30 AM", place: "OP Block B, Room 12", days: 9, ics: "20261015T050000Z" },
    meds: [
      { id: "m1", name: "Metformin", dose: "500 mg", how: "1 tablet", food: "afterFood", p: [1, 0, 1], since: "Mar 2021", by: DR, on: true },
      { id: "m2", name: "Amlodipine", dose: "5 mg", how: "1 tablet", food: "afterFood", p: [1, 0, 0], since: "18 Aug 2026", by: DR, on: true },
      { id: "m3", name: "Atorvastatin", dose: "10 mg", how: "1 tablet", food: "atBed", p: [0, 0, 1], since: "22 Sep 2026", by: DR, on: true },
      { id: "m4", name: "Glimepiride", dose: "1 mg", how: "1 tablet", food: "beforeFood", p: [1, 0, 0], since: "Mar 2024", stop: "22 Sep 2026", by: DR, on: false },
    ],
    slots: [{ k: "morning", time: "8:00 AM", meds: ["m1", "m2"] }, { k: "night", time: "9:00 PM", meds: ["m1", "m3"], eta: [1, 31] }],
    doses: { "morning-m1": "8:14 AM", "morning-m2": "8:14 AM" }, week: [1, 1, 0.75, 1, 1, 1],
    tests: [{ id: "t1", name: "HbA1c", due: "Mon 12 Oct", st: "todo" }, { id: "t2", name: "Lipid profile, fasting", due: "Mon 12 Oct", st: "sent", on: "3 Oct" }],
    logs: [
      { id: "l1", k: "bp", name: "Blood pressure", when: "Monday and Thursday mornings", next: "Thu 8 Oct", last: "5 Oct", missed: "Mon 28 Sep" },
      { id: "l2", k: "sugar", name: "Fasting sugar", when: "Every Monday, before breakfast", next: "Mon 12 Oct", last: "5 Oct" },
    ],
    instr: ["Walk for 30 minutes, 5 days a week.", "Keep salt low. Go easy on pickles, papadam and dried fish.", "Take metformin after food, never on an empty stomach."],
    readings: {
      bp: [{ d: "18 Aug", v: [146, 92], s: "h" }, { d: "22 Sep", v: [142, 90], s: "h" }, { d: "24 Sep", v: [136, 88], s: "y" }, { d: "1 Oct", v: [134, 86], s: "y" }, { d: "5 Oct", v: [131, 84], s: "y" }],
      sugar: [{ d: "18 Aug", v: 148, s: "h", ctx: "fasting" }, { d: "20 Sep", v: 132, s: "h", ctx: "fasting" }, { d: "28 Sep", v: 126, s: "y", ctx: "fasting" }, { d: "5 Oct", v: 118, s: "y", ctx: "fasting" }],
      weight: [{ d: "18 Aug", v: 70.6, s: "h" }, { d: "22 Sep", v: 69.4, s: "h" }, { d: "5 Oct", v: 68.2, s: "y" }],
      a1c: [{ d: "Mar", v: 8.4, s: "h" }, { d: "Jun", v: 8.1, s: "h" }, { d: "20 Sep", v: 7.4, s: "h" }],
    },
    reports: [
      { id: "r1", title: "Lipid profile", kind: "lab", s: "y", date: "3 Oct 2026", mon: "October 2026", st: "wait", file: "lipid-profile.pdf", size: "412 KB" },
      { id: "r2", title: "HbA1c and fasting glucose", kind: "lab", s: "h", src: "ABC Hospital lab", date: "20 Sep 2026", mon: "September 2026", st: "rev", by: DR, on: "22 Sep 2026", file: "hba1c-20-sep.pdf", size: "188 KB", trend: "a1c",
        vals: [{ k: "HbA1c", v: "7.4", u: "%", ref: "Target below 7", hi: true }, { k: "Fasting glucose", v: "132", u: "mg/dL", ref: "Normal 70 to 100", hi: true }] },
      { id: "r3", title: "ECG", kind: "scan", s: "h", src: "ABC Hospital cardiology", date: "22 Sep 2026", mon: "September 2026", st: "rev", by: DR, on: "22 Sep 2026", file: "ecg-22-sep.pdf", size: "96 KB", vals: [{ k: "Result", v: "Normal sinus rhythm" }] },
      { id: "r4", title: "Chest X-ray", kind: "scan", s: "h", src: "ABC Hospital radiology", date: "18 Aug 2026", mon: "August 2026", st: "rev", by: DR, on: "18 Aug 2026", file: "chest-xray.jpg", size: "1.2 MB", vals: [{ k: "Result", v: "No abnormality seen" }] },
      { id: "r5", title: "Old prescription from family doctor", kind: "rx", s: "y", date: "12 Aug 2026", mon: "August 2026", st: "rev", by: DR, on: "18 Aug 2026", file: "prescription.jpg", size: "860 KB", vals: [] },
    ],
    visits: [
      { id: "v1", date: "22 Sep 2026", doc: DR, dept: "General Medicine", reason: "Follow-up for diabetes and blood pressure", found: "BP 142/90. HbA1c 7.4%, down from 8.1% in June. Weight 69.4 kg. Feet checked, no problems.",
        plan: "Continue metformin. Stop glimepiride. Start atorvastatin 10 mg. Check BP at home twice a week. Repeat HbA1c and lipid profile before the next visit.", signed: "22 Sep 2026, 11:42 AM",
        add: [{ on: "23 Sep 2026, 9:05 AM", by: DR, text: "Atorvastatin is to be taken at night, not in the morning." }] },
      { id: "v2", date: "18 Aug 2026", doc: DR, dept: "General Medicine", reason: "High blood pressure readings at a pharmacy", found: "BP 146/92 on two readings. Chest X-ray clear.", plan: "Start amlodipine 5 mg in the morning. Cut down on salt. Review in 4 to 5 weeks.", signed: "18 Aug 2026, 12:10 PM", add: [] },
    ],
    conds: [{ n: "Type 2 diabetes", since: "2021", on: true }, { n: "High blood pressure", since: "2026", on: true }, { n: "Childhood asthma", since: "1992", on: false }],
    allergies: [{ n: "Penicillin", r: "Skin rash", sev: "moderate" }, { n: "Shellfish", r: "Itching", sev: "mild" }],
    symptoms: [{ id: "s1", date: "29 Sep 2026", text: "Mild headache in the evenings for 3 days.", sev: "mild", st: "seen", by: DR }],
    appts: [
      { id: "a2", date: "Tue, 22 Sep 2026", time: "11:00 AM", doc: DR, dept: "General Medicine", st: "done" },
      { id: "a3", date: "Tue, 18 Aug 2026", time: "11:30 AM", doc: DR, dept: "General Medicine", st: "done" },
      { id: "a4", date: "Thu, 2 Jul 2026", time: "10:00 AM", doc: "Dr. Anita Paul", dept: "Ophthalmology", st: "missed" },
    ],
    rem: [
      { id: "n1", w: "today", k: "nightMeds", sub: "Metformin, Atorvastatin", time: "9:00 PM", ic: "pill" },
      { id: "n2", w: "next", k: "checkBp", time: "Thu 8 Oct, 7:00 AM", ic: "heart" },
      { id: "n3", w: "next", k: "fastingSugar", time: "Mon 12 Oct, 7:00 AM", ic: "drop" },
      { id: "n4", w: "next", k: "testsDue", sub: "HbA1c", time: "Mon 12 Oct", ic: "flask" },
      { id: "n5", w: "next", k: "visitSoon", sub: "Dr. Rahul Nair, 10:30 AM", time: "Wed 14 Oct, 6:00 PM", ic: "cal" },
      { id: "n0", w: "earlier", k: "morningMeds", sub: "Metformin, Amlodipine", time: "8:00 AM", ic: "pill", done: "8:14 AM" },
    ],
    reqs: [{ id: "q1", k: "correction", text: "My date of birth is 14 Mar 1984, not 4 Mar.", sent: "12 Sep 2026", st: "closed", closed: "19 Sep 2026" }],
  },
  aarav: {
    doc: "Dr. Meera Iyer", planFrom: "15 Sep 2026", review: "28 Oct 2026", tg: {},
    next: { doc: "Dr. Meera Iyer", dept: "Pediatrics", day: "Wed", date: "28 Oct", time: "4:00 PM", place: "Children's OP, Room 3", days: 22, ics: "20261028T103000Z" },
    meds: [
      { id: "m1", name: "Budesonide inhaler", dose: "100 mcg", how: "2 puffs", food: "atBed", p: [0, 0, 1], since: "Apr 2022", by: "Dr. Meera Iyer", on: true },
      { id: "m2", name: "Salbutamol inhaler", dose: "100 mcg", how: "2 puffs", p: null, since: "Apr 2022", by: "Dr. Meera Iyer", on: true },
    ],
    slots: [{ k: "night", time: "8:30 PM", meds: ["m1"], eta: [1, 1] }], doses: {}, week: [1, 1, 1, 0, 1, 1],
    tests: [], logs: [{ id: "l1", k: "weight", name: "Weight", when: "Once a month", next: "Sun 1 Nov", last: "15 Sep" }],
    instr: ["Rinse mouth with water after the budesonide inhaler.", "Carry the salbutamol inhaler to school."],
    readings: { weight: [{ d: "10 Jun", v: 26.9, s: "h" }, { d: "15 Sep", v: 28.1, s: "h" }] },
    reports: [{ id: "r1", title: "Spirometry", kind: "lab", s: "h", src: "ABC Hospital lab", date: "15 Sep 2026", mon: "September 2026", st: "rev", by: "Dr. Meera Iyer", on: "15 Sep 2026", file: "spirometry.pdf", size: "240 KB", vals: [{ k: "FEV1", v: "92", u: "% of expected" }] }],
    visits: [{ id: "v1", date: "15 Sep 2026", doc: "Dr. Meera Iyer", dept: "Pediatrics", reason: "Asthma review", found: "Chest clear. Two night-time coughing spells in the last month.", plan: "Continue budesonide at night. Salbutamol when needed. Review in 6 weeks.", signed: "15 Sep 2026, 4:40 PM", add: [] }],
    conds: [{ n: "Asthma, mild", since: "2022", on: true }], allergies: [{ n: "Peanuts", r: "Hives", sev: "moderate" }], symptoms: [],
    appts: [{ id: "a2", date: "Tue, 15 Sep 2026", time: "4:00 PM", doc: "Dr. Meera Iyer", dept: "Pediatrics", st: "done" }],
    rem: [
      { id: "n1", w: "today", k: "nightMeds", sub: "Budesonide inhaler", time: "8:30 PM", ic: "pill" },
      { id: "n2", w: "next", k: "visitSoon", sub: "Dr. Meera Iyer, 4:00 PM", time: "Tue 27 Oct, 6:00 PM", ic: "cal" },
      { id: "n3", w: "next", k: "logWeight", time: "Sun 1 Nov", ic: "scale" },
    ],
    reqs: [],
  },
});

/* ───────── Context ───────── */
const Ctx = createContext(null);
const useA = () => useContext(Ctx);

/* ───────── Primitives ───────── */
function Btn({ k = "pri", sm, className = "", ...r }) { return <button className={cls("btn press", "btn-" + k, sm && "btn-sm", className)} {...r} />; }
function Tag({ tone = "mist", icon: I, children }) { return <span className={"tag tag-" + tone}>{I && <I size={14} strokeWidth={2.5} />}{children}</span>; }
function Seg({ opts, val, set, sm, label }) {
  return (
    <div className={cls("seg", sm && "seg-sm")} role="radiogroup" aria-label={label}>
      {opts.map(([v, l, a]) => <button key={v} role="radio" aria-checked={val === v} aria-label={a} className={val === v ? "on" : ""} onClick={() => set(v)}>{l}</button>)}
    </div>
  );
}
function Dots({ p }) {
  const { t } = useA();
  if (!p) return <span className="text-sm ink2">{t("whenNeeded")}</span>;
  return (
    <span className="dots" aria-label={`${t("morning")} ${p[0]}, ${t("noon")} ${p[1]}, ${t("night")} ${p[2]}`}>
      {p.map((x, i) => <i key={i} className={x ? "on" : ""} />)}<b aria-hidden="true">{p.join("-")}</b>
    </span>
  );
}
function Spark({ data }) {
  if (!data || data.length < 2) return <div style={{ height: 34 }} />;
  const w = 120, h = 34, mn = Math.min(...data), mx = Math.max(...data), r = mx - mn || 1;
  const pts = data.map((v, i) => [(i * (w - 8)) / (data.length - 1) + 4, h - 5 - ((v - mn) / r) * (h - 10)]);
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full mt-2" style={{ height: 34 }} aria-hidden="true">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="#1F6B4F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r="3.5" fill="#fff" stroke="#1F6B4F" strokeWidth="2.2" />
    </svg>
  );
}
function Av({ p, s = 40 }) { return <span className={cls("av", p.kid && "kid")} style={{ width: s, height: s, fontSize: s * 0.36 }} aria-hidden="true">{p.ini}</span>; }
function Sw({ on, set, label }) { return <button role="switch" aria-checked={on} aria-label={label} className={cls("sw", on && "on")} onClick={() => set(!on)}><i /></button>; }
function H({ children, right, id }) { return <div className="flex items-end justify-between gap-3 mb-3"><h2 className="h2" id={id}>{children}</h2>{right}</div>; }
function Logo() {
  const { t } = useA();
  return <div className="flex items-center gap-3"><span className="logo" aria-hidden="true">ABC</span><span className="leading-tight"><b className="block">ABC Hospital</b><span className="block text-sm ink3">{t("careApp")}</span></span></div>;
}
function PageHead({ title, sub, back, right }) {
  const { t } = useA();
  return (
    <div className="pt-3 pb-6 lg:pt-0">
      {back && <button className="back press" onClick={back}><ChevronLeft size={20} />{t("back")}</button>}
      <div className="flex items-start justify-between gap-4"><h1 className="disp h1">{title}</h1>{right}</div>
      {sub && <p className="ink2 mt-2 max-w-2xl">{sub}</p>}
    </div>
  );
}
function Empty({ I, title, body, act }) {
  return <div className="empty"><span className="ico ico-mist ico-lg"><I size={24} /></span><h3 className="h3 mt-3">{title}</h3><p className="text-sm ink2 mt-1 max-w-xs">{body}</p>{act}</div>;
}
function NavRow({ I, l, sub, go }) {
  return <button className="row press text-left" onClick={go}><span className="ico ico-mist"><I size={18} /></span><span className="flex-1 min-w-0"><b className="block">{l}</b>{sub && <span className="block text-sm ink3">{sub}</span>}</span><ChevronRight size={20} className="ink3 flex-none" /></button>;
}
function Sheet({ title, onClose, children, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const f = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", f);
    ref.current && ref.current.focus();
    return () => window.removeEventListener("keydown", f);
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center lg:p-6">
      <div className="scrim absolute inset-0" onClick={onClose} />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={cls("sheet relative w-full outline-none", wide ? "lg:max-w-2xl" : "lg:max-w-lg")}>
        <div className="grab lg:hidden" />
        <div className="flex items-start justify-between gap-3 px-5 pt-2 pb-3 lg:px-7 lg:pt-6">
          <h2 className="disp h-sheet">{title}</h2>
          <button className="icon-btn press" onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>
        <div className="sheet-body px-5 pb-8 lg:px-7">{children}</div>
      </div>
    </div>
  );
}

/* ───────── Sign-in flow ───────── */
function LangSwitch() {
  const { lang, setLang } = useA();
  return <div style={{ width: 190 }}><Seg sm opts={[["en", "English"], ["ml", "മലയാളം"]]} val={lang} set={setLang} label="Language" /></div>;
}
function AuthFrame({ back, title, sub, children }) {
  const { t } = useA();
  return (
    <div className="min-h-screen flex flex-col">
      <div className="zari-band" />
      <div className="flex items-center justify-between gap-3 px-4 lg:px-10 pt-4">
        {back ? <button className="back press" onClick={back} style={{ marginBottom: 0 }}><ChevronLeft size={20} />{t("back")}</button> : <Logo />}
        <LangSwitch />
      </div>
      <main className="flex-1 w-full max-w-md mx-auto px-5 pt-8 pb-16 lg:pt-14">
        <h1 className="disp h1">{title}</h1>
        {sub && <p className="ink2 mt-3 text-lg">{sub}</p>}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}
function Welcome() {
  const { t, go } = useA();
  const pv = [[Pill, t("pv1"), "9:00 PM", "leaf"], [BadgeCheck, t("pv2"), DR, "leaf"], [CalendarDays, t("pv3"), "10:30 AM", "zari"]];
  return (
    <div className="min-h-screen flex flex-col">
      <div className="zari-band" />
      <header className="flex items-center justify-between gap-4 px-5 lg:px-12 pt-5"><Logo /><LangSwitch /></header>
      <main className="flex-1 w-full max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center px-5 lg:px-12 py-10">
        <div>
          <h1 className="disp hero-t kin">{t("tagline")}</h1>
          <p className="ink2 text-lg mt-5 max-w-md">{t("welcomeSub")}</p>
          <div className="mt-8 max-w-sm">
            <Btn className="w-full" onClick={() => go("signin")}>{t("signIn")}</Btn>
            <p className="text-sm ink3 mt-4">{t("newHere")}</p>
          </div>
        </div>
        <div className="flex flex-col gap-3" aria-hidden="true">
          {pv.map(([I, a, b, tone], i) => (
            <div key={i} className="pv spring" style={{ "--i": i + 4 }}>
              <span className={"ico ico-" + tone}><I size={20} /></span>
              <span className="flex-1 min-w-0"><b className="block truncate">{a}</b><span className="block text-sm ink3">{b}</span></span>
            </div>
          ))}
        </div>
      </main>
      <footer className="px-5 lg:px-12 pb-8"><a className="inline-flex items-center gap-2 font-semibold lat" href="tel:112"><Phone size={16} />{t("emergency112")}</a></footer>
    </div>
  );
}
function SignIn() {
  const { t, go, setContact } = useA();
  const [m, setM] = useState("phone");
  const [v, setV] = useState("98765 43210");
  const [chk, setChk] = useState(0);
  useEffect(() => { const a = setTimeout(() => setChk(1), 300), b = setTimeout(() => setChk(2), 1500); return () => { clearTimeout(a); clearTimeout(b); }; }, []);
  const ok = m === "phone" ? v.replace(/\D/g, "").length === 10 : /^\S+@\S+\.\S+$/.test(v);
  const send = () => {
    setContact(m === "phone" ? "+91 " + v.replace(/\D/g, "").replace(/^(\d{2})\d{6}(\d{2})$/, "$1••••••$2") : v.replace(/^(.{2}).*(@.*)$/, "$1•••$2"));
    go("otp");
  };
  return (
    <AuthFrame back={() => go("welcome")} title={t("signIn")} sub={t("signInSub")}>
      <Seg opts={[["phone", t("phone")], ["email", t("email")]]} val={m} set={(x) => { setM(x); setV(x === "phone" ? "98765 43210" : "anjali@example.com"); }} label={t("signIn")} />
      <label className="lbl mt-6" htmlFor="contact">{m === "phone" ? t("phoneLabel") : t("emailLabel")}</label>
      <div className="field">
        {m === "phone" && <span className="pfx">+91</span>}
        <input id="contact" value={v} type={m === "phone" ? "tel" : "email"} inputMode={m === "phone" ? "numeric" : "email"} autoComplete={m === "phone" ? "tel-national" : "email"}
          onChange={(e) => setV(m === "phone" ? e.target.value.replace(/[^\d ]/g, "").slice(0, 11) : e.target.value)} />
      </div>
      <div className="secchk mt-4" aria-live="polite">
        <ShieldCheck size={20} className={chk === 2 ? "leaf" : "ink3"} />
        <span className="flex-1">{t("secCheck")}</span>
        {chk < 2 ? <span className="flex items-center gap-2 text-sm ink3"><span className="spin" />{t("checking")}</span> : <Tag tone="leaf" icon={Check}>{t("secDone")}</Tag>}
      </div>
      <Btn className="w-full mt-6" disabled={!ok || chk < 2} onClick={send}>{t("sendCode")}</Btn>
      <p className="text-sm ink3 mt-5">{t("numberChanged")}</p>
    </AuthFrame>
  );
}
function Otp() {
  const { t, go, contact, toast } = useA();
  const E = ["", "", "", "", "", ""];
  const [d, setD] = useState(E);
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sec, setSec] = useState(30);
  const refs = useRef([]);
  useEffect(() => { refs.current[0] && refs.current[0].focus(); }, []);
  useEffect(() => { if (sec <= 0) return; const id = setTimeout(() => setSec(sec - 1), 1000); return () => clearTimeout(id); }, [sec]);
  const check = (arr) => {
    if (arr.join("").length < 6) return;
    setBusy(true); setErr(false);
    setTimeout(() => {
      setBusy(false);
      if (arr.join("") === "000000") { setErr(true); setD(E); refs.current[0] && refs.current[0].focus(); } else go("consent");
    }, 900);
  };
  const fill = (str) => {
    const a = str.replace(/\D/g, "").slice(0, 6).split("");
    const n = E.map((_, i) => a[i] || "");
    setD(n); refs.current[Math.min(a.length, 5)] && refs.current[Math.min(a.length, 5)].focus(); check(n);
  };
  const onCh = (i, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length >= 6) return fill(raw);
    const n = [...d]; n[i] = raw.slice(-1); setD(n); setErr(false);
    if (n[i] && i < 5) refs.current[i + 1].focus();
    check(n);
  };
  return (
    <AuthFrame back={() => go("signin")} title={t("otpTitle")} sub={t("sentTo", contact)}>
      <div className={cls("otp", err && "shake")} role="group" aria-label={t("otpTitle")}>
        {d.map((x, i) => (
          <input key={i} ref={(el) => (refs.current[i] = el)} value={x} inputMode="numeric" maxLength={6} autoComplete={i === 0 ? "one-time-code" : "off"} aria-label={`Digit ${i + 1}`}
            className={cls(x && "filled", err && "bad")} onChange={(e) => onCh(i, e)}
            onKeyDown={(e) => { if (e.key === "Backspace" && !d[i] && i > 0) refs.current[i - 1].focus(); }}
            onPaste={(e) => { e.preventDefault(); fill(e.clipboardData.getData("text")); }} />
        ))}
      </div>
      {err && <p className="err mt-3" role="alert"><AlertTriangle size={18} className="flex-none mt-0.5" />{t("wrongCode")}</p>}
      <button className="webotp press mt-5" onClick={() => fill("482913")}>
        <MessageSquare size={18} className="leaf" /><span className="flex-1 text-left">{t("fromMsgs")}: <b className="num">482 913</b></span><span className="text-sm leaf font-semibold">{t("tapFill")}</span>
      </button>
      <div className="flex items-center justify-between gap-3 mt-6 min-h-8">
        {sec > 0 ? <span className="ink3 text-sm">{t("resendIn", String(sec).padStart(2, "0"))}</span> : <button className="link" onClick={() => { setSec(30); toast(t("codeResent")); }}>{t("resend")}</button>}
        {busy && <span className="flex items-center gap-2 text-sm ink2"><span className="spin" />{t("verifying")}</span>}
      </div>
    </AuthFrame>
  );
}
function NoticeBody() {
  const { t } = useA();
  const rows = [[FileText, "c1h", "c1"], [Bell, "c2h", "c2"], [Eye, "c3h", "c3"], [MapPin, "c4h", "c4"], [ShieldCheck, "c5h", "c5"]];
  return (
    <div className="grp">
      {rows.map(([I, h, b]) => (
        <div key={h} className="row items-start"><span className="ico ico-leaf"><I size={18} /></span><div><h3 className="h3">{t(h)}</h3><p className="ink2 mt-1">{t(b)}</p></div></div>
      ))}
    </div>
  );
}
function Consent() {
  const { t, go, toast } = useA();
  const [ok, setOk] = useState(false);
  return (
    <AuthFrame title={t("consentTitle")} sub={t("consentSub")}>
      <NoticeBody />
      <p className="text-sm ink3 mt-4">{t("noticeVersion")}</p>
      <p className="text-sm ink3 mt-1">{t("grievanceLine")}</p>
      <label className="check mt-6"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /><span>{t("agreeCheck")}</span></label>
      <div className="flex gap-3 mt-6">
        <Btn k="sec" onClick={() => { go("welcome"); toast(t("consentLater")); }}>{t("notNow")}</Btn>
        <Btn className="flex-1" disabled={!ok} onClick={() => go("who")}>{t("agree")}</Btn>
      </div>
    </AuthFrame>
  );
}
function WhoList({ after }) {
  const { t, pid, setPid } = useA();
  return (
    <div className="flex flex-col gap-3" role="radiogroup">
      {PEOPLE.map((p) => (
        <button key={p.id} role="radio" aria-checked={pid === p.id} className={cls("who press", pid === p.id && "on")} onClick={() => { setPid(p.id); after && after(p); }}>
          <Av p={p} s={52} />
          <span className="flex-1 min-w-0">
            <b className="block text-lg">{p.name}</b>
            <span className="block ink2 text-sm">{p.rel === "self" ? t("you") : t("childGuardian")}</span>
            <span className="block ink3 text-sm">{t("hospitalNo")} {p.mrn}</span>
          </span>
          <span className="radio" />
        </button>
      ))}
    </div>
  );
}
function Who() {
  const { t, go } = useA();
  return (
    <AuthFrame title={t("whoTitle")} sub={t("whoSub")}>
      <WhoList />
      <p className="flex gap-2 text-sm ink3 mt-5"><Info size={18} className="flex-none" />{t("addFamily")}</p>
      <Btn className="w-full mt-6" onClick={() => go("app")}>{t("continue")}</Btn>
    </AuthFrame>
  );
}

/* ───────── App shell ───────── */
function Top() {
  const { t, p, open, setTab, d } = useA();
  const n = d.rem.filter((r) => r.w !== "earlier").length;
  return (
    <header className="topbar lg:hidden">
      <button className="flex items-center gap-3 press pr-2" onClick={() => open({ type: "who" })} aria-label="Switch profile">
        <Av p={p} s={40} />
        <span className="text-left leading-tight"><b className="block">{p.first}</b><span className="block text-xs ink3">{p.rel === "self" ? t("you") : t("guardianOf")}</span></span>
        <ChevronDown size={18} className="ink3" />
      </button>
      <button className="icon-btn press relative" onClick={() => setTab("reminders")} aria-label={`${t("reminders")}, ${n}`}><Bell size={22} />{n > 0 && <span className="badge">{n}</span>}</button>
    </header>
  );
}
function Side() {
  const { t, p, open, setTab, tab, d } = useA();
  const act = tab === "privacy" ? "me" : tab;
  const items = [["home", Home, t("home")], ["plan", ClipboardList, t("plan")], ["records", FileText, t("records")], ["reminders", Bell, t("reminders")], ["appts", CalendarDays, t("appts")], ["me", User, t("profile")]];
  return (
    <aside className="side hidden lg:flex">
      <Logo />
      <button className="side-who press" onClick={() => open({ type: "who" })}>
        <Av p={p} s={40} /><span className="flex-1 min-w-0 text-left leading-tight"><b className="block truncate">{p.name}</b><span className="block text-sm ink3">{p.rel === "self" ? t("you") : t("guardianOf")}</span></span><ChevronDown size={18} className="ink3" />
      </button>
      <nav className="flex flex-col gap-1" aria-label="Main">
        {items.map(([v, I, l]) => (
          <button key={v} className={cls("sn press", act === v && "on")} onClick={() => setTab(v)} aria-current={act === v ? "page" : undefined}>
            <I size={20} />{l}{v === "reminders" && <span className="sn-n">{d.rem.filter((r) => r.w !== "earlier").length}</span>}
          </button>
        ))}
      </nav>
      <Btn onClick={() => open({ type: "add" })}><Plus size={20} />{t("addShort")}</Btn>
      <div className="mt-auto side-sos">
        <b className="block lat">{t("emergencyTitle")}</b>
        <a href="tel:112" className="block mt-1 text-2xl num">112</a>
        <a href="tel:04840000112" className="block text-sm">{t("casualty")} 0484 000 0112</a>
      </div>
    </aside>
  );
}
function BNav() {
  const { t, setTab, open, tab } = useA();
  const parent = { reminders: "home", appts: "home", privacy: "me" }[tab] || tab;
  const it = [["home", Home, t("home")], ["plan", ClipboardList, t("planShort")], null, ["records", FileText, t("records")], ["me", User, t("profile")]];
  return (
    <nav className="bnav lg:hidden" aria-label="Main">
      {it.map((x) => {
        if (!x) return <button key="add" className="fab press" onClick={() => open({ type: "add" })} aria-label={t("addTitle")}><Plus size={28} /></button>;
        const [v, I, l] = x;
        return <button key={v} className={cls("bn", parent === v && "on")} onClick={() => setTab(v)} aria-current={parent === v ? "page" : undefined}><span className="bi"><I size={22} /></span><span>{l}</span></button>;
      })}
    </nav>
  );
}
function Outage() {
  const { t } = useA();
  return <div className="outage" role="alert"><WifiOff size={20} className="flex-none" /><p className="flex-1">{t("outage")}</p><a href="tel:04840001234" className="btn btn-sm btn-light press">{t("callDesk")}</a></div>;
}

/* ───────── Home ───────── */
let introPlayed = false;
function HomeS() {
  const { t, p } = useA();
  const [kin] = useState(() => !introPlayed);
  useEffect(() => { introPlayed = true; }, []);
  return (
    <>
      <div className="pt-3 pb-7 lg:pt-0">
        <p className="ink3 font-medium">{t("dateLine")}</p>
        <h1 className={cls("disp greet mt-1", kin && "kin")}>{t("evening")},<br />{p.first}</h1>
      </div>
      <div className="lg:grid lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7 flex flex-col gap-9">
          <div className="lg:hidden flex flex-col gap-6"><Ticket /><Prep /></div>
          <Meds />
          <ReadTiles />
          <Recent />
          <div className="lg:hidden flex flex-col gap-6"><Install /><Sos /></div>
        </div>
        <div className="hidden lg:block lg:col-span-5"><div className="sticky top-10 flex flex-col gap-6"><Ticket /><Prep /><Install /><Sos /></div></div>
      </div>
    </>
  );
}
function Ticket() {
  const { t, d, toast } = useA();
  const n = d.next;
  const cal = () => {
    try {
      const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ABC Hospital//Care//EN", "BEGIN:VEVENT", `UID:${n.ics}@abchospital.example`, "DTSTAMP:20261006T140000Z", `DTSTART:${n.ics}`, "DURATION:PT30M", "SUMMARY:Visit at ABC Hospital", "LOCATION:ABC Hospital", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
      a.download = "abc-hospital-visit.ics"; a.click();
    } catch (e) { /* preview sandbox may block downloads */ }
    toast(t("calSaved"));
  };
  return (
    <section aria-label={t("nextVisit")}>
      <div className="ticket">
        <div className="tk-main">
          <p className="tk-lbl">{t("nextVisit")}</p>
          <p className="tk-doc">{n.doc}</p>
          <p style={{ opacity: 0.85 }}>{n.dept}</p>
          <div className="tk-when"><div><span>{t("date")}</span><b>{n.day}, {n.date}</b></div><div><span>{t("time")}</span><b>{n.time}</b></div></div>
          <p className="tk-place"><MapPin size={16} className="flex-none" />{n.place}</p>
        </div>
        <div className="tk-stub"><b className="num">{n.days}</b><span>{t("daysToGo")}</span></div>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Btn k="sec" sm onClick={cal}><CalendarPlus size={18} className="flex-none" />{t("addCal")}</Btn>
        <a className="btn btn-sec btn-sm press" href="tel:04840001234"><Phone size={18} className="flex-none" />{t("callDesk")}</a>
      </div>
      <p className="text-sm ink3 mt-2">{t("changeVisit")}</p>
    </section>
  );
}
function Prep() {
  const { t, d, open } = useA();
  const items = [
    ...d.tests.map((x) => ({ id: x.id, l: x.name, ok: x.st === "sent", sub: x.st === "sent" ? t("uploadedWaiting", x.on) : t("due", x.due), act: x.st !== "sent" && [t("upload"), () => open({ type: "upload", test: x.id })] })),
    ...d.logs.slice(0, 1).map((x) => ({ id: x.id, l: x.name, ok: false, sub: t("nextOn", x.next), act: [t("logNow"), () => open({ type: "reading", k: x.k })] })),
  ];
  if (!items.length) return null;
  const done = items.filter((i) => i.ok).length;
  return (
    <section className="grp" aria-labelledby="prep-h">
      <div className="flex items-center justify-between px-4 pt-4"><h2 className="h3" id="prep-h">{t("beforeVisit")}</h2><span className="text-sm ink3">{t("doneOf", done, items.length)}</span></div>
      <div className="prog mx-4 mt-3 mb-1"><i style={{ width: (done / items.length) * 100 + "%" }} /></div>
      {items.map((i) => (
        <div key={i.id} className="row">
          <span className={cls("tick", i.ok && "on")}>{i.ok && <Check size={14} strokeWidth={3} />}</span>
          <div className="flex-1 min-w-0"><b className={cls("block", i.ok && "ink2")}>{i.l}</b><span className="block text-sm ink3">{i.sub}</span></div>
          {i.act && <Btn k="tint" sm onClick={i.act[1]}>{i.act[0]}</Btn>}
        </div>
      ))}
    </section>
  );
}
function Meds() {
  const { t, d, take } = useA();
  const all = d.slots.flatMap((s) => s.meds.map((m) => s.k + "-" + m));
  const tk = all.filter((k) => d.doses[k]).length;
  return (
    <section aria-labelledby="meds-h">
      <H id="meds-h" right={<span className="text-sm ink3">{t("takenOf", tk, all.length)}</span>}>{t("todaysMeds")}</H>
      <ol>
        {d.slots.map((s) => {
          const done = s.meds.every((m) => d.doses[s.k + "-" + m]);
          const SI = s.k === "night" ? Moon : Sun;
          return (
            <li key={s.k} className={cls("tl-i", done ? "done" : s.eta && "now")}>
              <span className="tl-node">{done ? <Check size={14} strokeWidth={3} /> : <SI size={14} />}</span>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <b>{t(s.k)}</b><span className="ink2">{s.time}</span>
                <span className="ml-auto text-sm">{done ? <span className="leaf font-semibold">{t("allTaken")}</span> : s.eta ? <span className="ink3">{t("inHM", ...s.eta)}</span> : null}</span>
              </div>
              <ul>
                {s.meds.map((mid) => {
                  const m = d.meds.find((x) => x.id === mid), key = s.k + "-" + mid, at = d.doses[key];
                  return (
                    <li key={mid} className="med">
                      <div className="flex-1 min-w-0">
                        <b className="block">{m.name} <span className="font-medium ink2">{m.dose}</span></b>
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1"><Dots p={m.p} /><span className="text-sm ink2">{m.how}{m.food ? ", " + t(m.food) : ""}</span></span>
                      </div>
                      <button className={cls("take press", at && "on")} aria-pressed={!!at} onClick={() => take(key)}>
                        {at ? <span className="flex items-center gap-1"><Check size={16} strokeWidth={3} className="pop" />{at}</span> : t("markTaken")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
function ReadTiles() {
  const { t, d, open, goRead } = useA();
  const ks = metricsOf(d);
  return (
    <section aria-labelledby="rd-h">
      <H id="rd-h" right={ks.length > 0 && <button className="link" onClick={() => goRead(ks[0])}>{t("seeAll")}</button>}>{t("yourReadings")}</H>
      <div className="hscroll tiles -mx-5 px-5 lg:mx-0 lg:px-0">
        {ks.map((k) => {
          const arr = d.readings[k], last = arr[arr.length - 1], [I, u] = MET[k];
          return (
            <button key={k} className="tile press" onClick={() => goRead(k)}>
              <span className="flex items-center gap-2 text-sm ink2 font-medium"><I size={16} className="leaf" />{t(k)}</span>
              <span className="mt-2"><span className="num text-3xl">{fmtV(k, last.v)}</span> <span className="text-sm ink3">{u}</span></span>
              <Spark data={arr.map((r) => (k === "bp" ? r.v[0] : r.v))} />
              <span className="mt-2">{last.s === "y" ? <Tag tone="zari">{t("notReviewed")}</Tag> : <span className="text-sm ink3">{t("hospital")}, {last.d}</span>}</span>
            </button>
          );
        })}
        <button className="tile tile-add press" onClick={() => open({ type: "reading" })}><Plus size={22} />{t("logReading")}</button>
      </div>
    </section>
  );
}
function RStatus({ r }) {
  const { t } = useA();
  return r.st === "rev" ? <Tag tone="leaf" icon={BadgeCheck}>{t("reviewed")}</Tag> : <Tag tone="zari" icon={Clock}>{t("waitingReview")}</Tag>;
}
function RRow({ r }) {
  const { t, open } = useA();
  const [I, tone] = KIND[r.kind] || KIND.other;
  return (
    <button className="row press text-left" onClick={() => open({ type: "report", id: r.id })}>
      <span className={"ico ico-" + tone}><I size={20} /></span>
      <span className="flex-1 min-w-0">
        <b className="block truncate">{r.title}</b>
        <span className="block text-sm ink3 truncate">{r.s === "y" ? t("uploadedByYou") : r.src}, {r.date}</span>
        <span className="block mt-1.5"><RStatus r={r} /></span>
      </span>
      <ChevronRight size={20} className="ink3 flex-none" />
    </button>
  );
}
function Recent() {
  const { t, d, nav } = useA();
  return (
    <section aria-labelledby="rr-h">
      <H id="rr-h" right={<button className="link" onClick={() => nav("records", "reports")}>{t("seeAll")}</button>}>{t("recentReports")}</H>
      <div className="grp">{d.reports.slice(0, 3).map((r) => <RRow key={r.id} r={r} />)}</div>
    </section>
  );
}
function Install() {
  const { t, inst, setInst, toast } = useA();
  if (inst) return null;
  return (
    <section className="note-card">
      <span className="ico ico-leaf"><Smartphone size={20} /></span>
      <div className="flex-1">
        <h2 className="h3">{t("installTitle")}</h2>
        <p className="text-sm ink2 mt-1">{t("installBody")}</p>
        <div className="flex gap-2 mt-3"><Btn sm onClick={() => { setInst(true); toast(t("installed")); }}>{t("install")}</Btn><Btn k="ghost" sm onClick={() => setInst(true)}>{t("later")}</Btn></div>
      </div>
    </section>
  );
}
function Sos() {
  const { t } = useA();
  return (
    <section className="sos" aria-labelledby="sos-h">
      <div className="flex gap-3"><AlertTriangle size={22} className="flex-none mt-0.5 lat" /><div><h2 className="h3" id="sos-h">{t("emergencyTitle")}</h2><p className="text-sm mt-1">{t("emergencyBody")}</p></div></div>
      <div className="grid grid-cols-2 gap-2 mt-4">
        <a className="btn btn-sm btn-danger press" href="tel:112"><Phone size={18} />{t("call112")}</a>
        <a className="btn btn-sm btn-sec press" href="tel:04840000112">{t("callCasualty")}</a>
      </div>
    </section>
  );
}

/* ───────── Care plan ───────── */
function Ring({ v }) {
  const r = 14, c = 2 * Math.PI * r;
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r={r} fill="none" stroke="#DCE3DD" strokeWidth="4" />
      {v > 0 && <circle cx="18" cy="18" r={r} fill="none" stroke="#1F6B4F" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${c * Math.min(v, 1)} ${c}`} transform="rotate(-90 18 18)" style={{ transition: "stroke-dasharray .6s cubic-bezier(.2,1,.3,1)" }} />}
      {v >= 1 && <path d="M12.5 18.5l3.6 3.6 7.4-7.4" fill="none" stroke="#1F6B4F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
function PG({ title, I, children }) {
  return <section className="mt-8"><h2 className="h2 flex items-center gap-2 mb-3"><I size={20} className="leaf" />{title}</h2><div className="grp">{children}</div></section>;
}
function PlanS() {
  const { t, d, open, setTab, lang } = useA();
  const perDay = d.slots.reduce((a, s) => a + s.meds.length, 0);
  const tk = Object.keys(d.doses).length;
  const vals = [...d.week, perDay ? tk / perDay : 0];
  const taken = Math.round(d.week.reduce((a, b) => a + b, 0) * perDay) + tk;
  const days = [["W", "ബു", 30], ["T", "വ്യാ", 1], ["F", "വെ", 2], ["S", "ശ", 3], ["S", "ഞാ", 4], ["M", "തി", 5], ["T", "ചൊ", 6]];
  return (
    <>
      <PageHead title={t("plan")} sub={`${t("planFrom", d.planFrom, d.doc)} ${t("nextReview", d.review)}`} />
      <p className="lock-note"><Lock size={18} className="flex-none mt-0.5" /><span>{t("lockedNote")}</span></p>
      <section className="grp p-4 mt-6" aria-labelledby="wk-h">
        <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 className="h3" id="wk-h">{t("last7")}</h2><span className="text-sm ink3">{t("dosesOf", taken, perDay * 7)}</span></div>
        <div className="grid grid-cols-7 gap-1 mt-3">
          {days.map((x, i) => (
            <div key={i} className={cls("day", i === 6 && "today")}><span className="text-xs ink3">{lang === "ml" ? x[1] : x[0]}</span><Ring v={vals[i]} /><span className="text-xs font-semibold">{x[2]}</span></div>
          ))}
        </div>
      </section>
      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        <div>
          <PG title={t("medicines")} I={Pill}>
            {d.meds.filter((m) => m.on).map((m) => (
              <div key={m.id} className="row">
                <div className="flex-1 min-w-0">
                  <b className="block">{m.name} <span className="font-medium ink2">{m.dose}</span></b>
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1"><Dots p={m.p} /><span className="text-sm ink2">{m.how}{m.food ? ", " + t(m.food) : ""}</span></span>
                  <span className="block text-sm ink3 mt-1">{t("since", m.since)}</span>
                </div>
              </div>
            ))}
          </PG>
          {d.tests.length > 0 && (
            <PG title={t("tests")} I={FlaskConical}>
              {d.tests.map((x) => (
                <div key={x.id} className="row">
                  <div className="flex-1 min-w-0">
                    <b className="block">{x.name}</b>
                    <span className="block mt-1.5">{x.st === "sent" ? <Tag tone="leaf" icon={Check}>{t("uploadedOn", x.on)}</Tag> : <Tag tone="zari" icon={Clock}>{t("due", x.due)}</Tag>}</span>
                  </div>
                  {x.st !== "sent" && <Btn k="tint" sm onClick={() => open({ type: "upload", test: x.id })}><Upload size={16} />{t("upload")}</Btn>}
                </div>
              ))}
            </PG>
          )}
        </div>
        <div>
          <PG title={t("readingsToLog")} I={HeartPulse}>
            {d.logs.map((x) => (
              <div key={x.id} className="row items-start">
                <div className="flex-1 min-w-0">
                  <b className="block">{x.name}</b>
                  <span className="block text-sm ink2">{x.when}</span>
                  <span className="block text-sm ink3 mt-1">{t("lastLogged", x.last)}. {t("nextOn", x.next)}.</span>
                  {x.missed && <span className="block mt-1.5"><Tag tone="lat">{t("missedOn", x.missed)}</Tag></span>}
                </div>
                <Btn k="tint" sm onClick={() => open({ type: "reading", k: x.k })}>{t("logNow")}</Btn>
              </div>
            ))}
          </PG>
          <PG title={t("instructions")} I={Footprints}>
            {d.instr.map((x, i) => <div key={i} className="row items-start"><span className="flex-none mt-2 rounded-full" style={{ width: 8, height: 8, background: "var(--leaf)" }} /><p>{x}</p></div>)}
          </PG>
          <PG title={t("followUp")} I={CalendarDays}>
            <button className="row press text-left" onClick={() => setTab("appts")}>
              <span className="ico ico-zari"><CalendarDays size={20} /></span>
              <span className="flex-1 min-w-0"><b className="block">{d.next.day}, {d.next.date}, {d.next.time}</b><span className="block text-sm ink2">{d.next.doc}, {d.next.dept}</span></span>
              <ChevronRight size={20} className="ink3" />
            </button>
          </PG>
        </div>
      </div>
    </>
  );
}

/* ───────── Records ───────── */
function RecordsS() {
  const { t, recTab, setRecTab, open, d } = useA();
  const tabs = [["reports", t("reports")], ["readings", t("readings")], ["meds", t("medicines")], ["visits", t("visits")], ["summary", t("summary")]];
  return (
    <>
      <PageHead title={t("records")} right={<Btn sm onClick={() => open({ type: "upload" })}><Upload size={18} />{t("upload")}</Btn>} />
      <div className="hscroll flex gap-2 -mx-5 px-5 lg:mx-0 lg:px-0" role="tablist" aria-label={t("records")}>
        {tabs.map(([v, l]) => <button key={v} role="tab" aria-selected={recTab === v} className={cls("pill press", recTab === v && "on")} onClick={() => setRecTab(v)}>{l}{v === "reports" && <span className="pill-n">{d.reports.length}</span>}</button>)}
      </div>
      <div className="mt-6 fadein" key={recTab}>
        {recTab === "reports" && <ReportsT />}
        {recTab === "readings" && <ReadingsT />}
        {recTab === "meds" && <MedsT />}
        {recTab === "visits" && <VisitsT />}
        {recTab === "summary" && <SummaryT />}
      </div>
    </>
  );
}
function ReportsT() {
  const { t, d } = useA();
  const [q, setQ] = useState(""); const [f, setF] = useState("all");
  const list = d.reports.filter((r) => (f === "all" || (f === "rev" && r.st === "rev") || (f === "wait" && r.st === "wait") || (f === "me" && r.s === "y")) && r.title.toLowerCase().includes(q.trim().toLowerCase()));
  const groups = list.reduce((a, r) => { (a[r.mon] = a[r.mon] || []).push(r); return a; }, {});
  return (
    <>
      <div className="field">
        <Search size={20} className="ink3 flex-none" style={{ marginRight: 12 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("searchReports")} aria-label={t("searchReports")} />
        {q && <button className="icon-btn" onClick={() => setQ("")} aria-label="Clear search"><X size={18} /></button>}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {[["all", t("all")], ["rev", t("reviewed")], ["wait", t("waitingReview")], ["me", t("byMe")]].map(([v, l]) => <button key={v} className={cls("chip press", f === v && "on")} aria-pressed={f === v} onClick={() => setF(v)}>{l}</button>)}
      </div>
      {!list.length ? <div className="mt-6"><Empty I={Search} title={t("noReports")} body={t("noReportsBody")} /></div> :
        Object.entries(groups).map(([m, rs]) => (
          <section key={m} className="mt-6"><h2 className="text-sm font-semibold ink3 mb-2">{m}</h2><div className="grp">{rs.map((r) => <RRow key={r.id} r={r} />)}</div></section>
        ))}
    </>
  );
}
function Pt({ cx, cy, payload, c = "#1F6B4F" }) {
  if (cx == null || cy == null) return null;
  return payload.s === "y" ? <circle cx={cx} cy={cy} r={4.5} fill="#fff" stroke={c} strokeWidth={2.2} /> : <circle cx={cx} cy={cy} r={4.5} fill={c} />;
}
function Tip({ active, payload, k }) {
  const { t } = useA();
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload;
  return <div className="tip"><b>{k === "bp" ? p.a + "/" + p.b : p.a} {MET[k][1]}</b><span className="ink3">{p.d}, {p.s === "y" ? t("youLogged") : t("hospital")}</span></div>;
}
function Chart({ k, arr, h = 220 }) {
  const data = arr.map((r) => (k === "bp" ? { d: r.d, a: r.v[0], b: r.v[1], s: r.s } : { d: r.d, a: r.v, s: r.s }));
  const tick = { fontSize: 12, fill: "#5E7168" };
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#E4EAE5" vertical={false} />
          <XAxis dataKey="d" tick={tick} axisLine={false} tickLine={false} />
          <YAxis tick={tick} axisLine={false} tickLine={false} width={44} domain={k === "a1c" || k === "weight" ? ["dataMin - 1", "dataMax + 1"] : ["dataMin - 10", "dataMax + 10"]} />
          {k === "sugar" && <ReferenceArea y1={80} y2={130} fill="#E2EEE7" fillOpacity={0.8} />}
          {k === "bp" && <ReferenceLine y={130} stroke="#B23F2C" strokeDasharray="4 4" />}
          {k === "bp" && <ReferenceLine y={80} stroke="#B23F2C" strokeDasharray="4 4" />}
          {k === "a1c" && <ReferenceLine y={7} stroke="#B23F2C" strokeDasharray="4 4" />}
          <Tooltip content={<Tip k={k} />} />
          <Line type="monotone" dataKey="a" stroke="#1F6B4F" strokeWidth={2.5} dot={<Pt />} activeDot={{ r: 6 }} />
          {k === "bp" && <Line type="monotone" dataKey="b" stroke="#7FA493" strokeWidth={2.5} dot={<Pt c="#7FA493" />} activeDot={{ r: 6 }} />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
function ReadingsT() {
  const { t, d, metric, setMetric, open } = useA();
  const ks = metricsOf(d);
  const k = ks.includes(metric) ? metric : ks[0];
  if (!k) return <Empty I={HeartPulse} title={t("noReadings")} body={t("noReadingsBody")} act={<Btn sm className="mt-4" onClick={() => open({ type: "reading" })}>{t("logReading")}</Btn>} />;
  const arr = d.readings[k], last = arr[arr.length - 1], u = MET[k][1], tg = d.tg[k], high = isHigh(k, last.v);
  return (
    <>
      <div className="flex flex-wrap gap-2">{ks.map((x) => <button key={x} className={cls("chip press", k === x && "on")} aria-pressed={k === x} onClick={() => setMetric(x)}>{t(x)}</button>)}</div>
      <div className="lg:grid lg:grid-cols-5 lg:gap-8 mt-5">
        <div className="lg:col-span-3 grp p-5 self-start">
          <div className="flex items-start justify-between gap-3">
            <div><p className="ink2 text-sm font-medium">{t("latest")}, {last.d}</p><p className="mt-1"><span key={k} className="num big-num kin2">{fmtV(k, last.v)}</span> <span className="ink3">{u}</span></p></div>
            {tg && <Tag tone={high ? "lat" : "leaf"}>{high ? t("outsideTarget") : t("inTarget")}</Tag>}
          </div>
          {tg && <p className="text-sm ink3 mt-2">{t("targetIs", tg, d.doc)}</p>}
          <div className="mt-4"><Chart k={k} arr={arr} /></div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-sm ink2">
            <span className="flex items-center gap-2"><span className="lg-dot fill" />{t("hospital")}</span>
            <span className="flex items-center gap-2"><span className="lg-dot" />{t("youLogged")}</span>
            {k === "bp" && <span>{t("upperLower")}</span>}
          </div>
        </div>
        <div className="lg:col-span-2 mt-8 lg:mt-0">
          <H right={k === "a1c" ? <Btn k="tint" sm onClick={() => open({ type: "upload" })}><Upload size={16} />{t("upload")}</Btn> : <Btn k="tint" sm onClick={() => open({ type: "reading", k })}><Plus size={16} />{t("logShort")}</Btn>}>{t("history")}</H>
          <div className="grp">
            {[...arr].reverse().map((r, i) => (
              <div key={i} className="row">
                <div className="flex-1"><b>{fmtV(k, r.v)} <span className="text-sm ink3 font-normal">{u}</span></b><span className="block text-sm ink3">{r.d}{r.ctx ? ", " + t(r.ctx) : ""}</span></div>
                {r.s === "y" ? <Tag tone="zari">{t("notReviewed")}</Tag> : <Tag tone="mist">{t("hospital")}</Tag>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
function MedsT() {
  const { t, d, open } = useA();
  const row = (m) => (
    <div key={m.id} className="row items-start">
      <span className={cls("ico", m.on ? "ico-leaf" : "ico-mist")}><Pill size={20} /></span>
      <div className="flex-1 min-w-0">
        <b className="block">{m.name} <span className="font-medium ink2">{m.dose}</span></b>
        {m.on ? <span className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1"><Dots p={m.p} /><span className="text-sm ink2">{m.how}{m.food ? ", " + t(m.food) : ""}</span></span> : <span className="block text-sm ink2 mt-1">{t("stoppedOn", m.stop)}</span>}
        <span className="block text-sm ink3 mt-1">{t("prescribedBy", m.by)}</span>
      </div>
    </div>
  );
  const past = d.meds.filter((m) => !m.on);
  return (
    <div className="lg:grid lg:grid-cols-2 lg:gap-8">
      <div>
        <H>{t("active")}</H><div className="grp">{d.meds.filter((m) => m.on).map(row)}</div>
        <p className="lock-note mt-4"><Lock size={18} className="flex-none mt-0.5" /><span>{t("medsNote")} <button className="link" onClick={() => open({ type: "symptom" })}>{t("addSymptom")}</button></span></p>
      </div>
      {past.length > 0 && <div className="mt-8 lg:mt-0"><H>{t("past")}</H><div className="grp">{past.map(row)}</div></div>}
    </div>
  );
}
function VisitsT() {
  const { t, d } = useA();
  const [o, setO] = useState(d.visits[0] && d.visits[0].id);
  return (
    <>
      <p className="lock-note"><Lock size={18} className="flex-none mt-0.5" /><span>{t("signedNote")}</span></p>
      <div className="flex flex-col gap-4 mt-5 max-w-3xl">
        {d.visits.map((v) => (
          <article key={v.id} className="note">
            <button className="w-full text-left flex items-start gap-3" onClick={() => setO(o === v.id ? null : v.id)} aria-expanded={o === v.id}>
              <span className="ico ico-leaf"><Stethoscope size={20} /></span>
              <span className="flex-1 min-w-0"><b className="block">{v.date}</b><span className="block text-sm ink2">{v.doc}, {v.dept}</span><span className="block text-sm ink3">{v.reason}</span></span>
              <ChevronDown size={20} className={cls("ink3 flex-none transition-transform", o === v.id && "rotate-180")} />
            </button>
            {o === v.id && (
              <div className="fadein mt-2">
                <dl><dt>{t("reason")}</dt><dd>{v.reason}</dd><dt>{t("found")}</dt><dd>{v.found}</dd><dt>{t("planLbl")}</dt><dd>{v.plan}</dd></dl>
                <p className="signed"><BadgeCheck size={16} />{t("signedOn", v.signed)}</p>
                {v.add.map((a, i) => <div key={i} className="addm"><b className="block text-sm">{t("addendum", a.on)}</b><p className="mt-1">{a.text}</p><span className="block text-sm ink3 mt-1">{a.by}</span></div>)}
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
function SummaryT() {
  const { t, d, open } = useA();
  return (
    <div className="lg:grid lg:grid-cols-2 lg:gap-8">
      <div>
        <H>{t("conditions")}</H>
        <div className="grp">{d.conds.map((c, i) => <div key={i} className="row"><div className="flex-1"><b className="block">{c.n}</b><span className="block text-sm ink3">{t("since", c.since)}</span></div>{c.on ? <Tag tone="leaf">{t("activeC")}</Tag> : <Tag tone="mist">{t("resolved")}</Tag>}</div>)}</div>
        <div className="mt-8"><H>{t("allergies")}</H></div>
        <div className="grp">{d.allergies.map((a, i) => <div key={i} className="row"><span className="ico ico-lat"><AlertTriangle size={18} /></span><div className="flex-1"><b className="block">{a.n}</b><span className="block text-sm ink2">{a.r}</span></div><Tag tone={a.sev === "mild" ? "mist" : "lat"}>{t(a.sev)}</Tag></div>)}</div>
      </div>
      <div className="mt-8 lg:mt-0">
        <H>{t("symptomsReported")}</H>
        {d.symptoms.length ? (
          <div className="grp">{d.symptoms.map((s) => <div key={s.id} className="row items-start"><span className="ico ico-mist"><MessageSquare size={18} /></span><div className="flex-1 min-w-0"><b className="block">{s.text}</b><span className="block text-sm ink3">{s.date}, {t(s.sev)}</span><span className="block mt-1.5">{s.st === "seen" ? <Tag tone="leaf" icon={Check}>{t("seenBy", s.by)}</Tag> : <Tag tone="zari">{t("notReviewed")}</Tag>}</span></div></div>)}</div>
        ) : <Empty I={MessageSquare} title={t("symptomsReported")} body={t("addSymptomSub")} act={<Btn k="tint" sm className="mt-4" onClick={() => open({ type: "symptom" })}>{t("addSymptom")}</Btn>} />}
        <button className="link mt-5 flex items-center gap-2 text-left" onClick={() => open({ type: "request", k: "correction" })}><Info size={18} className="flex-none" />{t("somethingWrong")}</button>
      </div>
    </div>
  );
}

/* ───────── Profile, reminders, appointments, privacy ───────── */
function IdCard() {
  const { t, p } = useA();
  return (
    <section className="idcard">
      <div className="flex items-center gap-4"><Av p={p} s={60} /><div className="min-w-0"><h2 className="text-xl font-bold truncate">{p.name}</h2><p className="text-sm ink2">{t("dob")} {p.dob}</p></div></div>
      <p className="text-sm ink3 mt-5">{t("hospitalNo")}</p>
      <p className="num mrn">{p.mrn}</p>
      <p className="text-sm ink3 mt-1">{t("showDesk")}</p>
      {p.kid ? <p className="text-sm mt-4"><span className="ink3">{t("guardian")}: </span><b>Anjali Menon</b></p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5 text-sm"><div><span className="block ink3">{t("phone")}</span><b>{p.phone}</b></div><div><span className="block ink3">{t("email")}</span><b className="break-all">{p.email}</b></div></div>
      )}
    </section>
  );
}
function MeS() {
  const { t, pid, setPid, lang, setLang, size, setSize, push, setPush, mail, setMail, setTab, open, toast } = useA();
  return (
    <>
      <PageHead title={t("profile")} />
      <div className="lg:grid lg:grid-cols-2 lg:gap-10">
        <div className="flex flex-col gap-8">
          <IdCard />
          <section>
            <H>{t("family")}</H>
            <div className="grp">
              {PEOPLE.map((x) => (
                <button key={x.id} className="row press text-left" onClick={() => { if (pid !== x.id) { setPid(x.id); toast(t("nowViewing", x.first)); } }}>
                  <Av p={x} s={40} /><span className="flex-1 min-w-0"><b className="block">{x.name}</b><span className="block text-sm ink3">{x.rel === "self" ? t("you") : t("childGuardian")}</span></span>
                  {pid === x.id ? <Tag tone="leaf" icon={Check}>{t("viewing")}</Tag> : <span className="text-sm leaf font-semibold">{t("switchTo")}</span>}
                </button>
              ))}
            </div>
            <p className="text-sm ink3 mt-2">{t("addFamily")}</p>
          </section>
          <section>
            <H>{t("help")}</H>
            <div className="grp">
              <a className="row press" href="tel:04840001234"><span className="ico ico-leaf"><Phone size={18} /></span><span className="flex-1"><b className="block">{t("frontDesk")}</b><span className="block text-sm ink3">0484 000 1234</span></span><ChevronRight size={20} className="ink3" /></a>
              <a className="row press" href="tel:04840000112"><span className="ico ico-lat"><Phone size={18} /></span><span className="flex-1"><b className="block">{t("casualty")}</b><span className="block text-sm ink3">0484 000 0112, {t("open247")}</span></span><ChevronRight size={20} className="ink3" /></a>
              <a className="row press" href="mailto:grievance@abchospital.example"><span className="ico ico-mist"><Mail size={18} /></span><span className="flex-1 min-w-0"><b className="block">{t("grievance")}</b><span className="block text-sm ink3 truncate">grievance@abchospital.example</span></span><ChevronRight size={20} className="ink3" /></a>
            </div>
          </section>
        </div>
        <div className="flex flex-col gap-8 mt-8 lg:mt-0">
          <section>
            <H>{t("settings")}</H>
            <div className="grp">
              <div className="row flex-wrap"><span className="flex-1 font-semibold">{t("language")}</span><div className="w-full sm:w-56"><Seg sm opts={[["en", "English"], ["ml", "മലയാളം"]]} val={lang} set={setLang} label={t("language")} /></div></div>
              <div className="row flex-wrap"><span className="flex-1 font-semibold">{t("textSize")}</span><div className="w-full sm:w-56"><Seg sm opts={[[0, <span style={{ fontSize: 14 }}>A</span>, "Default"], [1, <span style={{ fontSize: 17 }}>A</span>, "Large"], [2, <span style={{ fontSize: 21 }}>A</span>, "Larger"]]} val={size} set={setSize} label={t("textSize")} /></div></div>
              <div className="row"><span className="flex-1"><b className="block">{t("pushOn")}</b><span className="block text-sm ink3">{t("pushSub")}</span></span><Sw on={push} set={(v) => { setPush(v); toast(v ? t("pushEnabled") : t("pushDisabled")); }} label={t("pushOn")} /></div>
              <div className="row"><span className="flex-1"><b className="block">{t("emailOn")}</b><span className="block text-sm ink3">{t("emailSub")}</span></span><Sw on={mail} set={setMail} label={t("emailOn")} /></div>
            </div>
          </section>
          <section className="grp">
            <NavRow I={ShieldCheck} l={t("privacyData")} sub={t("privacySub")} go={() => setTab("privacy")} />
            <NavRow I={Bell} l={t("reminders")} go={() => setTab("reminders")} />
            <NavRow I={CalendarDays} l={t("appts")} go={() => setTab("appts")} />
          </section>
          <div>
            <Btn k="sec" className="w-full" onClick={() => open({ type: "confirm", k: "signout" })}><LogOut size={20} />{t("signOut")}</Btn>
            <p className="text-sm ink3 text-center mt-4">{t("version")}</p>
          </div>
        </div>
      </div>
    </>
  );
}
function RemS() {
  const { t, d, setTab, push, setPush, open } = useA();
  const IC = { pill: Pill, heart: HeartPulse, drop: Droplet, flask: FlaskConical, cal: CalendarDays, scale: Scale };
  const ACT = { nightMeds: ["open", () => setTab("home")], checkBp: ["logNow", () => open({ type: "reading", k: "bp" })], fastingSugar: ["logNow", () => open({ type: "reading", k: "sugar" })], logWeight: ["logNow", () => open({ type: "reading", k: "weight" })], testsDue: ["upload", () => open({ type: "upload" })], visitSoon: ["view", () => setTab("appts")] };
  let n = 0;
  return (
    <>
      <PageHead back={() => setTab("home")} title={t("reminders")} />
      <div className="lg:grid lg:grid-cols-5 lg:gap-10">
        <div className="lg:col-span-3 flex flex-col gap-8">
          {[["today", t("today")], ["next", t("comingUp")], ["earlier", t("earlier")]].map(([w, l]) => {
            const g = d.rem.filter((r) => r.w === w);
            if (!g.length) return null;
            return (
              <section key={w}><H>{l}</H>
                <div className="flex flex-col gap-2">
                  {g.map((r) => {
                    const I = IC[r.ic] || Bell, a = !r.done && ACT[r.k];
                    return (
                      <div key={r.id} className={cls("rem spring", r.done && "is-done")} style={{ "--i": n++ }}>
                        <span className={cls("ico", r.done ? "ico-mist" : "ico-leaf")}><I size={20} /></span>
                        <div className="flex-1 min-w-0"><b className="block">{t(r.k)}</b>{r.sub && <span className="block text-sm ink2 truncate">{r.sub}</span>}<span className="block text-sm ink3">{r.done ? t("takenAt", r.done) : r.time}</span></div>
                        {a && <Btn k="tint" sm onClick={a[1]}>{t(a[0])}</Btn>}
                        {r.done && <Check size={20} className="leaf flex-none" />}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
        <div className="lg:col-span-2 mt-8 lg:mt-0 flex flex-col gap-4">
          <section className="lockscreen" aria-label={t("notifPreview")}>
            <p className="text-sm font-semibold" style={{ color: "rgba(255,255,255,.8)" }}>{t("notifPreview")}</p>
            <div className="notif spring" style={{ "--i": 3 }}>
              <span className="logo logo-sm" aria-hidden="true">ABC</span>
              <div className="flex-1 min-w-0"><div className="flex justify-between gap-2 text-xs ink3"><b>ABC Hospital</b><span>{t("now")}</span></div><p className="text-sm mt-0.5">{t("notifText")}</p></div>
            </div>
            <p className="text-sm mt-3" style={{ color: "rgba(255,255,255,.85)" }}>{t("notifCaption")}</p>
          </section>
          <div className="grp"><div className="row"><span className="flex-1"><b className="block">{t("pushOn")}</b><span className="block text-sm ink3">{t("pushSub")}</span></span><Sw on={push} set={setPush} label={t("pushOn")} /></div></div>
          <p className="text-sm ink3 flex gap-2"><Info size={18} className="flex-none" />{t("iphoneNote")}</p>
        </div>
      </div>
    </>
  );
}
function ApptS() {
  const { t, d, setTab } = useA();
  const ST = { done: ["leaf", t("completed")], missed: ["lat", t("missedAppt")] };
  return (
    <>
      <PageHead back={() => setTab("home")} title={t("appts")} />
      <div className="lg:grid lg:grid-cols-2 lg:gap-10">
        <section><H>{t("upcoming")}</H><Ticket /></section>
        <section className="mt-8 lg:mt-0">
          <H>{t("past")}</H>
          <div className="grp">{d.appts.map((a) => <div key={a.id} className="row"><span className="ico ico-mist"><CalendarDays size={18} /></span><div className="flex-1 min-w-0"><b className="block">{a.date}</b><span className="block text-sm ink2 truncate">{a.doc}, {a.dept}</span><span className="block text-sm ink3">{a.time}</span></div><Tag tone={ST[a.st][0]}>{ST[a.st][1]}</Tag></div>)}</div>
          <p className="lock-note mt-5"><Phone size={18} className="flex-none mt-0.5" /><span>{t("bookNote")}</span></p>
        </section>
      </div>
    </>
  );
}
function PrivS() {
  const { t, d, setTab, open, toast } = useA();
  const RQ = { correction: t("askCorrection"), erase: t("askErase"), nominee: t("nominee"), grievance: t("raiseGrievance") };
  return (
    <>
      <PageHead back={() => setTab("me")} title={t("privacyData")} />
      <div className="lg:grid lg:grid-cols-2 lg:gap-10">
        <div className="flex flex-col gap-8">
          <section className="grp p-5"><div className="flex gap-3"><span className="ico ico-leaf"><ShieldCheck size={20} /></span><div><h2 className="h3">{t("consentH")}</h2><p className="text-sm ink2 mt-1">{t("consentGiven")}</p><button className="link mt-2" onClick={() => open({ type: "notice" })}>{t("readNotice")}</button></div></div></section>
          <section>
            <H>{t("yourRights")}</H>
            <div className="grp">
              <NavRow I={Download} l={t("downloadRecords")} sub={t("downloadSub")} go={() => toast(t("preparing"))} />
              <NavRow I={FileText} l={t("askCorrection")} go={() => open({ type: "request", k: "correction" })} />
              <NavRow I={Users} l={t("nominee")} go={() => open({ type: "request", k: "nominee" })} />
              <NavRow I={X} l={t("askErase")} go={() => open({ type: "request", k: "erase" })} />
              <NavRow I={MessageSquare} l={t("raiseGrievance")} sub={t("grievanceSub")} go={() => open({ type: "request", k: "grievance" })} />
            </div>
          </section>
        </div>
        <div className="flex flex-col gap-8 mt-8 lg:mt-0">
          <section>
            <H>{t("yourRequests")}</H>
            {d.reqs.length ? (
              <div className="grp">{d.reqs.map((q) => <div key={q.id} className="row items-start"><div className="flex-1 min-w-0"><b className="block">{RQ[q.k]}</b>{q.text && <span className="block text-sm ink2 mt-0.5">{q.text}</span>}<span className="block text-sm ink3 mt-1">{t("sentOn", q.sent)}, {q.st === "closed" ? t("closedOn", q.closed) : t("replyBy", q.due)}</span></div>{q.st === "closed" ? <Tag tone="leaf">{t("closed")}</Tag> : <Tag tone="zari">{t("inProgress")}</Tag>}</div>)}</div>
            ) : <Empty I={FileText} title={t("noReqs")} body={t("noReqsBody")} />}
          </section>
          <section className="danger">
            <h2 className="h3 lat">{t("withdraw")}</h2>
            <p className="text-sm ink2 mt-1">{t("withdrawBody")}</p>
            <Btn k="dline" sm className="mt-4" onClick={() => open({ type: "confirm", k: "withdraw" })}>{t("withdraw")}</Btn>
          </section>
        </div>
      </div>
    </>
  );
}

/* ───────── Sheets ───────── */
function AddSheet({ close }) {
  const { t, open } = useA();
  const o = [["upload", FileUp, t("uploadReport"), t("addUploadSub"), "leaf"], ["reading", HeartPulse, t("logReading"), t("addReadingSub"), "leaf"], ["symptom", MessageSquare, t("addSymptom"), t("addSymptomSub"), "zari"]];
  return (
    <Sheet title={t("addTitle")} onClose={close}>
      <div className="flex flex-col gap-3">
        {o.map(([v, I, l, s, tone], i) => (
          <button key={v} className="opt press spring" style={{ "--i": i }} onClick={() => open({ type: v })}>
            <span className={"ico ico-lg ico-" + tone}><I size={24} /></span>
            <span className="flex-1 min-w-0"><b className="block text-lg">{l}</b><span className="block text-sm ink2">{s}</span></span>
            <ChevronRight size={20} className="ink3 flex-none" />
          </button>
        ))}
      </div>
      <p className="text-sm ink2 mt-5 flex gap-2"><AlertTriangle size={18} className="flex-none lat" />{t("addSos")}</p>
    </Sheet>
  );
}
function UploadSheet({ close, test }) {
  const { t, d, addReport, open } = useA();
  const pend = d.tests.filter((x) => x.st !== "sent");
  const [st, setSt] = useState("pick");
  const [file, setFile] = useState(null);
  const [err, setErr] = useState("");
  const [kind, setKind] = useState("lab");
  const [name, setName] = useState("");
  const [date, setDate] = useState("2026-10-06");
  const [linkOn, setLinkOn] = useState(!!test);
  const [link, setLink] = useState(test || (pend[0] && pend[0].id) || "");
  const [step, setStep] = useState(0);
  const [newId, setNewId] = useState(null);
  const cam = useRef(null), pick = useRef(null), alive = useRef(true);
  useEffect(() => () => { alive.current = false; }, []);
  const take = (f) => {
    if (!f) return;
    if (!["application/pdf", "image/jpeg", "image/png"].includes(f.type)) return setErr(t("fileWrongType"));
    if (f.size > 10 * 1024 * 1024) return setErr(t("fileTooBig"));
    setErr(""); setFile({ name: f.name, size: f.size, img: f.type !== "application/pdf" });
    setName(f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 60)); setSt("details");
  };
  const steps = file && file.img ? [t("shrinking"), t("stripping"), t("uploading")] : [t("uploading")];
  const go = () => {
    setSt("prog"); setStep(0);
    steps.forEach((_, i) => setTimeout(() => alive.current && setStep(i + 1), 750 * (i + 1)));
    setTimeout(() => { if (!alive.current) return; setNewId(addReport({ title: name.trim(), kind, file, test: linkOn ? link : null })); setSt("done"); }, 750 * steps.length + 450);
  };
  return (
    <Sheet title={st === "done" ? t("uploaded") : t("uploadReport")} onClose={close}>
      {st === "pick" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <button className="bigpick press" onClick={() => cam.current.click()}><Camera size={28} /><b>{t("takePhoto")}</b></button>
            <button className="bigpick press" onClick={() => pick.current.click()}><FileUp size={28} /><b>{t("chooseFile")}</b></button>
          </div>
          <input ref={cam} type="file" accept="image/jpeg,image/png" capture="environment" className="hidden" onChange={(e) => take(e.target.files[0])} />
          <input ref={pick} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => take(e.target.files[0])} />
          <p className="text-sm ink2 mt-4">{t("fileRules")}</p>
          {err && <p className="err mt-3" role="alert"><AlertTriangle size={18} className="flex-none mt-0.5" />{err}</p>}
          <p className="lock-note mt-4"><ShieldCheck size={18} className="flex-none mt-0.5" /><span>{t("photoPrivacy")}</span></p>
          <button className="link mt-4" onClick={() => { setFile({ name: "hba1c-report.jpg", size: 2480000, img: true }); setName("HbA1c report"); setSt("details"); }}>{t("useSample")}</button>
        </>
      )}
      {st === "details" && (
        <>
          <div className="filechip">
            <span className="ico ico-leaf">{file.img ? <Camera size={18} /> : <FileText size={18} />}</span>
            <span className="flex-1 min-w-0"><b className="block truncate">{file.name}</b><span className="text-sm ink3">{fmtSize(file.size)}</span></span>
            <button className="link text-sm" onClick={() => { setFile(null); setSt("pick"); }}>{t("change")}</button>
          </div>
          <p className="lbl mt-6">{t("whatReport")}</p>
          <div className="flex flex-wrap gap-2">{[["lab", t("labTest")], ["scan", t("scan")], ["rx", t("prescription")], ["disc", t("discharge")], ["other", t("other")]].map(([v, l]) => <button key={v} className={cls("chip press", kind === v && "on")} aria-pressed={kind === v} onClick={() => setKind(v)}>{l}</button>)}</div>
          <label className="lbl mt-6" htmlFor="rn">{t("reportName")}</label>
          <div className="field"><input id="rn" value={name} onChange={(e) => setName(e.target.value)} /></div>
          <label className="lbl mt-5" htmlFor="rd">{t("testDate")}</label>
          <div className="field"><input id="rd" type="date" value={date} max="2026-10-06" onChange={(e) => setDate(e.target.value)} /></div>
          {pend.length > 0 && (
            <div className="mt-5">
              <label className="check"><input type="checkbox" checked={linkOn} onChange={(e) => setLinkOn(e.target.checked)} /><span>{t("forPlanItem")}</span></label>
              {linkOn && <div className="flex flex-wrap gap-2 mt-3 ml-9">{pend.map((x) => <button key={x.id} className={cls("chip press", link === x.id && "on")} aria-pressed={link === x.id} onClick={() => setLink(x.id)}>{x.name}</button>)}</div>}
            </div>
          )}
          <Btn className="w-full mt-7" disabled={!name.trim()} onClick={go}><Upload size={20} />{t("upload")}</Btn>
        </>
      )}
      {st === "prog" && (
        <div className="py-2" aria-live="polite">
          <div className="prog"><i style={{ width: (step / steps.length) * 100 + "%" }} /></div>
          <ul className="mt-5 flex flex-col gap-3">
            {steps.map((s, i) => <li key={i} className="flex items-center gap-3"><span className={cls("tick", i < step && "on")}>{i < step ? <Check size={14} strokeWidth={3} className="pop" /> : i === step ? <span className="spin" /> : null}</span><span className={i <= step ? "" : "ink3"}>{s}</span></li>)}
          </ul>
        </div>
      )}
      {st === "done" && (
        <div className="text-center py-4">
          <span className="bigcheck mx-auto"><Check size={40} strokeWidth={3} /></span>
          <p className="text-lg font-semibold mt-5 max-w-sm mx-auto">{t("uploadedBody", d.doc)}</p>
          <div className="grid grid-cols-2 gap-3 mt-7"><Btn k="sec" onClick={close}>{t("doneBtn")}</Btn><Btn onClick={() => open({ type: "report", id: newId })}>{t("viewReport")}</Btn></div>
        </div>
      )}
    </Sheet>
  );
}
function NumField({ id, label, v, set, unit, big, step }) {
  return (
    <div>
      <label className="lbl" htmlFor={id}>{label}</label>
      <div className="field"><input id={id} type="number" inputMode="decimal" step={step || "1"} value={v} onChange={(e) => set(e.target.value)} className={big ? "num-big" : ""} /><span className="ink3 text-sm font-semibold">{unit}</span></div>
    </div>
  );
}
function ReadingSheet({ close, k0 }) {
  const { t, d, addReading } = useA();
  const [k, setK] = useState(k0 && k0 !== "a1c" ? k0 : "bp");
  const [a, setA] = useState(""); const [b, setB] = useState(""); const [pulse, setPulse] = useState("");
  const [ctx, setCtx] = useState("fasting"); const [when, setWhen] = useState("now"); const [tm, setTm] = useState("07:30");
  const n1 = parseFloat(a), n2 = parseFloat(b);
  const valid = k === "bp" ? n1 >= 60 && n1 <= 260 && n2 >= 30 && n2 <= 160 && n1 > n2 : k === "sugar" ? n1 >= 20 && n1 <= 600 : n1 >= 2 && n1 <= 300;
  const filled = k === "bp" ? a && b : a;
  const v = k === "bp" ? [n1, n2] : n1;
  const tg = d.tg[k];
  const high = valid && tg && (k !== "sugar" || ctx === "fasting") && isHigh(k, v);
  return (
    <Sheet title={t("logReading")} onClose={close}>
      <Seg opts={[["bp", t("bp")], ["sugar", t("sugar")], ["weight", t("weight")]]} val={k} set={(x) => { setK(x); setA(""); setB(""); }} label={t("logReading")} />
      {k === "bp" && (
        <>
          <div className="grid grid-cols-2 gap-3 mt-6"><NumField id="sys" label={t("systolic")} v={a} set={setA} unit="mmHg" /><NumField id="dia" label={t("diastolic")} v={b} set={setB} unit="mmHg" /></div>
          <div className="mt-4"><NumField id="pul" label={t("pulse")} v={pulse} set={setPulse} unit="/min" /></div>
          <p className="text-sm ink3 mt-3 flex gap-2"><Info size={16} className="flex-none mt-0.5" />{t("bpTip")}</p>
        </>
      )}
      {k === "sugar" && (
        <>
          <div className="mt-6"><NumField id="sg" label={t("sugarLevel")} v={a} set={setA} unit="mg/dL" big /></div>
          <p className="lbl mt-5">{t("whenTaken")}</p>
          <div className="flex flex-wrap gap-2">{["fasting", "afterMeal", "random"].map((x) => <button key={x} className={cls("chip press", ctx === x && "on")} aria-pressed={ctx === x} onClick={() => setCtx(x)}>{t(x)}</button>)}</div>
        </>
      )}
      {k === "weight" && <div className="mt-6"><NumField id="wt" label={t("weight")} v={a} set={setA} unit="kg" big step="0.1" /></div>}
      <p className="lbl mt-6">{t("when")}</p>
      <Seg opts={[["now", t("nowW")], ["earlier", t("earlierToday")]]} val={when} set={setWhen} label={t("when")} />
      {when === "earlier" && <div className="field mt-3"><input type="time" value={tm} onChange={(e) => setTm(e.target.value)} aria-label={t("when")} /></div>}
      {filled && !valid && <p className="err mt-4" role="alert"><AlertTriangle size={18} className="flex-none mt-0.5" />{t("implausible")}</p>}
      {high && <div className="warn mt-4" role="status"><AlertTriangle size={20} className="flex-none" /><p>{t("outOfRange", tg, d.doc)}</p></div>}
      <Btn className="w-full mt-6" disabled={!valid} onClick={() => { addReading(k, v, k === "sugar" ? ctx : null); close(); }}>{t("saveReading")}</Btn>
    </Sheet>
  );
}
function SymptomSheet({ close }) {
  const { t, addSymptom } = useA();
  const SY = ["dizzy", "headache", "breath", "chest", "swelling", "tired", "fever", "otherS"];
  const [sel, setSel] = useState([]); const [txt, setTxt] = useState(""); const [since, setSince] = useState("today"); const [sev, setSev] = useState("mild");
  const red = sel.includes("chest") || sel.includes("breath") || sev === "severe";
  const tog = (s) => setSel(sel.includes(s) ? sel.filter((x) => x !== s) : [...sel, s]);
  return (
    <Sheet title={t("addSymptom")} onClose={close}>
      <div className="sos flex gap-3">
        <AlertTriangle size={22} className="flex-none lat" />
        <div className="flex-1"><b className="block lat">{t("notWatched")}</b><p className="text-sm mt-1">{t("notWatchedBody")}</p>
          <div className="flex flex-wrap gap-2 mt-3"><a className="btn btn-sm btn-danger press" href="tel:112"><Phone size={16} />{t("call112")}</a><a className="btn btn-sm btn-sec press" href="tel:04840000112">{t("callCasualty")}</a></div>
        </div>
      </div>
      <p className="lbl mt-6">{t("whatFeeling")}</p>
      <div className="flex flex-wrap gap-2">{SY.map((s) => <button key={s} className={cls("chip press", sel.includes(s) && "on")} aria-pressed={sel.includes(s)} onClick={() => tog(s)}>{sel.includes(s) && <Check size={16} />}{t(s)}</button>)}</div>
      {red && <div className="warn mt-4" role="alert"><AlertTriangle size={20} className="flex-none" /><p className="font-semibold">{t("redFlag")}</p></div>}
      <label className="lbl mt-6" htmlFor="sx">{t("describe")}</label>
      <div className="field"><textarea id="sx" rows={3} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={t("describePh")} /></div>
      <p className="lbl mt-5">{t("started")}</p>
      <div className="flex flex-wrap gap-2">{["today", "yesterday", "days23", "week"].map((s) => <button key={s} className={cls("chip press", since === s && "on")} aria-pressed={since === s} onClick={() => setSince(s)}>{t(s)}</button>)}</div>
      <p className="lbl mt-5">{t("howBad")}</p>
      <Seg opts={[["mild", t("mild")], ["moderate", t("moderate")], ["severe", t("severe")]]} val={sev} set={setSev} label={t("howBad")} />
      <Btn className="w-full mt-7" disabled={!sel.length && !txt.trim()} onClick={() => { addSymptom({ sel, txt, sev }); close(); }}>{t("sendCareTeam")}</Btn>
    </Sheet>
  );
}
function ReportSheet({ close, id }) {
  const { t, d, toast } = useA();
  const r = d.reports.find((x) => x.id === id);
  if (!r) return null;
  const [I, tone] = KIND[r.kind] || KIND.other;
  const tr = r.trend && d.readings[r.trend];
  return (
    <Sheet title={r.title} onClose={close} wide>
      <div className="flex flex-wrap items-center gap-2"><RStatus r={r} /><span className="text-sm ink3">{r.s === "y" ? t("uploadedByYou") : r.src}, {r.date}</span></div>
      <div className="docprev mt-5" aria-hidden="true">
        <div className="docpage"><span className={"ico ico-" + tone} style={{ width: 24, height: 24, borderRadius: 7 }}><I size={14} /></span>{[62, 88, 74, 80, 45].map((w, i) => <i key={i} style={{ width: w + "%" }} />)}</div>
        <span className="text-sm ink2 break-all">{r.file}, {r.size}</span>
      </div>
      {r.st === "rev" ? (
        <>
          <div className="revby mt-5"><BadgeCheck size={20} className="flex-none" /><span>{t("reviewedByOn", r.by, r.on)}</span></div>
          {r.vals && r.vals.length > 0 && <><h3 className="h3 mt-6 mb-2">{t("keyValues")}</h3><div className="grp">{r.vals.map((v, i) => <div key={i} className="row"><div className="flex-1 min-w-0"><b className="block">{v.k}</b>{v.ref && <span className="block text-sm ink3">{v.ref}</span>}</div><span className="text-right"><span className={cls("num text-xl", v.hi && "lat")}>{v.v}</span> {v.u && <span className="text-sm ink3">{v.u}</span>}</span></div>)}</div></>}
          {tr && <><h3 className="h3 mt-6 mb-2">{t("trend")}, {t(r.trend)}</h3><div className="grp p-4"><Chart k={r.trend} arr={tr} h={170} /></div></>}
        </>
      ) : <p className="lock-note mt-5"><Clock size={18} className="flex-none mt-0.5" /><span>{t("valuesAfterReview")}</span></p>}
      <div className="grid grid-cols-2 gap-3 mt-6"><Btn k="sec" onClick={() => toast(t("secureLink"))}><Eye size={18} />{t("openFile")}</Btn><Btn k="sec" onClick={() => toast(t("secureLink"))}><Download size={18} />{t("download")}</Btn></div>
      <p className="text-sm ink3 mt-3">{t("linkNote")}</p>
      {r.s === "y" && <p className="text-sm ink3 mt-1">{t("wrongFile")}</p>}
    </Sheet>
  );
}
function RequestSheet({ close, k }) {
  const { t, addReq } = useA();
  const [txt, setTxt] = useState(""); const [nm, setNm] = useState(""); const [rel, setRel] = useState("");
  const titles = { correction: t("askCorrection"), erase: t("askErase"), nominee: t("nominee"), grievance: t("raiseGrievance") };
  const ok = k === "nominee" ? nm.trim() && rel.trim() : k === "erase" ? true : txt.trim();
  return (
    <Sheet title={titles[k]} onClose={close}>
      <p className="ink2">{t(k + "Body")}</p>
      {k === "nominee" ? (
        <>
          <label className="lbl mt-5" htmlFor="nn">{t("nomineeName")}</label><div className="field"><input id="nn" value={nm} onChange={(e) => setNm(e.target.value)} /></div>
          <label className="lbl mt-4" htmlFor="nr">{t("relationship")}</label><div className="field"><input id="nr" value={rel} onChange={(e) => setRel(e.target.value)} placeholder={t("relPh")} /></div>
        </>
      ) : (
        <><label className="lbl mt-5" htmlFor="rq">{t("details")}</label><div className="field"><textarea id="rq" rows={4} value={txt} onChange={(e) => setTxt(e.target.value)} placeholder={t(k + "Ph")} /></div></>
      )}
      <p className="text-sm ink3 mt-4">{t("replyWithin")}</p>
      <Btn className="w-full mt-6" disabled={!ok} onClick={() => { addReq(k, k === "nominee" ? `${nm.trim()} (${rel.trim()})` : txt.trim()); close(); }}>{t("sendRequest")}</Btn>
    </Sheet>
  );
}
function ConfirmSheet({ close, k }) {
  const { t, signOut } = useA();
  const w = k === "withdraw";
  return (
    <Sheet title={w ? t("withdrawQ") : t("signOutQ")} onClose={close}>
      <p className="ink2">{w ? t("withdrawBody") : t("signOutBody")}</p>
      <div className="grid grid-cols-2 gap-3 mt-7">
        <Btn k="sec" onClick={close}>{t("cancel")}</Btn>
        <Btn k={w ? "danger" : "pri"} onClick={() => { close(); signOut(w ? t("withdrawn") : t("signedOut")); }}>{w ? t("withdraw") : t("signOut")}</Btn>
      </div>
    </Sheet>
  );
}

/* ───────── Prototype navigator (not part of the product) ───────── */
function Proto() {
  const A = useA();
  const [o, setO] = useState(false);
  const pre = A.step !== "app";
  const g = [
    ["Sign-in flow", [["Welcome", () => A.go("welcome")], ["Sign in", () => A.go("signin")], ["One-time code", () => A.go("otp")], ["Privacy notice", () => A.go("consent")], ["Choose profile", () => A.go("who")]]],
    ["Patient app", [["Home", () => A.nav("home")], ["Care plan", () => A.nav("plan")], ["Reports", () => A.nav("records", "reports")], ["Readings", () => A.nav("records", "readings")], ["Medicines", () => A.nav("records", "meds")], ["Visit notes", () => A.nav("records", "visits")], ["Health summary", () => A.nav("records", "summary")], ["Reminders", () => A.nav("reminders")], ["Appointments", () => A.nav("appts")], ["Profile", () => A.nav("me")], ["Privacy and data", () => A.nav("privacy")]]],
    ["Sheets", [["Add menu", () => A.sheetIn({ type: "add" })], ["Upload a report", () => A.sheetIn({ type: "upload" })], ["Log a reading", () => A.sheetIn({ type: "reading" })], ["Symptom form", () => A.sheetIn({ type: "symptom" })], ["Report, reviewed", () => { A.setPid("anjali"); A.sheetIn({ type: "report", id: "r2" }); }], ["Report, waiting", () => { A.setPid("anjali"); A.sheetIn({ type: "report", id: "r1" }); }], ["Switch profile", () => A.sheetIn({ type: "who" })]]],
  ];
  return (
    <>
      <button className={cls("proto-btn press", pre && "pre")} onClick={() => setO(!o)} aria-expanded={o}><Layers size={16} />Screens</button>
      {o && (
        <div className={cls("proto-panel", pre && "pre")} role="dialog" aria-label="Prototype screens">
          <div className="flex items-center justify-between"><b>Prototype</b><button className="icon-btn" onClick={() => setO(false)} aria-label="Close"><X size={18} /></button></div>
          <p className="text-xs ink3">Jump to any screen or state. Any 6-digit code signs in; 000000 shows the error.</p>
          {g.map(([h, items]) => (
            <div key={h} className="mt-3"><p className="text-xs font-semibold ink3 mb-1">{h}</p>
              <div className="flex flex-wrap gap-1">{items.map(([l, f]) => <button key={l} className="pchip" onClick={() => { f(); setO(false); }}>{l}</button>)}</div>
            </div>
          ))}
          <div className="mt-4 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3"><span className="text-sm">Language</span><div style={{ width: 170 }}><Seg sm opts={[["en", "EN"], ["ml", "മലയാളം"]]} val={A.lang} set={A.setLang} label="Language" /></div></div>
            <div className="flex items-center justify-between gap-3"><span className="text-sm">Profile</span><div style={{ width: 170 }}><Seg sm opts={[["anjali", "Anjali"], ["aarav", "Aarav"]]} val={A.pid} set={A.setPid} label="Profile" /></div></div>
            <div className="flex items-center justify-between gap-3"><span className="text-sm">Hospital system down</span><Sw on={A.outage} set={A.setOutage} label="Outage banner" /></div>
          </div>
        </div>
      )}
    </>
  );
}

/* ───────── App ───────── */
export default function App() {
  const [lang, setLang] = useState("en");
  const [step, setStep] = useState("welcome");
  const [pid, setPid] = useState("anjali");
  const [tab, setTabS] = useState("home");
  const [recTab, setRecTab] = useState("reports");
  const [metric, setMetric] = useState("bp");
  const [sheet, setSheet] = useState(null);
  const [msg, setMsg] = useState(null);
  const [outage, setOutage] = useState(false);
  const [size, setSize] = useState(0);
  const [push, setPush] = useState(true);
  const [mail, setMail] = useState(true);
  const [inst, setInst] = useState(false);
  const [contact, setContact] = useState("+91 98••••••10");
  const [db, setDb] = useState(seed);

  const t = (k, ...a) => {
    let e = L[k];
    if (e == null) return k;
    if (Array.isArray(e)) e = lang === "ml" && e[1] != null ? e[1] : e[0];
    return typeof e === "function" ? e(...a) : e;
  };
  useEffect(() => { if (!msg) return; const id = setTimeout(() => setMsg(null), 3400); return () => clearTimeout(id); }, [msg]);
  useEffect(() => { document.documentElement.style.fontSize = ["16px", "17.5px", "19px"][size]; return () => { document.documentElement.style.fontSize = ""; }; }, [size]);

  const toast = (m) => setMsg({ m, k: Date.now() });
  const go = (s) => { setSheet(null); setStep(s); window.scrollTo(0, 0); };
  const setTab = (v) => { setTabS(v); setSheet(null); window.scrollTo(0, 0); };
  const nav = (v, r) => { setStep("app"); if (r) setRecTab(r); setTab(v); };
  const sheetIn = (s) => { setStep("app"); setSheet(s); };
  const goRead = (k) => { if (k) setMetric(k); nav("records", "readings"); };
  const upd = (fn) => setDb((prev) => { const x = { ...prev[pid] }; fn(x); return { ...prev, [pid]: x }; });
  const d = db[pid];
  const p = PEOPLE.find((x) => x.id === pid);

  const take = (key) => {
    const was = !!d.doses[key];
    const all = d.slots.flatMap((s) => s.meds.map((m) => s.k + "-" + m));
    const after = all.filter((k) => (k === key ? !was : d.doses[k])).length;
    upd((x) => { const n = { ...x.doses }; if (was) delete n[key]; else n[key] = "7:29 PM"; x.doses = n; });
    toast(was ? t("untakenToast") : after === all.length ? t("allDone") : t("takenToast"));
  };
  const addReport = ({ title, kind, file, test }) => {
    const id = "r" + Date.now();
    upd((x) => {
      x.reports = [{ id, title, kind, s: "y", date: "6 Oct 2026", mon: "October 2026", st: "wait", file: file.name, size: fmtSize(file.size) }, ...x.reports];
      if (test) x.tests = x.tests.map((q) => (q.id === test ? { ...q, st: "sent", on: "6 Oct" } : q));
    });
    return id;
  };
  const addReading = (k, v, ctx) => {
    upd((x) => {
      x.readings = { ...x.readings, [k]: [...(x.readings[k] || []), { d: "6 Oct", v, s: "y", ...(ctx ? { ctx } : {}) }] };
      x.logs = x.logs.map((l) => (l.k === k ? { ...l, last: "6 Oct", missed: null } : l));
    });
    toast(t("readingSaved"));
  };
  const addSymptom = ({ sel, txt, sev }) => {
    const text = [sel.filter((s) => s !== "otherS").map((s) => L[s][0]).join(", "), txt.trim()].filter(Boolean).join(". ");
    upd((x) => { x.symptoms = [{ id: "s" + Date.now(), date: "6 Oct 2026", text, sev, st: "wait" }, ...x.symptoms]; });
    toast(t("symptomSent"));
  };
  const addReq = (k, text) => { upd((x) => { x.reqs = [{ id: "q" + Date.now(), k, text, sent: "6 Oct 2026", st: "open", due: "4 Jan 2027" }, ...x.reqs]; }); toast(t("requestSent")); };
  const signOut = (m) => { setDb(seed()); setPid("anjali"); setTabS("home"); setSheet(null); setInst(false); setStep("welcome"); toast(m); };

  const ctx = { t, lang, setLang, step, go, pid, setPid, p, d, tab, setTab, nav, recTab, setRecTab, metric, setMetric, goRead, open: setSheet, sheetIn, toast, outage, setOutage, size, setSize, push, setPush, mail, setMail, inst, setInst, contact, setContact, take, addReport, addReading, addSymptom, addReq, signOut };
  const close = () => setSheet(null);
  const SCR = { home: HomeS, plan: PlanS, records: RecordsS, me: MeS, reminders: RemS, appts: ApptS, privacy: PrivS };
  const Screen = SCR[tab] || HomeS;
  const PRE = { welcome: Welcome, signin: SignIn, otp: Otp, consent: Consent, who: Who };

  let sh = null;
  if (sheet) {
    const s = sheet.type;
    if (s === "add") sh = <AddSheet close={close} />;
    else if (s === "upload") sh = <UploadSheet key={"u" + (sheet.test || "")} close={close} test={sheet.test} />;
    else if (s === "reading") sh = <ReadingSheet key={"r" + (sheet.k || "")} close={close} k0={sheet.k} />;
    else if (s === "symptom") sh = <SymptomSheet close={close} />;
    else if (s === "report") sh = <ReportSheet key={sheet.id} close={close} id={sheet.id} />;
    else if (s === "request") sh = <RequestSheet key={sheet.k} close={close} k={sheet.k} />;
    else if (s === "confirm") sh = <ConfirmSheet close={close} k={sheet.k} />;
    else if (s === "notice") sh = <Sheet title={t("consentTitle")} onClose={close}><NoticeBody /><p className="text-sm ink3 mt-4">{t("noticeVersion")}</p></Sheet>;
    else if (s === "who") sh = <Sheet title={t("whoTitle")} onClose={close}><WhoList after={(x) => { close(); if (x.id !== pid) toast(t("nowViewing", x.first)); }} /><p className="flex gap-2 text-sm ink3 mt-5"><Info size={18} className="flex-none" />{t("addFamily")}</p></Sheet>;
  }

  const Pre = PRE[step];
  return (
    <Ctx.Provider value={ctx}>
      <div className={cls("abc", lang === "ml" && "ml")} lang={lang === "ml" ? "ml" : "en"}>
        <style>{CSS}</style>
        {Pre ? <Pre key={step} /> : (
          <div className="lg:flex min-h-screen">
            <Side />
            <div className="flex-1 min-w-0">
              <Top />
              {outage && <Outage />}
              <main key={tab + pid} className="fadein w-full max-w-xl md:max-w-2xl lg:max-w-6xl mx-auto px-5 lg:px-12 pb-36 lg:pb-16 lg:pt-10"><Screen /></main>
            </div>
            <BNav />
          </div>
        )}
        {sh}
        {msg && <div key={msg.k} className={cls("toast", Pre && "pre")} role="status"><Check size={18} className="flex-none" />{msg.m}</div>}
        <Proto />
      </div>
    </Ctx.Provider>
  );
}
