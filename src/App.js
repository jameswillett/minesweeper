import React, { Component } from 'react';
import './App.css';
import {
  lensPath,
  set,
  flatten,
} from 'ramda';

import {
  difficulties,
  mineCounts,
} from './difficultyConstants';
import {
  get3BV,
  propagate,
  propagateMap,
  makeBoard,
  score,
} from './functions';
import {
  getTop50,
  gameOverCall,
  newGame,
  sendClick,
  registerScore,
  registerName,
} from './apiStuff';



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



class App extends Component {
  constructor() {
    super();
    const board = makeBoard(0);
    const threeBV = get3BV(board)
    this.state = {
      playing: false,
      difficulty: 0,
      selectedDiff: 0,
      gameOver: true,
      board,
      threeBV,
      losingCell: {},
      timer: null,
      time: 0,
      clicks: 0,
      flags: 0,
      status: '🙂',
      hint: null,
      touchTimer: null,
      skipContextMenu: false,
      music: true,
      startedAt: null,
      gameID: null,
      top50: [],
      scoreNeighbors: [],
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
    this.handlePointerDown = this.handlePointerDown.bind(this);
    this.handlePointerUp = this.handlePointerUp.bind(this);
    this.handlePointerLeave = this.handlePointerLeave.bind(this);
    this.toggleMusic = this.toggleMusic.bind(this);
    this.setTop50 = this.setTop50.bind(this);
  }

  componentDidMount() {
    this.setTop50();
  }

  componentWillUnmount() {
    if (this.state.timer) {
      clearInterval(this.state.timer);
    }
    if (this.state.gameID) {
      gameOverCall(this.state.gameID)
    }
  }

  setTop50(top50) {
    getTop50()
      .then(({ data }) => {
        this.setState({ top50: data.rows });
      });
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

  handleCellRightClick(cell) {
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

  gameOver(losingCell, skipStatus = false) {
    console.log('game over man, game over');
    if (this.state.timer) clearInterval(this.state.timer);
    gameOverCall(this.state.gameID).catch(console.log)
    const maybeUpdateStatus = skipStatus ? { status: '🤮' } : {};
    this.setState({
      gameOver: true,
      gameID: null,
      losingCell,
      ...maybeUpdateStatus,
    });
  }

  winnerWinnerChickenDinner() {
    console.log('winnerWinnerChickenDinner')
    if (this.state.timer) clearInterval(this.state.timer);
    const gameID = this.state.gameID;
    registerScore(
      this.state.gameID,
      this.state.clicks,
      this.state.startedAt,
      this.state.board,
      this.state.difficulty,
    );
    this.setState({
      status: '😎',
      gameOver: true,
      gameID: null,
    }, () => {
      let name = prompt(`
        your score is ${score(this.state)}.
        not great, not terrible. you definitely didnt apply yourself
        Whats your name?
      `);
      if (!name) {
        name = prompt(`
          Seriously gimme your name. if you dont give me your name
          i wont record your score
        `);
      }
      if (!name) {
        alert('wow you are just so humble.');
        this.gameOver({}, true);
      } else {
        registerName(gameID, name)
          .then(this.setTop50)
      }
    });
  }

  handleCellClick(cell) {
    if (!cell.clicked && !cell.flagged && !cell.dunno && !this.state.gameOver) {
      this.updateCellState({ ...cell, clicked: true }, () => {
        if (cell.isMine) {
          this.gameOver(cell);
        } else {
          const p = propagateMap(propagate({ ...cell, clicked: true }, this.state.board))

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

          sendClick(this.state.gameID, this.state.startedAt)
            .catch(() => {
              alert('something went wrong. your score wont be recorded but you can still play');
              this.setState({
                gameID: null,
              });
            })
            .then(() => {
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
            });
        }
      });
    }
  }

  startGame() {
    if (this.state.timer) clearInterval(this.state.timer);
    const board = makeBoard(this.state.selectedDiff);
    const threeBV = get3BV(board);
    const startedAt = new Date();

    newGame(startedAt, threeBV, this.state.selectedDiff)
      .then(({ data }) =>
        this.setState({
          difficulty: this.state.selectedDiff,
          board,
          threeBV,
          playing: true,
          gameOver: false,
          losingCell: {},
          timer: setInterval(() => this.setState({ time: this.state.time + 1 }), 1000),
          time: 0,
          clicks: 0,
          status: '🙂',
          flags: mineCounts[this.state.selectedDiff],
          hint: null,
          startedAt,
          gameID: data.id,
        })
      );
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

  handlePointerDown(cell) {
    return (e) => {
      e.preventDefault();
      if (e.pointerType === 'mouse') {
        if (e.button === 0) {
          return this.suspense(e);
        }
        if (e.button === 2) {
          // onContextMenu works better
          return this.handleCellRightClick(cell);
        }
      } else {
        if (!this.state.gameOver) {
          this.setState({
            status: '😲',
            touchTimer: setTimeout(() => {
              this.setState({ touchTimer: null, status: '🙂', skipContextMenu: true });
              this.handleCellRightClick(cell);
            }, 450),
          });
        }
      }
    }
  }

  handlePointerUp(cell) {
    return (e) => {
      if (e.pointerType === 'mouse') {
        if (e.button === 0) {
          return this.handleCellClick(cell);
        }
      } else {
        e.preventDefault();
        if (this.state.touchTimer) {
          clearInterval(this.state.touchTimer);
          this.setState({ touchTimer: null });
          this.handleCellClick(cell);
        }
        if (this.state.skipContextMenu) this.setState({ skipContextMenu: false });
      }
    }
  }

  handlePointerLeave(e) {
    if (this.state.touchTimer) {
      clearInterval(this.state.touchTimer);
      this.setState({ touchTimer: null });
    }
  }

  toggleMusic() {
    if (this.state.music) {
      this.player.pause();
      this.player.currentTime = 0;
    } else {
      this.player.play();
    }
    this.setState({ music: !this.state.music });
  }

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
            <div className="hud">Score: {score(this.state)}</div>
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
                    onMouseUp={(e) => {
                      if (e.button === 0) {
                        this.handleCellClick(cell)
                      }
                    }}
                    onMouseDown={this.suspense}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (!this.state.skipContextMenu) {
                        this.handleCellRightClick(cell);
                      } else {
                        this.setState({ skipContextMenu: false });
                      }
                    }}
                    onTouchStart={this.handlePointerDown(cell)}
                    onTouchEnd={this.handlePointerUp(cell)}
                    onTouchMove={this.handlePointerLeave}
                    // onTouchCancel={this.handlePointerLeave}
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
            <br />
            {!this.state.gameOver &&
              <div>
                <audio loop autoPlay ref={ref => this.player = ref}>
                  <source src='spiderman.mp3' />
                </audio>
                <button onClick={this.toggleMusic}>
                  PLEASE {this.state.music ? 'STOP' : 'START'} THE MUSIC
                </button>
              </div>
            }
            <div>
              You like this dang site?<br />
              <a href="https://github.com/jameswillett/minesweeper">
                Here&apos;s the dang code
              </a>.
            </div>
          </div>
        }
        <div className="scoreBoard">
          {this.state.top50 &&
            <table>
              <tr>
                <th>RANK</th>
                <th>NAME</th>
                <th>SCORE</th>
                <th>DIFFICULTY</th>
              </tr>
              {this.state.top50.map((s, i) => (
                <tr>
                  <td>{i + 1}</td>
                  <td>{s.name}</td>
                  <td>{s.score}</td>
                  <td>{difficulties[s.difficulty]} ({s.difficulty + 1})</td>
                </tr>
              ))}
            </table>
          }
        </div>
      </div>
    );
  }
}

export default App;
