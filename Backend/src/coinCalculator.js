// คำนวณ "เหรียญสะสม" (loyalty coins) ที่ลูกค้าจะได้รับจากยอดสั่งซื้อ
// ใช้ AI (Claude) เป็นตัวตัดสินใจหลัก โดยให้ "นโยบายร้าน" เป็นกรอบไว้กันไม่ให้ตอบเพี้ยน
// ถ้าเรียก AI ไม่สำเร็จ (ไม่มี API key / เน็ตล่ม / timeout / ตอบไม่เป็น JSON ฯลฯ)
// จะ fallback ไปใช้สูตรคงที่แทนทันที เพื่อไม่ให้ระบบเช็คเอาท์พังเพราะ AI

const AI_MODEL = "claude-haiku-4-5-20251001";
const AI_TIMEOUT_MS = 8000;

// สูตรสำรอง (ใช้เมื่อเรียก AI ไม่ได้): 1 เหรียญ ต่อทุกๆ กี่บาท ปัดเศษลง
// ปรับได้ผ่าน .env โดยไม่ต้องแก้โค้ด เช่น COIN_BAHT_PER_COIN=50 -> ได้คืนประมาณ 2% ของยอดซื้อ
// ค่าเริ่มต้น 50 บาท/เหรียญ = ~2% cashback (เดิมตั้งไว้ 10 บาท/เหรียญ = 10% ซึ่งเฟ้อเกินไป)
const BAHT_PER_COIN = Number(process.env.COIN_BAHT_PER_COIN) || 50;

// เพดานกันเหรียญเฟ้อ/AI ตอบเพี้ยน: ห้ามให้เหรียญเกินกี่ % ของยอดซื้อ ไม่ว่ากรณีใด
// ค่าเริ่มต้น 5% (เดิมตั้งไว้ 20% ซึ่งหลวมเกินไป แทบไม่ได้ช่วยกันอะไรเลย)
const COIN_CAP_PERCENT = Number(process.env.COIN_CAP_PERCENT) || 5;

const EFFECTIVE_RATE_PERCENT = (100 / BAHT_PER_COIN).toFixed(1);

function fallbackCoins(totalAmount) {
  return Math.max(0, Math.floor(Number(totalAmount) / BAHT_PER_COIN));
}

// สร้าง system prompt แบบ dynamic จากค่า config ด้านบน เพื่อให้ AI กับสูตรสำรอง
// ใช้นโยบายอัตราเดียวกันเสมอ ไม่ต้องคอยแก้ 2 ที่เวลาปรับอัตรา
const SYSTEM_PROMPT = `คุณคือระบบคำนวณเหรียญสะสม (loyalty coins) ของร้านค้าออนไลน์ PRAKUN SHOP

นโยบายร้าน:
- ลูกค้าจะได้เหรียญสะสมประมาณ 1 เหรียญ ต่อทุกๆ ${BAHT_PER_COIN} บาทที่ใช้จ่าย (ปัดเศษลง) คิดเป็นประมาณ ${EFFECTIVE_RATE_PERCENT}% ของยอดซื้อ
- ให้โบนัสเพิ่มเล็กน้อยเพื่อกระตุ้นยอดซื้อที่สูงขึ้น (ไม่ต้องเป๊ะ ใช้เป็นแนวทาง):
  - ยอดซื้อ 1,000-4,999 บาท: โบนัสเพิ่มประมาณ 5%
  - ยอดซื้อ 5,000 บาทขึ้นไป: โบนัสเพิ่มประมาณ 10%
- ห้ามให้เหรียญเกิน ${COIN_CAP_PERCENT}% ของยอดซื้อ (เป็นบาท) ไม่ว่ากรณีใด — นี่คือเพดานสูงสุดเด็ดขาด

ตอบกลับเป็น JSON เท่านั้น ห้ามมีข้อความอื่นนอกเหนือจาก JSON ห้ามมี markdown code fence
โครงสร้างที่ต้องตอบ: {"coins": <จำนวนเหรียญ เป็นจำนวนเต็ม>, "reason": "<เหตุผลสั้นๆ ภาษาไทย ไม่เกิน 1 ประโยค>"}`;

async function calculateCoinsWithAI(totalAmount) {
  const amount = Number(totalAmount) || 0;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // ไม่ได้ตั้งค่า API key ไว้ -> ไม่ต้องยิง request เลย ใช้สูตรสำรองทันที
  if (!apiKey) {
    return {
      coins: fallbackCoins(amount),
      reasoning: "คำนวณด้วยสูตรมาตรฐาน (ยังไม่ได้ตั้งค่า AI)",
      source: "fallback",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `ยอดสั่งซื้อครั้งนี้คือ ${amount.toFixed(2)} บาท ลูกค้าควรได้เหรียญสะสมกี่เหรียญ?`,
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Anthropic API responded with status ${response.status}`);
    }

    const data = await response.json();
    const textBlock = Array.isArray(data.content)
      ? data.content.find((block) => block.type === "text")
      : null;
    const raw = (textBlock && textBlock.text ? textBlock.text : "").trim();

    // เผื่อ AI ตอบมามีข้อความอื่นแถมมาด้วย ดึงเฉพาะส่วนที่เป็น { ... } ออกมา
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

    const coins = Math.floor(Number(parsed.coins));

    if (!Number.isFinite(coins) || coins < 0) {
      throw new Error("AI returned an invalid coin amount");
    }

    // กันไว้อีกชั้น เผื่อ AI คำนวณเพี้ยน/hallucinate ให้เหรียญเยอะเกินไป
    const cap = Math.max(1, Math.ceil(amount * (COIN_CAP_PERCENT / 100)));
    const safeCoins = Math.min(coins, cap);

    return {
      coins: safeCoins,
      reasoning:
        typeof parsed.reason === "string" && parsed.reason.trim()
          ? parsed.reason.trim().slice(0, 255)
          : "คำนวณโดย AI ตามนโยบายร้าน",
      source: "ai",
    };
  } catch (error) {
    console.error(
      "⚠️ AI coin calculation failed, using fallback formula:",
      error.message
    );

    return {
      coins: fallbackCoins(amount),
      reasoning: "คำนวณด้วยสูตรมาตรฐาน (เรียก AI ไม่สำเร็จ)",
      source: "fallback",
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = { calculateCoinsWithAI, fallbackCoins };
