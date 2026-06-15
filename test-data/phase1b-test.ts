/* eslint-disable no-console */
import { cleanArabicText } from "../packages/pipeline/src/text";
import { generateMarkdown, generateTxt, generateJson } from "../packages/pipeline/src/output";
import * as fs from "fs";

const OUTPUT_DIR = "test-data/output";
// const SOURCE_DIR = "test-data/source";

function main() {
  // 1. Test with real garbled Arabic from the PDF
  const garbledPath = `${OUTPUT_DIR}/pdftotext_raw.txt`;
  const garbled = fs.readFileSync(garbledPath, "utf-8");
  console.log("=== INPUT: Garbled PDF text layer ===");
  console.log(`Length: ${garbled.length} chars`);
  console.log(`First 200 chars:\n${garbled.slice(0, 200)}`);

  const cleanedGarbled = cleanArabicText(garbled);
  fs.writeFileSync(`${OUTPUT_DIR}/cleaned_garbled.txt`, cleanedGarbled);
  console.log("\n=== CLEANED: Garbled text ===");
  console.log(`Length: ${cleanedGarbled.length} chars`);
  console.log(`Output:\n${cleanedGarbled.slice(0, 500)}`);

  const mdGarbled = generateMarkdown(garbled, { title: "لا أعلم هويتي" });
  fs.writeFileSync(`${OUTPUT_DIR}/garbled_output.md`, mdGarbled.markdown);
  console.log("\n=== MARKDOWN: Garbled text ===");
  console.log(`Headings: ${mdGarbled.metadata.headingCount}`);
  console.log(`Words: ${mdGarbled.metadata.wordCount}`);
  console.log(`First 500 chars:\n${mdGarbled.markdown.slice(0, 500)}`);

  // 2. Test with simulated realistic OCR output (what Google Drive might produce)
  const simulatedOcrInput = generateSimulatedOcrInput();
  fs.writeFileSync(`${OUTPUT_DIR}/simulated_ocr_input.txt`, simulatedOcrInput);
  console.log("\n=== INPUT: Simulated OCR output ===");
  console.log(`Length: ${simulatedOcrInput.length} chars`);

  const cleanedSimulated = cleanArabicText(simulatedOcrInput);
  fs.writeFileSync(`${OUTPUT_DIR}/cleaned_simulated.txt`, cleanedSimulated);
  const mdSimulated = generateMarkdown(simulatedOcrInput, { title: "كتاب تجريبي" });
  fs.writeFileSync(`${OUTPUT_DIR}/simulated_output.md`, mdSimulated.markdown);
  fs.writeFileSync(`${OUTPUT_DIR}/simulated_output.txt`, generateTxt(mdSimulated));
  fs.writeFileSync(
    `${OUTPUT_DIR}/simulated_output.json`,
    generateJson(mdSimulated, "كتاب تجريبي.pdf"),
  );

  console.log("\n=== MARKDOWN: Simulated OCR ===");
  console.log(`Headings: ${mdSimulated.metadata.headingCount}`);
  console.log(`Words: ${mdSimulated.metadata.wordCount}`);
  console.log(`Confidence: ${(mdSimulated.metadata.confidence * 100).toFixed(1)}%`);
  console.log(`First 800 chars:\n${mdSimulated.markdown.slice(0, 800)}`);

  // 3. Test with clean Arabic text (should not damage it)
  const cleanInput = `
الفصل الأول
مقدمة في الفلسفة

تُعرف الفلسفة بأنها محبة الحكمة. وهي كلمة يونانية الأصل مكونة من مقطعين: فيلو (محبة) وسوفيا (حكمة).

يهتم الفلاسفة بأسئلة جوهرية عن الوجود والمعرفة والقيم والعقل واللغة.

المبحث الأول: تعريف الفلسفة
للفلسفة تعريفات متعددة عبر التاريخ. فمنهم من عرّفها بأنها علم العلوم، ومنهم من قال إنها التأمل في الكون والوجود.

أما في التراث الإسلامي، فقد عرّفها ابن سينا بأنها: "استكمال النفس الإنسانية بتصور الأمور كلها وتحقيقها".

المبحث الثاني: فروع الفلسفة
تنقسم الفلسفة إلى عدة فروع رئيسية:
• الميتافيزيقا (ما وراء الطبيعة)
• الإبستمولوجيا (نظرية المعرفة)
• الأكسيولوجيا (علم القيم)
• المنطق
• الجماليات

أولاً: الميتافيزيقا
تهتم الميتافيزيقا بدراسة الوجود وما وراء الطبيعة.
  `;

  const cleanedClean = cleanArabicText(cleanInput);
  fs.writeFileSync(`${OUTPUT_DIR}/cleaned_clean.txt`, cleanedClean);
  const mdClean = generateMarkdown(cleanInput, { title: "مقدمة في الفلسفة" });
  fs.writeFileSync(`${OUTPUT_DIR}/clean_output.md`, mdClean.markdown);

  console.log("\n=== CLEAN TEXT RESULTS ===");
  console.log(`Headings detected: ${mdClean.metadata.headingCount}`);
  console.log(`Words: ${mdClean.metadata.wordCount}`);
  console.log(`Output:\n${mdClean.markdown}`);

  // 4. Test with edge cases
  console.log("\n\n=== EDGE CASE TESTS ===");

  // Empty text
  const empty = generateMarkdown("");
  console.log(
    `Empty text: headings=${empty.metadata.headingCount}, words=${empty.metadata.wordCount}, md='${empty.markdown}'`,
  );

  // Only symbols
  const symbols = generateMarkdown("!!! *** --- >>> <<<");
  console.log(`Symbols only: md='${symbols.markdown}'`);

  // Mixed Arabic/English
  const mixed = generateMarkdown(
    "قال رسول الله صلى الله عليه وسلم: 'The best of you are those who learn the Quran and teach it.' رواه البخاري",
  );
  console.log(`Mixed: md='${mixed.markdown}'`);
}

