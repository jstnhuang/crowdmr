var sum = 0;
for (var i in values) {
  sum += parseInt(values[i]);
}
return ["" + sum];
