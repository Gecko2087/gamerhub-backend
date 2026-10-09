import test from 'node:test';
import assert from 'node:assert/strict';
import { validateGameQuery, literalPattern } from '../middleware/gameQuery.js';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
test('malformed parser forms and unbounded pagination are rejected before the next boundary', () => {
  for (const query of [{query:['a','b']},{search:{$regex:'.*'}},{genre:{$ne:''}},{page:[]},
    {page:'1e6'},{page:'20junk'},{page:'0'},{pageSize:'0'},{page:'101'},{pageSize:'101'},
    {query:'x'.repeat(161)},{page:'1.5'},{page:'-1'},{page:'999999999999999999999'}]) {
    let reached=false, status;
    const res={status(code){status=code;return this},json(){}};
    validateGameQuery({query},res,()=>{reached=true});
    assert.equal(status,400); assert.equal(reached,false);
  }
});
test('filter aliases cannot override service-controlled pagination or API key', async()=>{
  const seen=[];
  const source=await readFile(new URL('../services/rawgService.js',import.meta.url),'utf8');
  const context=vm.createContext({process:{env:{RAWG_API_KEY:'test-only-key'}},console:{error(){}}},
    {codeGeneration:{strings:false,wasm:false}});
  const module=new vm.SourceTextModule(source,{context});
  await module.link(name=>{
    const values=name==='axios' ? {default:{get:async(url,options)=>{seen.push(options.params);return {data:{results:[]}}}}}
      : name==='./demoCatalog.js' ? {demoGames:[],demoSearch(){throw Error('Unexpected demo branch')}} : null;
    assert.ok(values,'Unexpected import');
    return new vm.SyntheticModule(Object.keys(values),function(){for(const[key,value]of Object.entries(values))this.setExport(key,value)},{context});
  });
  await module.evaluate();
  await module.namespace.getGamesByFilters({page_size:'1000000',page:'999999',key:'foreign-key',genres:'3'},1,20);
  assert.equal(seen[0].page_size,20);assert.equal(seen[0].page,1);assert.equal(seen[0].key,'test-only-key');
  assert.equal(seen[0].genres,'3');
});
test('empty/default searches and existing 50-record workflows remain allowed',()=>{
  for (const query of [{},{query:''},{page:'1',pageSize:'50'},{page:'100',pageSize:'100'},
    {search:'Orbit Runner',genre:'Action',platform:'PC'}]) {
    let reached=false;
    validateGameQuery({query},{status(){throw Error('Unexpected rejection')}},()=>{reached=true});
    assert.equal(reached,true);
  }
});
test('regex-looking text is interpreted literally, with case insensitive substring matches',()=>{
  for (const text of ['(a+)+$','.*','a[b]','a\\b','x{2}','x?y','x|y','^start$','price$1']) {
    const pattern=new RegExp(literalPattern(text),'i');
    assert.equal(pattern.test('prefix '+text.toUpperCase()+' suffix'),true);
    assert.equal(pattern.test('unrelated text'),false);
  }
});
