#!/usr/bin/env node

import { DB } from 'pugsql';
import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import vm from 'node:vm';
import { Command } from 'commander';
import glob from 'fast-glob';
import { textIfOk } from './modules/fetch-helpers.js';
import { getSha, getTimestamp, numCorrect } from './modules/grading.js';
import { loadJSON, loadSnakeCaseJSON } from './modules/util.js';

const { entries, fromEntries, keys } = Object;

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');

const get = (name, context) => {
  try {
    const script = new vm.Script(name);
    return script.runInContext(context);
  } catch {
    return undefined;
  }
};

// Basically deep equals. Will break on cyclic structures.
const equals = (o1, o2) => {
  if (o1 === null || o2 === null) {
    return o1 === o2;
  }

  const t1 = typeof o1;
  const t2 = typeof o2;
  if (t1 === t2) {
    if (t1 === 'object') {
      const same = (k) => equals(o1[k], o2[k]);
      return keys(o1).every(same) && keys(o2).every(same);
    } else {
      return o1 === o2;
    }
  } else {
    return false;
  }
};

const isFunction = (v) => typeof v === 'function';

// Copy the args so test code can't mess with them. I'm assuming the only
// non-cloneable kind of arg we're likely to have to deal with are functions.
// But we might as well preserve object graphs since structured clone can do
// it. We'll also assume that functions only occur directly as args, not
// nested within other objects.
const copyArgs = (args) => {
  // Find the function arguments and where they are.
  const functs = fromEntries(args.map((v, i) => [i, v]).filter((x) => isFunction(x[1])));

  // Null them out.
  const noFuncts = args.map((a, i) => (i in functs ? null : a));

  // Preserve all cycles, even between arguments. (That probably can't happen
  // the way we define arguments now but maybe later.)
  const cloned = structuredClone(noFuncts);

  // Put back the function args
  entries(functs).forEach(([i, f]) => {
    cloned[i] = f;
  });

  return cloned;
};

const runTestCase = (fn, test) => {
  let { args, expected, actualArgs, effects, extraCheck } = test;
  let { got, exception, testArgs } = runFn(fn, copyArgs(args));
  let extraOk = true;

  if (effects !== undefined) {
    expected = effects.map((i) => actualArgs[i]);
    got = effects.map((i) => testArgs[i]);
    if (effects.length === 1) {
      expected = expected[0];
      got = got[0];
    }
  }
  if (extraCheck !== undefined) {
    // This can be used for checking things like that the returned value was
    // not one of the arguments in copy function.
    extraOk = extraCheck(got, testArgs);
  }
  const passed = exception === null && equals(got, expected) && extraOk;
  return { args, expected, got, exception, passed };
};

const runFn = (fn, args) => {
  try {
    const got = fn(...args);
    return { got, exception: null, testArgs: args };
  } catch (exception) {
    return { got: null, exception, testArgs: args };
  }
};

const fnResults = (fn, cases) => {
  if (fn) {
    return cases.map((test) => runTestCase(fn, test));
  } else {
    return null; // i.e. function doesn't exist.
  }
};

const runTests = (testcases, code) => {
  const { referenceImpls, allCases, sideEffects, extraChecks } = testcases;

  const context = {};
  const script = new vm.Script(code);
  script.runInNewContext(context);

  const actualCases = fromEntries(
    entries(allCases).map(([name, cases]) => {
      return [
        name,
        cases.map((args) => {
          return {
            args: copyArgs(args), // The args that we use to run the user code
            expected: referenceImpls[name](...args), // value returned
            actualArgs: args, // args after the call
            effects: sideEffects?.[name],
            extraCheck: extraChecks?.[name],
          };
        }),
      ];
    }),
  );

  return fromEntries(
    entries(actualCases).map(([name, cases]) => {
      return [name, fnResults(get(name, context), cases)];
    }),
  );
};

const _noResults = (testcases) => {
  const { referenceImpls, allCases, sideEffects, extraChecks } = testcases;

  const context = {};

  const actualCases = fromEntries(
    entries(allCases).map(([name, cases]) => {
      return [
        name,
        cases.map((args) => {
          return {
            args: copyArgs(args), // The args that we use to run the user code
            expected: referenceImpls[name](...args), // value returned
            actualArgs: args, // args after the call
            effects: sideEffects?.[name],
            extraCheck: extraChecks?.[name],
          };
        }),
      ];
    }),
  );

  return fromEntries(
    entries(actualCases).map(([name, cases]) => {
      return [name, fnResults(get(name, context), cases)];
    }),
  );
};

const isCorrect = (result) => (result.every((q) => q.passed) ? 1 : 0);

const _empty = (testcases) => {
  return new Array(keys(testcases.allCases).length).fill(0);
};

const _summary = (results) => {
  return fromEntries(entries(results).map(([name, r]) => [name, summarizeResults(r)]));
};

const summarizeResults = (results) => {
  if (results == null) {
    return 0;
  } else {
    return results.reduce((t, x) => t + (x.passed ? 1 : 0), 0) / results.length;
  }
};

const fetchTestcases = async (url) => {
  const code = await fetch(`https://bhs-cs.gigamonkeys.com/${url}/testcases.js`).then(textIfOk);
  return getTestcases(code);
};

const getTestcases = (testcasesSource) => {
  const testcasesScript = new vm.Script(testcasesSource);
  const ctx = {};
  testcasesScript.runInNewContext(ctx);
  return get('testcases', ctx);
};

const _score = (results) => {
  return numCorrect(results) / keys(results).length;
};

const dumpResults = (assignmentId, github, timestamp, sha, results, dryRun) => {
  entries(results).forEach(([question, result]) => {
    const answered = result === null ? 0 : 1;
    const correct = result === null ? 0 : isCorrect(result);
    if (!dryRun) {
      db.insertJavascriptUnitTest({assignmentId, github, question, answered, correct, timestamp, sha });
    } else {
      console.log({assignmentId, github, question, answered, correct, timestamp, sha });
    }
  });
};

const emptyResults = (testcases) => fromEntries(keys(testcases.allCases).map((n) => [n, null]));

new Command()
  .description('Run unit tests against dumped Javascript code.')
  .argument('<dir>', 'Code directory.')
  .option('-n, --dry-run', "Don't write to database.")
  .action(async (dir, opts) => {
    const { assignmentId, openDate, title, courseId, url } = loadSnakeCaseJSON(join(dir, 'assignment.json'));

    try {
      const testcases = await fetchTestcases(url);
      const questions = keys(testcases.allCases).length;

      console.log(JSON.stringify(keys(testcases.allCases), null, 2));
      console.log(`questions: ${questions}`);

      db.transaction(() => {

        if (!opts.dryRun) {
          db.ensureAssignment({ assignmentId, openDate, courseId, title });
          db.clearJavascriptUnitTest({assignmentId});
          db.clearScoredQuestionAssignment({assignmentId});
          db.insertScoredQuestionAssignment({ assignmentId, questions });
        }

        const code = glob.sync(`${dir}/**/code.js`);

        code.forEach((file) => {
          const d = dirname(file);
          const github = basename(d);
          const timestamp = getTimestamp(d);
          const sha = getSha(d);

          try {
            const code = readFileSync(file, 'utf-8');
            const results = runTests(testcases, code);
            dumpResults(assignmentId, github, timestamp, sha, results, opts.dryRun);
          } catch (_e) {
            dumpResults(assignmentId, github, timestamp, sha, emptyResults(testcases), opts.dryRun);
          }
        });
      })
    } catch (e) {
      console.log(e);
    }

  })
  .parse();
