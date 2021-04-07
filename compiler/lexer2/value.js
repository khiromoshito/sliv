
/** Processes value-emitting subcomponents
 * 
 *  subcomponents is an array
 */
 function processValue(subcomponents) {


    /*

        Level of Power:
            - command/logic
            - comparator

        First, iterate for any command/logic
            if any, conquere any needed values
        
        If none, proceed to locate comparators

    */


    let valuecontext = new ValueContext();

    if(subcomponents.length>0)
        valuecontext.start = subcomponents[0][2][0];
    
    // First, check for any commands at the beginning of the statement
    if(subcomponents.length > 0 && subcomponents[0][0].isOf(SubComponentType.COMMAND)) {
        return processCommand(subcomponents);
    }

    for(let i = 0; i<subcomponents.length; i++) {
        if(isLogicGate(subcomponents[i])) {
            
            let left = subcomponents.slice(0, i);
            let right = subcomponents.slice(i+1);

            // Both sides must not be empty
            if(left.length==0)
                throw(`CompileException: Left side of logic gate '${subcomponents[li][1]}' `+
                    `is empty (both sides must contain a value), at `+
                    `line ${subcomponents[i][2][0].line} `+
                    `column ${subcomponents[i][2][0].column}`);

            if(right.length==0)
                throw(`CompileException: Right side of logic gate '${subcomponents[li][1]}' `+
                    `is empty (both sides must contain a value), at `+
                    `line ${subcomponents[i][2][0].line} `+
                    `column ${subcomponents[i][2][0].column}`);
            
            valuecontext.value = new LogicContext(
                processValue(left), 
                getLogicType(subcomponents[i]), 
                processValue(right),
                subcomponents[i][2][0]
            );

            return valuecontext;

        } else if(subcomponents[i][0].isOf(SubComponentType.COMMAND)) {
            // If a command is found first before the logic,
            // then end the scanning and proceed
            break;
        }
    }


    // Third, check for any comparators
    // If there is any, split the subcomponents into
    // a two-sided CompareContext
    // for(let ci = 0; ci<subcomponents.length; ci++) {
    //     if(isComparator(subcomponents[ci])) {
            
    //         let left = subcomponents.slice(0, ci);
    //         let right = subcomponents.slice(ci+1);

    //         // Both sides must not be empty
    //         if(left.length==0)
    //             throw(`CompileException: Left side of comparator '${subcomponents[ci][1]}' `+
    //                 `is empty (both sides must contain a value), at `+
    //                 `line ${subcomponents[ci][2][0].line} `+
    //                 `column ${subcomponents[ci][2][0].column}`);

    //         if(right.length==0)
    //             throw(`CompileException: Right side of comparator '${subcomponents[ci][1]}' `+
    //                 `is empty (both sides must contain a value), at `+
    //                 `line ${subcomponents[ci][2][0].line} `+
    //                 `column ${subcomponents[ci][2][0].column}`);

    //         valuecontext.value = new CompareContext(
    //             processValue(left), getCompareType(subcomponents[ci]), processValue(right)
    //         );


    //         return valuecontext;

    //     }
    // }


    let cumulative_operations = []; // Chain of operations
    let cumulative_calls = [];      // Chain of properties and function calls
    let current_value = undefined;

    /** Boolean which asserts if there is 
     * an anticipated named property (prior to DOT) */
    let isAnticipating = false;

    /** Temporary repository for parentheses, 
     * in case it is followed by either a double colon (lambda)
     * or a scope (enclosed with {}, which would make it a function) */
    let cachedParentheses = null;


    /** A toggable boolean which can stop the iteration when true */
    let isDone = false;
    

    let last_flag_index = -1;

    /** Pushes current value into operation if not empty.
     *  This returns a boolean as to whether there is a dangling value or none.
     */
    let pushAnything = function(forceAddToOperation = false) {
        

        if(current_value===undefined) return false;

        // What to push to operation chain (defaults to current value)
        let passable_value = current_value;
                                
        // Check for call chain
        if(cumulative_calls.length>0) {

            // If call chain active, set passable value as Call context
            let callcontext = new CallContext(current_value, cumulative_calls);
            callcontext.start = cumulative_calls[0].start;
            callcontext.end = cumulative_calls[cumulative_calls.length-1].start;
            passable_value = callcontext;

            cumulative_calls = [];
        }

        // Finally, push the passable value to operation chain (if allowed)
        if(cumulative_operations.length>0 || forceAddToOperation) {
            cumulative_operations.push(passable_value);
            return false;
        } else return passable_value !== undefined;

    }


    /** Pushes the current value (with call chain, if any) to the operation chain */
    let pushToOperation = function() {
        pushAnything(true);
    };


    let processSubcomponent = function(i, subcomponent) {

        let new_i = i + 1;
        // If flag
        if(subcomponent[0].isOf(SubComponentType.FLAG)) {
            
            // Flags must be at the beginning
            if(last_flag_index+1 == i) {
                valuecontext.value_flags.push(processFlag(subcomponent));
                last_flag_index = i;
            } else throw(`CompileException: Flag '${subcomponent[1]}' found at wrong position `+
                `(flags must be before the value and type), at `+
                `line ${subcomponent[2][0].line} `+
                `column ${subcomponent[2][0].column}`);

        } else

        // If typecast
        if(subcomponent[0].isOf(SubComponentType.GROUP_BRACKET)) {
            
            if(last_flag_index+1 == i) {
                // Only set typecast if not yet set
                if(valuecontext.value_typecast === null) {
                    valuecontext.value_typecast = processType(subcomponent);
                } else throw(`CompileException: Unexpected duplicate type `+
                    `(Only one type is allowed) at `+
                    `line ${subcomponent[2][0].line} `+
                    `column ${subcomponent[2][0].column}`);

            } else throw(`CompileException: Type found at wrong position `+
                `(types must be before the value and after the flags), at `+
                `line ${subcomponent[2][0].line} `+
                `column ${subcomponent[2][0].column}`);

        } else 
        
        
        // If command
        if(subcomponent[0].isOf(SubComponentType.COMMAND)) {
            
            let dangling = pushAnything();

            if(dangling === false) {
                let command_array = subcomponents.slice(i);
                current_value = processCommand(command_array, i);
                isDone = true;
            } else throw(`CompileException: Unexpected '#${subcomponent[1]}' at `+
                `line ${subcomponent[2][0].line} `+
                `column ${subcomponent[2][0].column}`);

            
        } else 

        if(isComparator(subcomponent)) {
            let left = subcomponents.slice(0, i);
            let right = subcomponents.slice(i+1);


            // Both sides must not be empty
            if(left.length==0)
                throw(`CompileException: Left side of comparator '${subcomponents[i][1]}' `+
                    `is empty (both sides must contain a value), at `+
                    `line ${subcomponents[i][2][0].line} `+
                    `column ${subcomponents[i][2][0].column}`);

            if(right.length==0)
                throw(`CompileException: Right side of comparator '${subcomponents[i][1]}' `+
                    `is empty (both sides must contain a value), at `+
                    `line ${subcomponents[i][2][0].line} `+
                    `column ${subcomponents[i][2][0].column}`);


            new_i = subcomponents.length;
            
            if(cachedParentheses) {
                current_value = processGroupValue(cachedParentheses);
                pushAnything();
                cachedParentheses = null;
            }
            
            
            
            current_value = new CompareContext(
                processValue(left), getCompareType(subcomponents[i]), processValue(right)
            );
        } else


        if(isLogicGate(subcomponent)) {
            let left = subcomponents.slice(0, i);
            let right = subcomponents.slice(i+1);

            // Both sides must not be empty
            if(left.length==0)
                throw(`CompileException: Left side of logic gate '${subcomponents[i][1]}' `+
                    `is empty (both sides must contain a value), at `+
                    `line ${subcomponents[i][2][0].line} `+
                    `column ${subcomponents[i][2][0].column}`);

            if(right.length==0)
                throw(`CompileException: Right side of logic gate '${subcomponents[i][1]}' `+
                    `is empty (both sides must contain a value), at `+
                    `line ${subcomponents[i][2][0].line} `+
                    `column ${subcomponents[i][2][0].column}`);
            
            new_i = subcomponents.length;

            if(cachedParentheses) {
                current_value = processGroupValue(cachedParentheses);
                pushAnything();
                cachedParentheses = null;
            }

            current_value = new LogicContext(
                processValue(left), 
                getLogicType(subcomponents[i]), 
                processValue(right),
                subcomponents[i][2][0]
            );
        } else 


        // If neither of flags, type, or command
        {
            // If preceded by DOT . (means anticipating for property)
            if(isAnticipating) {
                if(isDirectValue(subcomponent)) {
                    if(isVariable(subcomponent)) {
                        cumulative_calls.push(
                            new CallItem(CallType.PROPERTY, 
                                subcomponent[1],
                                subcomponent[2][0])
                        );

                        isAnticipating = false;

                    } else throw(`CompileException: Unexpected '${subcomponent[1]}' after '.' at `+
                        `line ${subcomponent[2][0].line} `+
                        `column ${subcomponent[2][0].column}`);
                    
                } else throw(`CompileException: Unexpected statement after '.' at `+
                    `line ${subcomponent[2][0].line} `+
                    `column ${subcomponent[2][0].column}`);
            } else {
                if(current_value===undefined) {

                    // If current value is null and is preceded by parentheses,
                    // then it can only be a function,
                    // which can only expect lambda or GROUP_CURLY
                    if(cachedParentheses!==null) {
                        if(subcomponent[0].isOf(SubComponentType.GROUP_CURLY)) {
                            let functionContext = new AnonymousFunctionContext();
                            functionContext.parameters = processParameters(cachedParentheses);
                            functionContext.contents = lex2(subcomponent, ContextType.SCOPE).contents;
                            functionContext.start = cachedParentheses[2][0];
                            functionContext.end = subcomponent[2][1];
    
                            current_value = functionContext;
                            cachedParentheses = null;
                        } else if(subcomponent[0].isOf(SymbolType.COLON2)) {
    
                            let functionContext = new LambdaFunctionContext();
                            functionContext.parameters = [];
                            functionContext.start = cachedParentheses[2][0];
                            functionContext.end = subcomponent[2][1];
    
                            // If current subcontext is last of all, 
                            // throw exception
                            if(i == subcomponents.length-1)
                                throw(`CompileException: Incomplete lambda function found at `
                                    `line ${subcomponent[2][0].line} `+
                                    `column ${subcomponent[2][0].column}`);
    
    
                            // Take the rest of the values as content of the lambda
                            // (wrapping it inside a remote SCOPE-SUBCONTEXT subcomponent)
                            functionContext.scope = [SubComponentType.SCOPE, 
                                [SubComponentType.SUBCONTEXT, 
                                    subcomponents.slice(i+1),
                                    [functionContext.start, functionContext.end]], 
                                [functionContext.start, functionContext.end]];
                            
                            current_value = functionContext;
                            isDone = true;
                        } else {
    
                            // If neither, take the group as a value, 
                            // then reprocess current subcomponent
    
                            current_value = processGroupValue(cachedParentheses);
                            cachedParentheses = null;
                            new_i = processSubcomponent(i, subcomponent);
    
                        }
                    } else {
    
                        // If current value is null, it would only expect:
                        // DIRECT_VALUE, GROUP_PARENTHESES, GROUP_CURLY
    
                        if(isDirectValue(subcomponent))
                            current_value = getDirectValue(subcomponent);
                        else if(subcomponent[0].isOf(SubComponentType.GROUP_PARENTHESES))
                            cachedParentheses = subcomponent;
                        else if(subcomponent[0].isOf(SubComponentType.GROUP_CURLY)) 
                            current_value = lex2(subcomponent, ContextType.SCOPE);
                        else throw(`CompileException: Unexpected statement at `+
                            `line ${subcomponent[2][0].line} `+
                            `column ${subcomponent[2][0].column}`);
                    }
    
                    
                } else {
                    // Since current value is not empty, it must be followed only by:
                    //  OPERATION_SYMBOL, GROUP_PARENTHESES (function call),
                    //  GROUP_CURLY (entry call), DOT (property call)
    
    
                    // If operation symbol, append value to operation chain
                    if(isOperationSymbol(subcomponent)) {
                        pushToOperation();
                        cumulative_operations.push(formOperationSymbol(subcomponent));
    
                        // Reset current value
                        current_value = undefined;
                    } else 
                    
                    // If GROUP_PARENTHESES, then treat as function call 
                    // (subcomponent as args)
                    if(subcomponent[0].isOf(SubComponentType.GROUP_PARENTHESES)) {
                        cumulative_calls.push(
                            new CallItem(
                                CallType.FUNCTION, 
                                processArgs(subcomponent),
                                subcomponent[2][0]));
                    } else 
    
                    // If GROUP_CURLY, then treat as entry call
                    if(subcomponent[0].isOf(SubComponentType.GROUP_CURLY)) {
                        cumulative_calls.push(
                            new CallItem(
                                CallType.ENTRY, 
                                processEntryGetter(subcomponent),
                                subcomponent[2][0]));
                    } else
    
                    // If DOT, then treat as property call
                    // It will anticipate for variables in the next iteration
                    if(subcomponent[0].isChar(CharType.DOT)) {
                        isAnticipating = true;
                    }
                    
                    
                    else 
                        throw(`CompileException: Unexpected statement at `+
                            `line ${subcomponent[2][0].line} `+
                            `column ${subcomponent[2][0].column}`);
                    
    
                    
                }
            }
        }

        return new_i;
    }



    // ITERATOR 

    for(let i = 0; i<subcomponents.length && !isDone;) {
        
        let subcomponent = subcomponents[i];

        i = processSubcomponent(i, subcomponent);
    }



    /** Last subcomponent, only used for debugging */ 
    let last_subcomp = subcomponents[subcomponents.length-1];


    // Make sure there are no property anticipations
    if(isAnticipating) 
        throw(`CompileException: Statement ended with '.' at `+
            `line ${last_subcomp[2][0].line} `+
            `column ${last_subcomp[2][0].column}`);


    // Then, check for any cached parentheses
    if(cachedParentheses!==null) {
        
        // If current_value is null, 
        // means cached parentheses is just another value
        if(current_value===undefined) 
            current_value = processGroupValue(cachedParentheses);
        else 
        
        // Else, it is unexpected, because this should have been
        // processed as a function call
        throw(`CompileException: Unexpected group statement at `+
            `line ${cachedParentheses[2][0].line} `+
            `column ${cachedParentheses[2][0].column}`);

    }
        


    /** Holds whatever value will be saved inside valuecontext
     *  (either DirectValue, OperationContext, 
     *      CallContext, or ValueContext [default])
     */
    let passable_value = new ValueContext();



    // If operation chain is active, push values to chain, 
    // then set it as passable value
    
    // An active operation chain always end with an operation symbol
    if(cumulative_operations.length>0) {

        // Only proceed if current_value is not null
        // If current value is null, means an operation symbol is dangling
        if(current_value!==undefined) {
            pushToOperation();
            passable_value = new OperationContext(cumulative_operations);
        } else throw(`CompileException: Statement ended with operation symbol at `+
            `line ${last_subcomp[2][0].line} `+
            `column ${last_subcomp[2][0].column}`);

    } else 
    
    // If operation chain is inactive but the call chain is,
    // then set it as passable value
    if(cumulative_calls.length>0) {

        // It is expected that the current value is not empty
        if(current_value!==undefined) { 
            let callcontext = new CallContext(current_value, cumulative_calls);
            callcontext.start = cumulative_calls[0].start;
            callcontext.end = cumulative_calls[cumulative_calls.length-1].start;
            
            passable_value = callcontext;

        } else throw(`FatalException: Call chain is active, but no root value found at `+
        `line ${cumulative_calls[0].start.line} `+
        `column ${cumulative_calls[0].start.column}`);
    } else

    // If neither the two chains are active, and current value is not null, 
    // set it as the passable value
    {
        if(current_value!==undefined) {
            passable_value = current_value;
        }
    }


    // Finally, set the valuecontext's value to the passable value
    valuecontext.value = passable_value;


    return valuecontext;

}