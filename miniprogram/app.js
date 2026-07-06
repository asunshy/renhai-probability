App({
  globalData: {
    lastResult: null,
    lastFilters: null
  },

  onLaunch() {
    if (wx.cloud) {
      wx.cloud.init({
        traceUser: false
      });
    }
  }
});
