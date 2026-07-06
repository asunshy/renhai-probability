const { getFilterOptions } = require('./lib/probability');

exports.main = async (event = {}) => {
  return getFilterOptions(event.regionCode);
};
