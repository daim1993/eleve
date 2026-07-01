/* Elevé — shared site chrome: persistent Book CTA, dark-mode toggle, footer newsletter. */
(function(){
  var base=(location.protocol==="http:"||location.protocol==="https:")?"":"http://localhost:4000";
  var isBuilder=/builder\.html$/.test(location.pathname);
  try{ document.documentElement.removeAttribute("data-theme"); localStorage.removeItem("eleve_theme"); }catch(e){}
  function build(){
    var br=document.querySelector(".ui-br"); if(br) br.style.display="none";
    var wrap=document.createElement("div"); wrap.id="eleve-chrome";
    wrap.style.cssText="position:fixed;right:1rem;bottom:1rem;z-index:1400;display:flex;align-items:center;gap:.5rem";
    var cta=document.createElement("a"); cta.href="book.html"; cta.textContent="Book a consultation";
    cta.style.cssText="font-family:'JetBrains Mono',monospace;font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;padding:.7rem 1rem;border:1px solid var(--ink,#17181b);background:var(--ink,#17181b);color:#fff;text-decoration:none";
    wrap.appendChild(cta);
    document.body.appendChild(wrap);
    // newsletter appended to footer(s)
    var foot=document.querySelector("footer");
    if(foot && !foot.querySelector(".nl-form")){
      var nl=document.createElement("form"); nl.className="nl-form";
      nl.style.cssText="margin-top:1.1rem;display:flex;gap:.5rem;justify-content:center;flex-wrap:wrap;align-items:center";
      nl.innerHTML='<input type="email" required placeholder="Email for studio news" aria-label="Email" style="font:inherit;font-size:.8rem;padding:.5rem .7rem;border:1px solid var(--line,#d7d9de);background:transparent;color:inherit;min-width:220px"><button style="font:inherit;font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;padding:.55rem .9rem;border:1px solid currentColor;background:transparent;color:inherit;cursor:pointer">Subscribe</button><span class="nl-msg" style="font-size:.75rem"></span>';
      nl.addEventListener("submit",function(e){ e.preventDefault(); var email=nl.querySelector("input").value.trim(), msg=nl.querySelector(".nl-msg");
        fetch(base+"/api/subscribe",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:email})})
          .then(function(r){return r.ok?r.json():r.json().then(function(x){throw x;});})
          .then(function(){ nl.reset(); msg.textContent="Subscribed ✓"; })
          .catch(function(err){ msg.textContent=(err&&err.error)||"Try again — server offline?"; }); });
      foot.appendChild(nl);
    }
  }
  if(document.readyState!=="loading") build(); else document.addEventListener("DOMContentLoaded",build);
})();
