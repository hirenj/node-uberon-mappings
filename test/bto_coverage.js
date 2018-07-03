"use strict";
const converter = require('..');
const chai = require('chai');
const expect = chai.expect;
const assert = chai.assert;

const onlyUnique = function(value, index, self) {
    return self.indexOf(value) === index;
};

const BTO_IDS = [
'BTO:0000007',
'BTO:0000131',
'BTO:0000132',
'BTO:0000133',
'BTO:0000142',
'BTO:0000164',
'BTO:0000232',
'BTO:0000457',
'BTO:0000552',
'BTO:0000567',
'BTO:0000599',
'BTO:0000664',
'BTO:0000759',
'BTO:0000862',
'BTO:0000903',
'BTO:0000988',
'BTO:0001103',
'BTO:0001129',
'BTO:0001489',
'BTO:0001553',
'BTO:0001619',
'BTO:0001949',
'BTO:0001976',
'BTO:0000237',
'BTO:0000782',
'BTO:0003034'
];

const correct_mappings = {
  "HEK-293 cell":"kidney",
  "blood plasma":"blood plasma",
  "blood serum" : "serum",
  "blood platelet":"bone marrow",
  "brain":"brain",
  "Burkitt lymphoma cell":"lymphoid tissue",
  "cerebellum":"brain",
  "CHO-K1 cell":"female gonad",
  "HaCaT cell":"skin of body",
  "HeLa cell":"uterine cervix",
  "Hep-G2 cell":"liver",
  "K-562 cell":"blood",
  "liver":"liver",
  "heart ventricle":"heart",
  "atrium":"heart",
  "pancreas":"pancreas",
  "skeletal muscle":"skeletal muscle organ",
  "prostate gland":"prostate gland",
  "whole body":"body proper",
  "LS-174T cell":"colon",
  "skin fibroblast cell line":"skin of body",
  "HUVEC cell":"blood vessel",
  "Neuro-2a cell":"ganglion",
  "HELF cell":"lung",
  "T-lymphocyte":"lymphoid tissue",
  "cerebrospinal fluid":"cerebrospinal fluid"
};

const allowed_missing = [];
const allowed_replaced = [];

describe('BTO cell line and tissue coverage', function() {
  BTO_IDS.forEach( id => {
    it( `Has converted term for ${id}`, function(done) {
      let term_name = null;
      converter.getName(id)
      .then( name => { term_name = name })
      .then( () => { expect(Object.keys(correct_mappings)).to.include(term_name) })
      .then( () => converter.convert(id) )
      .then( term => [ term ] )
      .then( terms => { if (terms[0].name) { expect(terms[0].name).equals(correct_mappings[term_name]); } return terms; })
      .then( converted_terms => converted_terms.filter( term => (! term.root) || ((term.alternatives || []).length > 0) ))
      .then( imprecise => imprecise.filter( item => (allowed_missing.indexOf(item.term.toString()) < 0) && (allowed_replaced.indexOf(item.term.toString()) < 0) ) )
      .then( imprecise => { if (imprecise.length > 0) { console.dir(imprecise[0]); } return imprecise;})
      .then( imprecise_terms => expect(imprecise_terms.length).equals(0) )
      .then( () => done() )
      .catch( done );
    });
  });
});