// AIW rc44, work package wp2: applied patterns bound to the model (audit/rc44/design/wp2-adoption.md). One suite, one
// case file per slice in rc44-wp2-adoption-cases/ (a slice owns its file, so parallel slices do not edit the same
// lines), fixtures in rc44-wp2-fixtures.mjs. The package registers at the shared registration point of slice S0
// (public/design-extensions.js) as p40-adoption; the server registers it when worker.js is imported.
// Run: npm run test:rc44-wp2-adoption        one block: AIW_WP2_ONLY=upgrade,accept        more of a failure: AIW_WP2_VERBOSE=1
const checks = [], failed = [];
const ONLY = process.env.AIW_WP2_ONLY ? process.env.AIW_WP2_ONLY.split(',') : null;
const pass = n => { checks.push(n); console.log('PASS ' + n); };
const block = async (name, fn) => { if (ONLY && !ONLY.some(x => name.startsWith(x))) return; try { await fn(); } catch (e) { failed.push(name); console.log('FAIL ' + name + ': ' + String(e?.stack || e?.message || e).split('\n').slice(0, process.env.AIW_WP2_VERBOSE ? 40 : 5).join(' | ')); } };
// A module of the package, or a stand-in that says it is not there: each case then fails on its own, in words.
const load = async path => { try { return await import(path); } catch (e) { if (e?.code !== 'ERR_MODULE_NOT_FOUND') throw e; return new Proxy({}, {get: (_, k) => (k === 'then' ? undefined : () => { throw Error(path + ' does not exist yet (' + String(k) + ')'); })}); } };
for (const slice of ['record']) await (await import('./rc44-wp2-adoption-cases/' + slice + '.mjs')).default({block, pass, load});
if (failed.length) { console.log('\nrc44 wp2 adoption: ' + failed.length + ' block(s) failed: ' + failed.join(', ')); process.exit(1); }
console.log('\nrc44 wp2 adoption: ' + checks.length + ' checks pass');
process.exit(0);
