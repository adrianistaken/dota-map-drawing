import { createApp } from 'vue'
import { createPinia } from 'pinia'
import VueKonva from 'vue-konva'
import './style.css'
import App from './App.vue'
import { inject } from '@vercel/analytics';
import * as Sentry from '@sentry/vue';

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

app.use(pinia)
app.use(VueKonva)
app.mount('#app')

inject()