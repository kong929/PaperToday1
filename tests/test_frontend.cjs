const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "../templates/index.html"), "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function createPage(enrichment) {
  let now = 0;
  let frame;
  let htmlContent = "";
  let scrollY = 0;
  let pageHeight = 1600;
  const controls = {};
  const aiContent = { innerHTML: "" };
  const paperElement = {
    get innerHTML() { return htmlContent; },
    set innerHTML(value) {
      htmlContent = value;
      aiContent.innerHTML = "";
    },
  };
  const status = { textContent: "" };
  const progress = { style: { width: "" } };
  const toggle = { textContent: "", addEventListener(_, handler) { controls.toggle = handler; } };
  const next = { addEventListener(_, handler) { controls.next = handler; } };
  const elements = {
    paper: paperElement,
    "ai-content": aiContent,
    "cycle-status": status,
    "progress-bar": progress,
    toggle,
    next,
  };
  const paper = {
    title: "English title",
    abstract: "Complete English abstract.",
    journal: "Nature",
    date: "2026-10-23",
    authors: "Author",
    url: "https://doi.org/10.1000/test",
  };
  const secondPaper = { ...paper, title: "Second English title" };
  const answer = {
    title_zh: "Chinese title",
    abstract_zh: "Chinese abstract",
    summary_zh: "Chinese summary",
  };
  const context = {
    document: {
      createElement() {
        return { set textContent(value) { this.value = value; },
          get innerHTML() { return this.value; } };
      },
      getElementById(id) { return elements[id]; },
      documentElement: { get scrollHeight() { return pageHeight; } },
    },
    window: {
      get scrollY() { return scrollY; },
      scrollTo(_, y) { scrollY = y; },
    },
    innerHeight: 500,
    performance: { now: () => now },
    requestAnimationFrame(callback) { frame = callback; return 1; },
    cancelAnimationFrame() { frame = null; },
    setTimeout() { return 1; },
    clearTimeout() {},
    AbortController,
    URL,
    fetch(url) {
      if (url.startsWith("/api/papers")) {
        return Promise.resolve({ ok: true, json: async () => ({ papers: [paper, secondPaper] }) });
      }
      if (url === "/api/enrich") {
        return Promise.resolve({
          ok: true,
          json: () => typeof enrichment === "function"
            ? enrichment() : enrichment ?? Promise.resolve(answer),
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    },
  };
  vm.runInNewContext(script, context);
  return {
    paperElement,
    aiContent,
    status,
    controls,
    get scrollY() { return scrollY; },
    set pageHeight(value) { pageHeight = value; },
    advance(ms) {
      now += ms;
      const callback = frame;
      frame = null;
      if (callback) callback(now);
    },
  };
}

async function settle() {
  await new Promise(resolve => setImmediate(resolve));
}

test("English abstract finishes before ready Chinese content appears", async () => {
  const page = createPage();
  await settle();
  assert.match(page.paperElement.innerHTML, /Complete English abstract/);
  assert.equal(page.aiContent.innerHTML, "");
  page.advance(89_000);
  assert.equal(page.aiContent.innerHTML, "");
  page.advance(1_000);
  assert.match(page.aiContent.innerHTML, /Chinese abstract/);
  assert.ok(page.scrollY > 0);
  assert.ok(page.paperElement.innerHTML.indexOf("Complete English abstract") <
    page.paperElement.innerHTML.indexOf('id="ai-content"'));
});

test("the page waits at the English abstract until translation completes", async () => {
  let resolveEnrichment;
  const enrichment = new Promise(resolve => { resolveEnrichment = resolve; });
  const page = createPage(enrichment);
  await settle();
  page.advance(90_000);
  assert.equal(page.aiContent.innerHTML, "");
  assert.match(page.status.textContent, /正在生成中文翻译/);
  const endOfEnglish = page.scrollY;
  resolveEnrichment({
    title_zh: "Chinese title",
    abstract_zh: "Chinese abstract",
    summary_zh: "Chinese summary",
  });
  await settle();
  assert.match(page.aiContent.innerHTML, /Chinese summary/);
  assert.equal(page.scrollY, endOfEnglish);
});

test("pausing preserves the remaining English reading time", async () => {
  const page = createPage();
  await settle();
  page.advance(45_000);
  page.controls.toggle();
  page.advance(90_000);
  assert.equal(page.aiContent.innerHTML, "");
  page.controls.toggle();
  page.advance(44_000);
  assert.equal(page.aiContent.innerHTML, "");
  page.advance(1_000);
  assert.match(page.aiContent.innerHTML, /Chinese abstract/);
});

test("an old translation cannot appear on the next paper", async () => {
  let resolveOld;
  let calls = 0;
  const page = createPage(() => {
    calls++;
    if (calls === 1) return new Promise(resolve => { resolveOld = resolve; });
    return Promise.resolve({
      title_zh: "Second Chinese title",
      abstract_zh: "Second Chinese abstract",
      summary_zh: "Second summary",
    });
  });
  await settle();
  page.controls.next();
  await settle();
  resolveOld({
    title_zh: "Old Chinese title",
    abstract_zh: "Old Chinese abstract",
    summary_zh: "Old summary",
  });
  await settle();
  page.advance(90_000);
  assert.match(page.paperElement.innerHTML, /Second English title/);
  assert.match(page.aiContent.innerHTML, /Second Chinese abstract/);
  assert.doesNotMatch(page.aiContent.innerHTML, /Old Chinese abstract/);
});
