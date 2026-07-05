/* eslint-disable @typescript-eslint/no-explicit-any */

// Module declarations for packages not installed in all build contexts

declare module "msw" {
  export const http: any;
  export const HttpResponse: any;
}

declare module "msw/node" {
  export const setupServer: (...handlers: any[]) => any;
}

declare module "msw/browser" {
  export const setupWorker: (...handlers: any[]) => any;
}

declare module "serwist" {
  export function precacheAndRoute(manifest: any[]): void;
  export function createHandlerBoundToURL(url: string): any;
  export function registerRoute(
    matcher: (args: { request: Request; url: URL }) => boolean,
    handler: any,
  ): void;
  export function setCatchHandler(
    handler: (args: { event: FetchEvent }) => Promise<Response>,
  ): void;
  export class CacheFirst {
    constructor(options: { cacheName: string; plugins?: any[] });
  }
  export class NetworkFirst {
    constructor(options: { cacheName: string; plugins?: any[] });
  }
  export class StaleWhileRevalidate {
    constructor(options: { cacheName: string; plugins?: any[] });
  }
  export class ExpirationPlugin {
    constructor(options: { maxEntries?: number; maxAgeSeconds?: number });
  }
  export function warmStrategyCache(options: { urls: string[]; strategy: any }): void;
}

declare module "recharts" {
  export const LineChart: any;
  export const Line: any;
  export const XAxis: any;
  export const YAxis: any;
  export const CartesianGrid: any;
  export const Tooltip: any;
  export const ResponsiveContainer: any;
  export const PieChart: any;
  export const Pie: any;
  export const Cell: any;
  export const Legend: any;
}

declare module "@tanstack/react-query" {
  export class QueryClient {
    constructor(options?: any);
    invalidateQueries(options?: any): Promise<void>;
    cancelQueries(options?: any): Promise<void>;
    getQueryData<T = unknown>(queryKey: any[]): T | undefined;
    setQueryData(queryKey: any[], updater: any): void;
  }
  export function QueryClientProvider(props: {
    client: QueryClient;
    children: React.ReactNode;
  }): React.ReactNode;
  export function useQuery(options: any): any;
  export function useMutation(options: any): any;
  export function useQueryClient(): QueryClient;
}

declare module "@tanstack/react-query-devtools" {
  export const ReactQueryDevtools: any;
}

declare module "@storybook/react" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type Meta = any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type StoryObj = any;
}

declare module "@google/generative-ai" {
  export const GoogleGenerativeAI: any;
}

declare module "@vercel/otel" {
  export function registerOTel(options: any): void;
}

declare module "@opentelemetry/api" {
  export const trace: any;
  export const SpanStatusCode: any;
  export type Span = any;
}

declare module "@opentelemetry/sdk-node" {
  export const NodeSDK: any;
}

declare module "@opentelemetry/semantic-conventions" {
  export const ATTR_SERVICE_NAME: string;
  export const ATTR_SERVICE_VERSION: string;
}

declare module "@opentelemetry/sdk-trace-base" {
  export const SimpleSpanProcessor: any;
}

declare module "@opentelemetry/exporter-trace-otlp-http" {
  export const OTLPTraceExporter: any;
}

declare module "@opentelemetry/instrumentation-http" {
  export const HttpInstrumentation: any;
}

declare module "@opentelemetry/instrumentation-fetch" {
  export const FetchInstrumentation: any;
}

declare module "@opentelemetry/resources" {
  export function resourceFromAttributes(attributes: Record<string, string>): any;
}

declare module "resend" {
  export class Resend {
    constructor(apiKey: string | undefined);
    emails: {
      send(options: any): Promise<any>;
    };
  }
}

declare module "@react-email/render" {
  export function render(component: any): string;
}

declare module "@react-email/components" {
  export const Body: any;
  export const Button: any;
  export const Container: any;
  export const Head: any;
  export const Heading: any;
  export const Hr: any;
  export const Html: any;
  export const Preview: any;
  export const Section: any;
  export const Text: any;
}

// Service Worker globals
interface FetchEvent extends Event {
  request: Request;
  respondWith(response: Response | Promise<Response>): void;
}

interface ServiceWorkerGlobalScope extends EventTarget {
  __WB_MANIFEST: any[];
  addEventListener(type: string, listener: EventListener): void;
}

declare const self: ServiceWorkerGlobalScope;
