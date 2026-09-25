"""Reproduce the descriptive catalogue and Playbook passages from supplied originals.
No publication, authority promotion, scoring or network calls.
"""
import hashlib,json,sys,zipfile
from pathlib import Path
root=Path(__file__).resolve().parent.parent
sha=lambda b:hashlib.sha256(b).hexdigest()
release='AKR-0.10.73.5'
with zipfile.ZipFile(sys.argv[1]) as z:
    manifest=z.read(release+'/RELEASE-MANIFEST.json')
    for a in json.loads(manifest)['artifacts']:
        b=z.read(release+'/'+a['name'])
        assert len(b)==a['bytes'] and sha(b)==a['sha256'],a['name']
    name=release+'/PATTERN-DNA-2.1.json'; body=z.read(name)
    records=json.loads(body)['records']
    fields=['id','name','recordType','summary','problem','aliases','tags','context','prerequisites','applicabilityRules','exclusions','risks','failureModes','counterfactualExplanation','obligations','alternatives','complements','conflicts','componentKit','interfaceKit','knowledgeAuthority','lineageSummary']
    catalogue={'releaseId':release,'manifestSha256':sha(manifest),'sourceFile':name,'sourceSha256':sha(body),'records':[{**{k:r.get(k) for k in fields},'sourcePointer':'/records/'+str(i),'recordSha256':sha(json.dumps(r,sort_keys=True,separators=(',',':')).encode())} for i,r in enumerate(records)],'repositories':json.loads(z.read(release+'/GITHUB-CONVERSION-REGISTRY.json'))['repositories']}
    (root/'public/brain-catalogue.js').write_text('// Reproducible archive projection. Descriptive authority only.\nexport const BRAIN_CATALOGUE='+json.dumps(catalogue,ensure_ascii=False,separators=(',',':'))+';\n')
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
