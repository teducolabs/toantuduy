import { chromium } from 'playwright'
const BASE = 'http://localhost:4200'
const SHOT_DIR = 'C:/Users/Admin/AppData/Local/Temp/claude/c--SourceCodes-toantuduy/9d3cc317-43e3-4977-aca7-43e844c6c88b/scratchpad'
const results = {}

const browser = await chromium.launch()
const context = await browser.newContext()
const page = await context.newPage()
await context.exposeFunction('__reportSpeak', (text) => {
  results.speakCalls = results.speakCalls || []
  results.speakCalls.push(text)
})
await context.addInitScript(() => {
  if (window.speechSynthesis) {
    window.speechSynthesis.speak = (u) => window.__reportSpeak(u.text)
    window.speechSynthesis.cancel = () => { window.__cancelCount = (window.__cancelCount || 0) + 1 }
  }
})

await page.goto(`${BASE}/login`)
await page.fill('input[type="email"]', 'parent@example.test')
await page.fill('input[type="password"]', 'QaTest1234!')
await page.click('button[type="submit"]')
await page.waitForLoadState('networkidle')

// Explicitly select "Sóc · Lớp 3" via the switcher to set the active-profile cookie
async function switchTo(nameRegex) {
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.getByRole('button', { name: /Lớp/ }).click()
    const visible = await page.waitForSelector('[role="dialog"]', { state: 'visible', timeout: 5000 }).then(() => true).catch(() => false)
    if (visible) {
      const item = page.getByRole('button', { name: nameRegex })
      if (await item.count()) {
        await item.click()
        const changed = await page.waitForFunction(
          (label) => document.querySelector('[data-slot="sheet-trigger"]')?.textContent?.includes(label),
          nameRegex.source.replace(/[^\wÀ-ỹ ]/g, '').split(' ')[0],
          { timeout: 5000 },
        ).then(() => true).catch(() => false)
        if (changed) return true
      }
    }
    await page.waitForTimeout(500)
  }
  return false
}
results.switched = await switchTo(/Sóc/)
await page.goto(`${BASE}/`)
await page.waitForLoadState('networkidle')
await page.waitForTimeout(1000)

const resumeLink = page.getByRole('link', { name: /buổi luyện/ })
const startBtn = page.getByRole('button', { name: /Luyện tập/ })
if (await resumeLink.count()) {
  await resumeLink.click()
} else if (await startBtn.count()) {
  await startBtn.click()
} else {
  results.noEntry = true
}
await page.waitForURL('**/session/**', { timeout: 15000 }).catch(() => {})
await page.waitForLoadState('networkidle')
await page.waitForTimeout(1000)
results.sessionUrl = page.url()
results.speakCallsOnMount = results.speakCalls ? results.speakCalls.length : 0

const audioBtn = page.getByRole('button', { name: /Nghe lại/ })
results.audioButtonVisible = (await audioBtn.count()) > 0
if (results.audioButtonVisible) {
  await audioBtn.click()
  await page.waitForTimeout(300)
  results.speakCallsAfterTap = results.speakCalls ? results.speakCalls.length : 0
  await audioBtn.click()
  await page.waitForTimeout(300)
  results.speakCallsAfterSecondTap = results.speakCalls ? results.speakCalls.length : 0
  results.cancelCount = await page.evaluate(() => window.__cancelCount || 0)
}
await page.screenshot({ path: `${SHOT_DIR}/09-grade3-question.png`, fullPage: true })
await browser.close()
console.log(JSON.stringify(results, null, 2))
