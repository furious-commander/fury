const { createParser, Command } = require('../../src')

const parser = createParser()
parser.addCommand(
  new Command('echo', 'Print string').withPositional({ key: 'string', description: 'String', required: true }),
)

it('should not modify original profile', async () => {
  const originalProfileObject = {}
  await parser.parse(['echo', 'cafe'], originalProfileObject)
  expect(originalProfileObject).toStrictEqual({})
})
