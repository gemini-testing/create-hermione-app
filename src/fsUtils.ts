import _ from "lodash";
import fs from "fs";
import { resolve as pathResolve } from "path";
import { HERMIONE_JS_CONFIG_NAME, HERMIONE_TS_CONFIG_NAME } from "./constants/packageManagement";
import type { HermioneConfig } from "./types/hermioneConfig";

const createDirectory = (path: string): Promise<string | undefined> => fs.promises.mkdir(path, { recursive: true });

export const exists = (path: string): Promise<boolean> =>
    new Promise<boolean>(resolve => {
        fs.promises
            .access(path, fs.constants.F_OK)
            .then(() => resolve(true))
            .catch(() => resolve(false));
    });

export const ensureDirectory = async (path: string): Promise<string | void> => {
    const stat = await new Promise<fs.Stats | null>(resolve => {
        fs.promises
            .stat(path)
            .then(resolve)
            .catch(() => resolve(null));
    });

    if (stat === null) {
        return createDirectory(path);
    }

    if (!stat.isDirectory()) {
        throw Error(`${path} is not a directory!`);
    }
};

export const writeHermioneConfig = async (
    dirPath: string,
    hermioneConfig: HermioneConfig,
    { ts }: { ts?: boolean } = {},
): Promise<void> => {
    const modules = hermioneConfig.__modules || {};
    const variables = hermioneConfig.__variables || {};

    const omittedConfig = _.omit(hermioneConfig, ["__modules", "__variables"]);

    const toIndentedJson = (config: HermioneConfig): string => JSON.stringify(config, null, 4);

    const withComments = (configStr: string): string => {
        // obj's records like "__comment": "Comment text" are turned into "// Comment text"
        // obj's records like "__comment123": "Comment text" are turned into "// Comment text"
        // array's strings like "__comment: Comment text" are turned into "// Comment text"
        return configStr.replace(/([\t ]*)"__comment\d*(?:(?:: )|(?:": "))(.*)",?/g, "$1// $2");
    };

    const withReplacedQuotes = (configStr: string): string => {
        // removes double quotes from obj's keys where they are not needed
        // replaces double quotes with single quotes
        // unescapes and restores double quotes in comments
        return configStr
            .replace(/^[\t ]*"[^:\n\r/-]+(?<!\\)":/gm, match => match.replace(/"/g, ""))
            .replace(/"/g, "'")
            .replace(/[\t ]*\/\/ (.*)/g, match => match.replace(/\\'/g, '"'));
    };

    const withExpressions = (configStr: string): string => {
        // strings like '__expression: <expression>' are turned into <expression>
        return configStr.replace(/'__expression: (.*)'(,?)$/gm, "$1$2");
    };

    const getObjectRepr = _.flow([toIndentedJson, withComments, withReplacedQuotes, withExpressions]);

    const configImports = Object.keys(modules)
        .map(importName =>
            ts
                ? `import ${importName} from "${modules[importName]}";`
                : `const ${importName} = require('${modules[importName]}');`,
        )
        .join("\n");

    const configVariables = Object.keys(variables)
        .map(variable => `const ${variable} = ${variables[variable]};`)
        .join("\n");

    const configBody = ts
        ? `// @ts-ignore\nexport = ${getObjectRepr(omittedConfig)}\n`
        : `module.exports = ${getObjectRepr(omittedConfig)}\n`;

    const configContents = [configImports, configVariables, configBody].filter(Boolean).join("\n\n");
    const configPath = pathResolve(dirPath, ts ? HERMIONE_TS_CONFIG_NAME : HERMIONE_JS_CONFIG_NAME);

    await ensureDirectory(dirPath);

    return fs.promises.writeFile(configPath, configContents);
};

export const writeTest = async (dirPath: string, testName: string, testContent: string): Promise<void> => {
    const testDirPath = pathResolve(dirPath, "tests");
    const testPath = pathResolve(testDirPath, testName);

    try {
        await ensureDirectory(testDirPath);

        const isTestfileExist = await exists(testPath);

        if (!isTestfileExist) {
            await fs.promises.writeFile(testPath, testContent);
        }
        ("");
    } catch {
        return;
    }
};

export default { exists, ensureDirectory, writeHermioneConfig, writeTest };
