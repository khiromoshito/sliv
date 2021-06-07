
function executeCommand(commandcontext = new CommandContext(), address = "root") {
    

    let args = commandcontext.args;
    let position = commandcontext.start;
    switch(commandcontext.name) {
        case "return":
            return new ReturnCrumb(evaluateValue(args, address), address);
        case "if":
            let value = undefined;
            let isAction = true;


            // Try every if-conditions

            for(let condition_item of commandcontext.if_statements) {
                let condition_value = extractCrumb(evaluateValue(condition_item.condition, address));
                
                if(condition_value===true) {

                    if(condition_item.isAction)
                        value = executeScope(condition_item.content, address, [], true);
                    else return evaluateValue(condition_item.content);

                    break;
                } else if(condition_value!==false) 
                    throwException(`ConditionException: Only booleans can be passed as condition `+
                        `in if-else statements`, commandcontext.start);

            }

            // Else, do the else
            if(value == undefined && commandcontext.else_statement!==undefined) {
                let else_statement = commandcontext.else_statement;
                if(else_statement.isAction)
                    value = executeScope(else_statement.content, address, [], true);
                else return evaluateValue(else_statement.content, address);
            }
            
            if(value!==undefined && value.type.isOf(ContextType.RETURN_CRUMB))
                return value;


        break;
        case "for":
            //console.log(commandcontext);
            let params = commandcontext.parameters;

            let return_val = nullCrumb();

            let iterate = function(action = ScopeCrumb(), depth = 1, position, iteradress = "") {
                

                
                // If still under loop
                if(depth<params.length) {
                    if(action.type.isOf(ContextType.SCOPE_CRUMB)) {
                        let item_name = params[depth].variable_name;
                        

                        for(let i=0; i<action.value.contents.length; i++) {
                            let item = action.value.contents[i];
                            setVariable(getAddress(address, item_name), action.value.contents[i]);
                            iterate(evaluateValue(item), depth+1, position);
                        }

                    } else throwException(`IterationException: The last iteration (depth ${depth})`+
                        ` cannot be iterated already (not a list/map/scope)`,
                        position);
                } else {
                    // If at end
                    return_val = executeScope(commandcontext.action, address, [], true);

                }
                
                
            };

            let base_value = extractVariable(params[0].variable_name, address, params[0].start);
            
            
            iterate(base_value, 1, params[0].start);


            return return_val;
        break;
        
    }

    return nullCrumb();
}