function confirmServer(guildId, token) {
	return axios.post(
		apiAddr + '/api/bot/con', 
		{
			guild_id: guildId,
			token: token,
		}
	).then(function (response) {
		console.log("Server Confirmed");
		// TODO - Message server saying hello
		return response;
	}).catch(function (error) {
		console.log("Server Not Confirmed");
		console.log(error);
		throw new Error(error);
	});
}