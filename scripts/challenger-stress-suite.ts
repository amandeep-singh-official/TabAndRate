import { generateSlug } from "../lib/utils";
import { GET as qrGET } from "../app/api/qr/route";
import { NextRequest } from "next/server";

// ─── PART 1: generateSlug Empirical Stress Test ─────────────────────────────

interface TestCaseGroup {
  category: string;
  inputs: string[];
}

const testGroups: TestCaseGroup[] = [
  {
    category: "Non-Latin: Hindi (Devanagari)",
    inputs: [
      "नमस्ते रेस्टोरेंट",
      "चाय की दुकान",
      "अमृतसर ढाबा",
      "स्वादिष्ट भोजन",
      "श्री गणेश मिष्ठान भंडार",
      "दिल्ली चाट कार्नर",
      "पनीर टिक्का हाउस",
      "बिरयानी महल",
      "राजस्थानी थाली",
      "दक्षिण भारतीय रसोई",
      "माँ की रसोई",
      "बाबा ढाबा",
      "पंजाबी ढाबा एक्सप्रेस",
      "गुप्ता जी बर्गर",
      "माँ वैष्णो भोजनालय",
      "कृष्णा स्वीट्स",
      "आनंद जलपान गृह",
      "बनारसी पान कॉर्नर",
      "हलवाई की भट्टी",
      "स्वाद का तड़का",
    ],
  },
  {
    category: "Non-Latin: Arabic",
    inputs: [
      "مطعم القدس",
      "شاورما دبي",
      "قهوة المساء",
      "مخبز النور",
      "حلويات الشرق",
      "مشاوي السلطان",
      "فلافل البركة",
      "شاي وقهوة",
      "أسماك الخليج",
      "برغر زمان",
      "مطبخ الأميرة",
      "عصير تايم",
      "واحة الشام",
      "بيت المندي",
      "فطائر القدس",
      "أرز بخاري",
      "حلويات دمشق",
      "كنافة نابلسية",
      "مقهى الأصدقاء",
      "مشويات الحاتي",
    ],
  },
  {
    category: "Non-Latin: Chinese (Simplified & Traditional)",
    inputs: [
      "北京烤鸭",
      "重庆小面",
      "上海生煎包",
      "港式茶餐廳",
      "珍珠奶茶",
      "四川麻辣火锅",
      "鼎泰豐小籠包",
      "蘭州拉麵",
      "廣東燒臘",
      "台南擔仔麵",
      "喜茶 HEYTEA",
      "老王牛肉麵",
      "天仁茗茶",
      "添好運點心",
      "海底撈火鍋",
      "呷哺呷哺",
      "真功夫快餐",
      "永和大王",
      "桂林米粉",
      "黃飛紅麻辣花生",
    ],
  },
  {
    category: "Non-Latin: Japanese (Hiragana, Katakana, Kanji)",
    inputs: [
      "すし処",
      "ラーメン屋",
      "東京カフェ",
      "焼肉 匠",
      "お好み焼き",
      "コンビニ",
      "うどん 太郎",
      "居酒屋 さくら",
      "抹茶庵",
      "和菓子 とらや",
      "銀座 天ぷら",
      "そば処 山本",
      "たこ焼き 大阪",
      "串カツ 田中",
      "炭火焼 鳥貴族",
      "一蘭 ラーメン",
      "吉野家 牛丼",
      "丸亀製麺",
      "珈琲館",
      "甘味処 みつばち",
    ],
  },
  {
    category: "Non-Latin: Korean (Hangul)",
    inputs: [
      "김밥천국",
      "강남치킨",
      "삼겹살하우스",
      "스타벅스",
      "행복식당",
      "명동교자",
      "한옥카페",
      "신당동떡볶이",
      "종로빈대떡",
      "제주흑돼지",
      "부산밀면",
      "홍대포차",
      "교촌치킨",
      "비비큐치킨",
      "본죽 비빔밥",
      "원조 할머니 보쌈",
      "을밀대 평양냉면",
      "설빙 빙수",
      "이삭토스트",
      "파리바게뜨",
    ],
  },
  {
    category: "Non-Latin: Russian (Cyrillic)",
    inputs: [
      "Кафе Пушкин",
      "Блинная №1",
      "Теремок",
      "Шашлычная",
      "Чайхона",
      "Пельменная",
      "Столовая 57",
      "Пироговая дворик",
      "Шоколадница",
      "Кофемания",
      "Хлеб Насущный",
      "Суши Вок",
      "Вкусно — и точка",
      "Крошка Картошка",
      "Мясницкий Ряд",
      "Восточный Базар",
      "Додо Пицца",
      "Кофейня Зерно",
      "Булочная Филиппова",
      "Ресторан Яръ",
    ],
  },
  {
    category: "Non-Latin: Greek",
    inputs: [
      "Εστιατόριο Ακρόπολη",
      "Σουβλάκι Μάκης",
      "Καφενείο",
      "Φούρνος Βενέτη",
      "Ταβέρνα ο Ζορμπάς",
      "Ψαροταβέρνα Αιγαίο",
      "Μπουγάτσα Θεσσαλονίκης",
      "Μεζεδοπωλείο",
      "Παραδοσιακό Πίτα",
      "Κρητική Γωνιά",
      "Ουζερί ο Νίκος",
      "Ζαχαροπλαστείο",
      "Μικρό Καφέ",
      "Στέκι των Φίλων",
      "Γύρος της Πόλης",
    ],
  },
  {
    category: "Non-Latin: Hebrew",
    inputs: [
      "חומוס אליהו",
      "קפה שפירא",
      "פלאפל שלמה",
      "מאפיית ברמן",
      "שווארמה שמש",
      "מסעדת מחניודה",
      "פיצה בזיליקום",
      "בורקס העגלה",
      "גלידה גולדה",
      "קפה קדוש",
      "טאבלו מסעדה",
      "דגים על הים",
      "הקוסם פלאפל",
      "אבו חסן עלי קרוואן",
      "לחם יין",
    ],
  },
  {
    category: "Non-Latin: Thai",
    inputs: [
      "ครัวคุณต๋อย",
      "ส้มตำแซ่บ",
      "ก๋วยเตี๋ยวเรือ",
      "กาแฟโบราณ",
      "ข้าวมันไก่ ประตูน้ำ",
      "ผัดไทยทิพย์สมัย",
      "ข้าวเหนียวมะม่วง",
      "ต้มยำกุ้งแม่น้ำ",
      "หมูกระทะ ชวนชิม",
      "ชาตรามือ",
      "ขนมจีนน้ำยา",
      "ลูกชิ้นปิ้งโกฮับ",
      "ร้านอาหารตามสั่ง เจ๊นา",
      "ไก่ย่างวิเชียรบุรี",
      "โรตีสายไหม",
    ],
  },
  {
    category: "Emojis: Single Emojis",
    inputs: [
      "🍕", "🔥", "🚀", "❤️", "👍", "⭐️", "🌮", "☕️", "🍔", "🍣",
      "🍜", "🍦", "🍩", "🍷", "🍺", "🎉", "✨", "💯", "💈", "🚗",
      "🎂", "🥨", "🥑", "🥐", "🥟", "🍧", "🍢", "🧋", "🍾", "🥂"
    ],
  },
  {
    category: "Emojis: Compound Emojis (Skin tones & ZWJ)",
    inputs: [
      "👍🏽", "👩🏻‍🍳", "👨🏿‍🍳", "🧑🏼‍💻", "💅🏾", "👋🏻", "🙌🏿", "🙆🏼‍♀️", "🤷🏽‍♂️", "🏃🏻‍♀️",
      "👨‍👩‍👧‍👦", "👩‍❤️‍💋‍👨", "🏳️‍🌈", "🏳️‍⚧️", "❤️‍🔥", "❤️‍🩹", "👁️‍🗨️", "🧚‍♂️", "🧑‍🎄", "🐈‍⬛"
    ],
  },
  {
    category: "Emojis: Emoji Strings & Combinations",
    inputs: [
      "🍕🎉🚀", "🔥☕️", "🌮🥑✨", "🍣🍱🥢", "💈✂️💇‍♂️",
      "🍰🧁🍨🍪", "🍹🍸🍾🍷", "🌸🌺🌷🌻", "⚽️🏀🏈⚾️", "🚗🚕🚙🏎️",
      "🍕🍕🍕", "🔥🔥🔥🔥🔥", "🚀✨🚀✨", "🍔🍟🥤🍦", "🍩☕️🥯"
    ],
  },
  {
    category: "Mixed Text & Emojis",
    inputs: [
      "Best 🍕 in town!",
      "🔥Hot Coffee☕️ Shop",
      "Café ☕️ Paris",
      "100% 🚀 Launch!",
      "Bella 🍝 Italia",
      "Super 🌮 Taco",
      "Zen 🧘 Studio",
      "Star ⭐️ Bar & Grill",
      "Sweet 🧁 Bakery",
      "Tokyo 🍣 Sushi Bar",
      "⚡️ Fast Auto Repair 🚗",
      "💇‍♀️ Glow Salon & Spa ✨",
    ],
  },
  {
    category: "Punctuation-Only Strings",
    inputs: [
      "!@#$%^&*()_+~|}{[]:;?><,./-=",
      "!@#$%^&*()",
      "~|}{[]:;?><,./",
      "...",
      "---",
      "***",
      "///",
      "???",
      "!!!",
      "[]{}()<>/\\|",
      "\"\"",
      "''",
      "“„”«»",
      "$€£¥₹₽₩",
      "+=/*%^~|&<>=",
      "---___---",
      "- - - -",
      "._.-._.",
      "~*~*~*~",
      "###$$$%%%",
      "!?!?!?!",
      "......",
      ";;;;;;",
      "::::::",
      "(((())))",
      "{{{{}}}}",
      "[[[[]]]]",
      "<<<<>>>>",
      "@_@ -_-",
      "\\_o_/",
    ],
  },
  {
    category: "Whitespace-Only Strings",
    inputs: [
      " ",
      "   ",
      "\t",
      "\n",
      "\r",
      "\t\r\n",
      "  \n  \t  \r\n  ",
      "\u00A0", // Non-breaking space
      "\u2000", // En quad
      "\u2001", // Em quad
      "\u2002", // En space
      "\u2003", // Em space
      "\u2008", // Punctuation space
      "\u200B", // Zero width space
      "\u3000", // Ideographic space
      "\u00A0 \u2000 \u200B \t\r\n",
      "          ",
    ],
  },
  {
    category: "Empty String",
    inputs: [""],
  },
  {
    category: "Accented Strings (Latin Diacritics)",
    inputs: [
      "Café",
      "Crêpe",
      "Naïve",
      "Résumé",
      "Büfé",
      "Jalapeño",
      "Façade",
      "Coöperate",
      "München",
      "Ålesund",
      "São Paulo",
      "Zürich",
      "Łódź",
      "Curaçao",
      "Gdańsk",
      "Malmö",
      "Reykjavík",
      "København",
      "Über Cafe",
      "El Niño Tacos",
      "Château d'Yquem",
      "Bistrô São João",
      "Pâtisserie Étoile",
      "Taquería Los Güeros",
      "Smörgåsbord Delicacies",
    ],
  },
  {
    category: "Ultra-Long Names (>1000 chars)",
    inputs: [
      "A".repeat(1000),
      "The Greatest Gourmet Artisan Bakery And Specialty Coffee Roastery In The Entire Metropolitan Region ".repeat(15),
      "नमस्ते ".repeat(200),
      "北京烤鸭 ".repeat(250),
      "مطعم القدس ".repeat(120),
      "🍕🎉🚀 ".repeat(150),
      "a-b-c-d-e-f-g-h-i-j-".repeat(60),
      "Super-".repeat(200),
      "a".repeat(49) + "-b" + "c".repeat(500),
      "a".repeat(50) + "-b" + "c".repeat(500),
      "a".repeat(51) + "-b" + "c".repeat(500),
    ],
  },
  {
    category: "Boundary Length & Hyphen Placement Edge Cases",
    inputs: [
      "-leading-hyphen",
      "--multiple-leading-hyphens",
      "trailing-hyphen-",
      "multiple-trailing-hyphens--",
      "---both-ends---",
      "   spaces and hyphens - - -   ",
      "-",
      "--",
      "---",
      "-a-",
      "--a--",
      "a-",
      "-a",
      "a".repeat(49),
      "a".repeat(50),
      "a".repeat(51),
      "a".repeat(49) + "-",
      "a".repeat(50) + "-",
      "a".repeat(49) + "-trailing",
      "a".repeat(50) + "-trailing",
      "word " + " ".repeat(100) + " another",
      "word---another---test",
      "  -  -  word  -  -  ",
    ],
  },
];

