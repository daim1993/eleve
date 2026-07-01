/* Elevé backend v2 — accounts, content, builder projects (versions + sharing),
   plans/billing stub, analytics, rate limiting, security headers, static hosting.
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
function authUser(req){ const t=verify((req.headers.authorization||"").replace(/^Bearer\s+/i,"")); if(!t) return null; return db.users.find(u=>u.id===t.uid)||(t.role==="admin"?{id:"admin",role:"admin",plan:"pro"}:null); }
const safeUser = u => u && ({ id:u.id, email:u.email, role:u.role, plan:u.plan, createdAt:u.createdAt });

/* ---------- middleware ---------- */
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
  const { email, password } = req.body||{};
  if(!validStr(email,200)||!/.+@.+\..+/.test(email)||!validStr(password,200)||password.length<6) return res.status(400).json({error:"Valid email and 6+ char password required"});
  if(db.users.find(u=>u.email===email.toLowerCase())) return res.status(409).json({error:"Email already registered"});
  const salt=crypto.randomBytes(16).toString("hex");
  const u={ id:uid(), email:email.toLowerCase(), salt, pass:hash(password,salt), role: db.users.length===0?"admin":"user", plan:"free", createdAt:Date.now() };
  db.users.push(u); persist(); logline({ev:"register",uid:u.id});
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
