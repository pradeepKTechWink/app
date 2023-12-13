const { PineconeStore } = require("langchain/vectorstores/pinecone");
const { Pinecone } = require("@pinecone-database/pinecone");
const { VectorDBQAChain } = require("langchain/chains");
const { OpenAIEmbeddings } = require("langchain/embeddings/openai");
const { OpenAI } = require("langchain/llms/openai");
const dotenv = require('dotenv');
dotenv.config();

exports.initVectoreStore = async (namespace) => {
    const client = new Pinecone();
    // await client.init({
    //     apiKey: process.env.PINECONE_API_KEY,
    //     environment: process.env.PINECONE_ENVIRONMENT,
    // });
    const pineconeIndex = client.Index(process.env.PINECONE_INDEX);

    const vectorStore = await PineconeStore.fromExistingIndex(
        new OpenAIEmbeddings(),
        { pineconeIndex, namespace }
    );

    return vectorStore
}