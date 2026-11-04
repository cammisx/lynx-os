export const MODELS_CHANGED = 'silk:models-changed';

export const emitModelsChanged = () => {
  window.dispatchEvent(new Event(MODELS_CHANGED));
};

export const SHIFTS_CHANGED = 'silk:shifts-changed';

export const emitShiftsChanged = () => {
  window.dispatchEvent(new Event(SHIFTS_CHANGED));
};