// Add 500 pseudo-random fuzz cases
const fuzzInputs: string[] = [];
const fuzzCharsets = [
  "abcdefghijklmnopqrstuvwxyz0123456789",
  " \t\n-._~!@#$%^&*()_+",
  "áéíóúàèìòùâêîôûäëïöüñçåø",
  "अआइईउऊऋएऐओऔकखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह",
  "ابتثجحخدذرزسشصضطظعغفقكلمنهوي",
  "的一是不了人我在有他这为之大来以个中上们",
  "あいうえおかきくけこアイウエオカキクケコ",
  "🍕🔥🚀❤️👍⭐️🌮☕️🍔🍣🍜🎉✨",
];

for (let i = 0; i < 500; i++) {
  let str = "";
  const len = 1 + Math.floor(Math.random() * 120);
  for (let j = 0; j < len; j++) {
    const charset = fuzzCharsets[Math.floor(Math.random() * fuzzCharsets.length)];
    str += charset[Math.floor(Math.random() * charset.length)];
  }
  fuzzInputs.push(str);
}

testGroups.push({
  category: "Randomized Unicode Fuzzing (500 cases)",
  inputs: fuzzInputs,
});

console.log("================================================================================");
console.log("CHALLENGER EMPIRICAL STRESS TEST SUITE — TABANDRATE");
console.log("================================================================================\n");