function generateSimulatedOcrInput(): string {
  return `                           1
لا أعلم هُوِيَّتِي

حوار بين متشكك ومتيقن

            حسام الدين حامد

الطبعة الأولى

                  2014م / 1435هـ

الإيداع القانونى
رقم الإيداع: 213/4
القياس: 17 × 24 سم

جميع الحقوق محفوظة للناشر
يمنع طبع هذا الكتاب أو جزء منه بأي صورة من الصور
كالتصوير، والنقل، والتسجيل، والحاسوبي، وغيرها
إلا بإذن خطي من الناشر

مركز تفخر للبحوث والدراسات

العنوان: 6 ش المطرية – القاهرة
ت: 02244440
ف: 02244441
البريد الإلكتروني: info@tafakkor.com
الموقع: www.tafakkor.com

                                2

مقدمة

الحمد لله رب العالمين، والصلاة والسلام على أشرف المرسلين، سيدنا محمد وعلى آله وصحبه أجمعين.

أما بعد:

فهذا كتاب أجيب فيه عن سؤال يتردد في أذهان الكثيرين: "لا أعلم هويتي".

إن مسألة الهوية من أهم المسائل التي تشغل بال الإنسان المعاصر، خاصة في ظل العولمة وتداخل الثقافات.

وقد اخترت أن يكون الحوار بين شخصين: متشكك ومتيقن، ليكون أكثر تشويقاً وإقناعاً.

                                3

الفصل الأول
تعريف الهوية وأهميتها

الهوية لغة: مشتقة من كلمة "هو" التي تعني الذات والشخصية.

واصطلاحاً: هي مجموعة السمات والخصائص التي تميز شخصاً عن آخر، أو مجموعة عن أخرى.

وتتكون الهوية من عناصر متعددة:
- الدين
- اللغة
- التاريخ
- الثقافة
- القيم
- العادات والتقاليد

                                4

المبحث الأول: أهمية الهوية في حياة الإنسان

تعد الهوية ضرورة أساسية لحياة الإنسان، فهي:

أولاً: تمنح الإنسان الشعور بالانتماء. عندما يعرف الإنسان هويته، يشعر أنه جزء من كيان أكبر منه.

ثانياً: تحدد للإنسان مكانته في المجتمع. فالهوية تمنح الفرد إطاراً مرجعياً يفهم من خلاله العالم من حوله.

ثالثاً: الهوية مصدر للقيم والأخلاق. فكل هوية تحمل في طياتها مجموعة من القيم التي توجه سلوك الفرد.

                                5

الفصل الثاني
مكونات الهوية الإسلامية

تتكون الهوية الإسلامية من عدة مكونات أساسية، يأتي في مقدمتها:

المبحث الأول: العقيدة الإسلامية
العقيدة هي الأساس الذي تقوم عليه الهوية الإسلامية، وهي تمثل الركيزة الأولى في بناء الشخصية المسلمة.

المبحث الثاني: اللغة العربية
اللغة العربية هي وعاء الثقافة الإسلامية، وهي لغة القرآن الكريم الذي نزل بها.

المبحث الثالث: التاريخ الإسلامي
الأمة الإسلامية تمتلك تاريخاً عريقاً يمتد لأكثر من أربعة عشر قرناً.

                                                                            6

خاتمة

وفي الختام، أؤكد على أن معرفة الهوية هي الخطوة الأولى نحو بناء شخصية سوية ومتوازنة.

والله ولي التوفيق،،،

`;
}

main();
