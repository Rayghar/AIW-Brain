import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,readFileSync,readdirSync,existsSync,rmSync} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Local schema migrations (audit C-29). Each migration file applies inside one transaction together with
// its record, so a failure leaves nothing half-applied. Each record keeps the file's SHA-256 (line endings
// normalised), and a migration file that changed after it was applied stops start-up rather than letting
// the database and the code disagree silently. Records made before checksums existed adopt the current file.
export function migrateLocalDatabase(db,directory='drizzle'){
  db.exec('CREATE TABLE IF NOT EXISTS _local_migrations (name TEXT PRIMARY KEY)');
  if(!db.prepare('PRAGMA table_info(_local_migrations)').all().some(c=>c.name==='sha256'))db.exec('ALTER TABLE _local_migrations ADD COLUMN sha256 TEXT');
  for(const file of readdirSync(directory).filter(x=>x.endsWith('.sql')).sort()){
    const sql=readFileSync(directory+'/'+file,'utf8'),hash=createHash('sha256').update(sql.replace(/\r\n/g,'\n')).digest('hex');
    const applied=db.prepare('SELECT sha256 FROM _local_migrations WHERE name=?').get(file);
    if(applied){
      if(!applied.sha256)db.prepare('UPDATE _local_migrations SET sha256=? WHERE name=?').run(hash,file);
      else if(applied.sha256!==hash)throw Error(`Migration ${file} changed after it was applied to this database. Restore the original file and add a new migration for the change.`);
      continue;
    }
    db.exec('BEGIN IMMEDIATE');
    try{db.exec(sql);db.prepare('INSERT INTO _local_migrations(name,sha256) VALUES (?,?)').run(file,hash);db.exec('COMMIT');}
    catch(e){db.exec('ROLLBACK');throw Error(`Migration ${file} failed and was rolled back: ${e.message}`);}
  }
}

// The directory is the database file's own (round 2, B2-07), so AIW_LOCAL_DB moves everything with it. Write-ahead
// logging and a busy timeout let a second local process (a suite, a script) wait briefly instead of failing at once
// with SQLITE_BUSY (round 2, B2-16); a memory database takes neither pragma.
// A write-ahead log left beside a database file that no longer exists (a suite removed the file, a process was
// killed) belongs to no database: it is removed before a new database is created at that name, so SQLite never
// replays another database's pages into it.
export function localDatabase(filename='.aiw-local/project.sqlite'){
  if(filename!==':memory:'){const file=path.resolve(filename);mkdirSync(path.dirname(file),{recursive:true});if(!existsSync(file))for(const suffix of ['-wal','-shm'])rmSync(file+suffix,{force:true});}
  const db=new DatabaseSync(filename);db.exec('PRAGMA foreign_keys=ON');
  if(filename!==':memory:'){db.exec('PRAGMA busy_timeout=5000');db.exec('PRAGMA journal_mode=WAL');}
  migrateLocalDatabase(db);
  return {prepare(sql){const s=db.prepare(sql);let values=[];return {bind(...v){values=v;return this},async first(){return s.get(...values)||null},_runSync(){const r=s.run(...values);return {meta:{changes:Number(r.changes)}}},async run(){return this._runSync()},async all(){return {results:s.all(...values)}}}},async batch(statements){db.exec('BEGIN IMMEDIATE');try{const results=statements.map(s=>s._runSync());db.exec('COMMIT');return results}catch(e){db.exec('ROLLBACK');throw e}},compact(){return compactDatabase(db,filename)},close(){db.close()}};
}
// The file compacted when most of it is free pages (round 12, PS-15: a storage upgrade rewrites an 80 MB row as a 2 MB
// one, and SQLite keeps the freed pages in the file). VACUUM rewrites the database into its live pages, then the
// write-ahead log is checkpointed and truncated. Answers the pages before and after, or null when it was not worth it.
export function compactDatabase(db,filename){
  if(filename===':memory:')return null;
  const pages=Number(db.prepare('PRAGMA page_count').get().page_count),free=Number(db.prepare('PRAGMA freelist_count').get().freelist_count);
  if(free<1024||free<pages/4)return null;
  db.exec('VACUUM');db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  return {pages,free,after:Number(db.prepare('PRAGMA page_count').get().page_count)};
}
