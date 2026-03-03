const orchestrator = require("./orchestrator");

exports.handler = async function (event) {
  try {
    const data = JSON.parse(event.body);

    const result = await orchestrator.run(data);

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
