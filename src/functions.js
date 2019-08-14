import {
  reduce,
  splitEvery,
  flatten,
} from 'ramda';

import {
  widths,
  mineCounts,
} from './difficultyConstants';

// takes in a cell and a board and returns all existing neighbors of that cell in that board
export const getNeighbors = (x, y, b, includeDiag = true) => [
  b[y - 1] && includeDiag && b[y - 1][x - 1],
  b[y] && b[y][x - 1],
  b[y + 1] && includeDiag && b[y + 1][x - 1],
  b[y - 1] && b[y - 1][x],
  b[y + 1] && b[y + 1][x],
  b[y - 1] && includeDiag && b[y - 1][x + 1],
  b[y] && b[y][x + 1],
  b[y + 1] && includeDiag && b[y + 1][x + 1],
].filter(x => x);

// takes a cell and a board and an optional accumulator (for recursion)
// artificially clicks cell passed in, and if it is an empty cell, all of its neighbors
// and propagates until there are no more empty cells in that chunk. returns a one dimensional array
// of cells to be "clicked"
export const propagate = (cell, board, acc) => {
  if (!cell.isMine && cell.count === 0 && !cell.flagged && !cell.dunno) {
    const freshNeighbors = getNeighbors(cell.x, cell.y, board, true)
      .filter(n => !acc || !acc[n.y] || !acc[n.y].includes(n.x))

    const emptyNeighbors = freshNeighbors.filter(n => n.count === 0);

    if (freshNeighbors.length === 0) return [];

    const newAcc = freshNeighbors.reduce((a, c) => {
      if (!a[c.y]) {
        a[c.y] = [c.x];
      } else {
        a[c.y].push(c.x);
      }
      return a;
    }, acc || []);

    return flatten(freshNeighbors.concat(emptyNeighbors.map(n => propagate(n, board, newAcc))));
  }
  return [];
};

// takes the final one dimensional array returned from function above and turns it into a nice
// two dimensional array for easy board updating later
export const propagateMap = reduce((a, c) => ({...a, [c.y]: { ...a[c.y], [c.x]: true }}), {});

// makes a board based on difficulty
// mine location and the counts of neighboring mines are set here and never changed
export const makeBoard = (diff) => {
  const width = widths[diff];
  const minesCount = mineCounts[diff];

  const board = Array(width ** 2).fill({});

  const uniqMineLocations = (count, arr = []) => {
    if (count === 0) return arr;

    const location = Math.floor(Math.random() * (width ** 2));

    if (arr.includes(location)) return uniqMineLocations(count, arr);

    return uniqMineLocations(count - 1, arr.concat([location]));
  }

  const mines = uniqMineLocations(minesCount);

  const boardFilledWithMines = board.map((_, i) => ({ isMine: mines.includes(i) }));

  const twoDBoard = splitEvery(width, boardFilledWithMines);

  const boardWithCounts = twoDBoard.map((row, y, b) => row.map((cell, x) => {
    const count = getNeighbors(x, y, b)
      .filter(c => c.isMine).length;
    return { ...cell, count, clicked: false, flagged: false, dunno: false, x, y }
  }));


  return boardWithCounts;
}

// gets the minimum amount of clicks needed to solve a given board
// this is achieved by first looking only at cells with no neighboring mines
// and artifically clicking them iteratively and incrementing a counter.
// if a cell is included in a previous propagation the counter is not incremented.
// then you simply count the remaining non mine cells and add the 2 numbers together

export const get3BV = (board) => {
  const edges = flatten(board).filter(c => !c.isMine && !c.count).reduce((a, c) => {
    if (a.board[c.y][c.x].marked) return a;
    const p = propagateMap(propagate({ ...c, marked: true }, board));

    const newBoard = a.board.map((row, y) => row.map((cell, x) => {
      if (p && p[y] && p[y][x]) return { ...cell, marked: true };
      return cell;
    }));

    return { board: newBoard , chunks: a.chunks + 1 };
  }, { board, chunks: 0 })

  const bits = edges.board.filter(c => !c.marked && !c.isMine).length;

  return edges.chunks + bits;
};

// my scoring algorithm. to keep cheating to a minimum this version of the function is only used
// to graphically display the score. if and when the user wins, the score is recalculated on the backend
// with minimal information sent

export const score = state => Math.floor((
  ((state.threeBV ** 3) * ((state.difficulty ** 3) + 1)) /
  ((state.clicks * 3 || 1) * (state.time  * 2 || 1))
) * (!state.losingCell.x ? 10000 : 0));
