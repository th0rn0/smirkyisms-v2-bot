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