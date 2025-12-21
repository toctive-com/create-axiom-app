#!/usr/bin/env node

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { initCommand } from './commands/init.js';

yargs(hideBin(process.argv))
  .command(initCommand)
  .demandCommand(1, 'You need to specify a command')
  .help()
  .argv;