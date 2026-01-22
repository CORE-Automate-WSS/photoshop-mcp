/**
 * Layer Commands
 *
 * Commands for working with Photoshop layers.
 */

const photoshop = require('photoshop');
const { app, core, action } = photoshop;
const { executeAsModal } = core;
const { batchPlay } = action;

/**
 * Recursively collect layers from a layer tree
 */
function collectLayers(layers, includeHidden = true) {
  const result = [];

  for (const layer of layers) {
    if (!includeHidden && !layer.visible) continue;

    result.push({
      id: layer.id,
      name: layer.name,
      kind: layer.kind,
      visible: layer.visible,
      opacity: layer.opacity,
      blendMode: layer.blendMode,
      locked: layer.locked,
      isGroup: layer.kind === 'group',
      bounds: layer.bounds ? {
        left: layer.bounds.left,
        top: layer.bounds.top,
        right: layer.bounds.right,
        bottom: layer.bounds.bottom,
      } : null,
    });

    // Recurse into groups
    if (layer.layers && layer.layers.length > 0) {
      const children = collectLayers(layer.layers, includeHidden);
      result.push(...children);
    }
  }

  return result;
}

/**
 * List all layers in the document
 */
async function list(params) {
  const doc = app.activeDocument;

  if (!doc) {
    return {
      ok: false,
      changed: false,
      error: 'No active document',
    };
  }

  const includeHidden = params.includeHidden !== false;
  const layers = collectLayers(doc.layers, includeHidden);

  return {
    ok: true,
    changed: false,
    data: {
      documentId: doc.id,
      layerCount: layers.length,
      layers,
    },
  };
}

/**
 * Select a layer by ID
 */
async function select(params) {
  const { layerId } = params;
  const doc = app.activeDocument;

  if (!doc) {
    return {
      ok: false,
      changed: false,
      error: 'No active document',
    };
  }

  if (layerId === undefined) {
    return {
      ok: false,
      changed: false,
      error: 'layerId is required',
    };
  }

  try {
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: 'select',
              _target: [
                {
                  _ref: 'layer',
                  _id: layerId,
                },
              ],
              makeVisible: false,
            },
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: 'Select Layer' }
    );

    return {
      ok: true,
      changed: true,
      data: { selectedLayerId: layerId },
    };
  } catch (error) {
    return {
      ok: false,
      changed: false,
      error: `Failed to select layer: ${error.message}`,
    };
  }
}

/**
 * Rename a layer
 */
async function rename(params) {
  const { layerId, name } = params;
  const doc = app.activeDocument;

  if (!doc) {
    return {
      ok: false,
      changed: false,
      error: 'No active document',
    };
  }

  if (layerId === undefined || !name) {
    return {
      ok: false,
      changed: false,
      error: 'layerId and name are required',
    };
  }

  try {
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: 'set',
              _target: [
                {
                  _ref: 'layer',
                  _id: layerId,
                },
              ],
              to: {
                _obj: 'layer',
                name: name,
              },
            },
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: 'Rename Layer' }
    );

    return {
      ok: true,
      changed: true,
      data: { layerId, name },
    };
  } catch (error) {
    return {
      ok: false,
      changed: false,
      error: `Failed to rename layer: ${error.message}`,
    };
  }
}

/**
 * Set layer visibility
 */
async function setVisibility(params) {
  const { layerId, visible } = params;
  const doc = app.activeDocument;

  if (!doc) {
    return {
      ok: false,
      changed: false,
      error: 'No active document',
    };
  }

  if (layerId === undefined || visible === undefined) {
    return {
      ok: false,
      changed: false,
      error: 'layerId and visible are required',
    };
  }

  try {
    await executeAsModal(
      async () => {
        const command = visible ? 'show' : 'hide';
        await batchPlay(
          [
            {
              _obj: command,
              null: [
                {
                  _ref: 'layer',
                  _id: layerId,
                },
              ],
            },
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: visible ? 'Show Layer' : 'Hide Layer' }
    );

    return {
      ok: true,
      changed: true,
      data: { layerId, visible },
    };
  } catch (error) {
    return {
      ok: false,
      changed: false,
      error: `Failed to set layer visibility: ${error.message}`,
    };
  }
}

/**
 * Set layer opacity
 */
async function setOpacity(params) {
  const { layerId, opacity } = params;
  const doc = app.activeDocument;

  if (!doc) {
    return {
      ok: false,
      changed: false,
      error: 'No active document',
    };
  }

  if (layerId === undefined || opacity === undefined) {
    return {
      ok: false,
      changed: false,
      error: 'layerId and opacity are required',
    };
  }

  if (opacity < 0 || opacity > 100) {
    return {
      ok: false,
      changed: false,
      error: 'opacity must be between 0 and 100',
    };
  }

  try {
    await executeAsModal(
      async () => {
        await batchPlay(
          [
            {
              _obj: 'set',
              _target: [
                {
                  _ref: 'layer',
                  _id: layerId,
                },
              ],
              to: {
                _obj: 'layer',
                opacity: {
                  _unit: 'percentUnit',
                  _value: opacity,
                },
              },
            },
          ],
          { synchronousExecution: true }
        );
      },
      { commandName: 'Set Layer Opacity' }
    );

    return {
      ok: true,
      changed: true,
      data: { layerId, opacity },
    };
  } catch (error) {
    return {
      ok: false,
      changed: false,
      error: `Failed to set layer opacity: ${error.message}`,
    };
  }
}

module.exports = {
  list,
  select,
  rename,
  setVisibility,
  setOpacity,
};
