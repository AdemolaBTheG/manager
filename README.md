# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

## RevenueCat subscriptions

Manager Pro subscriptions, purchases, entitlement checks, hosted Paywalls, and
Customer Center are implemented with RevenueCat. Complete the one-time dashboard
and development-build setup in [REVENUECAT_SETUP.md](./REVENUECAT_SETUP.md).

## Rehearsal actor and voice APIs

The turn-based actor runs through the Expo Router endpoint at
`/api/rehearsal/respond`. On-device speech recognition sends only the finalized
transcript; the OpenAI key remains inside the server route.

Jamie’s reply is converted to WAV audio through `/api/rehearsal/speech` and
played with `expo-audio`. Native playback status starts and stops the speaking
state, while decoded PCM samples drive the avatar’s activity. The default TTS
model is `gpt-4o-mini-tts` with the `cedar` voice.

Completed rehearsals run through the separate evaluator endpoint at
`/api/rehearsal/evaluate`. It returns one outcome and up to three moments whose
quotes are validated as exact substrings of saved manager turns before the
debrief is persisted.

All client-to-server rehearsal calls use TanStack Query mutations. Actor,
speech, and evaluator generations have stable mutation keys and do not retry
automatically; the visible retry actions own retries so an intermittent network
failure cannot silently duplicate a paid AI generation. SQLite repository calls
remain direct because they are local transactional persistence, not remote
server state. New remote client calls should be added through
`src/services/query/` rather than invoked directly from screens or hooks.

Create a local `.env` from `.env.example` and set `OPENAI_API_KEY`. The default
actor model is `gpt-5.6-luna`. Override the models or voice with
`OPENAI_ACTOR_MODEL`, `OPENAI_EVALUATOR_MODEL`, `OPENAI_TTS_MODEL`, and
`OPENAI_TTS_VOICE`.

For a deterministic local rehearsal without calling a provider:

```bash
ACTOR_PROVIDER=fixture EVALUATOR_PROVIDER=fixture npx expo start --dev-client
```

The curated catalog currently contains six fully authored scenarios: two each
for difficult feedback, boundaries, and pushback. Starting one pins its
scenario ID/version and seeds its opening simulation state and resistance order
into SQLite. Every counterpart response then commits the next state, model,
prompt version, and turn together so the rehearsal can resume after navigation
or restart.

Before a production native build, deploy the server bundle to EAS Hosting and
set the deployed URL as the Expo Router plugin `origin`. Relative client
requests resolve to the development server automatically during local work.

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
