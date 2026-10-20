import './helpers/qloo-fetch.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
registerHooks({resolve(s,c,n){if(s==='next/server')return n('next/server.js',c);if(s.startsWith('.')&&c.parentURL?.startsWith('file:')){const f=new URL(s+'.ts',c.parentURL);if(existsSync(f))return n(f.href,c);}return n(s,c);}});
const {defaultLocationInterest,locationInterestSchema,areaBounds,areaBoundary,radiusArea}=await import('../app/lib/locationInterest.ts');
const {countryByCode,countryAt,countries}=await import('../app/lib/countries.ts');
const {areaFilter}=await import('../app/server/area-filter.ts');
const {qlooJson}=await import('../app/tools/qloo.ts');
const {tourSceneAt}=await import('../app/components/onboarding/tourScript.ts');

test('New York defaults, uncapped radii and country selection survive strict validation',()=>{
 assert.equal(defaultLocationInterest.name,'New York');
 for(const radius of [500000,5000000,50000000])assert.equal(locationInterestSchema.safeParse({...defaultLocationInterest,radius}).success,true);
 assert.equal(locationInterestSchema.safeParse({...defaultLocationInterest,radius:Infinity}).success,false);
 const country={...defaultLocationInterest,countryCode:'KE'};
 assert.equal(locationInterestSchema.safeParse(country).success,true);
 assert.equal(locationInterestSchema.safeParse({...country,countryCode:'invalid'}).success,false);
 assert.equal(radiusArea(country).countryCode,undefined);
 assert.deepEqual(areaBoundary(country).geometry,countryByCode('KE').geometry);
 assert.equal(countries.some(country=>country.code==='SG'),true);
});
test('country click selection respects holes and offshore territories; dateline and polar bounds remain finite',()=>{
 assert.equal(countryAt(36.82,-1.29).code,'KE');
 assert.equal(countryAt(-100,40).code,'US');
 assert.equal(countryAt(0,-30),undefined);
 const fiji=areaBounds({...defaultLocationInterest,countryCode:'FJ'});
 assert.ok(fiji[2]-fiji[0]<20);
 for(const area of [{...defaultLocationInterest,longitude:179,radius:500000},{...defaultLocationInterest,latitude:85,radius:1000000},{...defaultLocationInterest,radius:50000000}]){
  assert.ok(areaBounds(area).every(Number.isFinite));
  assert.ok(areaBounds(area)[2]>areaBounds(area)[0]);
 }
});
test('country Qloo requests send the exact multipart boundary without a fuzzy radius',async()=>{
 process.env.QLOO_HACKATHON_API_SERVER_URL='https://qloo.example';process.env.QLOO_HACKATHON_API_KEY='test';
 const country={...defaultLocationInterest,countryCode:'FJ'};
 const parameters=areaFilter(country);
 assert.ok(parameters['filter.location'].startsWith('MULTIPOLYGON('));
 assert.equal(parameters['filter.location.radius'],'0');
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async(url,options)=>{
   assert.equal(url.search,'');assert.equal(options.method,'POST');
   assert.deepEqual(JSON.parse(options.body),{'filter.type':'urn:entity:place',...parameters});
   return Response.json({success:true,results:{entities:[]}});
  };
  await qlooJson('/v2/insights',{'filter.type':'urn:entity:place',...parameters});
 }finally{globalThis.fetch=original;}
});
test('walkthrough demonstrates a 500 km radius and country boundary and seeking restores earlier states',()=>{
 assert.equal(tourSceneAt('live',31500).radius,500000);
 assert.equal(tourSceneAt('live',35000).countryPickerOpen,true);
 assert.equal(tourSceneAt('live',35000).countryQuery,'Kenya');
 assert.equal(tourSceneAt('live',37000).countryCode,'KE');
 assert.equal(tourSceneAt('live',0).countryCode,undefined);
});
