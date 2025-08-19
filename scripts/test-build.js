#!/usr/bin/env node

/**
 * Test script to verify build configuration
 * This script checks if all necessary files and configurations are in place
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🔍 Testing build configuration...\n');

// Check essential files
const essentialFiles = [
  'package.json',
  'astro.config.mjs',
  'tsconfig.json',
  'src/pages/index.astro',
  'src/layouts/BaseLayout.astro',
  '.github/workflows/deploy.yml'
];

console.log('📁 Checking essential files:');
let allFilesExist = true;

for (const file of essentialFiles) {
  const exists = existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
}

console.log('');

// Check package.json scripts
console.log('📦 Checking package.json scripts:');
try {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const requiredScripts = ['dev', 'build', 'preview'];
  
  for (const script of requiredScripts) {
    const hasScript = packageJson.scripts && packageJson.scripts[script];
    console.log(`  ${hasScript ? '✅' : '❌'} ${script} script`);
    if (!hasScript) allFilesExist = false;
  }
} catch (error) {
  console.log(`  ❌ Error reading package.json: ${error.message}`);
  allFilesExist = false;
}

console.log('');

// Check Astro configuration
console.log('⚙️  Checking Astro configuration:');
try {
  const astroConfig = readFileSync('astro.config.mjs', 'utf8');
  
  const checks = [
    { name: 'site URL configured', pattern: /site:\s*['"]https:\/\/tony-uppercat\.github\.io\/pew_local['"]/ },
    { name: 'base path configured', pattern: /base:\s*['"]\/pew_local['"]/ },
    { name: 'React integration', pattern: /@astrojs\/react/ },
    { name: 'Tailwind integration', pattern: /@astrojs\/tailwind/ },
    { name: 'PWA plugin', pattern: /vite-plugin-pwa/ },
    { name: 'static output', pattern: /output:\s*['"]static['"]/ }
  ];
  
  for (const check of checks) {
    const hasPattern = check.pattern.test(astroConfig);
    console.log(`  ${hasPattern ? '✅' : '❌'} ${check.name}`);
    if (!hasPattern) allFilesExist = false;
  }
} catch (error) {
  console.log(`  ❌ Error reading astro.config.mjs: ${error.message}`);
  allFilesExist = false;
}

console.log('');

// Check GitHub Actions workflow
console.log('🚀 Checking GitHub Actions workflow:');
try {
  const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
  
  const workflowChecks = [
    { name: 'Node.js setup', pattern: /actions\/setup-node/ },
    { name: 'Dependency installation', pattern: /npm ci/ },
    { name: 'Build step', pattern: /npm run build/ },
    { name: 'Pages artifact upload', pattern: /actions\/upload-pages-artifact/ },
    { name: 'Pages deployment', pattern: /actions\/deploy-pages/ }
  ];
  
  for (const check of workflowChecks) {
    const hasPattern = check.pattern.test(workflow);
    console.log(`  ${hasPattern ? '✅' : '❌'} ${check.name}`);
    if (!hasPattern) allFilesExist = false;
  }
} catch (error) {
  console.log(`  ❌ Error reading workflow: ${error.message}`);
  allFilesExist = false;
}

console.log('');

// Summary
if (allFilesExist) {
  console.log('🎉 All checks passed! Your build configuration looks good.');
  console.log('📝 Next steps:');
  console.log('   1. Commit and push your changes to GitHub');
  console.log('   2. Check the Actions tab in your repository');
  console.log('   3. Verify the deployment at: https://tony-uppercat.github.io/pew_local');
} else {
  console.log('❌ Some checks failed. Please fix the issues above before deploying.');
  process.exit(1);
}
