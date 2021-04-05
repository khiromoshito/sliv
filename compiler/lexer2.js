
/** Checks if a SubComponentType is a character of given charType */
String.prototype.isChar = function(chartype) {
    return this.endsWith(chartype);
}


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
                            let elseif_statement = 
                                processIfCommandItem(subcontext[1].slice(1));

                            priorIfContext.if_statements.push(elseif_statement);
                        }
                    break;
                    default:
                        priorIfContext = undefined;

                        let lexed = processValue(subcontext[1]);
                        lexed_root.contents.push(lexed);

                        if(subcontext[1][i][1]==="if") {
                            priorIfContext = lexed;
                        }

                        isLexed = true;
                }

                
                break;

            }
                
        }

        if(!isLexed) lexed_root.contents.push(processValue(subcontext[1]));

        

    } 

    return lexed_root;
}


function processSetter(subcontext, equator_index) {
    if(equator_index==0) 
        throw(`CompileException: Unexpected ':' at `+
            `line ${subcontext[1][0][2][0].line} `+
            `column ${subcontext[1][0][2][0].column}`);

    let attributes = subcontext[1].slice(0, equator_index);
    let value_array = subcontext[1].slice(equator_index+1);



    let setter = new SetterContext();

    let processed_attributes = processAttributes(attributes);
    setter.setter_type = processed_attributes.type;
    setter.setter_flags = processed_attributes.flags;
    setter.feeds = processed_attributes.feeds;

    setter.feed_value = processValue(value_array);


    return setter;
}



/** Processes value-emitting subcomponents
 * 
 *  subcomponents is an array
 */
 function processValue(subcomponents) {
    let valuecontext = new ValueContext();

    if(subcomponents.length>0)
        valuecontext.start = subcomponents[0][2][0];
    
    // First, check for any commands at the beginning of the statement
    if(subcomponents.length > 0 && subcomponents[0][0].isOf(SubComponentType.COMMAND)) {
        return processCommand(subcomponents);
    }

    // Secondly, check for any logic gates (and, or)
    // If there is any, split the subcomponents into
    // a two-sided LogicContext
    for(let li = 0; li<subcomponents.length; li++) {
        if(isLogicGate(subcomponents[li])) {
            console.log("LOGIC GATE", subcomponents[li]);
            
            let left = subcomponents.slice(0, li);
            let right = subcomponents.slice(li+1);

            // Both sides must not be empty
            if(left.length==0)
                throw(`CompileException: Left side of logic gate '${subcomponents[li][1]}' `+
                    `is empty (both sides must contain a value), at `+
                    `line ${subcomponents[li][2][0].line} `+
                    `column ${subcomponents[li][2][0].column}`);

            if(right.length==0)
                throw(`CompileException: Right side of logic gate '${subcomponents[li][1]}' `+
                    `is empty (both sides must contain a value), at `+
                    `line ${subcomponents[li][2][0].line} `+
                    `column ${subcomponents[li][2][0].column}`);
            
            valuecontext.value = new LogicContext(
                processValue(left), 
                getLogicType(subcomponents[li]), 
                processValue(right),
                subcomponents[li][2][0]
            );

            return valuecontext;

        }
    }


    // Third, check for any comparators
    // If there is any, split the subcomponents into
    // a two-sided CompareContext
    for(let ci = 0; ci<subcomponents.length; ci++) {
        if(isComparator(subcomponents[ci])) {
            
            let left = subcomponents.slice(0, ci);
            let right = subcomponents.slice(ci+1);

            // Both sides must not be empty
            if(left.length==0)
                throw(`CompileException: Left side of comparator '${subcomponents[ci][1]}' `+
                    `is empty (both sides must contain a value), at `+
                    `line ${subcomponents[ci][2][0].line} `+
                    `column ${subcomponents[ci][2][0].column}`);

            if(right.length==0)
                throw(`CompileException: Right side of comparator '${subcomponents[ci][1]}' `+
                    `is empty (both sides must contain a value), at `+
                    `line ${subcomponents[ci][2][0].line} `+
                    `column ${subcomponents[ci][2][0].column}`);

            valuecontext.value = new CompareContext(
                processValue(left), getCompareType(subcomponents[ci]), processValue(right)
            );


            return valuecontext;

        }
    }


    let cumulative_operations = []; // Chain of operations
    let cumulative_calls = [];      // Chain of properties and function calls
    let current_value = null;

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
        } else return passable_value !== null;

    }


    /** Pushes the current value (with call chain, if any) to the operation chain */
    let pushToOperation = function() {
        pushAnything(true);
    };


    let processSubcomponent = function(i, subcomponent) {
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
                if(current_value===null) {

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
                            processSubcomponent(i, subcomponent);
    
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
                        current_value = null;
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
                    
                    
                    else {
                        console.log(subcomponents);
                        throw(`CompileException: Unexpected statement at `+
                            `line ${subcomponent[2][0].line} `+
                            `column ${subcomponent[2][0].column}`);
                    }
    
                    
                }
            }
        }
    }



    // ITERATOR 

    for(let i = 0; i<subcomponents.length && !isDone; i++) {
        
        let subcomponent = subcomponents[i];

        processSubcomponent(i, subcomponent);
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
        if(current_value===null) 
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
        if(current_value!==null) {
            pushToOperation();
            return new OperationContext(cumulative_operations);
        } else throw(`CompileException: Statement ended with operation symbol at `+
            `line ${last_subcomp[2][0].line} `+
            `column ${last_subcomp[2][0].column}`);

    } else 
    
    // If operation chain is inactive but the call chain is,
    // then set it as passable value
    if(cumulative_calls.length>0) {

        // It is expected that the current value is not empty
        if(current_value!==null) { 
            let callcontext = new CallContext(current_value, cumulative_calls);
            callcontext.start = cumulative_calls[0].start;
            callcontext.end = cumulative_calls[cumulative_calls.length-1].start;
            
            return callcontext;

        } else throw(`FatalException: Call chain is active, but no root value found at `+
        `line ${cumulative_calls[0].start.line} `+
        `column ${cumulative_calls[0].start.column}`);
    } else

    // If neither the two chains are active, and current value is not null, 
    // set it as the passable value
    {
        if(current_value!==null) return current_value;
    }


    // Finally, set the valuecontext's value to the passable value
    valuecontext.value = passable_value;


    return valuecontext;

}




