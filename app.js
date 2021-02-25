// Dependencies
require('dotenv').config();
const { Client, MessageAttachment, MessageEmbed } = require('discord.js');
const client = new Client();
const axios = require('axios').default;
const request = require(`request`);
const fs = require(`fs`);
const FormData = require('form-data'); 
const { Base64 } = require('js-base64');

// Database

const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapter = new FileSync('db.json')
const db = low(adapter)

db.defaults({ servers: [], count: 0 })
  .write()

// Settings
const voteTime = 10000;
const botToken = process.env.DISCORD_TOKEN;
const apiAddr = process.env.API_ADDR;
const auth0ClientId = process.env.AUTH0_CLIENT_ID;
const auth0ClientSecret = process.env.AUTH0_CLIENT_SECRET;
const auth0Audience = process.env.AUTH0_AUDIENCE;
const auth0BotUserId = process.env.AUTH0_BOT_USER_ID; 

// Commands
const commandId = '.';
const commandQuote = commandId + 'smirketpin';
const commandGet = commandId + 'smirketget';
const commandRandom = commandId + 'smirketrandom';

// Bot
client.login(botToken);

client.on('ready', () => {
  console.info(`Logged in as ${client.user.tag}!`);
	client.user.setActivity('Eating Pizza Sandwiches');
});

// Server Join
client.on("guildCreate", guild => {
    console.log("Joined a new guild: " + guild.name);
    console.log("Generating Token");
    // var token = createToken(guild);
    createToken(guild).then( async token => {
	    //Your other stuff like adding to guildArray
		return axios.post(
			apiAddr + '/api/bot/con', 
			{
				guild_id: guild.id,
				token: token,
			}
	    ).then(function (response) {
	    	console.log("Server Confirmed");
	    	return response;
		}).catch(function (error) {
			console.log(error);
			throw new Error(error);
		});
	});
});

// Server Leave
client.on("guildDelete", guild => {
    console.log("Left a guild: " + guild.name);
    return axios.post(
		apiAddr + '/api/bot/lev', 
		{
			guild_id: guild.id
		}
    ).then(function (response) {
    	return response;
	}).catch(function (error) {
		console.log(error);
		throw new Error(error);
	})
});

