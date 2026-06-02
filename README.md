<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4f672bae-822d-45d9-aa39-b2a5de5fdca6

## Run Locally

**Prerequisites:** Node.js


1. Install dependencies:
   `npm install --legacy-peer-deps`
2. Create [.env.local](.env.local) in the project root and set your Gemini API key:
   `GEMINI_API_KEY=your_gemini_api_key`
3. Run the app:
   `npm run dev`

The app starts on `http://localhost:3000`.

If the install command fails on your machine, rerun it with `--legacy-peer-deps` as shown above.
