const jsonIfOk = (r) => {
  if (r.ok) {
    return r.json();
  }
  throw r;
};

const textIfOk = (r) => {
  if (r.ok) {
    return r.text();
  }
  throw r;
};

const isOk = (r) => {
  if (r.ok) {
    return true;
  }
  throw r;
};

export { isOk, jsonIfOk, textIfOk };