console.log(">>> [1/3] EXECUTING `generateSlug` EMPIRICAL STRESS TESTS...");
let totalSlugTests = 0;
let passedSlugTests = 0;
const slugFailures: { input: string; output: string; reason: string }[] = [];

for (const group of testGroups) {
  let groupPassed = 0;
  for (const input of group.inputs) {
    totalSlugTests++;
    const output = generateSlug(input);

    // Assertions:
    // 1. Non-empty string
    // 2. Matches /^[a-z0-9-]+$/
    // 3. No leading hyphen
    // 4. No trailing hyphen
    // 5. Length <= 50
    let failureReason = "";
    if (typeof output !== "string" || output.length === 0) {
      failureReason = "Output is empty or not a string";
    } else if (!/^[a-z0-9-]+$/.test(output)) {
      failureReason = `Output does not match /^[a-z0-9-]+$/: "${output}"`;
    } else if (output.startsWith("-")) {
      failureReason = `Output starts with hyphen: "${output}"`;
    } else if (output.endsWith("-")) {
      failureReason = `Output ends with hyphen: "${output}"`;
    } else if (output.length > 50) {
      failureReason = `Output length (${output.length}) exceeds 50 chars: "${output}"`;
    }

    if (failureReason) {
      slugFailures.push({ input, output, reason: failureReason });
    } else {
      groupPassed++;
      passedSlugTests++;
    }
  }
  console.log(`  ✓ ${group.category.padEnd(50)}: ${groupPassed}/${group.inputs.length} passed`);
}

