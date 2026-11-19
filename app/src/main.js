// Vice Cover Studio — bootstrap.
//
// Builds the editor, then hands the URL to the screenshot mode: with
// ?shot= in the address the page renders one deterministic shot instead of
// the empty editor. Without it, the editor opens ready for the user's photos.
//
// The screenshot callback takes the editor API as its argument: reading the
// outer buildEditor result here would hit the temporal dead zone, since the
// callback fires synchronously inside buildEditor, before its result exists.

import { buildEditor } from './editor.js';
import { handleShot } from './shots.js';

buildEditor(document.querySelector('#app'), (editorApi) => {
  handleShot(editorApi).catch((error) => {
    const status = document.querySelector('#status');
    if (status) status.textContent = String(error.message || error);
  });
});
