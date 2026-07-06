const { calculateProbability } = require('./lib/probability');

exports.main = async (event = {}) => {
  return calculateProbability(event.filters || event);
};
