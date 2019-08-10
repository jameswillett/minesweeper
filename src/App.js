import React, { Component } from 'react';
import './App.css';
import {
  // none,
  // equals,
  reduce,
  splitEvery,
  lensPath,
  set,
  flatten,
} from 'ramda';

const difficulties = [
  "I'm too young to die",
  'Hey, not too rough',
  'Hurt me plenty',
  'Ultra-Violence',
  'Nightmare!',
];
const widths = [10, 13, 15, 25, 35];
const mineCounts = [10, 15, 30, 99, 300];

const getOverlay = (cell, gameOver, hintCell) => {
  if (cell.clicked) {
    if (cell.isMine) {
      return '💥';
    }
    if (cell.count > 0) {
      return cell.count;
    }
  } else if (cell.flagged) {
    if (gameOver) {
      return !cell.isMine ? '❌' : '✅';
    }
    return '🚩';
  } else if (cell.dunno) {
    return '❓';
  }
  if (!cell.clicked && hintCell && hintCell.x === cell.x && hintCell.y === cell.y) {
    return '🈁';
  }
}

const colors = [
  'like blue but with more dimensions',
  'blue',
  'green',
  'red',
  'purple',
  'maroon',
  'turquoise',
  'black',
  'darkgray',
];

const getNeighbors = (x, y, b, includeDiag = true) => [
  b[y - 1] && includeDiag && b[y - 1][x - 1],
  b[y] && b[y][x - 1],
  b[y + 1] && includeDiag && b[y + 1][x - 1],
  b[y - 1] && b[y - 1][x],
  b[y + 1] && b[y + 1][x],
  b[y - 1] && includeDiag && b[y - 1][x + 1],
  b[y] && b[y][x + 1],
  b[y + 1] && includeDiag && b[y + 1][x + 1],
].filter(x => x);

