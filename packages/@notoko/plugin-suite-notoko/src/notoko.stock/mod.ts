import {
  definePluginHandlers,
  PluginInstanceFunctionalityKey,
} from "@notoko/definitions";

import * as langCmn from "./languages/cmn/mod";

export default definePluginHandlers({
  entry: (ctx) => {
    ctx.setFunctionalities({
      [PluginInstanceFunctionalityKey.parse("languages.cmn.phonemizer")]: {
        type: "functionality:phonemizer",
        info: {
          shownName: "Builtin Mandarin",
          associatedType: "functionality:phonemizer",
          supportedInputLanguages: langCmn.phonemizerSupportedInputLanguages,
          supportedOutputSegmentationFormats:
            langCmn.phonemizerSupportedOutputSegmentationFormats,
        },
        phonemize: langCmn.phonemize,
        isValidPhoneme: langCmn.isValidPhoneme,
      },
    });
  },
});
