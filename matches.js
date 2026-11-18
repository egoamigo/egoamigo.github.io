/* 試合・トレマの記録
   インスタの投稿の文から「いつ・だれと・どのカテゴリー・結果」を読み取って並べる。
   - matches.json（インスタから読み取った記録）を読む
   - FEED_URL（Behold のフィード）があれば、新しい投稿もその場で読み取って足す
   読み取りのきまり：
   - 「🆚 チーム名」の行 → 対戦相手（なければ「〇〇さんとのトレーニングマッチ」）
   - 「トレーニングマッチ・トレマ・練習試合・交流戦」→ トレマ／1行目に「大会・杯・カップ・リーグ」→ 大会
   - 「U10」「U-11」→ カテゴリー
   - 「優勝・準優勝・3位・ベスト8」「3-1」などがあれば結果として出す
   - 相手のわからないトレマ（「明日のトレマ」など）は入れない */
(function(root){
  function clean(s){
    return s.replace(/[\s　]+/g," ").replace(/(さん|様)$/,"").trim();
  }
  function cats(text){
    var out=[], re=/U[-‐－]?\s?([0-9]{1,2})/gi, m;
    while((m=re.exec(text))){ var c="U"+m[1]; if(out.indexOf(c)<0) out.push(c); }
    return out;
  }
  function parse(cap, date, link){
    if(!cap) return null;
    var ls=cap.split(/\n/).map(function(s){return s.trim()}).filter(Boolean);
    var first=(ls[0]||"").replace(/#\S+/g,"").trim();
    var opp=[], oc=[];
    ls.forEach(function(l){
      var m=l.match(/^🆚\s*(.+)$/);
      if(m){
        var n=clean(m[1]); var c=cats(n);
        n=clean(n.replace(/U[-‐－]?\s?[0-9]{1,2}/gi,""));
        if(n) opp.push(n); oc=oc.concat(c);
      }
    });
    if(!opp.length){
      var m2=first.match(/^(.{2,20}?)(?:さん|様)?との(?:トレーニングマッチ|トレマ|練習試合)/);
      if(m2) opp.push(clean(m2[1]));
    }
    /* 大会：1行目が短く、大会・杯・カップ・リーグの名前になっているとき */
    var isCup=first.length<=30 && /(大会|杯|カップ|リーグ|CUP|Cup)/.test(first);
    var isTM=/トレーニングマッチ|トレマ|練習試合|交流戦/.test(cap) || opp.length>0;
    if(!isCup && !(isTM && opp.length)) return null;
    /* カテゴリー：「普段は」「来週」「予定」などの文は見ない */
    var ss=cap.split(/[。！!、\n]/).filter(function(x){ return !/普段|いつも|来週|次回|今後|予定|これから/.test(x); }).join("。");
    var c=cats(ss); oc.forEach(function(x){ if(c.indexOf(x)<0) c.push(x); });
    c.sort(function(a,b){ return parseInt(b.slice(1))-parseInt(a.slice(1)); });
    if(!c.length){
      var g, gr=/([1-6１-６](?:・[1-6１-６])+)年生/g;
      while((g=gr.exec(ss))){ var t=g[1]+"年"; if(c.indexOf(t)<0) c.push(t); }
    }
    var res="", m3=cap.match(/初優勝|準優勝|優勝|第?[0-9０-９]+位|ベスト[0-9０-９]+/);
    if(m3) res=m3[0];
    var sc=cap.match(/([0-9０-９]{1,2})\s*[-－−ー対]\s*([0-9０-９]{1,2})\s*(?:で)?\s*(勝|負|引き分け|分)/);
    var score = sc ? sc[1]+"-"+sc[2] : "";
    /* ひとこと：できたこと（ゴール・優勝など）を書いた短い文だけ */
    var hl="";
    for(var i=0;i<ls.length;i++){
      var l=ls[i].replace(/#\S+/g,"").trim();
      if(/[？?]|もっと/.test(l) || l.length>46 || l.length<8) continue;
      if(/ゴールが生まれ|全員がゴール|ゴールを(決め|奪うことができ)|得点|優勝を|PKを止め|決勝点を|勝利|勝ち切|勝ちました/.test(l)){ hl=l.replace(/[👏🎊🏆⚽️✨]+/gu,"").trim(); break; }
    }
    return {
      date: date,
      type: isCup ? "大会" : (/平日/.test(first) ? "平日トレマ" : "トレマ"),
      title: isCup ? first.replace(/^[^\p{L}\p{N}]+/u,"") : "",
      opponents: opp,
      cats: c,
      result: res,
      score: score,
      note: hl,
      link: link
    };
  }
  root.EgoMatches = { parse: parse };
  if(typeof module!=="undefined") module.exports = root.EgoMatches;
})(typeof window!=="undefined" ? window : globalThis);

/* ページに並べる */
(function(){
  if(typeof document==="undefined") return;
  var FEED_URL = "";   /* Behold のフィードのURL（チームのインスタをつないだら入れる） */
  var SHOW = 5;
  var box=document.getElementById("rec"); if(!box) return;
  var sum=document.getElementById("rec-sum"), more=document.getElementById("rec-more");
  var W="日月火水木金土";
  function el(t,c,x){ var e=document.createElement(t); if(c) e.className=c; if(x!=null) e.textContent=x; return e; }
  function draw(items){
    items.sort(function(a,b){ return a.date<b.date?1:a.date>b.date?-1:0; });
    box.textContent="";
    items.forEach(function(m,i){
      var d=new Date(m.date+"T00:00:00+09:00");
      var li=el("li", "rec-item"+(m.type==="大会"?" cup":"")); if(i>=SHOW) li.hidden=true;
      var a=el("a"); a.href=m.link||"https://www.instagram.com/egoamigo2026/"; a.target="_blank"; a.rel="noopener";
      var dt=el("time","rec-date"); dt.dateTime=m.date;
      dt.appendChild(el("span","md",(d.getMonth()+1)+"."+String(d.getDate()).padStart(2,"0")));
      dt.appendChild(el("span","wd",W[d.getDay()]));
      var body=el("div","rec-body");
      var top=el("div","rec-top");
      top.appendChild(el("span","rec-type",m.type));
      if(m.result){ top.appendChild(el("span","rec-win",(m.result.indexOf("優勝")>=0?"🏆 ":"")+m.result)); }
      (m.cats||[]).forEach(function(c){ top.appendChild(el("span","rec-cat",c)); });
      body.appendChild(top);
      var vs=el("div","rec-vs");
      if(m.type==="大会"){ vs.textContent=m.title; }
      else { vs.appendChild(el("span","v","vs")); vs.appendChild(document.createTextNode(m.opponents.join("・"))); }
      body.appendChild(vs);
      if(m.note) body.appendChild(el("div","rec-note",m.note));
      var r=el("div","rec-res");
      if(m.score){ r.appendChild(el("span","score",m.score)); }
      a.appendChild(dt); a.appendChild(body); a.appendChild(r);
      li.appendChild(a); box.appendChild(li);
    });
    if(sum){
      var now=items.length?items[0].date.slice(0,7):"";
      var mon=items.filter(function(m){return m.date.slice(0,7)===now});
      var tm=mon.filter(function(m){return m.type!=="大会"}).length, cup=mon.length-tm;
      var wins=mon.filter(function(m){return /優勝/.test(m.result)}).length;
      sum.textContent = now ? (parseInt(now.slice(5))+"月は トレマ "+tm+"試合"+(cup?"・大会 "+cup+"回":"")+(wins?"（優勝 "+wins+"回）":"")) : "";
    }
    if(more){
      more.hidden = items.length<=SHOW;
      more.onclick=function(){ box.querySelectorAll("li[hidden]").forEach(function(li){li.hidden=false}); more.hidden=true; };
    }
  }
  var base=[];
  fetch("matches.json",{cache:"no-cache"}).then(function(r){return r.json()}).then(function(d){
    base=d.matches||[]; draw(base.slice());
    if(!FEED_URL) return;
    return fetch(FEED_URL).then(function(r){return r.json()}).then(function(f){
      var posts=Array.isArray(f)?f:(f.posts||[]);
      var have={}; base.forEach(function(m){ if(m.link) have[m.link.replace(/\/$/,"")]=1; });
      var add=[];
      posts.forEach(function(p){
        var link=(p.permalink||"").replace(/\/$/,"");
        if(have[link]) return;
        var day=new Date(new Date(p.timestamp).getTime()+9*3600e3).toISOString().slice(0,10);
        var m=window.EgoMatches.parse(p.caption||"",day,p.permalink);
        if(m) add.push(m);
      });
      if(add.length) draw(base.concat(add));
    });
  }).catch(function(){});
})();
