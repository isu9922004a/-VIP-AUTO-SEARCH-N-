#!/usr/bin/env node
// 石頭少爺 Agent R5.3.2.4.13-R4.1｜GitHub Actions 完成交易日校正版
// 修正：當 TWSE STOCK_DAY_ALL 落後 TPEx 最新交易日時，以 TWSE 官方 MI_INDEX 指定日行情補齊後再建立完整快照。
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const LATEST_PATH = path.join(ROOT, 'data/market/latest.json');
const ARCHIVE_DIR = path.join(ROOT, 'data/market/archive');
const MAX_ARCHIVES = 30;

export const SOURCES = Object.freeze({
  twseQuotes: 'https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL',
  twseQuotesByDateBase: 'https://www.twse.com.tw/exchangeReport/MI_INDEX',
  tpexQuotes: 'https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes',
  twseCompanies: 'https://openapi.twse.com.tw/v1/opendata/t187ap03_L',
  tpexCompanies: 'https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O'
});

const TAIWAN_INDUSTRY_NAME_MAP = Object.freeze({
  '01':'水泥工業','02':'食品工業','03':'塑膠工業','04':'紡織纖維','05':'電機機械',
  '06':'電器電纜','08':'玻璃陶瓷','09':'造紙工業','10':'鋼鐵工業','11':'橡膠工業',
  '12':'汽車工業','14':'建材營造','15':'航運業','16':'觀光餐旅','17':'金融保險',
  '18':'貿易百貨','20':'其他','21':'化學工業','22':'生技醫療','23':'油電燃氣',
  '24':'半導體業','25':'電腦及週邊設備業','26':'光電業','27':'通信網路業','28':'電子零組件業',
  '29':'電子通路業','30':'資訊服務業','31':'其他電子業','32':'文化創意業','33':'農業科技業',
  '34':'電子商務','35':'綠能環保','36':'數位雲端','37':'運動休閒','38':'居家生活'
});

