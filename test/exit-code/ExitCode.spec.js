const { createParser, Command } = require('../../src')

const parser = createParser()
parser.addCommand(
  new Command('printFile', 'Print a file').withPositional({ key: 'path', description: 'Path to file', required: true }),
)

it('should set exit code to 2 if command is not found', async () => {
  process.exitCode = 0
  await parser.parse(['print'])
  expect(process.exitCode).toBe(2)
  process.exitCode = 0
})

it('should set exit code to 2 if required argument is missing', async () => {
  process.exitCode = 0
  await parser.parse(['printFile'])
  expect(process.exitCode).toBe(2)
  process.exitCode = 0
})

it('should set exit code to 2 if unexpected option is found', async () => {
  process.exitCode = 0
  await parser.parse(['printFile', 'README.md', '--verbose'])
  expect(process.exitCode).toBe(2)
  process.exitCode = 0
})

it('should set exit code to 0 if all is well', async () => {
  process.exitCode = 0
  await parser.parse(['printFile', 'README.md'])
  expect(process.exitCode).toBe(0)
  process.exitCode = 0
})

it('should allow setting custom exit code for parsing errors', async () => {
  process.exitCode = 0
  const customParser = createParser({
    exitCodeForParsingErrors: 122,
  })
  customParser.addCommand(
    new Command('printFile', 'Print a file').withPositional({
      key: 'path',
      description: 'Path to file',
      required: true,
    }),
  )
  await customParser.parse(['printFile', 'README.md', 'LICENSE.md'])
  expect(process.exitCode).toBe(122)
  process.exitCode = 0
})
