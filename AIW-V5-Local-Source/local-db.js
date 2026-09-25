import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,readdirSync} from 'node:fs';
export function localDatabase(filename='.aiw-local/project.sqlite'){
  mkdirSync('.aiw-local',{recursive:true});const db=new DatabaseSync(filename);db.exec('PRAGMA foreign_keys=ON');
  db.exec('CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY)');
  for(const file of readdirSync('drizzle').filter(x=>x.endsWith('.sql')).sort())if(!db.prepare('SELECT name FROM _local_migrations WHERE name=?').get(file)){db.exec(readFileSync('drizzle/'+file,'utf8'));db.prepare('INSERT INTO _local_migrations(name) VALUES (?)').run(file)}
  return {prepare(sql){const s=db.prepare(sql);let values=[];return {bind(...v){values=v;return this},async first(){return s.get(...values)||null},_runSync(){const r=s.run(...values);return {meta:{changes:Number(r.changes)}}},async run(){return this._runSync()},async all(){return {results:s.all(...values)}}}},async batch(statements){db.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s._runSync());db.exec('COMMIT');return results}catch(e){db.exec('ROLLBACK');throw e}},close(){db.close()}};
}
