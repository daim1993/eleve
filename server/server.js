/* Elevé backend v2.1 — accounts, content, builder projects (versions + sharing),
   live portal sync (SSE), plans/billing stub, analytics, rate limiting, security headers, static hosting.
   Run:  npm install && npm start   → http://localhost:4000
   Zero native deps (express + cors only; crypto is built-in). */
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 4000;
const SECRET = process.env.SECRET || "eleve-dev-secret-change-me";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "eleve-admin";
const STRIPE_KEY = process.env.STRIPE_SECRET || "";
const SLACK_WEBHOOK = process.env.SLACK_WEBHOOK || "";
const SITE = path.join(__dirname, "..");
const DB = process.env.DB_FILE || path.join(__dirname, "db.json");
const LOG = process.env.LOG_FILE || path.join(__dirname, "events.log");

/* ---------- tiny JSON DB (debounced atomic write) ---------- */
let db = { content: {}, users: [], projects: [], analytics: [], messages: [], subscribers: [], consults: [] };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB, "utf8"))); } catch (e) {}
let saveT = null;
function persist() { clearTimeout(saveT); saveT = setTimeout(() => {
  try { fs.writeFileSync(DB + ".tmp", JSON.stringify(db)); fs.renameSync(DB + ".tmp", DB); } catch (e) { console.error("persist", e.message); }
}, 200); }
function logline(o){ try{ fs.appendFileSync(LOG, JSON.stringify(Object.assign({t:Date.now()},o))+"\n"); }catch(e){} }
var BACKUPS = process.env.BACKUP_DIR || path.join(__dirname, "backups");
function backup(){ try{ if(!fs.existsSync(DB)) return; if(!fs.existsSync(BACKUPS)) fs.mkdirSync(BACKUPS,{recursive:true});
  var name="db-"+new Date().toISOString().replace(/[:.]/g,"-")+".json"; fs.copyFileSync(DB, path.join(BACKUPS,name));
  var keep=(fs.readdirSync(BACKUPS).filter(function(x){return /^db-.*\.json$/.test(x);}).sort()); while(keep.length>14){ try{ fs.unlinkSync(path.join(BACKUPS,keep.shift())); }catch(e){} }
}catch(e){ console.error("backup", e.message); } }

/* ---------- helpers ---------- */
const uid = () => crypto.randomBytes(9).toString("base64url");
function hash(pw, salt){ return crypto.scryptSync(String(pw), salt, 64).toString("hex"); }
function sign(p){ const b=Buffer.from(JSON.stringify(p)).toString("base64url"); return b+"."+crypto.createHmac("sha256",SECRET).update(b).digest("base64url"); }
function verify(t){ if(!t) return null; const p=String(t).split("."); if(p.length!==2) return null;
  if(crypto.createHmac("sha256",SECRET).update(p[0]).digest("base64url")!==p[1]) return null;
  try{ const o=JSON.parse(Buffer.from(p[0],"base64url").toString()); if(o.exp&&Date.now()>o.exp) return null; return o; }catch(e){ return null; } }
function tokenFor(u){ return sign({ uid:u.id, role:u.role, plan:u.plan, exp:Date.now()+1000*60*60*24*30 }); }
function authUser(req){ const t=verify((req.headers.authorization||"").replace(/^Bearer\s+/i,"")); if(!t) return null;
  // uid-less admin tokens = the legacy CMS password login; tokens WITH a uid must still exist in db.users (deleted accounts lose access immediately)
  return db.users.find(u=>u.id===t.uid)||((!t.uid&&t.role==="admin")?{id:"admin",role:"admin",plan:"pro"}:null); }
const safeUser = u => u && ({ id:u.id, email:u.email, role:u.role, plan:u.plan, createdAt:u.createdAt });

/* ---------- middleware ---------- */
// Allow the studio tools to talk to the API even when a page is opened via
// file:// or a different dev-server port (Chrome Private Network Access).
app.use((req,res,next)=>{ if(req.method==="OPTIONS") res.setHeader("Access-Control-Allow-Private-Network","true"); next(); });
app.use(cors());
app.use(express.json({ limit: "30mb" }));
app.use((req,res,next)=>{ // security headers
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("X-Frame-Options","SAMEORIGIN");
  res.setHeader("Referrer-Policy","strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy","geolocation=(), microphone=(), camera=()");
  next();
});
// simple in-memory rate limiter for /api (per IP)
const hits = new Map();
app.use("/api", (req,res,next)=>{
  const ip=req.ip||req.headers["x-forwarded-for"]||"local", now=Date.now();
  let b=hits.get(ip); if(!b||now>b.reset){ b={n:0,reset:now+60000}; hits.set(ip,b); }
  if(++b.n>240){ res.setHeader("Retry-After","60"); return res.status(429).json({error:"Too many requests"}); }
  next();
});
function validStr(v,max){ return typeof v==="string" && v.length<=max; }

/* ---------- content (marketing / CMS) ---------- */
app.get("/healthz",(req,res)=> res.json({ ok:true, up:Math.round(process.uptime()), users:(db.users||[]).length, projects:(db.projects||[]).length }));
app.get("/api/content", (req,res)=> res.json({ content: db.content||{} }));
app.post("/api/login", (req,res)=>{ // legacy admin password (used by CMS)
  if(req.body && req.body.password===ADMIN_PASSWORD) return res.json({ token: sign({ role:"admin", exp:Date.now()+1000*60*60*24*30 }) });
  res.status(401).json({ error:"Wrong password" });
});
app.post("/api/content", (req,res)=>{
  const u=authUser(req); if(!u||u.role!=="admin") return res.status(401).json({error:"Unauthorized"});
  if(!req.body || typeof req.body.content!=="object") return res.status(400).json({error:"Bad content"});
  db.content=req.body.content; persist(); res.json({ ok:true, savedAt:Date.now() });
});

