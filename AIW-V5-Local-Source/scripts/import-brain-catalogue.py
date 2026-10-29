"""Reproduce the descriptive catalogue and Playbook passages from supplied originals.
No publication, authority promotion, scoring or network calls.
"""
import hashlib,json,sys,zipfile
from collections import Counter
from pathlib import Path
root=Path(__file__).resolve().parent.parent
sha=lambda b:hashlib.sha256(b).hexdigest()
release='AKR-0.10.73.5'
catalogue_only=sys.argv[2:]==['--catalogue-only']
if len(sys.argv)!=4 and not catalogue_only:
    raise SystemExit('Usage: import-brain-catalogue.py AKR.zip workbook.xlsx extracted.json | AKR.zip --catalogue-only')

def catalogue_module(catalogue):
    # Repeated source structures are exact shared literals, not a second corpus
    # or a lossy template. Freeze every shared descendant so one consumer cannot
    # change another record's authority, conditions or component properties.
    counts=Counter()
    compact=lambda value:json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(',',':'))
    def count(value):
        if isinstance(value,(list,dict)):
            encoded=compact(value)
            if len(encoded)>=80:
                counts[encoded]+=1
            for child in value.values() if isinstance(value,dict) else value:
                count(child)
    count(catalogue)
    shared=sorted((value for value,n in counts.items() if n>=3),key=lambda value:(len(value),value))
    names={value:'d'+str(i) for i,value in enumerate(shared)}
    def render(value,own=None,frozen=False):
        if isinstance(value,(list,dict)):
            key=compact(value)
            if key in names and key!=own:
                return names[key]
            if isinstance(value,dict):
                out='{'+','.join(json.dumps(k,ensure_ascii=False)+':'+render(v,frozen=frozen) for k,v in value.items())+'}'
            else:
                out='['+','.join(render(v,frozen=frozen) for v in value)+']'
            return 'Object.freeze('+out+')' if frozen else out
        return json.dumps(value,ensure_ascii=False,separators=(',',':'))
    declarations=''.join('const '+names[value]+'='+render(json.loads(value),own=value,frozen=True)+';\n' for value in shared)
    return '// Reproducible archive projection. Descriptive authority only. Exact repeated structures are immutable shared literals.\n'+declarations+'export const BRAIN_CATALOGUE='+render(catalogue)+';\n'
with zipfile.ZipFile(sys.argv[1]) as z:
    manifest=z.read(release+'/RELEASE-MANIFEST.json')
    for a in json.loads(manifest)['artifacts']:
        b=z.read(release+'/'+a['name'])
        assert len(b)==a['bytes'] and sha(b)==a['sha256'],a['name']
    name=release+'/PATTERN-DNA-2.1.json'; body=z.read(name)
    records=json.loads(body)['records']
    fields=['id','name','recordType','category','applicableStages','summary','problem','aliases','tags','context','prerequisites','applicabilityRules','exclusions','risks','failureModes','counterfactualExplanation','obligations','alternatives','complements','conflicts','componentKit','interfaceKit','qualityImpacts','fitnessTests','knowledgeAuthority','lineageSummary']
    catalogue={'releaseId':release,'manifestSha256':sha(manifest),'sourceFile':name,'sourceSha256':sha(body),'records':[{**{k:r.get(k) for k in fields},'sourcePointer':'/records/'+str(i),'recordSha256':sha(json.dumps(r,sort_keys=True,separators=(',',':')).encode())} for i,r in enumerate(records)],'repositories':json.loads(z.read(release+'/GITHUB-CONVERSION-REGISTRY.json'))['repositories']}
    object_name=release+'/KNOWLEDGE-OBJECTS.json'; object_body=z.read(object_name)
    objects=json.loads(object_body)['objects']
    editorial=[o for o in objects if o['objectClass']=='editorial-pattern-claim']
    projections=[o for o in objects if o.get('recordId')]
    lineage_ids={claim for record in records for claim in record.get('lineageSummary',{}).get('claimIds',[])}
    assert all(o['recordId'] in {r['id'] for r in records} for o in projections),'A knowledge-object projection has no catalogue record'
    assert all(o['claimId'] in lineage_ids for o in editorial),'An editorial claim has no retained DNA lineage'
    seeds=[{**o,'sourcePointer':'/objects/'+str(i),'objectSha256':sha(json.dumps(o,sort_keys=True,separators=(',',':')).encode())} for i,o in enumerate(objects) if o['objectClass']=='atomic-source-claim']
    catalogue['knowledgeObjects']={'sourceFile':object_name,'sourceSha256':sha(object_body),
        'coverage':{'total':len(objects),'dnaProjections':len(projections),'editorialLineageClaims':len(editorial),'atomicSeedLeads':len(seeds)},
        'posture':'DNA projections reuse catalogue records. Editorial claims retain their lineage IDs, not executable rules. Atomic seed objects are discovery leads requiring exact-source acquisition and independent review; none is a project release.',
        'seedLeads':seeds}
    (root/'public/brain-catalogue.js').write_text(catalogue_module(catalogue))
if catalogue_only:
    print('Verified',len(records),'catalogue records;',len(seeds),'atomic seed review leads;',len(catalogue['repositories']),'repositories. No knowledge promoted; workbook projection unchanged.')
    raise SystemExit(0)
book=Path(sys.argv[2]); extracted=json.loads(Path(sys.argv[3]).read_text())[book.name]
selections={'Arch Style Suitability Ass':1200,'Architecture Styles':1600,'Architectural Tactics':1800,'Architecture Patterns Guidebook':7000,'Modular Monolith':1800,'Layered Arch':1800,'MircoKernel  Style':1800,'SOA':1800,'anti patterns':1200,'Components GuideBook v2':1500}
passages=[]
for sheet,limit in selections.items():
    for row in extracted[sheet]:
        for cell,body in row:
            if not isinstance(body,str) or len(body)<80 or len(body)>limit:continue
            passages.append({'id':'PB-'+str(len(passages)+1).zfill(3),'title':sheet,'locator':sheet+'!'+cell,'text':body,'sha256':sha(body.encode())})
pack={'id':'AIW-PLAYBOOK-2','file':book.name,'fileSha256':sha(book.read_bytes()),'posture':'User-supplied methodology; applicability and source claims require architect judgement. No calibrated scoring.','passages':passages}
(root/'public/brain-playbook.js').write_text('// Exact passages from the supplied workbook.\nexport const BRAIN_PLAYBOOK='+json.dumps(pack,ensure_ascii=False,separators=(',',':'))+';\n')
print('Verified',len(records),'catalogue records;',len(catalogue['repositories']),'repositories;',len(passages),'Playbook passages. No knowledge promoted.')
