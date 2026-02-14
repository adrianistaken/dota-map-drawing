import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueKonva from 'vue-konva'
import './style.css'
import 'vue-sonner/style.css'
import App from './App.vue'
import { inject } from '@vercel/analytics';
import * as Sentry from '@sentry/vue';
import posthog from 'posthog-js';

const app = createApp(App)
const pinia = createPinia()

Sentry.init({
    app,
    dsn: import.meta.env.VITE_SENTRY_DSN,
    sendDefaultPii: true,
    integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration()
    ],
    tracesSampleRate: 1.0,
    tracePropagationTargets: ["localhost"],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    debug: false,
});

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: 'https://us.i.posthog.com',
    defaults: '2025-11-30',
    person_profiles: 'always',
})
posthog.register({
    env: import.meta.env.VITE_APP_ENV ? 'local' : 'production',
})

app.use(pinia)
app.use(VueKonva)
app.mount('#app')

inject()