# Prototyping

1. clone <https://github.com/ming024/FastSpeech2/>.
2. read FastSpeech2's README, follow the instruction to download the models for
   inference.
3. troubleshoot until you can generate speeches with `synthesize.py`.
   - if you are on ARM Mac, consider apply the first patch first.
   - IIRC you need to decompress `hifigan/*.pth.tar.zip` into
     `hifigan/*.pth.tar`.
4. apply patches. (based on `d4e79eb52e8b01d24703b2dfc0385544092958f3`)
5. troubleshhot. It works on my machine, but I'm not sure had I (GitHub Copilot,
   actually) made changes that would break on other platforms…
6. run (assuming you use `uv`):

   ```sh
   uv run synthesize.py --text "要说的话" --duration_control=0.8 --copy-prosody-data-only \
     --speaker_id 1 --restore_step 600000 --mode single -p config/AISHELL3/preprocess.yaml -m config/AISHELL3/model.yaml -t config/AISHELL3/train.yaml
   ```
