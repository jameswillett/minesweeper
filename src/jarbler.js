const textToChars = text => String(text).split('').map(c => c.charCodeAt(0));
const byteHex = n => ("0" + Number(n).toString(16)).substr(-2);
const applySaltToChar = code => textToChars(process.env.REACT_APP_JARBLE_CODE).reduce((a,b) => a ^ b, code);

const jarbler = text => String(text).split('')
  .map(textToChars)
  .map(applySaltToChar)
  .map(byteHex)
  .join('');

module.exports = () => {
  const t = Number(String(Math.random()).substring(2)).toString(36);
  return {
    t,
    jarbled: jarbler(t),
  }
};
