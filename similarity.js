#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { lcs, similarity } from './modules/lcs.js';

const enc = {encoding: 'utf-8'};

const reportSimilarity = (file1, file2) => {
  const text1 = normalize(readFileSync(file1, enc));
  const text2 = normalize(readFileSync(file2, enc));
  console.log([file1, file2, JSON.stringify(similarity(text1, text2))].join('\t'));
};

const normalize = (text) => {
  //text = text.replace(/\/\/.*$/gm, '');
  //text = text.replace(/\s+/g, ' ');
  return text;
}

new Command()
  .name('similarity')
  .description('Compare two files and report their similarity.')
  .argument('<file1>', 'First file')
  .argument('<file1>', 'Second file')
  .action(reportSimilarity)
  .parse();
