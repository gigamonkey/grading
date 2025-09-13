import { $, $$ } from './modules/dom.js';

const setGrade = (e) => {
  const select = e.target;
  const { userId, posted } = select.closest('div').dataset;
  const data = { userId, posted, grade: select.value };
  console.log(data);
  fetch(window.location.path + '/grade', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
};

document.body.onchange = setGrade;
