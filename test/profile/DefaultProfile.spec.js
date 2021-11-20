const { createParser, Command } = require('../../src')

const parser = createParser()
parser.addCommand(
  new Command('whisper', 'Send private message')
    .withPositional({ key: 'message', description: 'Message', required: true })
    .withOption({
      key: 'topic',
      description: 'Topic hash',
      default: '0'.repeat(32),
      conflicts: 'topic-string',
    })
    .withOption({ key: 'topic-string', description: 'Topic string, will be hashed', conflicts: 'topic' }),
)

it('should not override profile option with default value', async () => {
  const context = await parser.parse(['whisper', 'hello'], {
    whisper: {
      topic: 'f6df608dc2b58d498c90f0fe2a461600',
    },
  })
  expect(context).toHaveProperty('options.topic', 'f6df608dc2b58d498c90f0fe2a461600')
})

it('should not add conflicting default value', async () => {
  const context = await parser.parse(['whisper', 'hello'], {
    whisper: {
      'topic-string': 'main',
    },
  })
  expect(context).toHaveProperty('options.topic', undefined)
  expect(context).toHaveProperty('options.topic-string', 'main')
})
