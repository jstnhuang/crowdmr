var results = [];
var allWords = [];
for (var i=0; i<lines.length; i++) {  
  if (i % 10000 === 0) {
    console.log(i);
  }
  var line = lines[i];
  var words = line.split(/\s+/);
  for (var j=0; j<words.length; j++) {
    var word = words[j];
    if (word === '') {
      continue;
    }
    allWords.push(word);
  }
}
allWords.sort();
var prevWord = allWords[0];
var count = 1;
for (var i=1; i<allWords.length; i++) {
  var word = allWords[i];
  if (word !== prevWord) {
    results.push([prevWord, count].join('\t'));
    prevWord = word;
    count = 1;
  } else {
    count++;
  }
}
return results;
