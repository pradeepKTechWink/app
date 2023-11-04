const { PineconeClient } = require("@pinecone-database/pinecone");

 exports.init_pinecone_index = async () => {
    const client = new PineconeClient();

    await client.init({
        apiKey: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT,
    });

    return init_client
}



