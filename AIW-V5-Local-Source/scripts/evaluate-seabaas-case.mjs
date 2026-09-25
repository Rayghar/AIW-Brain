import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {createProject} from '../public/projects-domain.js';
import {openWorkbook,sha256} from '../public/workbook-reader.js';
import {guessHeader,sheetHeaders,suggestMapping,mapWorkbookRows,previewIntake,applyIntake} from '../public/intake-domain.js';
import {evaluateArchitectureCase} from '../architecture-case-evaluation.js';

const filename=process.env.AIW_WORKBOOK;if(!filename)throw Error('Set AIW_WORKBOOK to the real SEABaaS workbook path.');
const bytes=new Uint8Array(await readFile(filename)),hash=await sha256(bytes),workbook=await openWorkbook(bytes);
const sheet=await workbook.sheet('11 Requirement Detail'),headerRow=guessHeader(sheet),mapping=suggestMapping(sheetHeaders(sheet,headerRow));
const mapped=mapWorkbookRows(sheet,headerRow,mapping),p=createProject({name:'SEABaaS architecture case',template:'blank'},'seabaas-evaluation');
const source={...mapped,datasetId:'seabaas-source',revision:1,filename:path.basename(filename),uploadId:'offline-evaluation',workbookHash:hash,sheet:sheet.name,headerRow},preview=previewIntake(p,source,[]);
const imported=applyIntake(p,source,preview,{reviewed:true,previewStamp:preview.stamp},new Date().toISOString(),'offline-evaluation').document;
const report={...evaluateArchitectureCase(imported,{caseId:'SEABaaS-11-requirement-detail',sampleIds:['FRD-022','UATC-0273']}),workbook:{sha256:hash,sheet:sheet.name,headerRow,rows:source.rows.length,preview:preview.counts}};
if(report.requirements.inScope!==1400||report.requirements.sourceLocated!==1400)throw Error('The SEABaaS workbook identity or source mapping changed: inspect before interpreting the report.');
if(process.env.AIW_EVALUATION_REPORT)await writeFile(process.env.AIW_EVALUATION_REPORT,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
