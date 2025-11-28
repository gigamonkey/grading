/*
 * API for talking to the server from scripts.
 */

class API {

  constructor(server, apiKey) {
    this.server = server;
    this.apiKey = apiKey;
  }

  get(url, type='application/json') {
    return fetch(`${this.server}${url}`, {
      method: 'GET',
      headers: this.#headers(type),
    }).then(jsonIfOk);
  }

  post(url, body, type='application/json') {
    return fetch(`${this.server}${url}`, {
      method: 'POST',
      headers: this.#headers(type),
      body: this.#encodeBody(body, type),
    }).then(jsonIfOk);
  }

  put(url, body, type='application/json') {
    return fetch(`${this.server}${url}`, {
      method: 'PUT',
      headers: this.#headers(type),
      body: this.#encodeBody(body, type),
    }).then(jsonIfOk);
  }

  delete(url, type='application/json') {
    return fetch(`${this.server}${url}`, {
      method: 'DELETE',
      headers: this.#headers(type),
    }).then(jsonIfOk);
  }

  #encodeBody(body, type) {
    if (body === undefined || body === null) {
      return undefined;
    } else if (type === 'application/json') {
      return JSON.stringify(body);
    } else {
      return body;
    }
  }

  #headers(type) {
    return {
      'Content-Type': type,
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  postGrades(grades) {
    return this.put('/api/grades', grades);
  }

  codingConfig(url) {
    return this.get(`/api/speedrun/config${url}`);
  }

  clearAssignmentGrades(assignmentId) {
    return this.delete(`/api/grades/${assignmentId}`);
  }

  lessonPlanCreatedAt(course, lesson) {
    return this.get(`/api/lesson-plan/${course}/${lesson}`).catch(r => undefined).then(d => d?.created_at);
  }

  lessonPlans(course) {
    return this.get(`/api/lesson-plan/${course}`);
  }

  deleteLessonPlan(course, lesson) {
    return this.delete(`/api/lesson-plan/${course}/${lesson}`);
  }

  createLessonPlan(data) {
    return this.post(`/api/lesson-plan`, data);
  }

  putOutline(course, text) {
    return this.put(`/api/outline/${course}`, text, 'text/plain; charset=UTF-8');
  }

  assignmentJSON(assignmentId) {
    return this.get(`/api/assignment/${assignmentId}`);
  }

  reflectionGradeData(assignmentId) {
    return this.get(`/api/reflection-grade-data/${assignmentId}`);
  }

  completedSpeedruns() {
    return this.get('/api/completed-speedruns');
  }

}

const jsonIfOk = r => {
  if (r.ok) {
    return r.json();
  }
  throw r;
};

export { API };
