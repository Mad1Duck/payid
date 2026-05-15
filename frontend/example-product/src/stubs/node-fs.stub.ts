// Browser stub for Node.js 'fs' and 'fs/promises'.
// The 0G Storage SDK imports these at load time but only calls them in
// Node.js-only code paths (ZgFile.fromFilePath, appendFileSync, etc.).
// We never invoke those paths in the browser — only MemData is used.
const notAvailable = (name: string) => () => {
  throw new Error(`${name} is not available in the browser`)
}

const fsMock = {
  promises: {
    readFile: notAvailable('fs.promises.readFile'),
    writeFile: notAvailable('fs.promises.writeFile'),
    stat: notAvailable('fs.promises.stat'),
    mkdir: notAvailable('fs.promises.mkdir'),
    open: notAvailable('fs.promises.open'),
  },
  readFileSync: notAvailable('fs.readFileSync'),
  writeFileSync: notAvailable('fs.writeFileSync'),
  appendFileSync: notAvailable('fs.appendFileSync'),
  statSync: notAvailable('fs.statSync'),
  existsSync: () => false,
  createWriteStream: notAvailable('fs.createWriteStream'),
  createReadStream: notAvailable('fs.createReadStream'),
}

export const promises = fsMock.promises
export const readFileSync = fsMock.readFileSync
export const writeFileSync = fsMock.writeFileSync
export const appendFileSync = fsMock.appendFileSync
export const statSync = fsMock.statSync
export const existsSync = fsMock.existsSync
export const createWriteStream = fsMock.createWriteStream
export const createReadStream = fsMock.createReadStream

export default fsMock
