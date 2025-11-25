# Notoko

This repository contains various utilities that <ruby>I<rt>Umaĵo</rt></ruby>:

- built myself,
- asked LLMs (GitHub Copilot) to build, or
- adapted from other projects, with or without the help of LLMs,

to enable Software-Talk characters — who do not natively speak Mandarin — to
speak Mandarin in videos I (will) produce, using methods that are both legal and
ethical (See the FAQ section below for details.).

## FAQ

### Where is the name “Notoko” from?

Originally, there was only `notoko-sync` (and the patches for fastspeech2).
`notoko-sync` is a script for Synthesizer V — a singing synthesizer — that makes
SynthV voicebanks speak by adjusting pitch settings. The script's name is a
wordplay on another software called `KotonoSync`, which controls VOICEROID — a
speech synthesizer — and makes VRoid voicebanks sing by adjusting pitch
settings. Bonus: <ruby>ノート<rt>nōto</rt></ruby> means notes, just as
<ruby>言<rt>koto</rt></ruby> means words.

Later, when <ruby>I<rt>Umaĵo</rt></ruby> began making a video about what I had
done, I found the experience of interacting with the modified FastSpeech2
project solely through the CLI unsatisfying, so I started building the web UI.
At that point, I decided to unify these related sub-projects under the shared
prefix `notoko`.

Note: I do not associate this project’s name with the Kotonoha sisters in any
sense, even though I started this project because of them.

### How do <ruby>you<rt>Umaĵo</rt></ruby> define “legal and ethical” in this context?

Examples of actions I consider legal and ethical, and therefore I (will) do:

- Training and using generative AI[^1] models as long as the dataset is legal
  and ethical (e.g., AISHELL-3[^2]).
- Importing data — whose generation involves legal and ethical AI models — into
  a Synthesizer V Studio 2 project via its scripting system.
  - I have contacted Dreamtonics support[^3]; they told me they do not restrict
    the use of input data generated in this way.

Examples of actions I will NOT perform, as I consider them illegal, unethical,
or both:

- Cloning someone’s voice without their permission, whether through fine-tuning
  or by supplying reference audio. (The core issue is consent, not the
  underlying technology. For example, since I allow myself to clone my own
  voice, doing so is acceptable.)
- Using Synthesizer V’s output audio “as the input to a singing synthesis or
  speech synthesis model, algorithm, application or any data-driven workflow
  that generates singing voice or speech.” This is quoted from the _Dreamtonics
  Synthesizer V Voice Database End-User License Agreement_, and I will not
  implement features that could lead to EULA violations.
  - Since a web UI may be interpreted as a “data-driven workflow that generates
    singing voice or speech,” I will not implement features such as
    “automatically controlling the Synthesizer V editor to render audio and then
    re-importing that audio into the UI”.

[^1]: The same technology used by AI singing & speech synthesizers such as
    Synthesizer V AI, VOCALOID6, A.I.VOICE 2, VOICEVOX, and others. See also:
    <https://x.com/_JOEZCafe/status/1991137832803381527>. I hope people can stop
    uncritically attaching negative connotations to this neutral term.

[^2]: <https://www.aishelltech.com/aishell_3>, licensed under the Apache License
    2.0.

[^3]: `support-cn at dreamtonics dot com`
