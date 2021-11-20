const { createParser, Command } = require('../../src')

const parser = createParser()
parser.addCommand(
  new Command('download-file', 'Download file')
    .withPositional({ key: 'hash', description: 'Hash', required: true })
    .withOption({ key: 'key', description: 'Decryption key' }),
)
parser.addCommand(
  new Command('download', 'Download file or folder', null, {
    sibling: 'download-file',
  }),
)

it('should apply option from profile to sibling', async () => {
  const context = await parser.parse(['download', 'f514f8eede74cb72'], {
    download: {
      key: '72cab1a8ae29b34a',
    },
  })
  expect(context).toHaveProperty('sibling.arguments.hash', 'f514f8eede74cb72')
  expect(context).toHaveProperty('sibling.options.key', '72cab1a8ae29b34a')
})

it('should not apply option from parent sibling profile', async () => {
  const context = await parser.parse(['download-file', 'f514f8eede74cb72'], {
    download: {
      key: '72cab1a8ae29b34a',
    },
  })
  expect(context).toHaveProperty('arguments.hash', 'f514f8eede74cb72')
  expect(context).toHaveProperty('options.key', undefined)
})
