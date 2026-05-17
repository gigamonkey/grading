#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Command } from 'commander';
import glob from 'fast-glob';
import { render } from './modules/image-refactoring.js';

new Command()
  .name('javascript-render-graphics')
  .description('Run graphics code to make image files for grading')
  .argument('<assignment>', 'Assignment id')
  .argument('<dir>', 'Code directory.')
  .action((_assignmentId, dir) => {
    glob.sync(`${dir}/**/code.js`).forEach((file) => {
      const github = path.basename(path.dirname(file));
      let codeSource;
      try {
        codeSource = readFileSync(file, 'utf-8');
      } catch (e) {
        console.log(`Could not read ${file}: ${e.message}`);
        return;
      }
      const { png, error } = render({ codeSource });
      if (error) {
        console.log(`Problem generating for ${github}: ${error}`);
        return;
      }
      const out = path.join(path.dirname(file), `${github}.png`);
      writeFileSync(out, png);
      console.log(`Image saved as ${out}`);
    });
  })
  .parse();
