const { createParser, Command } = require('../../src')

const parser = createParser()
parser.addCommand(
  new Command('http-get', 'Send HTTP GET request').withPositional({ key: 'url', description: 'URL', required: true }),
)
parser.addGlobalOption({
  key: 'header',
  description: 'Additional HTTP header',
})

it('should not apply global option with empty profile', async () => {
  const context = await parser.parse(['http-get', 'http://localhost:8080'], {})
  expect(context).toHaveProperty('options.header', undefined)
})

it('should apply global option from profile', async () => {
  const context = await parser.parse(['http-get', 'http://localhost:8080'], {
    globalOptions: {
      header: 'Authorization: 4a718a3e8e9591208cb6',
    },
  })
  expect(context).toHaveProperty('options.header', 'Authorization: 4a718a3e8e9591208cb6')
  expect(context.sourcemap).toHaveProperty('header', 'profile')
})
