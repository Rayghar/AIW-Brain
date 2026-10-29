// Reading a brief file in the browser (round 4, Contract 1: a brief typed or uploaded). readBrief(file) returns
// {text, hash, kind, bytes}: the text a brief is interpreted from, the SHA-256 of the file's bytes, its kind and size.
// .txt and .md are read as UTF-8 (a byte that is not UTF-8 is refused, never replaced); .docx is read through the
// bounded OOXML reader of the requirement intake (public/workbook-reader.js: the same 12 MB, entry and expanded-size
// limits and integrity checks), from word/document.xml only: its paragraphs and list items, one per line, list items
// prefixed "- ". No relationship is followed, so headers, footers, comments, notes, embedded objects, links and
// images are not read; deleted tracked text and field codes are not text. A PDF is not read in this version.
// The bytes never leave the browser: the page sends the text, and the file's name, hash, kind and size.
//
// A model file (round 6, Contract I): readModelFile(file) reads a Structurizr DSL (.dsl), an ArchiMate exchange file or
// Archi file (.xml, .archimate), BPMN (.bpmn), draw.io (.drawio, .xml), Mermaid (.mmd, .mermaid), PlantUML (.puml,
// .plantuml), a MADR record (.md) or plain text (.txt) as UTF-8, up to MODEL_TEXT_LIMIT characters, and returns the
// same {text, hash, kind, bytes} with `inflated`: a compressed draw.io diagram is decoded here so that the text the
// project keeps is the readable XML (model-interpreter.js inflateModelText). Nothing is interpreted here.
import {openArchive, sha256, unescapeXML, WORKBOOK_LIMITS} from './workbook-reader.js';

export const BRIEF_FILE_KINDS = Object.freeze({txt: 'txt', text: 'txt', md: 'md', markdown: 'md', docx: 'docx'});
export const BRIEF_FILE_ACCEPT = '.txt,.md,.markdown,.docx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const MODEL_FILE_KINDS = Object.freeze({dsl: 'dsl', xml: 'xml', archimate: 'archimate', bpmn: 'bpmn', drawio: 'drawio', mmd: 'mmd', mermaid: 'mermaid', puml: 'puml', plantuml: 'plantuml', md: 'md', markdown: 'md', txt: 'txt'});
export const MODEL_FILE_ACCEPT = '.dsl,.xml,.archimate,.bpmn,.drawio,.mmd,.mermaid,.puml,.plantuml,.md,.txt,text/plain,application/xml,text/xml';
// 2 MB of text: the model interpreter reads up to 2,000,000 characters (MODEL_LIMIT), and the project keeps the text.
export const MODEL_TEXT_LIMIT = 2 * 1024 * 1024;
const utf8 = new TextDecoder('utf-8', {fatal: true});

export async function readModelFile(file) {
  if (!file || typeof file.arrayBuffer !== 'function') throw Error('Choose a model file.');
  const extension = String(file.name || '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
  const kind = MODEL_FILE_KINDS[extension];
  if (!kind) throw Error('Choose a .dsl, .xml, .archimate, .bpmn, .drawio, .mmd, .puml or .md model file.');
  if (file.size > MODEL_TEXT_LIMIT) throw Error('Choose a model file up to 2 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > MODEL_TEXT_LIMIT) throw Error('Choose a model file up to 2 MB.');
  if (!bytes.length) throw Error('This file is empty.');
  let text = plainText(bytes).replace(/^﻿/, ''), inflated = 0, note = '';
  if (kind === 'drawio' || (kind === 'xml' && /<mxfile\b|<diagram\b/.test(text.slice(0, 4000)))) {
    const {inflateModelText} = await import('./model-interpreter.js');
    const r = await inflateModelText(text);
    text = r.text; inflated = r.inflated; note = r.note;
    if (text.length > MODEL_TEXT_LIMIT) throw Error('The decompressed diagram is larger than 2 MB.');
  }
  return {text, hash: await sha256(bytes), kind, bytes: bytes.length, inflated, note};
}

export async function readBrief(file) {
  if (!file || typeof file.arrayBuffer !== 'function') throw Error('Choose a brief file.');
  const extension = String(file.name || '').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || '';
  if (extension === 'pdf' || file.type === 'application/pdf') throw Error('PDF is not read in this version; paste the text or upload .docx, .md or .txt');
  const kind = BRIEF_FILE_KINDS[extension];
  if (!kind) throw Error('Choose a .txt, .md or .docx brief.');
  if (file.size > WORKBOOK_LIMITS.bytes) throw Error('Choose a brief file up to 12 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > WORKBOOK_LIMITS.bytes) throw Error('Choose a brief file up to 12 MB.');
  if (!bytes.length) throw Error('This file is empty.');
  const text = kind === 'docx' ? await documentText(bytes) : plainText(bytes);
  return {text, hash: await sha256(bytes), kind, bytes: bytes.length};
}

function plainText(bytes) {
  let text;
  try { text = utf8.decode(bytes); } catch { throw Error('This file is not UTF-8 text. Save it as UTF-8 and choose it again.'); }
  if (text.includes('\u0000')) throw Error('This file does not hold plain text.');
  return text.replace(/\r\n?/g, '\n');
}

// The paragraphs of word/document.xml, in order. A paragraph is <w:p>…</w:p>; its text is its <w:t> runs, a <w:tab/>
// is a tab and a <w:br/> or <w:cr/> a line break. A paragraph whose properties carry <w:numPr> is a list item.
export async function documentText(bytes) {
  const {read} = openArchive(bytes, 'document');
  const xml = await read('word/document.xml');
  const body = /<w:body\b[^>]*>([\s\S]*)<\/w:body>/.exec(xml)?.[1];
  if (body == null) throw Error('This document has no readable body. Save it as a .docx document and choose it again.');
  const out = [];
  for (const p of body.matchAll(/<w:p\b[^>]*?(?:\/>|>([\s\S]*?)<\/w:p>)/g)) {
    const inner = p[1] || '', listed = /<w:numPr\b/.test(/<w:pPr\b[\s\S]*?<\/w:pPr>/.exec(inner)?.[0] || '');
    let line = '';
    for (const r of inner.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:(?:br|cr)\b[^>]*\/>/g)) {
      if (r[1] !== undefined) {
        try { line += unescapeXML(r[1]); } catch { throw Error('This document holds a character reference that is not valid.'); }
      } else line += r[0].startsWith('<w:tab') ? '\t' : '\n';
    }
    line = line.replace(/[ \t]+$/gm, '');
    if (line.trim()) out.push((listed ? '- ' : '') + line);
    else if (out.length && out.at(-1) !== '') out.push('');
  }
  while (out.at(-1) === '') out.pop();
  return out.join('\n');
}
