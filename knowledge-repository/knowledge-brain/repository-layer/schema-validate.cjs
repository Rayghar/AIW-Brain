const fs=require('node:fs');
const path=require('node:path');
const Ajv=require(process.env.AIW_AJV_MODULE);
const ajv=new Ajv({allErrors:true,strict:true});
const schema=JSON.parse(fs.readFileSync(path.join(__dirname,'contract.schema.json'),'utf8'));
const validate=ajv.compile(schema);
const files=[path.join(__dirname,'architecture-knowledge-sample.json'),process.env.AIW_PACKET_PATH];
for(const file of files){const data=JSON.parse(fs.readFileSync(file,'utf8'));if(!validate(data))throw Error(JSON.stringify(validate.errors));}
console.log(JSON.stringify({passed:files.length,failed:0,schema:'JSON Schema 2020-12',fixtures:['synthetic','actual pilot']}));
