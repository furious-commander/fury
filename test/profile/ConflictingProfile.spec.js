const { createParser, Command } = require('../../src')

const parser = createParser()
parser.addCommand(
  new Command('upload', 'Upload file')
    .withPositional({ key: 'path', description: 'File path', required: true })
    .withOption({ key: 'ssh', description: 'Use ssh', type: 'boolean', conflicts: 'ftp' })
    .withOption({ key: 'ftp', description: 'Use ftp', type: 'boolean', conflicts: 'ssh' }),
)

it('should not apply second option if it is conflicting', async () => {
  const context = await parser.parse(['upload', 'images.tar.gz'], {
    upload: {
      ftp: true,
      ssh: true,
    },
  })
  expect(context).toHaveProperty('options.ftp', true)
  expect(context).toHaveProperty('options.ssh', undefined)
})

it('should not apply profile option if conflicting is set explicitly', async () => {
  const context = await parser.parse(['upload', 'images.tar.gz', '--ftp'], {
    upload: {
      ssh: true,
    },
  })
  expect(context).toHaveProperty('options.ftp', true)
  expect(context).toHaveProperty('options.ssh', undefined)
  expect(context.sourcemap).toHaveProperty('ftp', 'explicit')
  expect(context.sourcemap).toHaveProperty('ssh', undefined)
})
