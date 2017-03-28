'use strict';

const obo = require('bionode-obo');
const fs = require('fs');

let UnionFind = require('unionfind');
var uf = new UnionFind(12110811);

let instream = fs.createReadStream('basic.obo');

let term_cache = {};

const pad = function(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
};

const collect_terms = function(start,cb) {
  if (! term_cache[start] ) {
    return;
  }
  term_cache[start].c.forEach( child => {
    cb(start,child);
    collect_terms(child,cb);
  });
};

const parents_for = function(start,dist) {
  if ( ! dist ) {
    dist = 0;
  }
  if (! term_cache[start] ) {
    return [];
  }
  let results = [];
  term_cache[start].p.forEach( parent => {
    results.push({ val: parent, dist: dist });
    results = results.concat(parents_for(parent,dist + 1));
  });
  return results;
};


obo.terms(instream).on('data',function(dat) {
  let parent = parseInt(dat.id.replace('UBERON:',''));
  if ( ! term_cache[parent] ) {
    term_cache[parent] = { 'p' : [], 'c' : []};
  }
  term_cache[parent].value = dat;
  if (dat.intersection_of) {
    dat.relationship = (dat.relationship || []).concat(dat.intersection_of);
  }
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
  let roots = [
"UBERON:0001911",
"UBERON:0001132",
"UBERON:0002073",
"UBERON:0002073",
"UBERON:0003729",
"UBERON:0001301",
"UBERON:0002185",
"UBERON:0000970",
"UBERON:0000004",
"UBERON:0001042",
"UBERON:0002369",
"UBERON:0006856",
"UBERON:0000178",
"UBERON:0002371",
"UBERON:0002481",
"UBERON:0000955",
"UBERON:0000310",
"UBERON:0002418",
"UBERON:0000159",
"UBERON:0001052",
"UBERON:0001154",
"UBERON:0001155",
"UBERON:0012652",
"UBERON:0001043",
"UBERON:0002115",
"UBERON:0002116",
"UBERON:0000056",
"UBERON:0002113",
"UBERON:0002107",
"UBERON:0002110",
"UBERON:0002294",
"UBERON:0004912",
"UBERON:0002048",
"UBERON:0000029",
"UBERON:0001744",
"UBERON:0006558",
"UBERON:0006561",
"UBERON:0010394",
"UBERON:0000166",
"UBERON:0000167",
"UBERON:0000378",
"UBERON:0001716",
"UBERON:0001723",
"UBERON:0001733",
"UBERON:0001833",
"UBERON:0003679",
"UBERON:0005905",
"UBERON:0008253",
"UBERON:0008802",
"UBERON:0008805",
"UBERON:0010056",
"UBERON:0011268",
"UBERON:0011303",
"UBERON:0011349",
"UBERON:0011595",
"UBERON:0012105",
"UBERON:0013656",
"UBERON:0016482",
"UBERON:0016915",
"UBERON:0034767",
"UBERON:0035942",
"UBERON:1000011",
"UBERON:2002108",
"UBERON:4300137",
"UBERON:4300138",
"UBERON:4300139",
"UBERON:0000473",
"UBERON:0000992",
"UBERON:0000994",
"UBERON:0002537",
"UBERON:0009117",
"UBERON:0001264",
"UBERON:0000977",
"UBERON:0002367",
"UBERON:0001052",
"UBERON:0001134",
"UBERON:0000945",
"UBERON:0000473",
"UBERON:0001723",
"UBERON:0001255",
"UBERON:0002110",
"UBERON:0006860",
"UBERON:0000002",
"UBERON:0000995",
"UBERON:0000014",
"UBERON:0000947",
"UBERON:0000948",
"UBERON:0002106",
"UBERON:0002240",
"UBERON:0007650",
"UBERON:0000996",
"UBERON:0001981",
"UBERON:0003889",
"UBERON:0001830",
"UBERON:0000007",
"UBERON:0000168",
"UBERON:0002046",
"UBERON:0001021",
"UBERON:0001013",
"UBERON:0001898",
"UBERON:0002245",
"UBERON:0002114",
"UBERON:0001987",
"UBERON:0001044",
"UBERON:0002108",
"UBERON:0001135"
  ];
  roots = roots.map( id => parseInt(id.replace('UBERON:','')));
  let parent_count = {};
  var parser = require('csv-parse')({delimiter: "\t"}, function(err, data){
    // data = [['UBERON:0000955'],['UBERON:0001007']];
    console.log(err);
    data.forEach( row => {
      if (row[1].indexOf('UBERON') < 0) {
        return;
      }
      let a_term = parseInt(row[1].replace('UBERON:',''));
      if (roots.indexOf(a_term) >= 0) {
        // console.log(a_term,a_term,"as_root",term_cache[a_term].value.name);
        return;
      }
      let parents_objs = parents_for(a_term);
      let parents = parents_objs.map( obj => obj.val );
      let found_root = null;
      let found_root_distance = 1e06;
      roots.forEach( root => {
        if (parents.indexOf(root) >= 0) {
          if (found_root && parents_objs[parents.indexOf(root)].dist < found_root_distance) {
            console.log("Replacing root",found_root,"with",root,a_term,parents_objs[parents.indexOf(root)].dist,found_root_distance);
          }
          if ( parents_objs[parents.indexOf(root)].dist < found_root_distance ) {
            found_root_distance = parents_objs[parents.indexOf(root)].dist;
            found_root = root;
          }
        }
      });
      if (found_root) {
        console.log(a_term,found_root,term_cache[a_term].value.name,"descendant of root",term_cache[found_root].value.name);
        return;
      }
      parents.forEach( parent => {
        parent_count[parent] = (parent_count[parent] || 0)+ 1;
      });
      console.log(a_term,null,"no root",term_cache[a_term].value.name);
    });
    Object.keys(parent_count).forEach( parent => {
      console.log(parent_count[parent],term_cache[parent].value.name);
    });
    console.dir(parent_count);
    console.log('digestive','anus',uf.connected(+'0001007',+'0001245'));
    console.log('brain','digestive',uf.connected(+'0000955',+'0001007'));
  });
  fs.createReadStream('/dev/stdin').pipe(parser);
});

instream.on('end', () => {
  console.log("Here");
  console.log(uf.find(+'0001245'));
  console.log('digestive','anus',uf.connected(+'0001007',+'0000955'));
  console.log('digestive','anus',uf.connected(+'0001007',+'0001245'));
  console.log('brain','digestive',uf.connected(+'0000955',+'0001007'));
});
