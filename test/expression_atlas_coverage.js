"use strict";
const converter = require('..');
const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;
const csv = require('csv-parse');

const ftp = require('ftp');
const parse_url = require('url').parse;

const onlyUnique = function(value, index, self) {
    return self.indexOf(value) === index;
};

const connect_ftp = function(url) {
  let req = parse_url(url);
  let ftp_site  = new ftp();
  let result = new Promise(function(resolve,reject) {
    ftp_site.on('ready',function() {
      resolve(ftp_site);
    });
    ftp_site.on('error',reject);
  });
  req.connTimeout = 1000;
  ftp_site.connect(req);
  return result.catch(function(err) {
    console.log(err);
    return null;
  });
};

var download_file = function(url,ftp) {
  let path = parse_url(url).path;
  return new Promise(function(resolve,reject) {
    ftp.get(path, function(err, stream) {
      if (err) {
        reject(err);
      } else {
        resolve(stream);
      }
    });
  });
};



const get_description_url = function(experiment) {
  return `ftp://ftp.ebi.ac.uk/pub/databases/microarray/data/atlas/experiments/${experiment}/${experiment}.condensed-sdrf.tsv`;
}

const read_tsv = function(stream) {
  return new Promise( (resolve,reject) => {
    let parser = csv({delimiter: "\t", relax_column_count: true}, function(err, data){
      if (err) {
        reject(err);
        return;
      }
      let ids = data.filter( row => row[3] == 'characteristic' && row[4] == 'organism part')
      .map( row => row[6])
      .filter( purl => purl )
      .map( purl => purl.split('/').reverse().shift().replace('_',':'));
      resolve(ids);
    });
    stream.pipe(parser);
  });
}

const get_terms = function(experiment) {
  let url = get_description_url(experiment);
  return connect_ftp(url)
  .then( download_file.bind(null,url) )
  .then( read_tsv );
}

const experiment_ids = ['E-MTAB-2836','E-MTAB-4344','E-GEOD-26284','E-PROT-1','E-PROT-3'];

const allowed_missing = ['UBERON:0001007'];
const allowed_replaced = ['UBERON:0004648'];


describe('Gene expression atlas coverage', function() {
  experiment_ids.forEach( exp => {
    it( `Has full coverage for ${exp}`, function(done) {
      get_terms(exp)
      .then( ids=> ids.filter(onlyUnique))
      .then( ids=> ids.filter( id => id.indexOf('UBERON') >= 0))
      .then( terms => {
        return Promise.all(terms.map( term => converter.convert(term) ));
      })
      .then( converted_terms => converted_terms.filter( term => (! term.root) || ((term.alternatives || []).length > 0) ))
      .then( imprecise => imprecise.filter( item => (allowed_missing.indexOf(item.term.toString()) < 0) && (allowed_replaced.indexOf(item.term.toString()) < 0) ) )
      .then( imprecise => { if (imprecise.length > 0) { console.log(imprecise); } return imprecise;})
      .then( imprecise_terms => expect(imprecise_terms.length).equals(0) )
      .then( () => done() )
      .catch( done );
    });
  });
});