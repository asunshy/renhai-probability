function callCloud(name, data) {
  if (!wx.cloud) {
    return Promise.reject(new Error('当前基础库不支持云开发'));
  }
  return wx.cloud.callFunction({ name, data }).then((response) => response.result);
}

function calculateProbability(filters) {
  return callCloud('calculateProbability', { filters });
}

function getFilterOptions(regionCode) {
  return callCloud('getFilterOptions', { regionCode });
}

module.exports = {
  calculateProbability,
  getFilterOptions
};
