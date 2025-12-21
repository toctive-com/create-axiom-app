import { select, checkbox } from '@inquirer/prompts';
import type { CommandModule } from 'yargs';

export const initCommand: CommandModule = {
  command: 'init',
  describe: 'Initialize a new Axiom app',
  handler: async () => {
    try {
      // Prompt for stack selection
      const stack = await select({
        message: 'Select your stack:',
        choices: [
          { name: 'Next.js App Router', value: 'next-app-router' },
          { name: 'Next.js Page Router', value: 'next-page-router' },
          { name: 'TanStack Router', value: 'tanstack-router' },
          { name: 'TanStack Start', value: 'tanstack-start' },
        ],
      });

      // Prompt for authentication options
      const authOptions = await checkbox({
        message: 'Select authentication options:',
        choices: [
          { name: 'Email & Password', value: 'email-password' },
          { name: 'Magic Link (Email)', value: 'magic-link' },
          { name: 'Social Login - Google', value: 'social-google' },
          { name: 'Social Login - GitHub', value: 'social-github' },
          { name: 'Social Login - Twitter', value: 'social-twitter' },
          { name: 'Social Login - Facebook', value: 'social-facebook' },
        ],
      });

      // Create the choices object
      const choices = {
        stack,
        authentication: authOptions,
      };

      // Print the choices
      console.log('\nYour choices:');
      console.log(JSON.stringify(choices, null, 2));
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        console.log('\nOperation cancelled.');
        process.exit(0);
      }
      throw error;
    }
  },
};