/* ---------- accounts ---------- */
app.post("/api/auth/register",(req,res)=>{
  // Public self-registration is CLOSED — the studio creates every account in the CMS (Accounts tab).
  // Single exception: a fresh, empty server accepts its very first account, which becomes the admin (bootstrap).
  if(db.users.length>0) return res.status(403).json({error:"Accounts are created by the studio — sign in with the details you were given."});
  const { email, password } = req.body||{};
  if(!validStr(email,200)||!/.+@.+\..+/.test(email)||!validStr(password,200)||password.length<6) return res.status(400).json({error:"Valid email and 6+ char password required"});
  const salt=crypto.randomBytes(16).toString("hex");
  const u={ id:uid(), email:email.toLowerCase(), salt, pass:hash(password,salt), role:"admin", plan:"free", createdAt:Date.now() };
  db.users.push(u); persist(); logline({ev:"register-bootstrap",uid:u.id});
  res.json({ token:tokenFor(u), user:safeUser(u) });
});
app.post("/api/auth/login",(req,res)=>{
  const { email, password } = req.body||{};
  const u=db.users.find(x=>x.email===String(email||"").toLowerCase());
  if(!u || u.pass!==hash(password,u.salt)) return res.status(401).json({error:"Invalid credentials"});
  res.json({ token:tokenFor(u), user:safeUser(u) });
});
app.get("/api/me",(req,res)=>{ const u=authUser(req); if(!u) return res.status(401).json({error:"Unauthorized"}); res.json({ user:safeUser(u) }); });

/* ---------- builder projects (per user, versioned, shareable) ---------- */
function ownProject(u,id){ return db.projects.find(p=>p.id===id && p.ownerId===u.id); }
app.get("/api/projects",(req,res)=>{ const u=authUser(req); if(!u) return res.status(401).json({error:"Unauthorized"});
  res.json({ projects: db.projects.filter(p=>p.ownerId===u.id).map(p=>({id:p.id,name:p.name,updatedAt:p.updatedAt,shareId:p.shareId||null,versions:(p.versions||[]).length})) }); });
app.post("/api/projects",(req,res)=>{ const u=authUser(req); if(!u) return res.status(401).json({error:"Unauthorized"});
  const name=validStr(req.body&&req.body.name,120)?req.body.name:"Untitled";
  if(u.plan==="free" && db.projects.filter(p=>p.ownerId===u.id).length>=5) return res.status(402).json({error:"Free plan limit reached (5 projects). Upgrade to Pro.",upgrade:true});
  const p={ id:uid(), ownerId:u.id, name, data:req.body&&req.body.data||{}, updatedAt:Date.now(), versions:[] };
  db.projects.push(p); persist(); res.json({ id:p.id }); });
app.get("/api/projects/:id",(req,res)=>{ const u=authUser(req); if(!u) return res.status(401).json({error:"Unauthorized"});
  const p=ownProject(u,req.params.id); if(!p) return res.status(404).json({error:"Not found"}); res.json({ project:p }); });
app.put("/api/projects/:id",(req,res)=>{ const u=authUser(req); if(!u) return res.status(401).json({error:"Unauthorized"});
  const p=ownProject(u,req.params.id); if(!p) return res.status(404).json({error:"Not found"});
  if(req.body && typeof req.body.data==="object"){ p.versions=p.versions||[]; p.versions.push({t:p.updatedAt,data:p.data}); if(p.versions.length>30) p.versions.shift(); p.data=req.body.data; }
  if(validStr(req.body&&req.body.name,120)) p.name=req.body.name;
  p.updatedAt=Date.now(); persist(); res.json({ ok:true, versions:(p.versions||[]).length }); });
app.delete("/api/projects/:id",(req,res)=>{ const u=authUser(req); if(!u) return res.status(401).json({error:"Unauthorized"});
  const i=db.projects.findIndex(p=>p.id===req.params.id && p.ownerId===u.id); if(i<0) return res.status(404).json({error:"Not found"});
  db.projects.splice(i,1); persist(); res.json({ ok:true }); });
app.get("/api/projects/:id/versions",(req,res)=>{ const u=authUser(req); if(!u) return res.status(401).json({error:"Unauthorized"});
  const p=ownProject(u,req.params.id); if(!p) return res.status(404).json({error:"Not found"});
  res.json({ versions:(p.versions||[]).map((v,i)=>({index:i,t:v.t})) }); });
app.get("/api/projects/:id/versions/:vi",(req,res)=>{ const u=authUser(req); if(!u) return res.status(401).json({error:"Unauthorized"});
  const p=ownProject(u,req.params.id); if(!p) return res.status(404).json({error:"Not found"});
  const v=(p.versions||[])[+req.params.vi]; if(!v) return res.status(404).json({error:"No version"}); res.json({ data:v.data,t:v.t }); });
app.post("/api/projects/:id/share",(req,res)=>{ const u=authUser(req); if(!u) return res.status(401).json({error:"Unauthorized"});
  const p=ownProject(u,req.params.id); if(!p) return res.status(404).json({error:"Not found"});
  p.shareId=p.shareId||uid(); persist(); res.json({ shareId:p.shareId }); });
