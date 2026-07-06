Page({
  data: {
    sources: [],
    hasSources: false
  },

  onLoad() {
    const result = getApp().globalData.lastResult;
    const sources = result ? result.sourceNotes : [];
    this.setData({
      sources,
      hasSources: sources.length > 0
    });
  }
});
