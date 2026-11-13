const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const root = path.resolve(__dirname, '..');
function filesIn(folder) {
  return fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? filesIn(path.join(folder, entry.name)) : [path.join(folder, entry.name)]);
}
const files = filesIn(path.join(root, 'src')).filter(file => file.endsWith('.js'));
const errors = [];
function checkImport(file, value) {
  if (!value.startsWith('.')) return;
  const target = path.resolve(path.dirname(file), value);
  if (![target, ...['.js', '.json', '/index.js'].map(ext => target + ext)].some(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())) {
    errors.push(`${path.relative(root, file)}: unresolved ${value}`);
  }
}
for (const file of files) {
  try {
    const ast = parser.parse(fs.readFileSync(file, 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
    traverse(ast, {
      ImportDeclaration({ node }) { checkImport(file, node.source.value); },
      CallExpression({ node }) {
        if (node.callee.name === 'require' && node.arguments[0]?.type === 'StringLiteral') checkImport(file, node.arguments[0].value);
      },
    });
  } catch (error) { errors.push(`${path.relative(root, file)}: ${error.message}`); }
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Checked syntax and local imports/assets in ${files.length} source files.`);
