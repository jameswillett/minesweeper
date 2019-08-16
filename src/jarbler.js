const textToChars = text => text.split('').map(c => c.charCodeAt(0));
const byteHex = n => ("0" + Number(n).toString(16)).substr(-2);
const applySaltToChar = code => textToChars(process.env.REACT_APP_JARBLE_CODE).reduce((a,b) => a ^ b, code);

module.exports = text => String(text).split('')
  .map(textToChars)
  .map(applySaltToChar)
  .map(byteHex)
  .join('')
