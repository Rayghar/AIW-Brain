"""Exact request shapes for existing CLI and v44 governance operations.

Examples are synthetic documentation only. Nothing executes an approval,
activation, withdrawal or command against an application.
"""
from pathlib import Path
import json

def obj(fields):
    return {'type':'object','additionalProperties':False,'required':list(fields),'properties':fields}
def text(n):
    return {'type':'string','minLength':1,'maxLength':n}
def command(kind, payload):
    return obj({'revision':{'type':'integer','minimum':0},'command':obj({'type':{'const':kind},'payload':payload})})

review = {'reviewed':{'const':True},'reviewer':text(180),'reason':text(2000),'id':text(180),'stamp':text(200)}
definitions = {
 'search':obj({'question':text(500),'mode':{'enum':['candidate','approved']},'limit':{'type':'integer','minimum':1,'maximum':12}}),
 'activation':command('knowledge.activate',obj(review)),
 'withdrawal':command('knowledge.withdraw',obj(review)),
 'sourceFetch':command('knowledge.fetch',obj({'connectorId':text(100),'path':text(350),'ref':{'type':'string','pattern':'^[a-f0-9]{40}$'},'expectedHash':{'type':'string','pattern':'^[a-f0-9]{64}$'}})),
 'invalidationNotice':obj({'cursor':{'type':'integer','minimum':1},'kind':{'const':'invalidation'},'revisionId':{'type':'string','pattern':'^revision-[a-f0-9]{32}$'},'reason':{'enum':['withdrawn','superseded','source-unavailable']},'dependentClaimsIneligible':{'const':True}})
}
schema = {'$schema':'https://json-schema.org/draft/2020-12/schema','$id':'urn:aiw:repository-operations:v1',
          '$defs':definitions,'oneOf':[{'$ref':'#/$defs/'+name} for name in definitions]}
samples = {
 'search':{'question':'caching','mode':'candidate','limit':12},
 'activation':{'revision':1,'command':{'type':'knowledge.activate','payload':{'reviewed':True,'reviewer':'SYNTHETIC-NOT-A-REAL-APPROVER','reason':'Documentation fixture only; never execute as an approval.','id':'KR-SYNTHETIC','stamp':'CURRENT-knowledgeStamp-MUST-BE-SUPPLIED-BY-APPLICATION'}}},
 'withdrawal':{'revision':1,'command':{'type':'knowledge.withdraw','payload':{'reviewed':True,'reviewer':'SYNTHETIC-NOT-A-REAL-APPROVER','reason':'Documentation fixture only.','id':'KS-SYNTHETIC','stamp':'CURRENT-knowledgeImpactStamp-MUST-BE-SUPPLIED-BY-APPLICATION'}}},
 'sourceFetch':{'revision':1,'command':{'type':'knowledge.fetch','payload':{'connectorId':'SYNTHETIC','path':'guide.md','ref':'a'*40,'expectedHash':'b'*64}}},
 'invalidationNotice':{'cursor':2,'kind':'invalidation','revisionId':'revision-'+'c'*32,'reason':'superseded','dependentClaimsIneligible':True}}
base=Path(__file__).parent
for name,data in [('operations.schema.json',schema),('operations.examples.json',samples)]:
    (base/name).write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8')
