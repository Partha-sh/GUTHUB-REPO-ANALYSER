import os

from groq import Groq

client = Groq(
    api_key = os.getenv("GROQ_API_KEY")
)

def generate_ai_explanation(file_data):

    prompt = f"""
    You are a senior software engineer.

    Explain the purpose of this Python file in simple developer-friendly language.

    File Metadata:
    {file_data}

    Keep explanation concise and practical.
    """

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",

        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response.choices[0].message.content