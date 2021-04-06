
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
                else return evaluateValue(else_statement.content);
            }
            
            if(value!==undefined && value.type.isOf(ContextType.RETURN_CRUMB))
                return value;


        break;
        
    }

    return nullCrumb();
}