app.get("/api/shared/:shareId",(req,res)=>{ const p=db.projects.find(x=>x.shareId===req.params.shareId); if(!p) return res.status(404).json({error:"Not found"});
  res.json({ name:p.name, data:p.data, updatedAt:p.updatedAt }); });

/* ---------- plans / billing (Stripe scaffold) ---------- */
app.get("/api/plans",(req,res)=> res.json({ plans:[
  { id:"free", name:"Studio Free", price:0, features:["5 cloud projects","DXF / OBJ / PDF export","Version history (30)"] },
  { id:"pro", name:"Studio Pro", price:24, features:["Unlimited projects","Share links","Priority render","Team seats (soon)"] }
]}));
app.post("/api/billing/checkout",(req,res)=>{ const u=authUser(req); if(!u) return res.status(401).json({error:"Unauthorized"});
  if(!STRIPE_KEY) return res.status(501).json({ error:"Billing not configured. Set STRIPE_SECRET and add the Stripe SDK to enable checkout.", plan:req.body&&req.body.plan||"pro" });
  res.status(501).json({ error:"Stripe SDK not wired in this build — see server/README (Payments)." });
});

/* ---------- contact form ---------- */
app.post("/api/contact",(req,res)=>{
  var b=req.body||{};
  var name=(b.name||"").toString().slice(0,120), email=(b.email||"").toString().slice(0,200), message=(b.message||"").toString().slice(0,4000);
  if(!name || !/.+@.+\..+/.test(email) || message.length<2) return res.status(400).json({error:"Please enter your name, a valid email and a message."});
  var m={ id:uid(), name:name, email:email, message:message, t:Date.now(), read:false };
  db.messages=db.messages||[]; db.messages.unshift(m); if(db.messages.length>1000) db.messages.pop(); persist();
  logline({ev:"contact",email:email});
  if(SLACK_WEBHOOK){ try{ fetch(SLACK_WEBHOOK,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:"New Elevé enquiry from "+name+" <"+email+">:\n"+message})}).catch(function(){}); }catch(e){} }
  res.json({ ok:true });
});
app.get("/api/messages",(req,res)=>{ const u=authUser(req); if(!u||u.role!=="admin") return res.status(401).json({error:"Unauthorized"});
  res.json({ messages: db.messages||[] }); });
app.post("/api/subscribe",(req,res)=>{ var email=((req.body&&req.body.email)||"").toString().slice(0,200);
  if(!/.+@.+\..+/.test(email)) return res.status(400).json({error:"Please enter a valid email."});
  db.subscribers=db.subscribers||[]; if(!db.subscribers.find(x=>x.email===email.toLowerCase())){ db.subscribers.push({email:email.toLowerCase(),t:Date.now()}); persist(); logline({ev:"subscribe",email:email}); }
  res.json({ ok:true }); });
app.post("/api/consult",(req,res)=>{ var b=req.body||{};
  var name=(b.name||"").toString().slice(0,120), email=(b.email||"").toString().slice(0,200), date=(b.date||"").toString().slice(0,40), time=(b.time||"").toString().slice(0,20), note=(b.note||"").toString().slice(0,2000);
  if(!name||!/.+@.+\..+/.test(email)||!date) return res.status(400).json({error:"Name, valid email and a preferred date are required."});
  var c={ id:uid(), name:name, email:email, date:date, time:time, note:note, t:Date.now() };
  db.consults=db.consults||[]; db.consults.unshift(c); if(db.consults.length>1000) db.consults.pop(); persist(); logline({ev:"consult",email:email,date:date});
  if(SLACK_WEBHOOK){ try{ fetch(SLACK_WEBHOOK,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:"New consultation booking: "+name+" <"+email+"> on "+date+" "+time+(note?("\n"+note):"")})}).catch(function(){}); }catch(e){} }
  res.json({ ok:true }); });
app.get("/api/admin/inbox",(req,res)=>{ const u=authUser(req); if(!u||u.role!=="admin") return res.status(401).json({error:"Unauthorized"});
  res.json({ messages:db.messages||[], consults:db.consults||[], subscribers:db.subscribers||[] }); });

/* ---------- CLIENT PORTAL (production) ----------
   Each client owns an ISOLATED database file: server/portals/<uid>.json
   (atomic debounced writes, in-memory cache, migration from legacy db.portal).
   Clients get an empty workspace until the studio publishes content through
   the CMS master-control desk; every event lands in the portal's activity log. */