/** Checks if a subcomponent is an operation symbol */
function isOperationSymbol(subcomponent) {
    return formOperationSymbol(subcomponent).type !== null;
}



/** Checks if a subcomponent is a direct value (string, name, number) */
function isDirectValue(subcomponent) {
    let direct_values = [
        SubComponentType.STRING,
        SubComponentType.NAME,
        SubComponentType.NUMBER
    ];

    for(let direct_value of direct_values)
        if(subcomponent[0].isOf(direct_value))
            return true;

    return false;
}

function isVariable(subcomponent) {
    if(subcomponent[0].isOf(SubComponentType.NAME)) {
        let constants = ["true", "false", "null"];
        if(!constants.includes(subcomponent[1])) return true;
    }

    return false;
}

function getDirectValue(subcomponent) {


    if(subcomponent[0].isOf(SubComponentType.STRING))

        return new DirectValue(DirectValueType.STRING, subcomponent[1], subcomponent[2][0]);


    else if(subcomponent[0].isOf(SubComponentType.NUMBER))

        return new DirectValue(DirectValueType.NUMBER, Number(subcomponent[1]), subcomponent[2][0]);


    else if(subcomponent[0].isOf(SubComponentType.NAME)) {
        let name = subcomponent[1];
        
        if(name==="true") 
            return new DirectValue(DirectValueType.BOOL, true, subcomponent[2][0]);

        if(name==="false") 
            return new DirectValue(DirectValueType.BOOL, false, subcomponent[2][0]);

        if(name==="null")
            return new DirectValue(DirectValueType.NULL, null, subcomponent[2][0]);

        else return new DirectValue(DirectValueType.VARIABLE, name, subcomponent[2][0]);
    }

}

