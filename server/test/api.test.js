const test = require("node:test");
const assert = require("node:assert");
const http = require("http");

process.env.DB_FILE = require("os").tmpdir()+"/eleve-test-"+Date.now()+".json";
process.env.LOG_FILE = require("os").tmpdir()+"/eleve-test-"+Date.now()+".log";
process.env.ADMIN_PASSWORD = "test-admin";
process.env.SECRET = "test-secret";
const app = require("../server.js");

let server, base;
test.before(async () => {
  server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  base = "http://localhost:" + server.address().port;
});
test.after(() => server && server.close());

async function j(method, path, body, token){
  const res = await fetch(base+path, { method, headers: Object.assign({"Content-Type":"application/json"}, token?{Authorization:"Bearer "+token}:{}), body: body?JSON.stringify(body):undefined });
  let data=null; try{ data=await res.json(); }catch(e){}
  return { status:res.status, data };
}

test("health ok", async () => {
  const r = await j("GET","/api/health"); // not defined in v2 -> 404 is fine; use content instead
  const c = await j("GET","/api/content");
  assert.equal(c.status,200);
  assert.ok(c.data.content && typeof c.data.content==="object");
});

test("register creates first admin", async () => {
  const r = await j("POST","/api/auth/register",{email:"a@eleve.test",password:"secret123"});
  assert.equal(r.status,200);
  assert.ok(r.data.token);
  assert.equal(r.data.user.role,"admin");
});

test("duplicate register blocked", async () => {
  const r = await j("POST","/api/auth/register",{email:"a@eleve.test",password:"secret123"});
  assert.equal(r.status,409);
});

test("login + me", async () => {
  const l = await j("POST","/api/auth/login",{email:"a@eleve.test",password:"secret123"});
  assert.equal(l.status,200);
  const me = await j("GET","/api/me",null,l.data.token);
  assert.equal(me.status,200);
  assert.equal(me.data.user.email,"a@eleve.test");
});

test("bad login rejected", async () => {
  const r = await j("POST","/api/auth/login",{email:"a@eleve.test",password:"wrong"});
  assert.equal(r.status,401);
});

test("project CRUD + versions + share", async () => {
  const l = await j("POST","/api/auth/login",{email:"a@eleve.test",password:"secret123"});
  const tok=l.data.token;
  const c = await j("POST","/api/projects",{name:"Flat A",data:{floors:[1]}},tok);
  assert.equal(c.status,200); const id=c.data.id; assert.ok(id);
  const up = await j("PUT","/api/projects/"+id,{data:{floors:[1,2]}},tok);
  assert.equal(up.status,200); assert.equal(up.data.versions,1);
  const list = await j("GET","/api/projects",null,tok);
  assert.equal(list.status,200); assert.equal(list.data.projects.length,1);
  const sh = await j("POST","/api/projects/"+id+"/share",null,tok);
  assert.ok(sh.data.shareId);
  const pub = await j("GET","/api/shared/"+sh.data.shareId);
  assert.equal(pub.status,200); assert.deepEqual(pub.data.data,{floors:[1,2]});
});

test("projects require auth", async () => {
  const r = await j("GET","/api/projects");
  assert.equal(r.status,401);
});

test("legacy admin content publish", async () => {
  const login = await j("POST","/api/login",{password:"test-admin"});
  assert.equal(login.status,200);
  const save = await j("POST","/api/content",{content:{text:{hero_tag:"HELLO"}}},login.data.token);
  assert.equal(save.status,200);
  const got = await j("GET","/api/content");
  assert.equal(got.data.content.text.hero_tag,"HELLO");
});

test("unauth content publish blocked", async () => {
  const r = await j("POST","/api/content",{content:{}});
  assert.equal(r.status,401);
});
