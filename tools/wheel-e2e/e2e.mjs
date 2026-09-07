import { chromium } from 'playwright';
const BASE='http://localhost:4599';
const RUN = { variant:'rank', completed:new Date().toISOString(), meta:'Built from 30 ranked moments · overall picture 78% in focus',
  bands:[{k:'O',focus:84,low:62,high:76},{k:'C',focus:81,low:18,high:32},{k:'E',focus:79,low:24,high:39},
         {k:'A',focus:82,low:68,high:82},{k:'N',focus:80,dial:7.4},{k:'R',focus:78,dial:2.6}],
  answers:[{id:'q1',order:[0,1,2,3]}] };
const WEIRD = '  i keep forgetting to eat lunch  and thats FINE actually 🙂';
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);

const b = await chromium.launch();
const ctx = await b.newContext({ viewport:{width:390,height:844} });
const pg = await ctx.newPage();
pg.on('console', m => { if (m.type()==='error') console.log('  [console error]', m.text()); });
pg.on('pageerror', e => console.log('  [page error]', e.message));

// 1. finish WAYL (rank) -> the CTA is on the results page
await pg.goto(BASE+'/questionnaires/what-are-you-like-rank.html');
await pg.evaluate(()=>{ localStorage.setItem('cowch-consent-v1','accepted'); });
await pg.reload();
const cta = pg.locator('a[href*="build-your-wheel"]');
ok(await cta.count()===1, 'rank results page carries one Build my wheel link');
ok((await cta.getAttribute('href'))==='/questionnaires/build-your-wheel.html?from=wayl', 'link carries ?from=wayl');

// 2. arrive at the wheel with a finished run on the device
await pg.evaluate(r => localStorage.setItem('cowch-q-wayl-rank', JSON.stringify(r)), RUN);
await pg.goto(BASE+'/questionnaires/build-your-wheel.html?from=wayl');
await pg.waitForSelector('#build:not(.hidden)', {timeout:5000});
ok(await pg.locator('#intro').isHidden(), 'no intro gate: lands straight in the build');
const spoke1 = await pg.locator('.spoke-name').innerText();
console.log('  spoke one:', spoke1, '|', await pg.locator('.journey-label').innerText());
ok((await pg.locator('.cand').count())===4, 'three statements + In my own words');

// 3. pick a statement, rewrite it badly on purpose, keep it
await pg.locator('.cand').first().click();
await pg.locator('#ownWords').fill(WEIRD);
await pg.locator('[data-keep]').click();
await pg.waitForFunction(()=>document.querySelector('.sync-note') && /Kept/.test(document.querySelector('.sync-note').textContent), null, {timeout:5000});
ok(true, 'saved and confirmed on screen: "'+ (await pg.locator('.sync-note').first().innerText()) +'"');

// 4. second spoke via the free-text door only
await pg.locator('.cand-own').click();
ok((await pg.locator('#ownWords').inputValue())==='', 'own-words box opens empty');
const OWN = 'sleep is the one i actually want to fix first';
await pg.locator('#ownWords').fill(OWN);
await pg.locator('[data-keep]').click();
await pg.waitForFunction(()=>/Kept/.test(document.querySelector('.sync-note').textContent), null, {timeout:5000});

// 5. a few is enough
await pg.locator('[data-done]').click();
await pg.waitForSelector('#wheel:not(.hidden)');
console.log('  wheel meta:', await pg.locator('#wheelMeta').innerText());
const quoted = await pg.locator('.wrow-words').allTextContents();
ok(quoted.some(t=>t.includes(WEIRD)), 'the wheel quotes the words back');

// 6. what actually reached the server
const store = await (await fetch(BASE+'/__store')).json();
const recs = store.filter(([k])=>k.startsWith('cowch:wheel:'));
ok(recs.length===1, 'exactly one server record');
const rec = recs[0][1];
const texts = Object.values(rec.entries).map(e=>e.text);
ok(texts.includes(WEIRD), 'stored VERBATIM, leading spaces + lowercase + emoji intact: '+JSON.stringify(texts.find(t=>t.includes('lunch'))));
ok(texts.includes(OWN), 'the free-text-only spoke stored verbatim');
ok(Object.values(rec.entries).some(e=>e.own===true), 'free-text spoke marked as their own, no borrowed hold');
ok(rec.entries[Object.keys(rec.entries)[0]].text!==undefined && rec.order.length===13, 'order of the thirteen travels with it');

// 7. a wiped browser gets its words back from the server
await pg.evaluate(()=>{ localStorage.removeItem('cowch-wheel-build'); });
await pg.goto(BASE+'/questionnaires/build-your-wheel.html');
await pg.waitForSelector('#intro:not(.hidden)');
const resume = await pg.locator('.resume-note').count();
ok(resume===1, 'after clearing the local copy, the server copy is found again');
console.log('  ', resume ? await pg.locator('.resume-note').innerText() : '');

// 8. delete means delete
await pg.evaluate(()=>{ localStorage.setItem('cowch-q-wayl-rank', localStorage.getItem('cowch-q-wayl-rank')); });
await pg.goto(BASE+'/questionnaires/build-your-wheel.html?from=wayl');
await pg.waitForSelector('#build:not(.hidden)');
await pg.locator('[data-done]').click();
await pg.waitForSelector('#wheel:not(.hidden)');
await pg.locator('[data-restart]').click();
await pg.waitForTimeout(600);
const after = (await (await fetch(BASE+'/__store')).json()).filter(([k])=>k.startsWith('cowch:wheel:'));
ok(after.length===0, 'delete removes the server record too');
ok(await pg.evaluate(()=>!localStorage.getItem('cowch-wheel-id')), 'and the id, so the next wheel is a new record');

await b.close();
