// Type-check the baseline in place of the live service without editing src or dist.
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'tsconfig.build.json');
const config = ts.readConfigFile(configPath, ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const target = path.join(root, 'src/villages/villages.service.ts');
const baseline = fs.readFileSync(path.join(__dirname, 'baseline/villages.service.ts.txt'), 'utf8');
const options = { ...parsed.options, noEmit: true, incremental: false };
const host = ts.createCompilerHost(options);
const read = host.readFile.bind(host);
host.readFile = file => path.resolve(file).toLowerCase() === target.toLowerCase() ? baseline : read(file);
const program = ts.createProgram(parsed.fileNames, options, host);
const errors = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)];
if (errors.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(errors, {
    getCanonicalFileName: f => f, getCurrentDirectory: () => root, getNewLine: () => '\n',
  }));
  process.exitCode = 1;
} else console.log('Baseline type-check passed against current shared code; live source was not modified.');
