#!/usr/bin/env node

/**
 * Run this to make sure all the pugsql queries can be prepared.
 */

import { DB } from 'pugsql';

try {
  new DB('db.db').addQueries('modules/pugly.sql').addQueries('modules/queries.sql');
  console.log('ok.');
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
