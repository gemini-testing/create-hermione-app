import defaultToolOpts from "./constants/defaultToolOpts";
import { initApp, installPackages } from "./package";
import { getPluginNames } from "./plugins";
import { askQuestion, baseGeneralPromptsHandler, printSuccessMessage, writeTestExample } from "./utils";
import baseGeneralPrompts from "./constants/baseGeneralPrompts";
import { ConfigBuilder } from "./configBuilder";
import type { DefaultOpts, GeneralPrompt, HandleGeneralPromptsCallback, ToolOpts } from "./types/toolOpts";
import type { HermioneConfig } from "./types/hermioneConfig";
import type { PluginsConfig } from "./types/pluginsConfig";

export type CreateOptsCallback = (defaultOpts: DefaultOpts) => ToolOpts;
export type CreateBaseConfigCallback = (defaultHermioneConfig: HermioneConfig) => HermioneConfig;
export type CreatePluginsConfigCallback = (pluginsConfig: PluginsConfig) => PluginsConfig;

export interface CreateHermioneAppOpts {
    createBaseConfig?: CreateBaseConfigCallback;
    createOpts: CreateOptsCallback;
    generalPrompts?: {
        prompts: GeneralPrompt[];
        handler: HandleGeneralPromptsCallback;
    };
    createPluginsConfig?: CreatePluginsConfigCallback;
}

process.on("uncaughtException", err => {
    console.error(err.stack);
    process.exit(1);
});

process.on("unhandledRejection", (reason, p) => {
    console.error("Unhandled Rejection:\n  Promise: ", p, "\n  Reason: ", reason);
});

export { askQuestion } from "./utils";

export const run = async ({
    createBaseConfig,
    createOpts,
    generalPrompts,
    createPluginsConfig,
}: CreateHermioneAppOpts): Promise<void> => {
    const configBuilder = ConfigBuilder.create(createBaseConfig);
    const opts = createOpts(defaultToolOpts);

    const packageManager = await initApp(opts.path, opts.noQuestions);

    await configBuilder.handleGeneralQuestions(
        [baseGeneralPrompts, generalPrompts?.prompts],
        [baseGeneralPromptsHandler, generalPrompts?.handler],
        opts.noQuestions,
    );

    const { pluginNames, configNotes } = await getPluginNames(opts);

    await configBuilder.configurePlugins(pluginNames, createPluginsConfig);

    await Promise.all([
        installPackages(opts.path, packageManager, pluginNames),
        configBuilder.write(opts.path),
        writeTestExample(opts.path),
    ]);

    printSuccessMessage(configNotes);
};

export default { run, askQuestion };
export * from "./types";
