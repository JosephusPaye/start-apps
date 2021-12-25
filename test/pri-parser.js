const fs = require('fs');
const Parser = require('binary-parser').Parser;

const priSection = new Parser()
  .endianess('little')
  .string('sectionIdentifier', {
    length: 16,
  })
  .uint32('sectionQualifier')
  .uint16('flags')
  .uint16('sectionFlags')
  .uint32('sectionLength')
  .uint32('unknownConstant', { assert: 0 })
  .saveOffset('currentOffset')
  .seek(function() {
    return this.sectionLength -
  })

const priTocEntry = new Parser()
  .endianess('little')
  .string('sectionIdentifier', {
    length: 16,
  })
  .uint16('flags')
  .uint16('sectionFlags')
  .uint32('sectionQualifier')
  .uint32('sectionOffset')
  .uint32('sectionLength')
  .pointer('section', {

  })

const priFile = new Parser()
  .endianess('little')
  .string('magic', {
    length: 8,
  })
  .uint16('unknownConstantA', { assert: 0 })
  .uint16('unknownConstantB', { assert: 1 })
  .uint32('totalFileSize')
  .uint32('tocOffset')
  .uint32('sectionStartOffset')
  .uint16('numSections')
  .uint16('unknownConstantC', { assert: 0xffff })
  .uint32('unknownConstantD', { assert: 0 })
  .saveOffset('currentOffset')
  // Skip to the trailer
  .seek(function () {
    const trailerOffset = this.totalFileSize - 16; // The trailer is 16 bytes from the end of the file
    const trailerOffsetRelative = trailerOffset - this.currentOffset;
    return trailerOffsetRelative;
  })
  // Validate the trailer
  .uint32('unknownConstantE', { assert: 0xdefffade })
  .uint32('totalFileSizeConfirmation', {
    assert(parsed) {
      return parsed.totalFileSize === parsed.totalFileSizeConfirmation;
    },
  })
  .string('magicConfirmation', {
    length: 8,
    assert(parsed) {
      return parsed.magic === parsed.magicConfirmation;
    }
  })
  .saveOffset('currentOffset')
  // Skip back to the TOC
  .seek(function () {
    return this.tocOffset - this.currentOffset;
  })
  // Parse the TOC
  .array('tocEntries', {
    type: priTocEntry,
    length: 'numSections',
  })
// .bit4("headerLength")
// .uint8("tos")
// .uint16("packetLength")
// .uint16("id")
// .bit3("offset")
// .bit13("fragOffset")
// .uint8("ttl")
// .uint8("protocol")
// .uint16("checksum")
// .array("src", {
//   type: "uint8",
//   length: 4
// })
// .array("dst", {
//   type: "uint8",
//   length: 4
// });

async function readFileIntoBuffer(filePath) {
  return new Promise((resolve, reject) => {
    const buffer = [];
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => {
      buffer.push(chunk);
    });
    stream.on('end', () => {
      resolve(Buffer.concat(buffer));
    });
    stream.on('error', (err) => {
      reject(err);
    });
  });
  // const file = await fs.promises.readFile(filePath, {
  //   encoding: 'binary',
  // });

  // return Buffer.from(file, { encoding: 'binary' });
}

async function main() {
  const buf = await readFileIntoBuffer(
    'C:/Windows/SystemResources/Windows.UI.SettingsAppThreshold/pris/Windows.UI.SettingsAppThreshold.en-US.pri'
  );

  const parsed = priFile.parse(buf);

  const pri = {
    version: '',
  };

  let version = parsed.magic.toString();
  switch (version) {
    case 'mrm_pri0':
    case 'mrm_pri1':
    case 'mrm_pri2':
    case 'mrm_prif':
      pri.version = version;
      break;
    default:
      throw new Error('Data does not start with a PRI file header.');
  }

  // Parse buffer and show result
  console.log(pri, parsed);
}

main();
