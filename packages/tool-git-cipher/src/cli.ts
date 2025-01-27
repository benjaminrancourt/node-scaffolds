import {
  createProgram,
  logger,
  mountSubCommandCat,
  mountSubCommandDecrypt,
  mountSubCommandEncrypt,
  mountSubCommandInit,
  mountSubCommandTree,
  mountSubCommandVerify,
} from '.'

const program = createProgram()

// mount sub-command: cat
mountSubCommandCat(program)

// mount sub-command: decrypt
mountSubCommandDecrypt(program)

// mount sub-command: encrypt
mountSubCommandEncrypt(program)

// mount sub-command: init
mountSubCommandInit(program)

// mount sub-command: tree
mountSubCommandTree(program)

// mount sub-command:verify
mountSubCommandVerify(program)

program.parseAsync(process.argv).catch(error => logger.error(error))