/** Processes the left side of a setter. Returns {type, flags, feeds} */
function processAttributes(attributes) {

    let type = null;
    let flags = [];

    /** Feeds are the variables and objects that pend to change value (set) */
    let feeds = [];

    /** The call chain of property, function, and entry calls */
    let cumulative_calls = [];

    let current_variable = null;


    /** Boolean which asserts if there is 
     * an anticipated named property (prior to DOT) */
    let isAnticipating = false;


    /** Pushes the current feed (variable+callcontext) */
    let pushFeed = function() {
        if(current_variable!==null) {
            let passable_value = current_variable;

            if(cumulative_calls.length>0) 
                passable_value = new CallContext(
                    current_variable, cumulative_calls
                );

            feeds.push(passable_value);
        }

        current_variable = null;
        cumulative_calls = [];
    };


    for(let attr of attributes) {
        
        // Check first if anticipating for property name
        if(isAnticipating) {
            // Current attribute subcontext must be variable
            if(isVariable(attr)) { 
                cumulative_calls.push(
                    new CallItem(CallType.PROPERTY, attr[1], attr[2][0]));

                isAnticipating = false;

            } else throw(`CompileException: Unexpected statement after '.' at `+
                `line ${attr[2][0].line} `+
                `column ${attr[2][0].column}`);
        } else
        
        // If type (GROUP_BRACKET)
        if(attr[0].isOf(SubComponentType.GROUP_BRACKET)) {

            if(type === null) {

                // Make sure type is set before any feeds or variable
                if(current_variable==null && feeds.length==0)
                    type = processType(attr);
                else throw(`CompileException: Type '${attr[1]}' is at wrong position `+
                    `(types must be set before variables), at `+
                    `line ${attr[2][0].line} `+
                    `column ${attr[2][0].column}`);

            } else throw(`CompileException: Invalid duplicate type '${attr[1]}' `+
                `(Only one type is allowed) at `+
                `line ${attr[2][0].line} `+
                `column ${attr[2][0].column}`);
        } else 
        
        // If variable
        if(isDirectValue(attr)) {
            
            // Push any dangling feed
            pushFeed();

            // Then update current variable
            current_variable = getDirectValue(attr);

        } else 

        // For other subcomponents when current_variable is not null
        if(current_variable!==null) {

            // If current variable is not null, then property/method calls are expected:
            //  Property call (DOT), Entry call (GROUP_CURLY) 
            if(attr[0].isChar(CharType.DOT)) {
                
                // This only applies to variable direct values **
                if(current_variable.type===ContextType.DIRECT_VALUE && 
                    current_variable.value_type===DirectValueType.VARIABLE)
                    isAnticipating = true;
                else throw(`CompileException: Unexpected '.' after non-variable object at `+
                    `line ${attr[2][0].line} `+
                    `column ${attr[2][0].column}`);

            } else if(attr[0].isOf(SubComponentType.GROUP_CURLY)) {

                // This only applies to variable direct values **
                if(current_variable.type===ContextType.DIRECT_VALUE && 
                    current_variable.value_type===DirectValueType.VARIABLE)
                    cumulative_calls.push(
                        new CallItem(CallType.ENTRY, processEntryGetter(attr),attr[2][0]));


                else throw(`CompileException: Unexpected '{' after non-variable object at `+
                    `line ${attr[2][0].line} `+
                    `column ${attr[2][0].column}`);

            } else {
                console.log(attr);
                throw(`CompileException: Unexpected statement on left side of setter at `+
                `line ${attr[2][0].line} `+
                `column ${attr[2][0].column}`);
            }

        } else {
            console.log(attr);
            throw(`CompileException: Unexpected statement on left side of setter at `+
            `line ${attr[2][0].line} `+
            `column ${attr[2][0].column}`);
        }
            
    }


    // Make sure there are no property anticipations
    if(isAnticipating) 
        throw(`CompileException: Left side of setter ended with '.' at `+
            `line ${last_subcomp[2][0].line} `+
            `column ${last_subcomp[2][0].column}`);

    
    // Close any open variables
    pushFeed();



    return {type, flags, feeds};


}

