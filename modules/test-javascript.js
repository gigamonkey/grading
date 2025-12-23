#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import vm from 'node:vm';
import { textIfOk } from './fetch-helpers.js';
import { getSha, getTimestamp, numCorrect } from './grading.js';
import { loadJSON, loadSnakeCaseJSON } from './util.js';

const { entries, fromEntries, keys } = Object;

const SIGNIFICANT_DIGITS = 10;

const get = (name, context) => {
  //console.log(`Getting function ${name}`);
  try {
    const script = new vm.Script(name);
    return script.runInContext(context);
  } catch {
    return undefined;
  }
};

// Basically deep equals. Will break on cyclic structures. Also, only check
// numbers to 10 significant digits to account for differences due to order of
// arithmetic operations.
const equals = (o1, o2) => {
  if (o1 === null || o2 === null) {
    return o1 === o2;
  }

  const t1 = typeof o1;
  const t2 = typeof o2;
  if (t1 === t2) {
    if (t1 === 'object') {
      const same = (k) => equals(o1[k], o2[k]);
      return Object.keys(o1).every(same) && Object.keys(o2).every(same);
    } else if (t1 === 'number') {
      return numericEquals(o1, o2, SIGNIFICANT_DIGITS);
    } else {
      return o1 === o2;
    }
  } else {
    return false;
  }
};

// Compute numeric equality to a given number of significant digits.
const numericEquals = (a, b, digits) => {

  if (a === b) {
    return true;

  } else {

    const epsilon = Math.pow(10, -digits);

    // Handle 0s specially since log10(0) is -Infinity which will be different
    // from log10(n) for any non-zero n. But we want to consider 0 and some
    // number less than epsilon away from 0 to be equal even though they are,
    // in some sense, of entirely different orders of magnitude.
    if (a === 0) return Math.abs(b) < epsilon;
    if (b === 0) return Math.abs(a) < epsilon;

    const aExp = Math.floor(Math.log10(Math.abs(a)));
    const bExp = Math.floor(Math.log10(Math.abs(b)));

    if (aExp !== bExp) {
      return false;
    } else {
      const scale = Math.pow(10, -(aExp + 1));
      return Math.abs((a - b) * scale) <= epsilon;
    }
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
    //console.log('No fn');
    return null; // i.e. function doesn't exist.
  }
};

const runTests = (testcases, code) => {
  const { referenceImpls, allCases, sideEffects, extraChecks } = testcases;

  const context = {};
  try {
    const script = new vm.Script(code);
    script.runInNewContext(context);

    //console.log('allCases', allCases);

    const e = entries(allCases);

    //console.log('e', e);

    //console.log('mapped', fromEntries(e.map(([name, cases]) => { return [name, cases.length]; })));

    const foo = e.map(([name, cases]) => {
      return [
        name,
        cases.map((args) => {
          try {
            return {
              args: copyArgs(args), // The args that we use to run the user code
              expected: referenceImpls[name](...args), // value returned
              actualArgs: args, // args after the call
              effects: sideEffects?.[name],
              extraCheck: extraChecks?.[name],
            };
          } catch (e) {
            return e;
          }
        }),
      ];
    });

    //console.log('foo', foo);

    const actualCases = fromEntries(foo);

    //console.log('here');

    //console.log('actualCases', actualCases);

    return fromEntries(
      entries(actualCases).map(([name, cases]) => {
        const fnR = fnResults(get(name, context), cases);
        //console.log('function results:', fnR);
        return [name, fnR];
      }),
    );
  } catch {
    return {};
  };
};

const fetchTestcases = async (url, server='https://bhs-cs.gigamonkeys.com') => {
  const code = await fetch(`${server}/${url}/testcases.js`).then(textIfOk);
  const testcasesScript = new vm.Script(code);
  const ctx = {};
  testcasesScript.runInNewContext(ctx);
  return get('testcases', ctx);
};

const loadTestcases = (code) => {
  const testcasesScript = new vm.Script(code);
  const ctx = {};
  testcasesScript.runInNewContext(ctx);
  return get('testcases', ctx);
};

export { runTests, fetchTestcases, loadTestcases };
