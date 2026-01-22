/**
 * App Commands
 *
 * Commands for querying Photoshop application state.
 */

const photoshop = require('photoshop');
const { app } = photoshop;

/**
 * Get Photoshop application info
 */
async function getInfo() {
  return {
    ok: true,
    changed: false,
    data: {
      name: app.name,
      version: app.version,
      build: app.buildNumber || null,
      platform: process.platform,
      locale: app.locale,
      currentTool: app.currentTool?.name || null,
    },
  };
}

module.exports = {
  getInfo,
};
