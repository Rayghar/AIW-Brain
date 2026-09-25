// The knowledge repository store. It keeps identities, locations, hashes and a contentless search
// index; it never keeps a second copy of third-party text. Excerpts are read from verified originals.
// storeId is created once: rebuilding a store would force every pinned project to resynchronise.
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';

export const STORE_SCHEMA='aiw-knowledge-repository-store-v1';
const SCHEMA=`
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS connectors(connector_id TEXT PRIMARY KEY,repository TEXT NOT NULL,name TEXT,snapshot_id TEXT NOT NULL,commit_sha TEXT NOT NULL,branch TEXT,acquired_at TEXT,manifest_sha256 TEXT,raw_manifest_sha256 TEXT,snapshot_checksum TEXT,lifecycle TEXT,trust_tier INTEGER,use_policy TEXT,review_status TEXT,final_disposition TEXT,spdx TEXT,licence_note TEXT,files INTEGER,documents INTEGER,indexed INTEGER,passages INTEGER,verified_at TEXT,data TEXT);
CREATE TABLE IF NOT EXISTS revisions(rowid INTEGER PRIMARY KEY,revision_id TEXT NOT NULL UNIQUE,connector_id TEXT NOT NULL,repository TEXT NOT NULL,commit_sha TEXT NOT NULL,path TEXT NOT NULL,file_sha256 TEXT NOT NULL,bytes INTEGER NOT NULL,format TEXT,title TEXT,snapshot_id TEXT NOT NULL,object TEXT NOT NULL,state TEXT NOT NULL,reason TEXT,supersedes TEXT,body_indexed INTEGER NOT NULL,retrievable INTEGER NOT NULL,retrieval_reason TEXT,passages INTEGER NOT NULL DEFAULT 0,findings TEXT,first_cursor INTEGER NOT NULL DEFAULT 0,verified_at TEXT);
CREATE INDEX IF NOT EXISTS revisions_file ON revisions(repository,path,state);
CREATE INDEX IF NOT EXISTS revisions_connector ON revisions(connector_id,state);
CREATE TABLE IF NOT EXISTS passages(rowid INTEGER PRIMARY KEY,passage_id TEXT NOT NULL UNIQUE,revision_rowid INTEGER NOT NULL REFERENCES revisions(rowid),ordinal INTEGER NOT NULL,line_start INTEGER NOT NULL,line_end INTEGER NOT NULL,excerpt_sha256 TEXT NOT NULL,heading TEXT,chars INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS passages_revision ON passages(revision_rowid,ordinal);
CREATE VIRTUAL TABLE IF NOT EXISTS passage_search USING fts5(title,heading,body,path,content='',contentless_delete=1,tokenize='porter unicode61 remove_diacritics 2');
CREATE VIRTUAL TABLE IF NOT EXISTS file_search USING fts5(title,path,repository,content='',contentless_delete=1,tokenize='porter unicode61 remove_diacritics 2');
CREATE TABLE IF NOT EXISTS concepts(concept_id TEXT PRIMARY KEY,catalogue_id TEXT NOT NULL,name TEXT NOT NULL,record_type TEXT);
CREATE TABLE IF NOT EXISTS passage_concepts(passage_rowid INTEGER NOT NULL,concept_id TEXT NOT NULL,PRIMARY KEY(concept_id,passage_rowid)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS notices(cursor INTEGER PRIMARY KEY,kind TEXT NOT NULL,revision_id TEXT NOT NULL,supersedes TEXT,reason TEXT NOT NULL,repository TEXT NOT NULL,commit_sha TEXT NOT NULL,path TEXT NOT NULL,file_sha256 TEXT NOT NULL,at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY,kind TEXT NOT NULL,state TEXT NOT NULL,position TEXT,started_at TEXT,updated_at TEXT,data TEXT);
`;

export function openStore(file){
 if(file!==':memory:')mkdirSync(path.dirname(file),{recursive:true});
 const db=new DatabaseSync(file);db.exec('PRAGMA journal_mode=WAL');db.exec('PRAGMA foreign_keys=ON');db.exec('PRAGMA busy_timeout=5000');db.exec(SCHEMA);
 const get=k=>db.prepare('SELECT value FROM meta WHERE key=?').get(k)?.value??null,set=(k,v)=>db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(k,String(v));
 const schema=get('schemaVersion');if(schema&&schema!==STORE_SCHEMA)throw Error('This store uses '+schema+'; migrate it explicitly.');
 if(!get('storeId')){set('storeId',randomUUID());set('schemaVersion',STORE_SCHEMA);set('createdAt',new Date().toISOString());}
 const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}};
 return {db,get,set,tx,storeId:get('storeId'),
  cursor:()=>Number(db.prepare('SELECT COALESCE(MAX(cursor),0) c FROM notices').get().c),
  // Notices are append-only with contiguous cursors; they describe changes after the baseline build.
  notice(n){const cursor=this.cursor()+1;db.prepare('INSERT INTO notices(cursor,kind,revision_id,supersedes,reason,repository,commit_sha,path,file_sha256,at) VALUES(?,?,?,?,?,?,?,?,?,?)').run(cursor,n.kind,n.revisionId,n.supersedes||null,n.reason,n.repository,n.commit,n.path,n.hash,n.at);return cursor;},
  close(){db.close();}};
}

// Remove a revision's passages from search (history and receipts stay in the tables).
export function unindexRevision(db,rowid){
 for(const p of db.prepare('SELECT rowid FROM passages WHERE revision_rowid=?').all(rowid))db.prepare('DELETE FROM passage_search WHERE rowid=?').run(p.rowid);
 db.prepare('DELETE FROM file_search WHERE rowid=?').run(rowid);
}
