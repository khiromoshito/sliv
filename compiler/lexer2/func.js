
function processParameters(group_subcomponent) {
    
    let parameters = [];


    for(let subcontext of group_subcomponent[1]) {
        let subcomponents = subcontext[1];

        let param = new ParameterItem();
        param.start = subcontext[2][0];
        

        /** Checks the last index of a flag 
        * (to make sure all flags are at the beginning) */ 
        let last_flag_index = -1;


        /** The parameter subcomponents, excluding default value.
         *  Temporarily set to all subcomponents from the parameter.
         */
        let attributes = subcomponents;
    

        // Check for COLON symbol (means default value setter)
        for(let ii = 0; ii < subcomponents.length; ii++) {
            if(subcomponents[ii][0].isChar(CharType.COLON)) {
                // If found colon, set default value and slice attributes
                let value_subcomponents = subcomponents.slice(ii+1);

                // Value Subcomponents must have at least one item
                if(value_subcomponents.length>0) {
                    param.default_value = processValue(value_subcomponents);
                    attributes = subcomponents.slice(0, ii);
                } else throw(`CompileException: Parameter ended with ':'. `+
                        `(Provide a default value, or remove the colon symbol), at `+
                        `line ${subcomponents[ii][2][0].line} `+
                        `column ${subcomponents[ii][0].column}`);

                
            }
        }


        for(let i =0; i<attributes.length; i++) {

            let subcomponent = attributes[i];

            // If FLAG
            if(subcomponent[0].isOf(SubComponentType.FLAG)) {
                // Flags must be at the beginning of a parameter
                if(last_flag_index+1==i) {
                    param.parameter_flags.push(processFlag(subcomponent));
                    last_flag_index = i;
                } else throw(`CompileException: Flag '${subcomponent[1]}' found at wrong position `+
                    `(flags must be before the value and type), at `+
                    `line ${subcomponent[2][0].line} `+
                    `column ${subcomponent[2][0].column}`);
            } else

            // If TYPE (GROUP_BRACKET)
            if(subcomponent[0].isOf(SubComponentType.GROUP_BRACKET)) {
                
                if(last_flag_index+1 == i) {

                    // Only set type if not yet set
                    if(param.parameter_type === null)
                        param.parameter_type = processType(subcomponent);
                    else throw(`CompileException: Unexpected type `+
                        `(the type has already been set) at `+
                        `line ${subcomponent[2][0].line} `+
                        `column ${subcomponent[2][0].column}`);

                } else throw(`CompileException: Type found at wrong position `+
                    `(types must be before the value and after the flags), at `+
                    `line ${subcomponent[2][0].line} `+
                    `column ${subcomponent[2][0].column}`);

            } else 

            //If VARIABLE
            if(isVariable(subcomponent)) {
                
                // Only set param name if not yet set
                if(param.variable_name === undefined) 
                    param.variable_name = subcomponent[1];
                else throw(`CompileException: Unexpected '${subcomponent[1]}' at `+
                    `line ${subcomponent[2][0].line} `+
                    `column ${subcomponent[2][0].column}`);

            } else throw(`CompileException: Unexpected statement inside parameter at `+
                `line ${subcomponent[2][0].line} `+
                `column ${subcomponent[2][0].column}`);

        }

        parameters.push(param);
    }


    // Finally, check for any cross overs:
    // Any unnamed parameters with default value must be
    // after all unnamed no-default parameters (bland parameters)

    // Also, all named parameters must be placed after all unnamed parameters

    let last_bland_index = -1;
    let last_unnamed_index = -1;
    for(let i = parameters.length-1; i>=0; i--) {
        let param = parameters[i];
        if(!hasFlag(param.parameter_flags, "named")) {
            
            // If bland
            if(param.default_value===undefined) {
                last_bland_index = i;
            } else {
                if(i<last_bland_index)
                    throwException(`CompileException: All unnamed/positional parameters `+
                    `with default values must be placed after `+
                    `all no-default unnamed parameters`, param.start);
            }

            last_unnamed_index = i;
        } else {
            if(i<last_unnamed_index)
                throwException(`CompileException: All named parameters `+
                    `must be placed after all unnamed parameters`, 
                    param.start);
        }
    }


    return parameters;
}


function processArgs(group_subcomponent) {
    
    let args = [];


    for(let subcontext of group_subcomponent[1]) {
        let subcomponents = subcontext[1];

        let arg = new ArgumentItem();
        arg.start = subcontext[2][0];

        let value_subcomponents = subcomponents;


        // Blank args are not allowed
        if(subcomponents.length==0)
            throw(`CompileException: Found blank argument at `+
                `line ${subcontext[2][0].line} `+
                `column ${subcontext[2][0].column}`);

        // Check for COLON symbol (if there's any, left side is param name)
        for(let ii = 0; ii < subcomponents.length; ii++) {
            if(subcomponents[ii][0].isChar(CharType.COLON)) {

                // If found colon, left side must be name
                let name_only = subcomponents.slice(0, ii);

                // And the rest are values
                value_subcomponents = subcomponents.slice(ii+1);
                
                if(name_only.length>1)
                    throw(`CompileException: Unexpected '${name_only.length}' elements `+
                        `at the left side of argument setter ":" , `+
                        `(only 1 [parameter name] is allowed), at ` +
                        `line ${subcomponents[ii][2][0].line} `+
                        `column ${subcomponents[ii][2][0].column}`);

                if(name_only.length==0)
                    throw(`CompileException: Left side of argument setter ":" `+
                        `must not be empty (parameter name), at `+
                        `line ${subcomponents[ii][2][0].line} `+
                        `column ${subcomponents[ii][2][0].column}`);

                if(isVariable(name_only[0])) {
                    arg.variable_name = name_only[0][1];
                } else throw(`CompileException: Unexpected statement at the `+
                    `left side of argument setter ":" (must be in variable form) at `+
                    `line ${subcomponents[ii][2][0].line} `+
                    `column ${subcomponents[ii][2][0].column}`);

            }
        }

        // Value Subcomponents must have at least one item
        if(value_subcomponents.length>0)
            arg.value = processValue(value_subcomponents);
        else throw(`CompileException: Argument ended with ':' `+
                `(provide a value corresponding to the parameter/argument name), at `+
                `line ${subcomponents[ii][2][0].line} `+
                `column ${subcomponents[ii][2][0].column}`);


        args.push(arg);
    }

    return args;
}