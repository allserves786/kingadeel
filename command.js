// command.js
var commands = [];
var commandMap = new Map();

function cmd(info, func) {
    var data = { ...info };
    data.function = func;
    if (!data.dontAddCommandList) data.dontAddCommandList = false;
    if (!data.desc) data.desc = '';
    if (!data.fromMe) data.fromMe = false;
    if (!data.category) data.category = 'misc';
    if (!data.filename) data.filename = "Not Provided";

    if (data.pattern && typeof data.pattern === 'string') {
        const key = data.pattern.toLowerCase().trim();
        const existingIdx = commands.findIndex(
            c => c.pattern && typeof c.pattern === 'string' && c.pattern.toLowerCase().trim() === key
        );
        if (existingIdx !== -1) {
            // Merge aliases if any new ones exist, update handler
            const existing = commands[existingIdx];
            const mergedAliases = new Set([
                ...(Array.isArray(existing.alias) ? existing.alias : []),
                ...(Array.isArray(data.alias) ? data.alias : [])
            ]);
            data.alias = [...mergedAliases];
            commands[existingIdx] = data;
        } else {
            commands.push(data);
        }
        commandMap.set(key, data);
        if (Array.isArray(data.alias)) {
            for (const al of data.alias) {
                if (typeof al === 'string') {
                    commandMap.set(al.toLowerCase().trim(), data);
                }
            }
        }
    } else {
        commands.push(data);
    }

    return data;
}

module.exports = {
    cmd,
    AddCommand: cmd,
    Function: cmd,
    Module: cmd,
    commands,
    commandMap,
};