const PORTALS = process.env.PORTAL_DIR || path.join(__dirname, "portals");
try{ if(!fs.existsSync(PORTALS)) fs.mkdirSync(PORTALS,{recursive:true}); }catch(e){}
const pCache=new Map(), pTimers=new Map();
function pFile(uidStr){ return path.join(PORTALS, String(uidStr).replace(/[^A-Za-z0-9_-]/g,"")+".json"); }
/* ----- live sync (Server-Sent Events): every save pushes to open portals/CMS ----- */
const pSubs=new Map(); // uid -> Set<res>
function pNotify(uidStr,doc){
  const set=pSubs.get(uidStr); if(!set||!set.size) return;
  const payload="data:"+JSON.stringify({updatedAt:doc.updatedAt})+"\n\n";
  for(const r of set){ try{ r.write(payload); }catch(e){} }
}
function sseOpen(req,res,uidStr){
  res.writeHead(200,{ "Content-Type":"text/event-stream", "Cache-Control":"no-cache, no-transform", "Connection":"keep-alive", "X-Accel-Buffering":"no" });
  res.write("retry: 3000\n\n");
  let set=pSubs.get(uidStr); if(!set){ set=new Set(); pSubs.set(uidStr,set); } set.add(res);
  const hb=setInterval(()=>{ try{ res.write(":hb\n\n"); }catch(e){} },25000);
  req.on("close",()=>{ clearInterval(hb); set.delete(res); if(!set.size) pSubs.delete(uidStr); });
}
function savePortal(uidStr,doc,immediate){
  doc.updatedAt=Date.now(); pCache.set(uidStr,doc); pNotify(uidStr,doc);
  clearTimeout(pTimers.get(uidStr));
  const write=()=>{ try{ fs.writeFileSync(pFile(uidStr)+".tmp",JSON.stringify(doc)); fs.renameSync(pFile(uidStr)+".tmp",pFile(uidStr)); }catch(e){ console.error("portal persist",e.message); } };
  if(immediate) write(); else pTimers.set(uidStr,setTimeout(write,200));
}
function loadPortal(uidStr){
  if(pCache.has(uidStr)) return pCache.get(uidStr);
  let doc=null;
  try{ doc=JSON.parse(fs.readFileSync(pFile(uidStr),"utf8")); }catch(e){}
  if(!doc && db.portal && db.portal[uidStr]){ doc=db.portal[uidStr]; doc.activity=doc.activity||[]; delete db.portal[uidStr]; persist(); savePortal(uidStr,doc,true); }
  pCache.set(uidStr,doc||null); return doc||null;
}
function pact(doc,by,text){ doc.activity=doc.activity||[]; doc.activity.unshift({t:Date.now(),by:String(by).slice(0,80),text:String(text).slice(0,300)}); if(doc.activity.length>300) doc.activity.pop(); }
function emptyPortal(){ return { project:null, actions:[], moodboards:{rooms:[]}, reactions:{}, comments:{},
  renders:{rooms:[]}, approvals:[], materials:[], budget:{currency:"€",categories:[],milestones:[]},
  threads:[{id:uid(),title:"General",messages:[]}], schedule:[], activity:[], updatedAt:Date.now() }; }
