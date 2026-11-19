// Optional: the validator's rules for the editor's Stylelint extension, so design-system
// findings show while editing. Point the extension at this file (in VS Code,
// `stylelint.configFile`); see /editor-setup. `lint` never uses it, and `validate`
// builds the same config itself.
//
// `extends` keeps the editor showing lint's CSS errors too: set it to lint's config file.
import { fileURLToPath } from 'node:url';
import { designSystemConfig } from './scripts/ds-validate/stylelint-config.mjs';

export default designSystemConfig({
  config: fileURLToPath(new URL('./ds-validate.config.json', import.meta.url)),
  extends: ['./stylelint.config.mjs'],
});
