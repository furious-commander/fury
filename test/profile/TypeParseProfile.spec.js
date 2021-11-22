const { createParser, Command } = require('../../src')

const parser = createParser()
parser.addCommand(
  new Command('rerun', 'Rerun a command multiple times')
    .withOption({ key: 'command', description: 'Command', required: true })
    .withOption({ key: 'fail-fast', description: 'Exit on first failure', type: 'boolean' })
    .withOption({ key: 'iterations', description: 'Number of times to run', type: 'number' }),
)

it('should parse all option types from profiles', async () => {
  const context = await parser.parse(['rerun'], {
    rerun: {
      command: 'ps aux',
      'fail-fast': 'true',
      iterations: '8',
    },
  })
  expect(context).toHaveProperty('options.command', 'ps aux')
  expect(context).toHaveProperty('options.fail-fast', true)
  expect(context).toHaveProperty('options.iterations', 8)
  expect(context).toHaveProperty('profileErrors', [])
})

it('should ignore and report profile parsing errors', async () => {
  const context = await parser.parse(['rerun', '--command', 'df -h'], {
    rerun: {
      iterations: 'true',
    },
  })
  expect(context).toHaveProperty('options.iterations', undefined)
  expect(context).toHaveProperty('profileErrors', ['Expected number for iterations, got true'])
})
