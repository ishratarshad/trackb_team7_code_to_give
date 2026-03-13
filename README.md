# Food Access Analytics Pipeline

Layer 2 normalizer: raw food tags → normalized pantry supply profile.

## Environment setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` and set `GEMINI_API_KEY` with your real API key.
3. Run the FastAPI server:
   ```bash
   pip install -r requirements.txt
   uvicorn normalizer.main:app --reload
   ```

## Development fallback (mock mode)

When Gemini quota is exhausted (429) or you want to run without API calls, use mock mode:

```bash
export USE_MOCK_NORMALIZER=1
uvicorn normalizer.main:app --reload
```

Or process a file without calling Gemini:

```bash
export USE_MOCK_NORMALIZER=1
python -c "from normalizer.ingest import process_export_to_file; process_export_to_file('data/sample_classifier_output.json', 'output.json')"
```

Mock mode uses rule-based mappings; it does not call Gemini. Unset the env var to use real Gemini.
