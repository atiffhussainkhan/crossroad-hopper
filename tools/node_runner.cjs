// Execute browser scripts as globals, matching JSC's load() and print().
// Requiring the game modules would incorrectly wrap them in CommonJS scopes.
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const context = vm.createContext({});
context.print = (...args) => fs.writeSync(1, args.map(String).join(" ") + "\n");
context.console = { log: context.print, warn: context.print, error: context.print };
context.load = (...files) => {
  for (const file of files) {
    const filename = path.resolve(file);
    vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
  }
};
try {
  context.load(...process.argv.slice(2));
} catch (error) {
  fs.writeSync(2, String(error.stack || error) + "\n");
  process.exitCode = 1;
}
