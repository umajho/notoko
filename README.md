# Notoko

This repository contains various utilities that I (Umaĵo):

- built myself,
- asked LLMs (GitHub Copilot) to build, or
- adapted from other projects, with or without the help of LLMs,

to enable Software-Talk characters — who do not natively speak Mandarin — to
speak Mandarin in videos I (will) produce, using methods that are both legal and
ethical.

- Examples of actions I consider legal and ethical, and therefore I (will) do:
  - Training and using generative AI[^1] models as long as the dataset is legal
    and ethical (e.g., AISHELL-3[^2]).
  - Importing data — whose generation involves legal and ethical AI models —
    into a Synthesizer V Studio 2 project via its plugin system.
    - I have contacted Dreamtonics support[^3]; they told me they do not
      restrict the use of input data generated in this way.

- Examples of actions I will NOT perform, as I consider them illegal, unethical,
  or both:
  - Cloning someone’s voice without their permission, whether through
    fine-tuning or by supplying reference audio. (The core issue is consent, not
    the underlying technology. For example, since I allow myself to clone my own
    voice, doing so is acceptable.)
  - Using Synthesizer V’s output audio “as the input to a singing synthesis or
    speech synthesis model, algorithm, application or any data-driven workflow
    that generates singing voice or speech.” This is quoted from the
    _Dreamtonics Synthesizer V Voice Database End-User License Agreement_, and I
    will not implement features that could lead to EULA violations.
    - Since a web UI may be interpreted as a “data-driven workflow that
      generates singing voice or speech,” I will not implement features such as
      “automatically controlling the Synthesizer V editor to render audio and
      then re-importing that audio into the UI”.

[^1]: The same technology used by AI singing & speech synthesizers such as
    Synthesizer V AI, VOCALOID6, A.I.VOICE 2, VOICEVOX, and others. See also:
    <https://x.com/_JOEZCafe/status/1991137832803381527>. I hope people can stop
    uncritically attaching negative connotations to this neutral term.

[^2]: <https://www.aishelltech.com/aishell_3>, licensed under the Apache License
    2.0.

[^3]: `support-cn at dreamtonics dot com`
