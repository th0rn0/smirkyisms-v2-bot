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

const adapter = new FileSync('database/db.json')
const db = low(adapter)

db.defaults({ servers: [], count: 0 })
  .write()

// Settings
const voteTime = 10000;
const discordBotToken = process.env.DISCORD_TOKEN;
const apiToken = process.env.API_TOKEN;
const apiAddr = process.env.API_ADDR;

// Commands
const commandId = '.';
const commandQuote = commandId + 'smirketpin';
const commandGet = commandId + 'smirketget';
const commandRandom = commandId + 'smirketrandom';
const commandHelp = commandId + 'smirkethelp';

// Bot
client.login(discordBotToken);

client.on('ready', () => {
  console.info(`Logged in as ${client.user.tag}!`);
	client.user.setActivity('Eating Pizza Sandwiches');
});

client.on("guildCreate", guild => {
    console.log("Joined a new guild: " + guild.name);
 	
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

	if (db.get('servers').find({ id: guildId }).value()) {
		console.log("Guild Exists!");
    	channel.send('I already have a Entry for this Server. Please contact support!');
	}
	confirmServer(guild.id).then(function (response) {
		console.log("Guild Confirmed");
	 	channel.send('Thanks for inviting me into this server! Type ' + commandHelp + ' for help or visit https://smirkyisms.com.');
	}).catch( function (error) {
		console.log('Cannot find guild on API: ' + guild.name);
	    channel.send('Something went wrong, I can\'t authenticate this server! Error: ' + error);
	});
	
});

// Server Leave
client.on("guildDelete", guild => {
    console.log("Left a guild: " + guild.name);
    getServerToken(guild).then( async serverToken => {
    	leaveServer(guild.id, serverToken).catch( function (error) {
			console.log('Cannot find guild on API: ' + guild.name);
		});
	}).catch( function (error) {
		console.log('Cannot find guild on BOT: ' + guild.name);
	});
});

client.on('message', message => {
	if (message.author.bot) return;

	// Upload Item
	if (message.content.toLowerCase().startsWith(commandQuote)) {
		// Get all Messages
		const provokeMessage = message;
		getMessages(provokeMessage).then( async messages => {
			getServerToken(provokeMessage.guild).then( async serverToken => {
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
						    		uploadImage(
						    			url, 
						    			message, 
						    			provokeMessage,
						    			message.guild, 
						    			serverToken
					    			).then( response => {
			    						console.log(response);
									    var embed = new MessageEmbed()
											.setColor('#0099ff')
											.addField('Submitted By', message.author.username)
											// .addField('Go Check it out!', 'https://smirkyisms.com/sb/' + response.data.data.team_images + '/' + response.data.data.id)
											.setFooter('Smirkyisms')
											.setTimestamp();
										provokeMessage.channel.send(embed);
						    		}).catch( error => { 
						    			console.log('There has been a error');
										console.log(error);
										provokeMessage.channel.send('There was a error! ' + error);
						    		})
								});
							});
						});
					}
				})


				// Text
				// Send Text as one Quote. If they want separate they should send the IDs separately
				// Check if every message is from the same person
				messageCheck = true;
				if (messages[1].length == 0) {
					messageCheck = false;
				}
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
								}
								messages[1][0].channel.send('Vote was successful. Uploading to Smirkyisms.com...');
								uploadQuote(
									concatMessage,
									messages[1][0],
									provokeMessage,
									messages[1][0].guild,
									serverToken
								).then(response => {
								    var embed = new MessageEmbed()
										.setColor('#0099ff')
										.addField('Quote', concatMessage)
										.addField('Quote By', messages[1][0].author.username)
										.addField('Submitted By', provokeMessage.author.username)
										// .addField('Go Check it out!', 'https://smirkyisms.com/sb/' + response.data.data.team_images + '/quotes/' + response.data.data.id)
										.setFooter('Smirkyisms')
										.setTimestamp();
									provokeMessage.channel.send(embed);
								}).catch(error => {
									console.log('There has been a error');
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
		}).catch( function (error) {
			message.channel.send('A Message ID Not Recognized. Try Again!');
		});
	}

	// Get Random
	if (message.content.toLowerCase().startsWith(commandRandom)) {
		getServerToken(message.guild).then( serverToken => {
			getRandom(
				message,
				serverToken
			).then( item => {
				if (typeof item.image !== 'undefined') {
					var attachment = new MessageAttachment(new Buffer.from(item.image.data, 'base64'));
					var embed = "Courtesy of " + item.data.submitted_by;
					message.channel.send(embed, attachment);
				} else if (typeof item.quote !== 'undefined') {
					var embed = new MessageEmbed()
						.setColor('#0099ff')
						.addField('Quote', item.data.text)
						.addField('Quote By', item.data.quote_by)
						.addField('Submitted By', item.data.submitted_by)
						// .addField('Go Check it out!', 'https://smirkyisms.com/quotes/' + item.data.id)
						.setFooter('Smirkyisms')
						.setTimestamp();	
					message.channel.send(embed);
				}
			}).catch( function (error) {
				message.channel.send('Cannot get Random. ' + error);
			});
		}).catch( function (error) {
			message.channel.send('Cannot Authenticate Bot to Server. ' + error);
		});
	}

	// Get Help
	if (message.content.toLowerCase().startsWith(commandHelp)) {
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


// ------------------ FUNCTIONS ------------------ //

// Upload Items

async function uploadQuote(quote, quoteBy, submittedBy, guild, serverToken) {
	console.log('Upload Quote');
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
			token: serverToken,
		},
		{
			headers: {
				'bot-token': apiToken
			}
		}
    ).then(function (response) {
    	return response;
	});
}

