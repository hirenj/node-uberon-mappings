
let convert = require('..');

let fs = require('fs');

input_classes = fs.readFileSync(process.stdin.fd).toString().split('\n').filter( val => val );

Promise.all( input_classes.map( ont => convert.convert(ont) )).then ( results => console.log(results.map( res => `${res.term}\t${res.root}` ).join('\n')) );