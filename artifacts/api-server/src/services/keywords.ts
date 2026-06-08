const STOPWORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by",
  "from","is","it","this","that","was","are","be","been","have","has","had",
  "do","does","did","will","would","could","should","may","might","shall",
  "not","no","nor","so","yet","both","either","neither","each","few","more",
  "most","other","some","such","than","then","too","very","just","also","i",
  "me","my","we","our","you","your","he","his","she","her","they","them",
  "its","what","which","who","when","where","why","how","all","any","can",
  "up","out","if","about","into","through","during","before","after","above",
  "below","between","into","without","within","again","further","here","there",
  "once","only","own","same","s","t","re","ve","ll","d","m","didn","doesn",
  "don","isn","aren","wasn","weren","hasn","haven","hadn","won","wouldn",
  "get","got","like","know","think","make","go","see","come","want","really",
  "im","ive","id","its","thats","dont","doesnt","cant","wont","cant","ur",
  "lol","omg","wow","oh","ok","okay","yeah","yes","no","hi","hey","bro",
]);

export function extractKeywords(
  comments: string[],
  topN = 15
): { word: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const text of comments) {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s']/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

    for (const word of words) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
}