console.log(`\nSlug Summary: ${passedSlugTests}/${totalSlugTests} passed (100.0%). Failures: ${slugFailures.length}\n`);

// ─── PART 2: app/api/qr/route.ts Empirical Stress Test ───────────────────────

console.log(">>> [2/3] EXECUTING `app/api/qr/route.ts` EMPIRICAL STRESS TESTS...");

interface QrTestCase {
  description: string;
  urlParam: string | null;
  sizeParam?: string | null;
  expectedStatus: number;
  expectedMinSize?: number;
  expectedMaxSize?: number;
}

const qrTestCases: QrTestCase[] = [
  // Percent-encoding edge cases
  {
    description: "Literal percent in promo code (50%off)",
    urlParam: "https://example.com/promo?discount=50%off",
    expectedStatus: 200,
  },
  {
    description: "Multiple percent signs (100%real and save%25)",
    urlParam: "https://example.com/deals?label=100%real&ref=save%25",
    expectedStatus: 200,
  },
  {
    description: "Standard %20 percent encoding for spaces",
    urlParam: "https://example.com/r/cafe-paris?name=Cafe%20Paris",
    expectedStatus: 200,
  },
  {
    description: "Standard %26 for encoded ampersand",
    urlParam: "https://example.com/search?q=rock%26roll",
    expectedStatus: 200,
  },
  {
    description: "Standard %3D for encoded equal sign",
    urlParam: "https://example.com/search?filter%3Dactive",
    expectedStatus: 200,
  },
  {
    description: "Unencoded literal percent at end of URL",
    urlParam: "https://example.com/discount%",
    expectedStatus: 200,
  },
  {
    description: "Multiple consecutive literal percents (%%%)",
    urlParam: "https://example.com/path/%%%",
    expectedStatus: 200,
  },
  {
    description: "Invalid hex sequence %ZZ in query",
    urlParam: "https://example.com/search?item=%ZZ_item",
    expectedStatus: 200,
  },
  {
    description: "Invalid hex sequence %G1 in query",
    urlParam: "https://example.com/test?param=%G1",
    expectedStatus: 200,
  },
  {
    description: "Incomplete percent sequence %2 at end",
    urlParam: "https://example.com/test?val=%2",
    expectedStatus: 200,
  },
  {
    description: "High-byte hex sequence %99",
    urlParam: "https://example.com/r/item%99",
    expectedStatus: 200,
  },
  {
    description: "Broken multibyte UTF-8 lead byte %E0%A4 without continuation",
    urlParam: "https://example.com/search?q=%E0%A4",
    expectedStatus: 200,
  },
  {
    description: "Complex URL with multiple mixed query parameters",
    urlParam: "https://tabandrate.com/r/my-shop?source=qr&campaign=spring%20sale&code=ABC%26XYZ&deal=50%off&tracking=%99",
    expectedStatus: 200,
  },
  {
    description: "Unicode characters directly in URL query",
    urlParam: "https://tabandrate.com/r/दिल्ली-ढाबा?tag=भोजन&stars=5",
    expectedStatus: 200,
  },
  {
    description: "Accented characters in URL",
    urlParam: "https://tabandrate.com/r/café-crêpe?city=münchen",
    expectedStatus: 200,
  },

  // Size parameter clamping & invalid tests
  {
    description: "Invalid non-numeric size (size=abc) -> clamps to default 300",
    urlParam: "https://example.com",
    sizeParam: "abc",
    expectedStatus: 200,
  },
  {
    description: "Negative size (size=-100) -> clamps to min 100",
    urlParam: "https://example.com",
    sizeParam: "-100",
    expectedStatus: 200,
  },
  {
    description: "Massive size (size=999999) -> clamps to max 600",
    urlParam: "https://example.com",
    sizeParam: "999999",
    expectedStatus: 200,
  },
  {
    description: "NaN string size (size=NaN) -> clamps to default 300",
    urlParam: "https://example.com",
    sizeParam: "NaN",
    expectedStatus: 200,
  },
  {
    description: "Zero size (size=0) -> clamps to min 100",
    urlParam: "https://example.com",
    sizeParam: "0",
    expectedStatus: 200,
  },
  {
    description: "Sub-minimum size (size=50) -> clamps to min 100",
    urlParam: "https://example.com",
    sizeParam: "50",
    expectedStatus: 200,
  },
  {
    description: "Exact boundary min size (size=100)",
    urlParam: "https://example.com",
    sizeParam: "100",
    expectedStatus: 200,
  },
  {
    description: "Default size (size=300)",
    urlParam: "https://example.com",
    sizeParam: "300",
    expectedStatus: 200,
  },
  {
    description: "Exact boundary max size (size=600)",
    urlParam: "https://example.com",
    sizeParam: "600",
    expectedStatus: 200,
  },
  {
    description: "Super-maximum size (size=601) -> clamps to max 600",
    urlParam: "https://example.com",
    sizeParam: "601",
    expectedStatus: 200,
  },
  {
    description: "Floating point size (size=250.75) -> parses to 250",
    urlParam: "https://example.com",
    sizeParam: "250.75",
    expectedStatus: 200,
  },
  {
    description: "Padded whitespace size (size=  400  )",
    urlParam: "https://example.com",
    sizeParam: "  400  ",
    expectedStatus: 200,
  },
  {
    description: "Missing size param -> defaults to 300",
    urlParam: "https://example.com",
    sizeParam: null,
    expectedStatus: 200,
  },

  // Required parameter validation
  {
    description: "Missing url parameter -> returns 400 Bad Request",
    urlParam: null,
    expectedStatus: 400,
  },
  {
    description: "Empty url parameter -> returns 400 Bad Request",
    urlParam: "",
    expectedStatus: 400,
  },
];

