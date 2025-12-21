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
          {
            name: 'Next.js App Router',
            value: 'next-app-router',
            description: 'Modern Next.js with app directory and React Server Components',
          },
          {
            name: 'Next.js Page Router',
            value: 'next-page-router',
            description: 'Traditional Next.js with pages directory',
          },
          {
            name: 'TanStack Router',
            value: 'tanstack-router',
            description: 'Type-safe routing for React applications',
          },
          {
            name: 'TanStack Start',
            value: 'tanstack-start',
            description: 'Full-stack React framework powered by TanStack Router',
          },
        ],
      });

      // Prompt for authentication options
      const authOptions = await checkbox({
        message: 'Select authentication options:',
        choices: [
          {
            name: 'Email & Password',
            value: 'email-password',
            description: 'Traditional email and password authentication',
          },
          {
            name: 'Magic Link (Email)',
            value: 'magic-link',
            description: 'Passwordless login via email links',
          },
          {
            name: 'Social Login - Google',
            value: 'social-google',
            description: 'Sign in with Google account',
          },
          {
            name: 'Social Login - GitHub',
            value: 'social-github',
            description: 'Sign in with GitHub account',
          },
          {
            name: 'Social Login - Twitter',
            value: 'social-twitter',
            description: 'Sign in with Twitter/X account',
          },
          {
            name: 'Social Login - Facebook',
            value: 'social-facebook',
            description: 'Sign in with Facebook account',
          },
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
