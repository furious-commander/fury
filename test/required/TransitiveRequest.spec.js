const { createParser, Command } = require('../../src')

const parser = createParser()
parser.addCommand(
  new Command('upload')
    .withPositional({ key: 'path', required: true, conflicts: 'stdin' })
    .withOption({ key: 'stdin', type: 'boolean', conflicts: 'path' }),
)

it('should not conflict when option when positional is passed', async () => {
  const context = await parser.parse(['upload', 'README.md'])
  expect(context).toHaveProperty('arguments.path', 'README.md')
})

it('should not require positional when option is passed', async () => {
  const context = await parser.parse(['upload', '--stdin'])
  expect(context).toHaveProperty('options.stdin', true)
})

it('should not misinterpret positional when option is passed with explicit boolean', async () => {
  const context = await parser.parse(['upload', '--stdin', 'true'])
  expect(context).toHaveProperty('options.stdin', true)
})

it('should not conflict when option is set to false with explicit boolean', async () => {
  const context = await parser.parse(['upload', 'README.md', '--stdin', 'false'])
  expect(context).toHaveProperty('arguments.path', 'README.md')
  expect(context).toHaveProperty('options.stdin', false)
})

it('should throw error when both argument and options are passed', async () => {
  const context = await parser.parse(['upload', 'README.md', '--stdin'])
  expect(context).toBe('[stdin] and [path] are incompatible, please only specify one')
})

it('should throw error when both argument and options are passed in reverse order', async () => {
  const context = await parser.parse(['upload', '--stdin', 'README.md'])
  expect(context).toBe('[stdin] and [path] are incompatible, please only specify one')
})
