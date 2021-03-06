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

// Functions

require('./functions/api/confirm.js');
require('./functions/api/leave.js');
require('./functions/api/upload.js');
require('./functions/api/get.js');

// Bot
client.login(botToken);

client.on('ready', () => {
  console.info(`Logged in as ${client.user.tag}!`);
	client.user.setActivity('Eating Pizza Sandwiches');
});

// Server Join

async function uploadQuote(quote, quoteBy, submittedBy, guild, serverToken, apiAddr) {
	console.log('Upload Message');
	return axios.post(
		apiAddr + '/api/quote', 
		{
			text: quote,
			quote_by: quoteBy.author.username,
			quote_by_id: quoteBy.author.id,
			submitted_by: submittedBy.author.username,
			submitted_by_id: submittedBy.author.id,
			channel_name: quoteBy.channel.name,
			channel_id: quoteBy.channel.id,
			guild_id: guild.id,
			guild_name: guild.name,
			token: serverToken.token,
		}
    ).then(function (response) {
    	return response;
	}).catch(function (error) {
		console.log(error);
		throw new Error(error);
	})
}

async function uploadImage(url, imageBy, submittedBy, guild, serverToken, apiAddr) {
	var formData = new FormData();
    formData.append('image_by', imageBy.author.username);
    formData.append('image_by_id', imageBy.author.id);
    formData.append('submitted_by', submittedBy.author.username);
    formData.append('submitted_by_id', submittedBy.author.id);
    formData.append('channel_name', imageBy.channel.name);
    formData.append('channel_id', imageBy.channel.id);
    formData.append('guild_id', guild.id);
    formData.append('guild_name', guild.name);
    formData.append('token', serverToken.token);

    await formData.append('image', request(url));

    const headers = Object.assign({}, formData.getHeaders());

	return axios.post(
		apiAddr + '/api/image', 
		formData,
		{
	      	headers: headers
    	}
    ).then(function (response) {
    	return response;
	}).catch(function (error) {
		console.log(error);
		throw new Error(error);
	});
}

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
			axios.get(apiAddr + '/api/image/' + response.data.data.id + '/file')
			// axios.get(apiAddr + '/api/image/file')
			.then(function (fileRes) {
				// DEBUG
				console.log(fileRes.data);
				console.log(response.data);
				var attachment = new MessageAttachment(new Buffer.from(fileRes.data, 'base64'));
				var embed = "Courtesy of " + response.data.data.submitted_by;
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
				.addField('Quote', response.data.data.text)
				.addField('Quote By', response.data.data.quote_by)
				.addField('Submitted By', response.data.data.submitted_by)
				.addField('Go Check it out!', 'https://smirkyisms.com/quotes/' + response.data.data.id)
				.setFooter('Smirkyisms')
				.setTimestamp();	
			message.channel.send(embed);
		}).catch(function (error) {
			message.channel.send('Sorry there was a error. Try again. ' + error);
		});
	}
}


// Confirm Server Join
function confirmServer(guildId) {
	return axios.post(
		apiAddr + '/api/bot/con', 
		{
			guild_id: guildId
		}
	).then(function (response) {
		console.log("Server Confirmed");
		// TODO - Message server saying hello
		db.get('servers')
			.push({ id: guildId, token: response.data.data['token'] })
			.write()
		db.update('count', n => n + 1)
	  		.write()
		return response;
	}).catch(function (error) {
		console.log("Server Not Confirmed");
		console.log(error);
		throw new Error(error);
	});
}

function leaveServer(guildId, token) {
    return axios.post(
		apiAddr + '/api/bot/lev', 
		{
			guild_id: guildId,
			token: token,
		}
    ).then(function (response) {
    	db.get('servers')
			.remove({ id: guildId, token: token })
			.write()
		db.update('count', n => n - 1)
	  		.write()
    	return response;
	}).catch(function (error) {
		console.log(error);
	})
}

client.on("guildCreate", guild => {
    console.log("Joined a new guild: " + guild.name);
    console.log("Checking for Token");
 	
 	let channelID;
    let channels = guild.channels.cache;

    channelLoop:
    for (let key in channels) {
        let c = channels[key];
        if (c[1].type === "text") {
            channelID = c[0];
            break channelLoop;
        }
    }

    let channel = guild.channels.cache.get(guild.systemChannelID || channelID);


	confirmServer(guild.id).then( response => {
	    channel.send('Thanks for inviting me into this server! SOME USEFUL COMMANDS');
	}).catch(function (error) {
		console.log(error);
	    channel.send('Something went wrong, I can\'t authenticate this server! Error: ' + error);
	});
});

// Server Leave
client.on("guildDelete", guild => {
    console.log("Left a guild: " + guild.name);
    getServerToken(guild).then( async serverToken => {
    	leaveServer(guild.id, serverToken.token)
	});
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
			    ).then( async response => {
			    	console.log("Server Acknowledged");

    				// Images
					// Send each Image individually
					messages[0].forEach( message => {
						var imageArray = new Array();
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
								console.log('we in here');
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
							    		uploadImage(
							    			url, 
							    			message, 
							    			provokeMessage,
							    			message.guild, 
							    			serverToken, 
							    			apiAddr
						    			).then( response => {
				    						console.log(response);
										    var embed = new MessageEmbed()
												.setColor('#0099ff')
												.addField('Submitted By', message.author.username)
												.addField('Go Check it out!', 'https://smirkyisms.com/sb/' + response.data.data.team_images/' + response.data.data.id)
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
					})

					// Send Text as one Quote. If they want separate they should send the IDs separately
					// Check if every message is from the same person
					console.log('asdasd');
					console.log(messages);
					messageCheck = true;
					if (messages[1].length == 0) {
						messageCheck = false;
					}
					// TEXT IS ON [1]. IMAGES IS ON [0]
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
							console.log(messages);
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
										messages[1][0],
										provokeMessage,
										messages[1][0].guild,
										serverToken,
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
										return true;
									}).catch(error => {
										console.log(error);
										provokeMessage.channel.send('There was a error! ' + error);
									});

								});
							});
						});
					}
				}).catch(function (error) {
					provokeMessage.channel.send('Cannot Authenticate Bot to Server. ' + error);
				});
			}).catch(function (error) {
				provokeMessage.channel.send('Cannot Authenticate Bot to Server. ' + error);
				// throw new Error(error);
			});
		}).catch( function (error) {
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

// async function createServerToken(guild) {
// 	var token = Base64.encode(randomString(5) + guild.id);
// 	db.get('servers')
// 		.push({ id: guild.id, token: token })
// 		.write()
// 	db.update('count', n => n + 1)
//   		.write()
// 	return token;
// }

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

function attachIsImage(url) {
    return(url.match(/\.(jpeg|jpg|gif|png)$/) != null);
}
