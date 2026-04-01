import { camelify } from './util.js';

class Assignments {
  constructor(db, api) {
    this.db = db;
    this.api = api;
  }

  async assignment(assignmentId) {
    return camelify(await this.api.assignment(assignmentId));
  }

  async getBranchAndFile(assignmentId) {
    const { url, kind } = await this.assignment(assignmentId);

    if (kind === 'coding') {
      const config = await this.api.codingConfig(url);
      return {
        branch: url.slice(1),
        dir: url.slice(1),
        file: config.files[0],
      };
    } else if (kind === 'questions') {
      return {
        branch: 'main',
        dir: url.slice(1),
        file: 'answers.json',
      };
    } else {
      throw new Error(`Unknown kind: ${kind}`);
    }
  }

  getHandles({ user, period, course }) {
    if (user) {
      return this.db.githubForUser({ user });
    } else if (period) {
      return this.db.githubForPeriod({ period });
    } else if (course) {
      return this.db.githubForCourse({ course });
    }
  }
}

export { Assignments };
