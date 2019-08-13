import {
  reduce,
  splitEvery,
  flatten,
} from 'ramda';

import {
  widths,
  mineCounts,
} from './difficultyConstants';

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

export const propagateMap = reduce((a, c) => ({...a, [c.y]: { ...a[c.y], [c.x]: true }}), {});

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

  console.log(edges, bits, edges.chunks + bits);
  console.log(edges.chunks + bits);

  return edges.chunks + bits;
};
