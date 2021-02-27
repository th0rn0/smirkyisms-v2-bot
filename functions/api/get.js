async function getRandom(message, apiAddr) {
	var attachment = null;

	var type;

	if (message.content.toLowerCase().indexOf('image') != -1) {
		type = 0;
	}

	if (message.content.toLowerCase().indexOf('quote') != -1) {
		type = 1;
	}

	if (type == null) {
		type = Math.floor(Math.random() * 2);
	}
	
    if (type == 0) {
		axios.get('http://localhost:8000/api/image/random')
		.then(function (response) {
			console.log(response.data.id);
			axios.get(apiAddr + '/api/image/' + response.data.id + '/file')
			// axios.get(apiAddr + '/api/image/file')
			.then(function (fileRes) {
				console.log(fileRes.data);
				console.log(response.data);
				var attachment = new MessageAttachment(new Buffer.from(fileRes.data, 'base64'));
				var embed = "Courtesy of " + response.data.submitted_by;
				message.channel.send(embed, attachment);
			}).catch(function (error) {
				message.channel.send('Sorry there was a error. Try again. ' + error);
			});
		});
	} else if (type == 1) {
		axios.get('http://localhost:8000/api/quote/random')
		.then(function (response) {
			console.log(response);
			var embed = new MessageEmbed()
				.setColor('#0099ff')
				.addField('Quote', response.data.text)
				.addField('Quote By', response.data.quote_by)
				.addField('Submitted By', response.data.submitted_by)
				.addField('Go Check it out!', 'https://smirkyisms.com/quotes/' + response.data.id)
				.setFooter('Smirkyisms')
				.setTimestamp();	
			message.channel.send(embed);
		}).catch(function (error) {
			message.channel.send('Sorry there was a error. Try again. ' + error);
		});
	}
}
