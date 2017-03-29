# node-uberon-mappings

Module to map terms from a specific UBERON term to a
set of root terms that cover the sets of experiments that
we are investigating

## Updating of data
```sh
curl -L -O 'http://purl.obolibrary.org/obo/uberon/basic.obo'
curl -L -O 'https://raw.githubusercontent.com/dhimmel/uberon/gh-pages/data/hetio-slim.tsv'
```

## Usage
```js
let converter = require('node-uberon-mappings');
converter.convert('UBERON:0004648').then( mapped => console.log(mapped));

// If we have a set of terms that don't have mappings, we can suggest root terms
converter.suggest(['UBERON:0004648','UBERON:0001007']).then( suggestions => console.log(suggestions));
```


## Brenda taxonomy
```
http://www.brenda-enzymes.info/ontology/tissue/tree/update/update_files/BrendaTissueOBO
```