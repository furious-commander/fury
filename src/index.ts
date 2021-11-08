import {
  findCommandByFullPath,
  findGroupAndCommand,
  findLongOption,
  findOption,
  isOption,
  isOptionPassed,
} from './argv'
import { parseValue } from './parse'
import { completePath } from './path'
import {
  createDefaultApplication,
  createDefaultPrinter,
  getHeadlineMessage,
  maybePrintOptionFamily,
  printCommands,
  printCommandUsage,
  printGroups,
  printUsage,
} from './print'
import { detectShell, generateCompletion, getShellPaths } from './shell'
import { suggest } from './suggest'
import {
  Application,
  Argument,
  Command,
  CommandConstructor,
  Context,
  Group,
  GroupCommand,
  LeafCommand,
  ParsedContext,
  Parser,
  Printer,
} from './type'

function findOptionTargets(context: ParsedContext, option: Argument): Record<string, unknown>[] {
  if (option.global) {
    return context.sibling ? [context.options, context.sibling.options] : [context.options]
  } else {
    const targets = []

    if (findLongOption(context.command.options, option.key)) {
      targets.push(context.options)
    }

    if (context.sibling && findLongOption(context.sibling.command.options, option.key)) {
      targets.push(context.sibling.options)
    }

    return targets
  }
}

function findArgumentTarget(context: Context, commandArguments: Argument[]) {
  if (context.sibling && context.argumentIndex < context.sibling.command.arguments.length) {
    return context.sibling.arguments
  } else if (context.argumentIndex < commandArguments.length) {
    return context.arguments
  }
}