async function uploadImage(url, imageBy, submittedBy, guild, serverToken) {
	console.log('Upload Image');
	var formData = new FormData();
    formData.append('image_by', imageBy.author.username);
    formData.append('image_by_id', imageBy.author.id);
    formData.append('submitted_by', submittedBy.author.username);
    formData.append('submitted_by_id', submittedBy.author.id);
    formData.append('channel_name', imageBy.channel.name);
    formData.append('channel_id', imageBy.channel.id);
    formData.append('guild_id', guild.id);
    formData.append('guild_name', guild.name);
    formData.append('token', serverToken);

    await formData.append('image', request(url));
    console.log(apiToken)
    const headers = Object.assign({'bot-token': apiToken}, formData.getHeaders());

	return axios.post(
		apiAddr + '/api/image', 
		formData,
		{
	      	headers: headers
    	}
    ).then(function (response) {
    	return response;
	});
}

// Get Items

function getRandom(message, serverToken) {
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

	let item = {};

    if (type == 0) {
		return axios.get(
			apiAddr + '/api/image/random',
			{
				headers: {
					'bot-token': apiToken,
					'server-token': serverToken,
				}
			}
		).then(async function (response) {
			item.image = await axios.get(
				apiAddr + '/api/image/' + response.data.id + '/file',
				{
					headers: {
						'bot-token': apiToken,
						'server-token': serverToken,
					}
				}
			)
			item.data = response.data;
			return item;
		})
	} else if (type == 1) {
		return axios.get(
			apiAddr + '/api/quote/random',
			{
				headers: {
					'bot-token': apiToken,
					'server-token': serverToken,
				}
			}
		).then(async function (response) {
			item.quote = response.data.text;
			item.data = response.data;
			return item;
		});
	}

}

// Server Functions

function confirmServer(guildId) {
	return axios.post(
		apiAddr + '/api/bot/con', 
		{
			guild_id: guildId
		},
		{
			headers: {
				'bot-token': apiToken
			}
		}
	).then(function (response) {
		db.get('servers')
			.push({ id: guildId, token: response.data.data['token'] })
			.write()
		db.update('count', n => n + 1)
	  		.write()
		return response;
	})
}

function leaveServer(guildId, token) {
    return axios.post(
		apiAddr + '/api/bot/lev', 
		{
			guild_id: guildId,
			token: token,
		},
		{
			headers: {
				'bot-token': apiToken
			}
		}
    ).then(function (response) {
    	return response;
	}).finally(function () {
		db.get('servers')
			.remove({ id: guildId, token: token })
			.write()
		db.update('count', n => n - 1)
	  		.write()
  	});
}

async function getServerToken(guild) {
	return db.get('servers')
	  .find({ id: guild.id })
	  .value().token
}

// Helpers

async function getMessages(message) {
	var messageIds = message.content.split(commandQuote + ' ')[1];
	var imageMessages = Array();
	var quoteMessages = Array();
	var messageArray = messageIds.split(' ');
	var arrayLength = messageArray.length;
	for (var i = 0; i < arrayLength; i++) {
		console.log('Getting Message');
		console.log(messageArray[i])
		// Check if the message has a File attached.
		await message.channel.messages.fetch(messageArray[i]).then( quoteMessage => {
			if (quoteMessage.attachments.size > 0) {
				imageMessages.push(quoteMessage);
			} else {
				quoteMessages.push(quoteMessage);
			}
		})
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