function portalOf(u){ let d=loadPortal(u.id); if(!d){ d=emptyPortal(); pact(d,"system","Workspace created for "+(u.email||u.id)); savePortal(u.id,d,true); } return d; }
function demoPortal(){
  const g=(a,c1,c2)=>"linear-gradient("+a+"deg,"+c1+","+c2+")";
  const now=Date.now(), day=86400000;
  return {
    project:{ name:"Aurora Penthouse", location:"Lisbon · Residential", code:"ELV-2461",
      phases:["Concept","Design Development","Procurement","Execution","Styling"], phase:1,
      startedAt:now-60*day, targetAt:now+140*day },
    actions:[
      { id:"a1", label:"Approve the Living Room moodboard", tab:"moodboards", done:false },
      { id:"a2", label:"Review Kitchen render v2", tab:"renders", done:false },
      { id:"a3", label:"Confirm marble slab selection", tab:"approvals", done:false },
      { id:"a4", label:"Sign off Design Development milestone", tab:"budget", done:false }
    ],
    moodboards:{ rooms:[
      { id:"living", name:"Living Room", items:[
        { id:"mb1", name:"Travertine wall", cat:"Stone", sw:g(135,"#d9dce1","#b9bec6") },
        { id:"mb2", name:"Smoked oak floor", cat:"Wood", sw:g(150,"#c9cdd4","#a9aeb6") },
        { id:"mb3", name:"Bouclé sofa", cat:"Furniture", sw:g(120,"#e6e8eb","#cdd1d7"), ai:"Matches your travertine + oak palette" },
        { id:"mb4", name:"Brushed brass sconce", cat:"Lighting", sw:g(160,"#d4d7dc","#b2b7bf") },
        { id:"mb5", name:"Linen drapery", cat:"Fabric", sw:g(140,"#eceef1","#d3d6db") },
        { id:"mb6", name:"Basalt coffee table", cat:"Furniture", sw:g(125,"#b7bcc4","#d9dce1"), ai:"Pairs with the smoked oak tone" }
      ]},
      { id:"suite", name:"Master Suite", items:[
        { id:"mb7", name:"Lime-washed walls", cat:"Finish", sw:g(140,"#e3e5e9","#c8ccd2") },
        { id:"mb8", name:"Walnut headboard", cat:"Wood", sw:g(150,"#c2c6cd","#a5aab2") },
        { id:"mb9", name:"Wool rug — undyed", cat:"Fabric", sw:g(130,"#e8eaee","#d0d4d9"), ai:"Completes the suite's soft neutrals" },
        { id:"mb10", name:"Paper pendant", cat:"Lighting", sw:g(155,"#dfe1e5","#c2c6cd") }
      ]},
      { id:"kitchen", name:"Kitchen", items:[
        { id:"mb11", name:"Honed basalt counter", cat:"Stone", sw:g(135,"#b2b7bf","#d4d7dc") },
        { id:"mb12", name:"Rift oak cabinetry", cat:"Wood", sw:g(145,"#cdd1d7","#aeb3bb") },
        { id:"mb13", name:"Linear pendant", cat:"Lighting", sw:g(120,"#dcdfe4","#bfc4cb") }
      ]}
    ]},
    reactions:{}, comments:{
      "mb3":[ { id:uid(), by:"studio", who:"Camille — Lead Designer", text:"We softened the arm profile from the first pass — sits lower against the window line.", t:now-6*day } ],
      "render:living:v2":[ { id:uid(), by:"studio", who:"Atelier — 3D", text:"Lighting re-balanced for the 6pm sun study you asked about.", t:now-2*day } ]
    },
    renders:{ rooms:[
      { id:"living", name:"Living Room", approved:null, versions:[
        { v:"v1", label:"Concept v1", before:g(135,"#e3e5e9","#c9cdd4"), after:g(135,"#cdd1d7","#9fa4ac"), note:"First massing + palette" },
        { v:"v2", label:"Concept v2", before:g(135,"#e3e5e9","#c9cdd4"), after:g(150,"#c2c6cd","#8f949c"), note:"Lower sofa line, warmer light" },
        { v:"final", label:"Final", before:g(135,"#e3e5e9","#c9cdd4"), after:g(160,"#b7bcc4","#7d828a"), note:"Presentation render" } ]},
      { id:"suite", name:"Master Suite", approved:null, versions:[
        { v:"v1", label:"Concept v1", before:g(140,"#e8eaee","#d0d4d9"), after:g(140,"#c9cdd4","#a2a7af"), note:"Initial layout" },
        { v:"final", label:"Final", before:g(140,"#e8eaee","#d0d4d9"), after:g(155,"#b2b7bf","#878c94"), note:"Presentation render" } ]},
      { id:"kitchen", name:"Kitchen", approved:null, versions:[
        { v:"v1", label:"Concept v1", before:g(130,"#e6e8eb","#cdd1d7"), after:g(130,"#c2c6cd","#989da5"), note:"Island study" },
        { v:"v2", label:"Concept v2", before:g(130,"#e6e8eb","#cdd1d7"), after:g(145,"#aeb3bb","#7d828a"), note:"Pendant + counter revised" } ]}
    ]},
    approvals:[
      { id:"ap1", title:"Living Room moodboard", room:"Living Room", due:now+3*day, status:"pending" },
      { id:"ap2", title:"Kitchen render v2", room:"Kitchen", due:now+5*day, status:"pending" },
      { id:"ap3", title:"Marble slab — Estremoz lot #14", room:"Bathrooms", due:now+7*day, status:"pending" },
      { id:"ap4", title:"Suite lighting concept", room:"Master Suite", due:now-9*day, status:"approved", decidedAt:now-9*day }
    ],
    materials:[
      { id:"m1", name:"Estremoz marble", cat:"Stone", finish:"Honed", sku:"EST-014", supplier:"Solancis", status:"lead", lead:"6 wks", room:"Bathrooms" },
      { id:"m2", name:"Smoked oak — wide plank", cat:"Wood", finish:"UV oil", sku:"OAK-220W", supplier:"Dinesen", status:"stock", room:"Living Room" },
      { id:"m3", name:"Lime paint — Bone", cat:"Paint", finish:"Matt", sku:"LP-BN-05", supplier:"Bauwerk", status:"stock", room:"Whole home" },
      { id:"m4", name:"Brushed brass sconce", cat:"Lighting", finish:"Satin", sku:"SC-114-BR", supplier:"Apparatus", status:"lead", lead:"10 wks", room:"Living Room" },
      { id:"m5", name:"Bouclé — natural", cat:"Fabric", finish:"—", sku:"BC-020", supplier:"Dedar", status:"back", room:"Living Room" },
      { id:"m6", name:"Honed basalt slab", cat:"Stone", finish:"Honed", sku:"BAS-3cm", supplier:"Solancis", status:"lead", lead:"4 wks", room:"Kitchen" }
    ],
    budget:{ currency:"€", categories:[
      { id:"b1", name:"Joinery & millwork", est:64000, actual:58200 },
      { id:"b2", name:"Stone & surfaces", est:38000, actual:41500 },
      { id:"b3", name:"Furniture", est:72000, actual:47300 },
      { id:"b4", name:"Lighting", est:22000, actual:19800 },
      { id:"b5", name:"Fabric & styling", est:18000, actual:6100 } ],
      milestones:[
      { id:"pm1", label:"Engagement — signed", amount:24000, due:now-55*day, status:"paid" },
      { id:"pm2", label:"Concept approval", amount:36000, due:now-20*day, status:"paid" },
      { id:"pm3", label:"Design Development sign-off", amount:48000, due:now+10*day, status:"due" },
      { id:"pm4", label:"Procurement release", amount:60000, due:now+45*day, status:"upcoming" } ]},
    threads:[
      { id:"t1", title:"General", messages:[
        { id:uid(), by:"studio", who:"Camille — Lead Designer", text:"Welcome to your portal. Everything we decide together lives here — moodboards, renders, approvals and the schedule.", t:now-58*day },
        { id:uid(), by:"studio", who:"Rui — Project Manager", text:"Site measurements are confirmed. Design Development is underway.", t:now-30*day } ]},
      { id:"t2", title:"Living Room", messages:[
        { id:uid(), by:"studio", who:"Camille — Lead Designer", text:"Two sofa directions are on the moodboard — the bouclé is our recommendation for the light in that room.", t:now-6*day } ]},
      { id:"t3", title:"Procurement", messages:[
        { id:uid(), by:"studio", who:"Rui — Project Manager", text:"The Dedar bouclé is backordered at the mill. We have two alternatives ready if the 12-week window doesn't work.", t:now-1*day } ]}
    ],
    schedule:[
      { id:"s1", date:now-60*day, title:"Engagement begins — Concept phase", kind:"phase", status:"done" },
      { id:"s2", date:now-32*day, title:"Site survey & measurements", kind:"site", status:"done" },
      { id:"s3", date:now-20*day, title:"Concept approved", kind:"phase", status:"done" },
      { id:"s4", date:now+10*day, title:"Design Development sign-off", kind:"phase", status:"next" },
      { id:"s5", date:now+24*day, title:"Site visit — services first fix", kind:"site", status:"planned" },
      { id:"s6", date:now+45*day, title:"Procurement release", kind:"phase", status:"planned" },
      { id:"s7", date:now+96*day, title:"Stone & joinery delivery", kind:"delivery", status:"planned" },
      { id:"s8", date:now+126*day, title:"Installation week", kind:"install", status:"planned" },
      { id:"s9", date:now+140*day, title:"Styling & reveal", kind:"phase", status:"planned" }
    ]
  };
}
/* ----- client endpoints (each writes to the client's own DB file) ----- */
app.get("/api/portal",(req,res)=>{ const u=authUser(req); if(!u) return res.status(401).json({error:"Unauthorized"});
  res.json({ portal: portalOf(u), user: safeUser(u) }); });
