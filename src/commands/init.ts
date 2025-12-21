import { select, checkbox, input, confirm } from '@inquirer/prompts';
import type { CommandModule } from 'yargs';
import axios from 'axios';
import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { config } from '../config.js';

export const initCommand: CommandModule = {
  command: 'init',
  describe: 'Initialize a new Axiom app',
  handler: async () => {
    try {
      // Get current directory name as default project name
      const currentDirName = path.basename(process.cwd());

      // Prompt for project name
      const projectName = await input({
        message: 'Project name:',
        default: currentDirName,
        validate: (value) => {
          if (!value || value.trim() === '') {
            return 'Project name cannot be empty';
          }
          return true;
        },
      });

      // Check if we're using current directory and if it contains files
      const targetDir = projectName === currentDirName ? process.cwd() : path.join(process.cwd(), projectName);
      const isCurrentDir = targetDir === process.cwd();

      if (isCurrentDir) {
        const files = fs.readdirSync(targetDir);
        // Filter out hidden files and check if directory has content
        const hasContent = files.filter(f => !f.startsWith('.')).length > 0;

        if (hasContent) {
          console.log('\n⚠️  Warning: Current directory is not empty!');
          const shouldContinue = await confirm({
            message: 'Some files may be overwritten. Do you want to continue?',
            default: false,
          });

          if (!shouldContinue) {
            console.log('\nOperation cancelled.');
            process.exit(0);
          }
        }
      } else {
        // Create the project directory if it doesn't exist
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
      }

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
        projectName,
        stack,
        authentication: authOptions,
      };

      // Print the choices
      console.log('\nYour choices:');
      console.log(JSON.stringify(choices, null, 2));

      // Send POST request to backend
      console.log('\nDownloading starter kit...');
      const response = await axios.post(
        `${config.baseUrl}/api/download-kit`,
        choices,
        {
          responseType: 'arraybuffer',
        }
      );

      // Get the zip file as a buffer
      const buffer = Buffer.from(response.data);

      // Create a temporary file path for the zip
      const tempZipPath = path.join(os.tmpdir(), `axiom-kit-${Date.now()}.zip`);
      
      // Write the zip file to temp location
      fs.writeFileSync(tempZipPath, buffer);

      // Extract the zip file to target directory
      console.log('Extracting files...');
      const zip = new AdmZip(tempZipPath);
      zip.extractAllTo(targetDir, true);

      // Clean up the temporary zip file
      fs.unlinkSync(tempZipPath);

      console.log('\n✅ Starter kit successfully downloaded and extracted!');
      if (!isCurrentDir) {
        console.log(`📁 Project created in: ${targetDir}`);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        console.log('\nOperation cancelled.');
        process.exit(0);
      }
      throw error;
    }
  },
};
