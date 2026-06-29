(function(){
  var d; try{ d=JSON.parse(localStorage.getItem("eleve_cms")||"{}"); }catch(e){ d={}; }
  d.text=d.text||{}; d.img=d.img||{}; d.gallery=d.gallery||{};
  window.__CMS=d;
  function apply(){
    document.querySelectorAll("[data-cms]").forEach(function(el){ var k=el.getAttribute("data-cms"); var v=d.text[k]; if(v!=null && v!=="") el.textContent=v; });
    document.querySelectorAll("[data-cms-img]").forEach(function(el){ var k=el.getAttribute("data-cms-img"); var u=d.img[k]; if(u){ el.style.backgroundImage="url('"+u+"')"; el.style.backgroundSize="cover"; el.style.backgroundPosition="center"; } });
  }
  if(document.readyState!=="loading") apply(); else document.addEventListener("DOMContentLoaded",apply);
})();