const propagate = (cell, board, acc) => {
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

const propogateMap = reduce((a, c) => ({...a, [c.y]: { ...a[c.y], [c.x]: true }}), {});

const makeBoard = (diff) => {
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

class App extends Component {
  constructor() {
    super();
    this.state = {
      playing: false,
      difficulty: 0,
      selectedDiff: 0,
      gameOver: true,
      board: makeBoard(0),
      losingCell: {},
      timer: null,
      time: 0,
      clicks: 0,
      flags: 0,
      status: '🙂',
      hint: null,
      touchTimer: null,
    };
    this.handleSelect = this.handleSelect.bind(this);
    this.startGame = this.startGame.bind(this);
    this.handleCellRightClick = this.handleCellRightClick.bind(this);
    this.updateCellState = this.updateCellState.bind(this);
    this.handleCellClick = this.handleCellClick.bind(this);
    this.gameOver = this.gameOver.bind(this);
    this.suspense = this.suspense.bind(this);
    this.winnerWinnerChickenDinner = this.winnerWinnerChickenDinner.bind(this);
    this.hint = this.hint.bind(this);
    // this.handlePointerDown = this.handlePointerDown.bind(this);
    // this.handlePointerUp = this.handlePointerUp.bind(this);
    // this.handlePointerMove = this.handlePointerMove.bind(this);
  }

  componentWillUnmount() {
    if (this.state.timer) {
      clearInterval(this.state.timer);
    }
  }

  handleSelect(e) {
    this.setState({
      selectedDiff: Number(e.target.value),
    })
  }

  updateCellState(cell, cb = () => {}) {
    this.setState({
      board: set(lensPath([cell.y, cell.x]), cell, this.state.board),
    }, cb);
  }

  handleCellRightClick(e, cell) {
    e.preventDefault();
    let props = {};
    if (!cell.clicked && !this.state.gameOver) {
      if (!cell.flagged && !cell.dunno && this.state.flags > 0) {
        props = { flagged: true };
      } else if (cell.flagged && !cell.dunno) {
        props = { flagged: false, dunno: true };
      } else {
        props = { flagged: false, dunno: false };
      }
      this.updateCellState({ ...cell, ...props }, () => {
        this.setState({
          flags: mineCounts[this.state.difficulty] - flatten(this.state.board)
            .filter(c => c.flagged)
            .length,
        })
      })
    }
  }

  gameOver(losingCell) {
    console.log('game over man, game over');
    if (this.state.timer) clearInterval(this.state.timer);
    this.setState({
      gameOver: true,
      losingCell,
      status: '🤮',
    });
  }

  winnerWinnerChickenDinner() {
    console.log('winnerWinnerChickenDinner')
    if (this.state.timer) clearInterval(this.state.timer);
    const score = Math.floor(((mineCounts[this.state.difficulty] ** 2) / (this.state.clicks * this.state.time)) * 10000);
    alert(`your score is ${score}. not great, not terrible. you definitely didnt apply yourself`);
    this.setState({
      status: '😎',
      gameOver: true,
    });
  }

  handleCellClick(cell) {
    if (!cell.clicked && !cell.flagged && !cell.dunno && !this.state.gameOver) {
      this.updateCellState({ ...cell, clicked: true }, () => {
        if (cell.isMine) {
          this.gameOver(cell);
        } else {
          const p = propogateMap(propagate({ ...cell, clicked: true }, this.state.board))

          const maybeResetHint = this.state.hint && ((
            p[this.state.hint.y] &&
            p[this.state.hint.y][this.state.hint.x]
          ) || (
            cell.y === this.state.hint.y &&
            cell.x === this.state.hint.x
          ))
              ? { hint: null }
              : {};

          const newBoard = this.state.board.map((row, y) => row.map((cell, x) => {
            if (p && p[y] && p[y][x]) return { ...cell, clicked: !cell.flagged && !cell.dunno };
            return cell;
          }));

          this.setState({
            board: newBoard,
            status: '🙂',
            clicks: this.state.clicks + 1,
            ...maybeResetHint,
          }, () => {
            if (
              flatten(this.state.board)
                .filter(c => !c.clicked)
                .length === mineCounts[this.state.difficulty]
            ) {
              this.winnerWinnerChickenDinner();
             }
          });
        }
      });
    }
  }

  startGame() {
    if (this.state.timer) clearInterval(this.state.timer);
    this.setState({
      difficulty: this.state.selectedDiff,
      board: makeBoard(this.state.selectedDiff),
      playing: true,
      gameOver: false,
      timer: setInterval(() => this.setState({ time: this.state.time + 1 }), 1000),
      time: 0,
      clicks: 0,
      status: '🙂',
      flags: mineCounts[this.state.selectedDiff],
      hint: null,
    });
  }

  suspense(e) {
    if (e.button === 0 && !this.state.gameOver) {
      this.setState({ status: '😲' });
    }
  }

  hint() {
    const gaps = flatten(this.state.board).filter(c => !c.isMine && !c.clicked && !c.flagged && !c.dunno && !c.count);
    if (gaps.length === 0) return;
    const hintCell = gaps[Math.floor(Math.random() * gaps.length)];
    this.setState({
      clicks: this.state.clicks + 10,
      hint: hintCell,
    });
  }

  // handlePointerDown(cell) {
  //   return (e) => {
  //     e.preventDefault();
  //     if (e.pointerType === 'mouse') {
  //       if (e.button === 0) {
  //         return this.suspense(e);
  //       }
  //       if (e.button === 2) {
  //         // onContextMenu works better
  //         // return this.handleCellRightClick(e, cell);
  //       }
  //     } else if (e.pointerType === 'touch') {
  //       if (!this.state.gameOver) {
  //         this.setState({
  //           status: '😲',
  //           touchTimer: setTimeout(() => this.setState({ touchTimer: null }), 500),
  //         });
  //       }
  //     }
  //   }
  // }

  // handlePointerUp(cell) {
  //   return (e) => {
  //     if (e.pointerType === 'mouse') {
  //       if (e.button === 0) {
  //         return this.handleCellClick(cell);
  //       }
  //     }
  //     if (e.pointerType === 'touch') {
  //       if (this.state.touchTimer) {
  //         clearInterval(this.state.touchTimer);
  //         this.setState({ touchTimer: null });
  //         return this.handleCellClick(cell);
  //       }
  //       return this.handleCellRightClick(e, cell);
  //     }
  //   }
  // }

  // handlePointerMove(e) {
  //   console.log(e);
  // }

  render() {
    const isLosingCell = cell =>
      this.state.losingCell.x === cell.x && this.state.losingCell.y === cell.y;

    return (
      <div className="App">
        {this.state.gameOver &&
          <div>
            <div>Start new game</div>
            <select value={this.state.selectedDiff} onChange={this.handleSelect}>
              {difficulties.map((d, i) => (
                <option key={d} value={i}>{d}</option>
              ))}
            </select>
            <button onClick={this.startGame}>GO!</button>
          </div>
        }
        {this.state.playing &&
          <div style={{ display: 'inline-block' }}>
            <div className="hud">
              <span style={{ float: 'left' }}>{this.state.flags}</span>
              <button className="statusGuy" onClick={this.startGame}>{this.state.status}</button>
              <span style={{ float: 'right' }}>{String(this.state.time).padStart(3, '0')}</span>
              <br />
            </div>
            {this.state.board.map(row => (
              <div className="row">
                {row.map(cell => (
                  <button
                    className={cell.clicked ? 'clicked' : 'butt'}
                    style={cell.clicked && !cell.flagged && !cell.dunno && !cell.isMine ? {
                      color: colors[cell.count], fontWeight: 900,
                    }: {}}
                    disabled={cell.clicked}
                    onContextMenu={(e) => this.handleCellRightClick(e, cell)}
                    onClick={() => this.handleCellClick(cell)}
                    onMouseDown={this.suspense}
                    // onPointerDown={this.handlePointerDown(cell)}
                    // onPointerUp={this.handlePointerUp(cell)}
                    // onPointerMove={this.handlePointerMove}
                  >
                    {this.state.gameOver && !cell.flagged && cell.isMine && !isLosingCell(cell)
                      ? '💩'
                      : getOverlay(cell, this.state.gameOver, this.state.hint)
                    }
                  </button>
                ))}
              </div>
            ))}
            <button disabled={this.state.hint} onClick={this.hint}>Gimme a dang hint</button>
          </div>
        }
      </div>
    );
  }
}

export default App;
