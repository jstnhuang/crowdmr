var result = [];
for (var i in lines) {  
  if (i % 10000 === 0) {
    console.log(i);
  }
  var line = lines[i];
  var words = line.split(/\s+/);
  for (var j in words) {
    var word = words[j];
    if (word === '') {
      continue;
    }
    result.push([word, '1'].join('\t')); 
  }
}
return result;