/* live stream — EventSource can't send headers, so the token rides in ?t= */
app.get("/api/portal/events",(req,res)=>{
  const t=verify(String(req.query.t||"")); if(!t) return res.status(401).json({error:"Unauthorized"});
  const u=db.users.find(x=>x.id===t.uid); if(!u) return res.status(401).json({error:"Unauthorized"});
  sseOpen(req,res,u.id);
});
app.post("/api/portal/react",(req,res)=>{ const u=authUser(req); if(!u) return res.status(401).json({error:"Unauthorized"});
  const p=portalOf(u), { itemId, like }=req.body||{};
  if(!validStr(itemId,60)) return res.status(400).json({error:"Bad item"});
  if(like===true||like===false){ p.reactions[itemId]={like,t:Date.now()}; pact(p,"client",(like?"Liked":"Passed on")+" a moodboard item"); }
  else delete p.reactions[itemId];
  savePortal(u.id,p); res.json({ ok:true, reactions:p.reactions }); });
app.post("/api/portal/comment",(req,res)=>{ const u=authUser(req); if(!u) return res.status(401).json({error:"Unauthorized"});
  const p=portalOf(u), { refId, text }=req.body||{};
  if(!validStr(refId,80)||!validStr(text,2000)||!text.trim()) return res.status(400).json({error:"A comment is required"});
  p.comments[refId]=p.comments[refId]||[];
  const c={ id:uid(), by:"client", text:text.trim().slice(0,2000), t:Date.now() };
  p.comments[refId].push(c); pact(p,"client","Commented on "+refId);
  savePortal(u.id,p); res.json({ ok:true, comment:c }); });
app.post("/api/portal/approve",(req,res)=>{ const u=authUser(req); if(!u) return res.status(401).json({error:"Unauthorized"});
  const p=portalOf(u), { id, action, note }=req.body||{};
  const a=p.approvals.find(x=>x.id===id); if(!a) return res.status(404).json({error:"Not found"});
  if(action==="approve"){ a.status="approved"; a.decidedAt=Date.now(); delete a.note; pact(p,"client","Approved: "+a.title); }
  else if(action==="changes"){ a.status="changes"; a.decidedAt=Date.now(); a.note=validStr(note,2000)?note.trim().slice(0,2000):""; pact(p,"client","Requested changes: "+a.title); }
  else return res.status(400).json({error:"Bad action"});
  savePortal(u.id,p); res.json({ ok:true, approval:a }); });
app.post("/api/portal/render-approve",(req,res)=>{ const u=authUser(req); if(!u) return res.status(401).json({error:"Unauthorized"});
  const p=portalOf(u), { roomId, version }=req.body||{};
  const r=p.renders.rooms.find(x=>x.id===roomId); if(!r) return res.status(404).json({error:"Not found"});
  if(!r.versions.find(v=>v.v===version)) return res.status(400).json({error:"Bad version"});
  r.approved=version; pact(p,"client","Approved render "+version+" — "+r.name);
  savePortal(u.id,p); res.json({ ok:true, approved:version }); });
app.post("/api/portal/message",(req,res)=>{ const u=authUser(req); if(!u) return res.status(401).json({error:"Unauthorized"});
  const p=portalOf(u), { threadId, text }=req.body||{};
  const t=p.threads.find(x=>x.id===threadId); if(!t) return res.status(404).json({error:"Not found"});
  if(!validStr(text,4000)||!text.trim()) return res.status(400).json({error:"A message is required"});
  const m={ id:uid(), by:"client", text:text.trim().slice(0,4000), t:Date.now() };
  t.messages.push(m); pact(p,"client","Message in “"+t.title+"”");
  savePortal(u.id,p); res.json({ ok:true, message:m }); });
app.post("/api/portal/action",(req,res)=>{ const u=authUser(req); if(!u) return res.status(401).json({error:"Unauthorized"});
  const p=portalOf(u), { id, done }=req.body||{};
  const a=p.actions.find(x=>x.id===id); if(!a) return res.status(404).json({error:"Not found"});
  a.done=!!done; if(done) pact(p,"client","Completed action: "+a.label);
  savePortal(u.id,p); res.json({ ok:true }); });

