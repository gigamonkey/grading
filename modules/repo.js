#!/usr/bin/env node

import { exec } from './util.js';

class Repo {

  constructor(directory) {
    this.directory = directory;
  }

  git(cmd) {
    return exec(`git -C ${this.directory} ${cmd}`);
  }

  fetch() {
    this.git('fetch');
  }

  sha(branch, filename, before) {
    const deadline = before ? `--before ${before}` : '';
    try {
      return this.git(`log -1 ${deadline} --pretty=tformat:%H ${branch} -- ${filename}`).trim();
    } catch {
      return undefined;
    }
  }

  fullsha(sha) {
    return this.git(`log --pretty=tformat:%H -1 ${sha}`).trim();
  }

  timestamp(sha) {
    return Number(this.git(`log --pretty=tformat:%at -1 ${sha}`).trim());
  }

  contents(sha, filename) {
    return this.git(`show ${sha}:${filename}`);
  }

  diff(sha) {
    return this.git(`show ${sha}`);
  }

  changes(start, end, branch) {
    const range = `${start}^...${end}`;
    const cmd = `log --pretty=tformat:'%H %at' ${range} -- ${branch}`;
    return this.git(cmd).trim().split('\n').map(s => this.parseCommit(s));
  }

  branchChanges(branch) {
    const cmd = `log --pretty=tformat:'%H %at' ${branch} -- ${branch}`;
    return this.git(cmd).trim().split('\n').map(s => this.parseCommit(s));
  }

  nextChange(sha, branch) {
    const range = `${sha}..${branch}`;
    const cmd = `log --reverse --pretty=tformat:'%H %at' ${range}`;
    return this.parseCommit(this.git(cmd).trim().split('\n')[0]);
  }

  parseCommit(line) {
    if (line.trim() !== '') {
      const [ sha, timestamp ] = line.split(' ');
      return { sha, timestamp: Number(timestamp) };
    }
  }
}

export { Repo };
