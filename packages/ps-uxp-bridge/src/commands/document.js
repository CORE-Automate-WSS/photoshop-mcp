/**
 * Document Commands
 *
 * Commands for working with Photoshop documents.
 */

const photoshop = require('photoshop');
const { app, core } = photoshop;
const { executeAsModal } = core;

/**
 * Get the active document info
 */
async function getActive() {
  const doc = app.activeDocument;

  if (!doc) {
    return {
      ok: false,
      changed: false,
      error: 'No active document',
    };
  }

  return {
    ok: true,
    changed: false,
    data: {
      id: doc.id,
      name: doc.name,
      path: doc.path || null,
      width: doc.width,
      height: doc.height,
      resolution: doc.resolution,
      mode: doc.mode,
      colorProfile: doc.colorProfileName || null,
      bitsPerChannel: doc.bitsPerChannel,
      layerCount: doc.layers?.length || 0,
    },
  };
}

/**
 * Open a document
 */
async function open(params) {
  const { path } = params;

  if (!path) {
    return {
      ok: false,
      changed: false,
      error: 'Path is required',
    };
  }

  try {
    const result = await executeAsModal(
      async () => {
        const doc = await app.open(path);
        return {
          id: doc.id,
          name: doc.name,
          width: doc.width,
          height: doc.height,
        };
      },
      { commandName: 'Open Document' }
    );

    return {
      ok: true,
      changed: true,
      data: result,
    };
  } catch (error) {
    return {
      ok: false,
      changed: false,
      error: `Failed to open document: ${error.message}`,
    };
  }
}

/**
 * Save the current document
 */
async function save() {
  const doc = app.activeDocument;

  if (!doc) {
    return {
      ok: false,
      changed: false,
      error: 'No active document',
    };
  }

  try {
    await executeAsModal(
      async () => {
        await doc.save();
      },
      { commandName: 'Save Document' }
    );

    return {
      ok: true,
      changed: true,
      data: { saved: true },
    };
  } catch (error) {
    return {
      ok: false,
      changed: false,
      error: `Failed to save document: ${error.message}`,
    };
  }
}

/**
 * Save document to a new path
 */
async function saveAs(params) {
  const { path, format } = params;
  const doc = app.activeDocument;

  if (!doc) {
    return {
      ok: false,
      changed: false,
      error: 'No active document',
    };
  }

  if (!path) {
    return {
      ok: false,
      changed: false,
      error: 'Path is required',
    };
  }

  try {
    await executeAsModal(
      async () => {
        // Determine format from extension if not provided
        const ext = format || path.split('.').pop().toLowerCase();

        const entry = await require('uxp').storage.localFileSystem.getFileForSaving(path);

        switch (ext) {
          case 'psd':
            await doc.saveAs.psd(entry);
            break;
          case 'png':
            await doc.saveAs.png(entry);
            break;
          case 'jpg':
          case 'jpeg':
            await doc.saveAs.jpg(entry, { quality: 10 });
            break;
          default:
            await doc.saveAs.psd(entry);
        }
      },
      { commandName: 'Save Document As' }
    );

    return {
      ok: true,
      changed: true,
      data: { path },
    };
  } catch (error) {
    return {
      ok: false,
      changed: false,
      error: `Failed to save document: ${error.message}`,
    };
  }
}

module.exports = {
  getActive,
  open,
  save,
  saveAs,
};
