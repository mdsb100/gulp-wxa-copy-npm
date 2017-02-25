const g = {
  Array: Array,
  Date: Date,
  Error: Error,
  Function: Function,
  Math: Math,
  Object: Object,
  RegExp: RegExp,
  String: String,
  TypeError: TypeError,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
};

/* eslint no-useless-concat:0 */
// 将关键字拆分，避免递归require自身
module.exports = g['w' + 'indow'] = g['g' + 'lobal'] = g['s' + 'elf'] = g;
