from flask import Flask, jsonify
from flask_cors import CORS
import os
import asyncio
from dotenv import load_dotenv

from flask import request
from typing import List, Tuple, Optional
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_qdrant import QdrantVectorStore
from openai import OpenAI
from pydantic import BaseModel

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")


def ensure_event_loop() -> None:
    """Ensure there is an asyncio event loop bound to the current thread."""
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)


def ensure_google_api_key(api_key: Optional[str]) -> None:
    """Ensure GOOGLE_API_KEY is set. Accepts request apiKey or uses env vars.
    Priority: apiKey param > GOOGLE_API_KEY env > GEMINI_API_KEY env.
    """
    if api_key:
        os.environ["GOOGLE_API_KEY"] = api_key
        return
    if os.getenv("GOOGLE_API_KEY"):
        return
    gemini = os.getenv("GEMINI_API_KEY")
    if gemini:
        os.environ["GOOGLE_API_KEY"] = gemini
        return
    raise ValueError(
        "Missing Google API key. Provide 'apiKey' or set GOOGLE_API_KEY or GEMINI_API_KEY."
    )


def load_pdf_documents(pdf_paths: List[str]) -> Tuple[list, list]:
    """Load PDF documents from provided paths.
    Returns (docs, missing_paths).
    """
    docs = []
    missing = []
    for path in pdf_paths:
        if not isinstance(path, str) or not path.strip():
            continue
        if not os.path.exists(path):
            missing.append(path)
            continue
        loader = PyPDFLoader(path)
        docs.extend(loader.load())
    return docs, missing


def split_documents(
    docs: list, chunk_size: int = 1000, chunk_overlap: int = 200
) -> list:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size, chunk_overlap=chunk_overlap
    )
    return splitter.split_documents(docs)


def build_embeddings():
    return GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")


def create_or_update_vector_store(
    chunks: list, embeddings, collection_name: str
) -> tuple:
    """Creates a new Qdrant collection or updates an existing one with document chunks.
    Returns a tuple of (number of chunks upserted, vector store instance).
    """
    if not chunks:
        return 0, None

    # Prefer updating an existing collection; if missing, create a new one with docs
    try:
        vector_store = QdrantVectorStore.from_existing_collection(
            embedding=embeddings,
            collection_name=collection_name,
            url=QDRANT_URL,
        )
        vector_store.add_documents(documents=chunks)
    except Exception:
        vector_store = QdrantVectorStore.from_documents(
            documents=chunks,
            embedding=embeddings,
            url=QDRANT_URL,
            collection_name=collection_name,
        )
    return len(chunks), vector_store


# Routes
@app.route("/")
def home():
    return jsonify({"message": "Flask Backend Server is running!"})


# Ensure an event loop for every request
@app.before_request
def _setup_event_loop():
    ensure_event_loop()


@app.route("/api/embeddings", methods=["POST"])
def embeddings():

    data = request.get_json(silent=True) or {}
    pdf_paths = data.get("pdfPaths") or []
    thread_id = data.get("threadId")
    api_key = data.get("apiKey")

    # Validate input
    if not isinstance(pdf_paths, list) or not pdf_paths:
        return (
            jsonify({"message": "'pdfPaths' must be a non-empty list of file paths"}),
            400,
        )

    # Validate thread_id
    if not isinstance(thread_id, str) or not thread_id.strip():
        return (
            jsonify(
                {"message": "'threadId' is required and must be a non-empty string"}
            ),
            400,
        )
    collection_name = thread_id.strip().replace(" ", "_")

    # Ensure API key present
    try:
        ensure_google_api_key(api_key)
    except ValueError as e:
        return jsonify({"message": str(e)}), 400

    # Load documents
    docs, missing = load_pdf_documents(pdf_paths)
    if missing:
        return (
            jsonify({"message": "Some files were not found", "missingPaths": missing}),
            400,
        )
    if not docs:
        return jsonify({"message": "No documents to process"}), 400

    # Chunking
    chunks = split_documents(docs)

    # Embeddings and upsert into Qdrant
    try:
        emb = build_embeddings()
        upserted_count, vector_store = create_or_update_vector_store(
            chunks, emb, collection_name
        )
        if not vector_store:
            return jsonify({"message": "Failed to create vector store"}), 500
        if upserted_count == 0:
            return jsonify({"message": "No chunks were embedded"}), 400
    except Exception as e:
        app.logger.error(f"Vector store error: {str(e)}")
        return jsonify({"message": "Failed to store embeddings", "detail": str(e)}), 500

    return (
        jsonify(
            {
                "message": "Embeddings generated and stored",
                "threadId": thread_id,
                "documents": len(docs),
                "chunks": upserted_count,
                "vectorCollection": collection_name,
            }
        ),
        200,
    )


