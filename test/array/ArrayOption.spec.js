const { createParser, Command } = require('../../src')

const parser = createParser()
parser.addCommand(
  new Command('curl').withOption({
    key: 'header',
    alias: 'H',
    description: 'Set header',
    type: 'string',
    array: true,
  }),
)

it('should create empty array', async () => {
  const context = await parser.parse(['curl'])
  expect(context).toHaveProperty('options.header', [])
})

it('should create add item to array via long option', async () => {
  const context = await parser.parse(['curl', '--header', 'Authorization: 1337'])
  expect(context).toHaveProperty('options.header', ['Authorization: 1337'])
})

it('should create add item to array via alias', async () => {
  const context = await parser.parse(['curl', '-H', 'Content-Type: application/json'])
  expect(context).toHaveProperty('options.header', ['Content-Type: application/json'])
})

it('should add two items to array in mixed way', async () => {
  const context = await parser.parse([
    'curl',
    '--header',
    'Authorization: 1337',
    '-H',
    'Content-Type: application/json',
  ])
  expect(context).toHaveProperty('options.header', ['Authorization: 1337', 'Content-Type: application/json'])
})
