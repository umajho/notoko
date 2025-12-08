import { describe, expect, it } from "vitest";

import { LanguageWithScript, PhonemeLexicon } from "@notoko/definitions";

import { phonemize } from "./mod";

describe("function phonemize", () => {
  async function call(text: string) {
    return phonemize(
      {
        language: LanguageWithScript.parse("cmn-Hans"),
        outputPhonemeLexicon: PhonemeLexicon.parse("fastspeech2-pinyin-r"),
      },
      { text },
    );
  }

  it("works", async () => {
    expect(await call("")).toEqual(["ok", []]);
    expect(await call("测试"))
      .toEqual(["ok", [
        { text: "测", phonemes: ["c", "e4"] },
        { text: "试", phonemes: ["sh", "iii4"] },
      ]]);
    expect(await call("你好，世界！"))
      .toEqual(["ok", [
        { text: "你", phonemes: ["n", "i3"] },
        { text: "好", phonemes: ["h", "ao3"] },
        { text: "，", phonemes: ["sp"] },
        { text: "世", phonemes: ["sh", "iii4"] },
        { text: "界", phonemes: ["j", "ie4"] },
        { text: "！", phonemes: ["sp"] },
      ]]);
    expect(await call("不包含对 other languages、もじ 和 123 的支持…"))
      .toEqual(["ok", [
        { text: "不", phonemes: ["b", "u4"] },
        { text: "包", phonemes: ["b", "ao1"] },
        { text: "含", phonemes: ["h", "an2"] },
        { text: "对", phonemes: ["d", "uei4"] },
        ...(" other languages、もじ ".split("")
          .map((ch) => ({ text: ch, phonemes: ["sp"] }))),
        { text: "和", phonemes: ["h", "e2"] },
        ...(" 123 ".split("").map((ch) => ({ text: ch, phonemes: ["sp"] }))),
        { text: "的", phonemes: ["d", "e5"] },
        { text: "支", phonemes: ["zh", "iii1"] },
        { text: "持", phonemes: ["ch", "iii2"] },
        { text: "…", phonemes: ["sp"] },
      ]]);
  });
});
