export const MODELS_CHANGED = 'silk:models-changed';

export const emitModelsChanged = () => {
  window.dispatchEvent(new Event(MODELS_CHANGED));
};