client.on('message', message => {
	if (message.author.bot) return;

	// Quote / Image
	if (message.content.toLowerCase().startsWith(commandQuote)) {

		const provokeMessage = message;

		// Get all Messages
		getMessages(provokeMessage).then( async messages => {

			// Server Check
			getServerToken(provokeMessage.guild).then( async serverToken => {
				console.log('guild:' + provokeMessage.guild.id)
				console.log('token:' + serverToken.token)
				axios.post(
					apiAddr + '/api/bot/ack', 
					{
						guild_id: provokeMessage.guild.id,
						token: serverToken.token,
					}
			    ).then(function (response) {
			    	console.log("Server Acknowledged");

    				// Images
					// Send each Image individually
					messages[0].forEach( message => {
						var imageArray = new Array();
						var videoArray = new Array();
						// Only get Images & Videos
						if (message.attachments.size > 0) {
							message.attachments.forEach(function(attachment) {
								if (attachIsImage(attachment.url)) {
									imageArray.push(attachment.url);
								}
							});
						}
						if (message.attachments.size > 0 && imageArray.length > 0) {
							// Image
							imageArray.forEach(function(url) {
								var attachment = new MessageAttachment(url);
								var voteMessageText = '\n Fair Sik... Starting a 30 Second Vote... \n \n Vote Now!';
								message.channel.send(voteMessageText, attachment).then( voteMessage => {
									voteMessage.react('👍').then(() => voteMessage.react('👎'));
									const filter = (reaction, user) => {
										return ['👍', '👎'].includes(reaction.emoji.name);
									};

									const collector = voteMessage.createReactionCollector(filter, { max: 10, time: voteTime, errors: ['time'] });

									collector.on('collect', r => console.log(`Collected ${r.emoji.name}`));

									collector.on('end', collected => {
										console.log(`Collected ${collected} items`)
										let upvote = 0;
										let downvote = 0;
										collected.each(voteMessage => {
											switch (voteMessage._emoji.name) {
												case '👍':
													upvote = voteMessage.count;
													break;
												case '👎':
													downvote = voteMessage.count;
													break;
											}
										});
										if (upvote <= downvote) {
											message.channel.send('Vote was unsuccessful. Image something better!');
											return;
										}
										message.channel.send('Vote was successful. Uploading to Smirkyisms.com...');
							    		uploadImage(url, message.author.username, apiAddr).then( response => {
				    						console.log(response);
										    var embed = new MessageEmbed()
												.setColor('#0099ff')
												.addField('Submitted By', message.author.username)
												.addField('Go Check it out!', 'https://smirkyisms.com/images/' + response.data.id)
												.setFooter('Smirkyisms')
												.setTimestamp();
											provokeMessage.channel.send(embed);
							    		}).catch( error => {
											console.log(error);
											provokeMessage.channel.send('There was a error! ' + error);
							    		})
									});
								});
							});
						}

						provokeMessage.channel.send('Videos current not supported');
					})

					// Send Text as one Quote. If they want separate they should send the IDs separately
					// Check if every message is from the same person
					messageCheck = true;
					messages[1].forEach(message => {
						if (messages[1][0].author.username != message.author.username) {
							messages[1][0].channel.send('Messages not sent by the same person!');
							messageCheck = false;
							return;
						}
					});
					if (messageCheck) {
						concatMessages(messages[1]).then( async concatMessage => {
							var voteMessageText = '\n Fair Sik... Starting a 30 Second Vote... \n \n' + concatMessage + ' \n \n Vote Now!';
							messages[1][0].channel.send(voteMessageText).then( voteMessage => {
								voteMessage.react('👍').then(() => voteMessage.react('👎'));
								const filter = (reaction, user) => {
									return ['👍', '👎'].includes(reaction.emoji.name);
								};

								const collector = voteMessage.createReactionCollector(filter, { max: 10, time: voteTime, errors: ['time'] });

								collector.on('collect', r => console.log(`Collected ${r.emoji.name}`));

								collector.on('end', collected => {
									console.log(`Collected ${collected} items`)
									let upvote = 0;
									let downvote = 0;
									collected.each(voteMessage => {
										switch (voteMessage._emoji.name) {
											case '👍':
												upvote = voteMessage.count;
												break;
											case '👎':
												downvote = voteMessage.count;
												break;
										}
									});
									if (upvote <= downvote) {
										messages[1][0].channel.send('Vote was unsuccessful. Quote something better!');
										return;
									}
									messages[1][0].channel.send('Vote was successful. Uploading to Smirkyisms.com...');
									uploadQuote(
										concatMessage,
										messages[1][0].author.username,
										provokeMessage.author.username,
										messages[1][0].channel.name,
										serverToken.token,
										apiAddr
									).then(response => {
										console.log('response');
										console.log(response);
									    var embed = new MessageEmbed()
											.setColor('#0099ff')
											.addField('Quote', concatMessage)
											.addField('Quote By', messages[1][0].author.username)
											.addField('Submitted By', provokeMessage.author.username)
											.addField('Go Check it out!', 'https://smirkyisms.com/quotes/' + response.data.id)
											.setFooter('Smirkyisms')
											.setTimestamp();
										provokeMessage.channel.send(embed);
									}).catch(error => {
										console.log(error);
										provokeMessage.channel.send('There was a error! ' + error);
									});

								});
							});
						});
					}
				}).catch(function (error) {
					throw new Error(error);
				});
			}).catch(function (error) {
				throw new Error(error);
			});
		}).catch( error => {
			console.log(error)
			message.channel.send('A Message ID Not Recognized. Try Again!');
		});
	}

	// Get Random
	if (message.content.toLowerCase().startsWith(commandRandom)) {
		getRandom(message, apiAddr);
	}

	if (message.content.toLowerCase().startsWith('.help')) {
	    var embed = new MessageEmbed()
			.setColor('#0099ff')
			.setTitle('Heyup ' + message.author.username + '!')
			.setDescription('Here are the commands I know')
			.addField(commandQuote + ' <message id here>', 'This will initiate a vote to quote something and upload to Smirkyisms. Multiple IDs will attempt to concat the messages if they are from the same person.')
			.addField(commandRandom, 'Get random Quote, Image or Video from Smirkyisms.')
			.addField('\u200B', '\u200B')
			.addField('How do I get the Message ID?', 'First you must enable developer mode on Discord and then you can right click a message and click "Copy ID". EZ PZ')
			.setFooter('Smirkyisms - Created by Th0rn0.')
		message.channel.send(embed);
	}

	return;
});

