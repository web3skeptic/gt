// Reactive sync status shared between the db layer and the UI.
export const syncStatus = $state({
  state: 'off',      // off | connecting | syncing | idle | error
  error: '',
  lastSync: null,    // epoch ms of the last completed sync round
  lastChange: null,  // epoch ms of the last replicated document
  remote: ''
});

export function setStatus(patch) {
  Object.assign(syncStatus, patch);
  if (patch.state) console.info('[sync]', patch.state, patch.error || '');
}
