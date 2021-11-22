const { createParser, Command } = require('../../src')

const parser = createParser()
parser.addCommand(
  new Command('upload-file', 'Upload file')
    .withPositional({ key: 'hash', description: 'Hash', required: true })
    .withOption({ key: 'key', description: 'Encryption key' }),
)
parser.addCommand(
  new Command('upload', 'Upload file or folder', null, {
    sibling: 'upload-file',
  }),
)
parser.addGlobalOption({
  key: 'progress',
  description: 'Track progress',
  type: 'boolean',
})

it('should apply option and global option to parent and sibling', async () => {
  const context = await parser.parse(['upload', 'f1755b85d79285f1'], {
    globalOptions: {
      progress: true,
    },
    upload: {
      key: 'bcb7e3d71f08df82',
    },
  })
  expect(context).toHaveProperty('options.progress', true)
  expect(context).toHaveProperty('sibling.arguments.hash', 'f1755b85d79285f1')
  expect(context).toHaveProperty('sibling.options.key', 'bcb7e3d71f08df82')
  expect(context).toHaveProperty('sibling.options.progress', true)
})
