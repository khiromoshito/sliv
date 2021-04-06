

function lex2(root, context_type = ContextType.ROOT) {

    let lexed_root = new GroupContext(context_type);


    let priorIfContext = undefined;

    for(let subcontext of root[1]) {


        let isLexed = false;

        // Scan for a setter, lambda, or command
        for(let i = 0; i<subcontext[1].length && !isLexed; i++) {

            let subcomp_type = subcontext[1][i][0];

            if(subcomp_type.isChar(CharType.COLON)) {
                lexed_root.contents.push(processSetter(subcontext, i));
                isLexed = true;
                break;
            } else if(subcomp_type.isOf(SubComponentType.COMMAND)) {
                
                switch(subcontext[1][i][1]) {
                    case "else":
                        if(priorIfContext!==undefined) {
                            let else_statement = 
                                processIfCommandItem(subcontext[1].slice(1));

                            priorIfContext.else_statement = else_statement;

                            priorIfContext = undefined;
                        }
                    break;
                    case "elseif":
                        if(priorIfContext!==undefined) {

                            let processedCommand = processCommand(subcontext[1]);
                            let elseif_statements = processedCommand.if_statements;

                            priorIfContext.if_statements.push(...elseif_statements);
                        }
                    break;
                    default:
                        priorIfContext = undefined;

                        let lexed = processValue(subcontext[1]);
                        lexed_root.contents.push(lexed);

                        if(subcontext[1][i][1]==="if") {
                            priorIfContext = lexed;
                        }
                }

                
                isLexed = true;
                break;

            }
                
        }

        if(!isLexed) lexed_root.contents.push(processValue(subcontext[1]));

        

    } 

    return lexed_root;
}





/** Checks if a subcomponent is an operation symbol */
function isOperationSymbol(subcomponent) {
    return formOperationSymbol(subcomponent).type !== null;
}




function processEntryGetter(group_subcomponent) {
    
    let subcontexts = group_subcomponent[1];
    
    // There must only be one subcontext
    // since entry getters only accept one argument
    if(subcontexts.length==1) {
        return processValue(subcontexts[0][1]);
    } else throw(`CompileException: Entry calls (inside { }) expected 1 argument, `+
        `but ${subcontexts.length} found, at ` +
        `line ${group_subcomponent[2][0].line} `+
        `column ${group_subcomponent[2][0].column}`);

}


