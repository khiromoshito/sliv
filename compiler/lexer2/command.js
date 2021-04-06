

function processCommand(command_array, position = 0) {

    let command_subcomp = command_array[0];
    let command_name = command_subcomp[1];


    if(!COMMANDS.includes(command_name)) 
        throwException(`CompileException: Unknown command '#${command_name}'`, command_subcomp[2][0]);

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
    } else if(["for", "iterate", "iter"].includes(command_name)) {

        
        let parameters = [];
    
        let isAnticipating = false;

        let param = new ParameterItem();

        for(let i = 0; i<args.length; i++) {

            let subcomponent = args[i];

            // If TYPE (GROUP_BRACKET)
            if(subcomponent[0].isOf(SubComponentType.GROUP_BRACKET)) {

                // Only set type if not yet set
                if(param.parameter_type === null)
                    param.parameter_type = processType(subcomponent);
                else throwException(`CompileException: Unexpected type `+
                    `(the type has already been set)`, subcomponent[2][0]);

            } else 

            //If VARIABLE
            if(isVariable(subcomponent)) {

                if(isAnticipating || parameters.length==0) {
                    param.variable_name = subcomponent[1];
                    param.start = subcomponent[2][0];
                    parameters.push(param);

                    param = new ParameterItem();
                    isAnticipating = false;
                } else throwException(
                    `CompilException: Unexpected variable '${subcomponent[1]}'`,
                    subcomponent[2][0]);
                
                

            } else 

            if(!isAnticipating) {

                if(subcomponent[0].isOf(SymbolType.GREATERTHAN2)) {
                
                    if(parameters.length==0) throwException(
                        `CompilException: Unexpected '>>' without defining a preceding variable`,
                        subcomponent[2][0]);
    
                    
                    isAnticipating = true;
                } else
    
                if(subcomponent[0].isOf(SymbolType.COLON2)) {
    
                    let positions = [
                        args[i+1][2][0],
                        args[args.length-1][2][1]
                    ];
    
                    let action = lex2([SubComponentType.SCOPE, 
                        [[SubComponentType.SUBCONTEXT, args.slice(i+1), positions]], 
                        positions]);


                    if(parameters.length==0) throwException(
                        `CompileException: Loop command provided action '::' but no parameters found`,
                        subcomponent[2][0]
                    );
    
                    return new IterationContext(parameters, action, positions[0]);
    
                } else 

                if(subcomponent[0].isOf(SubComponentType.GROUP_CURLY)) {
                    
                    // If current scope is not last item in args, throw exception
                    if(i+1!=args.length) throwException(
                        `CompileException: Unknown statement after scope { }`,
                        args[i+1][2][0]);

                    if(parameters.length==0) throwException(
                        `CompileException: Loop command provided action '::' but no parameters found`,
                        subcomponent[2][0]
                    );

                    let action = lex2(subcomponent);

                    return new IterationContext(parameters, action, subcomponent[2][0]);

                } else
                
                throwException(
                    `CompilException: Unexpected statement`,
                    subcomponent[2][0]);


            } else throwException(
                `CompileException: Unexpected statement after '>>'`,
                subcomponent[2][0]);

            
        }

        throwException(`CompileException: Loop command ended without action '{ }' or '::'`,
            args[args.length-1][2][0]);
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