async function getServerToken(guild) {
	return db.get('servers')
	  .find({ id: guild.id })
	  .value()
}

async function createToken(guild) {
	var token = Base64.encode(randomString(5) + guild.id);
	db.get('servers')
		.push({ id: guild.id, token: token })
		.write()
	db.update('count', n => n + 1)
  		.write()
	return token;
}

async function randomString(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}

async function getMessages(message) {
	var messageIds = message.content.split(commandQuote + ' ')[1];
	var imageMessages = Array();
	var quoteMessages = Array();
	var messageArray = messageIds.split(' ');
	var arrayLength = messageArray.length;
	for (var i = 0; i < arrayLength; i++) {
		console.log(messageArray[i])
		// Check if the message has a File attached.
		await message.channel.messages.fetch(messageArray[i]).then( quoteMessage => {
			if (quoteMessage.attachments.size > 0) {
				imageMessages.push(quoteMessage);
			} else {
				quoteMessages.push(quoteMessage);
			}
		}).catch(function (error) {
			console.log(error);
			throw new Error('A Message ID Not Recognized');
		});
	}
	return [imageMessages, quoteMessages];
}

async function concatMessages(messages) {
	var arrayLength = messages.length;
	var concatStr = new Array();
	for (var i = 0; i < arrayLength; i++) {
		concatStr.push(messages[i].content);
	}
	return concatStr.join(',\n');
}

async function uploadQuote(quote, quoteBy, submittedBy, channelName, token, apiAddr) {
	console.log('message');
	return axios.post(
		'http://localhost:8000/' + 'api/quote', 
		{
			text: quote,
			quote_by: quoteBy,
			submitted_by: submittedBy,
			channel_name: channelName,
			token: token,
		}
    ).then(function (response) {
    	return response;
	}).catch(function (error) {
		console.log(error);
		throw new Error(error);
	})
}

async function uploadImage(url, submittedBy, apiAddr) {
	return axios.post('https://smirkyisms.eu.auth0.com/oauth/token',
		{
			client_id: auth0ClientId,
			client_secret: auth0ClientSecret,
			audience: auth0Audience,
			grant_type: "client_credentials"
		}
	).then(async function (auth) {
		var formData = new FormData();
        formData.append('type', 'discord');
        formData.append('submitted_by', 'auth0BotUserId');
		formData.append('discord_submitted_by', submittedBy);
        await formData.append('image', request(url));


        const headers = Object.assign({
		    'Authorization': `Bearer ${auth.data.access_token}`,
		}, formData.getHeaders());

		return axios.post(
			apiAddr + '/image', 
			formData,
			{
		      	headers: headers
	    	}
	    ).then(function (response) {
	    	return response;
		}).catch(function (error) {
			console.log(error);
			throw new Error(error);
		})
	});
}

async function uploadVideo(url, submittedBy, apiAddr) {
	return axios.post('https://smirkyisms.eu.auth0.com/oauth/token',
		{
			client_id: auth0ClientId,
			client_secret: auth0ClientSecret,
			audience: auth0Audience,
			grant_type: "client_credentials"
		}
	).then(async function (auth) {
		var formData = new FormData();
        formData.append('type', 'discord');
        formData.append('submitted_by', 'auth0BotUserId');
		formData.append('discord_submitted_by', submittedBy);
        await formData.append('video', request(url));


        const headers = Object.assign({
		    'Authorization': `Bearer ${auth.data.access_token}`,
		}, formData.getHeaders());

		return axios.post(
			apiAddr + '/video', 
			formData,
			{
		      	headers: headers
	    	}
	    ).then(function (response) {
	    	return response;
		}).catch(function (error) {
			console.log(error);
			throw new Error(error);
		})
	});
}

function attachIsImage(url) {
    return(url.match(/\.(jpeg|jpg|gif|png)$/) != null);
}

