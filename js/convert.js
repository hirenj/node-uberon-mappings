'use strict';

const obo = require('bionode-obo');
const fs = require('fs');
const csv = require('csv-parse');
const path = require('path');

const new_mapping = () => { return {'p' : [], 'c' : [] }};

const read_obo = function(file,handler) {
  return new Promise( (resolve,reject) => {
    let instream = fs.createReadStream(file);
    let mappings = {};
    instream.pipe(obo.parse(() => {})).on('data',function(buffer) {
      let dat = JSON.parse(buffer);
      if ( ! mappings[dat.id] ){
        mappings[dat.id] = new_mapping();
      }
      mappings[dat.id].value = dat;
      handler(dat,mappings[dat.id],mappings);
    });
    instream.on('end', () => {
      resolve(mappings);
    });
    instream.on('error', err => reject(err) );
  });
};

const handle_entry_uberon = function(entry,self,results) {
  if (entry.intersection_of) {
    entry.relationship = (entry.relationship || []).concat(entry.intersection_of);
  }
  [].concat(entry.is_a)
  .filter( is_a => is_a )
  .map( is_a => is_a.split(' ')[0] )
  .forEach( is_a => {
    if (! results[is_a] ) {
      results[is_a] = new_mapping();
    }
    results[is_a]['c'].push(entry.id);
    results[entry.id]['p'].push(is_a);
  });
  [].concat(entry.relationship)
  .filter( relationship => (relationship ||'').indexOf('part_of') >= 0 )
  .map( relation => relation.split(' ')[1] )
  .forEach( relation => {
    if (! results[relation] ) {
      results[relation] = new_mapping();
    }
    results[relation]['c'].push(entry.id);
    results[entry.id]['p'].push(relation);
  });
};

const handle_entry_brenda = function(entry,self,results) {
  if (entry.intersection_of) {
    entry.relationship = (entry.relationship || []).concat(entry.intersection_of);
  }
  [].concat(entry.is_a)
  .filter( is_a => is_a )
  .map( is_a => is_a.split(' ')[0] )
  .forEach( is_a => {
    if (! results[is_a] ) {
      results[is_a] = new_mapping();
    }
    results[is_a]['c'].push(entry.id);
    results[entry.id]['p'].push(is_a);
  });
  [].concat(entry.relationship)
  .filter( relationship => relationship )
  .filter( relationship => relationship.indexOf('part_of') >= 0 || relationship.indexOf('develops_from') >= 0 )
  .map( relation => relation.split(' ')[1] )
  .forEach( relation => {
    if (! results[relation] ) {
      results[relation] = new_mapping();
    }
    results[relation]['c'].push(entry.id);
    results[entry.id]['p'].push(relation);
  });
};

const read_mappings = read_obo(path.join(__dirname,'../basic.obo'),handle_entry_uberon);

const read_obo_brenda = read_mappings.then( () => read_obo(path.join(__dirname,'../brenda.obo'),handle_entry_brenda));

const read_roots = new Promise( (resolve,reject) => {
  let parser = csv({delimiter: "\t"}, function(err, data){
    if (err) {
      reject(err);
      return;
    }
    resolve(data.map( row => row[0] ));
  });
  fs.createReadStream(path.join(__dirname,'../roots.tsv')).pipe(parser);
});

const read_brenda_mappings = new Promise( (resolve,reject) => {
  let parser = csv({delimiter: "\t"}, function(err, data){
    if (err) {
      reject(err);
      return;
    }
    let mappings = {};
    data.forEach( row => mappings[row[1].toUpperCase()] = row[0] );
    resolve(mappings);
  });
  fs.createReadStream(path.join(__dirname,'../uberon_bto_mapping.tsv')).pipe(parser);
});

const parents_for = function(start,dist,mappings) {
  if ( ! dist ) {
    dist = 0;
  }

  if (! mappings[start] ) {
    return [];
  }

  let results = [];
  mappings[start].p.forEach( parent => {
    results.push({ val: parent, dist: dist });
    results = results.concat(parents_for(parent,dist + 1,mappings));
  });
  return results;
};


const find_parent_term = function(term,roots,mappings) {
    let parents_objs = parents_for(term.toString(),null,mappings);
    let parents = parents_objs.map( obj => obj.val );
    let found_root = null;
    let min_distance = 1e06;

    let alternative_roots = [];

    roots.forEach( root => {
      let parent_idx = parents.indexOf(root);
      let parent_obj = parents_objs[parent_idx];
      if (parent_idx >= 0) {
        if (found_root && parent_obj.dist < min_distance) {
          alternative_roots.push({ term: found_root, distance: min_distance });
        }
        if ( parent_obj.dist < min_distance ) {
          min_distance = parent_obj.dist;
          found_root = root;
        }
      }
    });
    if (found_root) {
      return { term: term, root: found_root, name: mappings[found_root].value.name, distance: min_distance, alternatives: alternative_roots };
    }
    return { term: term, root: null };
};


const convert_brenda = function(term) {
  return Promise.all([read_obo_brenda,read_brenda_mappings]).then( data => {
    let ontology = data[0];
    let table = data[1];
    if (table[term]) {
      return table[term];
    }
    let mapped = find_parent_term(term,Object.keys(table),ontology);
    return table[mapped.root];
  })
  .then( converted => {
    return { term: converted, original: term, toString: () => converted };
  });
}

const convert = function(term) {
  let term_promise = Promise.resolve(term);
  if (term.toUpperCase().indexOf('BTO:') == 0) {
    term_promise = convert_brenda(term.toUpperCase());
  }
  return term_promise
  .then( (term) => Promise.all([term,read_mappings,read_roots]) )
  .then( definitions => {
    let term = definitions[0];
    let mappings = definitions[1];
    let roots = definitions[2];

    if (roots.indexOf(term.toString()) >= 0) {
      return { term: term, root: term.toString(), name: mappings[term.toString()].value.name };
    }

    return find_parent_term(term,roots,mappings);

  });
};

const root_suggestion = function(terms) {
  if ( ! Array.isArray(terms)) {
    terms = new Array(terms);
  }
  return read_mappings.then( mappings => {
    let parent_count = {};
    terms.forEach( term => {
      let parents_objs = parents_for(term.toString(),null,mappings);
      let parents = parents_objs.map( obj => obj.val );
      parents.forEach( parent => {
        parent_count[parent] = (parent_count[parent] || 0)+ 1;
      });
    });
    return Object.keys(parent_count)
    .sort(  (a,b) => parent_count[b] - parent_count[a] )
    .map( parent => { return { term: parent, count: parent_count[parent], name: mappings[parent].value.name } });
  });
};


exports.convert = convert;
exports.suggest = root_suggestion;