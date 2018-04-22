const vscode = require('vscode');

module.exports = async container => {
  const containerText = container.getText();
  let filtered;
  try {
  filtered = containerText
    .match(/\.register\({([\s\S]+?)}\);/gm)
    .join('')
    .replace(/`/gm,'\'')
    .replace(/${.+?}/gm,'')
    .replace(/\.register\({([\s\S]+?)}\);/gm,'$1')
    .replace(/^.+?require.+?$/gm, '')
    .replace(/(\/\/.*|\/\*[\s\S]+?\*\/)/gm,'')
    .replace(/(asFunction|asValue)\(([\s\S]+?)\)(,|\.(singleton|transient|scoped|setLifetime)\(.*?\),)/gm,'\'$2\',')
    .replace(/\.\.\./gm, '')
    .replace(/\(.*?\)\s+?=>\s+?(\S)/gm,'$1')
    .replace(/\(.*?\)\s+?=>\s+?(\S)/gm,'$1')
    //.replace(/\s+/gm,' ')
    .replace(/,\',/gm, '\',')
    // .replace(/,/gm,',\n')
  } catch(err) {
    console.error(err, 'Filtering of container failed:');
  }
  console.log(filtered);
  let containerMap = {};
  try { 
    containerMap = eval('new Object({' + filtered + '})');
    console.dir(containerMap);
  } catch(err) {
    console.error(err);
  }
  return vscode.commands.executeCommand('vscode.executeDocumentSymbolProvider', container.uri)
    .then(symbols => 
      JSON.parse(JSON.stringify(symbols))
        .reduce((obj, s) => {
          obj[s.name] = s.location.range;
          return obj;
        }, 
        {})
    )
    .then(containerSymbolsMap => {
      const containerResolved = Object.keys(containerMap).reduce((ret, key) => {
        try {
          if(key in containerMap) {
            const name = containerMap[key];
            return { 
              ...ret,
              [key]: {
                name,
                pos: containerSymbolsMap[name][0],
              }
            };
          }
        } catch (errKey) {
          console.warn('ignored: ', key, {errKey});
        }
        return ret;
      }, {});
      // console.log(containerResolved);
      return containerResolved;
    });
  }
