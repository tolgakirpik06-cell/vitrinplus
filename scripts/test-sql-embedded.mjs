/** Optional local PostgreSQL WASM runner. No network/database credentials are used.
 * npm install --prefix node_modules/.vp-sql-runtime --no-save --package-lock=false @electric-sql/pglite
 * node scripts/test-sql-embedded.mjs
 * Multi-connection locking tests still require native PostgreSQL via run-local.sh.
 */
import fs from 'node:fs';
import { PGlite } from '../node_modules/.vp-sql-runtime/node_modules/@electric-sql/pglite/dist/index.js';
let passed = 0;
const db = new PGlite({ onNotice: notice => { if (notice.message?.startsWith('PASS:')) { passed++; console.log(notice.message); } } });
const executeFile = async file => {
  const sql = fs.readFileSync(file, 'utf8').replace(/^\\.*$/gm, '');
  console.log(`SQL: ${file}`);
  // psql executes one statement at a time; preserve transaction boundaries in its fixtures.
  const tokens = /(\$(?:[A-Za-z_]\w*)?\$)[\s\S]*?\1|'(?:''|[^'])*'|"(?:""|[^"])*"|--[^\n]*|\/\*[\s\S]*?\*\/|;/g;
  let start = 0;
  for (const match of sql.matchAll(tokens)) {
    if (match[0] !== ';') continue;
    const statement = sql.slice(start, match.index + 1);
    start = match.index + 1;
    try {
      await db.exec(statement);
      passed += [...statement.matchAll(/perform test\.ok\(/g)].length;
    } catch (error) {
      console.error({ message: error.message, hint: error.hint, where: error.where, statement: statement.slice(0, 1500) });
      process.exitCode = 1;
      throw new Error('SQL test failed; see diagnostic above.');
    }
  }
};
try {
  await executeFile('supabase/tests/00_supabase_shim.sql');
  for (const name of fs.readdirSync('supabase/migrations').filter(n => n.endsWith('.sql')).sort()) await executeFile(`supabase/migrations/${name}`);
  for (const name of ['10_rules.test.sql','30_seller_documents.test.sql','40_production_catalog.test.sql']) await executeFile(`supabase/tests/${name}`);
  console.log(`PASS: ${passed} SQL checks (embedded PostgreSQL; multi-connection suite excluded)`);
} finally { await db.close(); }
