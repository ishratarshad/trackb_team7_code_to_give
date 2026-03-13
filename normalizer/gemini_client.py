"""Thin wrapper around google-generativeai for Gemini Flash."""

import json
import os

import google.generativeai as genai
print("Using Gemini API...")

def _get_model():
    """Get Gemini model (2.0 Flash preferred, fallback to 1.5 Flash)."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    genai.configure(api_key=api_key)

    for model_name in ("gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"):
        try:
            return genai.GenerativeModel(model_name)
        except Exception:
            continue
    raise RuntimeError("Could not load gemini-2.0-flash or gemini-1.5-flash")


def call_gemini(prompt: str) -> str:
    """Call Gemini Flash with the given prompt. Returns raw response text."""
    model = _get_model()
    response = model.generate_content(prompt)
    return response.text.strip()


def _parse_json_text(text: str) -> dict:
    """Parse JSON from response text, stripping markdown code blocks if present."""
    t = text.strip()
    if t.startswith("```"):
        lines = t.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        t = "\n".join(lines)
    return json.loads(t)


def call_gemini_json(prompt: str) -> dict:
    """
    Call Gemini and parse JSON. Retries once on parse error, then raises.
    """
    text = call_gemini(prompt)
    try:
        return _parse_json_text(text)
    except json.JSONDecodeError:
        text_retry = call_gemini(prompt)
        try:
            return _parse_json_text(text_retry)
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Gemini returned malformed JSON after retry. "
                f"Response preview: {text[:200]}..."
            ) from e
