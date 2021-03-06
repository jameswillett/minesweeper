import axios from 'axios';
import jarbler from './jarbler';

const api = axios.create({
  baseURL: `http://${
    process.env.NODE_ENV === 'production'
      ? 'cokebustapi.herokuapp.com'
      : 'localhost:4000'
  }/minesweeper`,
});

export const getTop50 = () =>
  api.get('top50')
    .catch(() => ({
      data: {
        rows: []
      },
    }));

export const newGame = (startedAt, minClicks, difficulty) =>
  api.post('newgame', { startedAt, minClicks, difficulty }).catch((e) => {
    alert('something went wrong. your score wont be recorded but you can still play');
    return { data: { id: null } };
  });

export const sendClick = (id, startedAt, key) => {
  if (!id) return Promise.resolve();
  return api.post('recordclick', { id, startedAt, key: jarbler(key) });
};

export const gameOverCall = id =>
  api.get(`gameover/${id}`);

export const registerScore = (id, clicks, startedAt, board, difficulty, key) => {
  if (!id) return;
  return api.post('newscore', {
    id,
    clicks,
    startedAt,
    key: jarbler(key),
    endedAt: new Date(),
    board,
    difficulty
  });
};

export const registerName = (id, name) => {
  if (!id) return Promise.resolve({});
  return api.post('registername', { id, name });
}
