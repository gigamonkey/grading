/*
 * Return the LCS of two strings.
 */
const lcs = (a, b) => {
  return lcsReconstruct(lcsMatrix(a, b), a, b);
};

/*
 * Return the length of the LCS of two strings. Slightly cheaper than actually
 * constructing the LCS.
 */
const lcsLength = (a, b) => {
  return lcsMatrix(a, b)[0][0];
};

/*
 * Compute the similarity of two strings, a and b, returning an object with four
 * properties: aToB (percent of a that's in the LCS), bToA (percent of b that's
 * in the LCS), total (the percent of the average length of a and b that's in
 * the LCS), and edit (the edit distance using only inserts and deletes between
 * a and b).
  */
const similarity = (a, b) => {
  const shared = lcsLength(a, b);
  return {
    aToB: safeDivide(shared, a.length),
    bToA: safeDivide(shared, b.length),
    total: safeDivide(shared, ((a.length + b.length) / 2)),
    edit: 2 * shared - (a.length + b.length),
  };
};

const safeDivide = (a, b) => b == 0 ? 1 : a / b;

////////////////////////////////////////////////////////////////////////////////
// Internals

// Compute the matrix using dynamic programming.
const lcsMatrix = (a, b) => {
  const matrix = Array.from({ length: b.length + 1 }, () => Array(a.length + 1).fill(0));

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      const { right, down, diag } = neighbors(matrix, i, j);
      matrix[j][i] = Math.max(a[i] === b[j] ? 1 + diag : 0, right, down);
    }
  }

  return matrix;
};

// Reconstruct the LCS from the matrix.
const lcsReconstruct = (matrix, a, b) => {
  const result = []

  let j = 0
  let i = 0

  while (j < b.length && i < a.length) {

    const { here, right, down, diag } = neighbors(matrix, i, j);

    if (right === down && down == diag && diag === (here - 1)) {
      result.push(a[i])
      i++;
      j++;
    } else if (down === here) {
      j++;
    } else if (right === here) {
      i++;
    }
  }

  return result.join('');
};

//
const neighbors = (m, i, j) => {
  return {
    here: m[j][i],
    right: m[j][i+1],
    down: m[j+1][i],
    diag: m[j+1][i+1],
  };
};

export { lcs, similarity, lcsLength, lcsMatrix }
