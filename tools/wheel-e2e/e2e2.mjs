import { chromium } from 'playwright';
const BASE='http://localhost:4599';
const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
const SINGLE={completed:new Date().toISOString(),meta:'Built from 30 moments · 71% in focus',
  bands:[{k:'O',focus:71,low:55,high:70},{k:'C',focus:66,low:30,high:46},{k:'E',focus:70,low:22,high:38},
         {k:'A',focus:69,low:60,high:75},{k:'N',focus:68,dial:6.8},{k:'R',focus:64,dial:3.1}],
  answers:[], abstentions:[{id:'q3',s:'x',note:'it depends who is in the room'}]};
const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:390,height:844}}); const pg=await ctx.newPage();
await pg.goto(BASE+'/questionnaires/build-your-wheel.html');
await pg.evaluate(r=>{localStorage.setItem('cowch-consent-v1','accepted');localStorage.setItem('cowch-q-wayl',JSON.stringify(r));},SINGLE);

// single-choice variant hands off too
await pg.goto(BASE+'/questionnaires/build-your-wheel.html?from=wayl');
await pg.waitForSelector('#build:not(.hidden)',{timeout:5000});
ok(true,'single-choice WAYL also hands off into the build ('+await pg.locator('.spoke-name').innerText()+')');

// nothing typed in the own-words door is refused, not silently substituted
await pg.locator('.cand-own').click();
await pg.locator('[data-keep]').click();
await pg.waitForTimeout(300);
ok(/Type a line in your own words/.test(await pg.locator('.sync-note').first().innerText()),'empty own-words is refused, no sentence put in their mouth');

// too long: rejected with the reason, nothing altered
await pg.locator('#ownWords').fill('x'.repeat(2100));
await pg.locator('[data-keep]').click();
await pg.waitForTimeout(800);
const note=await pg.locator('.sync-note').first().innerText();
ok(/longer than we can keep/.test(note),'over-long spoke is refused on its own spoke, never trimmed: "'+note.slice(0,60)+'…"');
ok((await pg.locator('#ownWords').inputValue()).length===2100,'their text is untouched in the box');
await pg.screenshot({path:'/tmp/shot-build.png'});

// offline: local keeps working, and it says so
await ctx.setOffline(true);
await pg.locator('#ownWords').fill('one good breath before i answer anyone');
await pg.locator('[data-keep]').click();
await pg.waitForTimeout(800);
ok(/No connection/.test(await pg.locator('.sync-note').first().innerText()),'offline says so plainly and keeps going');
await ctx.setOffline(false);
await pg.locator('.cand').first().click();
await pg.locator('[data-keep]').click();
await pg.waitForTimeout(800);
const store=await (await fetch(BASE+'/__store')).json();
const rec=store[store.length-1][1];
ok(Object.values(rec.entries).some(e=>e.text==='one good breath before i answer anyone'),'the spoke written while offline reaches the server on the next save');
await b.close();
