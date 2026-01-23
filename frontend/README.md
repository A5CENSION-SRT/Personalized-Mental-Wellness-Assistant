This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Google Cloud Text-to-Speech (TTS)

Server route is available at `/api/tts` and requires either Application Default Credentials (ADC) or inline JSON credentials via env.

Configure credentials on your machine without committing secrets:

- Inline JSON (preferred on Windows PowerShell):

```powershell
$env:GOOGLE_TTS_CREDENTIALS_JSON = Get-Content "C:\\Users\\Sujal B\\OneDrive\\Desktop\\tts.json" -Raw
```

- Or ADC file path:

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\Users\\Sujal B\\OneDrive\\Desktop\\tts.json"
```

Client usage example:

```tsx
import TextToSpeechButton from "@/components/TextToSpeechButton";

export default function Demo() {
	return (
		<TextToSpeechButton text="Hello from TTS" options={{ languageCode: "en-US" }} />
	);
}
```

API call example:

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/tts" -Method POST `
	-ContentType "application/json" `
	-Body '{"text":"Hello, this is a Google Cloud TTS test.","languageCode":"en-US"}' `
	-OutFile "tts.mp3"
```

Security note: never commit service account JSON. Use env vars.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