export function createParser(options?: {
  printer?: Printer
  application?: Application
  pathResolver?: (string: string) => Promise<string[]>
  exitCodeForParsingErrors?: number
}): Parser {
  const printer = (options && options.printer) || createDefaultPrinter()
  const application = (options && options.application) || createDefaultApplication()
  const pathResolver = (options && options.pathResolver) || completePath
  const exitCodeForParsingErrors = (options && options.exitCodeForParsingErrors) || 2
  const groups: Group[] = []
  const commands: Command[] = []
  const globalOptions: Argument[] = []
  const handleError = (context: Context, reason: string, silent = false) => {
    if (!context.group && !context.command) {
      printer.print(getHeadlineMessage(application))
      printer.print('')
      printUsage(printer, application)
      printer.print('')
      printGroups(printer, application, groups)
      printCommands(printer, application, commands)
      maybePrintOptionFamily(printer, 'Global Options', globalOptions)
    } else if (!context.command && context.group) {
      printUsage(printer, application, context.group)
      printer.print('')
      printCommands(printer, application, context.group.commands)
      maybePrintOptionFamily(printer, 'Global Options', globalOptions)
    } else if (context.command) {
      const siblingOptions = context.sibling ? context.sibling.command.options : []
      const options = [...globalOptions, ...context.command.options, ...siblingOptions]
      const siblingArguments = context.sibling ? context.sibling.command.arguments : []
      const commandArguments = [...siblingArguments, ...context.command.arguments]
      printCommandUsage(printer, application, context.command, options, commandArguments)
    }

    if (!context.options.help && !silent) {
      printer.printHeading('Command failed with reason:')
      printer.print('')
      printer.printError(reason)
    }

    if (!context.options.help && process) {
      process.exitCode = exitCodeForParsingErrors
    }

    return reason
  }

  // eslint-disable-next-line complexity
  function populate(argv: string[], context: ParsedContext) {
    const sibling = context.command.sibling
      ? findCommandByFullPath(groups, commands, context.command.sibling)
      : undefined

    if (context.command.sibling && !sibling) {
      return handleError(context, 'Expected sibling command not found!')
    }

    if (sibling) {
      context.sibling = {
        command: sibling,
        arguments: {},
        options: {},
      }
    }
    const siblingOptions = sibling ? sibling.options : []
    const options = [...globalOptions, ...context.command.options, ...siblingOptions]
    const siblingArguments = sibling ? sibling.arguments : []
    const commandArguments = [...siblingArguments, ...context.command.arguments]

    if (context.options.help) {
      printCommandUsage(printer, application, context.command, options, commandArguments)

      return { exitReason: 'help' }
    }
    const skipAmount = context.command.depth + 1
    for (let i = skipAmount; i < argv.length; i++) {
      const current = argv[i]
      const next = argv[i + 1]

      if (isOption(current)) {
        const option = findOption(options, current)

        if (!option) {
          return handleError(context, 'Unexpected option: ' + current)
        }
        const parseResult = parseValue(option, next)

        if (parseResult instanceof Error) {
          return handleError(context, parseResult.message)
        }
        const targets = findOptionTargets(context, option)
        for (const target of targets) {
          if (target[option.key] !== undefined) {
            return handleError(context, 'Option passed more than once: ' + option.key)
          }
          target[option.key] = parseResult.value
          context.sourcemap[option.key] = 'explicit'
        }
        i += parseResult.skip
      } else {
        const target = findArgumentTarget(context, commandArguments)

        if (!target) {
          return handleError(context, 'Unexpected argument: ' + current)
        }
        const argument = commandArguments[context.argumentIndex++]
        const parseResult = parseValue(argument, current)

        if (parseResult instanceof Error) {
          return handleError(context, parseResult.message)
        }
        target[argument.key] = parseResult.value
        context.sourcemap[argument.key] = 'explicit'
      }
    }
    for (const option of options) {
      if (!option.envKey) {
        continue
      }

      if (process.env[option.envKey] === undefined) {
        continue
      }
      const parseResult = parseValue(option, process.env[option.envKey] as string)

      if (parseResult instanceof Error) {
        return handleError(context, parseResult.message)
      }
      const targets = findOptionTargets(context, option)
      for (const target of targets) {
        if (target[option.key] !== undefined) {
          continue
        }
        target[option.key] = parseResult.value
        context.sourcemap[option.key] = 'env'
      }
    }
    context.argumentIndex = 0

    if (
      commandArguments.length !== 1 ||
      !commandArguments[0].conflicts ||
      context.sourcemap[commandArguments[0].conflicts] !== 'explicit'
    ) {
      for (const commandArgument of commandArguments) {
        const target = findArgumentTarget(context, commandArguments) as Record<string, unknown>
        context.argumentIndex++

        if (target[commandArgument.key] === undefined) {
          if (commandArgument.default !== undefined) {
            target[commandArgument.key] = commandArgument.default
            context.sourcemap[commandArgument.key] = 'default'
          } else if (commandArgument.required && !commandArgument.noErrors) {
            const silent = argv.join(' ') === context.command.fullPath

            return handleError(context, `Required argument [${commandArgument.key}] is not provided`, silent)
          }
        }
      }
    }
    for (const option of options) {
      const targets = findOptionTargets(context, option)

      if (option.default !== undefined && (!option.conflicts || context.options[option.conflicts] === undefined)) {
        for (const target of targets) {
          if (target[option.key] !== undefined) {
            continue
          }
          target[option.key] = option.default
          context.sourcemap[option.key] = 'default'
        }
      }

      if (
        option.conflicts &&
        context.options[option.key] &&
        (context.options[option.conflicts] || context.arguments[option.conflicts])
      ) {
        return handleError(
          context,
          `[${option.key}] and [${option.conflicts}] are incompatible, please only specify one`,
        )
      }

      if (option.required && !option.noErrors) {
        for (const target of targets) {
          const requiredWhen: string | undefined =
            typeof option.required === 'object' && 'when' in option.required ? option.required.when : undefined
          const requiredUnless: string | undefined =
            typeof option.required === 'object' && 'unless' in option.required ? option.required.unless : undefined

          if (
            (target[option.key] === undefined ||
              (context.sourcemap[option.key] === 'default' &&
                requiredWhen &&
                target[requiredWhen] &&
                context.sourcemap[requiredWhen] !== 'default')) &&
            (!option.conflicts || !target[option.conflicts]) &&
            (!requiredWhen || target[requiredWhen]) &&
            (!requiredUnless || !target[requiredUnless])
          ) {
            return handleError(context, 'Required option not provided: --' + option.key)
          }
        }
      }
    }

    return context
  }

  return {
    addGlobalOption: (option: Argument) => {
      option.global = true
      globalOptions.push(option)
    },
    addGroup: (group: Group) => {
      groups.push(group)
    },
    addCommand: (command: Command) => {
      commands.push(command)
    },
    suggest: (line: string, offset = 0, trailing = '') => {
      return suggest(line, offset, [...groups, ...commands], globalOptions, pathResolver, trailing)
    },
    parse: async (argv: string[]) => {
      const context: Context = {
        options: {},
        arguments: {},
        sourcemap: {},
        argumentIndex: 0,
      }
      const findResult = findGroupAndCommand(argv, groups, commands)
      context.group = findResult.group
      context.command = findResult.command
      for (const option of globalOptions) {
        if (isOptionPassed(argv, option)) {
          if (option.handler) {
            await option.handler()

            return { exitReason: option.key }
          }

          if (option.key === 'help') {
            context.options.help = true
          }
        }
      }

      if (!context.group && !context.command) {
        if (argv.join(' ') === '') {
          return handleError(context, 'No group or command specified', true)
        } else {
          return handleError(context, 'Not a valid group or command: ' + argv[0])
        }
      }

      if (context.group && !context.command) {
        if (argv.join(' ') === context.group.fullPath) {
          return handleError(context, `You need to specify a command in group [${context.group.key}]`, true)
        } else {
          const depth = context.group.fullPath.split(' ').length

          return handleError(context, 'Not a valid command in group [' + context.group.key + ']: ' + argv[depth])
        }
      }

      if (!context.command) {
        return handleError(context, 'No command found!')
      }

      return populate(argv, context as ParsedContext)
    },
  }
}

export {
  Group,
  Command,
  Argument,
  Parser,
  Context,
  detectShell,
  getShellPaths,
  generateCompletion,
  LeafCommand,
  GroupCommand,
  CommandConstructor,
}