/** Processes GROUP_PARENTHESES as single-item values */
function processGroupValue(group_subcomponent) {
    
    // Must have only one item


    if(group_subcomponent[1].length>1)
        throw(`CompileException: Group values expect only one value, `+
            `but ${group_subcomponent[1].length} found, at `+
            `line ${group_subcomponent[2][0].line} `+
            `column ${group_subcomponent[2][0].column}`);


    if(group_subcomponent[1].length==0 || group_subcomponent[1][0][1].length==0)
        throw(`CompileException: Invalid empty group ( ) at `+
            `line ${group_subcomponent[2][0].line} `+
            `column ${group_subcomponent[2][0].column}`);


    return processValue(group_subcomponent[1][0][1]);
    
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


function processCommand(command_array, position = 0) {

    let command_subcomp = command_array[0];
    let command_name = command_subcomp[1];


    if(!COMMANDS.includes(command_name)) 
        throwException(`CompileException: Unknown command '#${flag_name}'`, flag_subcomponent[2][0]);

    // Commands must have at least one argument (two items for command_array)
    if(command_array.length<=1) 
        throwException(`CompileException: Missing args for command '${command_name}'`, command_subcomp[2][0]);


    let args = command_array.slice(1);
    
    switch(command_name) {
        case "return":
            return new CommandContext(
                "return", processValue(args), 
                command_subcomp[2][0]);
        case "ret":
            return new CommandContext(
                "return", processValue(args), 
                command_subcomp[2][0]);
        case "if":

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

        break;

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

function processFlag(flag_subcomponent) {
    let flag_name = flag_subcomponent[1];

    if(FLAGS[flag_name]===undefined) 
        throw(`CompileException: Unknown flag '${flag_name}' at `+
            `line ${flag_subcomponent[2][0].line} `+
            `column ${flag_subcomponent[2][0].column}`);

    let flag = new FlagItem();
    flag.name = flag_name;
    flag.start = flag_subcomponent[2][0];
    flag.end = flag_subcomponent[2][1];

    return flag;
}


/** Processes a GROUP_BRACKET or SUBTYPE and returns a TypeContext */ 
function processType(type_subcomponent) {

    // types_subcomponent is either a group_bracket or a subtype,
    // which both contain subcontexts at [1]
    
    let types_arr = type_subcomponent[1];

    let types = [];

    for(let type_item of types_arr) {

        // Each type_item is a subcontext which contain types at [1]
        
        // A type item must only have a maximum of 2 children
        if(type_item[1].length>2)
            throw(`Unexpected ${type_item[1].length} elements `+
                `inside type (only max. 2 expected) at `+
                `line ${type_item[2][0].line} `+
                `column ${type_item[2][0].column}`);

        
        if(// If type item has 2 children, 
            // first child must be NAME and second as SUBTYPE 
            (type_item[1].length==2 && 
                !(type_item[1][0][0].isOf(SubComponentType.NAME) && 
                type_item[1][1][0].isOf(SubComponentType.SUBTYPE))) ||

            // If type item has 1 child, it must be NAME
            (type_item[1].length==1 && !type_item[1][0][0].isOf(SubComponentType.NAME)))

                throw(`Unexpected type format given (must be NAME or NAME<SUBTYPES>) at `+
                    `line ${type_item[2][0].line} `+
                    `column ${type_item[2][0].column}`);

            
        let type = new TypeItem();
        type.name = type_item[1][0][1];
        if(type_item[1][1]) type.subtype = processType(type_item[1][1]);
        
        types.push(type);
    }

    let typecontext = new TypeContext();
    typecontext.type_items = types;
    typecontext.start = type_subcomponent[2][0];
    typecontext.end = type_subcomponent[2][1];

    return typecontext;

}