/* ----- studio MASTER CONTROL (admin role; used by the CMS desk) ----- */
function admin(req,res){ const u=authUser(req); if(!u||u.role!=="admin"){ res.status(401).json({error:"Unauthorized"}); return null; } return u; }
const P_SECTIONS=["project","actions","moodboards","renders","approvals","materials","budget","threads","schedule"];
app.get("/api/admin/portal/clients",(req,res)=>{ if(!admin(req,res)) return;
  const list=db.users.map(u=>{ const d=loadPortal(u.id);
    return { id:u.id, email:u.email, createdAt:u.createdAt,
      project:d&&d.project?d.project.name:null, phase:d&&d.project?d.project.phases[d.project.phase]:null,
      pending:d?d.approvals.filter(a=>a.status==="pending").length:0,
      msgs:d?d.threads.reduce((s,t)=>s+t.messages.length,0):0,
      updatedAt:d?d.updatedAt:null }; });
  res.json({ clients:list }); });
app.get("/api/admin/portal/:uid",(req,res)=>{ if(!admin(req,res)) return;
  const target=db.users.find(x=>x.id===req.params.uid); if(!target) return res.status(404).json({error:"No such client"});
  let d=loadPortal(target.id); if(!d){ d=emptyPortal(); pact(d,"studio","Workspace created"); savePortal(target.id,d,true); }
  res.json({ portal:d, client:safeUser(target) }); });
/* live stream for the master-control desk (admin token in ?t=) */
app.get("/api/admin/portal/:uid/events",(req,res)=>{
  const t=verify(String(req.query.t||"")); if(!t||t.role!=="admin") return res.status(401).json({error:"Unauthorized"});
  const target=db.users.find(x=>x.id===req.params.uid); if(!target) return res.status(404).json({error:"No such client"});
  sseOpen(req,res,target.id);
});
app.put("/api/admin/portal/:uid",(req,res)=>{ if(!admin(req,res)) return;
  const target=db.users.find(x=>x.id===req.params.uid); if(!target) return res.status(404).json({error:"No such client"});
  const { section, data }=req.body||{};
  if(P_SECTIONS.indexOf(section)<0) return res.status(400).json({error:"Unknown section"});
  if(JSON.stringify(data||null).length>24_000_000) return res.status(413).json({error:"Section too large — try smaller images"});
  let d=loadPortal(target.id)||emptyPortal();
  d[section]=data; pact(d,"studio","Updated "+section);
  savePortal(target.id,d,true); logline({ev:"portal-admin-edit",uid:target.id,section});
  res.json({ ok:true, updatedAt:d.updatedAt }); });
app.post("/api/admin/portal/:uid/reply",(req,res)=>{ if(!admin(req,res)) return;
  const target=db.users.find(x=>x.id===req.params.uid); if(!target) return res.status(404).json({error:"No such client"});
  const d=loadPortal(target.id)||emptyPortal();
  const { threadId, refId, text, who }=req.body||{};
  if(!validStr(text,4000)||!text.trim()) return res.status(400).json({error:"A message is required"});
  const entry={ id:uid(), by:"studio", who:validStr(who,80)&&who.trim()?who.trim():"Elevé Studio", text:text.trim().slice(0,4000), t:Date.now() };
  if(threadId){ const t=d.threads.find(x=>x.id===threadId); if(!t) return res.status(404).json({error:"Thread not found"});
    t.messages.push(entry); pact(d,"studio","Replied in “"+t.title+"”"); }
  else if(validStr(refId,80)){ d.comments[refId]=d.comments[refId]||[]; d.comments[refId].push(entry); pact(d,"studio","Replied on "+refId); }
  else return res.status(400).json({error:"threadId or refId required"});
  savePortal(target.id,d,true); res.json({ ok:true, message:entry }); });
app.post("/api/admin/portal/:uid/seed-demo",(req,res)=>{ if(!admin(req,res)) return;
  const target=db.users.find(x=>x.id===req.params.uid); if(!target) return res.status(404).json({error:"No such client"});
  const d=demoPortal(); d.activity=[]; pact(d,"studio","Published the Aurora Penthouse showcase");
  savePortal(target.id,d,true); res.json({ ok:true }); });
app.post("/api/admin/portal/:uid/reset",(req,res)=>{ if(!admin(req,res)) return;
  const target=db.users.find(x=>x.id===req.params.uid); if(!target) return res.status(404).json({error:"No such client"});
  const d=emptyPortal(); pact(d,"studio","Workspace reset");
  savePortal(target.id,d,true); res.json({ ok:true }); });

/* ----- ACCOUNT MANAGEMENT (admin only; used by the CMS Accounts desk) ----- */
app.get("/api/admin/users",(req,res)=>{ if(!admin(req,res)) return;
  res.json({ users: db.users.map(u=>{ const d=loadPortal(u.id);
    return { id:u.id, email:u.email, role:u.role, plan:u.plan, createdAt:u.createdAt,
      project:d&&d.project?d.project.name:null,
      msgs:d?d.threads.reduce((s,t)=>s+t.messages.length,0):0,
      builderProjects:db.projects.filter(p=>p.ownerId===u.id).length }; }) }); });
