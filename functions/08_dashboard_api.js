exports.handler = async function (event, context) {
  try {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Dashboard API working"
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