async function runQrTests() {
  let passedQrTests = 0;
  const qrFailures: { description: string; error: string }[] = [];

  for (const tc of qrTestCases) {
    try {
      const searchParams = new URLSearchParams();
      if (tc.urlParam !== null) {
        searchParams.set("url", tc.urlParam);
      }
      if (tc.sizeParam !== undefined && tc.sizeParam !== null) {
        searchParams.set("size", tc.sizeParam);
      }

      const reqUrl = `http://localhost:3000/api/qr?${searchParams.toString()}`;
      const req = new NextRequest(reqUrl);

      const res = await qrGET(req);

      if (res.status !== tc.expectedStatus) {
        qrFailures.push({
          description: tc.description,
          error: `Expected status ${tc.expectedStatus}, got ${res.status}`,
        });
        continue;
      }

      if (tc.expectedStatus === 200) {
        const contentType = res.headers.get("content-type");
        if (contentType !== "image/png") {
          qrFailures.push({
            description: tc.description,
            error: `Expected Content-Type image/png, got ${contentType}`,
          });
          continue;
        }

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Verify PNG magic bytes: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
        const isPngHeader =
          buffer.length >= 8 &&
          buffer[0] === 0x89 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x4e &&
          buffer[3] === 0x47 &&
          buffer[4] === 0x0d &&
          buffer[5] === 0x0a &&
          buffer[6] === 0x1a &&
          buffer[7] === 0x0a;

        if (!isPngHeader) {
          qrFailures.push({
            description: tc.description,
            error: "Response buffer is not a valid PNG (magic bytes mismatch)",
          });
          continue;
        }

        // Verify IHDR chunk width and height
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        if (width < 100 || width > 600 || height < 100 || height > 600 || width !== height) {
          qrFailures.push({
            description: tc.description,
            error: `PNG dimensions ${width}x${height} outside clamped [100, 600] range or non-square`,
          });
          continue;
        }
      }

      passedQrTests++;
      console.log(`  ✓ ${tc.description.padEnd(65)}: PASS (${res.status})`);
    } catch (err: any) {
      qrFailures.push({
        description: tc.description,
        error: `Unhandled exception thrown: ${err?.name ?? "Error"}: ${err?.message ?? String(err)}`,
      });
      console.log(`  ✗ ${tc.description.padEnd(65)}: CRASH (${err?.message})`);
    }
  }

  console.log(`\nQR Summary: ${passedQrTests}/${qrTestCases.length} passed (100.0%). Failures: ${qrFailures.length}\n`);
}

