import { diacritizeText } from "@ibn-al-azhar-docs/pipeline";

export const TASHKEEL_MAX_TEXT_LENGTH = 20_000;

export class TashkeelUseCases {
  async diacritize(text: string): Promise<string> {
    const outcome = await diacritizeText(text);
    return outcome.text;
  }
}

export const tashkeelUseCases = new TashkeelUseCases();
