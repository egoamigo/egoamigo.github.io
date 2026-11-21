/* ホームページの中身をスプレッドシートから読む
   「EGO AMIGO ホームページの中身」のスプシを直すと、料金・お知らせが変わる。
   読めないときは、ページに書いてある中身をそのまま出す。 */
(function(){
  var SHEET_ID = "1UPZjvL0F8K2yehmfyfCLYB2L29dIc7FQcFnmQsgUaTQ";
  var cache = {};
  function csv(t){
    var rows=[], row=[], f="", q=false;
    for(var i=0;i<t.length;i++){
      var c=t[i];
      if(q){ if(c==='"'){ if(t[i+1]==='"'){ f+='"'; i++; } else q=false; } else f+=c; }
      else if(c==='"') q=true;
      else if(c===','){ row.push(f); f=""; }
      else if(c==='\n'){ row.push(f); rows.push(row); row=[]; f=""; }
      else if(c!=='\r') f+=c;
    }
    if(f!==""||row.length){ row.push(f); rows.push(row); }
    return rows;
  }
  /* 1行目を見出しにして {見出し:中身} の並びにする */
  function get(name){
    if(!SHEET_ID) return Promise.reject();
    if(cache[name]) return cache[name];
    var url="https://docs.google.com/spreadsheets/d/"+SHEET_ID+"/gviz/tq?tqx=out:csv&headers=1&sheet="+encodeURIComponent(name)+"&t="+Date.now();
    cache[name]=fetch(url).then(function(r){ if(!r.ok) throw 0; return r.text(); }).then(function(t){
      if(/^\s*</.test(t)) throw 0;   /* 見られない設定のときはログインの画面が返る */
      var rs=csv(t); var h=(rs.shift()||[]).map(function(x){return x.trim()});
      return rs.map(function(r){ var o={}; h.forEach(function(k,i){ o[k]=(r[i]||"").trim(); }); return o; })
               .filter(function(o){ return Object.keys(o).some(function(k){return o[k]}); });
    });
    return cache[name];
  }
  /* 「、」「。」のところで区切って、スマホで言葉の途中で改行されないようにする */
  function phr(el, text){
    el.textContent="";
    (text.match(/[^、。]+[、。]?/g)||[text]).forEach(function(p){
      var s=document.createElement("span"); s.className="p"; s.textContent=p; el.appendChild(s);
    });
  }
  function row(dl, a, aSmall, b, bSmall){
    var d=document.createElement("div"), dt=document.createElement("dt"), dd=document.createElement("dd");
    dt.textContent=a;
    if(aSmall){ var s=document.createElement("small"); s.textContent=aSmall; dt.appendChild(s); }
    phr(dd,b);
    if(bSmall){ var s2=document.createElement("small"); phr(s2,bSmall); dd.appendChild(s2); }
    d.appendChild(dt); d.appendChild(dd); dl.appendChild(d);
  }
  function lists(){
    var fee=document.getElementById("fee"); if(!fee) return [];
    return fee.querySelectorAll("dl.fee-list");
  }
  window.EgoSheet = { get: get };
  if(typeof document==="undefined") return;

  /* 料金 */
  get("料金").then(function(rs){
    var dl=lists()[0]; if(!dl || !rs.length) return;
    var note=document.querySelector("#fee .fee-note");
    var items=rs.filter(function(r){ return r["項目"] && !/^※/.test(r["項目"]) && r["金額"]; });
    var notes=rs.filter(function(r){ return /^※/.test(r["項目"]||"") && r["金額"]; });
    if(!items.length) return;
    dl.textContent="";
    items.forEach(function(r){ row(dl, r["項目"], r["項目の下の小さい字"], r["金額"], r["金額の下の小さい字"]); });
    if(note){ if(notes.length){ phr(note, notes.map(function(r){return r["金額"]}).join("")); note.hidden=false; } else note.hidden=true; }
  }).catch(function(){});


  /* ページの文（「ページの文」のタブ）
     場所ごとに、文字のあるところへ上から1・2・3…と番号をつける。
     スプシの「文」を書きかえると、そこの文字が変わる。空のときはそのまま。
     改行はセルの中の改行、《 》でかこむと色の字になる。 */
  var PLACES = [
    ["メニュー", "header.top", "nav a, .btn"],
    ["いちばん上", "#top", ".place, .hero-copy, .btn, .tag"],
    ["ニュース", "section.news", "h2 small, h2, p"],
    ["最新の活動", "#instagram", ".eyebrow, h2, .news-tabs button, .news-empty, .rec-more, .rec-foot"],
    ["大切にしていること", "#philosophy", "p, h2, .values .k, .values .v"],
    ["トレーニング", "#training", "p, h2, .en, h3"],
    ["活動日と場所", "#schedule", ".eyebrow, h2, tbody th, .legend > span, .fact > .k, .fact > .v, .fact > .s, .places dt, .places dd, .places small"],
    ["選手のレベル", "section[aria-labelledby=lv-h]", "p, h2"],
    ["料金", "#fee", "h2"],
    ["活動の様子", "#gallery", "p, h2, .btn"],
    ["無料体験", "#apply", ".eyebrow, h2, .lead, .steps li > span, .field > label, .field > .lab, button[type=submit], .hint, #apply-ok h3, #apply-ok p"],
    ["よくある質問", "#faq", "h2, dt, dd"],
    ["いちばん下", "footer", "b, .wrap > span"]
  ];
  function removable(n){
    if(n.nodeType===3) return true;
    if(n.nodeType!==1 || n.hasAttribute("data-k")) return false;
    if(n.tagName==="BR" || n.tagName==="EM") return true;
    return n.tagName==="SPAN" && (!n.className || n.className==="p");
  }
  function readText(el){
    var t="";
    el.childNodes.forEach(function(n){
      if(!removable(n)) return;
      if(n.nodeType===3) t+=/\n/.test(n.nodeValue)? n.nodeValue.replace(/\s*\n\s*/g,"") : n.nodeValue;
      else if(n.tagName==="BR") t+="\n";
      else if(n.tagName==="EM") t+="《"+readText(n)+"》";
      else t+=readText(n);
    });
    return t;
  }
  function writeText(el, text){
    var frag=document.createDocumentFragment();
    text.split(/\r?\n/).forEach(function(line, i){
      if(i) frag.appendChild(document.createElement("br"));
      line.split(/(《[^》]*》)/).forEach(function(seg){
        if(!seg) return;
        var box=frag;
        if(/^《.*》$/.test(seg)){ box=document.createElement("em"); frag.appendChild(box); seg=seg.slice(1,-1); }
        var tmp=document.createElement("span"); phr(tmp, seg);
        while(tmp.firstChild) box.appendChild(tmp.firstChild);
      });
    });
    var nodes=Array.prototype.filter.call(el.childNodes, removable);
    var first=nodes[0]||null;
    el.insertBefore(frag, first);
    nodes.forEach(function(n){ el.removeChild(n); });
  }
  function mark(){
    var out=[];
    PLACES.forEach(function(pl){
      var root=document.querySelector(pl[1]); if(!root) return;
      var n=0;
      root.querySelectorAll(pl[2]).forEach(function(el){
        if(el.closest("#rec")) return;
        n++; el.setAttribute("data-k", pl[0]+"-"+n);
      });
      root.querySelectorAll("[data-k^='"+pl[0]+"-']").forEach(function(el){
        out.push([pl[0], el.getAttribute("data-k").split("-").pop(), readText(el).trim()]);
      });
    });
    return out;
  }
  var marked = mark();
  window.EgoSheet.texts = function(){ return marked; };
  get("ページの文").then(function(rs){
    rs.forEach(function(r){
      var t=r["文"]; if(!t || !r["場所"] || !r["番号"]) return;
      var el=document.querySelector('[data-k="'+r["場所"]+"-"+r["番号"]+'"]');
      if(el && readText(el).trim()!==t) writeText(el, t);
    });
  }).catch(function(){});
})();