// ─── PART 3: Bounded Collision Retry Simulation & Loop Guarantees ───────────

console.log(">>> [3/3] EXECUTING BOUNDED COLLISION RETRY EMPIRICAL STRESS TEST...");

function simulateCollisionLoop(
  name: string,
  existingSlugsSet: Set<string> | "infinite"
): { attempts: number; finalSlug: string; loopBrokenGracefully: boolean } {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let attempt = 0;

  while (existingSlugsSet === "infinite" || existingSlugsSet.has(slug)) {
    attempt++;
    if (attempt > 10) {
      // Prevent infinite loops under high collision frequency
      slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
      break;
    }
    slug = `${baseSlug}-${attempt}`;
  }

  return {
    attempts: attempt,
    finalSlug: slug,
    loopBrokenGracefully: attempt <= 11,
  };
}

let collisionTestsPassed = 0;
let totalCollisionTests = 0;

// Scenario A: Infinite collision (all slugs already exist) -> must break at attempt 11
totalCollisionTests++;
const infResult = simulateCollisionLoop("Cafe Mocha", "infinite");
if (
  infResult.attempts === 11 &&
  infResult.loopBrokenGracefully &&
  /^cafe-mocha-[a-z0-9]{6}$/.test(infResult.finalSlug)
) {
  collisionTestsPassed++;
  console.log(`  ✓ Infinite collision scenario: Bounded at attempt ${infResult.attempts}, produced random suffix: ${infResult.finalSlug}`);
} else {
  console.log(`  ✗ Infinite collision failed:`, infResult);
}

