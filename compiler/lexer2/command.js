

function processCommand(command_array, position = 0) {

    let command_subcomp = command_array[0];
    let command_name = command_subcomp[1];


    if(!COMMANDS.includes(command_name)) 
        throwException(`CompileException: Unknown command '#${flag_name}'`, flag_subcomponent[2][0]);

    // Commands must have at least one argument (two items for command_array)
    if(command_array.length<=1) 
        throwException(`CompileException: Missing args for command '${command_name}'`, command_subcomp[2][0]);


    let args = command_array.slice(1);
    
    if(["return", "ret"].includes(command_name)) {
        return new CommandContext(
            "return", processValue(args), 
            command_subcomp[2][0]);
    } else if(["if", "elseif", "else"].includes(command_name)) {
        // First, locate any else if statements
        let last_elseif_index = 0;
        let if_commands = [];
        let else_command = null;

        for(let i=0; i<args.length; i++) {
            let subcomponent = args[i];
            if(subcomponent[0].isOf(SubComponentType.COMMAND)) {
                if(subcomponent[1]==="elseif") {
                    if(else_command===null) {
                        if_commands.push(args.slice(last_elseif_index, i));
                        last_elseif_index = i+1;
                    } else throw(`CompileException: #elseif commands cannot be `+
                        `declared after a concluding #else command `+
                        `(make sure to place #else as last), at ` +
                        `line ${subcomponent[2][0].line} `+
                        `column ${subcomponent[2][0].column}`);
                } else if(subcomponent[1]==="else") {
                    if_commands.push(args.slice(last_elseif_index, i));
                    else_command = args.slice(i+1);
                    last_elseif_index = args.length;
                }
            }
        }

        if(last_elseif_index<args.length)
            if_commands.push(args.slice(last_elseif_index));

        return new IfCommandContext(
            if_commands.map(if_command=>processIfCommandItem(if_command)),
            else_command ? processIfCommandItem(else_command) : undefined,
            command_subcomp[2][0]
        );
    }

        


    // for(let arg of command_array.slice(1))
    //     args.push(processValue([arg]));

    




    return new CommandContext(command_name, [], command_subcomp[2][0]);
}



function processIfCommandItem(subcomponents) {


    if(subcomponents==0) throw(`CompileException: Found empty arguments for command at ` +
        `line ${subcomponent[2][0].line} `+
        `column ${subcomponent[2][0].column}`);

    let ifcommanditem = new IfCommandItem();
    ifcommanditem.start = subcomponents[0];

    for(let i=0; i<subcomponents.length; i++) {
        let subcomponent = subcomponents[i];
        let positions = [
            subcomponents[0][2][0],
            subcomponents[subcomponents.length-1][2][1]
        ];

        if(subcomponent[0].isOf(SymbolType.COLON2)) {
            return new IfCommandItem(
                processValue(subcomponents.slice(0, i)),
                lex2([SubComponentType.SCOPE, 
                    [[SubComponentType.SUBCONTEXT, subcomponents.slice(i+1), positions]], 
                    positions]),
                true,
                positions[0]
            );
        } else if(subcomponent[0].isOf(SubComponentType.GROUP_CURLY)) {
            return new IfCommandItem(
                processValue(subcomponents.slice(0, i)),
                lex2(subcomponent, ContextType.SCOPE),
                true,
                positions[0]
            );
        } else if(subcomponent[0].isChar(CharType.COLON)) {
            return new IfCommandItem(
                processValue(subcomponents.slice(0, i)),
                processValue(subcomponents.slice(i+1)),
                false,
                positions[0]
            );
        }
    }

    throwException(`CompileException: Missing action '{ }' or '::' or ':' `+
        `for 'else-if' statement`, subcomponents[subcomponents.length-1][2][1]);
}