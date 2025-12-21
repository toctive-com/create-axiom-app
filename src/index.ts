#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { initCommand } from './commands/init.js';

const argv = hideBin(process.argv);

// If no command is provided, default to 'init'
if (argv.length === 0) {
  argv.push('init');
}

yargs(argv)
  .command(initCommand)
  .demandCommand(1, 'You need to specify a command')
  .help()
  .argv;