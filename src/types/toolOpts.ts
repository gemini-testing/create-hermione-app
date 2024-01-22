import type { HermioneConfig } from "./hermioneConfig";

export interface PluginPrompt {
    plugin: string;
    description: string;
    default: boolean;
    configNote?: string;
}

export interface PluginGroup {
    description: string;
    plugins: PluginPrompt[];
}

export interface GeneralPrompt {
    type: "input" | "number" | "confirm" | "list" | "rawlist" | "expand" | "checkbox" | "password" | "editor";
    name: string;
    message: string;
    default?: any | any[];
    choices?: any[];
}

export interface Answers extends Record<string, unknown> {
    _path: string;
}

export type HandleGeneralPromptsCallback = (
    hermioneConfig: HermioneConfig,
    answers: Answers,
) => Promise<HermioneConfig> | HermioneConfig;

export interface ArgvOpts {
    path: string;
    noQuestions: boolean;
}

export interface DefaultOpts {
    pluginGroups: PluginGroup[];
}

export type ToolOpts = ArgvOpts & DefaultOpts;
