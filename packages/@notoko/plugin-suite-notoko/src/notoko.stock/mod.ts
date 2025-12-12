import {
  definePluginHandlers,
  FunctionalityDictionaryEntryKey,
  makeFunctionalityDictionaryEntryFqn,
  PluginId,
  PluginInstanceFunctionalityKey,
} from "@notoko/definitions";

import * as langCmn from "./languages/cmn/mod";

export default definePluginHandlers({
  entry: (ctx) => {
    ctx.setFunctionalities({
      [PluginInstanceFunctionalityKey.parse("languages.cmn.phonemizer")]: {
        info: {
          dictionaryEntryFqn: makeFunctionalityDictionaryEntryFqn(
            PluginId.parse("notoko"),
            FunctionalityDictionaryEntryKey.parse("phonemizer"),
          ),
          shownName: "Builtin Mandarin",
          specification: {
            supportedLanguages: langCmn.phonemizerSupportedInputLanguages,
            supportedOutputPhonemeLexica:
              langCmn.phonemizerSupportedOutputPhonemeLexica,
          },
        },
        methods: {
          phonemize: langCmn.phonemize,
          validatePhoneme: langCmn.validatePhoneme,
        },
      },
    });
  },
});
