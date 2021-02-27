async function uploadQuote(quote, quoteBy, submittedBy, channelName, serverToken, apiAddr) {
	console.log('message');
	return axios.post(
		apiAddr + '/api/quote', 
		{
			text: quote,
			quote_by: quoteBy,
			submitted_by: submittedBy,
			channel_name: channelName,
			token: serverToken.token,
			guild_id: serverToken.id,
		}
    ).then(function (response) {
    	return response;
	}).catch(function (error) {
		console.log(error);
		throw new Error(error);
	})
}

async function uploadImage(url, imageBy, submittedBy, channelName, serverToken, apiAddr) {
	var formData = new FormData();
    formData.append('image_by', imageBy);
    formData.append('submitted_by', submittedBy);
    formData.append('channel_name', channelName);
    formData.append('token', serverToken.token);
    formData.append('guild_id', serverToken.id);

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