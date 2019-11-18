Object.defineProperty(process, 'stdout', {
    configurable: true,
    enumerable: true,
    get: () => require('fs').createWriteStream('stdout'),
  });

  Object.defineProperty(process, 'stderr', {
    configurable: true,
    enumerable: true,
    get: () => require('fs').createWriteStream('stderr')
  });

const Console = global.console.Console;
var console = global.console = new Console(process.stdout, process.stderr);
console.log("foo"); 
console.log('kek');