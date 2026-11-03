import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// Usa o Chromium já instalado no ambiente, se existir (evita download).
if (process.env.REMOTION_CHROMIUM) {
  Config.setBrowserExecutable(process.env.REMOTION_CHROMIUM);
}
