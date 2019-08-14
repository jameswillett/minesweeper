import axios from 'axios';

console.log(process.env);
const api = axios.create({
  baseURL: `http://${
    process.env.NODE_ENV === 'production'
      ? 'cokebustapi.herokuapp.com'
      : 'localhost:4000'
  }/minesweeper`,
});

export const getTop50 = () =>
  api.get('top50');

export const newGame = (startedAt, minClicks, difficulty) =>
  api.post('newgame', { startedAt, minClicks, difficulty });

export const sendClick = (id, startedAt) =>
  api.post('recordclick', { id, startedAt });

export const gameOverCall = id =>
  api.get(`gameover/${id}`);

export const registerScore = (id, clicks, startedAt, board, difficulty) =>
  api.post('newscore', { id, clicks, startedAt, endedAt: new Date(), board, difficulty }).catch(console.log);

export const registerName = (id, name) =>
  api.post('registername', { id, name });
