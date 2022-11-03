var cron = require('node-cron'), fs = require('fs'), Twitter = require('twitter');
var client = new Twitter({
	  consumer_key: 'tAiS66MymaTxuj6tpVcOz7E6J',
	  consumer_secret: '6SlApUYMO1MRZYl0bQnBhhR96E36SZDGRABhBNQKlAqC8SBQFQ',
	  access_token_key: '1262310627868962816-7al1l4n4BRHvb6s5kT9zljwq5PDhgj',
	  access_token_secret: '4JSqa89qFzD9nAqvxLHVyrXgDW6yd6PblFgYRv4a9Ag1E'
});


function tweet() {
	var charLength = 140, wordLength = charLength/5, maxSequenceLength = 14, minSequenceLength = 1, sentenceWordLength = 0, sequenceStart=1, sequenceLength=0, sequence = false, sentence = "", wordKey = 0, previousWordKey = 0;

	fs.readFile('weird.txt',
	    function(err, data) {
	        if (err) throw err;

	        var text = data.toString('utf8');

	        var noPunct = text.replace(/(~|`|!|@|#|$|%|^|&|\*|\(|\)|{|}|\[|\]|;|:|\"|'|<|,|\.|>|\?|\/|\\|\||-|_|\+|=)/g,"");
	        var lowerCase = noPunct.toUpperCase();
	        words = lowerCase.split(/\s+/);

	        charLength = Math.floor((Math.random() * charLength) + 5);

	        function nextWord() {
	            newSentence = false;
	            previousWordKey = wordKey;
	            previousSentence = sentence;

	            if (sentenceWordLength > sequenceStart+sequenceLength) sequence = false;

	            if (sequence == true &&
	                wordKey < words.length-1) wordKey++;
	            else {
	                wordKey = Math.floor((Math.random() * words.length-1) + 1);
	                sequenceStart = sentenceWordLength;
	                sequenceLength = Math.floor((Math.random() * maxSequenceLength) + minSequenceLength);
	                sequence = true;
	            	newSentence = true;
	            }

	            word = words[wordKey];

	            if (newSentence) sentence += "... ";

	            sentence += word+" ";

	            sentenceWordLength = sentence.split(/\s+/).length;

	            if (sentence.length > charLength) {

					client.post('statuses/update', {status: previousSentence},  function(error, tweet, response) {
						if(error) console.log(error);
						console.log(tweet);
						// console.log(response);
					});

				}
	            else nextWord();
	        }
	        nextWord();
	});
}

// 0 13,1 * * *
// everyday at 6am and 6pm PST
cron.schedule('0 13,1 * * *', () => {
	tweet();
  // console.log('running a task every minute');
});
