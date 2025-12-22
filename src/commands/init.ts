import { select, checkbox, input, confirm } from '@inquirer/prompts';
import type { CommandModule } from 'yargs';
import axios from 'axios';
import AdmZip from 'adm-zip';
import * as tar from 'tar';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
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

      // Create the project directory if it doesn't exist
      if (!isCurrentDir && !fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Check if target directory has content
      if (fs.existsSync(targetDir)) {
        const files = fs.readdirSync(targetDir);
        // Filter out hidden files and check if directory has content
        const hasContent = files.filter(f => !f.startsWith('.')).length > 0;

        if (hasContent) {
          console.log(`\n⚠️  Warning: ${isCurrentDir ? 'Current directory' : 'Directory'} is not empty!`);
          const shouldContinue = await confirm({
            message: 'Some files may be overwritten. Do you want to continue?',
            default: false,
          });

          if (!shouldContinue) {
            console.log('\nOperation cancelled.');
            process.exit(0);
          }
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

      // Prompt for package manager
      const packageManager = await select({
        message: 'Select package manager:',
        choices: [
          {
            name: 'npm',
            value: 'npm',
            description: 'Node Package Manager (default)',
          },
          {
            name: 'yarn',
            value: 'yarn',
            description: 'Yarn Package Manager',
          },
          {
            name: 'pnpm',
            value: 'pnpm',
            description: 'Fast, disk space efficient package manager',
          },
          {
            name: 'bun',
            value: 'bun',
            description: 'Ultra-fast all-in-one JavaScript runtime',
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
        packageManager,
        authentication: authOptions,
      };

      // Print the choices
      console.log('\nYour choices:');
      console.log(JSON.stringify(choices, null, 2));

      // Send POST request to backend
      console.log('\nDownloading starter kit...');
      let response;
      try {
        response = await axios.post(
          `${config.baseUrl}/api/download-kit`,
          choices,
          {
            responseType: 'arraybuffer',
          }
        );
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error('\n❌ Failed to download starter kit from backend');
          
          if (error.response) {
            // Server responded with error status
            console.error(`Status: ${error.response.status} ${error.response.statusText}`);
            
            // Try to parse error message from response
            try {
              const errorText = Buffer.from(error.response.data).toString('utf-8');
              console.error(`Response: ${errorText}`);
            } catch {
              console.error('Response: Unable to parse error response');
            }
          } else if (error.request) {
            // Request was made but no response received
            console.error('Error: No response received from server');
            console.error(`Is the backend running at ${config.baseUrl}?`);
          } else {
            // Error setting up the request
            console.error(`Error: ${error.message}`);
          }
        } else {
          console.error('\n❌ An unexpected error occurred:', error);
        }
        process.exit(1);
      }

      console.log(`✅ Downloaded successfully (${response.status} ${response.statusText})`);

      // Get the file as a buffer
      const buffer = Buffer.from(response.data);

      // Detect file type from Content-Type header or check content-disposition
      const contentType = response.headers['content-type'] || '';
      const contentDisposition = response.headers['content-disposition'] || '';
      let isTarGz = false;
      
      // Check if it's a tar.gz file
      if (contentType.includes('gzip') || 
          contentType.includes('x-gzip') || 
          contentType.includes('tar') ||
          contentDisposition.includes('.tar.gz') ||
          contentDisposition.includes('.tgz')) {
        isTarGz = true;
      }

      // Create a temporary file path
      const fileExtension = isTarGz ? '.tar.gz' : '.zip';
      const tempFilePath = path.join(os.tmpdir(), `axiom-kit-${Date.now()}${fileExtension}`);
      
      // Write the file to temp location
      fs.writeFileSync(tempFilePath, buffer);

      // Extract the file to target directory
      console.log('Extracting files...');
      if (isTarGz) {
        // Extract tar.gz file
        await tar.x({
          file: tempFilePath,
          cwd: targetDir,
        });
      } else {
        // Extract zip file
        const zip = new AdmZip(tempFilePath);
        zip.extractAllTo(targetDir, true);
      }

      // Clean up the temporary file
      fs.unlinkSync(tempFilePath);

      console.log('\n✅ Starter kit successfully downloaded and extracted!');
      if (!isCurrentDir) {
        console.log(`📁 Project created in: ${targetDir}`);
      }

      // Ask if user wants to initialize git repository
      const gitDir = path.join(targetDir, '.git');
      const gitExists = fs.existsSync(gitDir);
      
      if (!gitExists) {
        const shouldInitGit = await confirm({
          message: 'Would you like to initialize a git repository?',
          default: true,
        });

        if (shouldInitGit) {
          try {
            console.log('\nInitializing git repository...');
            execSync('git init', {
              cwd: targetDir,
              stdio: 'pipe',
            });
            
            execSync('git add .', {
              cwd: targetDir,
              stdio: 'pipe',
            });
            
            execSync('git commit -m "Initial commit"', {
              cwd: targetDir,
              stdio: 'pipe',
            });
            
            console.log('✅ Git repository initialized with initial commit!');
          } catch (error) {
            console.error('\n❌ Failed to initialize git repository. You can initialize it manually later.');
          }
        }
      }

      // Ask if user wants to install packages
      const shouldInstall = await confirm({
        message: 'Would you like to install packages now?',
        default: true,
      });

      if (shouldInstall) {
        console.log(`\nInstalling packages with ${packageManager}...`);
        try {
          const installCommand = packageManager === 'npm' ? 'npm install' :
                                packageManager === 'yarn' ? 'yarn install' :
                                packageManager === 'pnpm' ? 'pnpm install' :
                                'bun install';
          
          execSync(installCommand, {
            cwd: targetDir,
            stdio: 'inherit',
          });
          
          console.log('\n✅ Packages installed successfully!');
        } catch (error) {
          console.error('\n❌ Failed to install packages. You can install them manually later.');
        }
      } else {
        const cdCommand = !isCurrentDir ? `cd ${projectName} && ` : '';
        console.log(`\n📦 You can install packages later by running: ${cdCommand}${packageManager} install`);
      }

      process.exit(0);
    } catch (error) {
      if (error instanceof Error && error.name === 'ExitPromptError') {
        console.log('\nOperation cancelled.');
        process.exit(0);
      }
      throw error;
    }
  },
};
