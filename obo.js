'use strict';

const obo = require('bionode-obo');
const fs = require('fs');

let UnionFind = require('unionfind');
var uf = new UnionFind(12110811);

let instream = fs.createReadStream('basic.obo');

let term_cache = {};

const collect_terms = function(start,cb) {
  if (! term_cache[start] ) {
    return;
  }
  term_cache[start].c.forEach( child => {
    cb(start,child);
    collect_terms(child,cb);
  });
};

obo.terms(instream).on('data',function(dat) {
  let parent = parseInt(dat.id.replace('UBERON:',''));
  if ( ! term_cache[parent] ) {
    term_cache[parent] = { 'p' : [], 'c' : []};
  }
  term_cache[parent].value = dat;
  [].concat(dat.is_a).filter( is_a => is_a ).map( is_a => parseInt(is_a.split(' ')[0].replace('UBERON:','')) ).forEach( is_a => {
    if (! term_cache[is_a] ) {
      term_cache[is_a] = { 'p' : [], 'c' : [] };
    }
    term_cache[is_a]['c'].push(parent);
    term_cache[parent]['p'].push(is_a);
  });
  [].concat(dat.relationship).filter( relationship => (relationship ||'').indexOf('part_of') >= 0 ).map( relation => parseInt(relation.split(' ')[1].replace('UBERON:','')) ).forEach( relation => {
    if (! term_cache[relation] ) {
      term_cache[relation] = { 'p' : [], 'c' : [] };
    }
    term_cache[relation]['c'].push(parent);
    term_cache[parent]['p'].push(relation);
  });
});
instream.on('end', () => {
  var parser = require('csv-parse')({delimiter: "\t"}, function(err, data){
    // data = [['UBERON:0000955'],['UBERON:0001007']];
    data.forEach( row => {
      if (row[0].indexOf('UBERON') < 0) {
        return;
      }
      collect_terms(parseInt(row[0].replace('UBERON:','')),(p,c) => {
        uf.union(p,c);
        if (uf.connected(16505,19198)) {
          console.log(row[0],p,c);
          process.exit(1);
        }
      });
    });
    console.log('digestive','anus',uf.connected(+'0001007',+'0001245'));
    console.log('brain','digestive',uf.connected(+'0000955',+'0001007'));
  });
  fs.createReadStream('hetio-slim.tsv').pipe(parser);
});
let handle_entry = function(dat)  {
  let parent = parseInt(dat.id.replace('UBERON:',''));
  if ([1007,955,25,1059].indexOf(parent) >= 0) {
    console.log("Skipping parents of ",dat.name);
    return;
  }
  [].concat(dat.is_a).filter( is_a => is_a ).map( is_a => parseInt(is_a.split(' ')[0].replace('UBERON:','')) ).forEach( is_a => {
    if ([
      +'0000064',
      +'0000025',
      +'0000062',
      +'0001048',
      +'0004119',
      +'0000077',
      +'0004121',
      +'0004120',
      +'0013522',
      +'0001062',
      +'0000464',
      +'0000477',
      +'0000479',
      +'0000481',
      +'0000485',
      +'0005156',
      +'0005911',
      +'0012275',
      +'0000486',
      +'0000468',
      +'0000467',
      +'0000476',
      +'0015212',
      +'0000489',
      +'0000061',
      +'0010000',
      +'0003978',
      +'0010313',
      +'0010314',
      +'0000020'
      ].indexOf(is_a) >= 0) {
      return;
    }
    // console.log(is_a,parent);
    uf.union(is_a,parent);
  });

  [].concat(dat.relationship).filter( relationship => (relationship ||'').indexOf('part_of') >= 0 ).map( relation => parseInt(relation.split(' ')[1].replace('UBERON:','')) ).forEach( relation => {
    if ([
      +'0000468',
      +'0001042',
      +'0002330'
      ].indexOf(relation) >= 0) {
      return;
    }

    // console.log(relation,parent);
    uf.union(relation,parent);
  });

};
instream.on('end', () => {
  console.log("Here");
  console.log(uf.find(+'0001245'));
  console.log('digestive','anus',uf.connected(+'0001007',+'0000955'));
  console.log('digestive','anus',uf.connected(+'0001007',+'0001245'));
  console.log('brain','digestive',uf.connected(+'0000955',+'0001007'));
});
