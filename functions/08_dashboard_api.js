exports.handler = async function (event) {

  try {
    const data = JSON.parse(event.body);

    return {
      statusCode: 200,
      body: JSON.stringify({
        receivedToken: data.tokenName,
        receivedWebsite: data.website,
        status: "Input received successfully"
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