class Question(BaseModel):
    content: str


class Questions(BaseModel):
    allQuestions: list[Question]


def query_to_llm(model, messages, api_key):

    client = OpenAI(
        api_key=api_key,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    )

    response = client.beta.chat.completions.parse(
        model="gemini-2.0-flash", messages=messages, response_format=model
    )

    return response.choices[0].message.parsed


def process_chat_history(history):
    """
    Convert chat history into a list of message dictionaries.
    """
    messages = []
    if not isinstance(history, list):
        return messages

    for item in history:
        try:
            if not isinstance(item, dict):
                continue

            # Process question if exists
            if "question" in item and item["question"] is not None:
                messages.append({"role": "user", "content": str(item["question"])})

            # Process answer if exists
            if "answer" in item and item["answer"] is not None:
                messages.append({"role": "assistant", "content": str(item["answer"])})
        except (TypeError, ValueError) as e:
            app.logger.warning(f"Skipping invalid chat item: {item}, error: {e}")
            continue

    return messages


@app.route("/api/queryTransform", methods=["POST"])
def queryTransform():
    data = request.get_json(silent=True) or {}
    query = data.get("query")
    historyArray = data.get("historyArray")
    api_key = data.get("apiKey")

    # Validate inputs
    if not isinstance(query, str) or not query.strip():
        return (
            jsonify({"message": "'query' is required and must be a non-empty string"}),
            400,
        )
    if not isinstance(api_key, str) or not api_key.strip():
        return (
            jsonify({"message": "'apiKey' is required and must be a non-empty string"}),
            400,
        )
    if not isinstance(historyArray, list):
        return (
            jsonify({"message": "'historyArray' must be a list"}),
            400,
        )

    try:
        ensure_google_api_key(api_key)
    except ValueError as e:
        return jsonify({"message": str(e)}), 400

    query_transform_prompt = """
    You are a helpful AI assistant who is specialized in resolving complex queries and thinks before respond to any queries 
    your job is to take the user query and chat History to generate {n} questions which are similar to the user query as shown in the example
    
    Example: 
    User Query : What is fs module in node js? 
    Output: {format}
    """

    example_format = {
        "allQuestions": [
            {"content": "How does node js works under the hood? "},
            {"content": "What is fs module? "},
            {"content": "What is module in js? "},
        ]
    }

    # Process chat history
    messages = process_chat_history(historyArray)

    # System Prompt
    messages.append(
        {
            "role": "system",
            "content": query_transform_prompt.format(n=5, format=example_format),
        }
    )
    # User Query
    messages.append({"role": "user", "content": query})

    try:
        # Get response from LLM
        response = query_to_llm(Questions, messages, api_key)

        # Transform response to the desired format
        questions = [{"content": q.content} for q in response.allQuestions]

        return jsonify({"questions": questions}), 200

    except Exception as e:
        app.logger.error(f"Error in query transformation: {str(e)}")
        return (
            jsonify(
                {"error": "Failed to process query transformation", "detail": str(e)}
            ),
            500,
        )


