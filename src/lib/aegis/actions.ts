import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listRelayModels, runRelayScan } from "./scanner";
import { PROTOCOLS } from "./protocols";

const ConfigSchema = z.object({
  baseUrl: z.string().min(8),
  apiKey: z.string(),
  model: z.string(),
  protocol: z.string(),
  timeout: z.number().min(3).max(180),
  allowInsecureHttp: z.boolean(),
  azureApiVersion: z.string().optional(),
});

export const listProtocolsFn = createServerFn({ method: "POST" }).handler(async () => PROTOCOLS);

export const listModelsFn = createServerFn({ method: "POST" })
  .validator(ConfigSchema)
  .handler(async ({ data }) => {
    const models = await listRelayModels(data);
    return { models };
  });

export const runScanFn = createServerFn({ method: "POST" })
  .validator(ConfigSchema)
  .handler(async ({ data }) => {
    return runRelayScan(data);
  });