function firstAny(row, keys) {
  for (const key of keys) {
    const v = row?.[key];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return null;
}

function num(value) {
  if (value === null || value === undefined || value === '') return null;
  const cleaned = String(value)
    .replace(/,/g, '')
    .replace(/[＋+]/g, '')
    .replace(/[－−]/g, '-')
    .replace(/[%％]/g, '')
    .trim();
  if (!cleaned || cleaned === '--' || cleaned === '---' || /^N\/?A$/i.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function round(value, digits = 4) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return null;
  const f = 10 ** digits;
  return Math.round(Number(value) * f) / f;
}

export function normalizeMarketDate(value) {
  const s = String(value ?? '').replace(/[^\d]/g, '').trim();
  if (/^\d{7}$/.test(s)) {
    const year = Number(s.slice(0, 3)) + 1911;
    return `${String(year).padStart(4, '0')}${s.slice(3)}`;
  }
  if (/^\d{8}$/.test(s)) return s;
  return null;
}

export function latestMarketQuoteDate(rows) {
  const counts = new Map();
  for (const r of Array.isArray(rows) ? rows : []) {
    const raw = r?.Date ?? r?.date ?? r?.日期 ?? r?.TradeDate ?? r?.TradingDate ?? r?.['交易日期'] ?? '';
    const d = normalizeMarketDate(raw);
    if (!d) continue;
    counts.set(d, (counts.get(d) || 0) + 1);
  }
  if (!counts.size) return null;
  return [...counts.entries()].sort((a, b) => (b[1] - a[1]) || b[0].localeCompare(a[0]))[0][0];
}

function isOrdinaryCode(code) {
  return /^[1-9]\d{3}$/.test(String(code || '').trim());
}

function normalizeIndustry(raw) {
  const text = String(raw || '').trim();
  let code = '';
  const m = text.match(/(?:^|\D)(\d{2})(?:\D|$)/);
  if (m && TAIWAN_INDUSTRY_NAME_MAP[m[1]]) code = m[1];
  if (!code) {
    for (const [k, name] of Object.entries(TAIWAN_INDUSTRY_NAME_MAP)) {
      if (text.includes(name)) { code = k; break; }
    }
  }
  return {
    industryCode: code,
    industryName: code ? TAIWAN_INDUSTRY_NAME_MAP[code] : text,
    industryRaw: text
  };
}

export function buildIndustryMap(rows, market) {
  const map = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const code = String(firstAny(row, [
      '公司代號','CompanyCode','SecuritiesCompanyCode','SecuritiesCode','Code','股票代號','證券代號'
    ]) || '').trim();
    if (!isOrdinaryCode(code)) continue;
    const values = [];
    for (const [k, v] of Object.entries(row || {})) {
      if (/產業|industry/i.test(k) && v !== null && v !== undefined && String(v).trim()) values.push(String(v).trim());
    }
    const ind = normalizeIndustry(values.join('｜'));
    map.set(code, { market, ...ind });
  }
  return map;
}

export function normalizeQuote(row, market, tradeDate, industryMap) {
  const code = String(firstAny(row, [
    'Code','SecuritiesCompanyCode','SecuritiesCode','CompanyCode','股票代號','證券代號','代號'
  ]) || '').trim();
  if (!/^\d{4}$/.test(code)) return null;

  const name = String(firstAny(row, [
    'Name','CompanyName','SecuritiesCompanyName','公司名稱','證券名稱','名稱','公司簡稱'
  ]) || '').trim();

  const close = num(firstAny(row, ['ClosingPrice','Close','ClosePrice','LatestPrice','收盤價','成交價','收盤']));
  const open = num(firstAny(row, ['OpeningPrice','Open','OpenPrice','開盤價','開盤']));
  const high = num(firstAny(row, ['HighestPrice','High','HighPrice','最高價','最高']));
  const low = num(firstAny(row, ['LowestPrice','Low','LowPrice','最低價','最低']));
  const volume = num(firstAny(row, ['TradeVolume','TradingShares','TradingVolume','Volume','成交股數','成交量']));
  const rawTradeValue = num(firstAny(row, ['TradeValue','TransactionAmount','TradingAmount','成交金額']));
  const change = num(firstAny(row, ['Change','ChangeAmount','PriceChange','漲跌價差','漲跌']));

  if (![open, high, low, close].every(v => Number.isFinite(v) && v > 0)) return null;
  if (!(high >= low && high >= open && high >= close && low <= open && low <= close)) return null;

  let pct = null;
  if (close !== null && change !== null) {
    const prev = close - change;
    if (prev > 0) pct = change / prev * 100;
  }
  const closePos = high > low ? (close - low) / (high - low) : null;
  const tradeValue = rawTradeValue !== null && rawTradeValue > 0
    ? rawTradeValue
    : (volume !== null && close !== null ? volume * close : null);

  const industry = industryMap?.get(code) || { industryCode:'', industryName:'', industryRaw:'' };
  return {
    code,
    name,
    market,
    quoteDate: tradeDate,
    close: round(close, 4),
    open: round(open, 4),
    high: round(high, 4),
    low: round(low, 4),
    volume: volume === null ? null : Math.round(volume),
    tradeValue: tradeValue === null ? null : Math.round(tradeValue),
    change: round(change, 4),
    pct: round(pct, 4),
    closePos: round(closePos, 6),
    industry: industry.industryName || '',
    industryCode: industry.industryCode || '',
    industryName: industry.industryName || '',
    industryRaw: industry.industryRaw || ''
  };
}

async function fetchJsonArray(url, label, retries = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      let res;
      try {
        // GitHub-hosted runner 直接向官方來源取得資料；不經 Cloudflare Worker。
        res = await fetch(url, { method:'GET', signal: controller.signal, redirect:'follow' });
      } finally {
        clearTimeout(timer);
      }
      const finalUrl = res.url || url;
      const contentType = String(res.headers.get('content-type') || '');
      const text = await res.text();
      if (!res.ok) throw new Error(`${label} HTTP ${res.status}｜${finalUrl}`);
      if (/\/errors(?:[/?#]|$)/i.test(finalUrl)) throw new Error(`${label} 被導向 /errors｜${finalUrl}`);
      if (/text\/html|application\/xhtml/i.test(contentType) || text.trim().startsWith('<')) {
        throw new Error(`${label} 回傳 HTML 而非 JSON｜${finalUrl}`);
      }
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error(`${label} JSON 非陣列`);
      return { rows:data, finalUrl, status:res.status, contentType, attempt };
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastError || new Error(`${label} 取得失敗`);
}

async function fetchJsonValue(url, label, retries = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);
      let res;
      try {
        res = await fetch(url, { method:'GET', signal:controller.signal, redirect:'follow' });
      } finally {
        clearTimeout(timer);
      }
      const finalUrl = res.url || url;
      const contentType = String(res.headers.get('content-type') || '');
      const text = await res.text();
      if (!res.ok) throw new Error(`${label} HTTP ${res.status}｜${finalUrl}`);
      if (/\/errors(?:[/?#]|$)/i.test(finalUrl)) throw new Error(`${label} 被導向 /errors｜${finalUrl}`);
      if (/text\/html|application\/xhtml/i.test(contentType) || text.trim().startsWith('<')) {
        throw new Error(`${label} 回傳 HTML 而非 JSON｜${finalUrl}`);
      }
      const data = JSON.parse(text);
      return { data, finalUrl, status:res.status, contentType, attempt };
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise(r => setTimeout(r, 1500 * attempt));
    }
  }
  throw lastError || new Error(`${label} 取得失敗`);
}

function signedTwseChange(row) {
  const raw = num(row?.['漲跌價差']);
  if (raw === null) return null;
  const sign = String(row?.['漲跌(+/-)'] ?? row?.['漲跌(+／-)'] ?? row?.['漲跌'] ?? '').trim();
  if (sign.includes('-') || sign.includes('－') || sign.includes('−')) return -Math.abs(raw);
  if (sign.includes('+') || sign.includes('＋')) return Math.abs(raw);
  return raw;
}

function makeObjectsFromFields(fields, data, tradeDate) {
  if (!Array.isArray(fields) || !Array.isArray(data)) return [];
  const fieldNames = fields.map(x => String(x ?? '').trim());
  const joined = fieldNames.join('|');
  if (!/證券代號/.test(joined) || !/收盤價/.test(joined) || !/開盤價/.test(joined) || !/最高價/.test(joined) || !/最低價/.test(joined)) return [];
  return data.map(values => {
    if (!Array.isArray(values)) return null;
    const row = { Date:tradeDate };
    for (let i=0;i<fieldNames.length;i++) row[fieldNames[i]] = values[i];
    const signed = signedTwseChange(row);
    if (signed !== null) row.Change = signed;
    return row;
  }).filter(Boolean);
}

export function extractTwseMiIndexRows(payload, targetDate) {
  const candidates = [];
  if (!payload || typeof payload !== 'object') return candidates;

  // Newer TWSE JSON shape: tables:[{title,fields,data}, ...]
  if (Array.isArray(payload.tables)) {
    for (const table of payload.tables) {
      const rows = makeObjectsFromFields(table?.fields, table?.data, targetDate);
      if (rows.length) candidates.push(rows);
    }
  }

  // Legacy TWSE JSON shape: fields8/data8, fields9/data9, etc.
  for (const [key, fields] of Object.entries(payload)) {
    const m = key.match(/^fields(\d*)$/i);
    if (!m) continue;
    const suffix = m[1] || '';
    const data = payload[`data${suffix}`];
    const rows = makeObjectsFromFields(fields, data, targetDate);
    if (rows.length) candidates.push(rows);
  }

  // Some responses expose one direct fields/data table.
  const direct = makeObjectsFromFields(payload.fields, payload.data, targetDate);
  if (direct.length) candidates.push(direct);

  if (!candidates.length) return [];
  return candidates.sort((a,b) => b.length-a.length)[0];
}

function twseMiIndexUrl(date) {
  const u = new URL(SOURCES.twseQuotesByDateBase);
  u.searchParams.set('response','json');
  u.searchParams.set('date',date);
  u.searchParams.set('type','ALLBUT0999');
  return u.toString();
}

async function fetchTwseQuotesByDate(date) {
  const url = twseMiIndexUrl(date);
  const res = await fetchJsonValue(url, `TWSE MI_INDEX ${date}`);
  const rows = extractTwseMiIndexRows(res.data, date);
  if (rows.length < 800) {
    const stat = String(res.data?.stat || res.data?.status || '').trim();
    throw new Error(`TWSE 指定日 ${date} 行情解析不足：${rows.length} 筆${stat ? `｜stat ${stat}` : ''}`);
  }
  return { rows, finalUrl:res.finalUrl, status:res.status, contentType:res.contentType, attempt:res.attempt, source:'MI_INDEX_BY_DATE' };
}

export async function reconcileLatestTradeDate(twseQuotes, tpexQuotes) {
  let twse = twseQuotes;
  const tpex = tpexQuotes;
  let twseDate = latestMarketQuoteDate(twse.rows);
  const tpexDate = latestMarketQuoteDate(tpex.rows);
  const events = [];
  if (!twseDate || !tpexDate) return { twse, tpex, twseDate, tpexDate, events };

  if (twseDate < tpexDate) {
    events.push(`TWSE latest ${twseDate} 落後 TPEx ${tpexDate}，改查 TWSE 指定日 ${tpexDate}`);
    const upgraded = await fetchTwseQuotesByDate(tpexDate);
    const upgradedDate = latestMarketQuoteDate(upgraded.rows);
    if (upgradedDate === tpexDate) {
      twse = upgraded;
      twseDate = upgradedDate;
      events.push(`TWSE 指定日校正成功：${twseDate}`);
    } else {
      events.push(`TWSE 指定日校正未對齊：${upgradedDate || '未知'}`);
    }
  }

  return { twse, tpex, twseDate, tpexDate, events };
}

function sha256Json(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function isoDate(ymd) {
  return /^\d{8}$/.test(ymd || '') ? `${ymd.slice(0,4)}-${ymd.slice(4,6)}-${ymd.slice(6,8)}` : null;
}

async function readJsonIfExists(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return null; }
}

async function cleanupArchives() {
  await fs.mkdir(ARCHIVE_DIR, { recursive:true });
  const names = (await fs.readdir(ARCHIVE_DIR)).filter(x => /^\d{4}-\d{2}-\d{2}\.json$/.test(x)).sort();
  const remove = names.slice(0, Math.max(0, names.length - MAX_ARCHIVES));
  await Promise.all(remove.map(name => fs.unlink(path.join(ARCHIVE_DIR, name))));
}

export async function buildSnapshot({twseQuoteRows,tpexQuoteRows,twseCompanyRows,tpexCompanyRows,sourceMeta={}}) {
  const twseDate = latestMarketQuoteDate(twseQuoteRows);
  const tpexDate = latestMarketQuoteDate(tpexQuoteRows);
  if (!twseDate || !tpexDate) throw new Error(`市場日期無法判斷｜TWSE ${twseDate || '未知'}｜TPEx ${tpexDate || '未知'}`);
  if (twseDate !== tpexDate) throw new Error(`兩市場最新完成交易日不同｜TWSE ${twseDate}｜TPEx ${tpexDate}｜保留上一份完整快照`);

  if (twseQuoteRows.length < 800) throw new Error(`TWSE 原始行情筆數不足：${twseQuoteRows.length}`);
  if (tpexQuoteRows.length < 300) throw new Error(`TPEx 原始行情筆數不足：${tpexQuoteRows.length}`);
  if (twseCompanyRows.length < 700) throw new Error(`TWSE 公司清單筆數不足：${twseCompanyRows.length}`);
  if (tpexCompanyRows.length < 300) throw new Error(`TPEx 公司清單筆數不足：${tpexCompanyRows.length}`);

  const twseIndustry = buildIndustryMap(twseCompanyRows, 'TWSE');
  const tpexIndustry = buildIndustryMap(tpexCompanyRows, 'TPEx');
  const tpexOrdinary = new Set([...tpexIndustry.keys()]);

  const twse = twseQuoteRows
    .map(r => normalizeQuote(r, 'TWSE', twseDate, twseIndustry))
    .filter(r => r && isOrdinaryCode(r.code));
  const tpex = tpexQuoteRows
    .map(r => normalizeQuote(r, 'TPEx', tpexDate, tpexIndustry))
    .filter(r => r && isOrdinaryCode(r.code) && (tpexOrdinary.size < 300 || tpexOrdinary.has(r.code)));

  if (twse.length < 800) throw new Error(`TWSE 清洗後一般個股不足：${twse.length}`);
  if (tpex.length < 600) throw new Error(`TPEx 清洗後一般個股不足：${tpex.length}`);

  const rows = [...twse, ...tpex].sort((a,b) => a.code.localeCompare(b.code, 'zh-TW', {numeric:true}));
  const core = {
    schemaVersion: 1,
    tradeDate: twseDate,
    tradeDateIso: isoDate(twseDate),
    marketCoverageReady: true,
    rows,
    counts: {
      twseRawQuotes: twseQuoteRows.length,
      tpexRawQuotes: tpexQuoteRows.length,
      twseRows: twse.length,
      tpexRows: tpex.length,
      totalRows: rows.length,
      twseCompanies: twseCompanyRows.length,
      tpexCompanies: tpexCompanyRows.length,
      industryReadyRows: rows.filter(r => r.industryCode).length
    },
    officialSources: {
      twseQuotes: SOURCES.twseQuotes,
      twseQuotesByDateBase: SOURCES.twseQuotesByDateBase,
      tpexQuotes: SOURCES.tpexQuotes,
      twseCompanies: SOURCES.twseCompanies,
      tpexCompanies: SOURCES.tpexCompanies
    },
    sourceMeta
  };
  const contentSha256 = sha256Json(core);
  return {
    ...core,
    generatedAt: new Date().toISOString(),
    contentSha256,
    note: '由 GitHub Actions 直接抓取 TWSE＋TPEx 官方公開資料；只有兩市場同一交易日且完整時才更新 latest.json。'
  };
}

export async function main() {
  console.log('Fetching official TWSE / TPEx market snapshot...');
  const [twseLatest,tpexQuotes,twseCompanies,tpexCompanies] = await Promise.all([
    fetchJsonArray(SOURCES.twseQuotes, 'TWSE STOCK_DAY_ALL'),
    fetchJsonArray(SOURCES.tpexQuotes, 'TPEx daily_close_quotes'),
    fetchJsonArray(SOURCES.twseCompanies, 'TWSE company list'),
    fetchJsonArray(SOURCES.tpexCompanies, 'TPEx company list')
  ]);

  const initialTwseDate = latestMarketQuoteDate(twseLatest.rows);
  const initialTpexDate = latestMarketQuoteDate(tpexQuotes.rows);
  console.log(`Latest source dates: TWSE ${initialTwseDate || 'unknown'}｜TPEx ${initialTpexDate || 'unknown'}`);

  let reconciled;
  try {
    reconciled = await reconcileLatestTradeDate(twseLatest, tpexQuotes);
  } catch (error) {
    throw new Error(`完成交易日校正失敗｜TWSE ${initialTwseDate || '未知'}｜TPEx ${initialTpexDate || '未知'}｜${error?.message || error}`);
  }
  for (const line of reconciled.events) console.log(`Trade-date reconciliation: ${line}`);

  const finalTwseDate = latestMarketQuoteDate(reconciled.twse.rows);
  const finalTpexDate = latestMarketQuoteDate(reconciled.tpex.rows);
  if (!finalTwseDate || !finalTpexDate) {
    throw new Error(`市場日期無法判斷｜TWSE ${finalTwseDate || '未知'}｜TPEx ${finalTpexDate || '未知'}`);
  }
  if (finalTwseDate !== finalTpexDate) {
    throw new Error(`兩市場最新完成交易日仍不同｜TWSE ${finalTwseDate}｜TPEx ${finalTpexDate}｜不覆蓋上一份完整快照`);
  }

  const snapshot = await buildSnapshot({
    twseQuoteRows: reconciled.twse.rows,
    tpexQuoteRows: reconciled.tpex.rows,
    twseCompanyRows: twseCompanies.rows,
    tpexCompanyRows: tpexCompanies.rows,
    sourceMeta: {
      twseQuotes: {
        status:reconciled.twse.status,
        finalUrl:reconciled.twse.finalUrl,
        attempt:reconciled.twse.attempt,
        source:reconciled.twse.source || 'STOCK_DAY_ALL',
        initialDate:initialTwseDate,
        finalDate:finalTwseDate
      },
      tpexQuotes: {
        status:tpexQuotes.status,
        finalUrl:tpexQuotes.finalUrl,
        attempt:tpexQuotes.attempt,
        source:'tpex_mainboard_daily_close_quotes',
        initialDate:initialTpexDate,
        finalDate:finalTpexDate
      },
      twseCompanies: { status:twseCompanies.status, finalUrl:twseCompanies.finalUrl, attempt:twseCompanies.attempt },
      tpexCompanies: { status:tpexCompanies.status, finalUrl:tpexCompanies.finalUrl, attempt:tpexCompanies.attempt },
      reconciliation: reconciled.events
    }
  });

  const previous = await readJsonIfExists(LATEST_PATH);
  if (previous?.contentSha256 === snapshot.contentSha256) {
    console.log(`No content change. Current complete trade date remains ${snapshot.tradeDate}.`);
    return;
  }

  await fs.mkdir(path.dirname(LATEST_PATH), { recursive:true });
  await fs.mkdir(ARCHIVE_DIR, { recursive:true });
  const payload = JSON.stringify(snapshot);
  await fs.writeFile(LATEST_PATH, payload + '\n', 'utf8');
  await fs.writeFile(path.join(ARCHIVE_DIR, `${snapshot.tradeDateIso}.json`), payload + '\n', 'utf8');
  await cleanupArchives();
  console.log(`Updated complete market snapshot: ${snapshot.tradeDate}｜TWSE ${snapshot.counts.twseRows}｜TPEx ${snapshot.counts.tpexRows}｜total ${snapshot.counts.totalRows}`);
}

const isDirect = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirect) {
  main().catch(error => {
    console.error(`SNAPSHOT_UPDATE_FAILED: ${error?.stack || error}`);
    process.exitCode = 1;
  });
}
