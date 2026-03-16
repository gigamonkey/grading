#!/usr/bin/env node

import fs from 'node:fs';
import glob from 'fast-glob';
import path from 'node:path';
import prettier from 'prettier';
import { Command } from 'commander';
import { JSDOM } from 'jsdom';
import { similarity } from './modules/lcs.js';

const verbose = false;


const { Node } = new JSDOM('').window;

const loadStaticBody = (text) => {
  const body = new JSDOM(text).window.document.body;
  return prettier.format(clean(body), { parser: "html" });
};

const loadDynamicBody = (text, code) => {
  const dom = new JSDOM(text, {
    runScripts: "dangerously", // allows us to run code
    resources: "usable"
  });

  const doc = dom.window.document;
  doc.querySelector('script[src="script.js"]')?.remove();

  const body = doc.body;
  dom.window.eval(code);
  body.removeAttribute("class");
  return prettier.format(clean(body), { parser: "html" });
};

const clean = (body) => {
  body.querySelector('header').remove();
  cleanNodes(body);
  return body.outerHTML;
};


const cleanNodes = (node) => {
  for (let i = node.childNodes.length - 1; i >= 0; i--) {
    const child = node.childNodes[i];

    if (child.nodeType === Node.COMMENT_NODE) {
      node.removeChild(child);
    } else if (child.nodeType === Node.TEXT_NODE) {
      if (!child.textContent.trim()) {
        node.removeChild(child);
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      cleanNodes(child);
    }
  }
}

/**
 *
 */
const compare = async (staticHTML, dynamicText, code) => {
  try {
    const dynamicHTML = await loadDynamicBody(dynamicText, code);

    if (verbose) {
      console.log('\nSTATIC\n');
      console.log(staticHTML);
      console.log('\nDYNAMIC\n');
      console.log(dynamicHTML);
    }

    return { ok: true, similarity: similarity(staticHTML, dynamicHTML) };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

const significantChild = (node) => nonEmptyText(node) || node.nodeType === 1;

const nonEmptyText = (node) => node.nodeType === 3 && node.textContent.trim().length > 0

const significantChildren = (node) => [...node.childNodes].filter(significantChild);

new Command()
  .description('Compare static HTML to dynamically generated HTML')
  .argument('<static>', 'Filename of static reference HTML')
  .argument('<dynamic>', 'Filename of dynamic HTML')
  .argument('<repos>', 'Directory containing repos.')
  .action(async (staticFile, dynamicFile, repos) => {
    const staticHTML = await loadStaticBody(fs.readFileSync(staticFile, { encoding: 'utf-8' }))
    const dynamicText = fs.readFileSync(dynamicFile, { encoding: 'utf-8' });

    const scripts = glob.sync(`${repos}/*/projects/dom-assignment/public/scripts/script.js`);

    scripts.forEach(async (scriptFile) => {
      const github = path.relative(repos, scriptFile).split(path.sep)[0];
      const code = fs.readFileSync(scriptFile, { encoding: 'utf-8' });
      const comp = await compare(staticHTML, dynamicText, code)
      const r = { github };
      if (comp.ok) {
        r.score = comp.similarity.total;
      } else {
        r.score = 0;
        r.error = comp.error;
      }
      console.log(`${r.github}\t${r.score}`);
    });
  })
  .parse();