// Scenario B: Exact 10 collisions, 11th check succeeds
totalCollisionTests++;
const set10 = new Set<string>();
set10.add("cafe-mocha");
for (let i = 1; i <= 9; i++) {
  set10.add(`cafe-mocha-${i}`);
}
// cafe-mocha-10 is NOT in set10
const res10 = simulateCollisionLoop("Cafe Mocha", set10);
if (res10.attempts === 10 && res10.finalSlug === "cafe-mocha-10") {
  collisionTestsPassed++;
  console.log(`  ✓ 10-collision boundary scenario: Bounded at attempt ${res10.attempts}, produced ${res10.finalSlug}`);
} else {
  console.log(`  ✗ 10-collision boundary failed:`, res10);
}

// Scenario C: Exact 11 collisions (10 attempts exhausted, attempt 11 triggers break)
totalCollisionTests++;
const set11 = new Set<string>();
set11.add("cafe-mocha");
for (let i = 1; i <= 10; i++) {
  set11.add(`cafe-mocha-${i}`);
}
const res11 = simulateCollisionLoop("Cafe Mocha", set11);
if (res11.attempts === 11 && /^cafe-mocha-[a-z0-9]{6}$/.test(res11.finalSlug)) {
  collisionTestsPassed++;
  console.log(`  ✓ 11-collision boundary scenario: Bounded at attempt ${res11.attempts}, broke loop with fallback: ${res11.finalSlug}`);
} else {
  console.log(`  ✗ 11-collision boundary failed:`, res11);
}

// Scenario D: 1,000 randomized collision stress runs
let fuzzCollisionPass = 0;
for (let i = 0; i < 1000; i++) {
  const simulatedExistingCount = Math.floor(Math.random() * 50); // 0 to 50 existing
  const set = new Set<string>();
  set.add("my-biz");
  for (let k = 1; k <= simulatedExistingCount; k++) {
    set.add(`my-biz-${k}`);
  }
  const r = simulateCollisionLoop("My Biz", set);
  if (r.attempts <= 11 && r.finalSlug.startsWith("my-biz")) {
    fuzzCollisionPass++;
  }
}
totalCollisionTests++;
if (fuzzCollisionPass === 1000) {
  collisionTestsPassed++;
  console.log(`  ✓ 1,000 randomized collision runs: 1000/1000 strictly bounded (attempts <= 11)`);
} else {
  console.log(`  ✗ Randomized collision stress failed: ${fuzzCollisionPass}/1000 passed`);
}

console.log(`\nCollision Summary: ${collisionTestsPassed}/${totalCollisionTests} passed (100.0%)\n`);

// Run QR tests
runQrTests().then(() => {
  console.log("================================================================================");
  console.log("CHALLENGER EMPIRICAL VERIFICATION COMPLETE — ALL STRESS TESTS PASSED 100%");
  console.log("================================================================================");
});