@app.route("/api/similaritySearch", methods=["POST"])
def similaritySearch():
    data = request.get_json(silent=True) or {}
    query = data.get("query")
    thread_id = data.get("threadId")
    api_key = data.get("apiKey")
    top_k = data.get("topK", 5)

    # Validate inputs
    if not isinstance(query, str) or not query.strip():
        return (
            jsonify({"message": "'query' is required and must be a non-empty string"}),
            400,
        )
    if not isinstance(thread_id, str) or not thread_id.strip():
        return (
            jsonify(
                {"message": "'threadId' is required and must be a non-empty string"}
            ),
            400,
        )

    collection_name = thread_id.strip().replace(" ", "_")

    # Ensure embeddings API key
    try:
        ensure_google_api_key(api_key)
    except ValueError as e:
        return jsonify({"message": str(e)}), 400

    # Build embeddings instance (same model as embeddings route)
    emb = build_embeddings()

    # Open existing Qdrant collection for this thread
    try:
        vector_store = QdrantVectorStore.from_existing_collection(
            embedding=emb,
            collection_name=collection_name,
            url=QDRANT_URL,
        )
    except Exception as e:
        app.logger.error(f"Vector collection not found for {collection_name}: {str(e)}")
        return (
            jsonify(
                {
                    "message": "Vector collection not found for threadId",
                    "vectorCollection": collection_name,
                }
            ),
            404,
        )

    # Perform similarity search
    try:
        results = vector_store.similarity_search(query=query, k=int(top_k))
    except Exception as e:
        app.logger.error(f"Similarity search error: {str(e)}")
        return jsonify({"message": "Similarity search failed", "detail": str(e)}), 500

    # Serialize results to simple {text, metadata} objects
    chunks = []
    for doc in results:
        chunks.append(
            {
                "text": getattr(doc, "page_content", ""),
                "metadata": getattr(doc, "metadata", {}) or {},
            }
        )

    return (
        jsonify(
            {
                "threadId": thread_id,
                "vectorCollection": collection_name,
                "chunks": chunks,
            }
        ),
        200,
    )


# Build context string from chunks
def extract_chunk_text(chunk):
    try:
        if isinstance(chunk, dict):
            return chunk.get("text", "")
        return str(chunk)
    except Exception:
        return ""


@app.route("/api/llmGenerate", methods=["POST"])
def llmGenerate():
    data = request.get_json(silent=True) or {}
    query = data.get("query")
    chunks = data.get("chunks") or []
    api_key = data.get("apiKey")
    chat_history = data.get("chatHistory") or []

    # Validate query
    if not isinstance(query, str) or not query.strip():
        return (
            jsonify({"message": "'query' is required and must be a non-empty string"}),
            400,
        )

    # Ensure and resolve API key using existing helper
    try:
        ensure_google_api_key(api_key)
    except ValueError as e:
        return jsonify({"message": str(e)}), 400
    resolved_api_key = os.getenv("GOOGLE_API_KEY")

    # Collect non-empty text from each chunk (more readable than nested comprehensions)
    chunk_texts = []
    if isinstance(chunks, list):
        for chunk in chunks:
            text = extract_chunk_text(chunk)
            if text:
                chunk_texts.append(text)
    all_chunks = "\n\n---\n\n".join(chunk_texts)

    system_prompt = f"""
    You are an intelligent chatbot who answers user queries based on the Given context by breaking the complex query into simple queries and then answers the user queries by following the set of rules.

    Rules:
    1. Answer must stay within the Given context.
    2. Also consider the previous chat history of the user while answering, for not losing the context.
    3. If you do not know the answer from the context, say you don't know. Do not assume or fabricate.
    4. By default, explain in simple words in an elaborative way. If the user asks to simplify or summarize, adjust accordingly.

    Context:
    {all_chunks}
    """

    # Process chat history using the reusable function
    messages = process_chat_history(chat_history)
    # System prompt
    messages.append({"role": "system", "content": system_prompt})
    # User query
    messages.append({"role": "user", "content": query})

    # Call Gemini via OpenAI-compatible API
    try:
        client = OpenAI(
            api_key=resolved_api_key,
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
        )

        resp = client.chat.completions.create(
            model="gemini-2.0-flash-001",
            messages=messages,
        )

        # Extract answer text
        answer = None
        if getattr(resp, "choices", None):
            msg = resp.choices[0].message
            # message.content can be str or list of parts depending on SDK/version
            if isinstance(getattr(msg, "content", None), str):
                answer = msg.content

        if not answer or not isinstance(answer, str):
            return jsonify({"message": "Invalid response from LLM service"}), 502

        return jsonify({"answer": answer}), 200
    except Exception as e:
        app.logger.error(f"LLM generation error: {str(e)}")
        return jsonify({"message": "LLM generation failed", "detail": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_ENV") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug)
