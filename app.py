import os
from flask import Flask, render_template, request, jsonify
from anthropic import Anthropic, AuthenticationError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Configuration
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    print("WARNING: ANTHROPIC_API_KEY not found in environment variables.")

client = Anthropic(api_key=ANTHROPIC_API_KEY)

SYSTEM_PROMPT = """You are "TechBot", a highly professional and elite technical support assistant. 
Your goal is to provide clear, step-by-step, and expert solutions to technical problems.

Core Guidelines:
1. Language: Always respond in the language used by the user (primarily Arabic). Use a professional yet friendly tone.
2. Structure: Use Markdown for formatting (bolding, lists, code blocks). 
3. Expertise: If a problem is complex, break it down. If it's outside the technical scope, politely redirect the user.
4. Formatting: Use code blocks for commands, paths, or code snippets. Use emojis sparingly to maintain a professional look.
5. Conciseness: Be direct but thorough. Avoid unnecessary fluff.

Identity: You are powered by advanced AI and specialized in hardware, software, networking, and cybersecurity support."""

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    messages = data.get("messages", [])

    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    try:
        # Limit history to last 10 messages to keep context window manageable
        truncated_messages = messages[-10:]
        
        response = client.messages.create(
            model="claude-3-sonnet-20240229",
            max_tokens=2048,
            system=SYSTEM_PROMPT,
            messages=truncated_messages
        )
        
        reply = response.content[0].text
        return jsonify({"reply": reply})

    except AuthenticationError:
        return jsonify({"error": "Invalid API Key. Please check your .env file."}), 401
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": "An unexpected error occurred. Please try again later."}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

