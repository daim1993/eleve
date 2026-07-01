/* Elevé — content apply + backend sync (public pages)
   Applies published CMS content to [data-cms] / [data-cms-img], and pulls the
   latest from the backend when reachable. Falls back to localStorage offline. */
(function(){
  var KEY="eleve_cms";
  var base=(location.protocol==="http:"||location.protocol==="https:")?"":"http://localhost:4000";
  var d; try{ d=JSON.parse(localStorage.getItem(KEY)||"{}"); }catch(e){ d={}; }
  d.text=d.text||{}; d.img=d.img||{}; d.gallery=d.gallery||{};
  window.__CMS=d;

  function apply(){
    document.querySelectorAll("[data-cms]").forEach(function(el){ var k=el.getAttribute("data-cms"); var v=d.text[k]; if(v!=null&&v!=="") el.textContent=v; });
    document.querySelectorAll("[data-cms-img]").forEach(function(el){ var k=el.getAttribute("data-cms-img"); var u=d.img[k]; if(u){ el.style.backgroundImage="url('"+u+"')"; el.style.backgroundSize="cover"; el.style.backgroundPosition="center"; } });
  }
  if(document.readyState!=="loading") apply(); else document.addEventListener("DOMContentLoaded",apply);

  /* pull latest published content from the backend; if newer, cache + refresh once */
  try{
    fetch(base+"/api/content",{cache:"no-store"})
      .then(function(r){ return r.ok?r.json():null; })
      .then(function(j){
        if(!j||!j.content) return;
        var inc=JSON.stringify(j.content), cur=localStorage.getItem(KEY)||"{}";
        if(inc!==cur){
          localStorage.setItem(KEY,inc);
          if(!sessionStorage.getItem("eleve_srv_refreshed")){ sessionStorage.setItem("eleve_srv_refreshed","1"); location.reload(); }
        }
      })
      .catch(function(){ /* offline / no server → use cached localStorage */ });
  }catch(e){}
})();
