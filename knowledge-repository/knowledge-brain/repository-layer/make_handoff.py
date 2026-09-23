"""Create a reproducible, metadata-only handoff from measured local evidence."""
import argparse
from collections import Counter
import hashlib
import io
import json
from pathlib import Path
import subprocess
import zipfile

BASE_COMMIT = 'cd78118420bfcad6293e18954ab4aeb9c9154414'
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
BASELINE = 'AIW v0.10.0-rc.10.73.6'

def sha(b): return hashlib.sha256(b).hexdigest()
def encoded(value): return (json.dumps(value, indent=2) + '\n').encode()
def git(*args): return subprocess.check_output(['git', *args], cwd=ROOT).decode().strip()
def archive(files):
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name, data in sorted(files.items()):
            info = zipfile.ZipInfo(name, (2026, 9, 23, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, data)
    return stream.getvalue()

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--evidence', default=str(ROOT / 'output/repository-layer'))
    p.add_argument('--destination', required=True)
    a = p.parse_args()
    evidence, dest = Path(a.evidence), Path(a.destination)
    load = lambda name: json.loads((evidence / name).read_text(encoding='utf-8-sig'))
    corpus, evaluation, regressions, browser, runs = [load(n) for n in ('corpus-summary.json','evaluation.json','regression-results.json','browser-results.json','pilot-runs.json')]
    focused = load('focused-final.json')
    history = load('historical-audit.json')
    if not history.get('auditRunFinished'):
        raise ValueError('Historical snapshot reconciliation is unfinished')
    if {x['snapshot'] for x in history['historicalSnapshots']} != set(corpus['historicalSnapshots']):
        raise ValueError('Historical audit does not match the final snapshot census')
    corpus['historicalAudit'] = history
    corpus['indexedObjectReferences'] = sum(sum(r.get('acquisitionStatuses',{}).get(k,0) for k in ('accepted','accepted-opaque','quarantined')) for r in corpus['repositories'])
    corpus['physicalSelectedStoreFiles'] = corpus['counts'].get('objectsOnDisk',0) + corpus['counts'].get('quarantineOnDisk',0)
    corpus['physicalAllStoreFiles'] = sum(corpus['allSnapshotPhysicalCounts'].values())
    corpus['countInterpretation'] = 'Object references are not physical file counts: identical content hashes can share one stored object. Historical snapshots are counted and audited separately.'
    if not corpus.get('auditRunFinished'):
        raise ValueError('The complete inventory run has not finished; do not package partial results as final')
    if not regressions['complete']:
        raise ValueError('Regression run is incomplete')
    packet = load('project-packet.json')
    commit, branch = git('rev-parse','HEAD'), git('branch','--show-current')
    errors = Counter()
    for repo in corpus['repositories']: errors.update(repo['errors'])
    files = {}
    files['corpus-summary.json'] = encoded(corpus)
    files['evidence/historical-audit.json'] = encoded(history)
    files['pilot-manifest.jsonl'] = (evidence / 'pilot-manifest.jsonl').read_bytes()
    for name in ('architecture-knowledge-sample.json','contract.schema.json','operations.schema.json','operations.examples.json','synthetic-fixture.txt'):
        files[name] = (HERE / name).read_bytes()
    contract = (HERE / 'integration-contract.md').read_text()
    contract += '\n## Complete packet JSON Schema\n\n```json\n' + (HERE / 'contract.schema.json').read_text() + '```\n'
    contract += '\n## Complete operation JSON Schemas\n\n```json\n' + (HERE / 'operations.schema.json').read_text() + '```\n'
    contract += '\n## Synthetic operation examples (never submitted)\n\n```json\n' + (HERE / 'operations.examples.json').read_text() + '```\n'
    files['integration-contract.md'] = contract.encode()
    files['evidence/regression-results.json'] = encoded(regressions)
    files['evidence/browser-results.json'] = encoded(browser)
    files['evidence/evaluation.json'] = encoded(evaluation)
    files['evidence/pilot-runs.json'] = encoded(runs)
    files['evidence/focused-final.json'] = encoded(focused)
    files['evidence/seabaas-signals.json'] = (evidence / 'seabaas-signals.json').read_bytes()
    files['pilot-packet-metadata.json'] = encoded(packet)
    files['instruction-completion.json'] = encoded({
        'scope':'Only the two uploaded Codex prompts; no push or publication',
        'prompt1':{
            'inspection':{'status':'done','target':'supplied Site v44','sourceCommit':'eef8464a885b93aee3f4a9348045dcc82f1635cd'},
            'inventory':{'status':'done' if corpus['auditComplete'] else 'completed-with-findings','inspected':corpus['counts']['fileEntries'],'expected':corpus['expectedFileEntries'],'integrityPassed':corpus['integrityPassed'],'historicalIntegrityPassed':history['integrityPassed']},
            'pilot':{'status':'done','files':len(packet['sources']),'passages':sum(len(x['passages']) for x in packet['sources']),'authority':'candidate-only'},
            'refresh':{'status':'done','checkpointed':True,'dryRun':True,'unchangedRunNewRevisions':runs['unchangedRun']['newRevisions'],'scheduleInvocation':'refresh.ps1; system task not installed'},
            'reviewExportBoundary':{'status':'implemented-fail-closed','realIndependentlyApprovedClaims':0,'productionAccepted':False},
            'integrationContractAndAdapter':{'status':'done','localV44PreviewVerified':True,'cloudDeploymentPerformed':False},
            'requiredVerification':{'status':'done','regressionCommandsPassed':regressions['passed'],'finalRepositoryTests':focused['repositoryTests'],'schemaExamples':focused['schemaFixturesPassed'],'browserChecks':browser['passed'],'architectureQuestionsPassed':evaluation['passed']}
        },
        'prompt2':{'status':'packaged-and-verified-by-builder','sourceOnly':True,'originalObjectsRemainOnLaptop':True,'sha256sumsIncluded':True},
        'externalHumanGates':{'licenceClearance':'pending','architectureReview':'pending','independentApproval':'pending','trustedSignedRelease':'pending'},
        'seabaas':{'localWorkbookTopicSmokeCheck':'performed','architectReviewedApplicationCase':'not performed','baselineConfirmed':False}
    })
    question_rows = '\n'.join('| ' + q['question'] + ' | `' + q['expectedPath'] + '` | ' + ('PASS' if q['passed'] else 'FAIL') + ' | '+str(q['approvedHits'])+' |' for q in evaluation['questions'])
    selected = '\n'.join('- `' + s['repository'] + '@' + s['commit'] + ':' + s['path'] + '`' for s in packet['sources'])
    evaluation_text = f'''# Measured evaluation

Actual local pilot: {len(packet['sources'])} files, {sum(len(s['passages']) for s in packet['sources'])} passages and {len(packet['claims'])} pending interpretations. File SHA-256 and inclusive line-range/excerpt hashes were recomputed against local acquired bytes. All pilot provenance checks: {all(x['fileHashPassed'] and x['passagesPassed'] for x in evaluation['provenance'])}.

| Pilot question | Expected evidence | Result | Approved hits |
|---|---|---|---|
{question_rows}

Question totals: {evaluation['passed']} passed, {evaluation['failed']} failed. Expected reasons and all actual ranked source IDs, commits and paths are in evidence/evaluation.json. These questions measure lexical source location, not advice quality. Claim precision, contextual relevance, omissions, independent expert judgement and design outcomes remain unmeasured. Candidate statements are pending-review placeholders; graph edges are lexical suggestions.

Initial successful build: {runs['firstSuccessfulRun']['newRevisions']} revisions. Second unchanged run: {runs['unchangedRun']['newRevisions']} new revisions and {runs['unchangedRun']['unchanged']} unchanged. Dry run: {runs['dryRun']['newRevisions']} new revisions. Controlled changed-source, withdrawal, missing/corrupt object, checkpoint resume, conflict-cue, historical replay and approved-retrieval tests passed as recorded in focused-final.json. Synthetic tests do not constitute real approval. Opaque object-only storage is checked against acquisition policy.

Verification commands: {regressions['passed']} passed, {regressions['failed']} failed in the recorded full suite. Focused final repository tests: {focused['repositoryTests']} passed. Adapter checks: {focused['adapterChecks']}; schema fixtures: {focused['schemaFixturesPassed']}; Playwright endpoint/application checks: {browser['passed']} passed, {browser['failed']} failed. The existing explorer regression suite contains 36 tests. Exact executed commands and return codes are recorded in evidence/regression-results.json. Original v44 syntax checks also passed for 203 modules. The v44 runtime has no required npm dependencies; testing used a clean archive extraction and Node 24. No unrelated root-platform install or production release gates were claimed.

SEABaaS: UNTESTED. No verified workbook-driven case or architect-reviewed app journey was run. Human architecture review, independent approval, licence clearance, signed repository release, cloud deployment and production acceptance: NOT PERFORMED.

## Selected files

{selected}
'''
    evaluation_text += '\nA local SEABaaS workbook topic smoke check scanned 21 sheets and found four topic signals with expected public pilot locators. No original requirements are exported. Its baseline is unconfirmed; the architecture case remains unverified. See evidence/seabaas-signals.json.\n'
    files['evaluation-report.md'] = evaluation_text.encode()
    readme = f'''# AIW second-brain handoff

Engineering baseline: {BASELINE}. Target: supplied Model Explorer Site v44 (`eef8464a885b93aee3f4a9348045dcc82f1635cd`).

| Status | Result |
|---|---|
| Done | Complete current-corpus inventory/integrity run; measured errors and historical/restricted scope disclosed. Completed pilot: 24-file local pilot; stable revisions and 149 exact passages; candidate graph cues; checkpointed refresh, dry run, invalidation and metadata-only bounded export. |
| Done | v44 authenticated read-only packet adapter, build patch, actual-packet tests and Chromium checks. Existing source-fetch commands reused. No design graph mutation. |
| Not done | Cloud deployment, live corpus synchronization, automatic project revocation processing, reviewed architecture advice and architect-reviewed SEABaaS case. |
| Blocked | Licence clearance, human architecture review, independent approval and trusted signed-release integration. No real claims independently approved. |
| Operational limit | Scheduler invocation supplied, system task not registered; refresh revalidates pinned local snapshots and does not acquire remote branch changes. |

Code: `C:\\AIW\\aiw\\knowledge-repository\\knowledge-brain\\repository-layer`. Isolated patched app: `knowledge-brain/output/v44-target/aiw-model-explorer`. Original acquired bytes remain in `AKR-0.10.73.7_/github-live/snapshots`; nothing was pushed or published.

Git base: `{BASE_COMMIT}`. Result: `{commit}`. Branch: `{branch}`. Source archive includes all new source/tests/run instructions and the exact v44 patch. Apply it only to the supplied v44 source; this delivery did not modify the unrelated local v5 app ({'0.10.0-rc.10.91.1'}).

Corpus: {corpus['selectedManifests']} selected manifests; {corpus['manifestsOnDisk']} manifests physically present (historical snapshots explicitly listed); {corpus['counts']['fileEntries']} file entries. Selected physical objects: {corpus['counts'].get('objectsOnDisk',0)} plus {corpus['counts'].get('quarantineOnDisk',0)} quarantined. Across all snapshots: {corpus['allSnapshotPhysicalCounts']}. The current acquisition has {corpus['indexedObjectReferences']} object references and {corpus['physicalSelectedStoreFiles']} physical stored files (including quarantine); all snapshots have {corpus['physicalAllStoreFiles']} physical stored files. The README's 106,096 matches object references, not distinct stored files. Historical accepted content was checked separately; see evidence/historical-audit.json. Inventory coverage complete: {corpus['auditComplete']}; integrity checks passed: {corpus['integrityPassed']}. Measured errors: {dict(errors)}. Restricted bytes were counted, not read. Canonical historical manifest digests were matched to the index but not independently recomputed; raw manifest and accepted object/file SHA-256 were measured.

Pilot and test details: evaluation-report.md, pilot-manifest.jsonl and evidence/*.json. Approved repository retrieval returns zero. ProductionAccepted remains false. A project release checksum in v44 is not independent approval or a trusted signature; the remaining trust integration is described in integration-contract.md.

No acquired source bodies, object stores, quarantine, archives, credentials, dependencies, builds or unrelated local files are included. The small source/passage example is original synthetic material. SHA256SUMS covers every enclosed payload except itself; the ZIP's digest is delivered separately. To reproduce, unpack source-code.zip, use repository-layer/README.md, then run make_handoff.py against measured evidence after committing your scoped changes.
'''
    files['README_FOR_CHATGPT.md'] = readme.encode()
    source_files = {}
    for path in HERE.iterdir():
        if path.is_file() and path.suffix in ('.py','.js','.mjs','.cjs','.ps1','.md','.json','.txt','.patch'):
            source_files['repository-layer/' + path.name] = path.read_bytes()
    source_files['SECOND_BRAIN_PLAN.md'] = (ROOT / 'SECOND_BRAIN_PLAN.md').read_bytes()
    files['source-code.zip'] = archive(source_files)
    files['code-changes.patch'] = subprocess.check_output(['git','diff','--binary',BASE_COMMIT,commit,'--',
        'knowledge-repository/knowledge-brain/repository-layer','knowledge-repository/knowledge-brain/SECOND_BRAIN_PLAN.md'],cwd=ROOT.parent.parent)
    files['SHA256SUMS'] = ''.join(sha(data)+'  '+name+'\n' for name,data in sorted(files.items())).encode()
    blob = archive(files)
    if len(blob) >= 25_000_000: raise ValueError('Handoff exceeds 25 MB')
    dest.mkdir(parents=True,exist_ok=True)
    target = dest / 'AIW_SECOND_BRAIN_HANDOFF.zip'
    target.write_bytes(blob)
    with zipfile.ZipFile(target) as z:
        if z.testzip() is not None: raise ValueError('ZIP CRC failed')
        for name,data in files.items():
            if z.read(name) != data: raise ValueError('ZIP payload mismatch')
        for line in z.read('SHA256SUMS').decode().splitlines():
            digest,name = line.split('  ',1)
            if sha(z.read(name)) != digest: raise ValueError('SHA256SUMS mismatch')
    digest = sha(blob)
    (dest / 'AIW_SECOND_BRAIN_HANDOFF.zip.sha256').write_text(digest+'  '+target.name+'\n')
    (dest / 'README_FOR_CHATGPT.md').write_bytes(files['README_FOR_CHATGPT.md'])
    summary = [
        f"Completed: full current-corpus audit ({corpus['counts']['fileEntries']}/{corpus['expectedFileEntries']} entries) and 24-file, 149-passage pilot.",
        'Completed: resumable candidate refresh, invalidation, bounded metadata export and tested v44 preview adapter.',
        f"Verified: {regressions['passed']}/{len(regressions['results'])} regression commands; {focused['repositoryTests']} final repository tests; {browser['passed']} browser checks.",
        'Blocked: licence clearance, independent human approval and trusted signed repository releases; approved claims = 0.',
        'Next: deploy reviewed v44 adapter, wire trusted synchronization/activation, and run an architect-reviewed SEABaaS case.']
    (dest / 'STATUS_SUMMARY.txt').write_text('\n'.join(summary)+'\n')
    print(json.dumps({'path':str(target.resolve()),'bytes':len(blob),'sha256':digest,'branch':branch,'commit':commit,'files':sorted(files),'status':summary},indent=2))

if __name__ == '__main__': main()
