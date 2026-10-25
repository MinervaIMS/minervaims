/*
 * Minerva Division Fit engine, extracted from Trial 10.
 * Deterministic, local-only logic. No network, AI, storage, or DOM dependencies.
 * Treat this as a reference implementation; version and test any changes.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MinervaFitEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
const DIVS=[
 {id:'ER',name:'Equity Research',short:'Equity',description:'You enjoy looking closely at a business, understanding what drives its results and checking whether its plans make sense.'},
 {id:'IR',name:'Investment Research',short:'Investment',description:'You enjoy bringing together news, data and different viewpoints to form an investment view across markets.'},
 {id:'MR',name:'Macro Research',short:'Macro',description:'You enjoy exploring how wider economic forces connect and why changes affect whole industries or countries.'},
 {id:'QR',name:'Quantitative Research',short:'Quantitative',description:'You enjoy building and testing models to understand patterns, measure uncertainty and explain results.'},
 {id:'MA',name:'Multi-Asset Global Opportunities Fund',short:'Multi-Asset Fund',description:'You enjoy deciding how to spread resources across different opportunities while managing risk.'},
 {id:'LS',name:'Long–Short Equity Fund',short:'Long–Short Fund',description:'You enjoy using consistent data-based measures to compare alternatives and identify stronger and weaker performers.'}
];
const IDS=DIVS.map(d=>d.id),NAME=Object.fromEntries(DIVS.map(d=>[d.id,d.name]));
const Q=[
 {id:'music',label:'Music',title:'A friend shares a playlist. Some new artists are suddenly everywhere, and music tastes keep changing. You wonder what comes next for the music industry. How would you explore it?',options:[
  {id:'music-er',tag:'ER',text:'Study one streaming company, looking at its customers, costs and plans to understand how its business might develop.'},
  {id:'music-ir',tag:'IR',text:'Bring together reports, news and data from several sources to form your own view of the industry.'},
  {id:'music-mr',tag:'MR',text:'Explore how technology, people’s spending and changing habits could affect the music industry over time.'},
  {id:'music-qr',tag:'QR',text:'Build and test a model using data on streams, releases and charts to look for possible trends.'},
  {id:'music-ls',tag:'LS',text:'Compare music labels using the same sales and growth measures to see how their performance differs.'}
 ]},
 {id:'f1',label:'Ferrari',title:'You are watching Formula 1 with friends. Ferrari is preparing for its next races, and everyone has a different idea. Which approach would you enjoy taking?',options:[
  {id:'f1-er',tag:'ER',text:'Study Ferrari’s current performance and development plans to understand how the team might improve.'},
  {id:'f1-ls',tag:'LS',text:'Compare Ferrari with rival teams using the same performance measures to assess their relative progress.'},
  {id:'f1-ir',tag:'IR',text:'Bring together race reports, team updates and data to form a view of Ferrari’s next races.'},
  {id:'f1-ma',tag:'MA',text:'Consider how Ferrari could divide its resources between improving speed, reliability and race strategy.'},
  {id:'f1-qr',tag:'QR',text:'Build and test a model using lap times, tyre wear and pit-stop data to explain performance.'}
 ]},
 {id:'espresso',label:'Espresso',title:'You stop for your usual espresso in Milan. It costs €1.50 instead of €1.20. You are curious about the change. How would you explore it?',options:[
  {id:'espresso-er',tag:'ER',text:'Study one café’s sales, costs and pricing decisions to understand what has changed for its business.'},
  {id:'espresso-ir',tag:'IR',text:'Bring together coffee-market reports, price data and different views to form your own outlook.'},
  {id:'espresso-mr',tag:'MR',text:'Explore how harvests, trade, wages and inflation interact to influence the price of coffee.'},
  {id:'espresso-qr',tag:'QR',text:'Build and test a model using price data to assess what might explain the increase.'},
  {id:'espresso-ma',tag:'MA',text:'Consider how a café could divide its budget between costs, quality and future growth.'},
  {id:'espresso-ls',tag:'LS',text:'Compare cafés using the same sales and cost measures to understand differences in performance.'}
 ]},
 {id:'hike',label:'Lake Como',title:'You and your friends want to enjoy a beautiful view over Lake Como. Several hiking routes look promising, and the forecast may change. How would you decide?',options:[
  {id:'hike-er',tag:'ER',text:'Study one hiking route in detail, checking its length, difficult sections and recent reviews.'},
  {id:'hike-ir',tag:'IR',text:'Bring together local advice, route guides and forecasts to form an overall view of the options.'},
  {id:'hike-mr',tag:'MR',text:'Explore how the weather, season and transport links affect access to different routes.'},
  {id:'hike-qr',tag:'QR',text:'Build and test a route-time model using distance, height climbed and past walking times.'},
  {id:'hike-ma',tag:'MA',text:'Balance views, time and safety to choose a route and prepare an alternative.'},
  {id:'hike-ls',tag:'LS',text:'Compare each route using the same distance, time and safety measures to rank the options.'}
 ]}
];
// Alternative wordings only: year never changes the tags, scores, questions or available paths.
const LEVEL={
 music:{
  second:{ER:'Look into a streaming company’s sales, costs and growth plans to understand its future.',IR:'Compare industry reports, market news and data to form your own outlook.',MR:'Study how income, streaming prices and technology change music demand across countries.',QR:'Build a simple model using streaming, release and chart data, and test whether it predicts trends.',LS:'Compare music labels on the same growth and sales measures, looking for stronger and weaker performers.'},
  advanced:{ER:'Analyse a streaming company’s revenue drivers, margins and strategy to assess its prospects.',IR:'Combine sector research, market news and data into a forward-looking investment view.',MR:'Examine how incomes, prices and technology interact to shape music demand across countries.',QR:'Model streaming and chart data, test predictive relationships and check how reliable they are.',LS:'Compare music businesses using consistent data to find relative leaders and laggards.'}
 },
 f1:{
  second:{ER:'Review Ferrari’s strengths, technical limits and development plans to assess its prospects.',LS:'Compare Ferrari and its rivals on the same performance measures to identify relative strengths and weaknesses.',IR:'Combine race reports, team news and performance data to form your own view on Ferrari’s next races.',MA:'Choose how to allocate Ferrari’s budget between upgrades, reliability and race strategy.',QR:'Model lap times, tyre wear and pit-stop data to test what drives race performance.'},
  advanced:{ER:'Assess Ferrari’s performance drivers and development strategy to judge its competitive outlook.',LS:'Rank Ferrari and rival teams with consistent performance signals, looking for relative over- and underperformance.',IR:'Combine team reports, race data and expert views to assess Ferrari’s outlook for the next races.',MA:'Allocate scarce resources between development, reliability and race decisions under uncertainty.',QR:'Build and validate a model of lap pace, tyre wear and pit-stop effects using race data.'}
 },
 espresso:{
  second:{ER:'Look at one café’s revenue, costs and pricing strategy to understand the change.',IR:'Bring together commodity news, price trends and market commentary to form an outlook.',MR:'Study how coffee supply, trade, wages and inflation affect prices across the economy.',QR:'Test how historical price data relate to supply, costs and other possible drivers.',MA:'Decide how a café should allocate its budget across stock, service and growth while managing risk.',LS:'Compare cafés on the same cost and sales measures to identify stronger and weaker performers.'},
  advanced:{ER:'Analyse a café’s unit economics, margins and pricing power to assess the rise.',IR:'Integrate commodity-market data, business news and different market views into an outlook.',MR:'Examine the links between crop supply, trade, wages and inflation in the price change.',QR:'Estimate and test a model of coffee prices using historical data and explanatory variables.',MA:'Allocate a café’s limited capital across stock, operations and growth under uncertainty.',LS:'Rank comparable cafés using systematic operating measures to find relative outperformers and underperformers.'}
 },
 hike:{
  second:{ER:'Research one route in depth, checking its length, difficult sections and reliability.',IR:'Combine local guidance, route comparisons and weather information into one overall view.',MR:'Consider how weather, seasonal factors and transport affect access to routes.',QR:'Estimate walking times using distance, elevation and past trip data, then check the estimates.',MA:'Choose a route and backup by balancing safety, time and what the group values most.',LS:'Apply a consistent scoring system to compare routes and rank the strongest and weakest.'},
  advanced:{ER:'Evaluate one trail in depth, checking its constraints, quality and practical outlook.',IR:'Synthesize route information, expert advice and forecasts into a well-supported view.',MR:'Examine how weather systems, seasons and access constraints interact across the area.',QR:'Build and validate a route-time model using elevation, distance and historical walking data.',MA:'Select and adapt a route plan by balancing objectives, uncertainty and limited time.',LS:'Rank routes using comparable risk-adjusted measures to identify relative winners and losers.'}
 }
};
const TOPICS={
 first:{ER:'Why some companies grow faster than others',IR:'Why stock, bond and currency prices change',MR:'Why inflation and interest rates change',QR:'How data can help explain market patterns',MA:'How to combine investments without taking too much risk',LS:'Why some company shares perform better than others'},
 second:{ER:'Company results, valuations and growth',IR:'Market trends across shares, bonds and currencies',MR:'Economic growth, interest rates and inflation',QR:'Statistics and models applied to markets',MA:'Investment choices, portfolio allocation and risk',LS:'Comparing stocks using common performance measures'},
 advanced:{ER:'Company fundamentals, cash flows and equity valuation',IR:'Cross-asset market outlooks and investment ideas',MR:'Monetary policy, economic cycles and structural changes',QR:'Statistical inference, modelling and market forecasting',MA:'Asset allocation, diversification and portfolio risk',LS:'Factor signals, relative stock returns and long–short strategies'}
};
const CLASSES={
 first:{ER:'How businesses work',IR:'Introduction to financial markets',MR:'How the economy works',QR:'Mathematics and statistics',MA:'Making decisions with limited resources',LS:'Data analysis and comparisons'},
 second:{ER:'Accounting and business strategy',IR:'Financial markets and international finance',MR:'Macroeconomics and economic policy',QR:'Statistics and programming',MA:'Investments and risk management',LS:'Data analysis and quantitative methods'},
 advanced:{ER:'Financial statement analysis and valuation',IR:'Capital markets and investment strategy',MR:'Advanced macroeconomics and policy',QR:'Econometrics and mathematical modelling',MA:'Portfolio theory and asset allocation',LS:'Factor investing and applied programming'}
};
function reasonText(qid,opt,year='first'){return LEVEL[qid]?.[year]?.[opt.tag]||opt.text;}
function topicText(id,year='first'){return TOPICS[year]?.[id]||TOPICS.first[id];}
function classText(id,year='first'){return CLASSES[year]?.[id]||CLASSES.first[id];}
// Symmetric, small overlap bonuses. A method never inherits a full answer from another.
// Direct-method evidence: no related division gets bonus points.
const RELATED={ER:{},IR:{},MR:{},QR:{},MA:{},LS:{}};
const CORE=3,CLARIFIER_MAX=3.6;
function blank(){return Object.fromEntries(IDS.map(id=>[id,0]));}
function stableHash(s){let h=2166136261;for(const c of s){h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;}h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;h=Math.imul(h,0x846ca68b)>>>0;return (h^(h>>>16))>>>0;}
function rank(scores,support,seed=''){
 // Resolve exact ties reproducibly from the answer path, never from division list order.
 return [...IDS].sort((a,b)=>scores[b]-scores[a]||support[b]-support[a]||stableHash(seed+'|'+a)-stableHash(seed+'|'+b));
}
function option(qid,id){return Q.find(q=>q.id===qid)?.options.find(o=>o.id===id)||null;}
function coreResult(answers){
 const scores=blank(),support=blank(),selected=[];
 for(const q of Q){const o=option(q.id,answers[q.id]);if(!o)continue;
  scores[o.tag]+=CORE;support[o.tag]++;
  for(const [id,w] of Object.entries(RELATED[o.tag]||{}))scores[id]+=w;
  selected.push({qid:q.id,option:o.id,tag:o.tag});
 }
 return {scores,support,selected,ranking:rank(scores,support,selected.map(x=>x.option).join('/'))};
}
function adaptiveOptions(qid,answers){
 const q=Q.find(x=>x.id===qid);if(!q)return [];
 if(qid==='music'||qid==='f1')return q.options;
 const i=Q.findIndex(x=>x.id===qid),prior={};
 for(let j=0;j<i;j++)if(answers[Q[j].id])prior[Q[j].id]=answers[Q[j].id];
 const r=coreResult(prior);
 if(qid==='espresso'){
  // The first two questions expose MR and MA once each, while ER, IR, QR,
  // and LS appear twice. Keep both under-exposed methods available.
  // Omit only one of the methods already offered twice; avoid excluding
  // a direct preference expressed in either earlier answer wherever possible.
  const base=['ER','IR','QR','LS'];
  const notSelected=base.filter(id=>r.support[id]===0);
  const choices=notSelected.length?notSelected:base;
  const key=[prior.music||'',prior.f1||''].join('|');
  const hash=[...key].reduce((h,c)=>(h*31+c.charCodeAt(0))>>>0,17);
  const omitted=choices[hash%choices.length];
  return IDS.filter(id=>id!==omitted).map(id=>q.options.find(o=>o.tag===id));
 }
 // Targeted follow-up: compare the competing methods, not a random new method.
 const nonzero=IDS.filter(id=>r.support[id]>0);
 const path=r.selected.map(x=>x.option).join('/');
 const ordered=nonzero.sort((a,b)=>r.support[b]-r.support[a]||stableHash('tie|'+path+'|'+a)-stableHash('tie|'+path+'|'+b));
 let tags;
 if(nonzero.length===3){
   // A three-way split: put all three competing methods on equal footing.
   tags=ordered.slice();
 }else if(nonzero.length===2){
   // A 2+1 split: compare both observed styles against a new, contrasting style.
   const unseen=IDS.filter(x=>!nonzero.includes(x));
   unseen.sort((a,b)=>stableHash('contrast|'+path+'|'+a)-stableHash('contrast|'+path+'|'+b));
   tags=[...ordered,unseen[0]];
 }else{
   // One repeated method: include it and two independent alternatives.
   const unseen=IDS.filter(x=>!nonzero.includes(x));
   unseen.sort((a,b)=>stableHash('explore|'+path+'|'+a)-stableHash('explore|'+path+'|'+b));
   tags=[ordered[0],unseen[0],unseen[1]];
 }
 return tags.map(t=>q.options.find(o=>o.tag===t));
}
function needsFourth(answers){
 const r=coreResult(answers);if(r.selected.length!==3)return false;
 // Ask when there is no independent second signal, when all three differ,
 // or when the third response breaks two earlier identical responses.
 // This keeps the fourth question optional but tests the most unstable paths.
 const n=IDS.filter(id=>r.support[id]>0).length;
 if(n!==2)return true;
 return r.selected[0].tag===r.selected[1].tag && r.selected[2].tag!==r.selected[1].tag;
}
function profileShortlist(answers){return coreResult(answers).ranking.slice(0,4);}
function clarifierOptions(kind,answers,topic=null){
 const four=profileShortlist(answers);
 if(kind==='topic')return four.slice(0,3);
 // The class options respond to the topic choice. The fourth candidate is always included.
 // The candidate selected in the topic question remains available for confirmation.
 if(topic&&four.slice(0,3).includes(topic)){
   const other=four.slice(0,3).filter(x=>x!==topic);
   return [topic,other[0],four[3]];
 }
 return [four[0],four[2],four[3]];
}
function finish(answers,topic=null,classes=null){
 const core=coreResult(answers),four=profileShortlist(answers),scores={...core.scores};
 const ts=clarifierOptions('topic',answers),cs=clarifierOptions('classes',answers,topic);
 const validTopic=ts.includes(topic),validClass=cs.includes(classes);
 if(validTopic)scores[topic]+=1.55;
 if(validClass)scores[classes]+=1.55;
 if(validTopic&&validClass&&topic===classes)scores[topic]+=.50;
 const seed=core.selected.map(x=>x.option).join('/')+'|'+topic+'|'+classes;
 const byScore=four.slice().sort((a,b)=>scores[b]-scores[a]||core.support[b]-core.support[a]||stableHash(seed+'|'+a)-stableHash(seed+'|'+b));
 const first=byScore[0];
 // Distinct, independently observed evidence is more important for the
 // SECOND choice than its residual rank. This does not assign a preferred
 // second division and never introduces an outcome outside the top four.
 function strength(id){
   const direct=core.support[id];
   const clar=Number(validTopic&&topic===id)+Number(validClass&&classes===id);
   // Strong = supported by more than one everyday answer, or by an everyday
   // answer PLUS one distinct clarification. Moderate = one everyday answer
   // or both separate clarifications. Weak = only one clarification/no evidence.
   if(direct>=2||(direct>=1&&clar>=1))return 3;
   if(direct>=1||clar===2)return 2;
   if(clar===1)return 1;
   return 0;
 }
 const runners=four.filter(id=>id!==first).sort((a,b)=>strength(b)-strength(a)||scores[b]-scores[a]||core.support[b]-core.support[a]||stableHash(seed+'|second|'+a)-stableHash(seed+'|second|'+b));
 const candidate=runners[0];
 // Trial 10: minimum defensible evidence, not a perfect second match.
 // At least one everyday reasoning answer must support the second destination.
 // A clarification-only candidate is never sufficient, even if both match.
 const second=core.support[candidate]>=1&&strength(candidate)>=2?candidate:null;
 const secondStrength=second?(strength(candidate)>=3?'Supported':'Worth exploring'):null;
 const after=[first,...(second?[second]:[]),...four.filter(id=>id!==first&&id!==second).sort((a,b)=>scores[b]-scores[a]||stableHash(seed+'|'+a)-stableHash(seed+'|'+b))];
 const allDistinct=core.selected.length===4&&Math.max(...Object.values(core.support))===1;
 const firstTwo=core.selected.slice(0,2).map(x=>x.tag);
 const uncertain=allDistinct&&validTopic&&validClass&&topic!==classes&&
   !firstTwo.includes(topic)&&!firstTwo.includes(classes)&&
   core.support[first]===1&&(scores[byScore[0]]-scores[byScore[1]]<.15);
 const tags3=core.selected.slice(0,3).map(x=>x.tag);
 const conflicting=core.selected.length===4&&new Set(tags3).size===3&&
   core.selected[3].tag===tags3[0]&&validTopic&&validClass&&topic===classes&&
   topic!==tags3[0]&&core.support[topic]===1;
 const noMatch=core.selected.length<3||uncertain||conflicting;
 return {before:four,after,first:noMatch?null:first,second:noMatch?null:second,secondStrength:noMatch?null:secondStrength,
   secondEvidence:(!noMatch&&second)?{direct:core.support[second],topic:validTopic&&topic===second,classes:validClass&&classes===second}:null,
   secondOmitted:!noMatch&&!second,secondCandidate:(!noMatch&&!second)?candidate:null,
   noMatch,scores,coreScores:core.scores,support:core.support,shortlist:four,
   topic:validTopic?topic:null,classes:validClass?classes:null,
   firstChanged:!noMatch&&four[0]!==first,secondChanged:!noMatch&&second!==null&&four[1]!==second,
   anyChange:four[0]!==first||(second!==null&&four[1]!==second),allDistinct};
}
function enumerate(){
 const all=[];
 for(const a of adaptiveOptions('music',{}))for(const b of adaptiveOptions('f1',{})){
  const base={music:a.id,f1:b.id};
  for(const c of adaptiveOptions('espresso',base)){
   const a3={...base,espresso:c.id};
   if(needsFourth(a3))for(const d of adaptiveOptions('hike',a3))all.push({...a3,hike:d.id});
   else all.push(a3);
  }
 }
 return all;
}
function audit(){
 const paths=enumerate(),counts=Object.fromEntries([...IDS,'none'].map(id=>[id,0]));
 const reachableFirst=Object.fromEntries(IDS.map(id=>[id,false])),reachableSecond={...reachableFirst};
 const witnessFirst={},witnessSecond={};let changedFirst=0,changedSecond=0,none=0,fullPaths=0,valid=true;
 const afterFirstChoice={};
 for(const m of Q[0].options){afterFirstChoice[m.tag]=Object.fromEntries(IDS.map(id=>[id,false]));}
 for(const a of paths){
  const ts=clarifierOptions('topic',a),f=profileShortlist(a);
  if(ts.length!==3||new Set(ts).size!==3)valid=false;
  for(const t of ts){
   const cs=clarifierOptions('classes',a,t);
   if(cs.length!==3||new Set(cs).size!==3||new Set([...ts,...cs]).size!==4)valid=false;
   for(const c of cs){
    const r=finish(a,t,c);fullPaths++;
    counts[r.first||'none']++;
    if(r.firstChanged&&!r.noMatch)changedFirst++;
    if(r.secondChanged&&!r.noMatch)changedSecond++;
    if(r.noMatch)none++;
    if(r.first){reachableFirst[r.first]=true;witnessFirst[r.first]??={answers:a,topic:t,classes:c};
     const m=option('music',a.music).tag;afterFirstChoice[m][r.first]=true;}
    if(r.second){reachableSecond[r.second]=true;witnessSecond[r.second]??={answers:a,topic:t,classes:c};}
   }
  }
 }
 return {paths:paths.length,fullPaths,counts,none,noneRate:none/fullPaths,changedFirst,changedSecond,optsValid:valid,reachableFirst,reachableSecond,witnessFirst,witnessSecond,afterFirstChoice,yearInvariant:true,allReasoningChoicesLengths:Q[0].options.length===5&&Q[1].options.length===5&&paths.every(a=>adaptiveOptions('espresso',a).length===5)};
}

const YEAR_LABELS={first:'First year',second:'Second year',advanced:'Third year / Master’s'};
function getReasoningQuestion(qid, answers={}, year='first') {
  const q=Q.find(item=>item.id===qid);
  if(!q) return null;
  return {...q, options:adaptiveOptions(qid,answers).map(o=>({...o,text:reasonText(qid,o,year)}))};
}
function getTopicOptions(answers={}, year='first') {
  return clarifierOptions('topic',answers).map(id=>({id,text:topicText(id,year)}));
}
function getClassOptions(answers={}, topic=null, year='first') {
  return clarifierOptions('classes',answers,topic).map(id=>({id,text:classText(id,year)}));
}
function validateAnswers(answers={}, topic=null, classes=null) {
  const missing=[];
  for(const id of ['music','f1','espresso']) if(!answers[id]) missing.push(id);
  const fourthRequired=Object.keys(answers).includes('music') && Object.keys(answers).includes('f1') && Object.keys(answers).includes('espresso') && needsFourth(answers);
  if(fourthRequired&&!answers.hike) missing.push('hike');
  if(!topic) missing.push('topic');
  if(!classes) missing.push('classes');
  return {valid:missing.length===0,missing,fourthRequired};
}
function calculateResult(answers={}, topic=null, classes=null) {
  const validation=validateAnswers(answers,topic,classes);
  if(!validation.valid) return {valid:false,missing:validation.missing,fourthRequired:validation.fourthRequired};
  return {valid:true,...finish(answers,topic,classes)};
}
return {
  version:'Trial 10 / engine_v11',
  DIVISIONS:DIVS,
  IDS,
  QUESTION_BANK:Q,
  YEAR_LABELS,
  CORE_POINTS:CORE,
  CLARIFIER_MAX,
  getReasoningQuestion,
  needsFourth,
  getTopicOptions,
  getClassOptions,
  validateAnswers,
  calculateResult,
  coreResult,
  profileShortlist,
  adaptiveOptions,
  clarifierOptions,
  enumerate,
  audit
};
});
