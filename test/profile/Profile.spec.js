const { createParser, Command } = require('../../src')

const parser = createParser()
parser.addCommand(
  new Command('echohash', 'Prints a hash')
    .withPositional({ key: 'hash', description: 'Hash', required: true })
    .withOption({ key: 'qr', description: 'Print QR', type: 'boolean' })
    .withOption({ key: 'cid', description: 'Print CID', type: 'boolean' }),
)

it('should apply no options from empty profile', async () => {
  const context = await parser.parse(['echohash', '0xcafebabe'], {})
  expect(context).toHaveProperty('options', {})
})

it('should apply option from profile', async () => {
  const context = await parser.parse(['echohash', '0xcafebabe'], {
    echohash: {
      qr: true,
    },
  })
  expect(context).toHaveProperty('options.qr', true)
  expect(context).toHaveProperty('options.cid', undefined)
  expect(context).toHaveProperty('sourcemap.qr', 'profile')
})

it('should allow overriding values from profile', async () => {
  const context = await parser.parse(['echohash', '0xcafebabe', '--qr', 'false'], {
    echohash: {
      qr: true,
    },
  })
  expect(context).toHaveProperty('options.qr', false)
  expect(context).toHaveProperty('options.cid', undefined)
  expect(context).toHaveProperty('sourcemap.qr', 'explicit')
})
