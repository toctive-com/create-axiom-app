#!/usr/bin/env node

import ejs from 'ejs';
import { Stats, promises as fsPromises, mkdirSync, writeFileSync } from 'fs';
import inquirer, { QuestionCollection } from 'inquirer';
import path from 'path';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs';
import cliProgress from 'cli-progress';
import colors from '@colors/colors';
import figlet, { Fonts } from 'figlet';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Run the template generation process.
 */
async function main() {
  // Print Axiom logo
  await printLogo();

  // Get user's answers through interactive prompts
  const answers = await getAnswers();

  // Get all template files
  const templateFiles = await getTemplateFiles(answers.template.toLowerCase());

  // Generate and write files based on templates
  await generateTemplateFiles(templateFiles, answers);

  printSuccessMessage(answers);
}

/**
 * Prints a success message with instructions on how to start an app.
 *
 * @param answers - The `answers` parameter is an object that contains key-value
 * pairs. The keys represent different properties or questions, and the values
 * represent the user's answers to those questions.
 *
 */
function printSuccessMessage(answers: Record<string, any>) {
  console.log('\n');
  console.log(colors.bgGreen(' Success '), '✅  All done!');
  console.log(
    `Please run the next commands to start your app:
  -  ${colors.green(`cd ${answers.name}`)}
  -  ${colors.green(`npm install`)}
  -  ${colors.green(`npm run dev`)}`,
  );
}

/**
 * Generates and writes files based on templates, using a progress bar to track
 * the progress.
 *
 * @param {string[]} templateFiles - An array of strings representing the file
 * names of the template files to be generated.
 * @param answers - The `answers` parameter is an object that contains key-value
 * pairs representing the user's answers to questions or prompts. These answers
 * are used to generate the template files.
 *
 */
async function generateTemplateFiles(
  templateFiles: string[],
  answers: Record<string, any>,
) {
  const bar1 = new cliProgress.SingleBar(
    {},
    cliProgress.Presets.shades_classic,
  );
  bar1.start(templateFiles.length, 0);
  for (const file of templateFiles) {
    // Generate and write files based on templates
    await generateFile(file, answers);
    bar1.increment();
  }
  bar1.stop();
}

/**
 * Generates a random ASCII art logo using different fonts and prints it to the
 * console.
 *
 * @returns A promise.
 *
 */
async function printLogo() {
  return new Promise((resolve, reject) => {
    const fonts: Fonts[] = [
      'Jacky',
      'NScript',
      'Puffy',
      'Small',
      'Standard',
      'Star Wars',
      '3-D',
      '3D-ASCII',
      '3D Diagonal',
      'Isometric1',
      'Roman',
      'Speed',
      'Univers',
      'Whimsy',
      'Big Money-ne',
      'Big',
      'Chiseled',
      'Merlin1',
      'Slant',
      'Sweet',
      'ANSI Regular',
      'ANSI Shadow',
      'Alligator',
      'Bolger',
      'Broadway',
      'Caligraphy',
      'Colossal',
    ];

    // Get a random font
    const font = fonts[Math.floor(Math.random() * fonts.length)];
    figlet('Axiom', { width: 80, font }, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      console.log(data);
      resolve(true);
    });
  });
}

/**
 *
 * Get user answers through interactive prompts.
 *
 * @returns {Promise<Record<string, any>>} User answers.
 *
 */
async function getAnswers(): Promise<Record<string, any>> {
  const argv = await yargs(process.argv)
    .option('name', {
      alias: 'n',
      describe: 'User name',
    })
    // .version(packageJson.version)
    .help().argv;

  const questions: QuestionCollection[] = [
    // Questions for user input
    {
      type: 'input',
      name: 'name',
      message: 'What is your name?',
      default: argv.name ?? 'axiom-project',
    },
    {
      type: 'list',
      name: 'template',
      message: 'Select the template you want to use:',
      choices: ['Default', 'Blog', 'Minimal'],
    },
  ];

  return inquirer.prompt(questions); // Return user's answers
}

/**
 * Generate a file by rendering an EJS template.
 * @param {string} file - The name of the EJS template file.
 * @param {Record<string, any>} answers - User answers.
 */
async function generateFile(file: string, answers: Record<string, any>) {
  const templatePath = getTemplatePath(answers.template.toLowerCase());

  // Render EJS template
  const content = await ejs.renderFile<Promise<string>>(
    resolve(templatePath, file),
    answers,
    null,
  );

  const fileWithoutExtension = file.split('.').slice(0, -1).join('.');
  const fileWithoutExtensionPath = path.join(
    process.cwd(),
    fileWithoutExtension,
  );
  mkdirSync(
    fileWithoutExtensionPath.split(path.sep).slice(0, -1).join(path.sep),
    { recursive: true },
  );
  writeFileSync(fileWithoutExtensionPath, content); // Write the rendered content to the file
}

/**
 * Recursively get all template files of the specified template.
 *
 * @param {string} template - The name of the template.
 *
 * @returns {Promise<string[]>} An array of template file paths.
 *
 */
async function getTemplateFiles(template: string): Promise<string[]> {
  const directoryPath = getTemplatePath(template);
  const filePaths = await walkDirectoryAndGetFiles(directoryPath); // Get all files recursively

  return filePaths
    .map((file) =>
      file.split(directoryPath).filter(Boolean).at(0).replace(path.sep, ''),
    )
    .filter(isEjsFile); // Filter out non-EJS files
}

/**
 * Recursively walk through a directory and its subdirectories, returning an
 * array of all file paths.
 *
 * @param {string} directoryPath - The path to the directory to start walking
 * from.
 *
 * @returns {Promise<string[]>} An array of file paths.
 *
 */
async function walkDirectoryAndGetFiles(
  directoryPath: string,
): Promise<string[]> {
  const items = await fsPromises.readdir(directoryPath);
  let filePaths: string[] = [];

  for (const item of items) {
    const itemPath: string = path.join(directoryPath, item);
    const stats: Stats = await fsPromises.stat(itemPath);

    if (stats.isDirectory()) {
      const nestedFiles: string[] = await walkDirectoryAndGetFiles(itemPath); // Recursively walk through subdirectories
      filePaths = filePaths.concat(nestedFiles);
    } else if (stats.isFile()) {
      filePaths.push(itemPath);
    }
  }

  return filePaths;
}

/**
 * Check if a file has the .ejs extension.
 *
 * @param {string} file - The name of the file.
 *
 * @returns {boolean} Whether the file has the .ejs extension.
 *
 */
function isEjsFile(file: string): boolean {
  return file.endsWith('.ejs');
}

/**
 * Get the path to the specified template directory.
 *
 * @param {string} template - The name of the template.
 *
 * @returns {string} The path to the template directory.
 *
 */
function getTemplatePath(template: string): string {
  return resolve(__dirname, '..', 'templates', template);
}

main();
