const { createParser, Command } = require('../../src')

const parser = createParser()
parser.addCommand(
  new Command('copy', 'Copy file')
    .withPositional({
      key: 'source',
      description: 'Source file',
      required: true,
    })
    .withPositional({
      key: 'destination',
      description: 'Destination file',
      required: true,
    }),
)

it('should align argument descriptions', () => {
  process.stdout.write = jest.fn()
  parser.parse(['copy'])
  const calls = process.stdout.write.mock.calls
  expect(calls[8][0]).toContain('source        Source file')
  expect(calls[9][0]).toContain('destination   Destination file')
})
