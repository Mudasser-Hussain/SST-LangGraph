import { Annotation, END, StateGraph } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import type { APIGatewayProxyHandler } from "aws-lambda";

export const handler: APIGatewayProxyHandler = async (event) => {
  let prompt = "";
  try {
    if (event.body) {
      const body =
        typeof event.body === "string" ? JSON.parse(event.body) : event.body;
      prompt = body.prompt || "";
    }
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid request body" }),
    };
  }
  if (!prompt) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing prompt" }),
    };
  }

  // Directly invoke the language model
  const llm = new ChatOpenAI({
    model: "gpt-4.1-nano",
    openAIApiKey: process.env.OPENAI_API_KEY,
  });
  const stateAnotation = Annotation.Root({
    data: Annotation<string>,
  });
  const graph = new StateGraph(stateAnotation)
    .addNode("node", async (state) => {
      const result = await llm.invoke(state.data);
      return { data: result.content };
    })
    .addEdge("__start__", "node")
    .addEdge("node", END)
    .compile();

  const result2 = await graph.invoke({ data: prompt });

  return {
    statusCode: 200,
    body: JSON.stringify({ response: result2 }),
  };
};
