#!/usr/bin/env node

/**
 * Run this to make sure all the pugsql queries can be prepared.
 */

import { DB } from 'pugsql';

const db = new DB('db.db')
  .addQueries('modules/pugly.sql')
  .addQueries('modules/queries.sql');
