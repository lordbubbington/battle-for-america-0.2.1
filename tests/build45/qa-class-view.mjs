import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
const app=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
const server=await createServer({root:app,configFile:false,appType:'custom',resolve:{alias:{'@':path.join(app,'src')}},optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false,watch:null}});
try{
  const e=await server.ssrLoadModule('/src/lib/gameEngine.js');
  const {default:Panel}=await server.ssrLoadModule('/src/components/game/SeatLegislaturePanel.jsx');
  const {BUILD45_LEGISLATURE_CLASS_SPECS:specs}=await server.ssrLoadModule('/src/data/build45LegislatureClasses.js');
  const game=e.createGame({party:'dem',candidateId:'shapiro',opponentId:'vance',difficultyId:'medium',startId:'aug',campaignId:'qa-class-view'});
  const legacy={...game,build45:{...game.build45}};delete legacy.build45.legislatureClassRevision;
  const results=[];
  for(const selected of [...new Set(specs.map(row=>row.state))]){
    const current=renderToStaticMarkup(React.createElement(Panel,{game,selected}));
    const old=renderToStaticMarkup(React.createElement(Panel,{game:legacy,selected}));
    assert.ok(!current.includes('seat classes unresolved'),selected+' no raw null-class warning in new model');
    assert.ok(current.includes('NCSL preliminary 2024 tally'),selected+' preliminary holder-source label retained');
    assert.ok(current.includes('without an independent state canvass check'),selected+' verification limits visible');
    results.push({state:selected,newNullClassWarning:false,legacyNullClassWarnings:[...old.matchAll(/([\d,]+) seat classes unresolved/g)].map(match=>match[1]),preliminaryHolderAndSourceLimitsVisible:true});
  }
  fs.writeFileSync(path.resolve(app,'../evidence/qa/data/class-visible-estimates.json'),JSON.stringify({status:'PASS',states:results.length,method:'Actual SeatLegislaturePanel React render for final and legacy class markers; packaged layout remains separate.',results},null,2));
  console.log(JSON.stringify({status:'PASS',states:results.length,newClassWarningsCorrect:true,holderSourceLimitsRetained:true}));
}finally{await server.close();}
