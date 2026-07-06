const { getSourceNotes } = require('./lib/probability');

exports.main = async (event = {}) => {
  return getSourceNotes(event.metricIds || []);
};
