const { OpenAIEmbeddings } = require("langchain/embeddings/openai");

exports.embeddings = new OpenAIEmbeddings({
    modelName: 'text-embedding-ada-002'
});