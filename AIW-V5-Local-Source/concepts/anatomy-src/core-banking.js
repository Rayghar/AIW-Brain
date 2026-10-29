// Illustrative core-banking model for the Anatomy concept.
// Hypothetical structure only: it is NOT the recorded SEABaaS architecture. It exists to show
// how AIW could dissect a larger system; every name here is generic.
(function(){
const objects=[],rels=[];
const o=(type,id,title,extra={})=>{objects.push({id,ref:extra.ref||id,type,title,description:extra.d||'',owner:extra.owner||'',modules:extra.m?[extra.m]:[],...extra});return id;};
const r=(type,from,to,label='',extra={})=>rels.push({type,from,to,label,...extra});

// Modules (body segments) and external participants
const M=[
 ['M-CH','Digital channels','Mobile and web banking journeys for customers.'],
 ['M-CU','Customer & onboarding','Party master data and verified identity.'],
 ['M-AC','Accounts & deposits','Account lifecycle, balances, holds and interest.'],
 ['M-LN','Lending','Origination, repayment schedules and collections.'],
 ['M-PY','Payments','Payment orders, duplicate protection and interbank clearing.'],
 ['M-GL','General ledger','Double-entry posting and daily close.'],
 ['M-RC','Risk & compliance','Fraud screening, AML monitoring and regulatory reporting.'],
 ['M-NT','Notifications','Customer messages and repayment reminders.']
];
for(const [id,t,d] of M)o('module',id,t,{d,m:id});
o('party','X-DEV','Customer devices',{d:'Mobile app and browser used by the customer.'});
o('party','X-IDV','Identity verification provider',{d:'External identity document and liveness checks.'});
o('party','X-BUR','Credit bureau',{d:'External credit history and scores.'});
o('party','X-NET','Interbank payment network',{d:'External clearing and settlement network.'});
o('party','X-MSG','SMS & email provider',{d:'External message delivery service.'});

// Logical application: responsibilities
const LR=[
 ['LR-01','Customer journeys','M-CH','Sessions, navigation and consent for mobile and web.'],
 ['LR-02','Transfer initiation','M-CH','Capture and confirm a customer transfer.'],
 ['LR-03','Statements & balances view','M-CH','Show balances, holds and statements.'],
 ['LR-04','Customer profile','M-CU','Authoritative party record and contact preferences.'],
 ['LR-05','Identity verification','M-CU','Verify identity before an account can be opened.'],
 ['LR-06','Account lifecycle','M-AC','Open, change, freeze and close accounts.'],
 ['LR-07','Balance & holds','M-AC','Available balance, reservations and holds.'],
 ['LR-08','Interest accrual','M-AC','Accrue and capitalise interest daily.'],
 ['LR-09','Loan origination','M-LN','Assess, approve and disburse loans.'],
 ['LR-10','Repayment schedule','M-LN','Maintain each loan’s schedule of instalments.'],
 ['LR-11','Collections & arrears','M-LN','Collect instalments and manage arrears.'],
 ['LR-12','Payment order handling','M-PY','Accept, validate and track payment orders.'],
 ['LR-13','Duplicate protection','M-PY','Guarantee one financial effect per payment reference.'],
 ['LR-14','Interbank clearing','M-PY','Submit, enquire and reconcile with the network.'],
 ['LR-15','Double-entry posting','M-GL','Post balanced entries to the ledger.'],
 ['LR-16','End-of-day close','M-GL','Close the books and produce trial balances.'],
 ['LR-17','Fraud screening','M-RC','Score payments before release.'],
 ['LR-18','AML monitoring','M-RC','Detect suspicious patterns and open cases.'],
 ['LR-19','Regulatory reporting','M-RC','Produce statutory returns.'],
 ['LR-20','Customer notifications','M-NT','Send transactional messages.'],
 ['LR-21','Repayment reminders','M-NT','Remind borrowers before an instalment is due.']
];
for(const [id,t,m,d] of LR){o('responsibility',id,t,{m,d});r('memberOf',id,m);}

// Application realization: components
const APP=[
 ['APP-01','Mobile backend (BFF)','M-CH','Digital team',['LR-01','LR-02']],
 ['APP-02','Web banking portal','M-CH','Digital team',['LR-03']],
 ['APP-03','Customer service','M-CU','Customer team',['LR-04']],
 ['APP-04','Onboarding service','M-CU','Customer team',['LR-05']],
 ['APP-05','Account service','M-AC','Deposits team',['LR-06','LR-07']],
 ['APP-06','Interest batch','M-AC','Deposits team',['LR-08']],
 ['APP-07','Loan origination service','M-LN','Lending team',['LR-09']],
 ['APP-08','Loan servicing engine','M-LN','Lending team',['LR-10','LR-11']],
 ['APP-09','Payment hub','M-PY','Payments team',['LR-12','LR-13']],
 ['APP-10','Clearing gateway','M-PY','Payments team',['LR-14']],
 ['APP-11','Posting engine','M-GL','Finance systems',['LR-15']],
 ['APP-12','End-of-day batch','M-GL','Finance systems',['LR-16']],
 ['APP-13','Fraud engine','M-RC','Risk technology',['LR-17']],
 ['APP-14','AML case manager','M-RC','Risk technology',['LR-18']],
 ['APP-15','Notification service','M-NT','Engagement team',['LR-20','LR-21']]
];
for(const [id,t,m,owner,lrs] of APP){o('component',id,t,{m,owner});for(const l of lrs)r('realizedBy',l,id);}
// LR-19 Regulatory reporting is deliberately left unrealized: a visible gap.

// Logical technology: capabilities, and their technology realization
const TC=[
 ['TC-01','Container runtime','Run services with isolation, restart and scaling.','TR-01','Managed Kubernetes',true],
 ['TC-02','Relational store','Transactional, authoritative records.','TR-02','PostgreSQL HA cluster',true],
 ['TC-03','Event streaming','Durable, ordered event distribution.','TR-03','Kafka cluster',true],
 ['TC-04','API gateway','Edge routing, throttling and token checks.','TR-04','',false],
 ['TC-05','Identity & access','Customer and service identity, tokens.','TR-05','OIDC identity provider',true],
 ['TC-06','Batch scheduling','Calendar-driven jobs with restart points.','TR-06','',false],
 ['TC-07','Secrets & keys','Key custody, signing and encryption keys.','TR-07','HSM-backed key vault',true],
 ['TC-08','Observability','Traces, metrics, logs and alerts.','TR-08','OpenTelemetry + metrics stack',true],
 ['TC-09','Document store','Immutable storage for identity evidence.','TR-09','Object storage (WORM)',true],
 ['TC-10','Cache','Disposable low-latency reads.',null,null,false],
 ['TC-11','Message delivery','Hand messages to external carriers.','TR-11','External provider adapter',true]
];
const options={'TR-04':['Managed API gateway','Self-hosted gateway'],'TR-06':['Workflow scheduler','Cron on cluster'],'TR-01':['Managed Kubernetes','Virtual machines'],'TR-02':['PostgreSQL HA cluster','Commercial RDBMS'],'TR-03':['Kafka cluster','Managed streaming']};
for(const [id,t,d,tr,product,chosen] of TC){
 o('capability',id,t,{d,owner:'Platform architecture'});
 if(tr){o('technology',tr,t+' realization',{owner:'Platform engineering',product:chosen?product:'',d:chosen?'Selected: '+product:'No product selected yet.'});r('implementedBy',id,tr);
  for(const [i,opt] of (options[tr]||[]).entries()){const oid=tr+'/opt-'+i;o('option',oid,opt,{product:opt});r('considers',tr,oid);}}
}
const needs={
 'APP-01':['TC-01','TC-04','TC-05','TC-08','TC-10'],'APP-02':['TC-01','TC-04','TC-05','TC-08'],
 'APP-03':['TC-01','TC-02','TC-03','TC-07','TC-08'],'APP-04':['TC-01','TC-02','TC-09','TC-08'],
 'APP-05':['TC-01','TC-02','TC-03','TC-07','TC-08'],'APP-06':['TC-06','TC-02'],
 'APP-07':['TC-01','TC-02','TC-08'],'APP-08':['TC-01','TC-02','TC-03','TC-06','TC-08'],
 'APP-09':['TC-01','TC-02','TC-03','TC-07','TC-08'],'APP-10':['TC-01','TC-03','TC-07','TC-08'],
 'APP-11':['TC-01','TC-02','TC-03','TC-07','TC-08'],'APP-12':['TC-06','TC-02'],
 'APP-13':['TC-01','TC-03','TC-10','TC-08'],'APP-14':['TC-01','TC-02','TC-03'],
 'APP-15':['TC-01','TC-03','TC-11','TC-08']
};
for(const [a,cs] of Object.entries(needs))for(const c of cs)r('requires',a,c);

// Runtime: zones, operating plans and placements
o('zone','Z-APP','Primary site · application zone');o('zone','Z-DATA','Primary site · data zone');o('zone','Z-DR','Recovery site');
const plan=(id,title,asset,minReady,max,places)=>{o('runtime',id,title,{asset,minReady,maxReplicas:max});r('operatedAs',asset,id);places.forEach(([z,n],i)=>{const pid=id+'/pl-'+i;o('instance',pid,title+' · '+(z==='Z-DR'?'standby':'active'),{replicas:n,zone:z,role:z==='Z-DR'?'standby':'active'});r('placedAs',id,pid);r('locatedIn',pid,z);});};
plan('RUN-01','Mobile backend','APP-01',2,6,[['Z-APP',3],['Z-DR',1]]);
plan('RUN-02','Web portal','APP-02',2,4,[['Z-APP',2]]);
plan('RUN-03','Customer service','APP-03',2,4,[['Z-APP',2],['Z-DR',1]]);
plan('RUN-04','Onboarding service','APP-04',1,3,[['Z-APP',1]]);
plan('RUN-05','Account service','APP-05',3,8,[['Z-APP',3],['Z-DR',2]]);
plan('RUN-06','Interest batch','APP-06',1,1,[['Z-APP',1]]);
plan('RUN-07','Loan origination','APP-07',1,3,[['Z-APP',2]]);
plan('RUN-08','Loan servicing','APP-08',2,4,[['Z-APP',2],['Z-DR',1]]);
plan('RUN-09','Payment hub','APP-09',3,10,[['Z-APP',4],['Z-DR',2]]);
plan('RUN-10','Clearing gateway','APP-10',2,4,[['Z-APP',2],['Z-DR',1]]);
plan('RUN-11','Posting engine','APP-11',3,6,[['Z-APP',3],['Z-DR',2]]);
plan('RUN-12','End-of-day batch','APP-12',1,1,[['Z-APP',1]]);
plan('RUN-13','Fraud engine','APP-13',2,6,[['Z-APP',2]]);
plan('RUN-14','AML case manager','APP-14',1,2,[]);
plan('RUN-15','Notification service','APP-15',2,4,[['Z-APP',2],['Z-DR',1]]);
plan('RUN-21','Kubernetes clusters','TR-01',2,2,[['Z-APP',1],['Z-DR',1]]);
plan('RUN-22','PostgreSQL primary + replica','TR-02',1,2,[['Z-DATA',1],['Z-DR',1]]);
plan('RUN-23','Kafka brokers','TR-03',3,3,[['Z-DATA',3]]);
plan('RUN-25','Identity provider','TR-05',2,2,[['Z-APP',2]]);
plan('RUN-27','Key vault','TR-07',2,2,[['Z-DATA',1],['Z-DR',1]]);
plan('RUN-28','Observability stack','TR-08',1,1,[['Z-APP',1]]);
plan('RUN-29','Object storage','TR-09',1,1,[['Z-DATA',1]]);

// Interfaces & data: contracts on interactions, data authority and exchange
const D=[['DAT-01','Customer','APP-03','Confidential'],['DAT-02','Account & balance','APP-05','Confidential'],['DAT-03','Loan & schedule','APP-08','Confidential'],['DAT-04','Payment order','APP-09','Confidential'],['DAT-05','Ledger entry','APP-11','Restricted'],['DAT-06','Identity evidence','APP-04','Restricted'],['DAT-07','Notification','APP-15','Internal'],['DAT-08','Fraud decision','APP-13','Confidential']];
for(const [id,t,auth,cls] of D){o('data',id,t,{authority:auth,classification:cls});r('owns',auth,id);}
let n=0;
const call=(from,to,title,style,policy,data=[])=>{const id='IF-'+String(++n).padStart(2,'0');o('contract',id,title,{style,timeout:policy.t||'',retry:policy.r||'',failure:policy.f||'',idempotency:policy.i||''});r('provides',to,id);r('uses',from,id);r('interaction',from,to,title);for(const d of data)r('exchanges',id,d);return id;};
call('X-DEV','APP-01','Mobile banking API','request',{t:'3 s',r:'Client retry with same key',f:'Show pending, never double-submit',i:'Idempotency key per transfer'},['DAT-04','DAT-02']);
call('X-DEV','APP-02','Web banking pages','request',{t:'5 s',r:'None',f:'Error page'});
call('APP-01','APP-09','Initiate transfer','request',{t:'2 s',r:'None — enquire by reference',f:'Return pending with reference',i:'Payment reference'},['DAT-04']);
call('APP-09','APP-13','Screen payment','request',{t:'300 ms',r:'None',f:'Hold for manual review'},['DAT-04','DAT-08']);
call('APP-09','APP-05','Reserve funds','request',{t:'500 ms',r:'Safe retry',f:'Reject with reason',i:'Hold ID'},['DAT-02']);
call('APP-09','APP-11','Post entries','request',{t:'1 s',r:'Safe retry',f:'Keep order pending',i:'Posting reference'},['DAT-05']);
call('APP-09','APP-10','Submit for clearing','event',{r:'At-least-once delivery',f:'Dead-letter and alert',i:'Payment reference'},['DAT-04']);
call('APP-10','X-NET','Clearing message','request',{t:'30 s',r:'Enquire before resubmit',f:'Mark outcome unknown, investigate'},['DAT-04']);
call('APP-11','APP-15','Posting completed','event',{r:'At-least-once delivery',f:'Dead-letter',i:'Event ID'},['DAT-05','DAT-07']);
call('APP-11','APP-14','Transaction events','event',{r:'At-least-once delivery'},['DAT-05']);
call('APP-08','APP-15','Repayment due','event',{r:'At-least-once delivery',f:'Dead-letter and alert',i:'Instalment ID'},['DAT-03','DAT-07']);
call('APP-08','APP-05','Direct debit collection','request',{},['DAT-02']);
call('APP-08','APP-11','Post repayment','request',{t:'1 s',r:'Safe retry',i:'Instalment ID'},['DAT-05']);
call('APP-07','X-BUR','Credit report','request',{t:'10 s',r:'One retry',f:'Refer to underwriter'});
call('APP-07','APP-08','Book new loan','request',{t:'2 s',i:'Application ID'},['DAT-03']);
call('APP-04','X-IDV','Verify identity','request',{t:'20 s',r:'Poll result',f:'Keep application pending'},['DAT-06']);
call('APP-04','APP-03','Create customer','request',{t:'1 s'},['DAT-01']);
call('APP-05','APP-03','Customer lookup','request',{t:'200 ms',r:'Safe retry',f:'Serve cached profile'},['DAT-01']);
call('APP-02','APP-05','Statements & balances','request',{t:'1 s',r:'Safe retry'},['DAT-02']);
call('APP-06','APP-11','Accrual postings','request',{t:'1 s',r:'Safe retry',i:'Accrual run + account'},['DAT-05']);
call('APP-12','APP-11','Close of day','request',{t:'60 s'});
call('APP-15','X-MSG','Send message','request',{t:'5 s',r:'Backoff, 3 attempts',f:'Dead-letter',i:'Message ID'},['DAT-07']);
call('APP-01','APP-04','Start onboarding','request',{t:'2 s',f:'Resume from saved step'},['DAT-06']);
// Logical interactions between responsibilities (Chapter 4 view of the same flows)
for(const [a,b,l] of [['LR-02','LR-12','Order'],['LR-12','LR-17','Screen'],['LR-12','LR-07','Reserve'],['LR-12','LR-15','Post'],['LR-12','LR-14','Clear'],['LR-15','LR-20','Notify'],['LR-10','LR-21','Remind'],['LR-11','LR-07','Collect'],['LR-05','LR-04','Create'],['LR-09','LR-10','Book'],['LR-15','LR-18','Monitor']])r('interaction',a,b,l);

// Protection
o('boundary','TB-01','Internet edge');o('boundary','TB-02','Core banking zone');o('boundary','TB-03','Restricted data');o('boundary','TB-04','Partner connections');
for(const x of ['APP-01','APP-02','TC-04'])r('withinBoundary',x,'TB-01');
for(const x of ['APP-03','APP-05','APP-06','APP-07','APP-08','APP-09','APP-11','APP-12','APP-13','APP-14','APP-15'])r('withinBoundary',x,'TB-02');
for(const x of ['TC-02','TC-07','TC-09'])r('withinBoundary',x,'TB-03');
for(const x of ['APP-04','APP-10'])r('withinBoundary',x,'TB-04');
const ctl=(id,t,targets,mit=[])=>{o('control',id,t);for(const x of targets)r('protects',id,x);for(const x of mit)r('mitigates',id,x);};
const thr=(id,t,targets)=>{o('threat',id,t);for(const x of targets)r('threatens',id,x);};
thr('THR-01','Account takeover payment',['IF-01','IF-03']);
thr('THR-02','Duplicate posting after retry',['IF-06','IF-13']);
thr('THR-03','Identity evidence exfiltration',['DAT-06']);
thr('THR-04','Replay of clearing messages',['IF-08']);
ctl('SEC-01','Strong customer authentication',['IF-01'],['THR-01']);
ctl('SEC-02','Fraud screening before release',['IF-03'],['THR-01']);
ctl('SEC-03','Idempotent posting references',['IF-06','IF-13'],['THR-02']);
ctl('SEC-04','Service-to-service mTLS',['IF-03','IF-04','IF-05','IF-06']);
ctl('SEC-05','Field-level encryption',['DAT-01','DAT-02']);
ctl('SEC-06','Ledger audit trail',['DAT-05']);
ctl('SEC-07','Signed clearing messages',['IF-08'],['THR-04']);
// THR-03 has no mitigating control: a visible protection gap.

// Intent: requirements, quality scenarios, decisions
const REQ=[['REQ-01','Customers can transfer money 24/7 from mobile',['LR-02','LR-12']],['REQ-02','Each payment posts exactly once',['LR-13','LR-15']],['REQ-03','Onboard customers with verified identity',['LR-05','LR-04']],['REQ-04','Remind borrowers before each repayment is due',['LR-10','LR-21']],['REQ-05','Screen payments for fraud before release',['LR-17']],['REQ-06','Close the books every day',['LR-16']],['REQ-07','Report suspicious activity to the regulator',['LR-18','LR-19']],['REQ-08','Accrue interest daily',['LR-08']]];
for(const [id,t,lrs] of REQ){o('requirement',id,t);for(const l of lrs)r('fulfils',id,l);}
const QD=[['QD-01','Transfer acknowledged within 2 s (p95)',['LR-02','LR-12'],'p95 ≤ 2 s at 300 TPS'],['QD-02','No duplicate financial effect under retries',['LR-13','LR-15'],'0 duplicates in fault injection'],['QD-03','Payments available 99.95%',['LR-12','LR-14'],'≤ 22 min downtime / month'],['QD-04','Reminder sent at least 3 days before due',['LR-21','LR-10'],'99.9% on time'],['QD-05','Ledger recovers in 15 min with no lost postings',['LR-15'],'RTO 15 min · RPO 0']];
for(const [id,t,lrs,target] of QD){o('quality',id,t,{target});for(const l of lrs)r('constrains',id,l);}
const ADR=[['ADR-01','Acknowledge transfers after durable acceptance; clear asynchronously',['LR-12','LR-14']],['ADR-02','Enforce one financial effect at the posting engine',['LR-13','LR-15']],['ADR-03','Publish repayment-due events instead of polling',['LR-10','LR-21']],['ADR-04','Share one event streaming platform across modules',['TC-03']]];
for(const [id,t,targets] of ADR){o('decision',id,t,{question:t});for(const x of targets)r('justifies',id,x);}

window.AIW_DATASETS=window.AIW_DATASETS||[];
window.AIW_DATASETS.push({id:'core-banking',title:'Core banking (illustrative)',kind:'Hypothetical concept model',note:'A generic core-banking structure authored for this concept. It is not the recorded SEABaaS architecture; module boundaries, products and placements are hypotheses.',objects,rels,
 scenarios:[
  {id:'transfer',title:'Customer transfer',steps:[['X-DEV','APP-01'],['APP-01','APP-09'],['APP-09','APP-13'],['APP-09','APP-05'],['APP-09','APP-11'],['APP-09','APP-10'],['APP-10','X-NET'],['APP-11','APP-15'],['APP-15','X-MSG']]},
  {id:'reminder',title:'Repayment reminder',steps:[['APP-08','APP-15'],['APP-15','X-MSG']]},
  {id:'onboarding',title:'Customer onboarding',steps:[['X-DEV','APP-01'],['APP-01','APP-04'],['APP-04','X-IDV'],['APP-04','APP-03'],['APP-05','APP-03']]}
 ]});
})();