function attachIsVideo(url) {
    return(url.match(/\.(mp4|m4v|avi|mpg)$/) != null);
}

async function getRandom(message, apiAddr) {
	var attachment = null;

	var type;

	if (message.content.toLowerCase().indexOf('video') != -1) {
		type = 0;
	}

	if (message.content.toLowerCase().indexOf('image') != -1) {
		type = 1;
	}

	if (message.content.toLowerCase().indexOf('quote') != -1) {
		type = 2;
	}

	if (type == null) {
		type = Math.floor(Math.random() * 3);
	}
	
    if (type == 1) {
		axios.get(apiAddr + '/image/random')
		.then(function (response) {
			axios.get(apiAddr + '/image/' + response.data.id + '/file')
			.then(function (fileRes) {
				console.log(fileRes.data);
				console.log(response.data);
				var attachment = new MessageAttachment(new Buffer.from(fileRes.data, 'base64'));
				if (response.data.type == 'site') {
					var embed = "Courtesy of " + response.data.submitted_by;
				} else if (response.data.type == 'discord') {
					var embed = "Courtesy of " + response.data.discord_submitted_by;
				} else {
					var embed = new MessageEmbed()
						.setColor('#0099ff')
						.addField('Quote', "Type not supported. Bug Th0rn0")
						.setFooter('Smirkyisms')
						.setTimestamp();	
				}
				message.channel.send(embed, attachment);
			}).catch(function (error) {
				message.channel.send('Sorry there was a error. Try again. ' + error);
			});
		});
	} else if (type == 2) {
		axios.get(apiAddr + '/quote/random')
		.then(function (response) {
			console.log(response);
			if (response.data.type == 'site') {
				var embed = new MessageEmbed()
					.setColor('#0099ff')
					.addField('Quote', response.data.text)
					.addField('Quote By', response.data.quote_by)
					.addField('Submitted By', response.data.submitted_by)
					.addField('Go Check it out!', 'https://smirkyisms.com/quotes/' + response.data.id)
					.setFooter('Smirkyisms')
					.setTimestamp();
			} else if (response.data.type == 'discord') {
				var embed = new MessageEmbed()
					.setColor('#0099ff')
					.addField('Quote', response.data.text)
					.addField('Quote By', response.data.quote_by)
					.addField('Submitted By', response.data.discord_submitted_by)
					.addField('Go Check it out!', 'https://smirkyisms.com/quotes/' + response.data.id)
					.setFooter('Smirkyisms')
					.setTimestamp();	
			} else {
				var embed = new MessageEmbed()
					.setColor('#0099ff')
					.addField('Quote', "Type not supported. Bug Th0rn0")
					.setFooter('Smirkyisms')
					.setTimestamp();	
			}
			message.channel.send(embed);
		}).catch(function (error) {
			message.channel.send('Sorry there was a error. Try again. ' + error);
		});
	} else if (type == 0) {
		axios.get(apiAddr + '/video/random')
		.then(function (response) {
			axios.get(apiAddr + '/video/' + response.data.id + '/file')
			.then(function (fileRes) {
				console.log(response);
				if (response.data.type == 'site') {
					var embed = new MessageEmbed()
						.setColor('#0099ff')
						.addField('Submitted By', response.data.submitted_by)
						.addField('Go Check it out!', 'https://smirkyisms.com/videos/' + response.data.id)
						.setFooter('Smirkyisms')
						.setTimestamp();
				} else if (response.data.type == 'discord') {
					var embed = new MessageEmbed()
						.setColor('#0099ff')
						.addField('Submitted By', response.data.discord_submitted_by)
						.addField('Go Check it out!', 'https://smirkyisms.com/videos/' + response.data.id)
						.setFooter('Smirkyisms')
						.setTimestamp();	
				} else {
					var embed = new MessageEmbed()
						.setColor('#0099ff')
						.addField('Video', "Type not supported. Bug Th0rn0")
						.setFooter('Smirkyisms')
						.setTimestamp();	
				}
				message.channel.send(embed);
			}).catch(function (error) {
				message.channel.send('Sorry there was a error. Try again. ' + error);
			});
		});
	}
}