app.post("/api/admin/users",(req,res)=>{ if(!admin(req,res)) return;
  const { email, password, role }=req.body||{};
  if(!validStr(email,200)||!/.+@.+\..+/.test(email)) return res.status(400).json({error:"A valid email is required"});
  if(!validStr(password,200)||password.length<6) return res.status(400).json({error:"Password must be at least 6 characters"});
  if(db.users.find(u=>u.email===email.toLowerCase())) return res.status(409).json({error:"That email is already registered"});
  const salt=crypto.randomBytes(16).toString("hex");
  const u={ id:uid(), email:email.toLowerCase(), salt, pass:hash(password,salt), role:role==="admin"?"admin":"user", plan:"free", createdAt:Date.now() };
  db.users.push(u); persist(); logline({ev:"admin-user-create",uid:u.id,role:u.role});
  res.json({ ok:true, user:safeUser(u) }); });
app.put("/api/admin/users/:uid",(req,res)=>{ if(!admin(req,res)) return;
  const u=db.users.find(x=>x.id===req.params.uid); if(!u) return res.status(404).json({error:"No such account"});
  const b=req.body||{};
  if(b.email!==undefined){
    if(!validStr(b.email,200)||!/.+@.+\..+/.test(b.email)) return res.status(400).json({error:"Invalid email"});
    const e=b.email.toLowerCase();
    if(db.users.find(x=>x.email===e&&x.id!==u.id)) return res.status(409).json({error:"That email is already registered"});
    u.email=e;
  }
  if(b.role!==undefined){
    const r=(b.role==="admin")?"admin":"user";
    if(u.role==="admin"&&r!=="admin"&&db.users.filter(x=>x.role==="admin").length<=1)
      return res.status(409).json({error:"This is the only admin account — make someone else admin first."});
    u.role=r;
  }
  if(b.password!==undefined&&b.password!==""){
    if(!validStr(b.password,200)||b.password.length<6) return res.status(400).json({error:"Password must be at least 6 characters"});
    u.salt=crypto.randomBytes(16).toString("hex"); u.pass=hash(b.password,u.salt);
  }
  persist(); logline({ev:"admin-user-edit",uid:u.id});
  res.json({ ok:true, user:safeUser(u) }); });
app.delete("/api/admin/users/:uid",(req,res)=>{ if(!admin(req,res)) return;
  const i=db.users.findIndex(x=>x.id===req.params.uid); if(i<0) return res.status(404).json({error:"No such account"});
  const u=db.users[i];
  if(u.role==="admin"&&db.users.filter(x=>x.role==="admin").length<=1)
    return res.status(409).json({error:"This is the only admin account — it can't be deleted."});
  db.users.splice(i,1);
  db.projects=db.projects.filter(p=>p.ownerId!==u.id);          // their builder projects
  try{ if(fs.existsSync(pFile(u.id))) fs.unlinkSync(pFile(u.id)); }catch(e){}  // their portal DB
  pCache.delete(u.id); clearTimeout(pTimers.get(u.id)); pTimers.delete(u.id);
  const subs=pSubs.get(u.id); if(subs){ for(const r of subs){ try{ r.end(); }catch(e){} } pSubs.delete(u.id); }
  persist(); logline({ev:"admin-user-delete",uid:u.id,email:u.email});
  res.json({ ok:true }); });

/* ---------- analytics (privacy-friendly, no PII/cookies) + client log ---------- */
app.post("/api/analytics",(req,res)=>{ const { page, event } = req.body||{};
  if(validStr(page,200)&&validStr(event,60)){ db.analytics.push({ t:Date.now(), page:page.slice(0,200), event:event.slice(0,60) }); if(db.analytics.length>5000) db.analytics.shift(); persist(); }
  res.json({ ok:true }); });
app.get("/api/analytics/summary",(req,res)=>{ const u=authUser(req); if(!u||u.role!=="admin") return res.status(401).json({error:"Unauthorized"});
  const by={}; (db.analytics||[]).forEach(a=>{ const k=a.event+" "+a.page; by[k]=(by[k]||0)+1; }); res.json({ total:(db.analytics||[]).length, by }); });
app.post("/api/log",(req,res)=>{ const m=req.body&&req.body.msg; if(validStr(m,1000)) logline({ev:"clienterror",msg:m.slice(0,1000)}); res.json({ok:true}); });

/* ---------- static site ---------- */
app.use(express.static(SITE, { extensions:["html"], setHeaders:function(res,fp){
  if(/\.(js|css|mp3|wav|glb|svg|png|jpg|jpeg|webp|woff2?)$/i.test(fp)) res.setHeader("Cache-Control","public, max-age=604800");
  else if(/\.html$/i.test(fp)) res.setHeader("Cache-Control","no-cache");
} }));
app.use((req,res)=>{ res.status(404); if(req.accepts("html")) return res.sendFile(path.join(SITE,"404.html"),err=>{ if(err) res.send("Not found"); }); res.json({error:"Not found"}); });

if (require.main === module) {
  backup(); setInterval(backup, 1000*60*60*6);
  app.listen(PORT, ()=>{
    console.log("Elevé server \u2192 http://localhost:"+PORT);
    console.log("Admin password: "+(process.env.ADMIN_PASSWORD?"(env)":"eleve-admin (default \u2014 change it)"));
    console.log("Billing: "+(STRIPE_KEY?"Stripe key present":"not configured (set STRIPE_SECRET)"));
  });
}
module.exports = app;
